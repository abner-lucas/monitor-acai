import mysql, { type Pool, type ResultSetHeader } from 'mysql2/promise';

/**
 * Conexão com o banco MySQL da Hostinger (somente servidor).
 *
 * No servidor da Hostinger o app conecta em 127.0.0.1:3306. As credenciais vêm das
 * variáveis de ambiente DB_HOST, DB_PORT, DB_NAME, DB_USER e DB_PASSWORD.
 */

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super('Banco de dados não configurado: defina DB_NAME, DB_USER e DB_PASSWORD.');
  }
}

/**
 * Estrutura das tabelas. Criadas automaticamente na primeira conexão,
 * então um banco vazio fica pronto sem passos manuais.
 */
const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS rotation_records (
    id VARCHAR(40) NOT NULL,
    site VARCHAR(20) NOT NULL DEFAULT 'breves',
    cycle_number INT NOT NULL,
    position_id INT NOT NULL,
    cell_id INT NOT NULL,
    plant_index INT NOT NULL,
    installed_at DATE NOT NULL,
    scheduled_next_change DATE NOT NULL,
    removed_at DATE NULL,
    responsible VARCHAR(255) NOT NULL,
    notes TEXT NULL,
    status VARCHAR(20) NOT NULL,
    battery_level INT NULL,
    signal_quality VARCHAR(20) NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_rotation_records_cycle (cycle_number),
    CONSTRAINT chk_rotation_records_status CHECK (status IN ('active', 'completed', 'scheduled'))
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS app_settings (
    setting_key VARCHAR(64) NOT NULL,
    setting_value TEXT NOT NULL,
    PRIMARY KEY (setting_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS authorized_users (
    id VARCHAR(64) NOT NULL,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_authorized_users_email (email),
    CONSTRAINT chk_authorized_users_role CHECK (role IN ('superuser', 'pesquisador'))
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES ('current_cycle', '1')`,
  // Bancos criados antes da separação por unidade: todos os registros antigos são de Breves.
  `ALTER TABLE rotation_records ADD COLUMN IF NOT EXISTS site VARCHAR(20) NOT NULL DEFAULT 'breves' AFTER id`,
  `CREATE INDEX IF NOT EXISTS idx_rotation_records_site_cycle ON rotation_records (site, cycle_number)`,
  // Relatório de campo de cada rodízio; os campos do formulário ficam em JSON (lib/relatorio.ts).
  `CREATE TABLE IF NOT EXISTS rotation_reports (
    record_id VARCHAR(40) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'rascunho',
    signed_at DATE NULL,
    report_data LONGTEXT NOT NULL,
    created_at DATETIME(3) NOT NULL,
    updated_at DATETIME(3) NOT NULL,
    updated_by VARCHAR(255) NULL,
    PRIMARY KEY (record_id),
    CONSTRAINT fk_rotation_reports_record FOREIGN KEY (record_id) REFERENCES rotation_records (id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_rotation_reports_status CHECK (status IN ('rascunho', 'concluido'))
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

/**
 * Muaná começa com uma cópia dos dados de Breves (registros, relatórios e ciclo), feita uma
 * única vez. A marca em app_settings impede que a cópia se repita, mesmo se depois todos os
 * registros de Muaná forem apagados ou dois processos subirem ao mesmo tempo.
 */
async function copiarBrevesParaMuana(pool: Pool): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [marca] = await conn.query<ResultSetHeader>(
      "INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES ('seed:muana', ?)",
      [new Date().toISOString()]
    );
    if (marca.affectedRows === 0) {
      await conn.rollback();
      return;
    }

    // REG-2026-001 -> MUA-2026-001 (mesmo número, prefixo da unidade).
    await conn.query(
      `INSERT INTO rotation_records
        (id, site, cycle_number, position_id, cell_id, plant_index, installed_at, scheduled_next_change,
         removed_at, responsible, notes, status, battery_level, signal_quality, created_at, updated_at)
       SELECT CONCAT('MUA', SUBSTRING(id, LOCATE('-', id))), 'muana', cycle_number, position_id, cell_id,
         plant_index, installed_at, scheduled_next_change, removed_at, responsible, notes, status,
         battery_level, signal_quality, created_at, updated_at
       FROM rotation_records WHERE site = 'breves'`
    );
    await conn.query(
      `INSERT INTO rotation_reports (record_id, status, signed_at, report_data, created_at, updated_at, updated_by)
       SELECT CONCAT('MUA', SUBSTRING(rep.record_id, LOCATE('-', rep.record_id))), rep.status, rep.signed_at,
         rep.report_data, rep.created_at, rep.updated_at, rep.updated_by
       FROM rotation_reports rep JOIN rotation_records rec ON rec.id = rep.record_id
       WHERE rec.site = 'breves'`
    );
    await conn.query(
      `INSERT INTO app_settings (setting_key, setting_value)
       SELECT 'current_cycle:muana', setting_value FROM app_settings WHERE setting_key = 'current_cycle'
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Guardados no escopo global para sobreviver ao hot reload do `next dev`.
const globalForDb = globalThis as typeof globalThis & {
  monitorAcaiPool?: Pool;
  monitorAcaiSchemaReady?: Promise<void>;
};

function createPool(): Pool {
  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;
  if (!DB_NAME || !DB_USER || !DB_PASSWORD) {
    throw new DatabaseNotConfiguredError();
  }

  return mysql.createPool({
    host: DB_HOST || '127.0.0.1',
    port: Number(DB_PORT) || 3306,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    charset: 'utf8mb4',
    // DATETIME em UTC; DATE volta como texto 'YYYY-MM-DD' (sem deslocamento de fuso).
    timezone: 'Z',
    dateStrings: ['DATE'],
    connectionLimit: 5,
    waitForConnections: true,
    enableKeepAlive: true,
  });
}

async function ensureSchema(pool: Pool): Promise<void> {
  for (const statement of SCHEMA_STATEMENTS) {
    await pool.query(statement);
  }
  await copiarBrevesParaMuana(pool);
}

export async function getDb(): Promise<Pool> {
  if (!globalForDb.monitorAcaiPool) {
    globalForDb.monitorAcaiPool = createPool();
  }
  const pool = globalForDb.monitorAcaiPool;

  if (!globalForDb.monitorAcaiSchemaReady) {
    globalForDb.monitorAcaiSchemaReady = ensureSchema(pool).catch((err) => {
      // Permite nova tentativa na próxima requisição (ex.: banco reiniciando).
      globalForDb.monitorAcaiSchemaReady = undefined;
      throw err;
    });
  }
  await globalForDb.monitorAcaiSchemaReady;

  return pool;
}

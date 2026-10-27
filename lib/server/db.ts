import mysql, { type Pool } from 'mysql2/promise';

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
];

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

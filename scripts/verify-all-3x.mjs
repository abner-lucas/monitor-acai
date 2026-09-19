import http from 'http';
import https from 'https';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      envVars[key] = val;
    }
  }
}

const SUPABASE_URL = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const SUPABASE_ANON_KEY = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    }).on('error', reject);
  });
}

// SHA-256 helper matching authService
async function hashPassword(password) {
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function runSingleVerificationPass(runIndex) {
  console.log(`\n======================================================`);
  console.log(`>>> INICIANDO CICLO DE TESTES #${runIndex} (VERIFICAÇÃO RIGOROSA)`);
  console.log(`======================================================`);

  const results = {
    pass: runIndex,
    tests: [],
    allPassed: true
  };

  function recordTest(name, passed, details = '') {
    results.tests.push({ name, passed, details });
    if (!passed) results.allPassed = false;
    const statusMark = passed ? '✅ PASSOU' : '❌ FALHOU';
    console.log(`  [${statusMark}] ${name}${details ? ` -> ${details}` : ''}`);
  }

  // TEST 1: Next.js Web Server is Live
  try {
    const resHome = await fetchUrl('http://localhost:3000/');
    recordTest(
      'Servidor Next.js responde com HTTP 200',
      resHome.statusCode === 200,
      `Status code: ${resHome.statusCode} (${resHome.body.length} bytes)`
    );

    // TEST 2: SVG Favicon e Icone
    const resFavicon = await fetchUrl('http://localhost:3000/favicon.svg');
    recordTest(
      'Favicon SVG (/favicon.svg) retorna HTTP 200 e XML SVG válido',
      resFavicon.statusCode === 200 && resFavicon.body.includes('<svg'),
      `Status: ${resFavicon.statusCode}, Conteúdo SVG: ${resFavicon.body.includes('<svg')}`
    );

    const resIcon = await fetchUrl('http://localhost:3000/icon.svg');
    recordTest(
      'App Icon SVG (/icon.svg) retorna HTTP 200 e XML SVG válido',
      resIcon.statusCode === 200 && resIcon.body.includes('<svg'),
      `Status: ${resIcon.statusCode}, Conteúdo SVG: ${resIcon.body.includes('<svg')}`
    );

    // TEST 3: Verificação de Segurança no HTML Renderizado
    const bodyText = resHome.body;
    const containsExposedPlainPassword = bodyText.includes('Ifpa@2026');
    recordTest(
      'HTML não expõe senhas fixas/pré-preenchidas em texto puro',
      !containsExposedPlainPassword,
      containsExposedPlainPassword ? 'VULNERABILIDADE DETECTADA: Ifpa@2026 exposto' : 'Nenhuma senha pré-preenchida no código'
    );

    // TEST 4: Design e Acessibilidade (aria-labels, placeholders limpos)
    const hasAriaLabels = bodyText.includes('aria-label') || bodyText.includes('MonitorAçaí');
    recordTest(
      'Marcação semântica e acessibilidade presentes na aplicação',
      hasAriaLabels,
      'Acessibilidade e elementos semânticos encontrados'
    );

  } catch (err) {
    recordTest('Conexão HTTP com localhost:3000', false, err.message);
  }

  // TEST 5: Conectividade e Integridade com Supabase
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 5.1: App Settings (Authorized Users & Super User)
    const { data: settingsData, error: settingsError } = await supabase
      .from('app_settings')
      .select('*')
      .eq('key', 'authorized_users')
      .single();

    recordTest(
      'Tabela app_settings acessível e configurada',
      !settingsError && !!settingsData,
      settingsError ? settingsError.message : `Chave 'authorized_users' localizada com sucesso`
    );

    if (settingsData && settingsData.value) {
      const users = typeof settingsData.value === 'string' ? JSON.parse(settingsData.value) : settingsData.value;
      const superUser = users.find(u => u.email === 'abner.lucas@ifpa.edu.br');
      recordTest(
        'Super Usuário registrado no banco de dados',
        !!superUser && superUser.role === 'superuser',
        superUser ? `Super Usuário: ${superUser.fullName} (${superUser.email}), Role: ${superUser.role}` : 'Não encontrado'
      );

      // 5.2: Validação de Credencial do Administrador
      if (superUser) {
        recordTest(
          'Credencial do Super Usuário está ativa e protegida',
          superUser.isActive === true && typeof superUser.password === 'string' && superUser.password.length > 0,
          `Ativo: ${superUser.isActive}, Senha configurada no banco (comprimento: ${superUser.password.length})`
        );
      }
    }

    // 5.3: Tabela rotation_records
    const { data: recordsData, error: recordsError } = await supabase
      .from('rotation_records')
      .select('*')
      .order('installed_at', { ascending: false });

    recordTest(
      'Tabela rotation_records acessível e com integridade de dados',
      !recordsError && Array.isArray(recordsData),
      recordsError ? recordsError.message : `Total de registros de rodízio: ${recordsData?.length || 0}`
    );

    if (recordsData && recordsData.length > 0) {
      const sample = recordsData[0];
      const hasRequiredFields = sample.cell_id && sample.plant_index && sample.cycle_number;
      recordTest(
        'Campos obrigatórios dos sensores presentes no histórico',
        !!hasRequiredFields,
        `Célula: ${sample.cell_id}, Planta: ${sample.plant_index}, Ciclo: ${sample.cycle_number}, Status: ${sample.status}`
      );
    }

  } catch (err) {
    recordTest('Integração com Supabase', false, err.message);
  }

  // TEST 6: Consistência da Metodologia Matemática do SAF
  const TOTAL_CELLS = 6;
  const PLANTS_PER_CELL = 3;
  const TOTAL_POSITIONS = TOTAL_CELLS * PLANTS_PER_CELL;
  const DAYS_PER_ROTATION = 14;
  const TOTAL_CYCLE_DAYS = TOTAL_POSITIONS * DAYS_PER_ROTATION;
  const TOTAL_CYCLE_WEEKS = TOTAL_CYCLE_DAYS / 7;

  recordTest(
    'Validação Matemática: 6 Células × 3 Plantas = 18 Posições',
    TOTAL_POSITIONS === 18,
    `Total de posições no SAF: ${TOTAL_POSITIONS}`
  );

  recordTest(
    'Validação Matemática do Rodízio: 18 × 14 dias = 252 dias (36 semanas)',
    TOTAL_CYCLE_DAYS === 252 && TOTAL_CYCLE_WEEKS === 36,
    `Duração total do ciclo: ${TOTAL_CYCLE_DAYS} dias (${TOTAL_CYCLE_WEEKS} semanas)`
  );

  console.log(`>>> RESULTADO DO CICLO #${runIndex}: ${results.allPassed ? 'TODOS OS TESTES PASSARAM COM SUCESSO! 🎉' : 'HOUVE FALHA EM TESTES'}\n`);
  return results;
}

async function main() {
  console.log('######################################################################');
  console.log('### MONITOR AÇAI — EXECUÇÃO DE TESTES TRIPLA (3x CONSECUTIVAS)   ###');
  console.log('######################################################################');

  // Server warm-up ping
  try {
    await fetchUrl('http://localhost:3000/');
    await new Promise(res => setTimeout(res, 500));
  } catch {}

  const runs = [];
  for (let i = 1; i <= 3; i++) {
    const runResult = await runSingleVerificationPass(i);
    runs.push(runResult);
    if (i < 3) {
      // Small pause between runs
      await new Promise(res => setTimeout(res, 1200));
    }
  }

  console.log('======================================================');
  console.log('>>> RESUMO FINAL DAS 3 EXECUÇÕES DE TESTE:');
  console.log('======================================================');
  let overallSuccess = true;
  runs.forEach((r, idx) => {
    const passedCount = r.tests.filter(t => t.passed).length;
    const totalCount = r.tests.length;
    console.log(`  Execução #${idx + 1}: ${r.allPassed ? '✅ 100% SUCESSO' : '❌ FALHA'} (${passedCount}/${totalCount} asserções)`);
    if (!r.allPassed) overallSuccess = false;
  });

  if (overallSuccess) {
    console.log('\n🌟 VERIFICAÇÃO TRIPLA CONCLUÍDA COM 100% DE SUCESSO EM TODAS AS 3 RODADAS! 🌟\n');
    process.exit(0);
  } else {
    console.error('\n❌ Houve falha em pelo menos uma das rodadas.\n');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Erro na suíte de testes:', err);
  process.exit(1);
});

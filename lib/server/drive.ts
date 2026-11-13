import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { getDb } from './db';
import { getSecret } from './session';

/**
 * Google Drive da conta do projeto (somente servidor), onde ficam as fotos originais dos relatórios.
 *
 * O coordenador conecta a conta uma vez (OAuth, escopo drive.file: o app só enxerga o que ele
 * mesmo criou). O refresh token fica cifrado em app_settings; as imagens nunca passam pelo banco.
 * GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET vêm das variáveis de ambiente.
 */

export const ESCOPO_DRIVE = 'https://www.googleapis.com/auth/drive.file';
// Fora da produção (testes locais) a pasta é outra e não é compartilhada com ninguém.
const PRODUCAO = process.env.NODE_ENV === 'production';
const NOME_PASTA_RAIZ = PRODUCAO ? 'MonitorAçaí — Fotos dos relatórios' : 'MonitorAçaí — Fotos (testes locais)';
/** Conta institucional que recebe a pasta compartilhada como editora. */
const COMPARTILHAR_COM = 'abner.lucas@ifpa.edu.br';

const CHAVE = {
  token: 'drive:refresh_token',
  conta: 'drive:conta',
  raiz: 'drive:pasta_raiz',
  pasta: (recordId: string) => `drive:pasta:${recordId}`,
};

export class DriveNaoConectado extends Error {
  constructor() {
    super('O Google Drive ainda não foi conectado. Peça ao coordenador para conectar em Equipe.');
  }
}

export class DriveErro extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

function credenciais() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Google Drive não configurado: defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.');
  }
  return { id: GOOGLE_CLIENT_ID, segredo: GOOGLE_CLIENT_SECRET };
}

export const driveConfigurado = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

// ---------------------------------------------------------------------------
// Configurações guardadas (o refresh token vai cifrado com AES-256-GCM)
// ---------------------------------------------------------------------------

const chaveCifra = () => createHash('sha256').update(`${getSecret()}:google-drive`).digest();

function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', chaveCifra(), iv);
  const dados = Buffer.concat([c.update(texto, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), dados].map((b) => b.toString('base64url')).join('.');
}

function decifrar(valor: string): string {
  const [iv, tag, dados] = valor.split('.').map((p) => Buffer.from(p, 'base64url'));
  const d = createDecipheriv('aes-256-gcm', chaveCifra(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(dados), d.final()]).toString('utf8');
}

async function lerConfig(chave: string): Promise<string | null> {
  const db = await getDb();
  const [rows] = await db.query<RowDataPacket[]>('SELECT setting_value FROM app_settings WHERE setting_key = ?', [chave]);
  return rows[0]?.setting_value ?? null;
}

async function gravarConfig(chave: string, valor: string): Promise<void> {
  const db = await getDb();
  await db.query(
    'INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
    [chave, valor]
  );
}

// ---------------------------------------------------------------------------
// OAuth
// ---------------------------------------------------------------------------

export function urlAutorizacao(redirectUri: string, state: string): string {
  const p = new URLSearchParams({
    client_id: credenciais().id,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: ESCOPO_DRIVE,
    access_type: 'offline',
    // Garante um refresh token novo mesmo se a conta já autorizou antes.
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

// Token de acesso em memória (dura ~1 h); renovado com o refresh token quando vence.
const globalDrive = globalThis as typeof globalThis & { monitorAcaiDriveToken?: { valor: string; expira: number } };

async function pedirToken(params: Record<string, string>) {
  const { id, segredo } = credenciais();
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: id, client_secret: segredo, ...params }),
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (dados.error === 'invalid_grant') throw new DriveNaoConectado();
    throw new DriveErro(`Google recusou a autorização (${dados.error ?? r.status}).`, 502);
  }
  globalDrive.monitorAcaiDriveToken = { valor: dados.access_token, expira: Date.now() + (dados.expires_in - 120) * 1000 };
  return dados as { access_token: string; refresh_token?: string; scope: string };
}

/** Troca o código da tela de consentimento, guarda o acesso e prepara a pasta do projeto. */
export async function concluirConexao(code: string, redirectUri: string): Promise<string> {
  const tokens = await pedirToken({ code, redirect_uri: redirectUri, grant_type: 'authorization_code' });
  if (!tokens.refresh_token) throw new DriveErro('O Google não devolveu um acesso permanente. Tente conectar de novo.', 502);
  if (!tokens.scope.split(' ').includes(ESCOPO_DRIVE)) {
    throw new DriveErro('A permissão de acesso ao Google Drive não foi concedida.', 400);
  }
  await gravarConfig(CHAVE.token, cifrar(tokens.refresh_token));

  const sobre = await driveJson<{ user: { emailAddress: string } }>('/about?fields=user(emailAddress)');
  await gravarConfig(CHAVE.conta, sobre.user.emailAddress);
  await pastaRaiz();
  return sobre.user.emailAddress;
}

async function tokenDeAcesso(): Promise<string> {
  const atual = globalDrive.monitorAcaiDriveToken;
  if (atual && atual.expira > Date.now()) return atual.valor;
  const guardado = await lerConfig(CHAVE.token);
  if (!guardado) throw new DriveNaoConectado();
  return (await pedirToken({ refresh_token: decifrar(guardado), grant_type: 'refresh_token' })).access_token;
}

export async function desconectar(): Promise<void> {
  const guardado = await lerConfig(CHAVE.token);
  if (guardado) {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(decifrar(guardado))}`, { method: 'POST' }).catch(() => undefined);
  }
  globalDrive.monitorAcaiDriveToken = undefined;
  const db = await getDb();
  await db.query("DELETE FROM app_settings WHERE setting_key IN (?, ?)", [CHAVE.token, CHAVE.conta]);
}

export interface EstadoDrive {
  configurado: boolean;
  conectado: boolean;
  conta: string | null;
  pastaUrl: string | null;
}

export async function estadoDrive(): Promise<EstadoDrive> {
  if (!driveConfigurado()) return { configurado: false, conectado: false, conta: null, pastaUrl: null };
  const [token, conta, raiz] = await Promise.all([lerConfig(CHAVE.token), lerConfig(CHAVE.conta), lerConfig(CHAVE.raiz)]);
  return {
    configurado: true,
    conectado: Boolean(token),
    conta,
    pastaUrl: token && raiz ? `https://drive.google.com/drive/folders/${raiz}` : null,
  };
}

// ---------------------------------------------------------------------------
// Chamadas à API do Drive
// ---------------------------------------------------------------------------

const API = 'https://www.googleapis.com/drive/v3';

async function driveFetch(caminho: string, init: RequestInit = {}): Promise<Response> {
  const url = caminho.startsWith('https://') ? caminho : `${API}${caminho}`;
  const fazer = async () =>
    fetch(url, { ...init, headers: { Authorization: `Bearer ${await tokenDeAcesso()}`, ...init.headers } });
  let r = await fazer();
  if (r.status === 401) {
    // Token revogado ou vencido antes da hora: tenta uma vez com um novo.
    globalDrive.monitorAcaiDriveToken = undefined;
    r = await fazer();
  }
  return r;
}

async function driveJson<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const r = await driveFetch(caminho, init);
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 404) throw new DriveErro('Arquivo não encontrado no Google Drive.', 404);
    throw new DriveErro(`Falha no Google Drive: ${dados?.error?.message ?? r.status}.`, 502);
  }
  return dados as T;
}

const json = (corpo: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(corpo),
});

async function pastaExiste(id: string): Promise<boolean> {
  try {
    const f = await driveJson<{ trashed: boolean }>(`/files/${id}?fields=trashed`);
    return !f.trashed;
  } catch (err) {
    if (err instanceof DriveErro && err.status === 404) return false;
    throw err;
  }
}

async function criarPasta(nome: string, pai?: string): Promise<string> {
  const f = await driveJson<{ id: string }>(
    '/files?fields=id',
    json({ name: nome, mimeType: 'application/vnd.google-apps.folder', ...(pai ? { parents: [pai] } : {}) })
  );
  return f.id;
}

/** Pasta do projeto no Drive; criada (e compartilhada com a conta do IFPA) na primeira vez. */
async function pastaRaiz(): Promise<string> {
  const guardada = await lerConfig(CHAVE.raiz);
  if (guardada && (await pastaExiste(guardada))) return guardada;

  const id = await criarPasta(NOME_PASTA_RAIZ);
  if (PRODUCAO) await driveJson(
    `/files/${id}/permissions?sendNotificationEmail=true`,
    json({ role: 'writer', type: 'user', emailAddress: COMPARTILHAR_COM })
  ).catch((err) => console.error('[drive] não foi possível compartilhar a pasta', err));
  await gravarConfig(CHAVE.raiz, id);
  return id;
}

/** Subpasta de um relatório (ex.: Relatório_Breves_C1R2), criada quando chega a primeira foto. */
export async function pastaDoRelatorio(recordId: string, nome: string): Promise<string> {
  const guardada = await lerConfig(CHAVE.pasta(recordId));
  if (guardada && (await pastaExiste(guardada))) return guardada;
  const id = await criarPasta(nome, await pastaRaiz());
  await gravarConfig(CHAVE.pasta(recordId), id);
  return id;
}

/**
 * Abre um envio retomável: o navegador manda o arquivo original direto para o Google,
 * sem passar pela hospedagem. O Origin libera o envio do navegador (CORS).
 */
export async function iniciarEnvio(a: { pasta: string; nome: string; mime: string; tamanho: number; origem: string }): Promise<string> {
  const r = await driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': a.mime,
      'X-Upload-Content-Length': String(a.tamanho),
      Origin: a.origem,
    },
    body: JSON.stringify({ name: a.nome, parents: [a.pasta] }),
  });
  const local = r.headers.get('location');
  if (!r.ok || !local) throw new DriveErro(`Não foi possível iniciar o envio para o Google Drive (${r.status}).`, 502);
  return local;
}

export interface ArquivoDrive {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  parents?: string[];
  trashed: boolean;
  thumbnailLink?: string;
  imageMediaMetadata?: { width?: number; height?: number; time?: string };
}

export function arquivo(id: string): Promise<ArquivoDrive> {
  return driveJson<ArquivoDrive>(
    `/files/${encodeURIComponent(id)}?fields=id,name,mimeType,size,parents,trashed,thumbnailLink,imageMediaMetadata(width,height,time)`
  );
}

export async function renomear(id: string, nome: string): Promise<void> {
  await driveJson(`/files/${encodeURIComponent(id)}?fields=id`, { ...json({ name: nome }), method: 'PATCH' });
}

/** Manda para a lixeira do Drive (recuperável por 30 dias), nunca apaga de vez. */
export async function paraLixeira(id: string): Promise<void> {
  await driveJson(`/files/${encodeURIComponent(id)}?fields=id`, { ...json({ trashed: true }), method: 'PATCH' }).catch((err) => {
    if (!(err instanceof DriveErro && err.status === 404)) throw err;
  });
}

/** Versão reduzida gerada pelo próprio Drive, com o lado maior em `lado` pixels. */
export async function miniatura(id: string, lado: number): Promise<Response> {
  const f = await arquivo(id);
  if (!f.thumbnailLink) throw new DriveErro('O Google Drive ainda está gerando a miniatura desta foto.', 404);
  const url = f.thumbnailLink.replace(/=s\d+(-[a-z0-9-]+)?$/i, '') + `=s${lado}`;
  const r = await driveFetch(url);
  if (!r.ok) throw new DriveErro(`Miniatura indisponível no Google Drive (${r.status}).`, 502);
  return r;
}

/** Arquivo original, do jeito que foi enviado. */
export async function original(id: string): Promise<Response> {
  const r = await driveFetch(`/files/${encodeURIComponent(id)}?alt=media`);
  if (!r.ok) throw new DriveErro(`Original indisponível no Google Drive (${r.status}).`, r.status === 404 ? 404 : 502);
  return r;
}

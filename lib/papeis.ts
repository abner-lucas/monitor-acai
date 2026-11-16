/**
 * Níveis de acesso da equipe. Usado no servidor (permissões) e no navegador (o que mostrar).
 *  - superuser: administra a equipe, o Google Drive e tudo o que os outros fazem;
 *  - pesquisador: lança dados (rodízios, relatórios e fotos);
 *  - visualizador: só consulta, imprime e baixa.
 */
export type Papel = 'superuser' | 'pesquisador' | 'visualizador';

export const PAPEIS: Record<Papel, { rotulo: string; descricao: string }> = {
  superuser: { rotulo: 'Administrador', descricao: 'Gerencia a equipe e o Google Drive, além de lançar dados.' },
  pesquisador: { rotulo: 'Lançamento de dados', descricao: 'Registra rodízios, preenche relatórios e envia fotos.' },
  visualizador: { rotulo: 'Visualização', descricao: 'Só consulta, imprime e baixa relatórios, fotos e planilhas.' },
};

export const PAPEIS_ORDEM: Papel[] = ['superuser', 'pesquisador', 'visualizador'];

export const isPapel = (v: unknown): v is Papel => typeof v === 'string' && (PAPEIS_ORDEM as string[]).includes(v);

/** Pode registrar e alterar dados do experimento. */
export const podeEditar = (papel: string | undefined) => papel === 'superuser' || papel === 'pesquisador';

export const SENHA_MINIMA = 10;

/** Motivo para recusar uma senha nova, ou null se ela serve. */
export function problemaSenha(senha: string, email?: string): string | null {
  if (senha.length < SENHA_MINIMA) return `A senha deve ter pelo menos ${SENHA_MINIMA} caracteres.`;
  if (senha.length > 128) return 'A senha deve ter no máximo 128 caracteres.';
  if (!/[A-Za-z]/.test(senha) || !/\d/.test(senha)) return 'Use letras e números na senha.';
  const usuario = email?.split('@')[0]?.toLowerCase();
  if (usuario && usuario.length >= 3 && senha.toLowerCase().includes(usuario)) return 'A senha não pode conter o seu email.';
  if (/^(.)\1+$/.test(senha) || /^(0123456789|1234567890|abcdefghij)/i.test(senha)) return 'Escolha uma senha menos previsível.';
  return null;
}

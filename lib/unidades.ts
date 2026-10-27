/**
 * Unidades piloto do projeto. Cada uma tem rodízio, ciclo e relatórios próprios;
 * a equipe (usuários autorizados) é a mesma nas duas.
 */
export type UnidadeId = 'breves' | 'muana';

export interface Unidade {
  id: UnidadeId;
  nome: string;
  /** Como aparece no relatório de campo, ex.: "Breves (Campus IFPA)". */
  rotuloRelatorio: string;
  /** Descrição curta do local, usada sob o nome da unidade. */
  local: string;
  /** Prefixo dos identificadores de registro (REG-2026-001, MUA-2026-001...). */
  prefixoRegistro: string;
}

export const UNIDADES: Record<UnidadeId, Unidade> = {
  breves: {
    id: 'breves',
    nome: 'Breves',
    rotuloRelatorio: 'Breves (Campus IFPA)',
    local: 'Campus IFPA, Marajó (PA)',
    prefixoRegistro: 'REG',
  },
  muana: {
    id: 'muana',
    nome: 'Muaná',
    rotuloRelatorio: 'Muaná (Estrada da Rodagem)',
    local: 'Estrada da Rodagem, Marajó (PA)',
    prefixoRegistro: 'MUA',
  },
};

export const UNIDADE_IDS: UnidadeId[] = ['breves', 'muana'];

export function isUnidade(valor: unknown): valor is UnidadeId {
  return typeof valor === 'string' && (UNIDADE_IDS as string[]).includes(valor);
}

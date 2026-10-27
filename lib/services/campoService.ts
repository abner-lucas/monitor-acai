import { UnidadeId } from '../unidades';
import { apiRequest } from './apiClient';

/** Ações do dia de campo (rota /api/rotations), sempre numa única transação no servidor. */
export const campoService = {
  registrar(
    unidade: UnidadeId,
    dados: { data: string; responsavel: string; observacoes: string; posicaoDestino?: number; proximaPosicao?: number }
  ) {
    return apiRequest<{ executadoId: string; agendadoId: string | null }>(`/api/rotations?unidade=${unidade}`, {
      method: 'POST',
      body: JSON.stringify({ acao: 'registrar', ...dados }),
    });
  },

  agendar(unidade: UnidadeId, dados: { proximaPosicao: number; responsavel: string }) {
    return apiRequest<{ agendadoId: string }>(`/api/rotations?unidade=${unidade}`, {
      method: 'POST',
      body: JSON.stringify({ acao: 'agendar', ...dados }),
    });
  },
};

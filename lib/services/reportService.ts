import { DadosRelatorio, Relatorio, StatusRelatorio } from '../relatorio';
import { UnidadeId } from '../unidades';
import { apiRequest } from './apiClient';

/** Relatórios de campo dos rodízios (rotas /api/reports). */
export const reportService = {
  async listar(unidade: UnidadeId): Promise<Relatorio[]> {
    const { reports } = await apiRequest<{ reports: Relatorio[] }>(`/api/reports?unidade=${unidade}`);
    return reports;
  },

  async salvar(
    recordId: string,
    dados: { status: StatusRelatorio; assinadoEm: string | null; dados: DadosRelatorio }
  ): Promise<Relatorio> {
    const { report } = await apiRequest<{ report: Relatorio }>(`/api/reports/${encodeURIComponent(recordId)}`, {
      method: 'PUT',
      body: JSON.stringify(dados),
    });
    return report;
  },
};

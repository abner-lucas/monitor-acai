import type { FotoRelatorio } from '../relatorio';
import type { UnidadeId } from '../unidades';
import { ApiError, apiRequest } from './apiClient';

export interface EstadoDrive {
  configurado: boolean;
  conectado: boolean;
  conta: string | null;
  pastaUrl: string | null;
}

/** Tamanhos servidos por /api/fotos/...: p (lista), m (tela cheia), g (impressão) ou o original. */
export type TamanhoFoto = 'p' | 'm' | 'g' | 'original';

export function urlFoto(foto: Pick<FotoRelatorio, 'recordId' | 'numero' | 'versao'>, tam: TamanhoFoto): string {
  return `/api/fotos/${encodeURIComponent(foto.recordId)}/${foto.numero}?tam=${tam}&v=${foto.versao}`;
}

/** Manda o arquivo ao endereço de envio do Google Drive, informando o progresso (0 a 1). */
function enviarAoDrive(uploadUrl: string, arquivo: File, onProgresso: (p: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgresso(e.loaded / e.total);
    xhr.onload = () => {
      try {
        const id = JSON.parse(xhr.responseText)?.id;
        if (xhr.status >= 200 && xhr.status < 300 && id) return resolve(id);
      } catch {
        // cai no erro abaixo
      }
      reject(new ApiError(`O Google Drive recusou o envio (HTTP ${xhr.status}).`, xhr.status));
    };
    xhr.onerror = () => reject(new ApiError('A conexão caiu durante o envio. Tente de novo.', 0));
    xhr.send(arquivo);
  });
}

/** Fotos dos relatórios (originais no Google Drive da conta do projeto). */
export const fotoService = {
  async listar(unidade: UnidadeId): Promise<FotoRelatorio[]> {
    const { fotos } = await apiRequest<{ fotos: FotoRelatorio[] }>(`/api/fotos?unidade=${unidade}`);
    return fotos;
  },

  async enviar(recordId: string, numero: number, arquivo: File, onProgresso: (p: number) => void): Promise<FotoRelatorio> {
    const caminho = `/api/fotos/${encodeURIComponent(recordId)}`;
    const { uploadUrl } = await apiRequest<{ uploadUrl: string }>(caminho, {
      method: 'POST',
      body: JSON.stringify({ acao: 'preparar', numero, tipo: arquivo.type, tamanho: arquivo.size }),
    });
    const arquivoId = await enviarAoDrive(uploadUrl, arquivo, onProgresso);
    const { foto } = await apiRequest<{ foto: FotoRelatorio }>(caminho, {
      method: 'POST',
      body: JSON.stringify({ acao: 'confirmar', numero, arquivoId }),
    });
    return foto;
  },

  async remover(recordId: string, numero: number): Promise<void> {
    await apiRequest(`/api/fotos/${encodeURIComponent(recordId)}/${numero}`, { method: 'DELETE' });
  },

  async drive(): Promise<EstadoDrive> {
    const { drive } = await apiRequest<{ drive: EstadoDrive }>('/api/drive');
    return drive;
  },

  async desconectarDrive(): Promise<EstadoDrive> {
    const { drive } = await apiRequest<{ drive: EstadoDrive }>('/api/drive', { method: 'DELETE' });
    return drive;
  },
};

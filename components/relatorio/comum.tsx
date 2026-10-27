import { CheckCircle2, Clock, FilePen, FileSignature } from 'lucide-react';
import { getPositionById } from '@/lib/constants';
import { doisDigitos, situacaoRelatorio, type Relatorio } from '@/lib/relatorio';

/** Número no formato brasileiro (3,4) ou traço de preenchimento quando vazio. */
export function numeroBR(n: number | null | undefined, vazio = '____'): string {
  return n === null || n === undefined ? vazio : n.toLocaleString('pt-BR');
}

export function descricaoPosicao(posicaoId: number): string {
  const pos = getPositionById(posicaoId);
  return pos ? `Célula ${pos.cellId}, planta ${pos.plantIndex}` : '';
}

export const rotuloPosicao = (posicaoId: number) => `Nº ${doisDigitos(posicaoId)}`;

const SITUACOES = {
  pendente: { texto: 'Pendente', classe: 'border border-dashed border-acai-300 text-acai-800 bg-white', icone: Clock },
  rascunho: { texto: 'Rascunho', classe: 'bg-amber-100 text-amber-900', icone: FilePen },
  concluido: { texto: 'Concluído', classe: 'bg-folha-100 text-folha-800', icone: CheckCircle2 },
  assinado: { texto: 'Assinado', classe: 'bg-agua-100 text-agua-700', icone: FileSignature },
} as const;

export function SeloSituacao({ relatorio }: { relatorio: Relatorio | undefined }) {
  const s = SITUACOES[situacaoRelatorio(relatorio)];
  const Icone = s.icone;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.classe}`}>
      <Icone className="h-3.5 w-3.5" aria-hidden="true" />
      {s.texto}
    </span>
  );
}

import { notFound } from 'next/navigation';
import { isUnidade } from '@/lib/unidades';
import { PainelUnidade } from '@/components/app/PainelUnidade';

export default async function LayoutUnidade({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ unidade: string }>;
}) {
  const { unidade } = await params;
  if (!isUnidade(unidade)) notFound();

  // A chave recria o painel ao trocar de unidade, sem misturar dados de Breves e Muaná.
  return (
    <PainelUnidade key={unidade} unidadeId={unidade}>
      {children}
    </PainelUnidade>
  );
}

import { Sessao } from '@/components/app/Sessao';

export default function LayoutPainel({ children }: { children: React.ReactNode }) {
  return <Sessao>{children}</Sessao>;
}

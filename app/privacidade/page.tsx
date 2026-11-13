import type { Metadata } from 'next';
import Link from 'next/link';
import { MarcaAcai } from '@/components/vivo/MarcaAcai';

export const metadata: Metadata = {
  title: 'Privacidade e termos de uso - MonitorAçaí',
  description: 'Como o MonitorAçaí usa os dados da equipe e o Google Drive do projeto.',
};

/** Página pública exigida pelo Google para a conexão com o Drive (tela de consentimento OAuth). */
export default function Privacidade() {
  return (
    <main className="papel-desenho min-h-screen bg-papel px-4 py-10 sm:py-16">
      <article className="mx-auto max-w-2xl rounded-[28px] bg-white p-6 text-[15px] leading-relaxed text-slate-700 ring-1 ring-folha-100 sm:p-10">
        <Link href="/" className="inline-flex items-center gap-2 text-folha-800">
          <MarcaAcai className="h-8 w-8" />
          <span className="font-display text-lg font-semibold text-grafite">MonitorAçaí</span>
        </Link>

        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-grafite">Privacidade e termos de uso</h1>
        <p className="mt-2 text-sm text-slate-500">Atualizado em 13 de novembro de 2026</p>

        <p className="mt-6">
          O MonitorAçaí é a ferramenta interna do projeto de Manejo Sustentável do Açaí no Marajó (IFPA, Processo CNPq
          445629/2024-0) para registrar o rodízio dos sensores de umidade do solo e os relatórios de campo. O acesso é
          restrito aos pesquisadores autorizados pelo coordenador.
        </p>

        <h2 className="mt-8 font-display text-xl font-semibold text-grafite">Dados guardados</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>Da equipe: nome, e-mail institucional, senha (só o hash) e foto de perfil opcional.</li>
          <li>Do experimento: datas, posições, medições e observações dos rodízios e relatórios de campo.</li>
          <li>Nenhum dado é vendido, compartilhado com terceiros ou usado para publicidade.</li>
        </ul>

        <h2 className="mt-8 font-display text-xl font-semibold text-grafite">Google Drive</h2>
        <p className="mt-3">
          As fotos dos relatórios ficam no Google Drive da conta do projeto. O MonitorAçaí pede somente a permissão
          <code className="mx-1 rounded bg-papel px-1.5 py-0.5 text-[13px]">drive.file</code>: ele cria a pasta das fotos,
          envia os arquivos para ela e lê apenas os arquivos que ele mesmo criou. Não acessa nenhum outro arquivo da conta.
        </p>
        <p className="mt-3">
          O acesso pode ser revogado a qualquer momento pelo coordenador (Equipe → Fotos → Desconectar) ou em
          myaccount.google.com/permissions. As fotos já enviadas continuam no Drive.
        </p>
        <p className="mt-3">
          O uso das informações recebidas das APIs do Google segue a Política de Dados do Usuário dos Serviços de API do
          Google, incluindo os requisitos de uso limitado.
        </p>

        <h2 className="mt-8 font-display text-xl font-semibold text-grafite">Termos de uso</h2>
        <p className="mt-3">
          O uso é exclusivo da equipe do projeto, para fins de pesquisa. Cada pesquisador responde pelos dados que registra.
          Dúvidas ou pedidos de exclusão de dados: Prof. Ábner Lucas, abner.lucas@ifpa.edu.br.
        </p>
      </article>
    </main>
  );
}

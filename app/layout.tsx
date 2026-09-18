import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'MonitorAçaí - Gestão de Rodízio de Sensores (Breves)',
  description: 'Sistema de gestão e sorteio de rodízio aleatório sem reposição de sensores IoT para o SAF de açaí do IFPA Campus Breves.',
  openGraph: {
    title: 'MonitorAçaí - Gestão de Rodízio de Sensores (Breves)',
    description: 'Sistema de gestão e sorteio de rodízio aleatório sem reposição de sensores IoT para o SAF de açaí do IFPA Campus Breves.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MonitorAçaí - Gestão de Rodízio de Sensores (Breves)',
    description: 'Sistema de gestão e sorteio de rodízio aleatório sem reposição de sensores IoT para o SAF de açaí do IFPA Campus Breves.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning className="min-h-screen bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}

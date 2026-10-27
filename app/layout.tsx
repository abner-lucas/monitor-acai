import type {Metadata} from 'next';
import {Bricolage_Grotesque, Public_Sans} from 'next/font/google';
import './globals.css'; // Global styles

// Fontes auto-hospedadas pelo Next (baixadas no build, sem requisição externa no navegador).
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
});

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-public-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MonitorAçaí - Rodízio de Sensores no Marajó',
  description: 'Sistema de gestão e sorteio de rodízio aleatório sem reposição de sensores IoT nos SAFs de açaí de Breves e Muaná (Marajó).',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: 'MonitorAçaí - Rodízio de Sensores no Marajó',
    description: 'Sistema de gestão e sorteio de rodízio aleatório sem reposição de sensores IoT nos SAFs de açaí de Breves e Muaná (Marajó).',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MonitorAçaí - Rodízio de Sensores no Marajó',
    description: 'Sistema de gestão e sorteio de rodízio aleatório sem reposição de sensores IoT nos SAFs de açaí de Breves e Muaná (Marajó).',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className={`${bricolage.variable} ${publicSans.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning className="min-h-screen bg-papel text-grafite antialiased">{children}</body>
    </html>
  );
}

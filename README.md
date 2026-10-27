# MonitorAçaí — Gestão de Rodízio de Sensores (IFPA Breves)

Sistema de gestão, acompanhamento e sorteio de rodízio aleatório sem reposição de sensores de umidade do solo (FDR) no Sistema Agroflorestal (SAF) irrigado de Açaí (*Euterpe oleracea*) do **IFPA Campus Breves (Marajó/PA)**.

Em produção: **https://monitoracai.profabnerlucas.com** (Hostinger).

---

## 🚀 Tecnologias

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router) + React 19 + TypeScript
- **Estilização:** Tailwind CSS + Lucide React
- **Banco de Dados:** MySQL da própria hospedagem Hostinger (acessado só pelo servidor, via rotas `/api`)
- **Autenticação:** senhas com hash bcrypt e sessão em cookie httpOnly assinado
- **Exportação:** Planilhas Excel nativas (.xlsx via SheetJS) e CSV (UTF-8 com BOM)

---

## 🗄️ Banco de dados

As tabelas são criadas automaticamente na primeira requisição (`lib/server/db.ts`):

| Tabela | Conteúdo |
| --- | --- |
| `rotation_records` | Registros de instalação/retirada dos sensores em cada posição e ciclo |
| `app_settings` | Configurações do app (ciclo atual em `current_cycle`) |
| `authorized_users` | Pesquisadores autorizados e coordenador (senha guardada só como hash) |

---

## 🛠️ Execução Local

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Copie `.env.example` para `.env.local` e preencha:
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: dados do banco MySQL. Para usar o banco da Hostinger fora do servidor, use o host remoto (`srvNNNN.hstgr.io`) e libere seu IP em *hPanel → Bancos de dados → MySQL remoto*.
   - `SESSION_SECRET`: texto aleatório com pelo menos 32 caracteres.

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   Acesse: [http://localhost:3000](http://localhost:3000)

---

## ☁️ Publicação na Hostinger

O site é um app Node.js na Hostinger, conectado a este repositório do GitHub: **cada push na branch `master` gera um novo build e publica automaticamente.**

Configuração do app (hPanel → Sites → `monitoracai.profabnerlucas.com` → Node.js):

- **Framework:** Next.js · **Node:** 22 · **Build:** `npm run build` · **Saída:** `.next`
- **Variáveis de ambiente:** `DB_HOST=127.0.0.1`, `DB_PORT=3306`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` e `SESSION_SECRET`. No servidor o banco é acessado por `127.0.0.1`, nunca pelo host remoto.

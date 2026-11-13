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

## 📁 Estrutura

```
app/
  (painel)/[unidade]/        páginas de cada unidade (/breves, /muana)
    page.tsx                 painel: sensor em campo, indicadores e planta baixa
    historico/               tabela de registros
    relatorios/              lista, folha A4 e formulário do relatório de campo
  api/                       rotas do servidor (login, registros, rodízios, relatórios, fotos, Drive, equipe)
  privacidade/               política de privacidade (pública, exigida pelo Google)
components/
  app/                       sessão, painel da unidade e cabeçalho
  graficos/                  indicadores do ciclo
  relatorio/                 folha, formulário e fotos do relatório
  vivo/                      peças visuais compartilhadas (janela, abas, avatar, animações)
lib/
  server/                    acesso ao MySQL (só no servidor)
  services/                  chamadas do navegador para a API
  relatorio.ts, unidades.ts, constants.ts, storage.ts
docs/esquema.jpeg            croqui original de campo do SAF
scripts/verify-all-3x.mjs    verificação rápida (npm run verificar, com o servidor em localhost:3000)
```

## 🌿 Como usar no dia de campo

1. No painel da unidade (Breves ou Muaná), toque em **Registrar rodízio**.
2. Confira a data da troca: a posição em campo é concluída nessa data, a posição já sorteada passa a ativa e a próxima troca fica para +14 dias.
3. Deixe marcado **Já sortear a próxima posição**: ela fica agendada para a próxima troca.
4. O relatório de campo da nova posição abre em seguida, já com a origem preenchida. Preencha, envie as fotos no passo **Fotos e conclusão**, salve em PDF e assine no gov.br.

Também é possível sortear a próxima posição antes do dia da troca (**Sortear próxima posição**).

## 📷 Fotos dos relatórios

- Os originais ficam no **Google Drive** da conta do projeto, na pasta "MonitorAçaí — Fotos dos relatórios" (uma subpasta por relatório, ex.: `Relatório_Breves_C1R1`), compartilhada com abner.lucas@ifpa.edu.br.
- O navegador envia cada foto **direto ao Drive** (sem passar pela hospedagem); o site mostra só versões reduzidas geradas pelo Drive, e o botão "Baixar original" traz o arquivo completo.
- O PDF do relatório ganha uma página final, o **anexo fotográfico**, com as fotos em 2000 px.
- Configuração: `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` (projeto "MonitorAcai" no Google Cloud, conta abnerlucas.cad@gmail.com) e, uma vez, **Equipe → Fotos → Conectar Google Drive** com o coordenador.

## 🗄️ Banco de dados

As tabelas são criadas automaticamente na primeira requisição (`lib/server/db.ts`):

| Tabela | Conteúdo |
| --- | --- |
| `rotation_records` | Registros de instalação/retirada dos sensores em cada posição, ciclo e unidade (`site`) |
| `rotation_reports` | Relatório de campo de cada rodízio (campos do formulário em JSON) |
| `app_settings` | Configurações do app (ciclo atual de Breves em `current_cycle`, de Muaná em `current_cycle:muana`) |
| `authorized_users` | Pesquisadores autorizados e coordenador (senha guardada só como hash) |
| `report_photos` | Fotos de cada relatório (1 a 8): só a referência ao arquivo no Google Drive |

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
- **Variáveis de ambiente:** `DB_HOST=127.0.0.1`, `DB_PORT=3306`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `SESSION_SECRET`, `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`. No servidor o banco é acessado por `127.0.0.1`, nunca pelo host remoto.

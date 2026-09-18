# MonitorAçaí — Gestão de Rodízio de Sensores (IFPA Breves)

Sistema de gestão, acompanhamento e sorteio de rodízio aleatório sem reposição de sensores de umidade do solo (FDR) no Sistema Agroflorestal (SAF) irrigado de Açaí (*Euterpe oleracea*) do **IFPA Campus Breves (Marajó/PA)**.

---

## 🚀 Tecnologias

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router) + React 19 + TypeScript
- **Estilização:** Tailwind CSS + Lucide React
- **Banco de Dados:** [Supabase](https://supabase.com/) (PostgreSQL em Nuvem)
- **Exportação:** Planilhas Excel nativas (.xlsx via SheetJS) e CSV (UTF-8 com BOM)

---

## 🛠️ Execução Local

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Configure as variáveis em `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL="https://seu-projeto.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="sua-chave-anon"
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   Acesse: [http://localhost:3000](http://localhost:3000)

---

## ☁️ Como Subir na Vercel

### Método 1: Via GitHub (Recomendado)

1. **Faça o commit e envie para o seu GitHub:**
   ```bash
   git add .
   git commit -m "feat: MonitorAcai pronto para producao com Supabase"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
   git push -u origin main
   ```

2. **Importe na Vercel:**
   - Acesse [vercel.com](https://vercel.com) e faça login.
   - Clique em **"Add New..."** > **"Project"**.
   - Selecione o repositório GitHub do projeto.

3. **Configure as Variáveis de Ambiente na Vercel:**
   Na tela de importação (ou em *Settings > Environment Variables*), adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`: sua URL do projeto Supabase.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: sua chave pública `anon`.

4. **Clique em "Deploy":**
   A Vercel detectará automaticamente o framework Next.js e fará a compilação e publicação global da sua aplicação.

---

### Método 2: Via Vercel CLI

Se tiver a [Vercel CLI](https://vercel.com/docs/cli) instalada:
```bash
npx vercel
```
Siga as instruções no terminal e insira as variáveis de ambiente quando solicitado.

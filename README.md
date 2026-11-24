<p align="center">
  <img src="docs/assets/readme/banner.svg" alt="Wallet — finanças pessoais em meticais" width="100%">
</p>

<p align="center">
  <b>Orçamento do mês, plano anual, pagamentos que se confirmam sozinhos, metas, dívidas e um assistente que responde com os teus dados.</b><br>
  Feito para quem vive em meticais, com contas no BIM, na M-Pesa e no Xitique.
</p>

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB">
  <img alt="TanStack" src="https://img.shields.io/badge/TanStack_Start-FF4154?logo=reactquery&logoColor=white">
  <img alt="Fastify" src="https://img.shields.io/badge/Fastify-000000?logo=fastify&logoColor=white">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white">
  <img alt="Drizzle" src="https://img.shields.io/badge/Drizzle-C5F74F?logo=drizzle&logoColor=black">
  <img alt="Tauri" src="https://img.shields.io/badge/Tauri-24C8D8?logo=tauri&logoColor=white">
</p>

---

<p align="center">
  <img src="docs/assets/readme/painel.png" alt="Painel do Wallet" width="100%">
</p>

## Porquê

A maior parte das apps de finanças regista o que já gastaste. O Wallet começa antes: fazes o **plano do ano**, ele gera a **lista de cada mês**, e cada item que marcas como pago cria a transacção na conta certa. No fim do mês sabes o que foi planeado, o que saiu e o que ainda falta, ao centavo.

- **Em meticais, sem arredondamentos.** Todos os valores são guardados em centavos inteiros e as datas seguem a hora de Maputo.
- **Os teus dados entram de onde já estão.** Importa o export CSV da app Wallet e a folha `Calculo Financeiro` em Excel, com revisão antes de gravar.
- **Teclado primeiro.** `⌘K` para procurar ou perguntar, `⌘N` para nova transacção, `⌘1–0` para saltar entre ecrãs.
- **Web e desktop.** A mesma app corre no browser e como aplicação nativa (Tauri) no macOS, com notificações locais.

## O que faz

| | |
|---|---|
| **Painel** | Saldo total, planeado vs. gasto no mês, entradas e saídas do ano e o que falta pagar. |
| **Orçamento do mês** | Lista com fixos, poupança, variáveis e pontuais. Marcar um item cria a transacção. |
| **Plano anual** | O plano do ano, que gera a lista de cada mês com um clique. |
| **Pagamentos planeados** | Renda, propinas, internet, Xitique. Mostra próximos e atrasados, envia lembretes e pode **confirmar sozinho no dia**. |
| **Transacções e transferências** | Filtros, etiquetas, pessoas e o mês de referência separado da data. |
| **Metas** | Poupança com prazo e contribuição mensal, ligada ao plano. |
| **Dívidas** | Quem deve a quem, pagamentos parciais e histórico. |
| **Compras** | Lista de compras que lembra o último preço e regista a despesa ao comprar. |
| **Estatísticas** | Para onde vai o dinheiro, por categoria, pessoa e etiqueta. |
| **Assistente** | Perguntas em português sobre os teus números, respondidas só com os teus dados. |
| **Definições** | Tema, PIN, esconder valores, notificações e atalhos configuráveis. |

## Ecrãs

<p align="center">
  <img src="docs/assets/readme/pagamentos.png" alt="Pagamentos planeados" width="100%">
  <br><sub><b>Pagamentos planeados</b>: atrasados, desta semana e confirmar num clique</sub>
</p>

<sub>As imagens são do design da UI, com dados de exemplo.</sub>

## Arquitectura

```
wallet/
├── apps/
│   ├── web/          React + TanStack Start (web e desktop Tauri)
│   └── server/       API Fastify, módulos em camadas + tarefas pg-boss
└── packages/
    ├── db/           Schema Drizzle e migrações (PostgreSQL)
    ├── shared/       Contratos zod, dinheiro, meses e datas partilhados
    ├── auth/         Better Auth (cookies na web, bearer no desktop)
    └── ui/           Componentes base (shadcn/ui)
```

- **Servidor:** cada módulo em `apps/server/src/modules/*` tem `repository → service → controller → routes`, e as dependências entre módulos são injectadas em `app.ts`.
- **Contratos:** os schemas zod em `packages/shared` validam a API e dão os tipos à web.
- **Tarefas em segundo plano:** o [pg-boss](https://github.com/timgit/pg-boss) usa o próprio Postgres. A confirmação automática dos pagamentos planeados corre de hora a hora (Africa/Maputo) e ao arrancar o servidor.
- **Web:** as rotas públicas são pré-renderizadas e as privadas correm só no cliente. O resultado é estático (`.output/public`), por isso o mesmo build serve o browser e o Tauri.

## Começar

Precisas de **Node 22.12+** e **Docker** (para o Postgres).

```bash
npm install
npm run db:start          # Postgres em Docker na porta 5432
npm run db:migrate        # aplica as migrações
npm run dev               # web em :3001, API em :3000
```

Cria `apps/server/.env` com os valores locais. O schema está em [apps/server/.env.schema](apps/server/.env.schema).

```dotenv
BETTER_AUTH_SECRET=uma-string-aleatoria-com-32-ou-mais-caracteres
BETTER_AUTH_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3001
DATABASE_URL=postgresql://postgres:password@localhost:5432/wallet
```

E `apps/web/.env`:

```dotenv
VITE_SERVER_URL=http://localhost:3000
```

> Os ficheiros `.env.schema` vão para o git e só descrevem as variáveis. Os valores reais ficam nos `.env` (ignorados) ou na plataforma de deploy.

### Desktop

```bash
npm run dev:server        # a app desktop usa a API local
npm run desktop:dev       # abre a app Tauri
npm run desktop:build     # gera .app e .dmg em apps/web/src-tauri/target/release/bundle/
```

Para um build que fale com a API em produção:

```bash
VITE_SERVER_URL=https://api.teu-dominio npm run desktop:build
```

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Web e API em modo de desenvolvimento |
| `npm run dev:web` / `dev:server` | Só a web ou só a API |
| `npm run build` | Build de todos os pacotes |
| `npm run check-types` | TypeScript em todo o monorepo |
| `npm run check` | Biome (formatação e lint) |
| `npm run db:generate` | Gera uma migração a partir do schema |
| `npm run db:migrate` | Aplica as migrações |
| `npm run db:studio` | Drizzle Studio |
| `npm run desktop:dev` / `desktop:build` | App Tauri |
| `npm test` (em `apps/server`) | Testes unitários e e2e (precisa do Postgres) |

## Deploy

| Parte | Onde | Como |
|---|---|---|
| **API** | Coolify, ou qualquer host com Docker | [apps/server/Dockerfile](apps/server/Dockerfile). Aplica as migrações ao arrancar e corre o pg-boss. |
| **Web** | Vercel, ou qualquer host estático | `npm run build` em `apps/web`. Define `VITE_SERVER_URL` no build. |
| **Base de dados** | PostgreSQL (o `docker-compose.yml` usa a 18) | Pode ser o Postgres do Coolify. Não a exponhas publicamente. |
| **Desktop** | macOS | `npm run desktop:build` com o `VITE_SERVER_URL` de produção. |

**Coolify (API):** cria um recurso a partir do repositório do GitHub com o build pack **Dockerfile**, *Base Directory* `/`, *Dockerfile Location* `/apps/server/Dockerfile` e porta `3000`. Variáveis de ambiente:

```dotenv
DATABASE_URL=postgresql://…@<host-interno>:5432/wallet
BETTER_AUTH_SECRET=…                    # 32+ caracteres
BETTER_AUTH_URL=https://api.teu-dominio
CORS_ORIGIN=https://wallet.teu-dominio
```

A API não corre em serverless (Vercel Functions), porque o pg-boss precisa de um processo sempre ligado.

## Stack

[TanStack Start](https://tanstack.com/start) · [React](https://react.dev) · [Tailwind CSS](https://tailwindcss.com) · [shadcn/ui](https://ui.shadcn.com) · [Fastify](https://fastify.dev) · [Drizzle ORM](https://orm.drizzle.team) · [PostgreSQL](https://www.postgresql.org) · [pg-boss](https://github.com/timgit/pg-boss) · [Better Auth](https://better-auth.com) · [Zod](https://zod.dev) · [Tauri](https://tauri.app) · [Vitest](https://vitest.dev) · [Biome](https://biomejs.dev) · [Varlock](https://varlock.dev)

<p align="center"><sub>Feito em Moçambique 🇲🇿</sub></p>

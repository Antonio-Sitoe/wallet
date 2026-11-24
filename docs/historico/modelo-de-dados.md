# Modelo de dados base

Retirado do plano "Wallet — Plano do App" em 2026-11-23. Era a proposta inicial; o esquema real está em `packages/db/src/schema/` (Drizzle, não Prisma).

Dez tabelas no MVP, desenhadas para receber o export do Wallet sem perder nada; Metas e Dívidas entram na fase 2. Valores em centavos (inteiro) para evitar erros de arredondamento.

| Tabela | Campos principais | Nota |
|---|---|---|
| users | id, nome, email, moeda_base (MZN) | Um utilizador por agora |
| accounts | id, nome, tipo (banco, carteira móvel, cash, poupança), saldo_inicial, cor, arquivada | As 7 contas do Wallet entram no import |
| categories | id, nome, tipo (entrada/saída), parent_id, ícone, cor | Subcategorias via parent_id |
| category_map | nome_wallet, category_id | "Transportation" → Transporte, etc. Reutilizado em cada import |
| transactions | id, account_id, category_id, tipo, valor, data, mes_referencia, nota, payee, labels, payment_type, moeda, valor_moeda_ref, transfer_id, month_item_id, import_hash, import_batch_id | import_hash = conta+categoria+valor+tipo+data+nota, evita duplicados |
| transfers | id, from_account_id, to_account_id, valor, data | Junta os pares do Wallet num só registo |
| import_batches | id, ficheiro, origem (wallet-csv / folha-excel), data, linhas_lidas, novas, duplicadas, para_rever | Histórico de imports e desfazer |
| budget_plans + plan_items + month_items | plano: ano, salário previsto; plan_item: nome, category_id, valor, frequência (mensal/meses/única), conta_padrão, parcial; month_item: mês, plan_item_id, valor_planeado, estado, não_planeado | Check cria transacção com month_item_id; gasto = soma dessas transacções |
| goals (fase 2) | id, nome, valor_alvo, account_id, prazo | Ex.: Xitique (Poupança), BIM (Poupança), Obra |
| debts (fase 2) | id, pessoa, direção (devo/devem-me), valor, pago | Gerado a partir das notas "→" e do payee |

**Stack proposta:** Node + Fastify (ou Express) + Prisma + PostgreSQL no servidor; React + Vite + TypeScript + TanStack Query + Tailwind no frontend; Tauri 2 a envolver o mesmo build para desktop.

# Data de corte: 1 de Dezembro de 2026

Retirado do plano "Wallet — Plano do App" em 2026-11-23.

A partir de 1 de Dezembro de 2026, o app passa a ser a fonte de verdade. Isto resolve as três falhas da folha: o salário não registado, a falta de saldos reais e a falta de comparação entre planeado e real.

| Falha da folha | Como fica resolvida |
|---|---|
| Salário não registado | Salário previsto no plano anual + entrada real registada quando cai (ex.: Salário · FCBANK · +55 000, com mês de referência). Outras entradas com categoria própria |
| Sem saldo real das contas | Saldo inicial real de cada conta no dia de corte; depois saldo = inicial + transacções; reconciliação mensal com transacção "Acerto" para a diferença |
| Planeado vs real | Cada item do mês soma as transacções ligadas a ele; diferença por item, mês e ano |

## Passos, por ordem

1. Importar o histórico do Wallet (Mar 2023 – Nov 2026) só para consulta e estatísticas: não define saldos
2. A 1 de Dezembro, registar o saldo real de cada conta: FCBANK, BIM, BIM (Poupança), BCI, Emola, M-Pesa, Numerário, Xitique (Poupança)
3. Criar o plano de Dezembro com o salário previsto
4. Registar o salário quando entrar e ir marcando os itens da lista
5. No fim de Dezembro, reconciliar cada conta com o saldo real (acerto para a diferença)

Outubro e Novembro de 2026 ficam só na folha.

## Estado em 2026-11-23

| Passo | No app | Feito com os teus dados |
|---|---|---|
| 1. Importar histórico | Sim (importação do CSV do Wallet) | Sim: 3132 transacções, 31 Mar 2023 – 23 Nov 2026 |
| 2. Saldo real a 1 Dez | Sim (saldo inicial por conta, "Definir saldos", acerto) | Não (só a 1 Dez). Falta a conta M-Pesa |
| 3. Plano de Dezembro com salário | Sim (plano anual com entrada prevista, gerar listas) | Sim: plano 2026 com 55 500 previstos, lista de Dez com 15 itens |
| 4. Registar salário e marcar itens | Sim (entrada com mês de referência, pagamento de itens) | Ainda não (Dezembro) |
| 5. Reconciliar no fim de Dezembro | Sim (reconciliar conta → transacção "Acerto") | Ainda não (fim de Dezembro) |

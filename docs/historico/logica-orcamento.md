# Lógica do orçamento (lista + orçamento)

Retirado do plano "Wallet — Plano do App" em 2026-11-23. Implementado.

O orçamento funciona como uma lista de compras com valores. Planeias o ano uma vez, e cada mês vais marcando os itens pagos. Cada marca cria a transacção sozinha e actualiza o que falta gastar.

## Como funciona

1. **Plano anual (Janeiro):** crias a lista de itens com valor e frequência: mensal (Moradia 5 000, Escola de Sarita 3 150, Internet 1 900), em meses específicos (Escola de Inglês Jun–Ago) ou uma vez (iPhone 36 000 em Junho). O app gera os 12 meses automaticamente.
2. **Lista do mês:** cada mês abre como uma checklist com os itens planeados, o total previsto e o salário.
3. **Check = transacção:** marcar um item cria a despesa na conta escolhida (por defeito a última usada para esse item). O valor vem preenchido e pode ser alterado antes de confirmar. O mês de referência é o mês da lista.
4. **Check parcial:** itens que se gastam aos poucos (Alimentação, Transporte) aceitam vários lançamentos e mostram uma barra: gasto / planeado.
5. **Desmarcar:** apaga a transacção criada (com confirmação).
6. **Item fora do plano:** adicionas na hora (ex.: presente, imprevisto), fica marcado como "não planeado" e conta no total do mês.

## O que vês em cada momento

| Nível | Mostra |
|---|---|
| Item | Planeado, gasto, falta e estado (por pagar / parcial / pago / passou do valor) |
| Mês | Total planeado vs gasto, quanto falta gastar, quanto sobra do salário, itens não planeados |
| Ano | Por item: projectado no ano vs gasto até hoje, e se estás dentro ou acima do ritmo (ex.: Transporte 36 000/ano, 31 000 gastos em Novembro = dentro) |

## Regras (decididas)

- [x] Se um item fica abaixo do valor, a diferença fica na conta (não passa para o mês seguinte).
- [x] Mudar o valor de um item no plano anual afecta os meses a partir de um mês escolhido; meses já pagos ficam como estão.
- [x] As transacções registadas fora da lista (ex.: o transporte de 100 MZN por dia) ligam-se ao item certo pela categoria.

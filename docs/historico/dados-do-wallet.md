# Os teus dados do Wallet (base de dados)

Retirado do plano "Wallet — Plano do App" em 2026-11-23.

O export do Wallet tem 2 972 transacções únicas de Março 2023 a Novembro 2026, e o app arranca com elas. O ficheiro `wallet_records_2.csv` contém o histórico todo. Os outros dois são subconjuntos de 2026 sem nenhuma linha nova, por isso o importador tem de eliminar duplicados.

| O que os dados têm | Detalhe | Como o app trata |
|---|---|---|
| Formato | CSV separado por `;`: account, category, currency, amount, ref_currency_amount, type, payment_type, note, date, transfer, payee, labels | Importador nativo deste formato (fase 1) |
| Volume | 2023: 325 · 2024: 907 · 2025: 866 · 2026: 875 | Lista paginada / virtualizada, filtros por período |
| 7 contas | Numerário (1 559), BIM (1 038), BIM (Poupança) (161), FCBANK (156), BCI (30), Emola (26), Xitique (Poupança) (2) | Contas criadas automaticamente no import |
| Transferências | 825 linhas com transfer=true, em pares (saída numa conta + entrada noutra, mesma data); 405 pares, 5 linhas soltas e 1 grupo de 10 | Juntar cada par numa só transferência; linhas soltas ficam para revisão manual |
| 68 categorias | Padrão do Wallet em inglês (Transportation, Food & Drinks…) + tuas (Faculdade, Escola de junior, Estique ou xitique, Construção, Mesada de wil, Servidores, Spotify) | Tabela de mapeamento para categorias em português |
| Nota = mês de referência | 288 de 407 notas são nomes de mês (ex.: Transporte 2 000 com nota "Abril", lançado a 11 de Maio) | Campo próprio mês do orçamento, separado da data |
| Dívidas na nota | 115 notas "Pessoa → Eu" / "Eu → Pessoa", em Loans, interests e Lending, renting, com payee preenchido (Edilson, Amilcar Paco, Mama, Delcio…) | Converter em dívidas por pessoa (fase 4) |
| Transporte diário | 845 registos, quase todos 100 MZN em dias úteis | Botão de registo rápido / recorrente diário |
| Campos vazios | labels sempre vazio, payment_type sempre Cash, currency sempre MZN | Guardar no import, sem UI de destaque no MVP |

Desde Outubro de 2026 quase não há despesas registadas (6 367 MZN em Outubro, 900 em Novembro). Os meses recentes estão na folha, e por isso o import tem de juntar as duas fontes.

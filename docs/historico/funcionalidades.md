# Funcionalidades principais

Copiado do plano "Wallet — Plano do App" em 2026-11-23.

O MVP substitui a folha por completo; o resto vem depois, uma funcionalidade de cada vez.

## MVP — substitui a folha (feito)

1. **Contas** — Banco, M-Pesa, e-Mola, Cash, Emergência; cada uma com saldo.
2. **Transacções** — entrada, saída e transferência entre contas (ex.: Banco → Emergência).
3. **Categorias** — baseadas na folha: Moradia, Alimentação, Transporte, Educação (Escola de Sarita, Inglês, Explicação), Família (Vovós), Comunicações (Internet, Crédito), Subscrições, Obra, Social/Imprevistos, Roupa, Saúde.
4. **Orçamento anual + lista do mês** — planeias o ano uma vez; cada mês é uma checklist com planeado, gasto e falta, por item, mês e ano.
5. **Check = transacção** — marcar um item como pago cria a despesa automaticamente; itens parciais aceitam vários lançamentos.
6. **Dashboard** — saldo total, gasto do mês, top categorias, progresso do orçamento.
7. **Importar o histórico do Wallet (CSV, 2023–2026) e a folha** — trazer os meses de 2026 do Excel para ter histórico desde o início.

## Depois — fase 2

- **Metas** — Obra (27 000 / 50 000), Emergência, Estique, mudança de país; com progresso e contribuição mensal.
- **Dívidas** — a receber e a pagar, por pessoa, com pagamentos parciais.
- **Pagamentos planeados** — recorrentes com lembrete (Internet, Escola, subscrições).
- **Estatísticas** — evolução mensal, gasto por categoria e por pessoa, comparação entre meses.
- **Etiquetas** — pessoas (Sarita, Auzenda…), projectos (Obra), eventos.

## Mais tarde — fase 3

- Integração com WhatsApp: enviar "transporte 100" ou "alimentação 1500 m-pesa" para um número e o app cria a transacção ou faz o check do item do mês. Também perguntar "quanto falta em Novembro?".
- Xitique (grupos rotativos: quem recebe em que mês).
- Multi-moeda (USD/ZAR para subscrições e mudança de país).
- Anexos (recibos, fotos).
- Exportar para Excel/CSV.
- "Modo gestor": antes de uma compra grande, o app mostra o impacto nas metas.
- App mobile (Tauri mobile ou PWA).

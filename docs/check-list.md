Fase 8 — Pesquisa ⌘K e Assistente IA
Backend
[ ] Endpoint de IA que responde só com os dados do utilizador e devolve a fonte de cada resposta (a rota e a interface AssistantProvider já existem; falta ligar um modelo)
[ ] IA propõe transacções; nada é gravado sem confirmação
[ ] Anexos CSV / Excel lidos pela IA e enviados para a pré-visualização do import

[ ] Deploy do servidor (ex.: Coolify)
[ ] Instalador desktop (macOS primeiro) e deploy web
Fase 10 — WhatsApp
Backend
[ ] Escolher a via: WhatsApp Cloud API (Meta) ou um fornecedor (Twilio)
[ ] Webhook no servidor Node que só aceita o teu número
[ ] Interpretar a mensagem ("item valor conta") e confirmar antes de gravar
[ ] Consultas: saldo, quanto falta no mês, gasto de um item
Frontend
[ ] Definições › WhatsApp: ligar número, exemplos de mensagens

Fase 11 — Desktop offline-first
Backend
[ ] Sincronização entre a base local e o servidor, com resolução de conflitos
Frontend
[ ] SQLite local no desktop: o app funciona sem ligação e sincroniza quando volta
[ ] Indicador de sincronização e de alterações por enviar
[ ] Versao mobile do frontend tem que ser melhorada na web.

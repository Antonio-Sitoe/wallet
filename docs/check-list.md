Fase 8 — Pesquisa ⌘K e Assistente IA

Já existe: rotas e conversas em apps/server/src/modules/assistant, interface AssistantProvider (hoje PlaceholderProvider), GET /assistant/status, AssistantAnswerData com rows/source/actions já mostrados no chat-messages.tsx, e os imports POST /imports/wallet (CSV) e POST /imports/sheet (Excel) que devolvem uma pré-visualização.

Regras: o modelo nunca vê a base, só chama ferramentas que recebem o userId do pedido; cada ferramenta devolve a sua fonte; o modelo nunca grava, só propõe.

Passo 1 — Ligar o modelo (Backend)
[ ] Adicionar @anthropic-ai/sdk ao apps/server
[ ] .env.schema: ANTHROPIC_API_KEY (opcional, sensível) e ASSISTANT_MODEL (default claude-opus-5-5)
[ ] assistant.claude.ts: ClaudeProvider implements AssistantProvider (name "Claude", connected true)
[ ] app.ts: usar ClaudeProvider quando há chave; senão fica o PlaceholderProvider
[ ] System prompt fixo: português, valores em MZN, números só das ferramentas, dizer quando não há dados
[ ] Fallback em recusas (fallbacks: "default")
[ ] Verificar: /assistant/status com connected true e uma pergunta simples respondida

Passo 2 — Ferramentas de leitura e fonte (Backend)
[ ] assistant.tools.ts com Tool Runner do SDK e schemas zod; cada ferramenta devolve { data, source }
[ ] listar_contas (accounts.service, saldos)
[ ] procurar_transaccoes: período, conta, categoria, texto, tipo (transactions.service.list)
[ ] resumo_mes (dashboard / analytics)
[ ] orcamento_mes: planeado vs gasto, quanto falta (budgets.service)
[ ] listar_categorias (categories.service)
[ ] createAssistantModule recebe estes services como dependências, como em buildModules
[ ] Provider junta as fontes usadas em data.source e preenche data.rows quando há listas de valores
[ ] e2e: só vêm dados do utilizador do pedido
[ ] Verificar: "quanto gastei em comida este mês?" com resposta e fonte certas

Passo 3 — IA propõe transacções, nada gravado sem confirmação
Backend
[ ] AssistantAnswerData.proposals (transacção ou transferência, com kind) em packages/shared
[ ] Ferramenta propor_transaccao: valida com createTransactionInput / createTransferInput, resolve conta e categoria pelo nome, não grava
Frontend
[ ] Cartão de proposta no chat-messages.tsx: tipo, valor, conta, categoria, data
[ ] Confirmar → POST /transactions ou /transfers com os hooks que já existem; cartão fica marcado como gravado
[ ] Editar → abre o formulário de transacção preenchido
[ ] Verificar: "gastei 250 de pão na M-Pesa" mostra o cartão e nada é gravado antes de Confirmar

Passo 4 — Anexos CSV / Excel para a pré-visualização do import
Frontend
[ ] Botão de anexo no input do chat; lê CSV como texto e xlsx como base64
Backend
[ ] sendMessageInput aceita attachment opcional { name, content | contentBase64 }
[ ] assistant.service.send: pela extensão chama createWalletImport ou sheet.preview e responde com a acção "Rever importação"
[ ] O modelo recebe só um resumo da pré-visualização (linhas, período, contas), nunca o ficheiro inteiro
[ ] Verificar: anexar um CSV abre a pré-visualização certa e nada é importado sem o commit do ecrã de import

Passo 5 — Acabamentos
[ ] Limite de pedidos por utilizador (ex.: 30/hora) e limite do histórico enviado ao modelo
[ ] Mensagem clara quando não há chave ou a API falha
[ ] Definições mostram o estado do assistente (info-sections.tsx)

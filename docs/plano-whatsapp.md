# WhatsApp → Wallet com Evolution API + n8n

## Contexto
Fase 10 da checklist. O utilizador já tem Evolution API (gateway WhatsApp) e n8n. Quer só: saldos, entradas/saídas, transferências. **Não precisa de "bot" à parte**: a Evolution API recebe/envia mensagens e o n8n é o bot (fluxo). O servidor wallet já tem os endpoints; só falta uma mudança pequena na autenticação (Basic Auth, ver abaixo).

Endpoints existentes (Fastify, todos com o prefixo `/api`):
- `GET /api/accounts` → lista de contas activas com saldo (apps/server/src/modules/accounts/accounts.routes.ts)
- `POST /api/transactions` → `{ id?, type: "expense"|"income", accountId, amount (cêntimos, >0), occurredAt, note?, categoryId? }` (packages/shared/src/contracts/transactions.ts)
- `POST /api/transfers` → `{ id?, fromAccountId, toAccountId, amount (cêntimos), occurredAt, note? }`
- O `id` é opcional e torna o POST idempotente: repetir o mesmo `id` devolve o registo que já existe.

## Autenticação: Basic Auth (sem token)
O n8n manda em todos os pedidos `Authorization: Basic base64(email:palavra-passe)`. Não há token para gerar nem nada que expire.

Mudança no servidor (única alteração de código):
- `apps/server/src/shared/middleware/auth-guard.ts`: se o header começar por `Basic `, descodificar `email:palavra-passe`, procurar o utilizador pelo email e a conta `providerId = "credential"`, e verificar com `verifyPassword` de `better-auth/crypto`. Se bater, `request.userId = user.id`; se não, 401. Sem header Basic, continua como hoje (sessão por cookie ou Bearer).
- Não cria sessão: não aparece em "Sessões activas" e "Terminar outras sessões" não o corta.
- Limitar tentativas falhadas (ex.: 5 por minuto por IP e por email) para não permitir adivinhar a palavra-passe.
- Mudar a palavra-passe da conta obriga a actualizar a credencial no n8n.
- Só por HTTPS: Basic Auth manda a palavra-passe em cada pedido (base64 não é cifra).
- Testes e2e: Basic certo → 200; palavra-passe errada → 401; email inexistente → 401; Basic e Bearer não se misturam.

No n8n: credencial "Basic Auth" (utilizador = email, palavra-passe = a da conta) nos nós HTTP Request para o wallet.

## Sintaxe das mensagens (fixa, sem IA)
- `saldo` → lista todas as contas e saldos
- `- 250 mpesa pão` → saída de 250 MZN na conta "M-Pesa", nota "pão"
- `+ 5000 bci salário` → entrada
- `t 1000 bci mpesa` → transferência BCI → M-Pesa
- Opcional: `#categoria` no fim (`- 250 mpesa pão #alimentação`) para a despesa não ficar "sem categoria" nas estatísticas

## Passo a passo

1. **Servidor** — Basic Auth no auth guard (secção acima), com testes.

2. **Evolution API → n8n** — na instância Evolution, configurar webhook para o URL de um nó *Webhook* do n8n, evento `MESSAGES_UPSERT`. A instância deve estar num número diferente do teu (o bot); tu escreves para esse número.

3. **Proteger o webhook** — o nó Webhook do n8n com autenticação (Header Auth com um segredo). Sem isto, quem souber o URL pode forjar uma mensagem "do teu número". Confirmar se a Evolution envia headers personalizados no webhook; se não, pôr o segredo no URL.

4. **Filtro de remetente (nó IF)** — continuar só se:
   - o remetente for o teu número (`data.key.remoteJid` == `2588XXXXXXXX@s.whatsapp.net`; confirmar com uma mensagem real, porque o WhatsApp pode mandar `...@lid` e o número noutro campo)
   - `data.key.fromMe` == false
   Texto vem em `data.message.conversation` (ou `extendedTextMessage.text`).

5. **Buscar contas (HTTP Request)** — `GET {SERVER}/api/accounts` com a credencial Basic. Usado por todos os comandos (saldo e para resolver nome → id).

6. **Interpretar (nó Code)** — regex sobre o texto:
   - `^saldo$`
   - `^([+-])\s*([\d.,]+)\s+(\S+)\s*(.*)$`
   - `^t\s+([\d.,]+)\s+(\S+)\s+(\S+)\s*(.*)$`
   - **Valor para cêntimos:** sem espaços dentro do número; se houver vírgula, os pontos são milhares e a vírgula é decimal (`1.500,50` → 150050); se só houver pontos e cada grupo depois do primeiro tiver 3 dígitos, são milhares (`1.500` → 150000); senão o ponto é decimal (`12.5` → 1250). Recusar zero e negativos.
   - **Conta por nome:** comparar sem acentos, maiúsculas, espaços e pontuação (`mpesa` = "M-Pesa"). Primeiro o nome igual (`bim` → "BIM"), depois "começa por", depois "contém". Se num destes passos houver mais de uma (`xit` → "Xitique" e "Xitique (Poupança)"), responder "Qual conta? Xitique (Poupança) / Xitique" em vez de escolher.
   - Transferência: origem e destino têm de ser diferentes.
   - Devolver `{ action, body }` ou `{ action: "erro", msg }`.

7. **Switch por `action`**:
   - `saldo` → formatar texto com nome + saldo de cada conta
   - `transacao` → `POST /api/transactions` com `occurredAt: new Date().toISOString()` e `id` gerado a partir do id da mensagem (`data.key.id`, ex.: UUID v5), para um webhook repetido não gravar duas vezes
   - `transferencia` → `POST /api/transfers`, com o mesmo `id` derivado da mensagem
   - `erro` → mensagem de ajuda com os exemplos

8. **Responder (HTTP Request para Evolution)** — `POST {EVOLUTION}/message/sendText/{instancia}` com header `apikey` e body `{ number: "2588XXXXXXXX", text: "..." }`. Para "saldo agora X", voltar a pedir `GET /api/accounts` depois de gravar. Ex.: "✅ Saída 250,00 MZN · M-Pesa · saldo agora X".

9. (Opcional, depois) **Confirmação antes de gravar** — guardar o pedido pendente em `$getWorkflowStaticData('global')` e só gravar quando chegar "sim". Só vale a pena se errares muitas vezes.

## Importar o fluxo no n8n
O fluxo está pronto em `docs/n8n/whatsapp-wallet.workflow.json` (Workflows › Import from File).

1. Criar três credenciais no n8n:
   - **Wallet (Basic)** — tipo *Basic Auth*: utilizador = email da conta, palavra-passe = a da conta.
   - **Evolution apikey** — tipo *Header Auth*: nome `apikey`, valor = a API key da Evolution.
   - **Webhook segredo** — tipo *Header Auth*: nome à escolha (ex.: `x-wallet-secret`), valor = um segredo longo.
2. Importar o ficheiro e, em cada nó com credencial, escolher a respectiva (o n8n marca-as a vermelho até estarem escolhidas).
3. No nó **Config**, preencher `walletUrl` (sem `/` no fim), `evolutionUrl`, `instance` e `ownerNumber` (só dígitos, com 258).
4. Activar o workflow e copiar o *Production URL* do nó Webhook.
5. Na Evolution, configurar o webhook da instância com esse URL, evento `MESSAGES_UPSERT`, e o header do segredo. Se a Evolution não enviar headers, mudar a autenticação do nó Webhook para *None* e pôr o segredo no `path` (ex.: `wallet-whatsapp-<segredo>`).

Fluxo: Webhook → Config → Ler mensagem (filtra o teu número e mensagens de texto) → Contas → Categorias → Interpretar → Gravar? → (sim) Gravar → Contas depois → Resposta após gravar → Enviar WhatsApp; (não) → Enviar WhatsApp.

O `id` de cada transacção ou transferência sai do id da mensagem (UUID determinístico, versão 5), por isso repetir a mesma mensagem não grava duas vezes.

## Quando passar a código no wallet (não agora)
Só se quiseres: categorias automáticas, "quanto falta no mês", ou ecrã Definições › WhatsApp. Aí cria-se um módulo `whatsapp` no servidor com webhook próprio e o n8n deixa de ser necessário.

## Verificação
- `curl -u email:palavra-passe {SERVER}/api/accounts` → 200; com a palavra-passe errada → 401.
- Enviar `saldo` do teu número → recebe lista igual à do painel.
- Enviar `- 1 mpesa teste` → aparece em Transacções na web; apagar depois.
- Reenviar o mesmo webhook (re-executar a execução no n8n) → não aparece segunda transacção.
- Enviar `- 1.500 mpesa teste` → grava 1 500 MZN, não 1,50.
- Enviar `- 1 xit teste` com "Xitique" e "Xitique (Poupança)" → pergunta qual conta.
- Enviar `t 1 bci mpesa` → transferência visível nas duas contas.
- Enviar `saldo` de outro número → nenhuma resposta.
- Chamar o webhook do n8n sem o segredo → recusado.

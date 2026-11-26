# Plano — Desktop offline-first (TanStack DB)

Branch: `feat/desktop-offline`

## Objectivo

No desktop (Tauri), a app abre e funciona sem ligação para o essencial: ver contas, saldos e transacções, e registar, editar ou apagar transacções e transferências. Quando a ligação volta, as alterações são enviadas sozinhas.

A web não muda. O Postgres, o Drizzle e a API Fastify continuam a ser a fonte da verdade; o SQLite local é só cache mais fila de envio.

## Âmbito

| Grupo | Tabelas | Offline |
|---|---|---|
| Leitura e escrita | `transactions` (inclui as duas pernas de cada transferência), `transfers` | criar, editar, apagar |
| Só leitura | `accounts`, `categories`, `transactionTemplates`, `userPreferences` | ver |
| Só online | orçamento, plano, metas, dívidas, compras, pagamentos planeados, importação, assistente, dashboard cards, analytics, search | ficam com TanStack Query, como hoje |

Fora do âmbito offline: acertos (`adjustment`), reconciliação de contas e qualquer escrita com efeitos no servidor (compras que geram transacções, pagamentos planeados, metas, dívidas).

## Decisões

- **Saldo das contas:** vem sempre do servidor (`balance` em `/accounts`). Localmente mostra-se `saldo do servidor + soma das alterações ainda por enviar`. Não se recalcula a partir das transacções locais, porque o saldo depende de todo o histórico.
- **IDs:** gerados no cliente (`crypto.randomUUID()`); o servidor aceita-os e é idempotente.
- **Conflitos:** a última escrita ganha.
- **Apagados:** ao voltar a ligação faz-se refetch completo das tabelas de leitura e da janela de transacções. Sem `deleted_at` nesta fase.
- **Janela local de transacções:** últimos 12 meses.
- **Activação:** só no build do desktop (`VITE_DESKTOP=1`, posto pelo `tauri.conf.json`) e quando `isDesktop`. Na web o código offline nem entra no bundle.
- **Uma base local por utilizador:** `wallet-offline-<userId>.sqlite`, para nunca mostrar dados de outra conta.
- **Entrar sem rede:** no desktop, se o servidor não responder e houver token guardado, usa-se o último utilizador. Um 401 continua a mandar para o login.
- **SQLite no Tauri:** comandos próprios (`offline_db_*` em `src-tauri/src/offline_db.rs`) com uma ligação por ficheiro, em vez do `tauri-plugin-sql`. O pool do plugin mandava o `BEGIN` e o `COMMIT` do TanStack para ligações diferentes e as coleções falhavam.
- **Abrir sem rede:** as coleções usam `initialRender: { strategy: "network-first" }`; se a rede falhar ou passar de 3 s, abrem com o que está no disco.
- **Transferências offline:** sem coleção própria; uma transferência são as duas pernas na coleção `transactions` (`transferId`). Depois de enviar, as pernas optimistas dão lugar às do servidor (`GET /transactions/:id` de cada perna).
- **Fila offline:** `@tanstack/offline-transactions` com IndexedDB, uma fila por utilizador (`wallet-outbox-<userId>`). Erros 4xx (fora 401/408/425/429) não se repetem e desfazem a alteração local com aviso.
- **Estado da ligação:** vem dos pedidos à API (`src/lib/connection.ts`). Um erro de rede marca offline; a partir daí testa-se `GET /` a cada 5 s. Ao voltar, a fila é enviada e todas as queries são pedidas outra vez. O `navigator.onLine` não serve porque a API pode estar em baixo com rede.
- **Alterações rejeitadas:** ficam guardadas por utilizador (`wallet-rejected-<userId>` no localStorage) com o pedido original; "Tentar outra vez" volta a pôr na fila, "Descartar" só tira da lista (a alteração local já foi desfeita).
- **Terminar sessão:** apaga o ficheiro SQLite do utilizador (`offline_db_delete`), a fila e as rejeitadas, e funciona sem ligação no desktop. Se houver alterações por enviar, pede confirmação antes (perdem-se). As coleções fecham com `cleanup({ dependents: true })`, porque o ecrã ainda as está a ler.
- **Preferências:** ficam com TanStack Query por agora (são um objecto só, com escrita optimista própria); entram mais tarde.

## Passos

### 0. Preparação
- Instalar e confirmar nomes e versões: `@tanstack/react-db`, `@tanstack/query-db-collection`, `@tanstack/offline-transactions` e o pacote de persistência SQLite para Tauri (guia "SQLite persistence" do TanStack DB).
- Adicionar o plugin SQL do Tauri no `src-tauri` (Cargo + capabilities), se o pacote de persistência o exigir.
- Criar `apps/web/src/lib/offline/` com a flag `offlineEnabled = isDesktop`.
- **Verificação:** o build desktop arranca sem mudanças visíveis.

### 1. Servidor: escritas idempotentes
- `POST /transactions` e `POST /transfers` aceitam `id` opcional; se já existir para o mesmo utilizador, devolvem o registo existente.
- `DELETE /transactions/:id` e `DELETE /transfers/:id` devolvem sucesso quando o registo já não existe.
- `GET /transactions` com `from`/`to` e sem paginação para a janela de sincronização (ou um endpoint `/sync/transactions`).
- Ajustar os contratos em `packages/shared`.
- **Verificação:** testes e2e para repetir o mesmo POST duas vezes e apagar duas vezes.

### 2. Coleções só leitura
- Coleções para `accounts`, `categories`, `transactionTemplates`, `userPreferences` com `queryCollectionOptions`, a chamar a API actual.
- Envolver com a persistência SQLite.
- Trocar o interior de `useAccounts`, `useCategories` e afins para ler das coleções no desktop, mantendo a mesma assinatura do hook para os componentes não mudarem.
- **Verificação:** abrir o app, fechar, desligar a rede, abrir outra vez: contas e categorias aparecem.

### 3. Coleção de transacções (leitura)
- Coleção `transactions` com a janela de 12 meses, persistida.
- A lista de transacções passa a usar `useLiveQuery` com os filtros actuais (conta, categoria, mês, texto) aplicados localmente.
- Filtros fora da janela continuam a pedir à API (só online).
- **Verificação:** a lista mostra os mesmos resultados que hoje, online e offline, para os filtros mais usados.

### 4. Escritas offline
- `onInsert`, `onUpdate` e `onDelete` nas coleções `transactions` e `transfers`, a chamar a API com o `id` do cliente.
- Ligar `@tanstack/offline-transactions` para guardar a fila no disco e reenviar ao voltar a ligação.
- Os hooks `useCreateTransaction`, `useUpdateTransaction`, `useDeleteTransaction` e os de transferência passam a escrever na coleção no desktop.
- Depois de cada envio com sucesso, invalidar as queries online que dependem do dinheiro (o actual `refreshMoney`).
- Bloquear offline as acções fora do âmbito (mensagem "precisa de ligação"). Passa para o passo 5, junto com esconder o que é só online, porque precisa do estado da ligação.
- **Verificação:** criar, editar e apagar sem rede; fechar e reabrir o app; voltar a ligar a rede e confirmar no servidor sem duplicados.

### 5. Saldos e dashboard offline
- Saldo mostrado = `balance` do servidor + alterações pendentes dessa conta.
- No dashboard, saldos e totais do mês calculados a partir das coleções.
- Offline, o que não funciona sem ligação não se mostra: cartões de analytics, menus e páginas só online ficam escondidos até a ligação voltar. Na sidebar só ficam as páginas que funcionam offline (Painel, Transacções, Contas, Categorias); as outras desaparecem e voltam quando a ligação volta. Abrir uma rota só online sem ligação manda para o Painel.
- **Verificação:** registar um gasto offline actualiza logo o saldo e o total do mês.

### 6. Indicador de sincronização
- Estado na shell: sincronizado / a enviar / N alterações por enviar / erro.
- Lista das alterações que o servidor rejeitou, com opção de tentar outra vez ou descartar.
- **Verificação:** forçar uma rejeição (ex.: conta apagada noutro dispositivo) e confirmar que aparece como erro e não se perde em silêncio.

### 7. Limpeza e segurança
- Ao terminar sessão: apagar o SQLite local e a fila (junto ao `clearDesktopToken`).
- Ao entrar com outro utilizador: base local separada por utilizador ou apagada.
- **Verificação:** terminar sessão, entrar com outra conta, não aparece nenhum dado da anterior.

### 7b. Arranque lento sem servidor (por resolver)
- Abrir o app sem servidor demora 10 a 20 s até aparecer o Painel.
- Causa provável: o retry do TanStack Query (por omissão 3 tentativas com espera crescente) nas queries que o arranque espera, incluindo as das coleções.
- Corrigir: sem retry quando o erro é de rede (ou quando `isOnline()` é falso), e confirmar se a sessão (`getSession`) e o keychain também atrasam.
- **Verificação:** com o servidor parado, o Painel aparece em poucos segundos.

### 8. Fecho
- Testes manuais do fluxo completo no build de produção.
- Actualizar a Fase 11 em `docs/check-list.md`.
- PR para `main`.

## Riscos em aberto

- O TanStack DB ainda está em versão pré-1.0; fixar versões exactas.
- Os filtros de transacções que o servidor resolve (ex.: categoria com descendentes) têm de ser replicados localmente.
- O tamanho da janela de 12 meses pode ser grande para quem importou muito histórico. Medido no passo 3: cerca de 1 100 transacções por conta (de 3 100 no total), 6 pedidos de 200 por sincronização completa.

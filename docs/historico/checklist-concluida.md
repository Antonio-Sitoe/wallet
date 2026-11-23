# Checklist — itens concluídos

Retirados do plano "Wallet — Plano do App" em 2026-11-23. O que ainda falta fazer continua no plano.

## Data de corte: 1 de Dezembro de 2026

**Passos, por ordem**

- [x] 1. Importar o histórico do Wallet (Mar 2023 – Nov 2026) só para consulta e estatísticas: não define saldos
- [x] 3. Criar o plano de Dezembro com o salário previsto

## Checklist

### Fase 0 — Base do projecto

**Backend**

- [x] Monorepo: apps/web (React + Vite), apps/desktop (Tauri), apps/api (Node), packages/shared (tipos)
- [x] API Node a correr com PostgreSQL + Prisma (migrations)
- [x] Autenticação simples (email + palavra-passe, JWT)

**Frontend**

- [x] Layout base: menu lateral, tema claro/escuro, formatação MZN
- [x] Tauri a abrir o mesmo frontend no desktop
- [x] Ecrã de erro de ligação no app (substitui o «Something went wrong»): «Tentar de novo ⌘R» recarrega o app na web e no desktop, nova tentativa automática a cada 10 s

### Fase 1 — Contas e transacções

**Backend**

- [x] CRUD de contas com saldo calculado (saldo inicial + transacções)
- [x] Acertar o saldo de uma conta ao valor real de hoje (reconcile); todas as contas começam em 0
- [x] Categorias em português + mapeamento das categorias do Wallet (as 53 usadas nos CSV)
- [x] Importador Wallet CSV: ler ;, criar contas, mapear categorias, juntar pares de transferência, ignorar duplicados por import_hash
- [x] Estique / Xitique importado como transferência para a conta poupança Xitique (Poupança)
- [x] Converter notas com nome de mês em mes_referencia
- [x] API do import: pré-visualizar (novas / duplicadas / para rever), aplicar com decisões, desfazer
- [x] API de entradas, saídas e transferências (criar, editar, apagar)
- [x] Lista de transacções com filtro por período, conta, categoria, tipo, mês e payee (paginação por cursor)
- [x] Dados separados por utilizador (vários utilizadores)
- [x] Testes dos endpoints + collection do Postman

**Frontend**

- [x] Ecrã de pré-visualização do import: novas / duplicadas / para rever (transferências soltas, categorias sem mapa)
- [x] Registar entrada / saída / transferência (formulário rápido + botão "Transporte 100")
- [x] Lista de transacções virtualizada (~3 000 linhas) com filtro por período, conta, categoria e payee
- [x] Ecrãs de contas e categorias (criar, editar, arquivar, mapeamento do Wallet)
- [x] Base da app: menu lateral, atalhos ⌘1–⌘7, modal «Nova transacção ⌘N», login em português, tema escuro do design, versão de telemóvel
- [x] Modal «Nova transacção» igual ao design: separadores Despesa / Entrada / Transferência, valor grande com teclado e calculadora, conta + categoria obrigatória (seletor com pesquisa), modelos da lista do mês, ligação automática ao item da lista, nota/data escondidas, «Guardar e nova ⇧⌘↵»
- [x] Painel simples: saldos, resumo do mês, itens por pagar, últimas transacções
- [x] Validar saldos das 7 contas contra o Wallet depois do import
- [x] Acerto: novo tipo de transacção adjustment; reconciliar cria um acerto pela diferença (o saldo inicial e o histórico ficam); fora de receitas/despesas e do orçamento
- [x] Começar do zero: POST /accounts/zero-balances (um acerto por conta, saldo 0) e POST /accounts/reset (apaga transacções, transferências e importações; confirmação "APAGAR")
- [x] Importar folha: não sugere pagamentos (Out–Nov ficam na folha)

### Fase 2 — Orçamento anual + lista do mês (o coração da folha)

**Backend**

- [x] Criar o plano anual: itens com valor, categoria, frequência (mensal / meses / única) e conta padrão
- [x] Gerar automaticamente as 12 listas mensais a partir do plano
- [x] Check de um item cria a transacção (valor pré-preenchido, editável); desmarcar apaga-a
- [x] Itens parciais (Alimentação, Transporte) com vários lançamentos
- [x] Item não planeado na lista do mês
- [x] Totais por item, mês e ano: planeado, gasto, falta e ritmo
- [x] Ligar as transacções registadas fora da lista ao item certo (por categoria)
- [x] Item de poupança (Emergência, Obra) pago por transferência para a conta destino
- [x] Mudar um item do plano afecta os meses a partir de um mês escolhido; meses já pagos ficam como estavam
- [x] Copiar o plano do ano anterior (com ou sem itens de uma vez e sazonais)
- [x] Testes dos endpoints do orçamento + pasta Orçamento na collection do Postman
- [x] Importar os meses de 2026 do Excel como plano + itens já pagos

**Frontend**

- [x] Ecrã do plano anual (criar e editar itens)
- [x] Lista do mês em formato checklist: planeado, gasto, falta, salário e sobra
- [x] Marcar e desmarcar itens, com barra de progresso nos parciais
- [x] Adicionar item não planeado directamente na lista do mês
- [x] Vista anual por item: projectado vs gasto até hoje, dentro / acima do ritmo

### Fase 3 — Dashboard

**Backend**

- [x] Endpoints de resumo: saldo total e por conta, gasto do mês vs orçamento, top categorias, últimos 6 meses
- [x] Painel dinâmico: cartas por utilizador (tipo, tamanho, ordem, configuração), painel inicial do design, repor
- [x] Fluxo por dia / semana / mês, evolução do saldo e comparação com o período anterior e há um ano

**Frontend**

- [x] Saldo total e por conta
- [x] Gasto do mês vs orçamento
- [x] Top categorias e gráfico dos últimos 6 meses
- [x] Painel dinâmico: «Adicionar carta» com pré-visualização, arrastar, mover, mudar tamanho e remover cartas; selector de período (mês / 30 dias / ano)
- [x] Painel · revisão de UI (desktop/tablet/telemóvel): gráficos desenhados à largura real (eixos legíveis no telemóvel), Resumo em 1→2→4 colunas, pílulas de variação compactas, cabeçalho do período compacto, valor do aviso sem quebra, «−» no saldo lateral, saudação nocturna, botão de tamanho só em ecrã largo, /painel → /dashboard
- [x] Painel · cartas de gráfico circular (donut): gastos por categoria, gastos por conta (ambas alternam saídas/entradas e período/ano) e entradas vs saídas; backend GET /analytics/breakdown?by=category|account&flow=expense|income com testes
- [x] Validar saldos (Contas) e importar a folha de cálculo (Importar)
- [x] Contas › Começar do zero (zerar saldos ou apagar tudo); acertos visíveis em Transacções (filtro "acertos", apagar acerto)
- [x] Modal de nova transacção: lista de categorias dentro do modal (já não fica cortada nem tapa a Conta)

## Checklist de design (UI)

- [x] Paleta base: fundo #F5F5F7, texto #1D1D1F, verde #0B7A5C (dinheiro), laranja #B4480F (alertas)
- [x] Tipografia do sistema (SF Pro) e escala de títulos
- [x] Barra lateral clara estilo macOS
- [x] Modo escuro (o macOS segue o sistema)
- [x] Barra de título da janela Tauri (transparente, espaço para os botões da janela)
- [x] Atalhos de teclado visíveis: ⌘N nova transacção, ⌘K pesquisa, ⌘↵ guardar
- [x] Transacção = modal único (Despesa / Entrada / Transferência, valor com teclado, conta, categoria, modelos), aberto pelo botão verde «Nova transacção ⌘N» no topo da barra lateral de todos os ecrãs. No canvas: Nova transacção · modal.
- [x] Paleta ⌘K com 2 modos (tab alterna): Pesquisar (transacções, contas, itens, categorias, ecrãs e acções; @conta, #categoria, >acção) e Perguntar (chat com IA que responde com os dados do app e mostra a fonte). No canvas: ⌘K · modo pesquisar e ⌘K · modo perguntar.
- [x] Assistente em ecrã próprio (⌘J): histórico de conversas (Hoje / Ontem / Esta semana, com pesquisa), chat com respostas, números, acções e fonte, e botão + para anexar CSV ou Excel, que a IA lê e transforma em import. O ⌘K abre a conversa completa. No canvas: Assistente · chat.

**Componentes**

- [x] Cartão de métrica, cartão de conta, barra de progresso
- [x] Linha de item do orçamento (check, parcial, estado)
- [x] Etiquetas de estado: Por pagar / Parcial / Pago / Acima
- [x] Toast com Desfazer
- [x] Botões em todos os estados: normal, hover, focus, desactivado, a carregar
- [x] Campos: input, select, número com MZN, data, com erro de validação
- [x] Modal / folha (sheet) de confirmação
- [x] Menu de contexto (clique direito) e dropdown de filtros aberto
- [x] Tabela com ordenação e paginação / lista virtualizada
- [x] Gráficos: barras, linha e donut com tooltip

**Estados gerais**

- [x] Vazio: primeiro uso, mês sem plano, sem transacções no filtro
- [x] A carregar (skeletons)
- [x] Erros: sem ligação ao servidor, falha ao guardar, import com erro
- [x] Ecrã inteiro de erro de ligação (substitui o «Something went wrong / Failed to fetch»): ilustração, mensagem em português, botão «Tentar de novo ⌘R» ao centro, detalhes técnicos escondidos. No canvas: Erro de ligação · ecrã inteiro.

**Ecrãs em falta**

- [x] Contas: lista, detalhe com histórico de saldo, criar / arquivar
- [x] Categorias: gerir, cores e ícones, mapeamento do Wallet
- [x] Login / registo
- [x] Definições: moeda, salário previsto, tema, exportar
- [x] Primeiro uso (onboarding): importar do Wallet ou começar do zero

## Decisões em aberto

- [x] Saldos iniciais: decidido — saldo real de cada conta na data de corte (1 Dez 2026); reconciliação mensal com acerto.
- [x] Out–Nov 2026: decidido — ficam na folha; o app começa em Dezembro.

## Checklist de design (UI) — 2026-11-23

- [x] Conjunto de ícones único: Lucide em toda a app (logótipo `BrandMark`, check do orçamento, transferência e acerto nas últimas transacções); ficam só as ilustrações (loader, 404, erro de ligação)
- [x] Painel: lista de períodos aberta (o selector de período é um dropdown que abre a lista)
- [x] Contas: curva do histórico de saldo no detalhe da conta (3 meses / 1 ano / 3 anos); `GET /analytics/balance?accountId=` conta entradas, saídas, transferências e acertos; o saldo total também passa a contar os acertos
- [x] Versão web estreita revista: os 7 ecrãs a 390 e 768 px sem scroll horizontal; coluna Item fixa no Plano anual, coluna «No Wallet» escondida nas Categorias em ecrã estreito, acções dos cartões passam para baixo do texto no telemóvel
- [x] Tokens formais em `apps/web/src/index.css`: cores (incluindo estados, séries dos gráficos, superfícies), raios (`check`, `control`, `card`, `overlay`), sombras (`overlay`, `popover`, `focus`) e tamanhos (`sidebar`, `input`, `row`, `check`); as cores fixas da interface passaram a tokens (ficam em hex só as paletas de cores de contas/categorias e a do donut)
- [x] Modo claro da v2: paleta clara confirmada (fundo #F5F5F7, texto #1D1D1F, verde #0B7A5C, laranja #B4480F, azul #0A63C9, vermelho #C9302C; textos ≥ 4,5:1), tokens sobrepostos com `.light` em `index.css`, ilustrações e gráficos seguem o tema, iniciais das categorias escurecidas para contraste

## Fase 6 — Frontend — 2026-11-23

- [x] Modo claro / escuro / seguir o sistema: `next-themes` (sistema por defeito, guardado em `wallet.theme`), selector com três ícones no fundo da barra lateral, botão no topo em telemóvel, atalho ⇧⌘L para alternar

## Fase 4 — Metas e dívidas — 2026-11-23

**Backend**

- [x] Metas com progresso (Obra, Emergência): tabelas `goals` e `goal_parts`, `transfers.goal_id`; o progresso soma o valor inicial, as contribuições (transferências para a conta da meta) e os pagamentos do item do plano ligado; partes com pago / por pagar; importação da aba Emergência da folha (fundo de emergência, Obra e partes), com desfazer
- [x] Dívidas a receber / a pagar com pagamentos parciais: tabela `debts` e `transactions.debt_id`; cada recebimento é uma entrada em Dívidas › Recebidas e cada pagamento uma saída em Dívidas › Pagas, ligados à dívida; sugestões por pessoa a partir das notas «Pessoa → Eu» / «Eu → Pessoa» do Wallet (ignorar fica guardado); importação da aba Dívidas da folha, com desfazer

**Frontend**

- [x] Ecrã de metas com progresso: indicadores, cartões com ritmo e previsão, detalhe em modal com partes e contribuições, Nova meta (com item opcional no plano anual) e Contribuir; secção Metas na revisão da folha
- [x] Ecrã de dívidas por pessoa: indicadores (a receber, a pagar, saldo líquido, sugestões), separadores Devem-me / Devo, detalhe em modal com histórico, lembrete e Perdoar / arquivar, Registar recebimento / pagamento (Tudo, Metade), Nova dívida e sugestões do Wallet para converter ou ignorar; secção Dívidas na revisão da folha

## Fase 6 — Lista de compras — 2026-11-23

**Backend**

- [x] Listas com itens (nome, quantidade, preço estimado por unidade): tabelas `shopping_lists` (conta, categoria e item do orçamento opcionais) e `shopping_items` (`transaction_id`); marcar comprado cria a despesa com o preço real (nota «Item × qtd · Lista»), ligada ao item do orçamento da lista; desmarcar apaga a despesa; apagar a despesa nas transacções desmarca o item; apagar o item ou a lista mantém as despesas; totais estimado / real / por comprar

**Frontend**

- [x] Ecrã Lista de compras (`/shopping`, «Compras» no menu, ⌘0): listas em separadores, indicadores (estimado, real, diferença, por comprar), adicionar rápido numa linha («Arroz 2x 350», «2 Arroz 350», «Leite 85»), marcar comprado com preço real e conta, comprados em secção própria com diferença face ao estimado, editar item, nova / editar lista com conta, item do orçamento do mês e categoria, arquivar e apagar

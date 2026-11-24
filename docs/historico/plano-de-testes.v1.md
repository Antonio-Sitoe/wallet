# Plano de testes — Wallet

Testes manuais de tudo o que a app faz até agora (fases 1–3 e o painel novo). Cada linha é uma acção e o que deve acontecer. Marca `[x]` quando passar e escreve ao lado o que correu mal quando falhar.

---

## 0. Preparação

- [x] API a correr: `npm run dev` em `apps/server` (porta 3000). `GET http://localhost:3000/` responde `OK`.
- [x] Web a correr: `npm run dev` em `apps/web` (porta 3001).
- [x] Ter à mão:
  - os 3 CSV exportados do Wallet;
  - a folha "Calculo Financeiro" (.xlsx);
  - um segundo email para testar o isolamento entre utilizadores.
- [x] Testes automáticos: `npx vitest run` em `apps/server` passa todo.

**Dados de referência.** Para os números baterem certo nas secções seguintes, usa sempre um utilizador novo e cria:

| Conta     | Tipo           | Saldo inicial |
| --------- | -------------- | ------------- |
| FCBANK    | Banco          | 10 000,00     |
| Numerário | Dinheiro       | 500,00        |
| M-Pesa    | Carteira móvel | 0             |
| Xitique   | Poupança       | 0             |

---

## 1. Autenticação

- [x] **A1** Abrir `/dashboard` sem sessão → redirecciona para `/login`.
- [x] **A2** Criar conta com palavra-passe de 7 caracteres → erro "pelo menos 8 caracteres".
- [x] **A3** Criar conta com nome, email e palavra-passe válidos → entra e vai para o painel.
- [x] **A4** Criar conta com um email que já existe → mensagem de erro, sem entrar.
- [x] **A5** Sair (ícone na barra lateral) → volta ao `/login`.
- [x] **A6** Entrar com a palavra-passe errada → erro, continua no login.
- [x] **A7** Entrar com as credenciais certas → painel.
- [x] **A8** Recarregar a página (F5) → a sessão mantém-se.
- [x] **A9** Isolamento: entrar com o segundo utilizador → não vê contas, transacções, categorias editadas nem orçamento do primeiro.

## 2. Navegação, atalhos e estados globais

- [x] **N1** A barra lateral tem Painel, Orçamento, Plano anual, Transacções, Contas, Categorias e Importar, e cada link abre a página certa.
- [x] **N2** `⌘/Ctrl + 1…7` abre as páginas pela ordem do menu.
- [x] **N3** `⌘/Ctrl + N` em qualquer página abre "Nova transacção".
- [x] **N4** A lista de contas da barra lateral mostra os saldos e muda logo depois de uma transacção.
- [x] **N5** Um URL inexistente (`/xpto`) mostra a página 404, com links para as secções.
- [x] **N6** Com a API parada, recarregar mostra a página de erro de ligação. "mostrar" abre os detalhes e copiar diz "Detalhes copiados". Com a API de volta, a app recupera.
- [x] **N7** Durante os carregamentos aparece o loader ou os skeletons, sem ecrã branco.
- [x] **N8** Responsivo: a largura de telemóvel (~390 px) não tem scroll horizontal e o menu continua acessível.

## 3. Contas

### Criar e ver

- [x] **C1** Sem contas, a página mostra "Ainda não há contas" com os botões "Criar conta" e "Importar do Wallet".
- [x] **C2** "Nova conta" abre o formulário: nome, tipo, saldo inicial e cor.
- [x] **C3** Criar as 4 contas de referência → toast "Conta … criada", e cada uma aparece no seu grupo (Bancos, Poupança, Dinheiro e carteiras).
- [x] **C4** Nome vazio → não deixa criar.
- [x] **C5** Nome repetido com outra capitalização ("fcbank") → erro de nome duplicado.
- [x] **C6** Saldo inicial vazio → a conta é criada com 0.
- [x] **C7** Os totais no topo batem com as contas: total 10 500,00, Bancos 10 000,00, Poupança 0, Dinheiro e carteiras 500,00.

### Editar, arquivar e apagar

- [x] **C8** Seleccionar uma conta mostra o detalhe com os movimentos recentes ("Sem movimentos." quando não há).
- [x] **C9** Mudar o nome, o tipo e a cor → "Conta actualizada", e a mudança aparece na lista, na barra lateral e no painel.
- [x] **C10** Arquivar M-Pesa → desaparece da lista e do painel. "Mostrar arquivadas" mostra-a com a etiqueta "arquivada". Desarquivar → volta.
- [x] **C11** Apagar uma conta sem transacções → pede confirmação → "Conta apagada".
- [x] **C12** Apagar uma conta com transacções → recusa e sugere arquivar.

### Saldo real e acertos

- [x] **C13** No detalhe, "Saldo real hoje" = 12 000,00 em FCBANK → o saldo passa a 12 000,00 e aparece uma transacção "Acerto de saldo" de +2 000,00. O saldo inicial fica igual.
- [x] **C14** "Validar saldos" abre o diálogo com todas as contas activas. Alterar duas → "2 saldos acertados", com um acerto por conta.
- [x] **C15** Validar com o mesmo saldo → não cria nenhum acerto.

### Começar do zero

- [x] **C16** "Começar do zero" → "Zerar saldos (recomendado)" → todas as contas ficam a 0 com acertos, e o histórico mantém-se.
- [x] **C17** "Apagar tudo" fica desactivado até escrever exactamente `APAGAR`.
- [x] **C18** "Apagar tudo" → apaga transacções, transferências e importações. As contas ficam (com saldo inicial) e o toast diz quantas transacções saíram.

## 4. Categorias

- [x] **K1** No primeiro acesso aparece a árvore por defeito (despesas, entradas e as de sistema: Transferência e Estique/Xitique).
- [x] **K2** Criar uma categoria principal ("Vovó Ester", Saída) → aparece no topo da árvore.
- [x] **K3** Criar uma subcategoria com uma categoria mãe → fica debaixo dela.
- [x] **K4** Não é possível criar uma subcategoria de uma subcategoria: só há 2 níveis.
- [x] **K5** Não é possível usar uma categoria de sistema como mãe.
- [x] **K6** Nome repetido no mesmo nível → erro. O mesmo nome noutro nível → é aceite.
- [x] **K7** Mudar o nome e a cor → "Categoria actualizada", e a mudança aparece nos selectores das transacções.
- [x] **K8** Uma categoria de sistema não se edita nem se apaga.
- [x] **K9** Apagar uma categoria com subcategorias → recusa ("mova as subcategorias primeiro").
- [x] **K10** Apagar uma categoria com transacções → recusa e sugere arquivar.

  - [x] **K11** Apagar uma categoria vazia → pede confirmação e sai da árvore.

- [x] **K13** O contador de transacções por categoria bate com a lista de transacções filtrada por essa categoria.

## 5. Transacções

### Nova transacção (diálogo)

- [x] **T1** Abrir com o botão, com `⌘N` e no painel com "Nova transacção".
- [x] **T2** Despesa de 250 em Numerário, categoria Transporte → toast "Despesa de 250,00…", e o saldo de Numerário desce 250.
- [x] **T3** Entrada de 55 000 em FCBANK, categoria Salário → o saldo sobe 55 000.
- [x] **T4** Transferência de 1 000 de FCBANK para M-Pesa → o saldo total não muda; FCBANK −1 000 e M-Pesa +1 000.
- [x] **T5** O botão "Trocar contas" inverte De e Para.
- [x] **T6** Transferência com De igual a Para → não deixa gravar.
- [x] **T7** Valor 0 ou vazio → não deixa gravar.
- [x] **T8** Calculadora: escrever `120+80`, depois `=` (ou Enter) → 200. `x` e `*` dão ×, `/` dá ÷, e Backspace apaga.
- [x] **T9** `⌘/Ctrl + Enter` grava. `⌘/Ctrl + Shift + Enter` grava e deixa o diálogo pronto para outra.
- [x] **T10** Mudar a data → o "Mês do orçamento" acompanha a data.
- [x] **T11** Uma despesa numa categoria com um item na lista do mês mostra a ligação automática a esse item. Depois de gravar, o item fica pago ou parcial no Orçamento.
- [x] **T12** Pesquisa de categoria: escrever "trans" filtra a lista.

### Lista, filtros e detalhe

- [x] **T13** "Transporte 100" cria uma despesa de 100 na conta Dinheiro. Sem nenhuma conta de dinheiro → "Crie uma conta primeiro".
- [x] **T14** O filtro de período (30 dias, mês, …) muda a lista.
- [x] **T15** Filtro por conta → só mostra movimentos dessa conta, incluindo as pernas das transferências.
- [x] **T16** Filtro por uma categoria principal → inclui também as subcategorias.
- [x] **T17** Filtro por tipo (entradas, saídas, transferências, acertos) → só aparece esse tipo.
- [x] **T18** Filtro por mês do orçamento → só aparecem transacções com esse `referenceMonth`.
  - [x] **T19** A pesquisa por nota ou payee filtra depois de uma pausa na escrita. Caracteres como `%` e `_` não rebentam a pesquisa.
- [x] **T20** Os filtros ficam no URL: recarregar mantém-nos, e "limpar" repõe tudo.
- [x] **T21** A paginação (mais de 50 linhas) carrega o resto sem repetir nem saltar linhas.
- [x] **T22** Clicar numa linha abre o detalhe ao lado e a linha fica seleccionada.

### Editar e apagar

- [x] **T23** Editar o valor, a categoria, a nota e o payee → "Transacção guardada", e os saldos ficam actualizados.
- [x] **T24** Mudar a data para outro mês → o mês do orçamento acompanha, desde que não tenha sido mudado à mão.
- [x] **T25** Com o mês do orçamento definido à mão e diferente da data, mudar a data → o mês fica o que foi escolhido.
- [x] **T26** Mudar o tipo de despesa para entrada → o sinal do valor muda e o saldo é recalculado.
- [x] **T27** Apagar uma transacção → pede confirmação → "Transacção apagada", e o saldo volta atrás.
- [x] **T28** Abrir uma perna de transferência → mostra o editor de Transferência (De, Para, valor, data).
- [x] **T29** Editar a transferência (valor e contas) → as duas pernas mudam juntas.
- [x] **T30** Apagar a transferência → saem as duas pernas.
- [x] **T31** Abrir um acerto → mostra "Acerto de saldo" sem edição. Apagar → "Acerto apagado", e o saldo volta atrás.
- [x] **T32** Os acertos e as transferências não contam como entradas ou despesas nos totais (painel e análises).

## 6. Plano anual

- [x] **P1** Sem plano para o ano → formulário "Criar plano" com o salário previsto por mês.
- [x] **P2** Criar o plano de 2027 com 55 000 → "Plano de 2027 criado", e o plano fica vazio.
- [x] **P3** Com o plano do ano anterior: "Copiar os itens de 2026", com e sem os itens sazonais e os de uma vez → copia só o que foi escolhido. Salário vazio → herda o do ano anterior.
- [x] **P4** Criar um plano para um ano que já tem plano → erro.
- [x] **P5** Novo item: nome, grupo, categoria, valor por mês e frequência:
  - mensal;
  - meses escolhidos (ex.: jun–ago);
  - uma vez.
- [x] **P6** Um item com "Conta destino (poupança)" (ex.: Xitique) é pago por transferência.
- [x] **P7** Um item parcial com "Lançamento rápido" de 100 mostra o botão "+100" na lista do mês.
- [x] **P8** A tabela mostra por item: frequência, valor, os meses (pago, parcial, planeado, passou sem pagamento) e o ritmo (dentro, acima, sem dados).
- [x] **P9** Os totais no topo (total do ano, média por mês, acima do ritmo) batem com os itens.
- [x] **P10** Um mês com mais planeado do que o salário fica marcado.
- [x] **P11** "Gerar 12 listas" → toast com o número de itens criados. O botão passa a "Actualizar listas".
- [x] **P12** Editar um item com "Aplicar a partir de" = um mês futuro → os meses anteriores e os já pagos ficam iguais; os seguintes mudam.
- [x] **P13** Mudar a frequência de mensal para jun–ago → desaparece das listas dos outros meses que não têm pagamentos.
- [x] **P14** Retirar um item do plano → "… retirado do plano"; os meses pagos mantêm a linha.
- [x] **P15** Um item novo num plano já gerado entra nas listas a partir do mês actual.
- [x] **P16** O selector de ano muda de plano.

## 7. Orçamento (lista do mês)

- [x] **O1** Um mês sem lista mostra "Gerar 12 listas", "Copiar plano de …" ou "Ver plano anual", conforme o caso.
- [x] **O2** As setas de mês anterior e seguinte navegam, e o mês fica no URL.
- [x] **O3** O topo mostra: salário previsto, planeado, gasto, falta gastar e sobra do salário, com contas que batem.
- [x] **O4** Os itens aparecem agrupados (fixos, variáveis, poupança, únicos…).
- [x] **O5** Marcar um item com conta por defeito → paga logo o restante e o toast mostra o valor e a conta.
- [x] **O6** Marcar um item sem conta por defeito → abre "Escolher conta" (valor, data, nota).
- [x] **O7** Um item de poupança → o pagamento cria uma transferência (a conta escolhida não pode ser a de destino).
- [x] **O8** Um item parcial → "+100" lança só o passo, e o item fica parcial até chegar ao valor.
- [x] **O9** Pagar mais do que o planeado → o estado passa a "acima".
- [x] **O10** Desmarcar → pede confirmação com o número de pagamentos → apaga-os, e o saldo da conta volta atrás.
- [x] **O11** Uma despesa registada em Transacções na categoria de um item, sem ligação, conta como gasto desse item ("matched"). Quando dois itens partilham categoria, o gasto é dividido entre eles sem passar o planeado.
- [x] **O12** Uma despesa sem item correspondente aparece como gasto não atribuído.
- [ c **O13** "Item não planeado": nome, valor, categoria e conta → é adicionado só a este mês.
- [x] **O14** Editar um item do mês (nome, valor planeado) → só muda esse mês, o plano fica igual.
- [x] **O15** Apagar um item com pagamentos → recusa ("Desmarque primeiro").
- [x] **O16** O link "Lista de …" no painel abre o orçamento do mês certo.

## 8. Importação

### CSV do Wallet

- [x] **I1** Escolher ficheiros que não são .csv → erro "Escolha ficheiros .csv exportados do Wallet".
- [x] **I2** Carregar os 3 CSV → pré-visualização com ficheiros, contas (marca as que já existem), categorias, e os totais: novas, duplicadas, transferências, Xitique, mês da nota e para rever.
- [x] **I3** Com uma categoria do Wallet sem mapeamento, "Importar" fica desactivado.
- [x] **I4** Linhas "para rever": testar as três decisões (ignorar, manter como transacção, transformar em transferência com outra conta).
- [x] **I5** "Importar N linhas" → toast com os números. As contas são criadas e os saldos e as transacções aparecem.
- [x] **I6** Os pares de transferências do Wallet viram transferências, e as de Xitique ficam na categoria de poupança.
- [x] **I7** Importar os mesmos ficheiros outra vez → tudo é contado como duplicado, sem nada novo. As linhas ignoradas antes não voltam para revisão.
- [x] **I8** A lista de importações mostra o estado (rascunho, aplicada, desfeita).
- [x] **I9** Desfazer uma importação aplicada → pede confirmação → apaga as transacções e transferências dela, e os saldos voltam atrás.
- [x] **I10** Apagar um rascunho → desaparece sem mexer em nada.

### Folha "Calculo Financeiro" (.xlsx)

- [x] **I11** Escolher o ano e carregar a folha → mostra os meses encontrados, os itens recorrentes e as linhas ignoradas.
- [x] **I12** Um ficheiro inválido ou sem meses → erro claro.
- [x] **I13** Desmarcar meses → só os marcados são importados, e o botão mostra quantos são.
- [x] **I14** Mudar a categoria de um item na revisão → fica com a categoria escolhida.
- [x] **I15** "Criar pagamentos" num mês → é obrigatório escolher a conta. Sem conta, o botão fica bloqueado.
- [x] **I16** Importar → cria o plano (se não existir), os itens recorrentes e as listas dos meses. Um item que já existe com o mesmo nome é reaproveitado.
- [x] **I17** Desfazer a importação da folha → apaga os pagamentos, os itens e o plano que ela criou. O que já existia antes fica.

## 9. Painel

### Saldos das contas (faixa fixa)

- [x] **D1** Os saldos aparecem no topo, um cartão por conta activa, com o ícone do tipo, a cor da conta, o nome e o saldo em MZN.
- [x] **D2** Um saldo negativo aparece na cor de aviso.
- [x] **D3** Clicar num cartão abre essa conta em Contas.
- [x] **D4** "Adicionar conta" abre Contas já com o formulário de nova conta.
- [x] **D5** A faixa não se arrasta, não se remove e não muda com "Repor painel".
- [x] **D6** As contas arquivadas não aparecem.
- [x] **D7** Grelha: 5 por linha num ecrã largo, 2–3 num tablet e 1 num telemóvel.

### Período e avisos

- [x] **D8** O selector de período (mês, 30 dias, ano) e as setas mudam o intervalo, e o texto do intervalo fica certo.
- [x] **D9** O período fica no URL e mantém-se ao recarregar.
- [x] **D10** Uma conta com saldo negativo e saldo inicial 0 mostra o aviso "o export do Wallet não traz saldos iniciais", e "Definir saldos →" abre "Validar saldos".
- [x] **D11** A saudação mostra o mês e o resumo da lista (itens, pagos, parcial, por pagar).

### Cartas

- [x] **D12** Um utilizador novo vê o painel por defeito (Resumo, Fluxo de caixa no ano, Contas, Onde vai o dinheiro, Próximos por pagar, Comparação, Últimas transacções).
- [x] **D13** "Adicionar carta" lista os 9 tipos, e adicionar um põe-no no fim.
- [x] **D14** Cada carta mostra dados coerentes com Transacções no mesmo período:
  - Resumo;
  - Entradas e saídas;
  - Fluxo de caixa;
  - Evolução do saldo;
  - Onde vai o dinheiro (despesas por categoria principal e "outras");
  - Comparação de períodos (actual, anterior e o mesmo período há um ano; o actual pára no dia de hoje);
  - Contas;
  - Próximos por pagar;
  - Últimas transacções.
- [x] **D15** Nas cartas com intervalo, o botão "período / ano" alterna e fica guardado.
- [x] **D16** O botão de largura alterna entre meia e inteira (em ecrã largo) e fica guardado.
- [x] **D17** Remover uma carta → toast "… removida".
- [x] **D18** Remover todas as cartas → estado "O painel está vazio". Depois de recarregar continua vazio: as cartas por defeito não voltam sozinhas.
- [x] **D19** "Repor painel inicial" → pede confirmação → volta às cartas por defeito.

### Arrastar e largar

- [x] **D20** Arrastar pela pega (⋮⋮) move a carta, e as outras afastam-se em tempo real.
- [x] **D21** Funciona entre cartas de tamanhos diferentes (meia e inteira).
- [x] **D22** Largar fora da grelha ou no mesmo sítio → nada muda.
- [x] **D23** A nova ordem aparece logo e mantém-se depois de recarregar.
- [x] **D24** Clicar nos botões da carta (remover, largura, ↑/↓) não começa um arraste.
- [x] **D25** Teclado: Tab até à pega, Espaço para pegar, setas para mover, Espaço para largar (Esc cancela).
- [x] **D26** Toque (telemóvel ou tablet): arrastar pela pega funciona e o resto da página continua a fazer scroll.
- [x] **D27** Os botões ↑/↓ continuam a funcionar e ficam desactivados na primeira e na última carta.

## 10. Coerência entre páginas

Depois de fazeres as secções acima, confirma que estes números batem entre páginas:

- [x] **X1** O saldo de cada conta é igual em Contas, na barra lateral, nos cartões do painel e na carta "Contas".
- [x] **X2** A soma dos saldos é o "Saldo total" de Contas e o fim da "Evolução do saldo" no período actual.
- [x] **X3** O gasto de um mês no Orçamento é igual à soma das despesas ligadas e atribuídas nas Transacções com esse mês do orçamento.
- [x] **X4** O "gasto" de cada item no Plano anual é igual ao do mesmo mês no Orçamento.
- [x] **X5** Desfazer uma importação, apagar um acerto ou desmarcar um item actualiza todas as páginas sem precisar de recarregar.

## 11. Casos-limite rápidos

- [x] **L1** Valores com vírgula e ponto ("1.234,56" e "1234.56") são interpretados da mesma maneira.
- [x] **L2** Valores muito grandes (100 000 000) aparecem bem formatados e cabem nos cartões.
- [x] **L3** Nomes longos de contas e categorias ficam cortados com reticências, sem partir o layout.
- [x] **L4** Datas no limite do mês (último dia às 23h) caem no mês certo (hora de Maputo).
- [x] **L5** Dois separadores abertos: uma mudança num aparece no outro depois de voltar ao separador ou recarregar.
- [x] **L6** Um duplo clique rápido em "Gravar" ou "Importar" não cria duplicados.

---

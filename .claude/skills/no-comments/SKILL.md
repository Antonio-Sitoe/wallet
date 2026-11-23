---
name: no-comments
description: Regra do projecto wallet para não escrever comentários no código. Usar sempre que se cria, edita ou revê código em apps/web/src, apps/server ou packages/ (ficheiros .ts, .tsx e .css), incluindo código gerado a partir de outro ficheiro ou copiado de exemplos.
---

# Sem comentários no código

Neste projecto o código não leva comentários. Os nomes de variáveis, funções, tipos e ficheiros têm de chegar para explicar o que o código faz.

## Regra

- Não escrever comentários de linha (`// ...`), de bloco (`/* ... */`), JSDoc (`/** ... */`) nem comentários JSX (`{/* ... */}`).
- Também em CSS: nada de `/* ... */`.
- Ao editar um ficheiro, não acrescentar comentários a explicar a alteração.
- Código copiado de documentação ou exemplos perde os comentários antes de entrar no projecto.
- Se um comentário parecer necessário, isso costuma querer dizer que o nome não está claro. Muda-se o nome, ou extrai-se uma função ou constante com um nome que diga o que faz.

## Excepções

Só ficam os comentários que as ferramentas leem:

- `// biome-ignore <regra>: <motivo>` e `{/* biome-ignore ... */}`
- `// @ts-expect-error` e `// @ts-ignore` (evitar sempre que possível)
- `/// <reference ... />`
- Ficheiros gerados, que não se editam à mão: `apps/*/src/env.ts` (varlock), `apps/web/src/routeTree.gen.ts` (TanStack Router) e as migrações do drizzle em `packages/db`.
- Ficheiros de configuração em que os comentários são a própria configuração, como os decoradores `# @...` do `.env.schema`.

## Antes de terminar

Procurar comentários nos ficheiros alterados e removê-los, mantendo só as excepções acima:

```sh
git diff --name-only | grep -E '\.(ts|tsx|css)$' | xargs grep -nE '//|/\*' | grep -vE 'biome-ignore|@ts-|https?://|tauri://'
```

O resultado pode incluir falsos positivos (`//` ou `/*` dentro de strings, como URLs ou caminhos de rotas): confirmar cada linha antes de apagar.

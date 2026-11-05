# Padrões de desenvolvimento — HubRPG

## Estrutura
- `backend/src/routes/` — um arquivo de rotas por recurso
- `frontend/src/components/` — componentes reutilizáveis
- `frontend/src/pages/` — páginas (uma por rota)
- `frontend/src/services/` — comunicação com a API
- `frontend/src/styles/` — estilos globais e mixins

## Componentes e páginas
- Cada um em sua própria pasta, com nome em PascalCase:
  - `Nome.jsx` — estrutura e lógica
  - `Nome.module.scss` — estilos isolados (CSS Modules)
  - `index.js` — `export { default } from './Nome';`
- Páginas cuidam da lógica e dos dados; componentes recebem tudo por props.
- Nada de estilo global dentro de componente; o que é global fica em `styles/global.scss`.
- Trechos de estilo repetidos viram mixin em `styles/_mixins.scss`.

## Nomes
- Componentes: PascalCase (`CardCampanha`)
- Funções e variáveis: camelCase (`buscarCampanha`)
- Classes SCSS: camelCase (`.cardSelecionado`)
- Código e textos em português

## Git
- Nunca commitar direto no `main`. Rode `git branch` antes de começar.
- Um branch por tarefa: `feat/`, `fix/`, `refactor/`, `style/`, `docs/`, `chore/`
- Commits: `tipo: descrição no presente` (Conventional Commits)
- Todo merge passa por Pull Request; apagar o branch depois do merge.
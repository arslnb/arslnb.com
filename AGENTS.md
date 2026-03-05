# AGENTS.md

Purpose: editing rules for the public site and Zeus developer documentation.

## Scope

- Blog/site content and layouts.
- Zeus docs published under `zeus/docs/`.
- Zeus plugin directory pages.

## Canonical Zeus Docs Area

- Primary developer docs:
  - `zeus/docs/`
- Docs index metadata for agents:
  - `zeus/docs/agent-index.json`
  - `zeus/docs/llms.txt`

## Update Rules

- When anything materially changes in Zeus or Zeus plugin behavior, update the relevant pages under `zeus/docs/` in the same change.
- If docs pages are added, renamed, removed, or re-scoped, also update:
  - `zeus/docs/agent-index.json`
  - `zeus/docs/llms.txt`
- Keep plugin directory messaging aligned with the registry source of truth at `/Users/arslnb/codebase/zeus-ws/zeus-plugins/index.json`.


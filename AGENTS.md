# Astral Travel contributor map

Start with README.md and docs/architecture.md. `lib/core.mjs` is shared across browser, CLI, and MCP. Run `npm test`, `npm run check`, and `npm run build` after changes.

Preserve the evidence boundary: original sources, derived claims, dream proposals, and scenarios are separate record types. An accepted dream is inferred, never automatically verified. Scenarios cannot be cited as factual evidence. Imported claims need fresh review. No external calls, paid models, or background jobs are implicit in the alpha.

Keep private workspaces in ignored `.astral/`; never commit personal memory. Public examples are fictional. Browser storage and CLI storage are separate. New providers must explicitly describe what leaves the machine.

The static public site lives in `web/`. GitHub Actions publishes `dist/` to GitHub Pages from `main`. Relative asset URLs must work under `/astral-travel/`. Record releases in CHANGELOG.md and the website's Version History dialog. Avoid asserting model capabilities, scale, benchmarks, or integrations until implemented and verified.

Use the issue templates and docs/roadmap.md acceptance criteria to propose useful changes. Keep setup simple, accessible, and reproducible.

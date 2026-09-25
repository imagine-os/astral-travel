# Contributing to Astral Travel

Help make memory more useful, understandable, and worth exploring.

The most valuable contribution can be a concrete example: a search that missed the right source, a dream that looked plausible but was unhelpful, or a moment when you could not tell evidence from speculation.

## Start here

1. Read the [README](README.md) and try the [Lucid Lab](https://imagine-os.github.io/astral-travel/#lab).
2. Look through [existing issues](https://github.com/imagine-os/astral-travel/issues) before opening a new one.
3. For a substantial change, open a proposal explaining the user problem, intended behavior, and tradeoffs.
4. For a small fix, a focused pull request is welcome.

You do not need to be an expert in AI. Plain-language feedback, documentation improvements, accessibility findings, and realistic fictional test material all count.

## Local development

Use Node.js 22 or newer. The core has no runtime dependencies.

```bash
git clone https://github.com/imagine-os/astral-travel.git
cd astral-travel
npm test
npm start
```

The development site runs at [localhost:4173](http://localhost:4173). Initialize a sample local workspace with:

```bash
node bin/astral.mjs init --demo
```

Do not commit `.astral/`, exported personal workspaces, access tokens, or private source material. Use fictional fixtures that demonstrate the behavior without exposing anyone's information.

## The product rules

- **Sources remain distinct from interpretations.** Preserve the route back to evidence.
- **Suggestions remain proposals until reviewed.** Speculation must not silently enter the factual layer.
- **Be precise about capability.** A reminder queue is not a research agent. Keyword overlap is not understanding. A scenario template is not a prediction.
- **Keep the first useful action simple.** New users should understand what the system does before learning its architecture.
- **Make data portable.** New persistent fields need a migration or compatibility story.
- **Make interfaces accessible.** Support keyboard navigation, visible focus, readable contrast, and reduced motion.
- **Keep local work local by default.** Any proposed external request needs a clear purpose, permission model, and visible behavior.

## A useful pull request

Explain the problem, describe what changes for the user, and state how you checked it. Include screenshots for a visual change. Mention data-format changes and migration needs explicitly.

Run `npm test` for code changes. Add a focused test when a change introduces or fixes meaningful behavior. For UI work, inspect narrow and wide layouts, keyboard access, and reduced-motion behavior.

Prefer a small complete improvement over a large collection of unrelated changes. Keep a new dependency justified by a concrete need.

## Good first contributions

| Area | Useful contribution |
| --- | --- |
| Onboarding | Identify a term or interaction that prevented your first useful result. |
| Retrieval | Supply a fictional corpus, a query, and the source that should have been found. |
| Dreaming | Show why a suggested connection is useful or misleading. |
| Provenance | Find a place where the source of an idea is hard to inspect. |
| Accessibility | Report keyboard, focus, contrast, motion, or screen-reader barriers. |
| Documentation | Turn a confusing step into a clear reproducible instruction. |

## Working together

Be kind, specific, and open to revision. Critique ideas and behavior, not people. Harassment, threats, or disclosure of private information are not welcome.

For a security concern, follow [SECURITY.md](SECURITY.md) instead of opening a public report containing exploit details or sensitive data.

Contributions are made under the repository's [MIT license](LICENSE). Only contribute material you are entitled to share.

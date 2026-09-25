# Astral Travel: the story and the system

**Your second brain. Beyond remembering.**

Astral Travel turns collected knowledge into a place for discovery: keep evidence, connect ideas, investigate uncertainty, explore possibilities, and bring useful improvements back.

The name should make people curious. The first sentence should make the product understandable.

## The naming decision

Use **Astral Travel** as the umbrella. Keep **Dreaming** as the familiar entry point. Use **Lucid Lab** for intentional simulation and **Projection** for a future preview of an action or change.

This leaves room for the project to grow without suggesting that every feature is a dream generator. “Astral Projection” is evocative but narrower: it fits a mode where you step into a possible future and inspect it before acting.

| Name | Meaning | Status in v0.1 |
| --- | --- | --- |
| Astral Travel | The entire knowledge exploration system | Project name |
| Memory | Sources, derived knowledge, and their relationships | Working foundation |
| Dreaming | Reviewable connections across saved material | Deterministic suggestions |
| Research | Questions and knowledge that need checking | Reminder queue |
| Lucid Lab | Deliberate grounded or speculative exploration | Templates and browser experience |
| Projection | Preview of a proposed change before execution | Future capability |
| Memory Palace | Spatial navigation through knowledge | Future capability |

These names are a creative direction, not a representation that trademark, domain, or package-name availability has been cleared.

## A sentence for each audience

| Audience | Starting sentence |
| --- | --- |
| Everyone | “Your notes can do more than wait for you to search them.” |
| Developers | “An inspectable local memory engine with provenance, reviewable connections, scenario workflows, and five MCP tools.” |
| Vibecoders | “Start with a working memory lab, understand the pieces, then build your own second brain.” |
| Business owners | “Connect customer feedback, research, and decisions so your team can see what deserves attention.” |
| Researchers | “Explore ideas without losing the path back to your sources.” |
| Designers and writers | “Find unexpected combinations, then choose how far beyond the evidence to imagine.” |

## The emotional promise

People want to feel that the things they save are becoming useful. They want discovery without losing control, and imagination without confusion about what is real.

The feeling is **wonder with orientation**. The interface can be cinematic; its language should remain ordinary.

Good copy:

- “A connection worth a closer look.”
- “Show me the sources.”
- “Explore a different outcome.”
- “What needs another look?”
- “Keep this idea.”

Avoid unsupported claims such as “thinks while you sleep,” “understands everything,” “self-improving intelligence,” or “predicts your future.” Use those concepts only when an implemented capability can be explained, measured, and controlled.

## The homepage story

1. **Understand:** explain the value in one sentence.
2. **See:** show an actual connection between source material and a useful idea.
3. **Try:** provide a working browser interaction before asking for installation.
4. **Inspect:** expose the sources and the difference between a fact, a suggestion, and a scenario.
5. **Build:** offer the local engine, working stdio MCP connection, clear setup instructions, and a small architecture map.
6. **Imagine:** present future media and spatial capabilities as a roadmap.

The central demonstration should remain comprehensible as a static image. Motion adds atmosphere and reveals relationships; it must not carry essential information alone.

“Connect your agent” refers to the shipped local stdio server: search, add, dream, review, and scenario tools over a local workspace. It does not imply a hosted connector, a model included with the project, or verified support for every third-party client's interface. Link to the [MCP guide](mcp.md) for the exact configuration and boundaries.

## Visual language

- Give the project an identifiable visual world: deep space, luminous paths, readable panels, and a bright focal point.
- Let sources, knowledge, suggestions, and scenarios have distinct labels and treatments. Do not rely on color alone.
- Use generous spacing and clear type so a business owner can follow the same page as a developer.
- Keep controls visibly interactive and preserve keyboard focus.
- Support reduced motion, narrow screens, and readable contrast from the first release.
- Future video should illuminate a concept, not delay access to the product.

Hero art is conceptual illustration. Product screenshots and recorded demos should show actual behavior. Label concept work so viewers can tell them apart.

## Atomic design as a product principle

Compose larger experiences from understandable pieces:

| Level | Example | Principle |
| --- | --- | --- |
| Atom | Source excerpt, claim, tag | A clear identity and origin |
| Molecule | Connection with supporting sources | Inspectable composition |
| Organism | Research topic, procedure, scenario | Context without losing the parts |
| Template | A repeatable workflow | Adaptable structure |
| World | A personal or team memory environment | Navigation, style, and permissions that remain coherent |

This is a design analogy, not the v0.1 database schema. It should guide reuse, understandable interfaces, and later spatial composition.

## A future that can hold more than text

Treat a memory as something with content, provenance, time, permissions, and relationships. Its representation may eventually be text, an image, a clip, a sound, a location, or a generated scene.

Personal styles should change how knowledge is presented while preserving its identity and meaning. A forest, a studio, and a star map should be able to show the same underlying knowledge. Voice, pointer, touch, pen, and controller input should target the same actions.

Do not put large media in the repository or require users to download a world's assets to search its knowledge. The future architecture should separate media storage, semantic indexing, and presentation, with explicit lifecycle and retention policies.

## Measure the promise

A beautiful demo earns attention. A useful discovery earns a return visit.

Measure whether a new user can understand the product, create or find a useful connection, inspect its source, and return to use it again. Stars can indicate interest; they do not establish quality, retention, or revenue.

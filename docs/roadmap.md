# Roadmap: from an inspectable memory to a living system

Astral Travel begins with a small usable core. The long-term ambition is a portable system that preserves sources, organizes knowledge, explores scenarios, and improves through measured outcomes.

**v0.1 is a local alpha.** It has no connected model, live research worker, production multi-tenant service, validated forecasting engine, or terabyte-scale implementation. The milestones below describe work to earn those capabilities. They are not delivery-date promises.

See [architecture](architecture.md) for the data boundaries and [research](research.md) for the projects informing this work.

## Now: v0.1 foundation

| Delivered scope | What it demonstrates |
| --- | --- |
| Zero-dependency JavaScript core | Shared memory behavior in the browser and local CLI |
| Local stdio MCP server with five tools | Agent access to search, capture, dreaming, review, and isolated scenarios |
| Preserved source text and separate processed records | Inspectable raw/processed separation |
| Claims, references, and backlinks | Traceability between records |
| Lexical search | Find matching local text without an API key |
| Heuristic connection proposals and review | A visible candidate-to-review workflow |
| Research due queue | Identify what needs checking; no live fetch |
| Isolated template scenarios | Explore fictional outputs apart from factual memory |
| Public website, interactive lab, and repository documentation | Understand the concept and try a bounded example |

The release bar for this foundation is a reproducible local start, working browser interactions, tests of core data boundaries, and documentation that does not disguise heuristics as model reasoning. No external benchmark result is claimed.

## Next: trustworthy local memory

**Goal:** make a user's first real project reliably retrievable, inspectable, and portable.

Work includes transactional persistence, versioned import/export, stable IDs, source hashes, precise citations, migrations, duplicate detection, and a documented memory schema. Add an embedded database when the existing dataset model no longer provides the needed transaction and indexing guarantees.

Acceptance criteria:

- An import/export/import round trip preserves original text, IDs, references, review provenance, and scenario boundaries. External verification flags are not silently trusted; restoring trusted review states is a separate explicit operation.
- Changing a source creates a new version; existing citations continue to resolve to the version they originally cited.
- A malformed import fails without partially overwriting the current dataset.
- Users can trace every processed claim to a source span or see that it is explicitly unsupported.
- Backup/restore and migrations have reproducible fixtures and documented recovery behavior.
- A benchmark fixture reports ingest time, search latency, dataset size, and environment without making untested scale claims.

## Now: local MCP; next: richer integrations

**Goal:** give coding assistants and other agent clients access to memory without requiring users to replace their tools.

**Delivered:** the [local stdio MCP adapter](mcp.md) exposes five tools—`memory_search`, `memory_add`, `memory_dream`, `memory_review`, and `memory_scenario`—over the existing core. It shares CLI workspace locking and atomic writes. Actual subprocess tests exercise discovery, tool calls, persistence, malformed input, and competing writers. The website is not a remote MCP endpoint.

**Next:** add dedicated provenance inspection, additional resource/tool types, scoped read-only operation, and more client setup examples. A hosted transport with OAuth and granular authorization is a separate future milestone. The standalone CLI/API contract should remain useful independently of MCP.

Acceptance criteria for these richer integrations:

- At least two independently configured clients complete capture → search → inspect-source against the same dataset.
- Read-only operation cannot mutate the archive, approve candidates, or create external actions.
- Project scope is explicit and tested; queries cannot accidentally cross the configured boundary.
- The adapter does not rewrite a user's existing agent instructions or configuration without an explicit install action.
- Every tool documents inputs, outputs, side effects, error behavior, and supported schema version.
- A connection can be removed cleanly; memory remains exportable and useful without that client.
- Before a hosted transport is released, OAuth grants, scope enforcement, token revocation, and cross-tenant isolation have end-to-end tests. A local stdio integration does not imply these controls already exist.

## Next: temporal knowledge and ontology

**Goal:** answer what is true now and explain how knowledge changed.

Add entity types, typed relationships, source authority, claim statuses, validity windows, supersession, contradiction review, and reversible entity merges. Preserve recorded time separately from valid time.

Acceptance criteria:

- Fixtures distinguish “current policy,” “policy in June,” and “what was known in June.”
- Conflicting sources remain inspectable until a defined resolution is recorded.
- Updating a fact does not erase its previous evidence or change earlier scenario snapshots.
- An incorrect entity merge can be undone without losing its attached sources.
- Ontology changes carry schema versions and migration instructions; search and backlinks remain consistent afterward.
- A health check reports orphan references, unsupported claims, duplicate entities, and expired freshness obligations.

## Next: research and consolidation workers

**Goal:** keep selected knowledge current with visible changes and bounded cost.

Build connector workers, change detection, a scheduler, resumable jobs, and source-to-claim extraction adapters. Start with a small documented set of connectors. A research loop should follow explicit questions and freshness policies rather than browse indefinitely.

Acceptance criteria:

- Each job exposes its inputs, status, attempt count, limits, sources, changes, errors, and next due time.
- Re-running an unchanged source does not duplicate claims or produce a misleading new “discovery.”
- Cancellation, retries, rate limits, provider outages, and restart recovery have observable states.
- Captured evidence includes its URL or origin, capture date, content version, and appropriate source locator.
- A run cannot exceed its configured concurrency and retry limits; spending estimates and actual usage are distinguished.
- Freshness reporting measures source-change detection lag and stale-answer rate on controlled fixtures.
- Retrieved instructions are handled as source content and cannot authorize new tools, credentials, or external actions.

## Next: model-assisted dreams and evaluated improvement

**Goal:** improve useful behavior, rather than merely generate more reflections.

Add replaceable local/hosted model adapters. Dream runs propose connections, explanations, or procedures, while an experiment ledger records baselines, candidate versions, feedback, and outcomes. Learn from [DSPy's evaluation and optimization patterns](https://github.com/stanfordnlp/dspy), with dataset splits and budgets disclosed.

Acceptance criteria:

- Every generated candidate records its model, prompt/configuration version, input record IDs, cost/usage where available, and status.
- An improvement run evaluates a baseline and candidate on the same frozen held-out set with the same declared budget.
- Promotion requires explicit quality and cost criteria; regressions can be rolled back to a previous version.
- Rejected candidates remain available for auditing without being retrieved as accepted knowledge.
- Report negative and inconclusive results as well as wins; do not tune against the held-out test set.
- A human correction updates the appropriate claim or policy instead of overwriting unrelated source records.

## Next: branching projections and useful experiments

**Goal:** make possible futures inspectable without contaminating memory.

Extend today's templates into configurable scenario runs with Grounded, Counterfactual, and Fantastic modes. Add actors, constraints, branch comparison, snapshots, and an experiment handoff. Study [MiroFish](https://github.com/666ghj/MiroFish) and [OASIS](https://github.com/camel-ai/oasis) as workflow references, not evidence that generated scenarios predict real outcomes.

Acceptance criteria:

- Each branch exposes its baseline, assumptions, changed variables, mode, and run configuration.
- Default factual retrieval returns no simulated events across a dedicated adversarial fixture set.
- Saving an imagined event creates a hypothesis or creative artifact; it does not create a source-backed fact.
- A scenario can be replayed from saved inputs; any provider nondeterminism is disclosed.
- Comparing branches identifies assumption changes as well as output changes.
- Users can turn a hypothesis into a real experiment and attach its observed outcome separately.
- Any future probability or forecasting claim is accompanied by an appropriate calibration/evaluation report.

## Required before shared hosting: privacy, rights, and policy

**Goal:** make shared memory safe to operate and straightforward to leave.

Acceptance criteria:

- Tenant/project permissions apply at ingestion, retrieval, model-context assembly, export, and deletion.
- Isolation tests demonstrate that unauthorized records are neither returned nor sent to model providers.
- Secrets remain in a local runtime or server-side secret store; static pages contain no provider credentials.
- Users can inspect and revoke connectors and see what leaves their device before provider processing.
- Export and deletion include derived indexes and cached representations, with backup-retention behavior documented.
- Retention rules, relevance decay, and actual deletion are separate, understandable controls.
- Network actions, costs, and policy denials are auditable; public sharing is explicit.

## Multimodal and spatial evolution

**Vision:** grow from text records to navigable visual worlds without changing the meaning of stored knowledge.

This work includes original-media object storage, transcripts, keyframes, captions, embeddings, semantic segments, media generation adapters, spatial views, themes, and voice/controller input. [Lance](https://github.com/lance-format/lance) is one storage format to evaluate. No backend is selected solely because its architecture sounds scalable.

Acceptance criteria:

- Media claims resolve to an original file and precise page, region, or time range where applicable.
- Large ingestion resumes after interruption and deduplicates repeated assets by content identity.
- Expensive derived artifacts are versioned and can be rebuilt independently of the source.
- Retrieval fetches bounded metadata and relevant chunks; opening a scene does not download the full archive.
- A published scale test discloses actual stored bytes, item counts, hardware, indexing time, p95 latency, and cost before a terabyte-scale claim appears in the README.
- A list, graph, timeline, and spatial view reference the same stable semantic records.
- Theme/style changes do not alter sources, claims, permissions, or backlinks.
- Keyboard, pointer, touch, voice, and controller map to shared actions; core workflows remain accessible in a flat interface.

## Prove the claims

The evaluation suite should distinguish these dimensions rather than collapse them into one headline score:

| Dimension | Measures |
| --- | --- |
| Retrieval | Recall@k and nDCG; source-level and claim-level results separately |
| Answer quality | Supported-answer accuracy, citation precision/coverage, appropriate abstention |
| Temporal reasoning | Current/historical accuracy, update handling, contradiction handling |
| Scenario separation | Simulated-claim contamination rate in factual retrieval and answers |
| Freshness | Change-detection lag, missed material changes, stale-answer rate |
| Improvement | Held-out task success before/after; regressions; cost-adjusted gain |
| Efficiency | Ingest cost, query cost, p50/p95 latency, storage amplification |
| Adoption | Time to first useful result, completed installs, repeat use, resolved issues |

Use [LongMemEval](https://github.com/xiaowu0162/LongMemEval) for long-term memory and [LoCoMo](https://github.com/snap-research/locomo) for long conversations, alongside Astral-specific fixtures. Publish versions, splits, prompts, model settings, budgets, hardware, and limitations. Retrieval recall is not end-to-end answer accuracy. Stars are not active installations or downloads.

## Earn adoption through clarity

The public release should let someone understand the promise in a sentence and experience it in a minute: **import a source, inspect a claim, explain a connection, review a suggestion, and explore a clearly marked scenario.**

Give developers a documented API and reproducible example, vibecoders a working starter and tool connection, and business users a concrete project walkthrough. Keep the README visual and concise, with deeper details linked rather than hidden. Include a small example dataset, contribution guide, issue templates, changelog, license, and clearly marked limitations.

A good contribution should be easy to identify and verify: an importer with fixtures, an evaluation case, an accessibility fix, an ontology recipe, or a better explanation. Measure successful first use and sustained usefulness. Popularity is an outcome to earn, not a capability to promise.

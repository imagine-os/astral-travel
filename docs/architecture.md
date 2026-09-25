# How Astral Travel works

**A memory you can inspect. A place to think ahead.**

Astral Travel is designed around a simple distinction: what was recorded, what was learned, and what was imagined should remain distinguishable. A beautiful graph is useful only if you can inspect its sources, understand a connection, and see when a claim has changed.

This document separates the **working v0.1 alpha** from the **proposed architecture**. The alpha is a small local playground, not a production memory service or a verified improvement over established systems. See the [roadmap](roadmap.md) for acceptance criteria and the [research notes](research.md) for comparisons.

## What exists in v0.1

| Capability | Current implementation | Boundary |
| --- | --- | --- |
| Memory engine | A zero-dependency JavaScript core shared by the browser lab, Node CLI, and local MCP server | No model or external memory service is required |
| Source capture | Original text is preserved separately from processed records | This is not a tamper-proof archive, encrypted vault, or backup system |
| Processed memory | Explicit claims, source references, and backlinks make relationships inspectable | New claims begin as proposals; no model extracts or verifies them |
| Search | Local lexical matching over stored text with raw/claim/scenario result types | Search can include scenarios; callers must request raw/claim types for factual-only retrieval |
| Dream review | Heuristic connection proposals can be inspected and reviewed | A proposed connection is not proof; no background model is dreaming |
| Research queue | Due items identify material that should be checked | A due item does not trigger a live web search or refresh its source |
| Scenarios | Template-based scenario outputs live apart from factual memory | They are neither model-generated forecasts nor validated simulations |
| Agent integration | Five local stdio MCP tools for search, capture, dreaming, review, and scenarios | No hosted HTTP endpoint, OAuth, or automatic client configuration |
| Access | An interactive browser lab and a local command-line interface | GitHub Pages serves the public website; it does not run a persistent agent |

The current value is the inspectable workflow and its data boundaries. No published benchmark establishes that v0.1 recalls more accurately, reasons better, or operates at terabyte scale.

### Current data and limits

The workspace uses schema version `0.1` with `raw`, `claims`, `links`, `dreams`, `scenarios`, `events`, and `research` collections. Source records and their tags are frozen in memory. Exact duplicates are identified by title, text, and source URL; a changed tag list does not rewrite the original record. The convenience FNV-1a fingerprint is not a cryptographic integrity guarantee.

Claims must cite existing raw record IDs. Accepting a dream creates an inferred connection; it does not verify the claim. The `verified` status means a named person explicitly reviewed it, not that an independent fact-check established its truth. External imports reset incoming verified claims to proposed; validation of trusted local persistence preserves recorded reviews. Scenario IDs cannot be used as claim evidence or endpoints of factual links.

The initial limits are **20 MiB per JSON import/export**, **10,000 records per collection**, and **250,000 characters per source text**. Dream proposals inspect only the **latest 300 raw records**. The activity log is bounded and should not be treated as an immutable audit ledger. The CLI persists `.astral/workspace.json` with atomic writes and an exclusive mutation lock. These are deliberate alpha bounds, not evidence of performance at those maximum sizes.

### Local MCP is available

The [local MCP server](mcp.md) exposes `memory_search`, `memory_add`, `memory_dream`, `memory_review`, and `memory_scenario` over stdio. It shares the CLI's JSON workspace and exclusive write locks. The configured workspace path is fixed at startup; tool calls cannot select a different file. Browser storage remains separate and moves through export/import.

MCP search defaults to raw sources and claims; scenarios require an explicit type selection. The adapter applies smaller per-call limits than the core, including 50,000 characters for added source text and 1 MiB requests. It does not expose human verification, shell access, network research, or a scheduler. Actual subprocess tests cover tool behavior, persistence, malformed requests, and concurrent writers; they do not establish compatibility with every client interface.

Dedicated provenance tools, additional resource types, granular read-only permissions, richer client setup, and hosted OAuth remain planned. See [MCP setup and limits](mcp.md) for the current executable contract.

## The five spaces

These are proposed product spaces over a consistent data model. They do not require five databases or five services.

| Space | Purpose | Governing rule |
| --- | --- | --- |
| **Archive** | Preserve original documents, conversations, code, and eventually media | Every derived record can point back to its source |
| **Memory** | Organize source-backed claims, people, projects, decisions, and relationships | Evidence and inference remain visibly different |
| **Dreams** | Suggest connections, abstractions, questions, and improvements | Suggestions remain candidates until reviewed |
| **Projections** | Explore alternate assumptions and possible worlds | Simulated events remain inside their branch |
| **Experiments** | Compare a proposal with an actual result | Improvement requires observed or evaluated outcomes |

The alpha implements a small slice of this model. Experiment tracking, temporal queries, model-driven cognition, continuous workers, and production tenancy are future work.

## Raw and processed are different things

The Archive should preserve a source version with its capture time, content hash, original location, and access policy. Its contents are evidence of **what that source said**, not an automatic guarantee that the statement is true.

Processed records should cite source versions and exact spans. Summaries, extracted claims, graph edges, thumbnails, embeddings, and transcripts are derived artifacts. Each needs an extractor/version identifier so it can be rebuilt or replaced without overwriting the original.

The full system should support these record types:

| Type | Meaning | Example |
| --- | --- | --- |
| Source record | Captured material | A version of a product-pricing page |
| Source-backed claim | A statement supported by a cited span | The page listed a particular price on its capture date |
| Inference | A derived interpretation | A pricing change might affect this project's costs |
| Hypothesis | An idea that needs testing | A different model could reduce cost at the same quality |
| Preference | A person's stated choice, with scope | Use a compact view on mobile |
| Decision | A choice and its rationale | Keep the existing model until the evaluation passes |
| Simulated event | An event inside a scenario | A fictional customer rejects the new pricing |
| Observation | A recorded experiment or real-world outcome | The new model passed 47 of 50 held-out cases |

These are proposed semantic types; they are not a promise that every field or type is implemented in v0.1.

## A versioned semantic contract

The expanded data contract should include stable IDs, namespace and project scope, source IDs/spans, content hashes, recorded time, validity intervals, status, supersession links, generation-run identifiers, and schema versions. Confidence needs a defined meaning; a model's self-reported confidence is not calibrated probability.

Relationships need the same care as nodes. A graph edge should identify its relationship type, endpoints, provenance, whether it is extracted or inferred, and when it is valid. Backlinks are generated from these references, not separately maintained copies of truth.

Distinguish **valid time** from **recorded time**:

- “What is the current policy?” asks for a current claim.
- “What policy was in effect in June?” asks about valid time.
- “What did we believe the policy was in June?” asks about recorded knowledge.

Contradictions should create inspectable competing claims or supersession events. Deleting the older claim would erase useful history. Entity resolution should retain merge history and support undo when two people or projects were wrongly combined.

## How the loops should operate

| Loop | Input | Output | Completion condition |
| --- | --- | --- | --- |
| **Consolidate** | New or changed sources | Candidate claims, links, duplicates, conflicts | A bounded batch is processed and its changes are reviewable |
| **Dream** | Selected memory and a question | Proposed connections or hypotheses | Novelty and source checks complete, or budget expires |
| **Research** | A knowledge gap or freshness obligation | Captured sources and a change report | Defined questions are resolved, sources are exhausted, or budget expires |
| **Project** | A snapshot and changed assumptions | An isolated scenario branch | The planned horizon or stop condition is reached |
| **Improve** | A baseline, candidate, and evaluation set | A measured comparison and promotion decision | Quality/cost gates are evaluated |

Persistent workers will need idempotent jobs, checkpoints, retries, cancellation, run budgets, and visible failure states. Repeated reflection is not evidence of learning. A change that merely sounds better should not be automatically promoted.

Research should track a topic's sources, last check, freshness requirement, material changes, and next due date. Unchanged content should produce a small status event, not another full rewritten report. The current alpha only demonstrates the due queue.

## Lucid scenarios and the evidence boundary

“Astral travel” is a product metaphor for exploring perspectives and possible worlds. It does not describe a claim about consciousness or paranormal capability.

The proposed scenario modes are:

| Mode | Constraints | Suitable use |
| --- | --- | --- |
| **Grounded** | Uses source-backed starting conditions and explicit plausible assumptions | Rehearse a launch, conversation, migration, or workflow |
| **Counterfactual** | Changes selected conditions while keeping the rest visible | Compare alternate decisions or historical paths |
| **Fantastic** | Allows invented worlds, rules, and actors | Storytelling, concept design, games, and exploration |

Each scenario should reference a baseline snapshot, assumption set, actor definitions, model/version, and run configuration. Compare branches by their changed assumptions and outputs. Where sampling is used, expose repeated runs and variation; a vivid narrative is not a probability estimate.

**A simulated event must never silently become a factual memory.** A user may save it as a hypothesis or creative artifact. Establishing a source-backed claim requires separate evidence. If an actual experiment tests it, record that experiment and its observations as new records. Evidence search should exclude scenario namespaces unless the user explicitly asks to include them.

## Multimodal and spatial evolution

### Storage: small first, expandable by contract

The alpha stores small local text datasets. Its storage is not a security or scalability guarantee. The following is the intended progression:

| Tier | Responsibilities | Intended evolution |
| --- | --- | --- |
| Local dataset | Small text records, local exploration, portable export | Current alpha |
| Local durable index | Transactions, full-text retrieval, relationships, jobs, migrations | Embedded database and indexed source files |
| Shared metadata | Project/tenant permissions, claim history, ontology, runs | Server database plus graph/vector adapters where useful |
| Object archive | Original media and large attachments | Content-addressed local or compatible object storage |
| Derived media index | Transcripts, keyframes, captions, embeddings, time-range references | Chunked processing, resumable ingest, lazy fetch, lifecycle policies |

Terabyte readiness means bounded retrieval and processing, not placing every byte into a prompt or graph. Deduplicate by content identity, make expensive transformations resumable, and index small addressable segments. A future video-backed claim should open the relevant time range in the original asset. Thumbnails and preview proxies can be cached separately from full-resolution media.

Git should hold application code, schemas, small examples, manifests, and presentation assets. Private media and large archives should live outside the public repository. [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) is suitable for the homepage, documentation, and static lab; its published-site limit is 1 GB. Persistent cognition jobs and large private memory stores require a separate local process or backend.

## Privacy, control, and cost

Before introducing shared storage or network workers, implement policy checks for source access, retrieval, export, and deletion. Tenant filtering must happen before any content reaches a model. Source documents and retrieved pages must be treated as untrusted data, never as permission to change the system's instructions.

Retention and forgetting are distinct. Relevance decay can reduce retrieval priority without deleting history. Actual deletion must cover derived indexes and materialized views, with an explicit policy for backups. Users need export, deletion, connector revocation, source-level exclusions, and clear disclosure before local content is sent to a provider.

Runs should carry limits for money, tokens, elapsed time, retries, concurrency, and external actions. Store actual provider usage when available and label estimates. Future integrations should use credentials through a local runtime or server-side secret store, never embed secrets in a GitHub Pages bundle.

## Atomic design and spatial interfaces

[Brad Frost's Atomic Design](https://atomicdesign.bradfrost.com/chapter-2/) describes atoms, molecules, organisms, templates, and pages for interface systems. Astral can use that methodology directly for reusable UI. The memory hierarchy below is an intentional adaptation, not a claim that Atomic Design is an established memory algorithm:

| Composition | Memory adaptation | Interface adaptation |
| --- | --- | --- |
| Atom | Source fragment, entity, or claim | Token, icon, label, input |
| Molecule | Evidence bundle or linked concept | Source card or provenance badge group |
| Organism | Procedure, model, or project knowledge | Search panel, graph inspector, review queue |
| Template | Reusable research or scenario recipe | Workspace layout and interaction pattern |
| World | A project space or scenario branch | A complete navigable experience |

**Representation stays separate from meaning.** Spatial coordinates, themes, material styles, cameras, thumbnails, and input mappings should reference stable semantic IDs. A graph, a table, a timeline, and a memory palace can therefore show the same records. Changing a scene's visual style should not modify its claims or provenance.

Voice, keyboard, pointer, touch, pen, and controller should ultimately call the same semantic actions. Accessibility and a useful flat view are baseline requirements, not fallbacks reserved for users who cannot enter a 3D scene.

## Systems worth learning from

These are design references, not dependencies currently included in Astral Travel:

- [Graphify](https://github.com/Graphify-Labs/graphify): local deterministic code parsing, inspectable graph paths, and extracted/inferred edge distinctions. Study its quick start and query/path/explain workflow.
- [Graphiti](https://github.com/getzep/graphiti): temporal context graphs, provenance, incremental updates, and hybrid retrieval. Validate historical behavior for the specific record types used.
- [Hindsight](https://github.com/vectorize-io/hindsight): retain/recall/reflect vocabulary and synthesized mental models. Study how reflection produces reusable knowledge.
- [Cognee](https://github.com/topoteretes/cognee): configurable ingestion, extraction, graph enrichment, and search pipelines.
- [MiroFish](https://github.com/666ghj/MiroFish) and [OASIS](https://github.com/camel-ai/oasis): seed-to-world simulation workflows and interaction with simulated actors. Simulation output still requires calibration before any forecasting claim.
- [DSPy](https://github.com/stanfordnlp/dspy): modular model programs and metric-driven optimization. Improvement should be evaluated against held-out tasks.
- [Lance](https://github.com/lance-format/lance): versioned multimodal storage, efficient data access, and media indexing patterns for a later storage adapter.

The proposed advantage is the whole inspectable journey: **source → understanding → possibility → test → measured learning**. Its quality must be demonstrated through the [roadmap's acceptance criteria](roadmap.md), not assumed from the metaphor.

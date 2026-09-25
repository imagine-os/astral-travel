# The engine: what runs today

The v0.1 engine runs in modern browsers and Node.js 20+, with no dependencies, model calls, accounts, telemetry, or network access. It is a small working foundation for memory systems, not an autonomous agent or a claim of human-like dreaming.

## Try it

```sh
node bin/astral.mjs init --demo
node bin/astral.mjs search "approval"
node bin/astral.mjs dream
node bin/astral.mjs review DREAM_ID --accept
node bin/astral.mjs simulate --prompt "Could our studio improve approval time?" --mode grounded
node bin/astral.mjs research
node bin/astral.mjs export --out astral-snapshot.json
```

Replace `DREAM_ID` with a proposal ID printed by `dream`. Accepted ideas remain **inferred**, with links to their original sources.

Run the fully in-memory example with `node examples/quickstart.mjs`. Run invariant and CLI tests with `node --test tests/core.test.mjs`.

## The memory boundary

| Collection | Purpose | Evidence status |
| --- | --- | --- |
| `raw` | Original text, title, source URL, tags | Preserved source; not automatically true |
| `claims` | Source-backed interpretations and accepted connections | `proposed`, `inferred`, or explicitly human-reviewed `verified` |
| `links` | Typed connections between originals and claims | A relationship someone created; not proof |
| `dreams` | Heuristic connection proposals | Proposed, accepted, or rejected hypotheses |
| `scenarios` | Grounded or speculative worksheets | Always `simulation`; cannot be claim evidence |
| `research` | Due dates, questions, original source references | Work queue; does not fetch or validate information |
| `events` | Bounded activity metadata | Not an authenticated audit trail |

Raw **text characters are preserved exactly**. Titles are trimmed, tags normalized to lowercase, and HTTP(S) source URLs normalized. An exact title/text/source duplicate returns its original record, without changing the original tags. Corrections should be new originals linked to earlier records.

The API freezes each original and its tag array. This protects against accidental edits through returned objects. Workspace arrays remain ordinary JavaScript arrays: this is an application boundary, not protection against someone modifying their own process or JSON files. The FNV-1a content fingerprint is not a cryptographic signature.

## Browser and Node API

```js
import {
  createWorkspace, ingest, addClaim, verifyClaim,
  dream, review, search, createScenario, exportWorkspace,
} from './lib/core.mjs';

const memory = createWorkspace();
const original = ingest(memory, {
  title: 'Interview notes',
  text: 'Clients said scattered feedback made approval confusing.',
  tags: ['approval'],
});
const claim = addClaim(memory, {
  title: 'A single feedback board may help',
  text: 'Hypothesis to test with a measured pilot.',
  rawIds: [original.id],
});

// Only do this after an actual person has reviewed the original and claim.
verifyClaim(memory, claim.id, { reviewer: 'Your name', note: 'Reviewed the limited observation.' });

const proposals = dream(memory);
if (proposals.length) review(memory, proposals[0].id, 'accept');
const evidence = search(memory, 'feedback', { types: ['raw', 'claim'] });
const worksheet = createScenario(memory, {
  prompt: 'What would have to be true for approval time to improve?',
  mode: 'grounded',
});
const portableSnapshot = exportWorkspace(memory);
```

Functions mutate the provided workspace and return the resulting record, proposal array, or search results. `createWorkspace(seed)` accepts an optional array of raw record inputs. `createDemoWorkspace()` provides fictional studio notes.

| Function | Return / behavior |
| --- | --- |
| `ingest(workspace, {title, text, sourceUrl?, tags?})` | Immutable original; duplicates return the existing original |
| `addClaim(workspace, {title, text, rawIds, tags?})` | Proposed interpretation; at least one existing raw source required |
| `verifyClaim(workspace, id, {reviewer, note?})` | Records named human review; never an automated truth guarantee |
| `addLink(workspace, {fromId, toId, type, label?})` | Link between raw/claim IDs; types: supports, contradicts, related, derived-from, part-of |
| `search(workspace, query, {types?, limit?})` | Scored lexical results with `type` and original `record` |
| `dream(workspace, {limit?})` | Connection proposal array; alias `runDreamCycle` |
| `review(workspace, id, 'accept' / 'reject', {note?})` | Updated proposal; alias `reviewDream` |
| `createScenario(workspace, {prompt, mode?})` | Isolated template worksheet; `grounded` or `speculative` |
| `backlinks(workspace, id)` | Claims, incoming/outgoing links, dreams, scenarios, research referencing the record |
| `scheduleResearch(workspace, {title, query, rawIds?, dueAt?})` | Pending freshness task; default due now |
| `getResearchQueue(workspace, {now?, includeCompleted?})` | Due-date-sorted task copies, including `isDue` and `overdueMs` |
| `completeResearch(workspace, id, {note?, nextDueAt?})` | Complete task or reschedule it |
| `exportWorkspace(workspace)` | Validated, formatted JSON string |
| `importWorkspace(jsonOrObject)` | Validated workspace; imported verification resets to proposed |
| `validateWorkspace(jsonOrObject)` | Structural validation for your **own trusted local persistence**, preserving human review |

Search includes clearly typed originals, claims, and scenarios by default. For retrieval used as evidence, specify `types: ['raw', 'claim']`. `processed` is an alias for the `claim` filter. Search is deterministic keyword matching with title/tag boosts, not semantic retrieval or an LLM reranker.

## How dreaming works

Each cycle examines the latest 300 originals. A pair is eligible when it shares a tag or at least three non-stopword tokens. The score is `4 × shared tags + shared keywords`; it is **not a probability or confidence score**. The engine ranks the pairs and produces explicit lexical-overlap hypotheses with their raw IDs, shared tags, and shared words.

No pair is proposed again while its proposal remains in the workspace, including rejected pairs. Acceptance adds an inferred connection claim and `derived-from` links. Rejection changes only the proposal and activity log. A separate human review can verify an accepted claim; acceptance itself never does.

## Scenarios and freshness

Grounded mode retrieves up to four lexically relevant originals and fills a worksheet for baseline, favorable branch, adverse branch, and reversible experiment. Its context is preserved source material, not validated truth. With no matches, the worksheet explicitly reports missing evidence.

Speculative mode offers fictional rule changes, world exploration, and a return-to-reality question. Neither mode performs a model simulation, generates a forecast, executes a tool, or promotes its text to knowledge. Raw-source references structurally reject scenario IDs.

Research tasks carry due dates and completion/rescheduling notes. They **do not** browse, watch pages, trigger scheduled jobs, or claim knowledge is up to date. A later researcher integration should create new originals, propose changes, and preserve review before updating beliefs.

## Persistence, import, and limits

The CLI stores `.astral/workspace.json` by default. Use `--workspace /path/to/workspace.json` for another workspace. Writes take an exclusive `.lock` file and replace the workspace atomically after validation. Concurrent writers fail clearly rather than overwriting each other. A crashed process can leave a lock: confirm that writer has stopped before removing it.

External `import` replaces a workspace only when `--replace` is supplied. Export a backup first. Imported `verified` claims reset to `proposed`, and recorded reviews are removed so another person's claimed verification cannot silently become yours. Imported source contents and activity history are still untrusted user data. JSON does not execute code or fetch URLs.

The current snapshot limits are 20 MiB total, 10,000 records per collection, 250,000 characters per text field, and 100 source references or tags per record. Events discard the oldest entry when the activity limit is reached. These are bounded prototype defaults, not a terabyte storage design.

Future large media belongs in object storage with access policies, content-addressed references, transcripts, and timestamped evidence. Binary media, embeddings, workers, encryption, multi-user sync, and content authenticity are not implemented in this core.

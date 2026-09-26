/** Fictional text examples for the visual explorer. No attachments or network calls. */
import { ingest, addClaim, addLink, LIMITS } from './core.mjs';

const EXAMPLE_SET = 'astral-object-examples-v1';
const sources = Object.freeze([
  {
    key: 'book', title: 'The Atlas of Useful Questions — reading notes',
    tags: ['book', 'knowledge', 'design'],
    text: `FICTIONAL BOOK · READING NOTES
The Atlas of Useful Questions is an invented book for this demo.

Chapter 1 — Keep the question beside the answer.
A good knowledge shelf shows what a note says, who recorded it, and what remains uncertain.

Chapter 2 — Let one idea live in many rooms.
Arrange the same record by topic, project, or evidence without copying its content.

Stored here: these written reading notes. No book file is attached.`,
  },
  {
    key: 'video', title: 'A tour of tomorrow’s studio — video storyboard',
    tags: ['video', 'studio', 'welcome'],
    text: `FICTIONAL VIDEO · WRITTEN STORYBOARD
00:00 — A visitor enters a bright studio. A sign says “Start here.”
00:05 — Three objects appear: an original note, a connected idea, and an experiment plan.
00:12 — The visitor opens the note and follows its link to the interpretation.
00:20 — End frame: “Keep the source. Explore the possibility.”

Stored here: a written shot list with planned timings. No video has been recorded, attached, or made playable.`,
  },
  {
    key: 'audio', title: 'Welcome desk interview — audio transcript',
    tags: ['audio', 'studio', 'welcome'],
    text: `FICTIONAL AUDIO · SCRIPTED TRANSCRIPT
This invented conversation demonstrates how a transcript can be saved as text.

[00:00] Visitor: “I understand the note, but what is the purple object?”
[00:06] Guide: “It is an interpretation. Open it to see the original sources.”
[00:12] Visitor: “So the shape helps me know what I am looking at.”

Stored here: the scripted words and illustrative timestamps. There is no recording or audio playback.`,
  },
  {
    key: 'image', title: 'Lake studio — image moodboard notes',
    tags: ['image', 'design', 'welcome'],
    text: `FICTIONAL IMAGE · MOODBOARD DESCRIPTION
A daylight studio by a still lake. Pale paper, blue glass, and warm brass make each object easy to distinguish.

Composition notes:
• Keep the central object larger than the background details.
• Use clear silhouettes: a book, a film frame, a conversation card.
• Put readable labels below each object.

Stored here: a written visual brief. No image file is attached; the preview shows these saved words.`,
  },
  {
    key: 'code', title: 'Keep source text intact — JavaScript snippet',
    tags: ['code', 'memory', 'provenance'],
    text: `FICTIONAL PROJECT · SAVED CODE EXAMPLE
A tiny illustrative function for a future note collector:

function captureNote(text, title) {
  return Object.freeze({
    title,
    text,
    capturedAt: new Date().toISOString()
  });
}

The input text is preserved. An interpretation would be stored as a separate record with a source reference.

Stored here: this snippet as text. It is not executed by the explorer and is not a complete storage implementation.`,
  },
  {
    key: 'research', title: 'Memory archive — web research brief',
    tags: ['research', 'memory', 'provenance'],
    text: `FICTIONAL RESEARCH · SOURCE-CHECKING BRIEF
Question: how should a shared memory archive preserve a route back to its sources?

Before adopting a tool:
1. Read its official export and retention documentation.
2. Check whether a derived note links to a particular source version.
3. Try an export and inspect the original text.
4. Record the date and any unanswered questions.

This is a fictional research plan, not a completed web search. No external page or live result is attached.`,
  },
  {
    key: 'project', title: 'Launch the shared studio — project checklist',
    tags: ['project', 'studio', 'welcome'],
    text: `FICTIONAL PROJECT · CHECKLIST
A small team is planning its first shared knowledge room.

[ ] Capture three useful original notes.
[ ] Add one interpretation and link its sources.
[ ] Choose an arrangement that makes the project easy to scan.
[ ] Ask a new visitor to find the next step.
[ ] Record what confused them before changing the design.

These are example tasks in a text note. Checking and assigning tasks is not implemented here.`,
  },
  {
    key: 'experiment', title: 'Two handoffs — experiment plan',
    tags: ['experiment', 'studio', 'welcome'],
    text: `FICTIONAL EXPERIMENT · PLAN, NOT RESULTS
Question: will recognizable object shapes help visitors find the right source?

Compare two small prototypes with the same notes: one uses identical dots, the other uses labeled document objects.
Measure whether each visitor can find an original source and explain which item is an interpretation.
Keep the question, timing, and instructions consistent. Record confusion as well as successful attempts.

No experiment has been run. There are no measured outcomes or performance claims in this note.`,
  },
  {
    "key": "folder-studio",
    "title": "Cedar Studio — project folder",
    "tags": [
      "format:folder",
      "folder",
      "studio",
      "welcome"
    ],
    "text": "FICTIONAL FOLDER · COLLECTION OUTLINE\nA project folder for an invented studio launch. Its related links lead to the launch checklist, welcome film, and Mira’s guide profile.\n\nSuggested sections: Welcome · Production · Feedback.\nKeep a short purpose note beside each linked record so visitors can choose where to go next.\n\nThis is a saved collection outline, not a filesystem folder. Related links describe this fictional project; moving the object does not move files."
  },
  {
    "key": "folder-library",
    "title": "The knowledge library — reference folder",
    "tags": [
      "format:folder",
      "folder",
      "memory",
      "knowledge"
    ],
    "text": "FICTIONAL FOLDER · REFERENCE INDEX\nA collection outline for the invented studio’s reading and source-review materials.\n\nThe Atlas of Useful Questions provides reading notes. The memory archive brief asks how sources should be preserved. Pip’s role profile describes an imagined archivist who keeps this index understandable.\n\nThese references are navigable note links. No external library, folder synchronization, or automatic filing is connected."
  },
  {
    "key": "folder-dreams",
    "title": "Dream garden — scenario folder",
    "tags": [
      "format:folder",
      "folder",
      "experiment",
      "imagination"
    ],
    "text": "FICTIONAL FOLDER · SCENARIO INDEX\nA place to collect written imaginative scenarios without treating them as facts.\n\nTwo entry points are planned: a realistic visitor rehearsal and an impossible observatory above the clouds. Noor’s design profile helps set their visual language.\n\nThis source stores a scenario index. It does not run simulations or hold real dream recordings."
  },
  {
    "key": "network-studio",
    "title": "Studio constellation — relationship network",
    "tags": [
      "format:network",
      "network",
      "studio",
      "connections"
    ],
    "text": "FICTIONAL NETWORK · RELATIONSHIP MAP\nA written map of an invented studio workflow: Mira welcomes visitors, Sol checks sources, Pip maintains the archive, and Noor shapes visual explanations.\n\nThe welcome desk and research queue are planned services in this map. Lines between their notes mean “related in this example,” not live messages, permissions, or agent execution.\n\nThis is a design record. No team members or services are connected."
  },
  {
    "key": "network-memory",
    "title": "Memory routes — information network",
    "tags": [
      "format:network",
      "network",
      "memory",
      "provenance"
    ],
    "text": "FICTIONAL NETWORK · INFORMATION ROUTES\nAn architecture sketch for original notes, a searchable index, media references, and human review.\n\nThe source catalogue would preserve exact text. The media catalogue would store small references rather than video binaries. A storage cloud is a planning object for future large files.\n\nThe explorer’s links connect these saved descriptions. They do not transfer data or represent a deployed network."
  },
  {
    "key": "character-mira",
    "title": "Mira — the welcome guide",
    "tags": [
      "format:character",
      "character",
      "studio",
      "welcome"
    ],
    "text": "FICTIONAL CHARACTER · ROLE PROFILE\nMira is an invented guide for the Cedar Studio example.\n\nRole: help a newcomer find one useful next step.\nCarries: the project checklist and welcome transcript.\nHabit: ask “Would you like the original note or the interpretation?”\n\nMira is a character description, not a real person, connected account, or running AI agent. Selecting this object opens the saved profile."
  },
  {
    "key": "character-sol",
    "title": "Sol — the source researcher",
    "tags": [
      "format:character",
      "character",
      "research",
      "freshness"
    ],
    "text": "FICTIONAL CHARACTER · ROLE PROFILE\nSol is an invented researcher in the studio scenario.\n\nRole: collect a question, check its sources, and record what is still unknown.\nCarries: the memory archive brief and a source-review notebook.\nHabit: put a review date beside time-sensitive claims.\n\nThis profile describes an imagined role. It does not browse the web, call a model, or schedule research automatically."
  },
  {
    "key": "character-pip",
    "title": "Pip — the patient archivist",
    "tags": [
      "format:character",
      "character",
      "memory",
      "knowledge"
    ],
    "text": "FICTIONAL CHARACTER · ROLE PROFILE\nPip is an invented archivist for the knowledge library.\n\nRole: make a note easy to find again while preserving the original words.\nCarries: a reference index and the proposed source catalogue.\nHabit: keep an interpretation beside its evidence, with a visible status.\n\nThis is a fictional profile and a navigable note. Pip is not an active agent or a storage integration."
  },
  {
    "key": "character-noor",
    "title": "Noor — the visual storyteller",
    "tags": [
      "format:character",
      "character",
      "studio",
      "design"
    ],
    "text": "FICTIONAL CHARACTER · ROLE PROFILE\nNoor is an invented designer for the studio’s visual explanations.\n\nRole: turn a complicated system into a clear sequence of objects and short labels.\nCarries: the daylight moodboard and the object-silhouette study.\nHabit: test whether a viewer understands the shape before adding decoration.\n\nThis profile is example content. No real designer, image generator, or production service is attached."
  },
  {
    "key": "database-sources",
    "title": "Source catalogue — database sketch",
    "tags": [
      "format:database",
      "database",
      "memory",
      "provenance"
    ],
    "text": "FICTIONAL DATABASE · SCHEMA SKETCH\nA proposed catalogue table for the invented studio:\n\nsource_id | title | original_text | captured_at | content_reference\n\nA separate interpretation table would point back to source IDs. Review status belongs to the interpretation rather than rewriting the original source.\n\nThis is a written schema, not a connected database. The local explorer stores the sketch itself as a text note."
  },
  {
    "key": "database-media",
    "title": "Media shelf — database sketch",
    "tags": [
      "format:database",
      "database",
      "media",
      "memory"
    ],
    "text": "FICTIONAL DATABASE · MEDIA INDEX PLAN\nA proposed index for future images, audio, and video:\n\nasset_id | media_type | object_reference | transcript | access_policy\n\nKeep searchable text and small metadata close to the knowledge graph. Store large binaries separately, with clear permissions and a recoverable export path.\n\nThis is a planning record. No media database, upload feature, or external storage service is connected."
  },
  {
    "key": "service-welcome",
    "title": "Welcome desk — service blueprint",
    "tags": [
      "format:service",
      "service",
      "studio",
      "welcome"
    ],
    "text": "FICTIONAL SERVICE · BLUEPRINT\nInput: a newcomer’s question.\nPlanned steps: show the studio map, offer one useful record, and let the newcomer follow its source links.\nOutput: a clear next step and a chance to ask for more detail.\n\nMira’s profile and the welcome transcript describe the intended tone. This is a text blueprint, not a deployed service or chat endpoint."
  },
  {
    "key": "service-research",
    "title": "Research queue — service blueprint",
    "tags": [
      "format:service",
      "service",
      "research",
      "freshness"
    ],
    "text": "FICTIONAL SERVICE · BLUEPRINT\nInput: a question and a set of existing source notes.\nPlanned steps: choose sources, record a review date, look for disagreement, and submit a proposed update for human review.\nOutput: a dated research note with a source trail.\n\nSol’s profile describes the imagined role. This blueprint does not make network calls or execute a background research loop."
  },
  {
    "key": "cloud-archive",
    "title": "Archive cloud — storage plan",
    "tags": [
      "format:cloud",
      "cloud",
      "memory",
      "media"
    ],
    "text": "FICTIONAL CLOUD · STORAGE PLAN\nA future storage boundary for a growing studio archive.\n\nSmall, searchable records: notes, source links, transcripts, thumbnails, and access descriptions.\nLarge objects: original image, audio, and video files held in separately configured storage.\n\nPlan for retention, deduplication, export, and recovery before claiming terabyte scale. This object is an architecture note; there is no connected cloud or uploaded media."
  },
  {
    "key": "portal-rehearsal",
    "title": "Rehearsal door — realistic scenario portal",
    "tags": [
      "format:portal",
      "portal",
      "experiment",
      "studio"
    ],
    "text": "FICTIONAL PORTAL · SCENARIO ENTRY BRIEF\nRehearse a realistic first visit to the studio.\n\nThe visitor asks where to begin. Mira offers the launch checklist, then explains the difference between an original source and an interpretation. Observe which labels need clarification.\n\nThis is a written scenario brief. Opening this object reads the note; it does not launch a live simulation or establish evidence about real visitors."
  },
  {
    "key": "portal-observatory",
    "title": "Cloud observatory — impossible scenario portal",
    "tags": [
      "format:portal",
      "portal",
      "experiment",
      "imagination"
    ],
    "text": "FICTIONAL PORTAL · IMAGINATIVE SCENARIO ENTRY\nImagine a floating observatory where constellations are made of remembered questions. Books open into rooms; doors connect ideas that have never met.\n\nUse the setting to invent alternative ways of navigating a knowledge base, then bring useful proposals back for review against real requirements.\n\nThis intentionally impossible scenario is a creative brief, not factual evidence or a claim of literal astral travel."
  },
  {
    "key": "book-gardens",
    "title": "Gardens of Thought — chapter notes",
    "tags": [
      "format:book",
      "book",
      "knowledge",
      "imagination"
    ],
    "text": "FICTIONAL BOOK · CHAPTER NOTES\nGardens of Thought is an invented book about caring for a knowledge collection.\n\nChapter sketch: a seed is a question, a path is a link, and pruning means retiring an outdated interpretation while retaining its source history.\n\nThe garden is a metaphor for navigation. These are written chapter notes; no book file is attached."
  },
  {
    "key": "image-silhouettes",
    "title": "Seventeen silhouettes — object study",
    "tags": [
      "format:image",
      "image",
      "design",
      "studio"
    ],
    "text": "FICTIONAL IMAGE · OBJECT DESIGN BRIEF\nMake each object recognizable before a label is read:\n\nFolder: an open tab and loose pages.\nCharacter: a head, body, and small name badge.\nNetwork: visible connected hubs.\nDatabase: stacked cylinders.\nPortal: an open arch with a threshold.\n\nThis saved brief describes artwork. No image attachment or generated asset is stored in this record."
  },
  {
    "key": "image-observatory",
    "title": "Cloud observatory — concept notes",
    "tags": [
      "format:image",
      "image",
      "design",
      "imagination"
    ],
    "text": "FICTIONAL IMAGE · CONCEPT DESCRIPTION\nA bright observatory floats above soft clouds. Warm brass arches frame blue glass lenses. Small constellations of note objects are connected by visible paths.\n\nKeep the space readable and the objects distinct. Use the impossible setting as a creative exploration rather than a picture of a real place.\n\nStored here: these visual notes, not an image file."
  },
  {
    "key": "audio-garden",
    "title": "A walk through the garden — sound script",
    "tags": [
      "format:audio",
      "audio",
      "media",
      "imagination"
    ],
    "text": "FICTIONAL AUDIO · SOUND SCRIPT\n00:00 — A quiet page turn welcomes the listener.\n00:06 — A soft chime marks entry to a new collection.\n00:12 — The guide says, “Follow a question, then return to its source.”\n00:18 — Silence leaves room for reading.\n\nThis is a written sound plan with illustrative timings. There is no recorded audio or playback in the object."
  },
  {
    "key": "video-handoff",
    "title": "From question to source — film plan",
    "tags": [
      "format:video",
      "video",
      "media",
      "provenance"
    ],
    "text": "FICTIONAL VIDEO · SHOT PLAN\nShot 1: a visitor selects a question.\nShot 2: a proposed interpretation opens beside the original notes.\nShot 3: a visible link takes the visitor back to the exact saved text.\nShot 4: the visitor records an unanswered question for later review.\n\nThese are written shots for an imagined film. No video file has been generated or attached."
  },
  {
    "key": "code-links",
    "title": "Stable links — implementation sketch",
    "tags": [
      "format:code",
      "code",
      "memory",
      "provenance"
    ],
    "text": "FICTIONAL CODE · IMPLEMENTATION SKETCH\nAn illustrative record relationship:\n\nconst link = {\n  fromId: \"example-source\",\n  toId: \"example-interpretation\",\n  type: \"derived-from\"\n};\n\nThe labels can change while IDs preserve the relationship. This saved snippet is not executed, and its placeholder IDs are not live workspace references."
  },
  {
    "key": "document-review",
    "title": "Source-review notebook — weekly checklist",
    "tags": [
      "format:document",
      "document",
      "research",
      "freshness"
    ],
    "text": "FICTIONAL DOCUMENT · REVIEW CHECKLIST\n[ ] Revisit sources whose information may have changed.\n[ ] Keep the previous note available for comparison.\n[ ] Record the date and what was actually checked.\n[ ] Describe disagreement instead of hiding it.\n[ ] Submit any new interpretation as proposed.\n\nThis checklist is an example note, not an automated schedule or completed review."
  },
  {
    "key": "experiment-navigation",
    "title": "Three routes — navigation experiment",
    "tags": [
      "format:experiment",
      "experiment",
      "experiment",
      "design"
    ],
    "text": "FICTIONAL EXPERIMENT · PLAN, NOT RESULTS\nQuestion: which arrangement helps a visitor find a useful source?\n\nCompare an object gallery, a lane-based skill tree, and a radial view using the same fictional notes. Ask visitors to find a profile, a collection, and an interpretation’s source.\n\nMeasure confusion and success before recommending a default. No participants have run this experiment; there are no performance results."
  },
]);

const interpretations = Object.freeze([
  {
    key: 'source-trail', title: 'Example proposal: keep a return path to the source',
    text: 'Proposal from fictional design material: keep original text separate from interpretation, and display the source reference beside the interpretation. The saved code example and research brief motivate this design direction; they do not establish a real-world outcome.',
    sourceKeys: ['code', 'research'], tags: ['memory', 'provenance'],
  },
  {
    key: 'clear-welcome', title: 'Example proposal: make the welcome self-explanatory',
    text: 'Proposal from the fictional storyboard, scripted transcript, and moodboard notes: combine recognizable shapes, readable labels, and visible source trails so a newcomer can tell what each object represents. Test this with real visitors before claiming it improves understanding.',
    sourceKeys: ['video', 'audio', 'image'], tags: ['studio', 'welcome'],
  },
  {
    "key": "collection-entry",
    "title": "Example proposal: use folders as clear entry points",
    "text": "Proposal from fictional collection outlines: keep a short purpose note on each folder and expose its related records. The studio and library outlines suggest two useful starting places. Test whether people understand these visual collections before treating them as a proven navigation improvement.",
    "sourceKeys": [
      "folder-studio",
      "folder-library"
    ],
    "tags": [
      "studio",
      "knowledge"
    ]
  },
  {
    "key": "roles-visible",
    "title": "Example proposal: make roles recognizable",
    "text": "Proposal from fictional character profiles: give each imagined role a distinctive silhouette, a short purpose, and visible links to the material it uses. Mira and Pip describe welcome and archive responsibilities. These profiles do not establish that autonomous agents exist or perform those tasks.",
    "sourceKeys": [
      "character-mira",
      "character-pip"
    ],
    "tags": [
      "studio",
      "design"
    ]
  },
  {
    "key": "storage-boundary",
    "title": "Example proposal: separate media files from their index",
    "text": "Architecture proposal from fictional database and storage plans: keep source text and small searchable metadata in the knowledge index while large files use explicitly configured object storage. The sketches motivate an implementation direction, not a claim that cloud integration or terabyte storage is already working.",
    "sourceKeys": [
      "database-sources",
      "database-media",
      "cloud-archive"
    ],
    "tags": [
      "memory",
      "media"
    ]
  },
  {
    "key": "research-review",
    "title": "Example proposal: keep research updates reviewable",
    "text": "Proposal from a fictional researcher profile and service blueprint: save the question, source date, and uncertainties before accepting an update. A visible queue could support this review. No automated browsing or completed research is evidenced by these design notes.",
    "sourceKeys": [
      "character-sol",
      "service-research",
      "document-review"
    ],
    "tags": [
      "research",
      "freshness"
    ]
  },
  {
    "key": "imagination-boundary",
    "title": "Example proposal: label the world before entering it",
    "text": "Proposal from two fictional portal briefs: identify whether a scenario is a realistic rehearsal or an impossible creative setting, and keep its output separate from factual evidence. These written briefs are navigation ideas and do not establish that simulations or literal astral travel occur.",
    "sourceKeys": [
      "portal-rehearsal",
      "portal-observatory"
    ],
    "tags": [
      "experiment",
      "imagination"
    ]
  },
  {
    "key": "recognizable-shapes",
    "title": "Example proposal: test shapes across graph styles",
    "text": "Proposal from fictional visual and experiment briefs: keep recognizable object silhouettes and stable labels when switching between an object gallery, skill-tree lanes, and a radial view. Test source-finding tasks before claiming that a particular graph style improves usability.",
    "sourceKeys": [
      "image-silhouettes",
      "experiment-navigation"
    ],
    "tags": [
      "design",
      "experiment"
    ]
  },
]);

// Explicit associations inside the fictional scenario. These are related links,
// never evidence that a folder, account, agent, service, or cloud is operational.
const relatedExamples = Object.freeze([
  ["folder-studio", "project"],
  ["folder-studio", "video"],
  ["folder-studio", "character-mira"],
  ["folder-library", "book"],
  ["folder-library", "research"],
  ["folder-library", "character-pip"],
  ["folder-dreams", "portal-rehearsal"],
  ["folder-dreams", "portal-observatory"],
  ["folder-dreams", "character-noor"],
  ["network-studio", "character-mira"],
  ["network-studio", "character-sol"],
  ["network-studio", "service-welcome"],
  ["network-studio", "service-research"],
  ["network-memory", "database-sources"],
  ["network-memory", "database-media"],
  ["network-memory", "cloud-archive"],
  ["network-memory", "network-studio"],
  ["character-mira", "audio"],
  ["character-sol", "research"],
  ["character-pip", "database-sources"],
  ["character-noor", "image"],
  ["character-noor", "image-silhouettes"],
  ["service-welcome", "audio"],
  ["service-research", "document-review"],
  ["cloud-archive", "database-media"],
  ["portal-rehearsal", "experiment"],
  ["portal-rehearsal", "project"],
  ["portal-observatory", "image-observatory"],
  ["portal-observatory", "book-gardens"],
  ["portal-observatory", "audio-garden"],
  ["book-gardens", "book"],
  ["video-handoff", "video"],
  ["video-handoff", "code-links"],
  ["code-links", "code"],
  ["image-silhouettes", "experiment-navigation"],
  ["experiment-navigation", "experiment"],
  ["database-sources", "research"],
  ["network-memory", "folder-library"],
  ["service-welcome", "portal-rehearsal"],
]);

// Bridge to the original demo only when its exact fictional source is present.
// Custom workspaces do not acquire links to unrelated records with similar tags.
const demoBridges = Object.freeze([
  ['service-welcome', 'Studio interview: approval friction', 'Fictional interview: Cedar Studio clients often delay artwork approval because feedback is scattered across email. A shared approval board could help clients respond to one clear request.'],
  ['experiment-navigation', 'Prototype test: one clear next step', 'Fictional prototype observation: five studio volunteers completed artwork approval faster when the approval board showed one clear request. This small informal sample does not establish a general result.'],
  ['network-memory', 'Research note: local-first memory', 'Fictional architecture note: keep original notes immutable, store interpretations separately, and connect every claim to its source. Local-first export supports portability and independent review.'],
  ['image-silhouettes', 'Design note: visible evidence', 'Fictional design note: a memory palace should expose source provenance and review state. An attractive graph is useful only when a reader can return to the original notes and inspect a claim.'],
  ['service-research', 'Freshness check: rendering libraries', 'Fictional research plan: rendering-library APIs and device performance change. Review official release notes before committing a production interface to a particular renderer.'],
  ['cloud-archive', 'Future media storage boundary', 'Fictional architecture note: video and audio should live in external object storage. Memory stores searchable transcripts, timestamps, content references, and access policies instead of large binary files.'],
]);

function marker(key) { return `${EXAMPLE_SET}:${key}`; }
function hasExample(record, example) {
  return record.title === example.title && record.tags?.includes(marker(example.key));
}

/**
 * Add 32 fictional sources and eight proposed interpretations in place.
 * Existing records and reviews are left intact. The marker + title make later
 * calls (including after export/import) idempotent, without fixed record IDs.
 * `added` counts new raw records plus claims; ID arrays include the full set.
 */
export function addExampleMemories(workspace) {
  const existingSources = new Map(sources.map(example => [example.key, workspace.raw.find(record => hasExample(record, example))]));
  const missingSources = sources.filter(example => !existingSources.get(example.key));
  const missingClaims = interpretations.filter(example => !workspace.claims.some(record => hasExample(record, example)));
  const relatedPairs = relatedExamples.map(([from, to]) => [existingSources.get(from)?.id, existingSources.get(to)?.id]);
  const presentBridges = demoBridges.map(([from, title, text]) => [from, workspace.raw.find(record => record.title === title && record.text === text)])
    .filter(([, record]) => record);
  relatedPairs.push(...presentBridges.map(([from, record]) => [existingSources.get(from)?.id, record.id]));
  const hasRelated = (from, to) => from && to && workspace.links.some(link => link.type === 'related'
    && ((link.fromId === from && link.toId === to) || (link.fromId === to && link.toId === from)));
  const missingLinks = relatedPairs.filter(([from, to]) => !hasRelated(from, to)).length;
  if (workspace.raw.length + missingSources.length > LIMITS.recordsPerCollection
    || workspace.claims.length + missingClaims.length > LIMITS.recordsPerCollection
    || workspace.links.length + missingLinks > LIMITS.recordsPerCollection) {
    throw new Error('There is not enough room for the example collection. Export your workspace before adding more records.');
  }
  const originalCount = workspace.raw.length + workspace.claims.length;
  for (const example of sources) {
    if (!existingSources.get(example.key)) {
      existingSources.set(example.key, ingest(workspace, {
        title: example.title, text: example.text,
        tags: [...example.tags, 'example', 'fictional', marker(example.key)],
      }));
    }
  }
  const claimIds = interpretations.map(example => {
    const existing = workspace.claims.find(record => hasExample(record, example));
    return (existing ?? addClaim(workspace, {
      title: example.title, text: example.text,
      rawIds: example.sourceKeys.map(key => existingSources.get(key).id),
      tags: [...example.tags, 'example', 'fictional', marker(example.key)],
    })).id;
  });
  const linkPairs = relatedExamples.map(([from, to]) => [existingSources.get(from).id, existingSources.get(to).id]);
  linkPairs.push(...presentBridges.map(([from, record]) => [existingSources.get(from).id, record.id]));
  for (const [fromId, toId] of linkPairs) {
    if (!hasRelated(fromId, toId)) addLink(workspace, {
      fromId, toId, type: 'related', label: 'Related in the fictional Cedar Studio example',
    });
  }
  return {
    added: workspace.raw.length + workspace.claims.length - originalCount,
    rawIds: sources.map(example => existingSources.get(example.key).id),
    claimIds,
  };
}

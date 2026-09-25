/** Fictional text examples for the visual explorer. No attachments or network calls. */
import { ingest, addClaim, LIMITS } from './core.mjs';

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
]);

function marker(key) { return `${EXAMPLE_SET}:${key}`; }
function hasExample(record, example) {
  return record.title === example.title && record.tags?.includes(marker(example.key));
}

/**
 * Add the eight example sources and two proposed interpretations in place.
 * Existing records and reviews are left intact. The marker + title make later
 * calls (including after export/import) idempotent, without fixed record IDs.
 * `added` counts new raw records plus claims; ID arrays include the full set.
 */
export function addExampleMemories(workspace) {
  const existingSources = new Map(sources.map(example => [example.key, workspace.raw.find(record => hasExample(record, example))]));
  const missingSources = sources.filter(example => !existingSources.get(example.key));
  const missingClaims = interpretations.filter(example => !workspace.claims.some(record => hasExample(record, example)));
  if (workspace.raw.length + missingSources.length > LIMITS.recordsPerCollection || workspace.claims.length + missingClaims.length > LIMITS.recordsPerCollection) {
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
  return {
    added: workspace.raw.length + workspace.claims.length - originalCount,
    rawIds: sources.map(example => existingSources.get(example.key).id),
    claimIds,
  };
}

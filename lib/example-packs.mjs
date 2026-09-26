/**
 * Isolated, fictional collections for exploring larger graphs.
 * Every call returns a new local workspace. Nothing is fetched, executed,
 * attached, or merged into the caller's saved memories.
 */
import { createWorkspace, createDemoWorkspace, ingest, addClaim, addLink } from './core.mjs';
import { addExampleMemories } from './examples.mjs';

export const EXAMPLE_PACKS = Object.freeze([
  { id: 'studio', title: 'Creative studio', description: 'People, projects, media notes, and a shared memory library.', count: 48, icon: '▱' },
  { id: 'research', title: 'Research observatory', description: 'Six connected research rooms: sources, freshness, search, evaluation, and media.', count: 96, icon: '⌕' },
  { id: 'dreamworld', title: 'Lucid world atlas', description: 'Nine imaginative districts with characters, portals, archives, and story plans.', count: 144, icon: '◎' },
].map(pack => Object.freeze(pack)));

const researchRooms = [
  {
    name: 'Memory foundations', guide: 'Ada, the archive architect',
    purpose: 'Preserve original words while letting interpretations evolve beside them.',
    question: 'Can a reader return from every interpretation to the exact original note?',
    method: 'Compare an intact source, a shortened summary, and a corrected interpretation; record which version each link opens.',
    detail: 'A source ID identifies the original; a claim ID identifies a separately reviewable interpretation.',
    scene: 'A clear archive tray holds untouched pages beside movable violet interpretation stones.',
    alternative: 'one shared text field versus separate original and interpretation records',
  },
  {
    name: 'Provenance trails', guide: 'Imani, the evidence cartographer',
    purpose: 'Make a record’s origin and the reason for each relationship easy to inspect.',
    question: 'Can a newcomer tell a citation from a merely related note?',
    method: 'Give each participant two linked notes and ask them to explain the link before opening the inspector.',
    detail: 'Keep author, capture time, source version, and relationship meaning beside the source trail.',
    scene: 'Brass paths connect labeled source pages; dotted paths mark associations rather than proof.',
    alternative: 'unlabeled graph lines versus explicit relationship labels',
  },
  {
    name: 'Freshness watch', guide: 'Theo, the change librarian',
    purpose: 'Show which knowledge needs another look without pretending it has already been refreshed.',
    question: 'Which kinds of notes need scheduled review, and which can remain stable?',
    method: 'Sort fictional release notes, historical decisions, and design preferences into different review intervals.',
    detail: 'Store a last-checked date, a next-review date, and the unanswered question separately.',
    scene: 'Small calendar flags sit beside source pages, with a clear waiting shelf for overdue reviews.',
    alternative: 'one expiry date for everything versus topic-specific review intervals',
  },
  {
    name: 'Retrieval workshop', guide: 'Jun, the search guide',
    purpose: 'Help people locate an original, a person, or a related idea using understandable routes.',
    question: 'When is a precise keyword more useful than following a relationship?',
    method: 'Try title search, tag filtering, and graph navigation on the same fictional retrieval tasks.',
    detail: 'A useful result shows its title, source type, matching words, and a route to nearby records.',
    scene: 'A magnifying glass reveals readable labels while colored paths preserve the surrounding context.',
    alternative: 'a flat result list versus a result with a visible neighborhood',
  },
  {
    name: 'Evaluation garden', guide: 'Leila, the experiment keeper',
    purpose: 'Measure whether a proposed improvement helps before promoting it into a default.',
    question: 'Does a new arrangement help visitors complete the same task with fewer mistakes?',
    method: 'Write a baseline, a candidate, a fixed task set, and a stop condition before collecting any results.',
    detail: 'Keep failed attempts, uncertainty, and contradictory observations beside successful attempts.',
    scene: 'Two small prototype gardens share identical task cards and empty observation trays.',
    alternative: 'choosing the prettier prototype versus comparing recorded task outcomes',
  },
  {
    name: 'Media horizon', guide: 'Rowan, the media steward',
    purpose: 'Prepare for rich media while keeping searchable notes and large files distinct.',
    question: 'Which small metadata should remain searchable when a recording is stored elsewhere?',
    method: 'Sketch a media index with transcript, timestamp, content reference, and access policy fields.',
    detail: 'The graph holds descriptions and content references; future binary storage needs its own permissions and export path.',
    scene: 'Compact transcript cards connect to a distant storage cloud through clearly labeled references.',
    alternative: 'embedding every recording in a memory record versus indexing external assets',
  },
];

const dreamDistricts = [
  {
    name: 'Sunrise harbor', guide: 'Marin, the lantern navigator',
    purpose: 'Introduce a welcoming seaside arrival before the atlas becomes more fantastic.',
    question: 'How can a visitor find the first destination without learning the whole map?',
    method: 'Rehearse a written arrival with one landmark, one guide, and one clear next choice.',
    detail: 'The harbor follows ordinary gravity; ferries lead to the other imagined districts.',
    scene: 'Peach dawn, pale stone piers, brass direction signs, and a single bright blue welcome boat.',
    alternative: 'a realistic harbor arrival versus a ferry that sails through the sky',
  },
  {
    name: 'Glass orchard', guide: 'Ori, the prism gardener',
    purpose: 'Explore how the same idea can appear in several contexts without becoming several originals.',
    question: 'What changes when a glass fruit reflects a different neighboring branch?',
    method: 'Write three viewpoints of one remembered object and keep its underlying source unchanged.',
    detail: 'Each transparent tree holds reflections of one source; reflections are interpretations, never new evidence.',
    scene: 'Translucent mint trees carry amber fruit above a soft white path.',
    alternative: 'a botanical garden with labeled specimens versus an orchard of reflected memories',
  },
  {
    name: 'Floating library', guide: 'Saffron, the airborne archivist',
    purpose: 'Give a vast imagined archive a few recognizable shelves and navigable source trails.',
    question: 'Which sign helps a reader return to the page they started from?',
    method: 'Plan a route across three floating shelves and mark the return path at every crossing.',
    detail: 'Books can float in this invented district, but each reading note still has one stable title.',
    scene: 'Cream book islands float among lavender clouds with thin golden bridges.',
    alternative: 'a quiet city library versus shelves that move between islands',
  },
  {
    name: 'Quiet observatory', guide: 'Vega, the question astronomer',
    purpose: 'Turn unexplored questions into visible destinations without answering them prematurely.',
    question: 'Can an unanswered question be inviting while still visibly uncertain?',
    method: 'Write a question, three possible explanations, and one observation that could distinguish them.',
    detail: 'Stars stand for open questions, and their brightness is decoration rather than a confidence score.',
    scene: 'A daylight glass dome frames pearl planets, ink-blue instruments, and blank observation cards.',
    alternative: 'a grounded observation notebook versus a telescope that displays possible worlds',
  },
  {
    name: 'Clockwork city', guide: 'Tavi, the handoff mechanic',
    purpose: 'Rehearse how work passes between roles while preserving the reason for each step.',
    question: 'Where does a fictional request become unclear as it passes through the city?',
    method: 'Storyboard a request moving from welcome desk to workshop to review, stopping at each handoff.',
    detail: 'Clock towers represent planned steps; no tower schedules or executes a real task.',
    scene: 'Small ivory workshops, teal tram lines, and copper clocks with generously readable signs.',
    alternative: 'a conventional project handoff versus messages carried by tiny clockwork birds',
  },
  {
    name: 'Coral archive', guide: 'Neri, the tide librarian',
    purpose: 'Imagine layered histories without allowing the newest version to erase older notes.',
    question: 'How should a visitor compare what was recorded before and after a change?',
    method: 'Write two fictional versions of a shoreline plan and list the differences beside the originals.',
    detail: 'Coral rings symbolize source versions; their stories are authored worldbuilding notes.',
    scene: 'Sunlit shallow water surrounds coral-pink shelves and clear glass document bubbles.',
    alternative: 'an ordinary coastal archive versus a library that rises with the tide',
  },
  {
    name: 'Paper mountains', guide: 'Kito, the fold cartographer',
    purpose: 'Explore simple reusable building blocks that can compose larger knowledge structures.',
    question: 'Can a visitor understand a mountain by opening its smallest useful fold?',
    method: 'Design one atomic note, one linked group, and one overview built from those same notes.',
    detail: 'Folded terrain represents composition; unfolding changes the view without copying the original text.',
    scene: 'White paper ridges reveal cobalt edges, moss-green pathways, and tiny map pins.',
    alternative: 'a layered hiking map versus mountains that unfold into individual notes',
  },
  {
    name: 'Aurora market', guide: 'Asha, the possibility broker',
    purpose: 'Compare alternative proposals while keeping preferences separate from observed outcomes.',
    question: 'What does each imagined stall offer, assume, and leave unresolved?',
    method: 'Write three alternative welcome experiences and compare their constraints before choosing one to test.',
    detail: 'Market tokens represent preferences inside the story; they are not money or measured value.',
    scene: 'Pastel canopies sit beneath a daylight aurora, each displaying a clear option card.',
    alternative: 'a practical neighborhood market versus stalls selling unfinished possibilities',
  },
  {
    name: 'Cloud theater', guide: 'Eli, the rehearsal director',
    purpose: 'Keep realistic rehearsals and impossible stories recognizable as separate creative modes.',
    question: 'Which assumption turns a practical rehearsal into a fantastic scene?',
    method: 'Write two versions of the same visitor conversation, changing only one explicit world rule.',
    detail: 'The stage contains written scene plans; no live simulation, prediction, or dream recording is running.',
    scene: 'A warm white amphitheater floats on pale blue clouds with two labeled rehearsal stages.',
    alternative: 'a realistic customer conversation versus a conversation with a speaking constellation',
  },
];

function branchSources(room, index, packId) {
  const briefType = ['document', 'book', 'chat'][index % 3];
  const briefNames = { document: 'purpose note', book: 'field guide notes', chat: 'guide conversation' };
  const boundary = packId === 'dreamworld'
    ? 'These are authored fictional worldbuilding notes, not simulation output or evidence of real events.'
    : 'This is a fictional research planning collection. No source has been fetched and no test has been run.';
  const rows = [
    ['folder', 'room index', `Purpose: ${room.purpose}\n\nThis collection links a guide, a route map, source notes, and two proposed interpretations.`],
    ['network', 'connection map', `The room index connects to each saved note. The guide, research brief, and test plan are related in this fictional collection.\n\nQuestion: ${room.question}`],
    ['character', room.guide, `Role: ${room.purpose}\n\nCarries: the room index and its unanswered question.\nHabit: distinguish an original note from an interpretation.\n\nThis invented character is a saved profile, not a person, account, or running agent.`],
    [briefType, briefNames[briefType], `The central question is: ${room.question}\n\nDesign rule: ${room.detail}\n\nKeep the question, proposed approach, and uncertainties together.`],
    ['research', 'open question', `${room.question}\n\nSuggested investigation: ${room.method}\n\nBefore drawing a conclusion, record the source, its date, and what could contradict the proposal.`],
    ['experiment', 'comparison plan', `Compare ${room.alternative}.\n\nMethod: ${room.method}\n\nRecord assumptions and observations separately. There are no measured results in this plan.`],
    ['database', 'catalogue schema', `A written schema for this room:\n\nrecord_id | title | original_text | source_reference | review_state\n\n${room.detail}\n\nNo database connection is configured.`],
    ['service', 'guide desk blueprint', `Proposed input: a visitor asks “${room.question}”\nProposed output: the relevant original note and a visible next question.\n\nA person would review the suggestion before acting. This is a text blueprint, not an executing service.`],
    ['cloud', 'archive storage plan', `Keep this room’s text searchable and exportable. Future large assets would need separate content references, access rules, and recovery procedures.\n\nNo remote storage or media file is attached.`],
    ['portal', 'rehearsal entrance', `Choose between ${room.alternative}.\n\nStarting rule: ${room.detail}\n\nThis is a navigation and writing brief. Opening the object reads this note; it does not run a simulation.`],
    ['code', 'record lookup sketch', `Illustrative saved pseudocode:\n\nfind note by stable ID\nshow original text\nshow related record titles\nkeep proposed interpretations labeled\n\nUse case: ${room.question}\n\nThe sketch is text and is not executed.`],
    ['image', 'visual direction', `${room.scene}\n\nComposition: give the main object a distinct silhouette, leave space around its label, and keep the source trail legible.\n\nStored here: a written visual brief. No image is attached.`],
    ['video', 'three-shot storyboard', `1. Establish the room: ${room.scene}\n2. Meet ${room.guide}.\n3. Open the original note and reveal its connected interpretation.\n\nThis is a written storyboard; no video or playback is attached.`],
    ['audio', 'welcome script', `Guide: “Welcome to ${room.name}. ${room.purpose}”\nVisitor: “${room.question}”\nGuide: “Let’s read the original plan and keep its unanswered questions visible.”\n\nThis is a scripted text transcript, not a recorded conversation or playable audio.`],
  ];
  return rows.map(([type, label, text]) => ({
    title: `${room.name} — ${label}`,
    text: `FICTIONAL ${packId === 'dreamworld' ? 'WORLD ATLAS' : 'RESEARCH OBSERVATORY'} · ${type.toUpperCase()} NOTES\n${boundary}\n\n${text}`,
    tags: [`format:${type}`, 'example', 'fictional', packId, `room:${index + 1}`, packId === 'dreamworld' ? 'imagination' : 'research'],
  }));
}

function createBranchWorkspace(packId, rooms) {
  const workspace = createWorkspace();
  const branches = rooms.map((room, index) => {
    const records = branchSources(room, index, packId).map(input => ingest(workspace, input));
    const [folder, network, character, brief, research, experiment, catalogue, service, , portal, , image] = records;
    for (const record of records.slice(1)) addLink(workspace, {
      fromId: record.id, toId: folder.id, type: 'part-of', label: `Member of the fictional ${room.name} collection`,
    });
    for (const [from, to] of [[network, character], [network, service], [character, research], [research, experiment], [catalogue, brief], [portal, experiment]]) addLink(workspace, {
      fromId: from.id, toId: to.id, type: 'related', label: `Recorded association in the fictional ${room.name} plan`,
    });
    addClaim(workspace, {
      title: `${room.name} — keep the question beside the plan`,
      text: `Proposed interpretation of these fictional notes: the question “${room.question}” should remain visible beside the planned comparison. This is a design suggestion, not an established result.`,
      rawIds: [research.id, experiment.id], tags: ['example', 'fictional', packId, 'review-needed'],
    });
    addClaim(workspace, {
      title: `${room.name} — make the source trail visible`,
      text: `Proposed interpretation of the written catalogue and visual brief: use recognizable objects with readable labels and a direct route to original text. The described scene suggests a presentation direction; it does not establish that this design improves comprehension.`,
      rawIds: [catalogue.id, image.id], tags: ['example', 'fictional', packId, 'design'],
    });
    return { folder, network };
  });
  for (let index = 1; index < branches.length; index++) {
    addLink(workspace, {
      fromId: branches[0].network.id, toId: branches[index].folder.id, type: 'related',
      label: `Recorded route between fictional ${packId === 'dreamworld' ? 'atlas districts' : 'research rooms'}`,
    });
    addLink(workspace, {
      fromId: branches[index - 1].network.id, toId: branches[index].network.id, type: 'related',
      label: 'Adjacent collections in this fictional example atlas',
    });
  }
  return workspace;
}

export function createExampleWorkspace(id) {
  if (!EXAMPLE_PACKS.some(pack => pack.id === id)) throw new Error(`Unknown example collection: ${String(id)}`);
  if (id === 'studio') {
    const workspace = createDemoWorkspace();
    addExampleMemories(workspace);
    return workspace;
  }
  return createBranchWorkspace(id, id === 'research' ? researchRooms : dreamDistricts);
}

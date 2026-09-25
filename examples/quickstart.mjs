import {
  createDemoWorkspace, ingest, search, dream, review, createScenario,
  getResearchQueue, backlinks, exportWorkspace,
} from '../lib/core.mjs';

// Every source below is a fictional demo note. No accounts or API keys needed.
const workspace = createDemoWorkspace();
const source = ingest(workspace, {
  title: 'Pilot question',
  text: 'Could a studio approval board improve feedback quality as well as turnaround time?',
  tags: ['studio', 'approval', 'experiment'],
});
console.log('\n1. Find originals and processed interpretations:');
console.table(search(workspace, 'approval', { types: ['raw', 'claim'] }).map(({ type, title, score }) => ({ type, title, score })));

console.log('\n2. Dream: source-backed connection proposals, using local lexical overlap:');
const proposals = dream(workspace, { limit: 3 });
console.table(proposals.map(({ title, status, signals }) => ({ title, status, basis: signals.sharedTags.join(', ') })));

if (proposals.length) {
  review(workspace, proposals[0].id, 'accept', { note: 'Worth testing; not established as fact.' });
  console.log('\n3. Accepted connection status:', workspace.claims.at(-1).status);
}

console.log('\n4. Create an isolated thought experiment (a worksheet, not a model result):');
const scenario = createScenario(workspace, { prompt: 'Could the studio approval board cut feedback time in half?', mode: 'grounded' });
console.log(scenario.output);

console.log('\n5. Due research tasks (no background web browsing):');
console.table(getResearchQueue(workspace).map(({ title, isDue }) => ({ title, isDue })));
console.log('\n6. This original has', backlinks(workspace, source.id).dreams.length, 'dream backlinks.');
console.log('Portable JSON snapshot size:', new TextEncoder().encode(exportWorkspace(workspace)).length, 'bytes.');

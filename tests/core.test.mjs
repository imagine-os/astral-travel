import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  createWorkspace, createDemoWorkspace, ingest, addClaim, verifyClaim, addLink,
  search, dream, review, createScenario, backlinks, scheduleResearch,
  getResearchQueue, completeResearch, exportWorkspace, importWorkspace, validateWorkspace,
} from '../lib/core.mjs';
import { loadWorkspace, saveWorkspace, updateWorkspace, withWorkspaceLock } from '../bin/astral.mjs';

function sourcePair() {
  const workspace = createWorkspace();
  const a = ingest(workspace, { title: 'Approval interview', text: 'Studio clients need one clear artwork approval request.', tags: ['approval', 'studio'] });
  const b = ingest(workspace, { title: 'Approval prototype', text: 'Studio volunteers tested one clear artwork approval request.', tags: ['approval', 'experiment'] });
  return { workspace, a, b };
}

test('raw text and original tags remain immutable through duplicate ingestion and round-trip', () => {
  const workspace = createWorkspace();
  const text = '  Exact original text.\n\n';
  const record = ingest(workspace, { title: 'Original', text, tags: ['Evidence'] });
  const duplicate = ingest(workspace, { title: 'Original', text, tags: ['Replacement'] });
  assert.equal(duplicate, record);
  assert.equal(workspace.raw.length, 1);
  assert.equal(record.text, text);
  assert.deepEqual(record.tags, ['evidence']);
  assert.throws(() => { record.text = 'Changed'; }, TypeError);
  assert.throws(() => record.tags.push('changed'), TypeError);
  const restored = importWorkspace(exportWorkspace(workspace));
  assert.equal(restored.raw[0].text, text);
  assert.ok(Object.isFrozen(restored.raw[0]));
});

test('claims require original evidence and explicit named review', () => {
  const { workspace, a } = sourcePair();
  assert.throws(() => addClaim(workspace, { title: 'Unsupported', text: 'A claim', rawIds: [] }), /original raw source/);
  assert.throws(() => addClaim(workspace, { title: 'Invented', text: 'A claim', rawIds: ['raw_missing'] }), /existing original/);
  assert.throws(() => addClaim(workspace, { title: 'Trust me', text: 'A claim', rawIds: [a.id], status: 'verified' }), /start as proposed/);
  const claim = addClaim(workspace, { title: 'Hypothesis', text: 'Needs a larger test.', rawIds: [a.id] });
  assert.equal(claim.status, 'proposed');
  assert.throws(() => verifyClaim(workspace, claim.id), /reviewer/);
  verifyClaim(workspace, claim.id, { reviewer: 'Local reviewer', note: 'Read the original; reviewed its limited scope.' });
  assert.equal(claim.status, 'verified');
  assert.equal(claim.review.reviewer, 'Local reviewer');
  assert.equal(backlinks(workspace, a.id).claims[0].id, claim.id);
});

test('dreaming proposes explainable connections without changing claims or raw originals', () => {
  const { workspace, a, b } = sourcePair();
  const rawBefore = JSON.stringify(workspace.raw);
  const proposals = dream(workspace);
  assert.equal(proposals.length, 1);
  assert.deepEqual(proposals[0].rawIds, [a.id, b.id]);
  assert.deepEqual(proposals[0].signals.sharedTags, ['approval']);
  assert.match(proposals[0].text, /hypothesis/);
  assert.equal(proposals[0].method, 'keyword-tag-overlap-v1');
  assert.equal(workspace.claims.length, 0);
  assert.equal(JSON.stringify(workspace.raw), rawBefore);
  assert.equal(dream(workspace).length, 0, 'Repeated dreaming must not spam a reviewed or pending source pair.');
});

test('acceptance retains inferred status and backlinks to both sources', () => {
  const { workspace, a, b } = sourcePair();
  const [proposal] = dream(workspace);
  review(workspace, proposal.id, 'accept');
  assert.equal(proposal.status, 'accepted');
  const claim = workspace.claims.find(item => item.id === proposal.claimId);
  assert.equal(claim.status, 'inferred');
  assert.deepEqual(claim.rawIds, [a.id, b.id]);
  assert.equal(workspace.links.filter(link => link.fromId === claim.id && link.type === 'derived-from').length, 2);
  assert.throws(() => review(workspace, proposal.id, 'accept'), /already been reviewed/);
  assert.equal(validateWorkspace(exportWorkspace(workspace)).claims[0].status, 'inferred');
});

test('rejection creates no factual memory and does not reappear on next dream', () => {
  const { workspace } = sourcePair();
  const [proposal] = dream(workspace);
  review(workspace, proposal.id, 'reject', { note: 'Shared vocabulary is not enough.' });
  assert.equal(workspace.claims.length, 0);
  assert.equal(workspace.links.length, 0);
  assert.equal(proposal.status, 'rejected');
  assert.equal(dream(workspace).length, 0);
});

test('scenario content remains isolated, labeled, and ineligible as claim/link evidence', () => {
  const { workspace, a } = sourcePair();
  const originals = JSON.stringify(workspace.raw);
  const scenario = createScenario(workspace, { prompt: 'What if the approval studio became a floating city?', mode: 'speculative' });
  assert.equal(scenario.status, 'simulation');
  assert.match(scenario.output, /intentionally fictional/);
  assert.match(scenario.output, /not a prediction or model result/);
  assert.equal(JSON.stringify(workspace.raw), originals);
  assert.equal(workspace.claims.length, 0);
  assert.throws(() => addClaim(workspace, { title: 'City is real', text: 'Unsupported', rawIds: [scenario.id] }), /Simulations cannot be evidence/);
  assert.throws(() => addLink(workspace, { fromId: scenario.id, toId: a.id, type: 'supports' }), /isolated/);
  assert.equal(search(workspace, 'floating city', { types: ['raw', 'claim'] }).length, 0);
  const result = search(workspace, 'floating city');
  assert.equal(result[0].type, 'scenario');
  assert.equal(result[0].record.status, 'simulation');
});

test('grounded scenario without context makes its missing evidence explicit', () => {
  const workspace = createWorkspace();
  const scenario = createScenario(workspace, { prompt: 'Could this work?' });
  assert.deepEqual(scenario.contextRawIds, []);
  assert.match(scenario.output, /No relevant original source was found/);
});

test('search is repeatable, source-type filterable, and handles unicode', () => {
  const workspace = createWorkspace();
  ingest(workspace, { title: 'Memoria café', text: 'Observación de diseño y memoria.', tags: ['diseño'] });
  ingest(workspace, { title: 'Unrelated', text: 'Local storage only.' });
  assert.equal(search(workspace, 'memoria')[0].title, 'Memoria café');
  assert.equal(search(workspace, 'diseño')[0].type, 'raw');
  assert.deepEqual(search(workspace, 'memoria'), search(workspace, 'memoria'));
  assert.deepEqual(search(workspace, 'the and of'), []);
  assert.throws(() => search(workspace, 'a', { limit: -1 }), /limit/);
});

test('freshness queue respects due dates and supports completion/rescheduling', () => {
  const workspace = createWorkspace();
  const task = scheduleResearch(workspace, { title: 'Check official releases', query: 'Check releases', dueAt: '2026-09-20T00:00:00Z' });
  scheduleResearch(workspace, { title: 'Later', query: 'Future check', dueAt: '2026-10-01T00:00:00Z' });
  let queue = getResearchQueue(workspace, { now: '2026-09-25T00:00:00Z' });
  assert.equal(queue[0].id, task.id);
  assert.equal(queue[0].isDue, true);
  assert.equal(queue[1].isDue, false);
  completeResearch(workspace, task.id, { note: 'Checked locally', nextDueAt: '2026-10-05T00:00:00Z' });
  queue = getResearchQueue(workspace, { now: '2026-09-25T00:00:00Z' });
  assert.equal(queue.find(item => item.id === task.id).isDue, false);
  completeResearch(workspace, task.id);
  assert.equal(getResearchQueue(workspace).some(item => item.id === task.id), false);
  assert.equal(getResearchQueue(workspace, { includeCompleted: true }).length, 2);
});

test('external import cannot inherit verified status, while trusted local load preserves review', () => {
  const { workspace, a } = sourcePair();
  const claim = addClaim(workspace, { title: 'Reviewed', text: 'Limited observation.', rawIds: [a.id] });
  verifyClaim(workspace, claim.id, { reviewer: 'Alice' });
  const exported = exportWorkspace(workspace);
  assert.equal(validateWorkspace(exported).claims[0].status, 'verified');
  const imported = importWorkspace(exported);
  assert.equal(imported.claims[0].status, 'proposed');
  assert.equal(imported.claims[0].review, undefined);
  assert.match(imported.claims[0].importNote, /review/i);
  assert.equal(workspace.claims[0].status, 'verified', 'Import must not mutate the original workspace.');
});

test('invalid schemas, duplicate IDs, dangling provenance, bad URLs, and simulation promotion are rejected', () => {
  const { workspace, a } = sourcePair();
  const claim = addClaim(workspace, { title: 'Claim', text: 'Text', rawIds: [a.id] });
  createScenario(workspace, { prompt: 'What if approval was instant?' });
  const snapshot = () => JSON.parse(exportWorkspace(workspace));
  let data = snapshot(); data.schemaVersion = '9000';
  assert.throws(() => importWorkspace(data), /Unsupported schema/);
  data = snapshot(); data.claims[0].id = a.id;
  assert.throws(() => importWorkspace(data), /unique/);
  data = snapshot(); data.claims[0].rawIds = ['missing'];
  assert.throws(() => importWorkspace(data), /existing original/);
  data = snapshot(); data.claims[0].rawIds = [data.scenarios[0].id];
  assert.throws(() => importWorkspace(data), /Simulations cannot be evidence/);
  data = snapshot(); data.raw[0].sourceUrl = 'javascript:alert(1)';
  assert.throws(() => importWorkspace(data), /HTTP/);
  data = snapshot(); data.scenarios[0].status = 'verified';
  assert.throws(() => importWorkspace(data), /scenario status/);
  data = snapshot(); data.claims[0].status = 'verified';
  assert.throws(() => importWorkspace(data), /human review/);
  assert.throws(() => importWorkspace('{no'), /valid JSON/);
  assert.throws(() => importWorkspace(null), /object/);
  assert.equal(claim.status, 'proposed');
});

test('demo is self-contained and survives dreaming, review, simulation, and JSON export', () => {
  const workspace = createDemoWorkspace();
  const proposals = dream(workspace);
  assert.ok(proposals.length >= 2);
  review(workspace, proposals[0].id, 'accept');
  review(workspace, proposals[1].id, 'reject');
  createScenario(workspace, { prompt: 'Could our studio test approval changes?', mode: 'grounded' });
  const restored = importWorkspace(exportWorkspace(workspace));
  assert.equal(restored.raw.length, 6);
  assert.equal(restored.scenarios.length, 1);
  assert.equal(restored.claims.at(-1).status, 'inferred');
});

test('file transactions reject concurrent writers and leave original data intact on failure', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'astral-core-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, 'workspace.json');
  await saveWorkspace(file, createDemoWorkspace());
  const original = await readFile(file, 'utf8');
  await withWorkspaceLock(file, async () => {
    await assert.rejects(updateWorkspace(file, workspace => ingest(workspace, { title: 'Concurrent', text: 'Must not be written.' })), /locked/);
  });
  await assert.rejects(updateWorkspace(file, workspace => { ingest(workspace, { title: 'Rolled back', text: 'Must not persist.' }); throw new Error('Stop'); }), /Stop/);
  assert.equal(await readFile(file, 'utf8'), original);
  await updateWorkspace(file, workspace => ingest(workspace, { title: 'Successful', text: 'This mutation commits.' }));
  assert.equal((await loadWorkspace(file)).raw.length, 7);
});

test('CLI completes a real on-disk flow and rejects accidental replacement', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'astral-cli-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, 'workspace.json');
  const cli = new URL('../bin/astral.mjs', import.meta.url).pathname;
  const run = (...args) => JSON.parse(execFileSync(process.execPath, [cli, ...args, '--workspace', file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  assert.equal(run('init', '--demo').rawRecords, 6);
  run('add', '--title', 'CLI note', '--text', 'Approval detail from a local CLI.', '--tags', 'approval');
  assert.ok(run('search', 'CLI note').length);
  const proposals = run('dream');
  assert.equal(run('review', proposals[0].id, '--accept').status, 'accepted');
  assert.equal(run('simulate', '--prompt', 'What if approvals were instant?', '--mode', 'speculative').status, 'simulation');
  const snapshot = join(directory, 'snapshot.json');
  run('export', '--out', snapshot);
  assert.throws(() => run('import', snapshot), error => error.stderr.includes('--replace'));
  assert.equal(run('import', snapshot, '--replace').rawRecords, 7);
  await writeFile(join(directory, 'bad.json'), '{oops');
  assert.throws(() => run('import', join(directory, 'bad.json'), '--replace'));
  assert.equal((await loadWorkspace(file)).raw.length, 7);
});

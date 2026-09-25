import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspace, createDemoWorkspace, exportWorkspace, importWorkspace, verifyClaim } from '../lib/core.mjs';
import { addExampleMemories } from '../lib/examples.mjs';
import { describeMemory } from '../web/memory-model.mjs';

test('examples add diverse fictional text sources without rewriting existing records', () => {
  const workspace = createDemoWorkspace();
  const before = Object.fromEntries(['raw', 'claims', 'links', 'dreams', 'scenarios', 'research', 'events'].map(key => [key, workspace[key].map(record => JSON.stringify(record))]));
  const first = workspace.raw[0];
  const result = addExampleMemories(workspace);
  assert.equal(result.added, 10);
  assert.equal(result.rawIds.length, 8);
  assert.equal(result.claimIds.length, 2);
  assert.equal(workspace.raw[0], first, 'do not replace the caller’s workspace or source records');
  for (const [collection, records] of Object.entries(before)) {
    assert.deepEqual(workspace[collection].slice(0, records.length).map(record => JSON.stringify(record)), records);
  }
  const addedSources = workspace.raw.filter(record => result.rawIds.includes(record.id));
  assert.deepEqual(addedSources.map(record => describeMemory(record, 'raw').objectType), ['book', 'video', 'audio', 'image', 'code', 'research', 'document', 'experiment']);
  for (const source of addedSources) {
    assert.match(source.text, /FICTIONAL/u);
    assert.ok(source.tags.includes('fictional'));
    assert.equal(source.sourceUrl, '', 'examples must not invent a fetched source URL');
    assert.ok(Object.isFrozen(source));
  }
  for (const claim of workspace.claims.filter(record => result.claimIds.includes(record.id))) {
    assert.equal(claim.status, 'proposed');
    assert.ok(claim.rawIds.length >= 2);
    assert.ok(claim.rawIds.every(id => result.rawIds.includes(id)));
  }
  assert.doesNotThrow(() => exportWorkspace(workspace), 'all new references must be valid');
});

test('adding examples repeatedly and after export/import is idempotent', () => {
  const workspace = createWorkspace([{ title: 'My original', text: '  Preserve these bytes.\n', tags: ['private'] }]);
  const first = addExampleMemories(workspace);
  const before = JSON.stringify(workspace);
  const second = addExampleMemories(workspace);
  assert.deepEqual(second, { ...first, added: 0 });
  assert.equal(JSON.stringify(workspace), before, 'even the activity log is unchanged on a repeated call');
  const restored = importWorkspace(exportWorkspace(workspace));
  const importedBefore = JSON.stringify(restored);
  assert.deepEqual(addExampleMemories(restored), { ...first, added: 0 });
  assert.equal(JSON.stringify(restored), importedBefore);
});

test('adding examples again preserves any later review of an example interpretation', () => {
  const workspace = createWorkspace();
  const first = addExampleMemories(workspace);
  verifyClaim(workspace, first.claimIds[0], { reviewer: 'Local demo reviewer', note: 'Reviewed the fictional design proposal.' });
  const before = JSON.stringify(workspace.claims);
  assert.equal(addExampleMemories(workspace).added, 0);
  assert.equal(JSON.stringify(workspace.claims), before);
});

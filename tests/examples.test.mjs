import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createWorkspace, createDemoWorkspace, exportWorkspace, importWorkspace, verifyClaim, LIMITS } from '../lib/core.mjs';
import { addExampleMemories } from '../lib/examples.mjs';
import { describeMemory, memoryEdges, OBJECT_TYPES } from '../web/memory-model.mjs';

test('examples add diverse fictional text sources without rewriting existing records', () => {
  const workspace = createDemoWorkspace();
  const before = Object.fromEntries(['raw', 'claims', 'links', 'dreams', 'scenarios', 'research', 'events'].map(key => [key, workspace[key].map(record => JSON.stringify(record))]));
  const first = workspace.raw[0];
  const result = addExampleMemories(workspace);
  assert.equal(result.added, 40);
  assert.equal(result.rawIds.length, 32);
  assert.equal(result.claimIds.length, 8);
  assert.equal(workspace.raw[0], first, 'do not replace the caller’s workspace or source records');
  for (const [collection, records] of Object.entries(before)) {
    assert.deepEqual(workspace[collection].slice(0, records.length).map(record => JSON.stringify(record)), records);
  }
  const addedSources = workspace.raw.filter(record => result.rawIds.includes(record.id));
  assert.deepEqual(addedSources.slice(0, 8).map(record => describeMemory(record, 'raw').objectType), ['book', 'video', 'audio', 'image', 'code', 'research', 'document', 'experiment']);
  const shapes = new Set(addedSources.map(record => describeMemory(record, 'raw').objectType));
  assert.deepEqual([...shapes].sort(), OBJECT_TYPES.filter(type => !['claim', 'chat'].includes(type.id)).map(type => type.id).sort());
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


test('upgrading the original ten examples adds thirty records and preserves original content and IDs', () => {
  const workspace = createWorkspace();
  addExampleMemories(workspace);
  workspace.raw = workspace.raw.slice(0, 8);
  workspace.claims = workspace.claims.slice(0, 2);
  workspace.links = [];
  workspace.events = [];
  const originals = [...workspace.raw, ...workspace.claims];
  const saved = originals.map(({ title, text, tags }) => ({ title, text, tags }));
  assert.equal(createHash('sha256').update(JSON.stringify(saved)).digest('hex'), 'd96671c598020f579b93e32af94279101b93258fb4e731933c76aa94d22bc53e', 'v0.4 example content and markers remain byte-for-byte stable');
  const originalRecords = JSON.stringify(originals);
  const result = addExampleMemories(workspace);
  assert.equal(result.added, 30);
  assert.equal(JSON.stringify([...workspace.raw.slice(0, 8), ...workspace.claims.slice(0, 2)]), originalRecords);
  assert.ok(originals.every(record => workspace.raw.includes(record) || workspace.claims.includes(record)));
  assert.equal(addExampleMemories(workspace).added, 0);
});

test('the fresh demo has forty-eight connected records with explicit fictional relations', () => {
  const workspace = createDemoWorkspace();
  addExampleMemories(workspace);
  const records = [...workspace.raw, ...workspace.claims];
  assert.equal(records.length, 48);
  assert.equal(new Set(records.map(record => describeMemory(record, workspace.raw.includes(record) ? 'raw' : 'claim').objectType)).size, 17);
  const edges = memoryEdges(records, workspace.links);
  assert.equal(edges.length, 68);
  assert.equal(edges.filter(edge => edge.type === 'related').length, 45);
  const reached = new Set([records[0].id]);
  for (let previousSize = -1; previousSize !== reached.size;) {
    previousSize = reached.size;
    for (const edge of edges) {
      if (reached.has(edge.from)) reached.add(edge.to);
      if (reached.has(edge.to)) reached.add(edge.from);
    }
  }
  assert.equal(reached.size, 48, 'no isolated example islands');
  for (const link of workspace.links.filter(link => link.type === 'related')) {
    assert.match(link.label, /fictional/u);
  }
  const emptyWorkspace = createWorkspace();
  addExampleMemories(emptyWorkspace);
  assert.equal(emptyWorkspace.links.length, 39, 'core-demo bridges are not invented in custom workspaces');
});

test('example capacity is checked before adding records or links', () => {
  const workspace = createWorkspace([{ title: 'Existing note', text: 'Keep this source unchanged.' }]);
  workspace.links = Array.from({ length: LIMITS.recordsPerCollection }, (_, index) => ({ id: `existing-${index}` }));
  const before = JSON.stringify(workspace);
  assert.throws(() => addExampleMemories(workspace), /not enough room/u);
  assert.equal(JSON.stringify(workspace), before, 'a capacity error must not partially add the collection');
});

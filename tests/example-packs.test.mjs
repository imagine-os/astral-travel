import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoWorkspace, exportWorkspace } from '../lib/core.mjs';
import { EXAMPLE_PACKS, createExampleWorkspace } from '../lib/example-packs.mjs';
import { OBJECT_TYPES, describeMemory, memoryEdges } from '../web/memory-model.mjs';

function content(workspace) {
  const titleById = new Map([...workspace.raw, ...workspace.claims].map(record => [record.id, record.title]));
  return {
    raw: workspace.raw.map(({ title, text, tags }) => ({ title, text, tags })),
    claims: workspace.claims.map(({ title, text, tags, status, rawIds }) => ({ title, text, tags, status, sources: rawIds.map(id => titleById.get(id)) })),
    links: workspace.links.map(({ fromId, toId, type, label }) => ({ from: titleById.get(fromId), to: titleById.get(toId), type, label })),
  };
}

test('example catalogue has immutable, correctly counted isolated collections', () => {
  assert.ok(Object.isFrozen(EXAMPLE_PACKS));
  assert.deepEqual(EXAMPLE_PACKS.map(({ id, count }) => [id, count]), [['studio', 48], ['research', 96], ['dreamworld', 144]]);
  const demo = createDemoWorkspace();
  const before = JSON.stringify(demo);
  for (const pack of EXAMPLE_PACKS) {
    assert.ok(Object.isFrozen(pack));
    const workspace = createExampleWorkspace(pack.id);
    assert.equal(workspace.raw.length + workspace.claims.length, pack.count);
    assert.doesNotThrow(() => exportWorkspace(workspace));
  }
  assert.equal(JSON.stringify(demo), before, 'constructing examples does not change an existing workspace');
  assert.equal(demo.raw.length + demo.claims.length, 8, 'the original small core fixture stays unchanged');
  assert.throws(() => createExampleWorkspace('not-a-pack'), /Unknown example collection/u);
  assert.throws(() => createExampleWorkspace(), /Unknown example collection/u);
});

for (const pack of EXAMPLE_PACKS) {
  test(`${pack.id} includes every object form and one connected graph with source-backed proposals`, () => {
    const workspace = createExampleWorkspace(pack.id);
    const records = [...workspace.raw, ...workspace.claims];
    assert.equal(new Set(records.map(record => record.id)).size, pack.count);
    assert.equal(new Set(records.map(record => record.title)).size, pack.count, 'every object has a distinct readable title');
    const rawIds = new Set(workspace.raw.map(record => record.id));
    const shapes = new Set(records.map(record => describeMemory(record, rawIds.has(record.id) ? 'raw' : 'claim').objectType));
    assert.deepEqual([...shapes].sort(), OBJECT_TYPES.map(type => type.id).sort());
    for (const record of workspace.raw) {
      assert.ok(Object.isFrozen(record));
      assert.ok(Object.isFrozen(record.tags));
      assert.match(record.text, /fictional/iu);
      assert.equal(record.sourceUrl, '');
    }
    for (const claim of workspace.claims) {
      assert.equal(claim.status, 'proposed');
      assert.ok(claim.rawIds.length >= 2);
      assert.ok(claim.rawIds.every(id => rawIds.has(id)), 'creative interpretations cite saved source notes, never scenario output');
    }
    assert.equal(workspace.scenarios.length, 0);
    assert.equal(workspace.dreams.length, 0);
    const edges = memoryEdges(records, workspace.links);
    const reached = new Set([records[0].id]);
    for (let previous = -1; previous !== reached.size;) {
      previous = reached.size;
      for (const { from, to } of edges) {
        if (reached.has(from)) reached.add(to);
        if (reached.has(to)) reached.add(from);
      }
    }
    assert.equal(reached.size, pack.count, 'every object can be reached through an actual recorded association or source reference');
  });

  test(`${pack.id} recreation is deterministic in content and independent of earlier edits`, () => {
    const first = createExampleWorkspace(pack.id);
    const expected = content(first);
    first.claims[0].text = 'A local edit that belongs only to this copy.';
    first.raw.pop();
    first.links.length = 0;
    const second = createExampleWorkspace(pack.id);
    assert.deepEqual(content(second), expected);
    assert.notEqual(first, second);
    assert.notEqual(first.claims[0], second.claims[0]);
    assert.notEqual(first.raw[0].id, second.raw[0].id, 'each isolated workspace receives its own record identities');
  });
}

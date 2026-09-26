import test from 'node:test';
import assert from 'node:assert/strict';
import { graphForest, skillTreeLayout, radialTreeLayout } from '../web/graph-layouts.mjs';
import { EXAMPLE_PACKS, createExampleWorkspace } from '../lib/example-packs.mjs';
import { describeMemory, memoryEdges } from '../web/memory-model.mjs';
const nodes = ['hub','a','b','c','island'].map(id => ({ id, title: id, objectType: id === 'hub' ? 'network' : 'document' }));
const edges = [{from:'hub',to:'a',type:'part-of'},{from:'hub',to:'b',type:'related'},{from:'a',to:'c',type:'derived-from'},{from:'c',to:'b',type:'related'}];

test('graph forest preserves real relationships, marks crosslinks, and keeps islands separate', () => {
  const before = JSON.stringify({nodes,edges});
  const result = graphForest(nodes, [...edges, {from:'hub',to:'missing',type:'related'}, {from:'hub',to:'hub',type:'related'}]);
  assert.equal(result.components.length, 2);
  assert.equal(result.components[0].root.id, 'hub');
  assert.equal(result.components[1].root.id, 'island');
  assert.equal(result.edges.filter(edge => edge.tree).length, 3);
  assert.equal(result.edges.filter(edge => !edge.tree).length, 1);
  assert.deepEqual(result.edges.map(({tree,...edge}) => edge), edges);
  assert.equal(JSON.stringify({nodes,edges}), before);
});

test('explicit focus chooses the root without adding or reversing factual edges', () => {
  const result = graphForest(nodes, edges, 'c');
  assert.equal(result.components[0].root.id, 'c');
  assert.deepEqual(result.edges.map(({tree,...edge}) => edge), edges);
});

for (const layout of [skillTreeLayout, radialTreeLayout]) {
  test(`${layout.name} handles empty, disconnected, and cyclic graphs deterministically`, () => {
    const empty = layout([], []); assert.equal(empty.positions.size, 0); assert.ok(empty.bounds.width > 0);
    const result = layout(nodes, edges);
    assert.deepEqual([...result.positions.keys()].sort(), nodes.map(node=>node.id).sort());
    assert.ok(result.groups.some(group => group.kind === 'islands'));
    assert.deepEqual([...result.positions], [...layout(nodes, edges).positions]);
    for (const position of result.positions.values()) assert.ok(Number.isFinite(position.x) && Number.isFinite(position.y));
    assert.deepEqual(result.edges.map(({tree,...edge})=>edge), edges);
  });
}

for (const pack of EXAMPLE_PACKS) {
  for (const layout of [skillTreeLayout, radialTreeLayout]) {
    test(`${layout.name} fits all ${pack.count} ${pack.id} nodes and real edges without overlap or memory changes`, () => {
      const workspace = createExampleWorkspace(pack.id);
      const before = JSON.stringify(workspace);
      const records = [...workspace.raw, ...workspace.claims];
      const rawIds = new Set(workspace.raw.map(node => node.id));
      const displayed = records.map(record => describeMemory(record, rawIds.has(record.id) ? 'raw' : 'claim'));
      const links = memoryEdges(records, workspace.links);
      // Check the overview and actual focus destinations: a source and a claim.
      // Re-rooting a dense graph must preserve all cards and recorded links too.
      for (const selectedId of [undefined, workspace.raw[0].id, workspace.claims.at(-1).id]) {
        const result = layout(displayed, links, selectedId);
        assert.equal(result.positions.size, pack.count);
        assert.deepEqual([...result.positions.keys()].sort(), records.map(record => record.id).sort());
        assert.deepEqual(result.edges.map(({ tree, ...edge }) => edge), links, 'layout retains every real edge without adding relationships');
        assert.equal(result.roots.size, 1, 'the full collection remains connected');
        if (selectedId) assert.ok(result.roots.has(selectedId), 'Focus re-roots around the requested memory');
        else assert.equal(displayed.find(node => node.id === [...result.roots][0]).objectType, 'network');
        const { x, y, width, height } = result.bounds;
        assert.ok([x, y, width, height].every(Number.isFinite));
        assert.ok(width > 0 && height > 0);
        const positions = [...result.positions.entries()];
        for (const [id, point] of positions) {
          assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y), `${id} has a finite location`);
          assert.ok(point.x - 74 >= x && point.x + 74 <= x + width, `${id} card fits the horizontal bounds`);
          assert.ok(point.y - 27 >= y && point.y + 27 <= y + height, `${id} card fits the vertical bounds`);
        }
        for (let i = 0; i < positions.length; i++) for (let j = i + 1; j < positions.length; j++) {
          const [idA, a] = positions[i], [idB, b] = positions[j];
          assert.ok(Math.abs(a.x - b.x) >= 148 - 1e-6 || Math.abs(a.y - b.y) >= 54 - 1e-6,
            `${layout.name} overlaps ${idA} and ${idB} when focused on ${selectedId ?? 'overview'}`);
        }
      }
      assert.equal(JSON.stringify(workspace), before);
    });
  }
}

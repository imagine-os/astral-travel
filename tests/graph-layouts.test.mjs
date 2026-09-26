import test from 'node:test';
import assert from 'node:assert/strict';
import { graphForest, skillTreeLayout, radialTreeLayout } from '../web/graph-layouts.mjs';
import { createDemoWorkspace } from '../lib/core.mjs';
import { addExampleMemories } from '../lib/examples.mjs';
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

test('the expanded sample fits both graph styles without overlapping node cards or changing memory', () => {
  const workspace = createDemoWorkspace(); addExampleMemories(workspace);
  const before = JSON.stringify(workspace);
  const records = [...workspace.raw,...workspace.claims];
  const rawIds = new Set(workspace.raw.map(node=>node.id));
  const displayed = records.map(record=>describeMemory(record,rawIds.has(record.id)?'raw':'claim'));
  const links = memoryEdges(records,workspace.links);
  for (const layout of [skillTreeLayout,radialTreeLayout]) {
    const result = layout(displayed,links);
    assert.equal(result.positions.size,48);
    assert.equal(result.edges.length,links.length);
    assert.equal(displayed.find(node=>node.id===[...result.roots][0]).objectType,'network');
    const positions = [...result.positions.values()];
    for(let i=0;i<positions.length;i++) for(let j=i+1;j<positions.length;j++) {
      const a=positions[i], b=positions[j];
      assert.ok(Math.abs(a.x-b.x)>=144 || Math.abs(a.y-b.y)>=54, `${layout.name} has overlapping node cards`);
    }
  }
  assert.equal(JSON.stringify(workspace),before);
});

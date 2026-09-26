import test from 'node:test';
import assert from 'node:assert/strict';
import { describeMemory, memoryEdges, arrangeMemories, OBJECT_TYPES } from '../web/memory-model.mjs';

function sample(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `memory-${index}`, title: `Memory ${String(index).padStart(2, '0')}`,
    text: `Original text ${index}`, type: index % 4 === 0 ? 'claim' : 'raw',
    category: ['Studio', 'Memory', 'Research', 'Media', 'Design', 'Experiments'][index % 6],
    tags: [`tag-${index % 6}`],
  }));
}

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
}

test('display metadata preserves evidence status and keeps its own tag array', () => {
  const original = freeze({ id: 'a', title: 'Studio interview', text: 'A direct quote.', tags: ['studio'], status: 'untrusted' });
  const shown = describeMemory(original, 'raw');
  assert.deepEqual(shown, { id: 'a', title: 'Studio interview', text: 'A direct quote.', type: 'raw', objectType: 'chat', status: 'original', tags: ['studio'], category: 'Studio', icon: 'chat', color: '#558bcc' });
  shown.tags.push('presentation only');
  assert.deepEqual(original.tags, ['studio']);
  const claim = freeze({ id: 'b', title: 'A possible link', text: 'An inference.', tags: ['memory'], status: 'inferred', kind: 'connection' });
  assert.equal(describeMemory(claim, 'claim').status, 'inferred');
  assert.equal(describeMemory(claim, 'claim').icon, 'connection');
  assert.equal(describeMemory(claim, 'claim').category, 'Memory');
});

test('provenance edges normalize source → claim and remove duplicate/reversed links', () => {
  const records = freeze([
    { id: 'source', tags: [] },
    { id: 'other', tags: [] },
    { id: 'claim', rawIds: ['source', 'source', 'hidden'], status: 'proposed' },
  ]);
  const links = freeze([
    { fromId: 'claim', toId: 'source', type: 'derived-from' },
    { fromId: 'source', toId: 'claim', type: 'derived-from' },
    { fromId: 'source', toId: 'other', type: 'related' },
    { fromId: 'other', toId: 'source', type: 'related' },
    { fromId: 'source', toId: 'hidden', type: 'supports' },
    { fromId: 'claim', toId: 'claim', type: 'related' },
    { fromId: 'source', toId: 'claim', type: 'contradicts' },
    { fromId: 'claim', toId: 'source', type: 'contradicts' },
  ]);
  const before = JSON.stringify({ records, links });
  const edges = memoryEdges(records, links);
  assert.deepEqual(edges.filter(edge => edge.type === 'derived-from'), [{ from: 'source', to: 'claim', type: 'derived-from' }]);
  assert.equal(edges.filter(edge => edge.type === 'related').length, 1);
  assert.equal(edges.filter(edge => edge.type === 'contradicts').length, 2, 'directional relationships stay distinct');
  assert.equal(edges.length, 4);
  assert.equal(JSON.stringify({ records, links }), before);
});

for (const layout of ['rooms', 'lanes', 'radial', 'grid']) {
  for (const count of [1, 8, 30]) {
    test(`${layout} keeps ${count} nodes finite, spaced, stable, and unchanged`, () => {
      const nodes = freeze(sample(count));
      const edges = freeze(nodes.slice(1, Math.min(count, 6)).map(node => ({ from: nodes[0].id, to: node.id, type: 'related' })));
      const before = JSON.stringify({ nodes, edges });
      const result = arrangeMemories(nodes, edges, layout, nodes[0].id);
      assert.deepEqual([...result.positions.keys()].sort(), nodes.map(node => node.id).sort());
      assert.deepEqual(result, arrangeMemories([...nodes].reverse(), edges, layout, nodes[0].id), 'input ordering does not move records');
      assert.equal(JSON.stringify({ nodes, edges }), before);
      const points = [...result.positions.values()];
      for (let index = 0; index < points.length; index++) {
        const point = points[index];
        assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z));
        assert.equal(point.y, 0);
        assert.ok(point.x >= result.bounds.minX && point.x <= result.bounds.maxX);
        assert.ok(point.z >= result.bounds.minZ && point.z <= result.bounds.maxZ);
        for (let other = index + 1; other < points.length; other++) {
          assert.ok(Math.hypot(point.x - points[other].x, point.z - points[other].z) >= 3.6, 'physical cards must not overlap');
        }
      }
      assert.ok(Number.isFinite(result.bounds.width) && Number.isFinite(result.bounds.depth));
      assert.ok(result.groups.length <= 4);
    });
  }
}

test('radial view centers the selection and places its direct neighbors before unrelated nodes', () => {
  const nodes = sample(8);
  const selected = nodes[4].id;
  const neighbors = [nodes[0].id, nodes[6].id];
  const edges = neighbors.map(id => ({ from: selected, to: id, type: 'related' }));
  const { positions } = arrangeMemories(nodes, edges, 'radial', selected);
  assert.deepEqual(positions.get(selected), { x: 0, y: 0, z: 0 });
  const radius = id => Math.hypot(positions.get(id).x, positions.get(id).z);
  const outer = nodes.filter(node => node.id !== selected && !neighbors.includes(node.id));
  assert.ok(Math.max(...neighbors.map(radius)) < Math.min(...outer.map(node => radius(node.id))));
});

test('room categories are capped without losing overflow records', () => {
  const nodes = sample(30);
  const { positions, groups } = arrangeMemories(nodes);
  assert.equal(groups.length, 4);
  assert.ok(groups.some(group => group.label === 'Notes'));
  assert.equal(positions.size, nodes.length);
});

test('evidence lanes keep every source to the left of processed knowledge', () => {
  const nodes = sample(30);
  const { positions, groups } = arrangeMemories(nodes, [], 'lanes');
  const sourceX = nodes.filter(node => node.type === 'raw').map(node => positions.get(node.id).x);
  const claimX = nodes.filter(node => node.type === 'claim').map(node => positions.get(node.id).x);
  assert.ok(Math.max(...sourceX) < Math.min(...claimX));
  assert.deepEqual(groups.map(group => group.label), ['Original sources', 'Processed knowledge']);
});

test('empty views have usable finite bounds and no phantom nodes', () => {
  for (const layout of ['rooms', 'lanes', 'radial', 'grid']) {
    const result = arrangeMemories([], [], layout);
    assert.equal(result.positions.size, 0);
    assert.equal(result.groups.length, 0);
    assert.ok(result.bounds.width > 0 && result.bounds.depth > 0);
  }
});


test('object types are presentation metadata, including explicit media formats', () => {
  const examples = [
    ['Plain plan', [], 'document'],
    ['Customer feedback', [], 'chat'],
    ['Reading notes', [], 'book'],
    ['Moodboard description', [], 'image'],
    ['Film storyboard', [], 'video'],
    ['Listening notes', [], 'audio'],
    ['Saved JavaScript snippet', [], 'code'],
    ['A source review', [], 'research'],
    ['Prototype test', [], 'experiment'],
    ['An interview transcript', ['audio'], 'audio'],
    ['A book about image processing', ['code'], 'code'],
    ['Reference collection', [], 'folder'],
    ['Topology sketch', [], 'network'],
    ['Mira role profile', [], 'character'],
    ['Source schema', [], 'database'],
    ['Research connector', [], 'service'],
    ['Storage bucket plan', [], 'cloud'],
    ['Dream gateway', [], 'portal'],
    ['Image research collection', ['folder'], 'folder'],
    ['Book character', ['book', 'format:character'], 'character'],
    ['Research network', ['research', 'format:network'], 'network'],
    ['A fictional cloud service', ['format:document', 'cloud', 'service'], 'document'],
  ];
  for (const [title, tags, expected] of examples) {
    const raw = freeze({ id: expected, title, text: 'Unchanged source bytes.', tags });
    const shown = describeMemory(raw, 'raw');
    assert.equal(shown.objectType, expected);
    assert.equal(shown.type, 'raw');
    assert.equal(shown.text, raw.text);
    assert.ok(OBJECT_TYPES.some(item => item.id === shown.objectType));
    assert.match(shown.color, /^#[a-f0-9]{6}$/u);
  }
  for (const objectType of OBJECT_TYPES) {
    const claim = describeMemory({ id: 'claim', title: objectType.label, tags: [objectType.id], status: 'proposed' }, 'claim');
    assert.equal(claim.objectType, 'claim', 'a format hint must never hide the interpretation boundary');
    assert.equal(claim.status, 'proposed');
  }
  assert.equal(new Set(OBJECT_TYPES.map(item => item.id)).size, 17);
  assert.ok(OBJECT_TYPES.every(item => item.label && item.icon && item.description));
});


test('object bands keep forty-eight records separated, deterministic, and ordered by recognizable type', () => {
  const nodes = sample(48).map((node, index) => ({ ...node, type: 'raw', objectType: OBJECT_TYPES[index % OBJECT_TYPES.length].id }));
  nodes.filter(node => node.objectType === 'claim').forEach(node => { node.type = 'claim'; });
  freeze(nodes);
  const before = JSON.stringify(nodes);
  const result = arrangeMemories(nodes, [], 'bands');
  assert.equal(result.positions.size, 48);
  assert.deepEqual(result, arrangeMemories([...nodes].reverse(), [], 'bands'));
  assert.equal(JSON.stringify(nodes), before);
  assert.deepEqual(result.groups.map(group => group.label), ['Clouds & portals', 'Networks & services', 'Datastores', 'Folders', 'Sources', 'Ideas', 'Characters']);
  assert.ok(result.groups.every(group => group.width <= 39), 'at most ten objects across each band');
  for (let index = 1; index < result.groups.length; index++) {
    const previous = result.groups[index - 1];
    const group = result.groups[index];
    assert.ok(previous.z + previous.depth / 2 < group.z - group.depth / 2);
  }
  const points = [...result.positions.values()];
  points.forEach((point, index) => {
    assert.ok([point.x, point.y, point.z].every(Number.isFinite));
    assert.equal(point.y, 0);
    for (const other of points.slice(index + 1)) {
      assert.ok(Math.hypot(point.x - other.x, point.z - other.z) >= 4 - 1e-8);
    }
  });
  assert.equal(arrangeMemories([], [], 'bands').groups.length, 0);
});

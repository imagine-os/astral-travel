import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpatialState, normalizeSpatialState, moveSpatialObject, resetSpatialLayout, setSpatialObjectType, applySpatialPositions } from '../web/spatial-state.mjs';

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
}

test('empty state and persisted dictionaries safely support arbitrary record IDs', () => {
  const empty = createSpatialState();
  assert.equal(empty.version, 1);
  assert.equal(Object.getPrototypeOf(empty.layouts), null);
  assert.equal(Object.getPrototypeOf(empty.objects), null);
  let state = empty;
  for (const id of ['__proto__', 'constructor', 'toString', 'source/你好 & 1']) {
    state = moveSpatialObject(state, 'rooms', id, { x: 2, z: -4 });
    state = setSpatialObjectType(state, id, 'document');
  }
  const restored = normalizeSpatialState(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(restored, state);
  assert.equal(Object.getPrototypeOf(restored.layouts.rooms), null);
  assert.equal(restored.objects.__proto__, 'document');
  assert.equal({}.polluted, undefined);
});

test('moving a record changes only its arrangement and preserves evidence and identity', () => {
  const evidence = freeze([{ id: 'source', text: 'Original source.', rawIds: [], status: 'original' }, { id: 'claim', rawIds: ['source'], status: 'inferred' }]);
  const snapshot = JSON.stringify(evidence);
  const base = freeze(moveSpatialObject(createSpatialState(), 'lanes', 'source', { x: -3, z: 0 }));
  const next = moveSpatialObject(base, 'rooms', 'source', { x: 8, y: 0, z: -7 });
  assert.notEqual(next, base);
  assert.equal(base.layouts.rooms, undefined);
  assert.deepEqual(next.layouts.lanes.source, { x: -3, y: 0, z: 0 });
  const positions = new Map(evidence.map((record, index) => [record.id, freeze({ x: index, y: 0, z: 0 })]));
  const shown = applySpatialPositions(positions, next, 'rooms');
  assert.deepEqual([...shown.keys()], evidence.map(record => record.id));
  assert.deepEqual(shown.get('source'), { x: 8, y: 0, z: -7 });
  assert.deepEqual(positions.get('source'), { x: 0, y: 0, z: 0 });
  assert.equal(JSON.stringify(evidence), snapshot);
  shown.get('claim').x = 99;
  shown.get('source').x = 99;
  assert.equal(positions.get('claim').x, 1);
  assert.equal(next.layouts.rooms.source.x, 8);
});

test('hidden or deleted records do not become phantom objects when positions are applied', () => {
  const state = moveSpatialObject(createSpatialState(), 'grid', 'hidden', { x: 10, z: 10 });
  const positions = new Map([['visible', { x: 0, y: 0, z: 0 }]]);
  const shown = applySpatialPositions(positions, state, 'grid');
  assert.deepEqual([...shown.keys()], ['visible']);
  assert.deepEqual(shown.get('visible'), positions.get('visible'));
  assert.notEqual(shown.get('visible'), positions.get('visible'));
});

test('resetting one arrangement preserves all other positions and object types', () => {
  let state = moveSpatialObject(createSpatialState(), 'radial', 'a', { x: 1, z: 2 });
  state = moveSpatialObject(state, 'grid', 'a', { x: 3, z: 4 });
  state = freeze(setSpatialObjectType(state, 'a', 'book'));
  const reset = resetSpatialLayout(state, 'radial');
  assert.equal(reset.layouts.radial, undefined);
  assert.deepEqual(reset.layouts.grid.a, { x: 3, y: 0, z: 4 });
  assert.equal(reset.objects.a, 'book');
  assert.ok(state.layouts.radial.a);
  assert.deepEqual(resetSpatialLayout(state, '__proto__'), state);
});

test('corrupt payloads and invalid shapes are ignored without type or coordinate coercion', () => {
  for (const payload of [null, undefined, [], 'state', 5, { version: 2, layouts: {} }, { layouts: {} }]) {
    assert.deepEqual(normalizeSpatialState(payload), createSpatialState());
  }
  const payload = { version: 1, layouts: { rooms: {
    good: { x: -100, y: 0, z: 100 }, omittedY: { x: 1, z: 2 },
    overflow: { x: 101, z: 0 }, infinite: { x: Infinity, z: 0 }, nan: { x: NaN, z: 0 },
    string: { x: '2', z: 0 }, wrongY: { x: 1, y: 1, z: 2 }, array: [1, 0, 2],
    '': { x: 0, z: 0 }, ['a'.repeat(201)]: { x: 0, z: 0 },
  }, unknown: { a: { x: 0, z: 0 } }, grid: [] }, objects: { good: 'video', claim: 'claim', invalid: 'spaceship', wrongShape: { type: 'audio' }, '': 'book' } };
  const normalized = normalizeSpatialState(freeze(payload));
  assert.deepEqual(Object.keys(normalized.layouts), ['rooms']);
  assert.deepEqual(Object.keys(normalized.layouts.rooms), ['good', 'omittedY']);
  assert.deepEqual(Object.keys(normalized.objects), ['good']);
  assert.equal(normalized.objects.good, 'video');
  assert.deepEqual(normalized.layouts.rooms.omittedY, { x: 1, y: 0, z: 2 });
  assert.deepEqual(moveSpatialObject(normalized, 'rooms', 'good', { x: -101, z: 0 }), normalized);
  assert.deepEqual(moveSpatialObject(normalized, 'unknown', 'good', { x: 0, z: 0 }), normalized);
});

test('inherited properties and accessors do not become saved positions', () => {
  const layouts = { rooms: {} };
  Object.defineProperty(layouts.rooms, 'getter', { enumerable: true, get() { throw new Error('must not be invoked'); } });
  const payload = { version: 1, layouts, objects: Object.create({ inherited: 'book' }) };
  assert.deepEqual(normalizeSpatialState(payload), createSpatialState());
  assert.deepEqual(applySpatialPositions([], payload, 'rooms'), new Map());
});

test('object type preferences are immutable, allow only source shapes, and reset with null', () => {
  let state = createSpatialState();
  const types = ['document', 'chat', 'book', 'image', 'video', 'audio', 'code', 'research', 'experiment', 'folder', 'network', 'character', 'database', 'service', 'cloud', 'portal'];
  for (const type of types) state = setSpatialObjectType(state, type, type);
  freeze(state);
  assert.equal(Object.keys(state.objects).length, types.length);
  assert.deepEqual(setSpatialObjectType(state, 'a', 'claim'), state);
  assert.deepEqual(setSpatialObjectType(state, 'a', undefined), state);
  const removed = setSpatialObjectType(state, 'book', null);
  assert.equal(removed.objects.book, undefined);
  assert.equal(state.objects.book, 'book');
});

test('saved preferences have a combined 5,000-entry bound but existing entries remain editable', () => {
  const payload = { version: 1, layouts: { rooms: {} }, objects: {} };
  for (let i = 0; i < 4999; i++) payload.layouts.rooms[`id-${i}`] = { x: 0, z: 0 };
  payload.objects.a = 'audio';
  payload.objects.b = 'book';
  const state = normalizeSpatialState(payload);
  assert.equal(Object.keys(state.layouts.rooms).length, 4999);
  assert.deepEqual(Object.keys(state.objects), ['a']);
  assert.deepEqual(moveSpatialObject(state, 'grid', 'extra', { x: 0, z: 0 }), state);
  assert.deepEqual(setSpatialObjectType(state, 'extra', 'book'), state);
  assert.equal(moveSpatialObject(state, 'rooms', 'id-0', { x: 2, z: 3 }).layouts.rooms['id-0'].x, 2);
  assert.equal(setSpatialObjectType(state, 'a', 'video').objects.a, 'video');
});


test('object-band placements persist independently from earlier arrangements', () => {
  let state = moveSpatialObject(createSpatialState(), 'rooms', 'mira', { x: 1, z: 2 });
  state = moveSpatialObject(state, 'bands', 'mira', { x: -5, z: 12 });
  state = setSpatialObjectType(state, 'mira', 'character');
  const restored = normalizeSpatialState(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(restored.layouts.rooms.mira, { x: 1, y: 0, z: 2 });
  assert.deepEqual(restored.layouts.bands.mira, { x: -5, y: 0, z: 12 });
  assert.equal(restored.objects.mira, 'character');
  assert.equal(resetSpatialLayout(restored, 'bands').layouts.bands, undefined);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpatialSessions } from '../web/explorer.mjs';
import { createSpatialState, moveSpatialObject, resetSpatialLayout, setSpatialObjectType } from '../web/spatial-state.mjs';

const PERSONAL = 'astral-travel.workspace.v0.1';
const EXAMPLE = `${PERSONAL}.example.dreamworld`;
const LEGACY = 'astral-travel.spatial.v1';
const exampleStorageKey = `${LEGACY}.workspace.${EXAMPLE}`;
function memoryStorage(entries = []) {
  const values = new Map(entries);
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('example arrangement resets preserve legacy personal placements and object forms across reloads', () => {
  const personal = setSpatialObjectType(moveSpatialObject(createSpatialState(), 'bands', 'same-id', { x: 12, z: -4 }), 'same-id', 'book');
  const original = JSON.stringify(personal);
  const storage = memoryStorage([[LEGACY, original]]);
  const sessions = createSpatialSessions(storage);
  assert.deepEqual(sessions.read(PERSONAL), personal, 'existing personal placements retain their original storage key');
  assert.deepEqual(sessions.read(EXAMPLE), createSpatialState(), 'an example does not inherit personal IDs');
  const example = setSpatialObjectType(moveSpatialObject(sessions.read(EXAMPLE), 'bands', 'same-id', { x: -30, z: 5 }), 'same-id', 'character');
  assert.equal(sessions.write(EXAMPLE, example), true);
  assert.equal(storage.values.get(LEGACY), original);
  assert.equal(sessions.read(PERSONAL).objects['same-id'], 'book');
  const reset = resetSpatialLayout(sessions.read(EXAMPLE), 'bands');
  sessions.write(EXAMPLE, reset);
  assert.equal(storage.values.get(LEGACY), original, 'resetting the example must not rewrite personal storage');
  const reloaded = createSpatialSessions(storage);
  assert.deepEqual(reloaded.read(PERSONAL), personal);
  assert.equal(reloaded.read(EXAMPLE).layouts.bands, undefined);
  assert.equal(reloaded.read(EXAMPLE).objects['same-id'], 'character');
});

test('unavailable browser storage retains separate session-only placements', () => {
  const sessions = createSpatialSessions({ getItem() { throw new Error('unavailable'); }, setItem() { throw new Error('full'); } });
  const personal = moveSpatialObject(sessions.read(PERSONAL), 'rooms', 'same-id', { x: 1, z: 2 });
  const example = moveSpatialObject(sessions.read(EXAMPLE), 'rooms', 'same-id', { x: 3, z: 4 });
  assert.equal(sessions.write(PERSONAL, personal), false);
  assert.equal(sessions.write(EXAMPLE, example), false);
  assert.deepEqual(sessions.read(PERSONAL), personal);
  assert.deepEqual(sessions.read(EXAMPLE), example);
  const copy = sessions.read(EXAMPLE);
  copy.layouts.rooms['same-id'].x = 99;
  assert.equal(sessions.read(EXAMPLE).layouts.rooms['same-id'].x, 3, 'a renderer cannot mutate the stored session snapshot');
});

test('reading corrupt example preferences does not overwrite them or affect personal state', () => {
  const personal = moveSpatialObject(createSpatialState(), 'grid', 'note', { x: 5, z: 6 });
  const storage = memoryStorage([[LEGACY, JSON.stringify(personal)], [exampleStorageKey, '{broken']]);
  const before = [...storage.values];
  const sessions = createSpatialSessions(storage);
  assert.deepEqual(sessions.read(EXAMPLE), createSpatialState());
  assert.deepEqual(sessions.read(PERSONAL), personal);
  assert.deepEqual([...storage.values], before);
});

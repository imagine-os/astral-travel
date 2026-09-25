// Presentation preferences only. These helpers never receive or modify evidence.
const LAYOUTS = new Set(['rooms', 'lanes', 'radial', 'grid']);
const OBJECT_TYPES = new Set(['document', 'chat', 'book', 'image', 'video', 'audio', 'code', 'research', 'experiment']);
const MAX_ENTRIES = 5000;
const MAX_COORDINATE = 100;

const dictionary = () => Object.create(null);
const validId = id => typeof id === 'string' && id.length > 0 && id.length <= 200;
const isDictionary = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

// Reading data descriptors also avoids invoking accessors in malformed input.
function ownValue(object, key) {
  return Object.getOwnPropertyDescriptor(object, key)?.value;
}

function validPosition(value) {
  if (!isDictionary(value)) return null;
  const x = ownValue(value, 'x');
  const y = ownValue(value, 'y');
  const z = ownValue(value, 'z');
  if (!Number.isFinite(x) || !Number.isFinite(z) || Math.abs(x) > MAX_COORDINATE || Math.abs(z) > MAX_COORDINATE) return null;
  if (y !== undefined && y !== 0) return null;
  return { x, y: 0, z };
}

export function createSpatialState() {
  return { version: 1, layouts: dictionary(), objects: dictionary() };
}

/** Validate a saved preference payload, retaining at most 5,000 total entries. */
export function normalizeSpatialState(payload) {
  const state = createSpatialState();
  if (!isDictionary(payload) || ownValue(payload, 'version') !== 1) return state;
  let remaining = MAX_ENTRIES;
  const layouts = ownValue(payload, 'layouts');
  if (isDictionary(layouts)) {
    for (const layout of LAYOUTS) {
      const source = ownValue(layouts, layout);
      if (!isDictionary(source)) continue;
      const saved = dictionary();
      for (const id of Object.keys(source).slice(0, MAX_ENTRIES)) {
        if (!remaining) break;
        if (!validId(id)) continue;
        const point = validPosition(ownValue(source, id));
        if (!point) continue;
        saved[id] = point;
        remaining--;
      }
      if (Object.keys(saved).length) state.layouts[layout] = saved;
    }
  }
  const objects = ownValue(payload, 'objects');
  if (isDictionary(objects)) {
    for (const id of Object.keys(objects).slice(0, MAX_ENTRIES)) {
      if (!remaining) break;
      const type = ownValue(objects, id);
      if (!validId(id) || !OBJECT_TYPES.has(type)) continue;
      state.objects[id] = type;
      remaining--;
    }
  }
  return state;
}

function entryCount(state) {
  return Object.keys(state.objects).length + Object.values(state.layouts).reduce((sum, layout) => sum + Object.keys(layout).length, 0);
}

/** Save an x/z placement in one arrangement; invalid moves leave values intact. */
export function moveSpatialObject(state, layout, id, position) {
  const next = normalizeSpatialState(state);
  const point = validPosition(position);
  if (!LAYOUTS.has(layout) || !validId(id) || !point) return next;
  if (!next.layouts[layout]?.[id] && entryCount(next) >= MAX_ENTRIES) return next;
  next.layouts[layout] ??= dictionary();
  next.layouts[layout][id] = point;
  return next;
}

/** Return an arrangement to its computed positions without changing other views. */
export function resetSpatialLayout(state, layout) {
  const next = normalizeSpatialState(state);
  if (LAYOUTS.has(layout)) delete next.layouts[layout];
  return next;
}

/** Override a source's presentation; null restores its inferred object style. */
export function setSpatialObjectType(state, id, typeOrNull) {
  const next = normalizeSpatialState(state);
  if (!validId(id)) return next;
  if (typeOrNull === null) delete next.objects[id];
  else if (OBJECT_TYPES.has(typeOrNull) && (Object.hasOwn(next.objects, id) || entryCount(next) < MAX_ENTRIES)) next.objects[id] = typeOrNull;
  return next;
}

/** Copy generated positions and overlay only saved IDs already present in the view. */
export function applySpatialPositions(positions, state, layout) {
  const saved = normalizeSpatialState(state).layouts[layout];
  const result = new Map();
  if (!(positions instanceof Map)) return result;
  for (const [id, point] of positions) {
    result.set(id, saved && Object.hasOwn(saved, id) ? { ...saved[id] } : { ...point });
  }
  return result;
}

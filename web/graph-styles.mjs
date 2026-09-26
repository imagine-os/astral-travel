import { skillTreeLayout, radialTreeLayout } from './graph-layouts.mjs';

const SVG_NS = 'http://www.w3.org/2000/svg';
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const safeColor = value => /^#[\da-f]{3,8}$/iu.test(value || '') ? value : '#9070d0';
const label = value => String(value || '').replace(/[-_]/g, ' ');
const EMPTY_API = Object.freeze({ update() {}, fit() {}, focus() {}, zoom() {}, setTheme() {}, destroy() {} });

const glyphs = {
  document: '<path d="M8 4h11l5 5v19H8z"/><path d="M19 4v6h5M12 15h8m-8 5h8m-8 4h5"/>',
  folder: '<path d="M3 9V6h10l3 4h13v17H3z"/><path d="M3 13h26l-3 14H3z"/>',
  network: '<path d="m16 7-9 15m9-15 9 15M7 22h18"/><circle cx="16" cy="6" r="4"/><circle cx="6" cy="24" r="4"/><circle cx="26" cy="24" r="4"/>',
  character: '<circle cx="16" cy="10" r="6"/><path d="M5 28c0-13 22-13 22 0z"/><path d="M13 10h.1m5.8 0h.1M13 13q3 3 6 0"/>',
  database: '<ellipse cx="16" cy="7" rx="11" ry="4"/><path d="M5 7v18c0 5 22 5 22 0V7M5 15c0 5 22 5 22 0M5 23c0 5 22 5 22 0"/>',
  service: '<rect x="6" y="5" width="20" height="22" rx="5"/><path d="m14 10-4 6 4 6m4-12 4 6-4 6"/>',
  cloud: '<path d="M8 25a7 7 0 0 1-1-14 9 9 0 0 1 17-2 8 8 0 0 1 0 16z"/>',
  portal: '<ellipse cx="16" cy="16" rx="10" ry="13"/><ellipse cx="16" cy="16" rx="5" ry="9"/><path d="M1 16h7m16 0h7"/>',
  chat: '<path d="M4 5h24v17H14l-7 6v-6H4z"/><path d="M9 11h14M9 16h9"/>',
  book: '<path d="M16 7C10 3 5 4 2 5v22c5-2 10-2 14 1 4-3 9-3 14-1V5c-5-2-10-1-14 2zM16 7v21"/>',
  image: '<rect x="3" y="4" width="26" height="24" rx="2"/><circle cx="22" cy="11" r="3"/><path d="m3 24 9-11 8 11m-4-4 5-4 8 10"/>',
  video: '<rect x="3" y="8" width="26" height="21" rx="2"/><path d="M3 3h26v5H3zM8 3l4 5m5-5 4 5"/><path d="m13 14 8 5-8 5z"/>',
  audio: '<rect x="2" y="7" width="28" height="20" rx="4"/><circle cx="10" cy="17" r="4"/><circle cx="22" cy="17" r="4"/><path d="M10 17h12M10 27l2-5h8l2 5"/>',
  code: '<rect x="2" y="4" width="28" height="24" rx="3"/><path d="M2 10h28M9 15l4 4-4 4m8 0h6"/>',
  research: '<circle cx="14" cy="13" r="9"/><path d="m21 20 8 9M10 10h8m-8 5h6"/>',
  experiment: '<path d="M11 3h10m-8 0v9L4 26q-1 3 3 3h18q4 0 3-3l-9-14V3M9 19h14"/><circle cx="14" cy="24" r="1"/>',
  claim: '<path d="m16 2 4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/>',
};

function iconFor(node) {
  const icon = document.createElementNS(SVG_NS, 'svg');
  icon.setAttribute('viewBox', '0 0 32 32'); icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = glyphs[node.objectType] || glyphs[node.icon] || glyphs.document;
  return icon;
}
function svgElement(tag, attributes = {}) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
  return element;
}
function sectorPath(sector) {
  const { cx, cy, inner, radius, start, end } = sector;
  const p = (r, a) => `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
  // A full circle requires two arcs; a tiny visual gap also separates a lone branch.
  const finish = Math.min(end, start + Math.PI * 2 - .015);
  const large = finish - start > Math.PI ? 1 : 0;
  return `M${p(inner,start)}L${p(radius,start)}A${radius},${radius} 0 ${large} 1 ${p(radius,finish)}L${p(inner,finish)}A${inner},${inner} 0 ${large} 0 ${p(inner,start)}Z`;
}

/** Distinct graph renderers inspired by graph-gallery's lane and radial trees.
 * DOM buttons and exact-text thumbnails remain usable with WebGL unavailable. */
export function mountGraphStyle(host, options = {}) {
  let disposed = false, current = { nodes: [], edges: [], style: 'skilltree', ...options };
  let layout, rootId, camera = { x: 0, y: 0, scale: 1 }, pan = null;
  let followsFit = true;
  const nodeElements = new Map(), edgeElements = [];
  const abort = new AbortController(), signal = abort.signal;
  const viewport = document.createElement('div'); viewport.className = 'graph-style-view';
  viewport.tabIndex = 0; viewport.setAttribute('role', 'group');
  viewport.setAttribute('aria-label', 'Memory graph. Drag the background to pan. Use plus and minus to zoom, or zero to fit.');
  const world = document.createElement('div'); world.className = 'graph-style-world';
  const svg = svgElement('svg', { class: 'graph-style-lines', 'aria-hidden': 'true' });
  const groupLayer = svgElement('g'), lineLayer = svgElement('g');
  svg.append(groupLayer, lineLayer); world.append(svg); viewport.append(world);
  const caption = document.createElement('div'); caption.className = 'graph-style-key';
  const rootCaption = document.createElement('span'); rootCaption.className = 'graph-style-root-label';
  const help = document.createElement('span'); help.textContent = 'Drag background · scroll to zoom · Shift + scroll to pan';
  caption.append(rootCaption, help); viewport.append(caption);
  host.replaceChildren(viewport);

  function applyCamera() {
    if (disposed) return;
    world.style.transform = `translate(${camera.x}px,${camera.y}px) scale(${camera.scale})`;
    viewport.dataset.zoom = `${Math.round(camera.scale * 100)}%`;
  }
  function fit() {
    if (!layout || disposed) return;
    const width = viewport.clientWidth || host.clientWidth || 720;
    const height = viewport.clientHeight || host.clientHeight || 520;
    const b = layout.bounds;
    camera.scale = clamp(Math.min((width - 36) / b.width, (height - 75) / b.height, 1.15), .04, 2);
    camera.x = (width - b.width * camera.scale) / 2 - b.x * camera.scale;
    camera.y = (height - 45 - b.height * camera.scale) / 2 - b.y * camera.scale;
    followsFit = true; applyCamera();
  }
  function zoomAt(factor, x = viewport.clientWidth / 2, y = viewport.clientHeight / 2) {
    const before = camera.scale, next = clamp(before * factor, .04, 3.5);
    camera.x = x - (x - camera.x) * next / before;
    camera.y = y - (y - camera.y) * next / before;
    camera.scale = next; followsFit = false; applyCamera();
  }
  function zoom(delta) { zoomAt(delta > 0 ? 1.24 : 1 / 1.24); }
  function center(id, minimumScale = .8) {
    const p = layout?.positions.get(id); if (!p) return;
    camera.scale = clamp(Math.max(camera.scale, minimumScale), .04, 3.5);
    camera.x = viewport.clientWidth / 2 - p.x * camera.scale;
    camera.y = (viewport.clientHeight - 45) / 2 - p.y * camera.scale;
    followsFit = false; applyCamera();
  }
  function focus(id) {
    if (!layout?.positions.has(id)) return;
    if (current.style === 'radialtree' && rootId !== id) { rootId = id; rebuild(); }
    center(id, .85);
  }
  function drawGroups() {
    groupLayer.replaceChildren();
    for (const sector of layout.sectors) {
      const path = svgElement('path', { d: sectorPath(sector), class: 'graph-branch-sector', fill: safeColor(sector.color), stroke: safeColor(sector.color) });
      const title = svgElement('title'); title.textContent = `Branch: ${sector.label}`; path.append(title); groupLayer.append(path);
    }
    for (const ring of layout.rings) groupLayer.append(svgElement('circle', { cx: ring.cx, cy: ring.cy, r: ring.radius, class: 'graph-depth-ring' }));
    for (const group of layout.groups) {
      const g = svgElement('g', { class: `graph-lane graph-lane-${group.kind}` });
      if (group.kind !== 'cluster') g.append(svgElement('rect', { x: group.x, y: group.y, width: group.width, height: group.height, rx: 16, fill: safeColor(group.color) }));
      const title = svgElement('text', { x: group.x + 18, y: group.y + 21 });
      title.textContent = String(group.label || '').slice(0, 78); g.append(title); groupLayer.append(g);
    }
  }
  function drawEdges() {
    lineLayer.replaceChildren(); edgeElements.length = 0;
    for (const edge of layout.edges) {
      const from = layout.positions.get(edge.from), to = layout.positions.get(edge.to);
      if (!from || !to) continue;
      let d;
      if (current.style === 'skilltree') {
        const direction = to.x >= from.x ? 1 : -1;
        const fx = from.x + direction * 74, tx = to.x - direction * 74;
        const reach = Math.max(45, Math.abs(tx - fx) * .48);
        d = `M${fx},${from.y}C${fx + direction * reach},${from.y} ${tx - direction * reach},${to.y} ${tx},${to.y}`;
      } else {
        const r = layout.positions.get(from.root);
        const sx = r ? r.x : (from.x + to.x) / 2, sy = r ? r.y : (from.y + to.y) / 2;
        d = edge.tree ? `M${from.x},${from.y}C${(from.x + sx) / 2},${(from.y + sy) / 2} ${(to.x + sx) / 2},${(to.y + sy) / 2} ${to.x},${to.y}` : `M${from.x},${from.y}Q${sx},${sy} ${to.x},${to.y}`;
      }
      const path = svgElement('path', { d, class: `graph-memory-wire${edge.tree ? '' : ' is-crosslink'}${edge.type === 'derived-from' ? ' is-provenance' : ''}` });
      path.style.setProperty('--wire-color', safeColor(current.nodes.find(node => node.id === edge.from)?.color));
      const title = svgElement('title'); title.textContent = `${label(edge.type)}: ${edge.from} → ${edge.to}`; path.append(title);
      lineLayer.append(path); edgeElements.push({ edge, element: path });
    }
  }
  function makeNode(node) {
    const p = layout.positions.get(node.id), button = document.createElement('button');
    button.type = 'button'; button.className = `graph-memory-node shape-${node.objectType || 'document'}${layout.roots.has(node.id) ? ' is-root' : ''}`;
    button.dataset.graphMemory = node.id; button.style.setProperty('--object-color', safeColor(node.color));
    button.style.left = `${p.x}px`; button.style.top = `${p.y}px`;
    button.setAttribute('aria-label', `${node.title}. ${label(node.objectType || node.type)}. ${node.type === 'claim' ? 'Interpretation' : 'Original source'}. Inspect memory.`);
    const glyph = document.createElement('span'); glyph.className = 'graph-node-glyph'; glyph.append(iconFor(node));
    const image = document.createElement('img'); image.className = 'graph-node-thumbnail'; image.alt = ''; image.draggable = false;
    // Only locally generated/data or relative previews are rendered. This view
    // does not fetch arbitrary attachment URLs contained in source text.
    if (/^data:image\/(?:png|jpeg|webp);base64,/u.test(node.previewUrl || '') || /^(?:\.\/|assets\/)/u.test(node.previewUrl || '')) image.src = node.previewUrl;
    else image.hidden = true;
    const copy = document.createElement('span'); copy.className = 'graph-node-copy';
    const title = document.createElement('strong'); title.textContent = node.title || 'Untitled memory';
    const meta = document.createElement('small'); meta.textContent = node.type === 'claim' ? 'Interpretation' : label(node.objectType || 'document');
    copy.append(title, meta);
    const portIn = document.createElement('i'), portOut = document.createElement('i'); portIn.className = 'graph-port graph-port-in'; portOut.className = 'graph-port graph-port-out';
    button.append(image, glyph, copy, portIn, portOut); button.title = `${node.title}\n${node.type === 'claim' ? 'Interpretation' : 'Original source'} · ${node.status || ''}`;
    button.addEventListener('click', () => { if (!disposed) current.onSelect?.(node.id); }, { signal });
    button.addEventListener('focus', () => {
      const b = button.getBoundingClientRect(), v = viewport.getBoundingClientRect();
      if (b.left < v.left + 8 || b.right > v.right - 8 || b.top < v.top + 8 || b.bottom > v.bottom - 48) center(node.id, .65);
    }, { signal });
    return button;
  }
  function select() {
    const neighbors = new Set([current.selectedId]);
    for (const edge of current.edges) {
      if (edge.from === current.selectedId) neighbors.add(edge.to);
      if (edge.to === current.selectedId) neighbors.add(edge.from);
    }
    for (const [id, element] of nodeElements) {
      element.classList.toggle('is-selected', id === current.selectedId);
      element.classList.toggle('is-related', neighbors.has(id));
      element.setAttribute('aria-pressed', String(id === current.selectedId));
    }
    for (const { edge, element } of edgeElements) element.classList.toggle('is-highlighted', edge.from === current.selectedId || edge.to === current.selectedId);
  }
  function rebuild() {
    if (disposed) return;
    const focusedId = nodeElements.has(document.activeElement?.dataset.graphMemory) ? document.activeElement.dataset.graphMemory : null;
    for (const element of nodeElements.values()) element.remove(); nodeElements.clear();
    const nodes = current.nodes.slice(0, 60);
    layout = (current.style === 'radialtree' ? radialTreeLayout : skillTreeLayout)(nodes, current.edges, rootId);
    viewport.dataset.graphStyle = current.style;
    const b = layout.bounds;
    // SVG uses a large, positioned viewport so negative graph coordinates render.
    svg.style.left = `${b.x}px`; svg.style.top = `${b.y}px`; svg.setAttribute('width', b.width); svg.setAttribute('height', b.height);
    svg.setAttribute('viewBox', `${b.x} ${b.y} ${b.width} ${b.height}`);
    drawGroups(); drawEdges();
    for (const node of nodes) { const element = makeNode(node); nodeElements.set(node.id, element); world.append(element); }
    rootCaption.textContent = current.style === 'radialtree' ? 'Radial tree · solid branches / dashed crosslinks · Focus reroots' : 'Skill tree · real connections in branch lanes';
    if (!nodes.length) rootCaption.textContent = 'No memories in this view';
    select();
    if (focusedId) nodeElements.get(focusedId)?.focus({ preventScroll: true });
  }
  function update(partial = {}) {
    if (disposed) return;
    const rebuildNeeded = ['nodes', 'edges', 'style'].some(key => Object.hasOwn(partial, key));
    const previousStyle = current.style;
    current = { ...current, ...partial };
    if (rebuildNeeded) {
      if (rootId && !current.nodes.some(n => n.id === rootId)) rootId = undefined;
      rebuild(); if (previousStyle !== current.style || followsFit) fit();
    } else select();
  }
  function setTheme(theme) { viewport.dataset.theme = theme === 'dark' ? 'dark' : 'light'; }
  function destroy() { if (disposed) return; disposed = true; abort.abort(); observer.disconnect(); viewport.remove(); nodeElements.clear(); edgeElements.length = 0; }

  viewport.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('button')) return;
    pan = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, cameraX: camera.x, cameraY: camera.y };
    viewport.setPointerCapture(event.pointerId); viewport.classList.add('is-panning'); event.preventDefault();
  }, { signal });
  viewport.addEventListener('pointermove', event => {
    if (!pan || pan.pointerId !== event.pointerId) return;
    camera.x = pan.cameraX + event.clientX - pan.x; camera.y = pan.cameraY + event.clientY - pan.y;
    followsFit = false; applyCamera();
  }, { signal });
  const endPan = () => { pan = null; viewport.classList.remove('is-panning'); };
  viewport.addEventListener('pointerup', endPan, { signal }); viewport.addEventListener('pointercancel', endPan, { signal }); viewport.addEventListener('lostpointercapture', endPan, { signal });
  viewport.addEventListener('wheel', event => {
    event.preventDefault();
    if (!event.shiftKey) { const rect = viewport.getBoundingClientRect(); zoomAt(Math.exp(-event.deltaY * .003), event.clientX - rect.left, event.clientY - rect.top); }
    else { camera.x -= event.deltaX; camera.y -= event.deltaY; followsFit = false; applyCamera(); }
  }, { passive: false, signal });
  viewport.addEventListener('dblclick', event => { if (!event.target.closest('button')) fit(); }, { signal });
  viewport.addEventListener('keydown', event => {
    if (event.target !== viewport) return;
    if (event.key === '+' || event.key === '=') { event.preventDefault(); zoom(1); }
    else if (event.key === '-') { event.preventDefault(); zoom(-1); }
    else if (event.key === '0' || event.key === 'Home') { event.preventDefault(); fit(); }
    else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault(); camera.x += event.key === 'ArrowLeft' ? 65 : event.key === 'ArrowRight' ? -65 : 0;
      camera.y += event.key === 'ArrowUp' ? 65 : event.key === 'ArrowDown' ? -65 : 0; followsFit = false; applyCamera();
    }
  }, { signal });
  const observer = new ResizeObserver(() => { if (followsFit) fit(); }); observer.observe(host);
  try { rebuild(); setTheme(document.documentElement.dataset.theme || 'light'); fit(); current.onReady?.(); }
  catch (error) { destroy(); options.onError?.(error); return EMPTY_API; }
  return { update, fit, focus, zoom, setTheme, destroy };
}

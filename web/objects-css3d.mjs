/** A DOM-backed 3D scene for browsers without an available WebGL context. */
import * as THREE from './vendor/three/three.module.mjs';
import { OrbitControls } from './vendor/three/OrbitControls.mjs';
import { CSS3DRenderer, CSS3DObject, CSS3DSprite } from './vendor/three/CSS3DRenderer.mjs';

const UNIT = .01;
const SAFE_PREVIEW = /^data:image\/(png|jpeg|webp);base64,/i;
const make = (tag, className, text) => {
  const element = document.createElement(tag); element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

export function mountCompatibility3D(host, options = {}) {
  let disposed = false, frame = 0, generation = 0, ready = false, fitted = false;
  let data = { nodes: [], edges: [], positions: new Map(), groups: [], selectedId: null, ...options };
  let nodes = new Map(), edges = [];
  const renderer = new CSS3DRenderer();
  const viewport = renderer.domElement;
  viewport.className = 'compatibility-3d';
  viewport.dataset.renderer = 'compatibility-3d';
  viewport.setAttribute('aria-label', '3D memory objects. Drag to orbit, or use the fit, focus, and zoom controls.');
  host.append(viewport);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 350);
  camera.position.set(12, 16, 22);
  const controls = new OrbitControls(camera, viewport);
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  controls.enableDamping = !motionQuery.matches; controls.dampingFactor = .09;
  controls.minDistance = 5; controls.maxDistance = 120;
  controls.minPolarAngle = .22; controls.maxPolarAngle = Math.PI / 2 - .10;
  controls.screenSpacePanning = false;
  controls.rotateSpeed = .65; controls.zoomSpeed = .8; controls.panSpeed = .8;
  controls.target.set(0, 1, 0);

  function requestRender() { if (!disposed && !frame) frame = requestAnimationFrame(render); }
  function fail(error) { if (disposed) return; destroy(); options.onError?.(error); }
  function render() {
    frame = 0; if (disposed) return;
    try {
      controls.update(); renderer.render(scene, camera);
      if (ready) { ready = false; options.onReady?.(); }
    } catch (error) { fail(error); }
  }
  controls.addEventListener('change', requestRender);

  function resize() {
    if (disposed) return;
    const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
    camera.aspect = width / height; camera.updateProjectionMatrix();
    renderer.setSize(width, height); requestRender();
  }
  const observer = new ResizeObserver(resize); observer.observe(host);

  function position(id, index = 0) {
    const value = data.positions instanceof Map ? data.positions.get(id) : data.positions?.[id];
    return new THREE.Vector3(Number.isFinite(value?.x) ? value.x : (index % 5 - 2) * 3.6, Number.isFinite(value?.y) ? value.y : 0, Number.isFinite(value?.z) ? value.z : (Math.floor(index / 5) - 1) * 4);
  }
  function attach(element, location, scale = UNIT, sprite = false) {
    const object = sprite ? new CSS3DSprite(element) : new CSS3DObject(element);
    object.position.copy(location); object.scale.setScalar(scale); scene.add(object);
    return object;
  }
  function floorElement(element, location) {
    const object = attach(element, location); object.rotation.x = -Math.PI / 2;
    element.style.pointerEvents = 'none'; return object;
  }
  function resetScene() {
    scene.traverse(object => { if (object.element) object.element.remove(); });
    scene.clear(); nodes.clear(); edges = [];
  }
  function addGround() {
    const floor = make('div', 'c3d-ground'); floorElement(floor, new THREE.Vector3(0, -.075, 0));
    for (const group of data.groups || []) {
      if (![group.x, group.z, group.width, group.depth].every(Number.isFinite)) continue;
      const box = make('div', 'c3d-room');
      box.style.width = `${group.width / UNIT}px`; box.style.height = `${group.depth / UNIT}px`;
      box.append(make('span', 'c3d-room-label', group.label || 'Memories'));
      floorElement(box, new THREE.Vector3(group.x, -.045, group.z));
    }
  }
  function addNode(node, index) {
    const point = position(node.id, index);
    const raw = node.type === 'raw';
    const button = make('button', `c3d-object ${raw ? 'c3d-source' : 'c3d-claim'}`);
    button.type = 'button'; button.dataset.c3dId = node.id;
    button.setAttribute('aria-label', `Inspect ${raw ? 'original source' : 'processed knowledge'}: ${node.title}`);
    button.title = node.title || 'Untitled memory';
    for (let layer = 2; layer >= 0; layer--) button.append(make('span', `c3d-sheet c3d-layer-${layer}`));
    const front = make('span', 'c3d-front');
    let decoded = Promise.resolve();
    if (SAFE_PREVIEW.test(node.previewUrl || '')) {
      const image = make('img', 'c3d-preview'); image.alt = ''; image.draggable = false;
      image.src = node.previewUrl; front.append(image);
      decoded = image.decode().catch(() => { image.remove(); front.append(make('strong', 'c3d-fallback-title', node.title)); front.append(make('span', 'c3d-fallback-text', String(node.text || '').slice(0, 280))); });
    } else {
      front.append(make('strong', 'c3d-fallback-title', node.title));
      front.append(make('span', 'c3d-fallback-text', String(node.text || '').slice(0, 280)));
    }
    button.append(front, make('span', raw ? 'c3d-clip' : 'c3d-status'));
    if (!raw) button.dataset.status = node.status || 'proposed';
    const object = attach(button, point.clone().add(new THREE.Vector3(0, 1.4, 0)));
    object.rotation.x = -.27; object.rotation.y = raw ? -.07 : .035;
    const shadow = make('div', 'c3d-shadow');
    floorElement(shadow, point.clone().add(new THREE.Vector3(0, -.012, .25)));
    const ring = make('div', 'c3d-selection-ring');
    floorElement(ring, point.clone().add(new THREE.Vector3(0, .01, 0)));
    const label = make('button', 'c3d-label');
    label.type = 'button'; label.dataset.c3dId = node.id;
    label.setAttribute('aria-label', `Inspect ${node.title}`);
    label.append(make('small', '', raw ? 'ORIGINAL SOURCE' : 'PROCESSED KNOWLEDGE'), make('strong', '', node.title || 'Untitled memory'));
    attach(label, point.clone().add(new THREE.Vector3(0, 3.05, 0)), UNIT, true);
    nodes.set(node.id, { node, point, object, button, label, ring });
    return decoded;
  }
  function addEdges() {
    for (const edge of data.edges || []) {
      const a = nodes.get(edge.from), b = nodes.get(edge.to);
      if (!a || !b || edge.from === edge.to) continue;
      const delta = b.point.clone().sub(a.point), distance = Math.hypot(delta.x, delta.z);
      const line = make('div', `c3d-edge ${/infer|dream|suggest|propos/.test(edge.type || '') ? 'c3d-inferred' : ''}`);
      line.style.width = `${distance / UNIT}px`;
      const object = attach(line, a.point.clone().lerp(b.point, .5).add(new THREE.Vector3(0, .04, 0)));
      object.rotation.set(-Math.PI / 2, -Math.atan2(delta.z, delta.x), 0, 'YXZ');
      line.style.pointerEvents = 'none';
      edges.push({ edge, line });
    }
  }
  function selection() {
    for (const [id, item] of nodes) {
      const selected = data.selectedId === id;
      item.button.classList.toggle('is-selected', selected);
      item.label.classList.toggle('is-selected', selected);
      item.button.setAttribute('aria-pressed', String(selected));
      item.label.setAttribute('aria-pressed', String(selected));
      item.ring.classList.toggle('is-selected', selected);
    }
    for (const { edge, line } of edges) {
      line.classList.toggle('is-active', data.selectedId === edge.from || data.selectedId === edge.to);
      line.classList.toggle('is-muted', !!data.selectedId && data.selectedId !== edge.from && data.selectedId !== edge.to);
    }
    requestRender();
  }
  function rebuild() {
    const ticket = ++generation; ready = false; resetScene(); addGround();
    const loads = data.nodes.slice(0, 30).map(addNode); addEdges(); selection();
    if (!fitted && nodes.size) { fit(); fitted = true; }
    requestRender();
    Promise.all(loads).then(() => { if (!disposed && ticket === generation) { ready = true; requestRender(); } }).catch(fail);
  }
  function update(next = {}) {
    if (disposed) return;
    const rebuildNeeded = ['nodes', 'edges', 'positions', 'groups'].some(key => next[key] !== undefined);
    data = { ...data, ...next }; if (rebuildNeeded) rebuild(); else selection();
  }
  function fit() {
    if (disposed || !nodes.size) return;
    const bounds = new THREE.Box3(); nodes.forEach(item => bounds.expandByPoint(item.point));
    const center = bounds.getCenter(new THREE.Vector3()); center.y = 1.2;
    const size = bounds.getSize(new THREE.Vector3());
    const radius = Math.max(4.1, Math.sqrt((size.x + 4) ** 2 + (size.z + 4) ** 2) / 2);
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const effectiveFov = Math.min(fov, 2 * Math.atan(Math.tan(fov / 2) * camera.aspect));
    const distance = Math.min(116, radius / Math.sin(effectiveFov / 2));
    controls.target.copy(center);
    camera.position.copy(center).add(new THREE.Vector3(.32, .65, 1).normalize().multiplyScalar(distance));
    controls.update(); requestRender();
  }
  function focus(id) {
    if (disposed || !nodes.has(id)) return;
    const center = nodes.get(id).point.clone().add(new THREE.Vector3(0, 1.3, 0));
    const direction = camera.position.clone().sub(controls.target).normalize();
    controls.target.copy(center); camera.position.copy(center).add(direction.multiplyScalar(8));
    controls.update(); requestRender();
  }
  function zoom(delta) {
    if (disposed || !Number.isFinite(delta)) return;
    const offset = camera.position.clone().sub(controls.target);
    const distance = THREE.MathUtils.clamp(offset.length() * Math.exp(-delta * .18), controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(offset.setLength(distance));
    controls.update(); requestRender();
  }
  function setTheme(theme) { if (!disposed) viewport.dataset.theme = theme === 'dark' ? 'dark' : 'light'; }
  const pointers = new Set(); let pointerStart = null;
  function pointerDown(event) {
    pointers.add(event.pointerId);
    pointerStart = pointers.size === 1 && event.button === 0 ? { x: event.clientX, y: event.clientY, pointer: event.pointerId, id: event.target.closest('[data-c3d-id]')?.dataset.c3dId } : null;
  }
  function pointerMove(event) { if (pointerStart && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 6) pointerStart = null; }
  function pointerUp(event) {
    pointers.delete(event.pointerId); const start = pointerStart; pointerStart = null;
    if (start?.id && start.pointer === event.pointerId && Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 6) options.onSelect?.(start.id);
  }
  function pointerCancel(event) { pointers.delete(event.pointerId); pointerStart = null; }
  function keyClick(event) { if (event.detail === 0) { const id = event.target.closest('[data-c3d-id]')?.dataset.c3dId; if (id) options.onSelect?.(id); } }
  function motionChanged(event) { controls.enableDamping = !event.matches; requestRender(); }
  viewport.addEventListener('pointerdown', pointerDown);
  viewport.addEventListener('pointermove', pointerMove);
  viewport.addEventListener('pointerup', pointerUp);
  viewport.addEventListener('pointercancel', pointerCancel);
  viewport.addEventListener('click', keyClick);
  motionQuery.addEventListener('change', motionChanged);

  function destroy() {
    if (disposed) return; disposed = true; generation++;
    if (frame) cancelAnimationFrame(frame);
    observer.disconnect(); controls.removeEventListener('change', requestRender); controls.dispose();
    viewport.removeEventListener('pointerdown', pointerDown); viewport.removeEventListener('pointermove', pointerMove);
    viewport.removeEventListener('pointerup', pointerUp); viewport.removeEventListener('pointercancel', pointerCancel);
    viewport.removeEventListener('click', keyClick); motionQuery.removeEventListener('change', motionChanged);
    resetScene(); viewport.remove();
  }
  try { resize(); setTheme(document.documentElement.dataset.theme || 'light'); rebuild(); }
  catch (error) { queueMicrotask(() => fail(error)); }
  return { update, fit, focus, zoom, setTheme, destroy };
}

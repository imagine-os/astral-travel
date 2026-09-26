/** A DOM-backed 3D scene for browsers without an available WebGL context. */
import * as THREE from './vendor/three/three.module.mjs';
import { OrbitControls } from './vendor/three/OrbitControls.mjs';
import { CSS3DRenderer, CSS3DObject, CSS3DSprite } from './vendor/three/CSS3DRenderer.mjs';

const UNIT = .01;
const SAFE_PREVIEW = /^data:image\/(png|jpeg|webp);base64,/i;
const OBJECT_TYPES = new Set(['document', 'chat', 'book', 'image', 'video', 'audio', 'code', 'research', 'experiment', 'claim', 'folder', 'network', 'character', 'database', 'service', 'cloud', 'portal']);
const TYPE_LABELS = { document: 'Document', chat: 'Conversation', book: 'Book', image: 'Image notes', video: 'Video notes', audio: 'Audio notes', code: 'Code', research: 'Research', experiment: 'Experiment', claim: 'Knowledge', folder: 'Folder', network: 'Network', character: 'Character', database: 'Database', service: 'Service', cloud: 'Cloud', portal: 'Portal' };
const ICON_PATHS = {
  document: ['M6 3h8l4 4v14H6z', 'M14 3v5h4', 'M9 12h6M9 16h6'],
  chat: ['M4 4h16v12H9l-5 4z', 'M8 8h8M8 12h5'],
  book: ['M5 3h14v18H5a2 2 0 0 1 0-4h14', 'M7 3v14M10 7h6M10 11h4'],
  image: ['M3 4h18v16H3z', 'M3 16l6-6 4 4 3-3 5 5', 'M16 7h.01'],
  video: ['M3 7h18v14H3z', 'M3 7V3h18v4M7 3l-3 4M14 3l-3 4M21 3l-3 4', 'M7 12h10M7 16h6'],
  audio: ['M3 5h18v14H3z', 'M7 9a2 2 0 1 0 .01 0M17 9a2 2 0 1 0 .01 0', 'M8 19l2-4h4l2 4'],
  code: ['M3 4h18v16H3z', 'M3 8h18M7 12l3 2-3 2M13 17h4'],
  research: ['M6 3h13v18H6z', 'M4 6h4M4 10h4M4 14h4M4 18h4', 'M11 7h5M11 11h5M11 15h3'],
  experiment: ['M6 5H4v16h16V5h-2M9 3h6v4H9z', 'M10 10v4l-3 4h10l-3-4v-4M9 16h6'],
  folder: ['M3 7V4h7l3 3h8v14H3z', 'M3 10h18'],
  network: ['M12 9v6M9 12H5m10 0h4', 'M12 3a3 3 0 1 0 .01 0M3 9a3 3 0 1 0 .01 0M21 9a3 3 0 1 0 .01 0M12 18a3 3 0 1 0 .01 0'],
  character: ['M12 3a4 4 0 1 0 .01 0', 'M5 21v-3a7 7 0 0 1 14 0v3M9 19h6'],
  database: ['M3 6c0-4 18-4 18 0s-18 4-18 0v12c0 4 18 4 18 0V6', 'M3 12c0 4 18 4 18 0'],
  service: ['M4 3h16v18H4zM4 9h16M4 15h16', 'M7 6h.01M7 12h.01M7 18h.01M11 6h6M11 12h6M11 18h6'],
  cloud: ['M6 18a5 5 0 1 1 0-10 7 7 0 0 1 13 1 4.5 4.5 0 0 1-1 9z', 'M12 9v6m-3-3 3-3 3 3'],
  portal: ['M12 2a10 10 0 1 0 .01 0M12 5a7 7 0 1 0 .01 0', 'M12 8l1 3 3 1-3 1-1 3-1-3-3-1 3-1z'],
  claim: ['M12 3l9 9-9 9-9-9z', 'M8 12l3 3 5-6']
};
function objectIcon(type) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8'); svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
  for (const d of ICON_PATHS[type] || ICON_PATHS.document) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', d); svg.append(path);
  }
  return svg;
}
const make = (tag, className, text) => {
  const element = document.createElement(tag); element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

// Small CSS solids retain their depth as the camera orbits, including on non-GPU browsers.
// Shapes are original constructions; their typed-object vocabulary follows Graph Gallery.
const SCULPTURE_TYPES = new Set(['folder', 'network', 'character', 'database', 'service', 'cloud', 'portal']);
const TYPE_COLORS = { folder: '#efbb55', network: '#39ada9', character: '#759bdd', database: '#aa89d9', service: '#5c9dbf', cloud: '#9cc9df', portal: '#c09bea' };
function solidRoot(parent, className, x = 0, y = 0, z = 0, rotation = '') {
  const root = make('span', `c3d-solid ${className}`);
  root.style.transform = `translate3d(${x}px,${y}px,${z}px) ${rotation}`;
  parent.append(root); return root;
}
function boxSolid(parent, className, width, height, depth, x = 0, y = 0, z = 0, rotation = '') {
  const root = solidRoot(parent, className, x, y, z, rotation);
  const surfaces = [
    ['front', width, height, `translateZ(${depth / 2}px)`],
    ['back', width, height, `rotateY(180deg) translateZ(${depth / 2}px)`],
    ['right', depth, height, `rotateY(90deg) translateZ(${width / 2}px)`],
    ['left', depth, height, `rotateY(-90deg) translateZ(${width / 2}px)`],
    ['top', width, depth, `rotateX(90deg) translateZ(${height / 2}px)`],
    ['bottom', width, depth, `rotateX(-90deg) translateZ(${height / 2}px)`]
  ];
  for (const [side, w, h, transform] of surfaces) {
    const face = make('span', `c3d-solid-face c3d-face-${side}`);
    face.style.width = `${w}px`; face.style.height = `${h}px`;
    face.style.transform = `translate(-50%,-50%) ${transform}`; root.append(face);
  }
  return root;
}
function cylinderSolid(parent, className, radius, height, x = 0, y = 0, z = 0) {
  const root = solidRoot(parent, className, x, y, z), sides = 16;
  for (let i = 0; i < sides; i++) {
    const angle = i * Math.PI * 2 / sides, face = make('span', 'c3d-cylinder-side');
    face.style.width = `${2 * radius * Math.tan(Math.PI / sides) + .6}px`; face.style.height = `${height}px`;
    face.style.transform = `translate(-50%,-50%) rotateY(${angle}rad) translateZ(${radius}px)`;
    face.style.setProperty('--face-shade', `${Math.round(78 + 22 * Math.cos(angle - .7))}%`); root.append(face);
  }
  for (const sign of [-1, 1]) {
    const cap = make('span', `c3d-cylinder-cap ${sign < 0 ? 'c3d-cap-top' : 'c3d-cap-bottom'}`);
    cap.style.width = cap.style.height = `${radius * 2}px`;
    cap.style.transform = `translate(-50%,-50%) translateY(${sign * height / 2}px) rotateX(${sign < 0 ? 90 : -90}deg)`; root.append(cap);
  }
  return root;
}
function orbSolid(parent, className, radius, x = 0, y = 0, z = 0) {
  const root = solidRoot(parent, className, x, y, z), sectors = 10, bands = 6;
  for (let ring = 0; ring < bands; ring++) {
    const a = -Math.PI / 2 + ring * Math.PI / bands, b = a + Math.PI / bands;
    const r1 = radius * Math.cos(a), r2 = radius * Math.cos(b), y1 = radius * Math.sin(a), y2 = radius * Math.sin(b);
    const dr = (r2 - r1) * Math.cos(Math.PI / sectors), dy = y2 - y1, height = Math.hypot(dr, dy);
    const w1 = 2 * r1 * Math.sin(Math.PI / sectors), w2 = 2 * r2 * Math.sin(Math.PI / sectors), width = Math.max(w1, w2) + .4;
    for (let segment = 0; segment < sectors; segment++) {
      const angle = segment * Math.PI * 2 / sectors, s = Math.sin(angle), c = Math.cos(angle);
      const rad = (r1 + r2) / 2 * Math.cos(Math.PI / sectors);
      const matrix = [c,0,-s,0, s*dr/height,dy/height,c*dr/height,0, s*dy/height,-dr/height,c*dy/height,0, s*rad,(y1+y2)/2,c*rad,1];
      const face = make('span', 'c3d-orb-facet');
      face.style.width = `${width}px`; face.style.height = `${height + .45}px`;
      const top = (1 - w1 / width) * 50, bottom = (1 - w2 / width) * 50;
      face.style.clipPath = `polygon(${top}% 0,${100-top}% 0,${100-bottom}% 100%,${bottom}% 100%)`;
      face.style.transform = `translate(-50%,-50%) matrix3d(${matrix.join(',')})`;
      face.style.setProperty('--face-shade', `${Math.round(71 + 17*c + 12*(-Math.sin((a+b)/2)))}%`);
      root.append(face);
    }
  }
  return root;
}
function rodSolid(parent, start, end, color) {
  const delta = new THREE.Vector3(...end).sub(new THREE.Vector3(...start));
  const center = new THREE.Vector3(...start).addScaledVector(delta, .5);
  const rod = boxSolid(parent, 'c3d-network-rod', 7, delta.length(), 7);
  const matrix = new THREE.Matrix4().compose(center, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), delta.normalize()), new THREE.Vector3(1,1,1));
  rod.style.transform = `matrix3d(${matrix.elements.join(',')})`; rod.style.setProperty('--body-color', color); return rod;
}
function buildSculpture(button, type, node) {
  button.classList.add('c3d-sculpture'); button.style.setProperty('--body-color', TYPE_COLORS[type]);
  const stage = make('span', 'c3d-sculpture-stage'); stage.setAttribute('aria-hidden', 'true'); button.append(stage);
  if (type === 'folder') {
    boxSolid(stage, 'c3d-folder-back', 252, 172, 14, 0, 14, -35);
    boxSolid(stage, 'c3d-folder-tab', 92, 35, 14, -80, -84, -35);
    for (let i = 0; i < 3; i++) boxSolid(stage, 'c3d-folder-paper', 220-i*7, 174, 3, i*5, -5+i*5, -18+i*12, `rotateZ(${i*3-3}deg)`);
    boxSolid(stage, 'c3d-folder-flap', 252, 136, 10, 0, 45, 28, 'rotateX(-12deg)');
  } else if (type === 'network') {
    const points = [[-100,-78,0],[99,-58,15],[-95,65,-5],[95,73,-12],[0,-111,-52]];
    points.forEach(point => rodSolid(stage, [0,0,0], point, '#63a6a4'));
    orbSolid(stage, 'c3d-network-core', 49);
    points.forEach((point,i) => { const orb = orbSolid(stage, 'c3d-network-node', i === 4 ? 22 : 29, ...point); orb.style.setProperty('--body-color', ['#7cc9c0','#f2b866','#85aadd','#bba3df','#ecaaa7'][i]); });
    const emblem = make('span', 'c3d-network-emblem'); emblem.append(objectIcon('network')); stage.append(emblem);
  } else if (type === 'character') {
    const variant = Array.from(String(node.id || node.title || '')).reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % 4;
    stage.style.setProperty('--character-shirt', ['#83a4df','#72b5a3','#d5987d','#a494c7'][variant]);
    stage.style.setProperty('--character-skin', ['#f7d0ac','#ce9878','#edbd96','#b98567'][variant]);
    stage.style.setProperty('--character-hair', ['#765744','#443b42','#946640','#493d38'][variant]);
    cylinderSolid(stage, 'c3d-character-base', 72, 22, 0, 133);
    boxSolid(stage, 'c3d-character-shoe', 39, 24, 55, -25, 106, 10);
    boxSolid(stage, 'c3d-character-shoe', 39, 24, 55, 25, 106, 10);
    boxSolid(stage, 'c3d-character-leg', 28, 36, 32, -24, 77);
    boxSolid(stage, 'c3d-character-leg', 28, 36, 32, 24, 77);
    boxSolid(stage, 'c3d-character-body', 105, 90, 57, 0, 24);
    orbSolid(stage, 'c3d-character-hand', 18, -74, 58, 8);
    orbSolid(stage, 'c3d-character-hand', 18, 75, 30, 8);
    boxSolid(stage, 'c3d-character-arm', 25, 71, 33, -65, 20, 0, 'rotateZ(17deg)');
    boxSolid(stage, 'c3d-character-arm', 25, 66, 33, 64, -2, 0, 'rotateZ(-32deg)');
    orbSolid(stage, 'c3d-character-head', 53, 0, -74, 0);
    for (const [x,y,z,r] of [[-25,-113,-3,24],[1,-119,-7,24],[25,-111,-7,23]]) orbSolid(stage, 'c3d-character-hair', r, x,y,z);
    const face = make('span', 'c3d-friendly-face');
    face.append(make('span', 'c3d-eye c3d-eye-left'), make('span', 'c3d-eye c3d-eye-right'), make('span', 'c3d-smile'));
    if (variant === 1 || variant === 3) face.append(make('span', 'c3d-character-glasses'));
    stage.append(face, make('span', 'c3d-character-collar'), make('span', 'c3d-character-name', String(node.title || 'Guide').split(/[ ·—-]/)[0].slice(0, 10)));
  } else if (type === 'database') {
    for (let i = 0; i < 3; i++) {
      cylinderSolid(stage, 'c3d-database-drum', 81, 57, 0, -72+i*67);
      cylinderSolid(stage, 'c3d-database-rim', 83, 9, 0, -103+i*67);
    }
    for (let i = 0; i < 3; i++) { const lamp = make('span', 'c3d-data-led'); lamp.style.top = `${-73+i*67}px`; stage.append(lamp); }
  } else if (type === 'service') {
    boxSolid(stage, 'c3d-service-chassis', 169, 212, 105, 0, 0, -7);
    boxSolid(stage, 'c3d-service-base', 193, 14, 127, 0, 113, -7);
    for (let i = 0; i < 4; i++) {
      const unit = boxSolid(stage, 'c3d-service-unit', 149, 38, 11, 0, -78+i*50, 52);
      const vent = make('span', 'c3d-service-vent'), led = make('span', 'c3d-service-led');
      unit.append(vent, led);
    }
  } else if (type === 'cloud') {
    cylinderSolid(stage, 'c3d-cloud-base', 108, 22, 0, 78);
    [[0,-24,6,75],[-80,20,0,49],[78,21,0,52],[-38,-54,-19,48],[50,-51,-8,52]].forEach(([x,y,z,r]) => orbSolid(stage, 'c3d-cloud-puff', r, x,y,z));
    const mark = make('span', 'c3d-cloud-mark'); mark.append(objectIcon('cloud')); stage.append(mark);
  } else if (type === 'portal') {
    const rim = make('span', 'c3d-portal-rim'); stage.append(rim);
    for (let i = 0; i < 16; i++) {
      const angle = i * Math.PI / 8;
      const gem = boxSolid(stage, 'c3d-portal-segment', 43, 30, 33, 96*Math.sin(angle), 96*Math.cos(angle)-10, 0, `rotateZ(${-angle}rad)`);
      gem.style.setProperty('--body-color', i % 2 ? '#a884d4' : '#ccb5e6');
    }
    stage.append(make('span', 'c3d-portal-surface'), make('span', 'c3d-portal-star', '✦'));
    cylinderSolid(stage, 'c3d-portal-base', 88, 24, 0, 121);
  }
}

export function mountCompatibility3D(host, options = {}) {
  let disposed = false, frame = 0, generation = 0, ready = false, fitted = false;
  let data = { nodes: [], edges: [], positions: new Map(), groups: [], selectedId: null, ...options };
  let nodes = new Map(), edges = [], pendingFocus = null, drag = null;
  const renderer = new CSS3DRenderer();
  const viewport = renderer.domElement;
  viewport.className = 'compatibility-3d';
  viewport.dataset.renderer = 'compatibility-3d';
  viewport.setAttribute('aria-label', '3D memory objects. Drag an object to move it. Drag the background to orbit. Escape cancels a move.');
  host.append(viewport);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 1600);
  camera.position.set(12, 16, 22);
  const controls = new OrbitControls(camera, viewport);
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  controls.enableDamping = !motionQuery.matches; controls.dampingFactor = .09;
  controls.minDistance = 5; controls.maxDistance = 800;
  controls.minPolarAngle = .22; controls.maxPolarAngle = Math.PI / 2 - .10;
  controls.screenSpacePanning = false;
  controls.rotateSpeed = .65; controls.zoomSpeed = .8; controls.panSpeed = .8;
  controls.target.set(0, 1, 0);

  function requestRender() { if (!disposed && !frame) frame = requestAnimationFrame(render); }
  function fail(error) { if (disposed) return; destroy(); options.onError?.(error); }
  function render() {
    frame = 0; if (disposed) return;
    try {
      if (!drag) controls.update(); renderer.render(scene, camera);
      if (pendingFocus) {
        const restore = pendingFocus; pendingFocus = null;
        const item = nodes.get(restore.id);
        const target = item?.[restore.kind] || nodes.values().next().value?.label;
        target?.focus({ preventScroll: true });
      }
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
    cancelDrag();
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
    const objectType = !raw ? 'claim' : OBJECT_TYPES.has(node.objectType) ? node.objectType : 'document';
    const button = make('button', `c3d-object c3d-kind-${objectType} ${raw ? 'c3d-source' : 'c3d-claim'}`);
    button.type = 'button'; button.tabIndex = -1; button.dataset.c3dId = node.id; button.dataset.objectType = objectType;
    button.setAttribute('aria-label', `Inspect ${raw ? TYPE_LABELS[objectType].toLowerCase() + ' source' : 'processed knowledge'}: ${node.title}`);
    button.title = `${node.title || 'Untitled memory'} · ${TYPE_LABELS[objectType]} · Drag to move`;
    if (SCULPTURE_TYPES.has(objectType)) buildSculpture(button, objectType, node);
    else for (let layer = 2; layer >= 0; layer--) button.append(make('span', `c3d-sheet c3d-layer-${layer}`));
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
    const badge = make('span', 'c3d-type-badge'); badge.append(objectIcon(objectType)); button.append(badge);
    const caption = make('span', 'c3d-type-caption', TYPE_LABELS[objectType]); button.append(caption);
    if (['book', 'research'].includes(objectType)) button.append(make('span', 'c3d-spine'));
    if (objectType === 'research') for (let i = 0; i < 7; i++) { const loop = make('span', 'c3d-binding'); loop.style.top = `${23 + i * 31}px`; button.append(loop); }
    if (objectType === 'chat') button.append(make('span', 'c3d-chat-tail'));
    if (objectType === 'video') button.append(make('span', 'c3d-clapper'));
    if (objectType === 'audio') {
      const reel = make('span', 'c3d-cassette-reels'); reel.append(make('span', 'c3d-reel'), make('span', 'c3d-reel')); button.append(reel);
      button.append(make('span', 'c3d-cassette-base'));
    }
    if (objectType === 'code') button.append(make('span', 'c3d-terminal-bar', '● ● ●'), make('span', 'c3d-terminal-stand'));
    if (objectType === 'experiment') button.append(make('span', 'c3d-clipboard-clip'));
    if (!raw) button.dataset.status = node.status || 'proposed';
    const object = attach(button, point.clone().add(new THREE.Vector3(0, 1.4, 0)));
    object.rotation.x = SCULPTURE_TYPES.has(objectType) ? 0 : -.27; object.rotation.y = raw ? -.07 : .035;
    const shadow = make('div', 'c3d-shadow');
    const shadowObject = floorElement(shadow, point.clone().add(new THREE.Vector3(0, -.012, .25)));
    const ring = make('div', 'c3d-selection-ring');
    const ringObject = floorElement(ring, point.clone().add(new THREE.Vector3(0, .01, 0)));
    const label = make('button', 'c3d-label');
    label.type = 'button'; label.dataset.c3dId = node.id;
    label.setAttribute('aria-label', `Inspect ${node.title}`);
    label.append(make('small', '', raw ? `SOURCE · ${TYPE_LABELS[objectType].toUpperCase()}` : 'PROCESSED KNOWLEDGE'), make('strong', '', node.title || 'Untitled memory'));
    const labelIcon = make('span', 'c3d-label-icon'); labelIcon.append(objectIcon(objectType)); label.prepend(labelIcon);
    const labelObject = attach(label, point.clone().add(new THREE.Vector3(0, 3.05, 0)), UNIT, true);
    nodes.set(node.id, { node, point, object, button, label, ring, labelObject, shadowObject, ringObject });
    return decoded;
  }
  function addEdges() {
    for (const edge of data.edges || []) {
      const a = nodes.get(edge.from), b = nodes.get(edge.to);
      if (!a || !b || edge.from === edge.to) continue;
      const line = make('div', `c3d-edge ${/infer|dream|suggest|propos/.test(edge.type || '') ? 'c3d-inferred' : ''}`);
      const object = attach(line, new THREE.Vector3());
      line.style.pointerEvents = 'none';
      const connection = { edge, line, object }; edges.push(connection); updateEdge(connection);
    }
  }
  function updateEdge({ edge, line, object }) {
    const a = nodes.get(edge.from), b = nodes.get(edge.to); if (!a || !b) return;
    const delta = b.point.clone().sub(a.point);
    line.style.width = `${Math.hypot(delta.x, delta.z) / UNIT}px`;
    object.position.copy(a.point).lerp(b.point, .5).add(new THREE.Vector3(0, .04, 0));
    object.rotation.set(-Math.PI / 2, -Math.atan2(delta.z, delta.x), 0, 'YXZ');
  }
  function moveNode(id, point) {
    const item = nodes.get(id); if (!item) return;
    const delta = point.clone().sub(item.point); item.point.copy(point);
    for (const key of ['object', 'labelObject', 'shadowObject', 'ringObject']) item[key].position.add(delta);
    for (const connection of edges) if (connection.edge.from === id || connection.edge.to === id) updateEdge(connection);
    requestRender();
  }
  function selection() {
    viewport.dataset.moveEnabled = String(data.moveEnabled !== false);
    for (const [id, item] of nodes) {
      item.button.title = `${item.node.title || 'Untitled memory'} · ${TYPE_LABELS[item.button.dataset.objectType]}${data.moveEnabled === false ? '' : ' · Drag to move'}`;
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
    const active = document.activeElement;
    if (viewport.contains(active) && active?.dataset?.c3dId) {
      pendingFocus = { id: active.dataset.c3dId, kind: active.classList.contains('c3d-label') ? 'label' : 'button' };
    }
    const ticket = ++generation; ready = false; resetScene(); addGround();
    const loads = data.nodes.slice(0, 60).map(addNode); addEdges(); selection();
    if (!fitted && nodes.size) { fit(); fitted = true; }
    requestRender();
    Promise.all(loads).then(() => { if (!disposed && ticket === generation) { ready = true; requestRender(); } }).catch(fail);
  }
  function update(next = {}) {
    if (disposed) return;
    const rebuildNeeded = ['nodes', 'edges', 'positions', 'groups'].some(key => next[key] !== undefined);
    if (next.moveEnabled === false) cancelDrag();
    data = { ...data, ...next }; if (rebuildNeeded) rebuild(); else selection();
  }
  function fit() {
    if (disposed || drag || !nodes.size) return;
    const bounds = new THREE.Box3();
    for (const item of nodes.values()) bounds.expandByPoint(item.point);
    const center = bounds.getCenter(new THREE.Vector3()); center.y = 1.2;
    const direction = new THREE.Vector3(.32, .65, 1).normalize();
    camera.position.copy(center).addScaledVector(direction, 20);
    camera.lookAt(center); camera.updateMatrixWorld(true);
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    const corners = [];
    for (const item of nodes.values()) {
      const point = item.point;
      // Every sculptural body, including folder tabs, figure hands, and orbiting network hubs.
      for (const x of [-1.7, 1.7]) for (const y of [-.2, 3.0]) for (const z of [-1.05, 1.05]) {
        corners.push(point.clone().add(new THREE.Vector3(x, y, z)));
      }
      // The selection footprint and the title sprite are also visible objects.
      for (const x of [-1.56, 1.56]) for (const z of [-1.46, 1.46]) {
        corners.push(point.clone().add(new THREE.Vector3(x, -.02, z)));
      }
      const labelCenter = point.clone().add(new THREE.Vector3(0, 3.05, 0));
      for (const x of [-1.49, 1.49]) for (const y of [-.36, .36]) {
        corners.push(labelCenter.clone().addScaledVector(right, x).addScaledVector(up, y));
      }
    }
    const projected = new THREE.Vector3();
    function fits(distance) {
      camera.position.copy(center).addScaledVector(direction, distance);
      camera.updateMatrixWorld(true);
      return corners.every(corner => {
        projected.copy(corner).project(camera);
        return Math.abs(projected.x) <= .85 && Math.abs(projected.y) <= .85 && projected.z >= -1 && projected.z <= 1;
      });
    }
    let near = controls.minDistance, far = controls.maxDistance;
    if (fits(near)) far = near;
    else for (let iteration = 0; iteration < 30; iteration++) {
      const middle = (near + far) / 2;
      if (fits(middle)) far = middle; else near = middle;
    }
    controls.target.copy(center);
    camera.position.copy(center).addScaledVector(direction, far);
    controls.update(); requestRender();
  }

  function focus(id) {
    if (disposed || drag || !nodes.has(id)) return;
    const center = nodes.get(id).point.clone().add(new THREE.Vector3(0, 1.3, 0));
    const direction = camera.position.clone().sub(controls.target).normalize();
    controls.target.copy(center); camera.position.copy(center).add(direction.multiplyScalar(8));
    controls.update(); requestRender();
  }
  function zoom(delta) {
    if (disposed || drag || !Number.isFinite(delta)) return;
    const offset = camera.position.clone().sub(controls.target);
    const distance = THREE.MathUtils.clamp(offset.length() * Math.exp(-delta * .18), controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(offset.setLength(distance));
    controls.update(); requestRender();
  }
  function setTheme(theme) { if (!disposed) viewport.dataset.theme = theme === 'dark' ? 'dark' : 'light'; }
  const pointers = new Set(); let pointerStart = null;
  const raycaster = new THREE.Raycaster(), floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  function floorPoint(event) {
    const rect = viewport.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    camera.updateMatrixWorld(true);
    raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
    return raycaster.ray.intersectPlane(floorPlane, new THREE.Vector3());
  }
  function releaseDrag() {
    const ending = drag; if (!ending) return null;
    drag = null; controls.enabled = ending.controlsEnabled;
    viewport.classList.remove('is-dragging');
    nodes.get(ending.id)?.button.classList.remove('is-moving');
    nodes.get(ending.id)?.label.classList.remove('is-moving');
    if (viewport.hasPointerCapture(ending.pointer)) viewport.releasePointerCapture(ending.pointer);
    if (ending.moved) data.onDragState?.(false);
    requestRender(); return ending;
  }
  function cancelDrag() {
    if (!drag) return;
    moveNode(drag.id, drag.origin); pointerStart = null; releaseDrag();
  }
  function pointerDown(event) {
    pointers.add(event.pointerId);
    if (drag) { event.preventDefault(); event.stopImmediatePropagation(); return; }
    const id = event.target.closest('[data-c3d-id]')?.dataset.c3dId;
    pointerStart = pointers.size === 1 && event.button === 0 ? { x: event.clientX, y: event.clientY, pointer: event.pointerId, id } : null;
    if (!pointerStart?.id || data.moveEnabled === false || !nodes.has(id)) return;
    // A capture listener wins ownership before OrbitControls receives this pointer.
    const point = floorPoint(event); if (!point) return;
    const origin = nodes.get(id).point.clone();
    drag = { ...pointerStart, origin, offset: origin.clone().sub(point), moved: false, controlsEnabled: controls.enabled };
    controls.enabled = false; pendingFocus = null;
    viewport.setPointerCapture(event.pointerId); event.stopImmediatePropagation();
  }
  function pointerMove(event) {
    if (drag && event.pointerId === drag.pointer) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 5) return;
      const point = floorPoint(event); if (!point) return;
      if (!drag.moved) {
        drag.moved = true; viewport.classList.add('is-dragging');
        nodes.get(drag.id)?.button.classList.add('is-moving'); nodes.get(drag.id)?.label.classList.add('is-moving');
        data.onDragState?.(true);
      }
      point.add(drag.offset); point.x = THREE.MathUtils.clamp(point.x, -100, 100); point.y = 0; point.z = THREE.MathUtils.clamp(point.z, -100, 100);
      moveNode(drag.id, point); return;
    }
    if (pointerStart && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) >= 5) pointerStart = null;
  }
  function pointerUp(event) {
    pointers.delete(event.pointerId);
    if (drag && event.pointerId === drag.pointer) {
      event.preventDefault(); event.stopImmediatePropagation(); pointerStart = null;
      const ending = releaseDrag();
      if (ending.moved) {
        const point = nodes.get(ending.id)?.point;
        if (point) {
          const saved = { x: point.x, y: 0, z: point.z };
          const positions = data.positions instanceof Map ? new Map(data.positions) : new Map(Object.entries(data.positions || {}));
          positions.set(ending.id, saved); data = { ...data, positions };
          data.onMove?.(ending.id, saved);
        }
      } else data.onSelect?.(ending.id);
      return;
    }
    const start = pointerStart; pointerStart = null;
    if (start?.id && start.pointer === event.pointerId && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 5) data.onSelect?.(start.id);
  }
  function pointerCancel(event) { pointers.delete(event.pointerId); if (drag?.pointer === event.pointerId) cancelDrag(); pointerStart = null; }
  function captureLost(event) { if (drag?.pointer === event.pointerId) cancelDrag(); }
  function keyDown(event) {
    if (event.key === 'Escape' && drag) { event.preventDefault(); event.stopImmediatePropagation(); cancelDrag(); }
  }
  function keyClick(event) { if (event.detail === 0 && !drag) { const id = event.target.closest('[data-c3d-id]')?.dataset.c3dId; if (id) data.onSelect?.(id); } }
  function keyboardFocus(event) {
    const label = event.target.closest('.c3d-label');
    if (label && !drag && !pointers.size && label.matches(':focus-visible')) focus(label.dataset.c3dId);
  }
  function motionChanged(event) { controls.enableDamping = !event.matches; requestRender(); }
  viewport.addEventListener('pointerdown', pointerDown, true);
  viewport.addEventListener('pointermove', pointerMove, true);
  viewport.addEventListener('pointerup', pointerUp, true);
  viewport.addEventListener('pointercancel', pointerCancel, true);
  viewport.addEventListener('lostpointercapture', captureLost);
  document.addEventListener('keydown', keyDown, true);
  viewport.addEventListener('click', keyClick);
  viewport.addEventListener('focusin', keyboardFocus);
  motionQuery.addEventListener('change', motionChanged);

  function destroy() {
    if (disposed) return; cancelDrag(); disposed = true; generation++;
    if (frame) cancelAnimationFrame(frame);
    observer.disconnect(); controls.removeEventListener('change', requestRender); controls.dispose();
    viewport.removeEventListener('pointerdown', pointerDown, true); viewport.removeEventListener('pointermove', pointerMove, true);
    viewport.removeEventListener('pointerup', pointerUp, true); viewport.removeEventListener('pointercancel', pointerCancel, true);
    viewport.removeEventListener('lostpointercapture', captureLost); document.removeEventListener('keydown', keyDown, true);
    viewport.removeEventListener('click', keyClick); viewport.removeEventListener('focusin', keyboardFocus);
    motionQuery.removeEventListener('change', motionChanged);
    resetScene(); viewport.remove();
  }
  try { resize(); setTheme(document.documentElement.dataset.theme || 'light'); rebuild(); }
  catch (error) { queueMicrotask(() => fail(error)); }
  return { update, fit, focus, zoom, setTheme, destroy };
}

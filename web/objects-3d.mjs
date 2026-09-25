/**
 * A local, on-demand Three.js memory scene. Records remain ordinary application
 * data; this module owns only their presentation and releases all GPU resources.
 * Three.js is vendored under its MIT license in ./vendor/three/.
 */
import * as THREE from './vendor/three/three.module.mjs';
import { OrbitControls } from './vendor/three/OrbitControls.mjs';

const THEMES = {
  light: { background: '#f6f5fb', ground: '#f4f2fa', grid: '#ddd9ec', ink: '#302641', muted: '#706580', label: '#ffffff', paper: '#fffdf9', tablet: '#8b75cc', accent: '#7256c2', edge: '#aaa0c2', selected: '#6650c1', shadow: '#6e5c92' },
  dark: { background: '#101121', ground: '#161729', grid: '#343248', ink: '#f4efff', muted: '#b8aecb', label: '#242337', paper: '#e9e4f5', tablet: '#8f77d9', accent: '#b49cff', edge: '#75668d', selected: '#ccbaff', shadow: '#000000' }
};
const EMPTY_API = Object.freeze({ update() {}, fit() {}, focus() {}, zoom() {}, setTheme() {}, destroy() {} });
const Y_AXIS = new THREE.Vector3(0, 1, 0);

function disposeTree(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  textures.forEach(texture => texture.dispose());
  materials.forEach(material => material.dispose());
  geometries.forEach(geometry => geometry.dispose());
  root.clear();
}

function roundedPath(context, x, y, width, height, radius) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function shorten(context, input, maxWidth) {
  let output = String(input || '').replace(/\s+/g, ' ').trim();
  if (context.measureText(output).width <= maxWidth) return output;
  while (output.length > 1 && context.measureText(`${output}…`).width > maxWidth) output = output.slice(0, -1);
  return `${output}…`;
}

function canvasTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function labelTexture(node, colors, selected) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 240;
  const context = canvas.getContext('2d');
  context.fillStyle = colors.label;
  context.shadowColor = 'rgba(40, 25, 75, .14)';
  context.shadowBlur = 16; context.shadowOffsetY = 5;
  roundedPath(context, 12, 10, 1000, 208, 40); context.fill();
  context.shadowColor = 'transparent';
  context.strokeStyle = selected ? colors.selected : colors.grid;
  context.lineWidth = selected ? 7 : 3;
  roundedPath(context, 12, 10, 1000, 208, 40); context.stroke();
  context.fillStyle = node.type === 'raw' ? '#587cbb' : colors.accent;
  context.font = '600 34px system-ui, sans-serif';
  const typeLabel = node.type === 'raw' ? 'ORIGINAL SOURCE' : 'PROCESSED KNOWLEDGE';
  context.fillText(typeLabel, 42, 67);
  context.fillStyle = colors.ink;
  context.font = '600 53px system-ui, sans-serif';
  context.fillText(shorten(context, node.title || 'Untitled memory', 915), 42, 148);
  return canvasTexture(canvas);
}

function fallbackPreview(node) {
  const canvas = document.createElement('canvas');
  canvas.width = 600; canvas.height = 760;
  const context = canvas.getContext('2d');
  context.fillStyle = '#fffefb'; context.fillRect(0, 0, 600, 760);
  context.fillStyle = node.type === 'raw' ? '#4776b3' : '#7453ba';
  context.fillRect(38, 42, 60, 7);
  context.font = '600 22px system-ui, sans-serif';
  context.fillText(node.type === 'raw' ? 'ORIGINAL SOURCE' : 'PROCESSED KNOWLEDGE', 38, 92);
  context.fillStyle = '#302641'; context.font = '600 35px system-ui, sans-serif';
  const words = String(node.title || 'Untitled memory').split(/\s+/);
  let line = '', lineY = 158;
  for (const word of words) {
    if (context.measureText(`${line} ${word}`).width > 520 && line) {
      context.fillText(line, 38, lineY); lineY += 46; line = word;
      if (lineY > 250) break;
    } else line = `${line} ${word}`.trim();
  }
  context.fillText(shorten(context, line, 520), 38, lineY);
  lineY += 66;
  context.fillStyle = '#6c6479'; context.font = '25px system-ui, sans-serif';
  line = '';
  for (const word of String(node.text || '').split(/\s+/)) {
    if (context.measureText(`${line} ${word}`).width > 518 && line) {
      context.fillText(line, 38, lineY); lineY += 36; line = word;
      if (lineY > 625) break;
    } else line = `${line} ${word}`.trim();
  }
  if (lineY <= 625) context.fillText(shorten(context, line, 518), 38, lineY);
  context.fillStyle = '#8e849f'; context.font = '20px system-ui, sans-serif';
  context.fillText(shorten(context, (node.tags || []).map(tag => `#${tag}`).join('  '), 520), 38, 710);
  return canvasTexture(canvas);
}

function tabletGeometry(width, height, depth) {
  const radius = .13, x = -width / 2, y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y); shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius); shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height); shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius); shape.quadraticCurveTo(x, y, x + radius, y);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: .04, bevelThickness: .035, bevelSegments: 3, curveSegments: 5 });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

/**
 * @param {HTMLElement} host An element with a definite CSS height.
 * @param {object} options nodes, edges, positions (Map or keyed object), selectedId,
 * onSelect(id), onReady(), and onError(Error). All preview URLs must be local
 * data:image PNG/JPEG/WebP URLs; no record content is sent over the network.
 * @returns {{update:Function,fit:Function,focus:Function,zoom:Function,setTheme:Function,destroy:Function}}
 */
export function mountObjects3D(host, options = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  } catch (error) {
    queueMicrotask(() => options.onError?.(new Error('The 3D view could not start on this device.', { cause: error })));
    return EMPTY_API;
  }

  let disposed = false, failed = false, frame = 0, generation = 0, fitted = false;
  let theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  let data = { nodes: [], edges: [], groups: [], positions: new Map(), selectedId: null, ...options };
  let cancelImages = [];
  let nodeObjects = new Map(), edgeObjects = [], targets = [];
  let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scene = new THREE.Scene();
  const world = new THREE.Group(); scene.add(world);
  const stage = new THREE.Group(); scene.add(stage);
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 300);
  camera.position.set(12, 16, 22);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  const canvas = renderer.domElement;
  canvas.className = 'objects3d-canvas';
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none;';
  canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = !reducedMotion;
  controls.dampingFactor = .09;
  controls.minDistance = 5;
  controls.maxDistance = 120;
  controls.minPolarAngle = .22;
  controls.maxPolarAngle = Math.PI / 2 - .08;
  controls.screenSpacePanning = false;
  controls.rotateSpeed = .65;
  controls.zoomSpeed = .8;
  controls.panSpeed = .8;
  controls.target.set(0, .9, 0);

  scene.add(new THREE.HemisphereLight('#ffffff', '#a098b7', 2.5));
  const keyLight = new THREE.DirectionalLight('#fff7ec', 3.2);
  keyLight.position.set(-10, 20, 12);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.left = -22; keyLight.shadow.camera.right = 22;
  keyLight.shadow.camera.top = 22; keyLight.shadow.camera.bottom = -22;
  keyLight.shadow.camera.near = 1; keyLight.shadow.camera.far = 75;
  keyLight.shadow.bias = -.0005;
  keyLight.shadow.normalBias = .035;
  scene.add(keyLight, keyLight.target);
  const rimLight = new THREE.DirectionalLight('#c7c0ff', 1.4);
  rimLight.position.set(12, 10, -12); scene.add(rimLight);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), new THREE.MeshStandardMaterial({ color: THEMES[theme].ground, roughness: .97, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.06; floor.receiveShadow = true; stage.add(floor);
  const grid = new THREE.GridHelper(80, 40, THEMES[theme].grid, THEMES[theme].grid);
  grid.material.transparent = true; grid.material.opacity = .5; grid.material.depthWrite = false;
  grid.position.y = -.035; stage.add(grid);

  function fail(error) {
    if (disposed || failed) return;
    failed = true;
    destroy();
    options.onError?.(error instanceof Error ? error : new Error('The 3D view is unavailable.'));
  }

  function requestRender() {
    if (!disposed && !failed && !frame) frame = requestAnimationFrame(renderFrame);
  }

  function renderFrame() {
    frame = 0;
    if (disposed || failed) return;
    try {
      // OrbitControls emits change only while its damping still moves the camera.
      // No RAF is retained after the view settles.
      controls.update();
      renderer.render(scene, camera);
    } catch (error) { fail(error); }
  }
  controls.addEventListener('change', requestRender);

  function resize() {
    if (disposed) return;
    const width = Math.max(host.clientWidth, 1), height = Math.max(host.clientHeight, 1);
    if (width <= 1 || height <= 1) return;
    camera.aspect = width / height; camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    requestRender();
  }
  const observer = new ResizeObserver(resize); observer.observe(host);

  function location(id, index = 0) {
    const value = data.positions instanceof Map ? data.positions.get(id) : data.positions?.[id];
    return new THREE.Vector3(Number.isFinite(value?.x) ? value.x : (index % 5 - 2) * 3.5, Number.isFinite(value?.y) ? value.y : 0, Number.isFinite(value?.z) ? value.z : (Math.floor(index / 5) - 1) * 4);
  }

  function usePreview(node, material, currentGeneration) {
    if (!/^data:image\/(png|jpeg|webp);base64,/i.test(node.previewUrl || '')) return Promise.resolve();
    return new Promise(resolve => {
      const image = new Image();
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true; image.onload = null; image.onerror = null; resolve();
      };
      const cancel = () => { finish(); image.src = ''; };
      cancelImages.push(cancel);
      image.onload = () => {
        try {
          if (!disposed && currentGeneration === generation) {
            const texture = new THREE.Texture(image);
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
            texture.needsUpdate = true;
            material.map?.dispose(); material.map = texture; material.needsUpdate = true;
            renderer.initTexture(texture);
            requestRender();
          }
        } catch (error) { fail(error); }
        finally { finish(); }
      };
      image.onerror = finish; // The locally generated text preview remains usable.
      image.src = node.previewUrl;
    });
  }

  function makeObject(node, index, currentGeneration) {
    const colors = THEMES[theme];
    const group = new THREE.Group(); group.position.copy(location(node.id, index));
    group.userData.id = node.id;
    const object = new THREE.Group(); object.position.set(0, 1.35, 0);
    object.rotation.x = -.32;
    object.rotation.y = node.type === 'raw' ? -.08 : .04;
    group.add(object);
    const isRaw = node.type === 'raw';
    if (isRaw) {
      // Three thin offset pages and a small brass clip read as a document stack.
      for (let page = 2; page >= 0; page--) {
        const sheet = new THREE.Mesh(new THREE.BoxGeometry(1.96, 2.5, .065), new THREE.MeshStandardMaterial({ color: page ? '#e2dfeb' : colors.paper, roughness: .78 }));
        sheet.position.set(page * .065, -page * .025, -page * .07);
        sheet.rotation.z = page * -.025;
        sheet.castShadow = true; sheet.receiveShadow = true; object.add(sheet);
        targets.push(sheet);
      }
      const clip = new THREE.Mesh(new THREE.BoxGeometry(.42, .09, .18), new THREE.MeshStandardMaterial({ color: '#b59b6a', metalness: .55, roughness: .35 }));
      clip.position.set(-.42, 1.26, .015); clip.castShadow = true; object.add(clip);
    } else {
      const tablet = new THREE.Mesh(tabletGeometry(2.05, 2.62, .20), new THREE.MeshPhysicalMaterial({ color: colors.tablet, metalness: .16, roughness: .26, clearcoat: 1, clearcoatRoughness: .16, transparent: true, opacity: .90 }));
      tablet.castShadow = true; tablet.receiveShadow = true;
      object.add(tablet); targets.push(tablet);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(.69, .88, .14, 32), new THREE.MeshStandardMaterial({ color: theme === 'dark' ? '#49405d' : '#e3ddf0', metalness: .22, roughness: .5 }));
      foot.position.set(0, .05, .1); foot.castShadow = true; group.add(foot);
      const indicator = new THREE.Mesh(new THREE.SphereGeometry(.045, 10, 8), new THREE.MeshBasicMaterial({ color: node.status === 'verified' ? '#77b494' : '#d7ae65' }));
      indicator.position.set(.78, 1.12, .145); object.add(indicator);
    }
    const face = new THREE.Mesh(new THREE.PlaneGeometry(isRaw ? 1.82 : 1.83, isRaw ? 2.32 : 2.28), new THREE.MeshBasicMaterial({ map: fallbackPreview(node), toneMapped: false, side: THREE.FrontSide }));
    face.position.z = isRaw ? .038 : .145;
    face.position.y = isRaw ? -.015 : -.03;
    object.add(face); targets.push(face);
    const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(isRaw ? 2.05 : 2.18, isRaw ? 2.6 : 2.75, isRaw ? .27 : .32)), new THREE.LineBasicMaterial({ color: colors.selected, transparent: true, opacity: .85 }));
    outline.visible = node.id === data.selectedId; outline.position.z = -.025; object.add(outline);
    const halo = new THREE.Mesh(new THREE.RingGeometry(1.40, 1.46, 64), new THREE.MeshBasicMaterial({ color: colors.selected, transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false }));
    halo.rotation.x = -Math.PI / 2; halo.position.y = .025; halo.visible = node.id === data.selectedId; group.add(halo);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(node, colors, node.id === data.selectedId), transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    label.scale.set(3.05, .715, 1); label.position.set(0, 3.08, .08); label.renderOrder = 20;
    group.add(label); targets.push(label);
    group.traverse(child => { child.userData.id = node.id; });
    world.add(group);
    nodeObjects.set(node.id, { group, node, outline, halo, label });
    return usePreview(node, face.material, currentGeneration);
  }

  function makeEdges() {
    const colors = THEMES[theme];
    for (const edge of data.edges) {
      const from = nodeObjects.get(edge.from), to = nodeObjects.get(edge.to);
      if (!from || !to || edge.from === edge.to) continue;
      const start = from.group.position.clone().add(new THREE.Vector3(0, .34, 0));
      const end = to.group.position.clone().add(new THREE.Vector3(0, .34, 0));
      const distance = start.distanceTo(end);
      const middle = start.clone().lerp(end, .5); middle.y += Math.min(2.1, .4 + distance * .10);
      const curve = new THREE.QuadraticBezierCurve3(start, middle, end);
      const inferred = /infer|dream|suggest|propos/.test(edge.type || '');
      let line;
      if (inferred) {
        const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(60));
        line = new THREE.Line(geometry, new THREE.LineDashedMaterial({ color: '#bc9857', dashSize: .17, gapSize: .10, transparent: true, opacity: .6 }));
        line.computeLineDistances();
      } else {
        line = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, .026, 5, false), new THREE.MeshBasicMaterial({ color: colors.edge, transparent: true, opacity: .55, depthWrite: false }));
      }
      const arrow = new THREE.Mesh(new THREE.ConeGeometry(.095, .24, 8), new THREE.MeshBasicMaterial({ color: inferred ? '#bc9857' : colors.edge, transparent: true, opacity: .8, depthWrite: false }));
      arrow.position.copy(curve.getPoint(.73)); arrow.quaternion.setFromUnitVectors(Y_AXIS, curve.getTangent(.73).normalize());
      world.add(line, arrow); edgeObjects.push({ edge, line, arrow, inferred });
    }
  }

  function makeGroups() {
    const colors = THEMES[theme];
    for (const group of data.groups || []) {
      if (![group.x, group.z, group.width, group.depth].every(Number.isFinite)) continue;
      const { x, z, width, depth } = group;
      if (width <= 0 || depth <= 0) continue;
      const patch = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshBasicMaterial({ color: theme === 'dark' ? '#a992df' : '#b6a4db', transparent: true, opacity: theme === 'dark' ? .055 : .075, depthWrite: false }));
      patch.rotation.x = -Math.PI / 2; patch.position.set(x, -.026, z); world.add(patch);
      const points = [new THREE.Vector3(x - width / 2, -.015, z - depth / 2), new THREE.Vector3(x + width / 2, -.015, z - depth / 2), new THREE.Vector3(x + width / 2, -.015, z + depth / 2), new THREE.Vector3(x - width / 2, -.015, z + depth / 2)];
      const border = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: colors.accent, transparent: true, opacity: .16 }));
      world.add(border);
      const labelCanvas = document.createElement('canvas'); labelCanvas.width = 1024; labelCanvas.height = 128;
      const context = labelCanvas.getContext('2d');
      context.fillStyle = colors.muted; context.font = '600 54px system-ui, sans-serif';
      context.fillText(shorten(context, String(group.label || '').toUpperCase(), 980), 20, 84);
      const label = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(width - .4, 5.6), .64), new THREE.MeshBasicMaterial({ map: canvasTexture(labelCanvas), transparent: true, depthWrite: false, toneMapped: false }));
      label.rotation.x = -Math.PI / 2; label.position.set(x, .015, z - depth / 2 + .45); world.add(label);
    }
  }

  function refreshSelection() {
    const colors = THEMES[theme];
    for (const [id, item] of nodeObjects) {
      const selected = id === data.selectedId;
      if (item.outline.visible !== selected) {
        item.label.material.map.dispose();
        item.label.material.map = labelTexture(item.node, colors, selected);
        item.label.material.needsUpdate = true;
      }
      item.outline.visible = selected; item.halo.visible = selected;
    }
    for (const { edge, line, arrow, inferred } of edgeObjects) {
      const active = !!data.selectedId && (edge.from === data.selectedId || edge.to === data.selectedId);
      const color = active ? colors.selected : inferred ? '#bc9857' : colors.edge;
      line.material.color.set(color); arrow.material.color.set(color);
      line.material.opacity = active ? .95 : data.selectedId ? .20 : .52;
      arrow.material.opacity = active ? 1 : data.selectedId ? .22 : .65;
    }
    requestRender();
  }

  function rebuild() {
    generation++;
    const currentGeneration = generation;
    cancelImages.forEach(cancel => cancel()); cancelImages = [];
    disposeTree(world);
    nodeObjects = new Map(); edgeObjects = []; targets = [];
    makeGroups();
    const loads = data.nodes.slice(0, 30).map((node, index) => makeObject(node, index, currentGeneration));
    makeEdges(); refreshSelection(); renderer.shadowMap.needsUpdate = true;
    if (!fitted && nodeObjects.size) { fit(); fitted = true; }
    requestRender();
    Promise.all(loads).then(() => {
      if (disposed || currentGeneration !== generation) return;
      requestRender();
      // Previews are decoded and uploaded before the host reports a ready view.
      options.onReady?.();
    }).catch(fail);
  }

  function update(next = {}) {
    if (disposed) return;
    const rebuildNeeded = next.nodes !== undefined || next.edges !== undefined || next.positions !== undefined || next.groups !== undefined;
    data = { ...data, ...next };
    if (rebuildNeeded) rebuild(); else refreshSelection();
  }

  function fit() {
    if (disposed || !nodeObjects.size) return;
    const bounds = new THREE.Box3();
    for (const { group } of nodeObjects.values()) bounds.expandByPoint(group.position);
    const center = bounds.getCenter(new THREE.Vector3()); center.y = 1.1;
    const size = bounds.getSize(new THREE.Vector3());
    const radius = Math.max(4.3, Math.sqrt((size.x + 4) ** 2 + (size.z + 4) ** 2) / 2);
    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const effectiveFov = Math.min(verticalFov, 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect));
    const distance = Math.min(116, radius / Math.sin(effectiveFov / 2) * 1.05);
    controls.target.copy(center);
    camera.position.copy(center).add(new THREE.Vector3(.38, .78, 1).normalize().multiplyScalar(distance));
    controls.update(); requestRender();
  }

  function focus(id) {
    if (disposed) return;
    const item = nodeObjects.get(id); if (!item) return;
    const center = item.group.position.clone().add(new THREE.Vector3(0, 1.2, 0));
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

  function setTheme(nextTheme) {
    if (disposed) return;
    const next = nextTheme === 'dark' ? 'dark' : 'light';
    const changed = theme !== next; theme = next;
    const colors = THEMES[theme];
    scene.background = new THREE.Color(colors.background);
    scene.fog = new THREE.Fog(colors.background, 75, 180);
    floor.material.color.set(colors.ground);
    grid.material.color.set(colors.grid);
    renderer.toneMappingExposure = theme === 'dark' ? 1.05 : 1.25;
    if (changed) rebuild(); else requestRender();
  }

  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  let pointerStart = null;
  const activePointers = new Set();
  function hit(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(targets, false)[0]?.object.userData.id || null;
  }
  function pointerDown(event) {
    activePointers.add(event.pointerId);
    pointerStart = activePointers.size === 1 && event.button === 0 ? { x: event.clientX, y: event.clientY, id: event.pointerId } : null;
  }
  function pointerMove(event) {
    if (activePointers.size) {
      if (pointerStart && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 6) pointerStart = null;
      return;
    }
    canvas.style.cursor = hit(event) ? 'pointer' : 'grab';
  }
  function pointerUp(event) {
    activePointers.delete(event.pointerId);
    const start = pointerStart; pointerStart = null;
    if (!start || start.id !== event.pointerId || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) return;
    const id = hit(event);
    if (id) options.onSelect?.(id);
  }
  function pointerCancel(event) { activePointers.delete(event.pointerId); pointerStart = null; }
  function contextLost(event) { event.preventDefault(); fail(new Error('The device lost its 3D graphics context. Use the card or list view to continue.')); }
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerCancel);
  canvas.addEventListener('webglcontextlost', contextLost);
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  function motionChanged(event) { reducedMotion = event.matches; controls.enableDamping = !reducedMotion; requestRender(); }
  motionQuery.addEventListener('change', motionChanged);

  function destroy() {
    if (disposed) return;
    disposed = true; generation++;
    if (frame) cancelAnimationFrame(frame);
    cancelImages.forEach(cancel => cancel()); cancelImages = [];
    observer.disconnect();
    controls.removeEventListener('change', requestRender); controls.dispose();
    canvas.removeEventListener('pointerdown', pointerDown);
    canvas.removeEventListener('pointermove', pointerMove);
    canvas.removeEventListener('pointerup', pointerUp);
    canvas.removeEventListener('pointercancel', pointerCancel);
    canvas.removeEventListener('webglcontextlost', contextLost);
    motionQuery.removeEventListener('change', motionChanged);
    disposeTree(world); disposeTree(stage);
    keyLight.shadow.dispose();
    renderer.renderLists.dispose(); renderer.dispose();
    if (!failed) renderer.forceContextLoss();
    canvas.remove(); targets = []; nodeObjects.clear(); edgeObjects = [];
  }

  try { resize(); setTheme(theme); rebuild(); }
  catch (error) { queueMicrotask(() => fail(error)); }
  return { update, fit, focus, zoom, setTheme, destroy };
}

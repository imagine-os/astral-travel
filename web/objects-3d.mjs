/**
 * A local, on-demand Three.js memory scene. Records remain ordinary application
 * data; this module owns only their presentation and releases all GPU resources.
 * Three.js is vendored under its MIT license in ./vendor/three/.
 * Folder, server, database, and cloud construction adapts the primitive-model
 * approach in imagine-os/graph-gallery/shared/assets/models/models.js.
 * Astral keeps its own data, previews, picking, and drag lifecycle.
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
  const typeLabel = node.type === 'raw' ? `${(node.objectType || 'document').toUpperCase()} · SOURCE` : 'INTERPRETATION · KNOWLEDGE';
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
 * onSelect(id), onMove(id, { x, y: 0, z }), onDragState(boolean),
 * moveEnabled (defaults to true), onReady(), and onError(Error). All preview URLs must be local
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
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 1600);
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
  controls.maxDistance = 800;
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

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(440, 440), new THREE.MeshStandardMaterial({ color: THEMES[theme].ground, roughness: .97, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.06; floor.receiveShadow = true; stage.add(floor);
  const grid = new THREE.GridHelper(400, 200, THEMES[theme].grid, THEMES[theme].grid);
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
      if (controls.enabled) controls.update();
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
    const object = new THREE.Group(); object.position.set(0, 1.45, 0);
    object.rotation.x = -.32;
    object.rotation.y = node.type === 'raw' ? -.08 : .04;
    group.add(object);
    const isRaw = node.type === 'raw';
    // Object kind is presentation metadata. Evidence status still comes from type.
    const kind = !isRaw ? 'claim' : node.objectType || 'document';
    const palette = { book: '#45677a', image: '#b58c55', video: '#465264', audio: '#577d7b', code: '#34495e', chat: '#639b9a', research: '#68845f', experiment: '#c18a5b', folder: '#d3a353', network: '#5c99b9', character: '#7a93d5', database: '#ca9c57', service: '#4e93a7', cloud: '#9dbfbd', portal: '#9a77c2' };
    const accent = palette[kind] || '#758eab';
    const matte = color => new THREE.MeshStandardMaterial({ color, roughness: .64, metalness: .06 });
    const metallic = color => new THREE.MeshStandardMaterial({ color, roughness: .36, metalness: .5 });
    function addMesh(geometry, material, x = 0, y = 0, z = 0) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
      object.add(mesh); return mesh;
    }
    const box = (w, h, d, color, x = 0, y = 0, z = 0) => addMesh(new THREE.BoxGeometry(w, h, d), matte(color), x, y, z);
    const body = (w, h, d, color, x = 0, y = 0, z = 0) => addMesh(tabletGeometry(w, h, d), matte(color), x, y, z);
    const sphere = (r, color, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => {
      const mesh = addMesh(new THREE.SphereGeometry(r, 20, 14), matte(color), x, y, z);
      mesh.scale.set(sx, sy, sz); return mesh;
    };
    const cylinder = (r, h, color, x = 0, y = 0, z = 0) => addMesh(new THREE.CylinderGeometry(r, r, h, 24), matte(color), x, y, z);
    const rod = (a, b, radius, color) => {
      const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
      const mesh = addMesh(new THREE.CylinderGeometry(radius, radius, start.distanceTo(end), 10), metallic(color));
      mesh.position.copy(start).lerp(end, .5);
      mesh.quaternion.setFromUnitVectors(Y_AXIS, end.sub(start).normalize());
      return mesh;
    };
    // Unlike the document family, these models stand on the floor with actual
    // volume. Their preview is a small plaque, not the shape of the whole node.
    const volumetric = ['folder', 'network', 'character', 'database', 'service', 'cloud', 'portal'].includes(kind);
    if (volumetric) { object.position.set(0, 0, 0); object.rotation.set(0, -.10, 0); }
    let faceWidth = 1.82, faceHeight = 2.275, faceX = 0, faceY = -.015, faceZ = .038;
    let plaque = false;

    if (kind === 'folder') {
      // Open folder: angled front, tall tabbed back, and three loose sheets.
      box(2.50, 1.76, .12, '#b88a40', 0, 1.04, -.34);
      body(.88, .34, .12, '#b88a40', -.72, 2.04, -.34);
      box(2.50, .16, .79, accent, 0, .23, 0);
      for (let sheet = 0; sheet < 3; sheet++) {
        const paper = box(2.12, 1.55, .035, ['#e7e3d8', '#f4ede0', colors.paper][sheet], .03 * sheet, 1.11 + sheet * .06, -.23 + sheet * .12);
        paper.rotation.z = (sheet - 1) * .025;
      }
      const front = box(2.53, 1.35, .11, accent, 0, .91, .37);
      front.rotation.x = -.15;
      // The small front label carries the actual record preview.
      faceWidth = .76; faceHeight = .95; faceY = 1.03; faceZ = .55; plaque = true;
      box(.43, .10, .05, '#f1d095', -.87, 1.41, .49);
      box(.43, .07, .05, '#b7893d', -.87, 1.24, .49);
    } else if (kind === 'character') {
      // A friendly miniature person, with limbs and face that read from afar.
      cylinder(.91, .16, theme === 'dark' ? '#41485e' : '#dddfe9', 0, .12, 0);
      for (const x of [-.24, .24]) {
        box(.33, .16, .59, '#4a5470', x, .25, .13);
        cylinder(.14, .63, '#54658b', x, .60, -.01);
      }
      addMesh(new THREE.CylinderGeometry(.32, .46, .89, 20), matte(accent), 0, 1.17, 0);
      sphere(.18, '#efc6a2', 0, 1.64, 0);
      sphere(.43, '#efc6a2', 0, 2.02, .015, 1, 1.08, .95);
      sphere(.44, '#64516a', 0, 2.24, -.055, 1.03, .64, .93);
      for (const x of [-.40, .40]) sphere(.105, '#efc6a2', x, 2.02, 0);
      for (const x of [-.145, .145]) {
        sphere(.069, '#fffef9', x, 2.075, .371, 1, 1.12, .43);
        sphere(.031, '#3e3545', x + .005, 2.067, .401, 1, 1.1, .40);
      }
      sphere(.058, '#ddb08e', 0, 1.955, .409, .75, 1, .58);
      const smile = addMesh(new THREE.TorusGeometry(.115, .018, 6, 16, Math.PI), matte('#9e665e'), 0, 1.915, .379);
      smile.rotation.z = Math.PI;
      rod([-.31, 1.45, 0], [-.67, .98, .03], .13, accent);
      rod([.31, 1.45, 0], [.68, 1.69, .06], .13, accent);
      sphere(.15, '#efc6a2', -.68, .92, .035);
      sphere(.15, '#efc6a2', .71, 1.75, .065);
      // A separate desk badge lets the model remain a character silhouette.
      faceWidth = .52; faceHeight = .65; faceX = .83; faceY = .65; faceZ = .44; plaque = true;
      rod([.83, .19, .40], [.83, .38, .40], .035, '#a8adb9');
    } else if (kind === 'network') {
      // An unmistakable spatial molecule: one hub, five satellites, real rods.
      cylinder(.55, .15, '#657f92', 0, .13, 0);
      rod([0, .18, 0], [0, 1.36, 0], .095, '#8ba8ba');
      sphere(.40, accent, 0, 1.36, 0);
      const satellites = [[-1.05, 1.90, -.10], [1.02, 1.98, -.14], [-.92, .72, .15], [.99, .76, .20], [0, 2.45, -.25]];
      satellites.forEach((point, i) => {
        rod([0, 1.36, 0], point, .064, '#9ab8c8');
        sphere(.235, ['#91bdd1', '#93c6b4', '#d1b275', '#ac9dd0', '#7fadc6'][i], ...point);
      });
      faceWidth = .58; faceHeight = .725; faceY = .63; faceZ = .50; plaque = true;
    } else if (kind === 'database') {
      // Three independent drums, polished rims, and visible separation gaps.
      cylinder(.93, .13, '#92723f', 0, .12, 0);
      for (let level = 0; level < 3; level++) {
        const y = .48 + level * .63;
        cylinder(.81, .47, accent, 0, y, 0);
        cylinder(.85, .07, '#eed39c', 0, y + .26, 0);
        cylinder(.83, .055, '#a67e40', 0, y - .25, 0);
        sphere(.045, '#4f8c76', .49, y + .025, .65);
      }
      faceWidth = .54; faceHeight = .675; faceY = 1.30; faceZ = .86; plaque = true;
    } else if (kind === 'service') {
      // A compact server tower: deep chassis, rack drawers, lights, feet.
      body(1.66, 2.17, 1.07, '#46586b', 0, 1.27, 0);
      box(1.84, .13, 1.23, '#697b8b', 0, .16, 0);
      for (let unit = 0; unit < 4; unit++) {
        const y = .52 + unit * .45;
        box(1.51, .34, .095, accent, 0, y, .585);
        box(.55, .07, .025, '#2b4658', -.27, y + .025, .646);
        box(.34, .035, .025, '#8ac0cc', -.36, y - .08, .646);
        sphere(.045, unit === 2 ? '#dfbb6d' : '#98c6a7', .55, y, .655);
      }
      for (const x of [-.42, .42]) for (let fin = 0; fin < 4; fin++) box(.07, .06, .65, '#34495c', x + fin * .12, 2.38, -.03);
      // A narrow plaque to the side keeps rack details readable.
      faceWidth = .53; faceHeight = .6625; faceX = 1.02; faceY = .78; faceZ = .36; plaque = true;
      rod([.70, .78, .15], [1.02, .78, .29], .04, '#8ea5b8');
    } else if (kind === 'cloud') {
      // Soft overlapping volumes, not a flat cloud icon or another card frame.
      cylinder(1.08, .14, '#bdcfd0', 0, .13, 0);
      rod([0, .20, 0], [0, .88, 0], .09, '#b0c8c8');
      for (const [x, y, z, r] of [[0, 1.43, 0, .68], [-.68, 1.15, 0, .48], [.67, 1.18, .05, .52], [-.32, 1.81, -.12, .47], [.33, 1.92, -.05, .48], [0, 1.12, .23, .53]]) {
        sphere(r, accent, x, y, z);
      }
      faceWidth = .61; faceHeight = .7625; faceY = .68; faceZ = .81; plaque = true;
    } else if (kind === 'portal') {
      // A freestanding arch ring with an open center and a small source plaque.
      box(1.96, .17, .80, '#8f79aa', 0, .15, 0);
      for (const x of [-.81, .81]) rod([x, .20, 0], [x, .72, 0], .11, '#b9a5d4');
      addMesh(new THREE.TorusGeometry(1.00, .15, 16, 48), metallic(accent), 0, 1.50, 0);
      addMesh(new THREE.TorusGeometry(.97, .043, 10, 48), new THREE.MeshStandardMaterial({ color: '#d9c5ef', emissive: '#aa83d5', emissiveIntensity: .45, roughness: .35 }), 0, 1.50, .142);
      for (let step = 0; step < 6; step++) {
        const angle = step / 6 * Math.PI * 2;
        sphere(.07, '#e1cdeb', Math.cos(angle) * 1.0, 1.50 + Math.sin(angle) * 1.0, .16);
      }
      faceWidth = .52; faceHeight = .65; faceX = .94; faceY = .62; faceZ = .30; plaque = true;
    } else if (kind === 'claim') {
      addMesh(tabletGeometry(2.05, 2.62, .20), new THREE.MeshPhysicalMaterial({ color: colors.tablet, metalness: .16, roughness: .26, clearcoat: 1, clearcoatRoughness: .16, transparent: true, opacity: .90 }));
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(.69, .88, .14, 32), metallic(theme === 'dark' ? '#49405d' : '#e3ddf0'));
      foot.position.set(0, .05, .1); foot.castShadow = true; group.add(foot);
      addMesh(new THREE.SphereGeometry(.055, 10, 8), new THREE.MeshBasicMaterial({ color: node.status === 'verified' ? '#77b494' : '#d7ae65' }), .80, 1.14, .145);
      faceWidth = 1.80; faceHeight = 2.25; faceZ = .145; faceY = -.045;
    } else if (kind === 'book') {
      // A solid cover, exposed page block, and rounded spine, not another tablet.
      box(2.11, 2.65, .38, accent, 0, 0, -.09);
      box(1.93, 2.48, .29, '#ece5d7', .045, -.01, .035);
      box(2.11, 2.65, .06, accent, 0, 0, .205);
      addMesh(new THREE.CylinderGeometry(.15, .15, 2.66, 16), matte('#2f5265'), -1.02, 0, .04);
      for (const y of [-.87, .86]) box(.20, .055, .03, '#c4b079', -.995, y, .192);
      box(.105, .34, .025, '#d69d5c', .63, -1.34, .12);
      faceWidth = 1.61; faceHeight = 2.0125; faceY = .015; faceZ = .245;
    } else if (kind === 'image') {
      // A deep picture frame with a mat and an easel visible from the side.
      box(2.28, 2.75, .23, accent);
      box(2.07, 2.54, .035, '#f7f1e5', 0, 0, .137);
      box(.20, 2.40, .15, '#886948', .66, -.08, -.43).rotation.x = -.19;
      faceWidth = 1.81; faceHeight = 2.2625; faceZ = .16;
    } else if (kind === 'video') {
      // The striped clapper identifies a video record; it is not a play control.
      body(2.24, 2.39, .24, '#394454', 0, -.12);
      box(2.35, .27, .27, '#ece8da', 0, 1.24, -.015);
      for (let stripe = 0; stripe < 6; stripe++) {
        const mark = box(.19, .285, .014, '#364052', -.98 + stripe * .39, 1.24, .13);
        mark.rotation.z = -.35;
      }
      box(2.30, .105, .25, '#273342', 0, 1.005);
      faceWidth = 1.63; faceHeight = 2.0375; faceY = -.15; faceZ = .145;
    } else if (kind === 'audio') {
      // Two visible reels and a label window give this a recorder/cassette shape.
      body(2.30, 2.58, .32, accent, 0, -.035);
      body(2.04, .61, .045, '#233d43', 0, .80, .20);
      for (const x of [-.56, .56]) {
        const reel = addMesh(new THREE.CylinderGeometry(.225, .225, .045, 24), matte('#dfdfce'), x, .80, .26);
        reel.rotation.x = Math.PI / 2;
        const hub = addMesh(new THREE.CylinderGeometry(.083, .083, .055, 12), matte('#536d6c'), x, .80, .29);
        hub.rotation.x = Math.PI / 2;
        for (const angle of [0, Math.PI / 3, Math.PI * 2 / 3]) box(.31, .023, .011, '#536d6c', x, .80, .319).rotation.z = angle;
      }
      faceWidth = 1.29; faceHeight = 1.6125; faceY = -.405; faceZ = .215;
      for (let slit = 0; slit < 4; slit++) box(.04, .76, .018, '#315556', .87 + slit * .057, -.43, .18);
    } else if (kind === 'code') {
      // A terminal on a keyboard base makes code distinguishable in silhouette.
      body(2.20, 2.40, .23, accent, 0, .08);
      box(.35, .37, .20, '#526478', 0, -1.24, -.04);
      box(2.28, .12, .80, '#627286', 0, -1.32, .35);
      for (let row = 0; row < 3; row++) for (let key = 0; key < 9; key++) {
        box(.155, .024, .13, '#cbd3db', -.80 + key * .2, -1.245, .14 + row * .185);
      }
      faceWidth = 1.67; faceHeight = 2.0875; faceY = .095; faceZ = .147;
    } else if (kind === 'chat') {
      // A second offset bubble and a triangular tail make conversations legible.
      body(2.08, 2.41, .12, '#c7ddda', .17, -.025, -.16);
      body(2.05, 2.47, .19, accent, -.025, .045);
      const tailShape = new THREE.Shape();
      tailShape.moveTo(-.72, -.99); tailShape.lineTo(-.73, -1.54); tailShape.lineTo(-.15, -1.12); tailShape.closePath();
      addMesh(new THREE.ExtrudeGeometry(tailShape, { depth: .16, bevelEnabled: false }), matte(accent), 0, 0, -.085);
      faceWidth = 1.72; faceHeight = 2.15; faceY = .04; faceZ = .13;
    } else if (kind === 'research') {
      // Spiral notebook, tabbed edge, and visible page block for research sources.
      box(2.18, 2.68, .22, accent, 0, 0, -.065);
      box(1.95, 2.47, .15, colors.paper, .03, 0, .085);
      for (let ring = 0; ring < 7; ring++) {
        const loop = addMesh(new THREE.TorusGeometry(.105, .023, 6, 14), metallic('#bac7b4'), -1.03, -1.08 + ring * .36, .08);
        loop.rotation.y = Math.PI / 2;
      }
      for (let tab = 0; tab < 3; tab++) box(.20, .27, .04, ['#c9b589', '#a4c8c5', '#c6b3dc'][tab], 1.08, .70 - tab * .48, -.01);
      faceWidth = 1.71; faceHeight = 2.1375; faceY = -.035; faceZ = .17;
    } else if (kind === 'experiment') {
      // Clipboard with a brass clamp; experiment state stays in the text preview.
      body(2.15, 2.72, .16, accent);
      box(1.91, 2.42, .045, colors.paper, 0, -.035, .12);
      addMesh(tabletGeometry(.79, .30, .095), metallic('#c7bc9d'), 0, 1.20, .18);
      addMesh(new THREE.TorusGeometry(.15, .038, 8, 16), metallic('#c7bc9d'), 0, 1.41, .13);
      faceWidth = 1.71; faceHeight = 2.1375; faceY = -.10; faceZ = .15;
    } else {
      // Three thin offset pages and a small brass clip read as a document stack.
      for (let page = 2; page >= 0; page--) {
        const sheet = box(1.96, 2.5, .065, page ? '#e2dfeb' : colors.paper, page * .065, -page * .025, -page * .07);
        sheet.rotation.z = page * -.025;
      }
      addMesh(new THREE.BoxGeometry(.42, .09, .18), metallic('#b59b6a'), -.42, 1.26, .015);
    }
    if (plaque) {
      body(faceWidth + .10, faceHeight + .10, .06, theme === 'dark' ? '#676177' : '#ece7f3', faceX, faceY, faceZ - .041);
    }
    const face = new THREE.Mesh(new THREE.PlaneGeometry(faceWidth, faceHeight), new THREE.MeshBasicMaterial({ map: fallbackPreview(node), toneMapped: false, side: THREE.FrontSide }));
    face.position.set(faceX, faceY, faceZ); object.add(face);
    // Only physical bodies and previews receive object drag hits; the footprint is decorative.
    object.traverse(child => { if (child.isMesh) targets.push(child); });
    // Outline the true body bounds: wide folders and clouds should never inherit
    // the narrow document box. Selection and fit use these same measured bounds.
    group.updateMatrixWorld(true);
    const bodyBounds = new THREE.Box3().setFromObject(object);
    const bodySize = bodyBounds.getSize(new THREE.Vector3()).addScalar(.13);
    const bodyCenter = bodyBounds.getCenter(new THREE.Vector3());
    const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(bodySize.x, bodySize.y, bodySize.z)), new THREE.LineBasicMaterial({ color: colors.selected, transparent: true, opacity: .85 }));
    outline.visible = node.id === data.selectedId; outline.position.copy(bodyCenter); group.add(outline);
    // At this point group is not mounted in world yet; Box3 contains its local
    // placement, so remove the node position to store reusable model extents.
    bodyBounds.translate(group.position.clone().negate());
    outline.position.sub(group.position);
    const halo = new THREE.Mesh(new THREE.RingGeometry(1.40, 1.46, 64), new THREE.MeshBasicMaterial({ color: colors.selected, transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false }));
    halo.rotation.x = -Math.PI / 2; halo.position.y = .025; halo.visible = node.id === data.selectedId; group.add(halo);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(node, colors, node.id === data.selectedId), transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    label.scale.set(3.05, .715, 1); label.position.set(0, 3.28, .08); label.renderOrder = 20;
    group.add(label); targets.push(label);
    group.traverse(child => { child.userData.id = node.id; });
    world.add(group);
    nodeObjects.set(node.id, { group, node, outline, halo, label, bodyBounds });
    return usePreview(node, face.material, currentGeneration);
  }

  function edgeCurve(edge) {
    const from = nodeObjects.get(edge.from), to = nodeObjects.get(edge.to);
    if (!from || !to || edge.from === edge.to) return null;
    const start = from.group.position.clone().add(new THREE.Vector3(0, .34, 0));
    const end = to.group.position.clone().add(new THREE.Vector3(0, .34, 0));
    const distance = start.distanceTo(end);
    const middle = start.clone().lerp(end, .5); middle.y += Math.min(2.1, .4 + distance * .10);
    return new THREE.QuadraticBezierCurve3(start, middle, end);
  }

  function updateShadows() {
    if (!nodeObjects.size) return;
    const bounds = new THREE.Box3();
    for (const item of nodeObjects.values()) bounds.expandByPoint(item.group.position);
    const center = bounds.getCenter(new THREE.Vector3()); center.y = 0;
    const radius = Math.max(18, bounds.getSize(new THREE.Vector3()).length() * .65 + 5);
    keyLight.target.position.copy(center);
    keyLight.position.copy(center).add(new THREE.Vector3(-10, 20, 12).multiplyScalar(radius / 18));
    const shadowCamera = keyLight.shadow.camera;
    shadowCamera.left = -radius; shadowCamera.right = radius;
    shadowCamera.top = radius; shadowCamera.bottom = -radius;
    shadowCamera.far = radius * 5;
    shadowCamera.updateProjectionMatrix();
    renderer.shadowMap.needsUpdate = true;
  }

  function refreshMovedEdges(id) {
    for (const { edge, line, arrow, inferred } of edgeObjects) {
      if (edge.from !== id && edge.to !== id) continue;
      const curve = edgeCurve(edge); if (!curve) continue;
      line.geometry.dispose();
      line.geometry = inferred ? new THREE.BufferGeometry().setFromPoints(curve.getPoints(60)) : new THREE.TubeGeometry(curve, 32, .026, 5, false);
      if (inferred) line.computeLineDistances();
      arrow.position.copy(curve.getPoint(.73)); arrow.quaternion.setFromUnitVectors(Y_AXIS, curve.getTangent(.73).normalize());
    }
    updateShadows();
    requestRender();
  }

  function makeEdges() {
    const colors = THEMES[theme];
    for (const edge of data.edges) {
      const curve = edgeCurve(edge); if (!curve) continue;
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
    if (drag) finishDrag(true);
    generation++;
    const currentGeneration = generation;
    cancelImages.forEach(cancel => cancel()); cancelImages = [];
    disposeTree(world);
    nodeObjects = new Map(); edgeObjects = []; targets = [];
    makeGroups();
    const loads = data.nodes.slice(0, 60).map((node, index) => makeObject(node, index, currentGeneration));
    makeEdges(); refreshSelection(); updateShadows();
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
    for (const item of nodeObjects.values()) bounds.expandByPoint(item.group.position);
    const center = bounds.getCenter(new THREE.Vector3()); center.y = 1.1;
    const direction = new THREE.Vector3(.32, .65, 1).normalize();
    camera.position.copy(center).addScaledVector(direction, 20);
    camera.lookAt(center); camera.updateMatrixWorld(true);
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    const corners = [];
    for (const item of nodeObjects.values()) {
      const point = item.group.position;
      // Measure every silhouette rather than assuming a uniform page shape.
      const { min, max } = item.bodyBounds;
      for (const x of [min.x - .10, max.x + .10]) for (const y of [min.y - .10, max.y + .10]) for (const z of [min.z - .10, max.z + .10]) {
        corners.push(point.clone().add(new THREE.Vector3(x, y, z)));
      }
      // The selection footprint and the title sprite are also visible objects.
      for (const x of [-1.56, 1.56]) for (const z of [-1.46, 1.46]) {
        corners.push(point.clone().add(new THREE.Vector3(x, -.02, z)));
      }
      const labelCenter = point.clone().add(new THREE.Vector3(0, 3.28, .08));
      for (const x of [-1.56, 1.56]) for (const y of [-.39, .39]) {
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
    scene.fog = new THREE.Fog(colors.background, 180, 700);
    floor.material.color.set(colors.ground);
    grid.material.color.set(colors.grid);
    renderer.toneMappingExposure = theme === 'dark' ? 1.05 : 1.25;
    if (changed) rebuild(); else requestRender();
  }

  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const groundPlane = new THREE.Plane(Y_AXIS, 0);
  let pointerStart = null, drag = null, suppressSequence = false;
  const activePointers = new Set();
  function setRay(event) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    camera.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    return true;
  }
  function hit(event) {
    if (!setRay(event)) return null;
    world.updateMatrixWorld(true);
    return raycaster.intersectObjects(targets, false)[0]?.object.userData.id || null;
  }
  function groundPoint(event) {
    if (!setRay(event)) return null;
    return raycaster.ray.intersectPlane(groundPlane, new THREE.Vector3());
  }
  function ownPointer(event) {
    event.preventDefault(); event.stopImmediatePropagation();
  }
  function finishDrag(cancelled = false) {
    const current = drag; if (!current) return;
    drag = null;
    const item = nodeObjects.get(current.id);
    if (cancelled && item) {
      item.group.position.copy(current.original);
      refreshMovedEdges(current.id);
    }
    const position = item ? { x: item.group.position.x, y: 0, z: item.group.position.z } : null;
    controls.enabled = current.controlsEnabled;
    canvas.style.cursor = data.moveEnabled === false ? 'pointer' : 'grab';
    if (canvas.hasPointerCapture?.(current.pointerId)) canvas.releasePointerCapture(current.pointerId);
    if (current.moved) options.onDragState?.(false);
    if (!cancelled && current.moved && position) {
      // Keep the local layout stable even when the host persists asynchronously.
      if (data.positions instanceof Map) data.positions = new Map(data.positions).set(current.id, position);
      else data.positions = { ...data.positions, [current.id]: position };
      options.onMove?.(current.id, position);
    }
    requestRender();
  }
  function pointerDown(event) {
    activePointers.add(event.pointerId);
    if (drag || suppressSequence) {
      // A gesture that began on an object stays owned by that object. A second
      // finger cancels the move instead of mixing a partial orbit with a drag.
      if (drag && drag.pointerId !== event.pointerId) { finishDrag(true); suppressSequence = true; }
      ownPointer(event); return;
    }
    const id = event.button === 0 && activePointers.size === 1 ? hit(event) : null;
    pointerStart = activePointers.size === 1 && event.button === 0 ? { x: event.clientX, y: event.clientY, pointerId: event.pointerId, id } : null;
    if (!id || data.moveEnabled === false) return;
    const item = nodeObjects.get(id); if (!item) return;
    const controlsEnabled = controls.enabled;
    controls.enabled = false;
    // Finish residual orbit damping before measuring the ground-plane offset.
    const damping = controls.enableDamping; controls.enableDamping = false; controls.update(); controls.enableDamping = damping;
    const point = groundPoint(event);
    if (!point) { controls.enabled = controlsEnabled; return; }
    ownPointer(event);
    drag = { id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, original: item.group.position.clone(), offset: item.group.position.clone().sub(point), controlsEnabled, moved: false };
    pointerStart = null;
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = 'grabbing';
  }
  function pointerMove(event) {
    if (suppressSequence) { ownPointer(event); return; }
    if (drag && drag.pointerId === event.pointerId) {
      ownPointer(event);
      if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 5) return;
      const point = groundPoint(event); if (!point) return;
      const item = nodeObjects.get(drag.id); if (!item) { finishDrag(true); return; }
      if (!drag.moved) { drag.moved = true; options.onDragState?.(true); }
      if (!drag || disposed) return;
      point.add(drag.offset);
      item.group.position.set(THREE.MathUtils.clamp(point.x, -100, 100), 0, THREE.MathUtils.clamp(point.z, -100, 100));
      refreshMovedEdges(drag.id);
      return;
    }
    if (activePointers.size) {
      if (pointerStart && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 6) pointerStart = null;
      return;
    }
    canvas.style.cursor = hit(event) ? (data.moveEnabled === false ? 'pointer' : 'grab') : 'grab';
  }
  function pointerUp(event) {
    activePointers.delete(event.pointerId);
    if (suppressSequence) {
      ownPointer(event); if (!activePointers.size) suppressSequence = false;
      return;
    }
    if (drag && drag.pointerId === event.pointerId) {
      ownPointer(event);
      const { id, moved } = drag;
      finishDrag(false);
      if (!moved) options.onSelect?.(id);
      return;
    }
    const start = pointerStart; pointerStart = null;
    if (!start || start.pointerId !== event.pointerId || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) return;
    const id = hit(event);
    if (id && id === start.id) options.onSelect?.(id);
  }
  function pointerCancel(event) {
    activePointers.delete(event.pointerId); pointerStart = null;
    if (drag?.pointerId === event.pointerId) { ownPointer(event); finishDrag(true); }
    if (!activePointers.size) suppressSequence = false;
  }
  function lostCapture(event) {
    if (drag?.pointerId === event.pointerId) { finishDrag(true); activePointers.delete(event.pointerId); }
  }
  function cancelKey(event) {
    if (event.key !== 'Escape' || !drag) return;
    event.preventDefault(); event.stopImmediatePropagation();
    finishDrag(true); pointerStart = null; suppressSequence = activePointers.size > 0;
  }
  function contextLost(event) { event.preventDefault(); fail(new Error('The device lost its 3D graphics context. Use the card or list view to continue.')); }
  // Capture object gestures before OrbitControls' own target-phase listeners.
  canvas.addEventListener('pointerdown', pointerDown, true);
  canvas.addEventListener('pointermove', pointerMove, true);
  canvas.addEventListener('pointerup', pointerUp, true);
  canvas.addEventListener('pointercancel', pointerCancel, true);
  canvas.addEventListener('lostpointercapture', lostCapture);
  window.addEventListener('keydown', cancelKey, true);
  canvas.addEventListener('webglcontextlost', contextLost);
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  function motionChanged(event) { reducedMotion = event.matches; controls.enableDamping = !reducedMotion; requestRender(); }
  motionQuery.addEventListener('change', motionChanged);

  function destroy() {
    if (disposed) return;
    if (drag) finishDrag(true);
    disposed = true; generation++;
    if (frame) cancelAnimationFrame(frame);
    cancelImages.forEach(cancel => cancel()); cancelImages = [];
    observer.disconnect();
    controls.removeEventListener('change', requestRender); controls.dispose();
    canvas.removeEventListener('pointerdown', pointerDown, true);
    canvas.removeEventListener('pointermove', pointerMove, true);
    canvas.removeEventListener('pointerup', pointerUp, true);
    canvas.removeEventListener('pointercancel', pointerCancel, true);
    canvas.removeEventListener('lostpointercapture', lostCapture);
    window.removeEventListener('keydown', cancelKey, true);
    activePointers.clear();
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

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

/* =========================================================
   Bottle definitions — three distinct Tom Ford perfumes
   ========================================================= */
const BOTTLES = {
  azure: {
    label: 'AZURE LIME',
    eyebrow: 'PRIVATE BLEND COLLECTION',
    copy: 'A vibrant, sunlit fragrance. Crisp citrus and bright greens — Azure Lime captures the light of the Mediterranean in a single breath.',
    glass: 0x1d6e5e,
    attenuation: 0x0a3a30,
    matte: false,
    labelBg: '#c79b4d',
    labelText: '#1a1208',
    rim: 0x55ffd0,
  },
  cherry: {
    label: 'LOST CHERRY',
    eyebrow: 'PRIVATE BLEND COLLECTION',
    copy: 'A decadent fruity floral fragrance. Sweet. Tempting. Addictive. Lost Cherry — indulge in the forbidden.',
    glass: 0x6b121f,
    attenuation: 0x3a0810,
    matte: false,
    labelBg: '#f3d4d8',
    labelText: '#5c0e1a',
    rim: 0xff7080,
  },
  fabulous: {
    label: 'F* FABULOUS',
    eyebrow: 'PRIVATE BLEND COLLECTION',
    copy: 'An audacious oriental leather fragrance. Confident. Bold. Unapologetic. F* Fabulous — for those who dare to be exceptional.',
    glass: 0x111111,
    attenuation: 0x000000,
    matte: true,
    labelBg: '#f6f4ee',
    labelText: '#0e0e10',
    rim: 0xffffff,
  },
};

/* =========================================================
   Three.js scene setup
   ========================================================= */
const viewerEl = document.getElementById('viewer');
const w = () => viewerEl.clientWidth;
const h = () => viewerEl.clientHeight;

const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(38, w() / h(), 0.1, 100);
const HOME_POS = new THREE.Vector3(0, 1.2, 7);
camera.position.copy(HOME_POS);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(w(), h());
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewerEl.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 1, 0);
controls.minDistance = 3;
controls.maxDistance = 14;
controls.enablePan = false;

/* ---- Post-processing for soft bloom on highlights ---- */
const composer = new EffectComposer(renderer);
composer.setSize(w(), h());
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(w(), h()), 0.45, 0.7, 0.85);
composer.addPass(bloom);

/* =========================================================
   Lighting
   ========================================================= */
const ambient = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambient);

const headlight = new THREE.SpotLight(0xffffff, 80, 30, Math.PI / 5, 0.4, 1.2);
headlight.position.set(0, 8, 6);
headlight.target.position.set(0, 1, 0);
scene.add(headlight, headlight.target);

const rimLight = new THREE.PointLight(0xffffff, 8, 18, 1.4);
rimLight.position.set(-4, 3, -3);
scene.add(rimLight);

const fillLight = new THREE.PointLight(0xffffff, 3, 14, 2);
fillLight.position.set(4, 1, 2);
scene.add(fillLight);

/* Procedural environment for glass refraction (avoids external HDRI fetch). */
const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = (() => {
  const s = new THREE.Scene();
  // Big gradient sphere
  const skyGeo = new THREE.SphereGeometry(50, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { top: { value: new THREE.Color(0x444444) }, bot: { value: new THREE.Color(0x080808) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'varying vec3 vP; uniform vec3 top; uniform vec3 bot; void main(){ float t = clamp(vP.y/40. + .5, 0., 1.); gl_FragColor = vec4(mix(bot, top, t), 1.); }',
  });
  s.add(new THREE.Mesh(skyGeo, skyMat));
  // A few floating "lights" for nice highlights
  const lightGeo = new THREE.PlaneGeometry(8, 8);
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const positions = [[6, 4, -3], [-6, 5, -2], [0, 6, 5], [-3, -2, 4]];
  positions.forEach(([x, y, z]) => {
    const m = new THREE.Mesh(lightGeo, lightMat);
    m.position.set(x, y, z); m.lookAt(0, 0, 0);
    s.add(m);
  });
  return s;
})();
scene.environment = pmrem.fromScene(envScene, 0.04).texture;

/* =========================================================
   Marble podium
   ========================================================= */
function makeMarbleTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  // base
  const g = ctx.createRadialGradient(256, 256, 40, 256, 256, 360);
  g.addColorStop(0, '#1d1d20'); g.addColorStop(1, '#070708');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 512);
  // veining
  ctx.strokeStyle = 'rgba(220,220,220,0.18)'; ctx.lineWidth = 1.2;
  for (let i = 0; i < 14; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * 512, Math.random() * 512);
    for (let j = 0; j < 5; j++)
      ctx.bezierCurveTo(Math.random() * 512, Math.random() * 512,
        Math.random() * 512, Math.random() * 512,
        Math.random() * 512, Math.random() * 512);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
const marbleTex = makeMarbleTexture();
const podium = new THREE.Mesh(
  new THREE.CylinderGeometry(2.4, 2.7, 0.35, 64),
  new THREE.MeshStandardMaterial({ map: marbleTex, roughness: 0.5, metalness: 0.15 })
);
podium.position.y = -1.4;
scene.add(podium);

/* Shadow plane behind */
const backdrop = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 24),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.0 })
);
backdrop.position.set(0, 4, -8);
scene.add(backdrop);

/* =========================================================
   Bottle factory
   ========================================================= */
function makeLabelTexture({ name, bg, fg, isBlack }) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 420;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 420);
  // subtle inner border
  ctx.strokeStyle = 'rgba(0,0,0,.07)';
  ctx.lineWidth = 4; ctx.strokeRect(8, 8, 496, 404);

  ctx.fillStyle = fg;
  ctx.textAlign = 'center';

  // TOM FORD logotype
  ctx.font = '700 50px "Cormorant Garamond", Times, serif';
  ctx.fillText('TOM FORD', 256, 110);

  // separator
  ctx.fillRect(216, 130, 80, 1.5);

  // product name (split if needed)
  ctx.font = '500 50px "Cormorant Garamond", Times, serif';
  const lines = name.split(' ');
  if (lines.length > 1) {
    ctx.fillText(lines[0], 256, 215);
    ctx.fillText(lines.slice(1).join(' '), 256, 270);
  } else {
    ctx.fillText(name, 256, 240);
  }

  ctx.font = '400 24px "Inter", sans-serif';
  ctx.fillText('EAU DE PARFUM', 256, 330);
  ctx.fillText('50 ML', 256, 365);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeBottle(def) {
  const group = new THREE.Group();

  /* --- BODY (rounded box) --- */
  const bodyGeo = new RoundedBoxGeometry(2.0, 3.1, 1.1, 6, 0.08);
  const bodyMat = def.matte
    ? new THREE.MeshStandardMaterial({
        color: def.glass, roughness: 0.78, metalness: 0.04,
      })
    : new THREE.MeshPhysicalMaterial({
        color: def.glass,
        transmission: 0.85,
        roughness: 0.06,
        metalness: 0.0,
        ior: 1.52,
        thickness: 1.3,
        attenuationColor: new THREE.Color(def.attenuation),
        attenuationDistance: 0.7,
        clearcoat: 1.0,
        clearcoatRoughness: 0.04,
        envMapIntensity: 1.2,
      });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.name = 'body';
  group.add(body);

  /* Inner liquid (glass bottles only) */
  if (!def.matte) {
    const liquidGeo = new RoundedBoxGeometry(1.85, 2.2, 0.95, 4, 0.06);
    const liquidMat = new THREE.MeshPhysicalMaterial({
      color: def.attenuation, transmission: 0.4, roughness: 0.2,
      ior: 1.33, thickness: 0.5,
    });
    const liquid = new THREE.Mesh(liquidGeo, liquidMat);
    liquid.position.y = -0.35;
    liquid.name = 'liquid';
    group.add(liquid);
  }

  /* --- NECK --- */
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 0.22, 32),
    bodyMat.clone()
  );
  neck.position.y = 1.66;
  neck.name = 'neck';
  group.add(neck);

  /* --- CAP --- */
  const capGeo = new RoundedBoxGeometry(1.85, 0.95, 1.0, 4, 0.05);
  const capMat = bodyMat.clone();
  if (!def.matte) capMat.attenuationDistance = 0.4;
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.position.y = 2.25;
  cap.name = 'cap';
  group.add(cap);

  /* --- LABEL --- */
  const labelTex = makeLabelTexture({
    name: def.label.replace('F* ', 'F* '),
    bg: def.labelBg, fg: def.labelText,
    isBlack: def.matte,
  });
  const labelMat = new THREE.MeshStandardMaterial({
    map: labelTex, roughness: 0.5, metalness: 0.05,
  });
  const labelMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.55, 1.27),
    labelMat
  );
  labelMesh.position.set(0, 0.15, 0.561);
  labelMesh.name = 'label';
  group.add(labelMesh);

  /* back label too */
  const labelBack = labelMesh.clone();
  labelBack.position.z = -0.561;
  labelBack.rotation.y = Math.PI;
  group.add(labelBack);

  return group;
}

/* =========================================================
   State + create initial bottle
   ========================================================= */
const state = {
  current: 'azure',
  spin: true,
  wireframe: false,
  headlight: true,
};
let bottle = makeBottle(BOTTLES.azure);
scene.add(bottle);

function swapBottle(key) {
  scene.remove(bottle);
  bottle.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      if (o.material.map) o.material.map.dispose();
      o.material.dispose();
    }
  });
  state.current = key;
  bottle = makeBottle(BOTTLES[key]);
  applyWireframe(state.wireframe);
  scene.add(bottle);

  // theme-tint rim light + body background
  const def = BOTTLES[key];
  rimLight.color.set(def.rim);
  document.body.dataset.theme = key;

  // text content
  document.getElementById('heroProduct').textContent = def.label;
  document.getElementById('heroEyebrow').textContent = def.eyebrow;
  document.getElementById('heroCopy').textContent = def.copy;

  document.querySelectorAll('.thumb').forEach(t => {
    t.classList.toggle('active', t.dataset.bottle === key);
  });
}

function applyWireframe(on) {
  bottle.traverse(o => {
    if (o.material) o.material.wireframe = on;
  });
}

/* =========================================================
   UI bindings
   ========================================================= */
document.querySelectorAll('.toggle').forEach(t => {
  t.addEventListener('click', () => {
    const opts = t.querySelectorAll('.opt');
    const isOn = opts[0].classList.contains('active');
    opts[0].classList.toggle('active', !isOn);
    opts[1].classList.toggle('active', isOn);
    const next = !isOn;
    const ctl = t.dataset.control;
    if (ctl === 'wireframe') { state.wireframe = next; applyWireframe(next); }
    if (ctl === 'spin') state.spin = next;
    if (ctl === 'headlight') {
      state.headlight = next;
      headlight.intensity = next ? 80 : 0;
      ambient.intensity = next ? 0.35 : 0.12;
    }
  });
});

const VIEWS = {
  front: { pos: [0, 1.2, 7], target: [0, 1, 0] },
  side:  { pos: [7, 1.2, 0.2], target: [0, 1, 0] },
  top:   { pos: [0, 7, 0.01], target: [0, 1, 0] },
  close: { pos: [0, 1.0, 3.4], target: [0, 0.6, 0] },
};
function moveCameraTo(view) {
  const v = VIEWS[view];
  animateCamera(new THREE.Vector3(...v.pos), new THREE.Vector3(...v.target));
}
function animateCamera(toPos, toTarget, dur = 700) {
  const fromPos = camera.position.clone();
  const fromTarget = controls.target.clone();
  const t0 = performance.now();
  function step() {
    const t = Math.min(1, (performance.now() - t0) / dur);
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    camera.position.lerpVectors(fromPos, toPos, e);
    controls.target.lerpVectors(fromTarget, toTarget, e);
    if (t < 1) requestAnimationFrame(step);
  }
  step();
}

document.querySelectorAll('.view-btn').forEach(b => {
  b.addEventListener('click', () => moveCameraTo(b.dataset.view));
});
document.querySelector('[data-action="reset"]').addEventListener('click', () => {
  animateCamera(HOME_POS.clone(), new THREE.Vector3(0, 1, 0));
});

/* Bottle gallery + arrows */
const order = ['fabulous', 'cherry', 'azure'];
document.querySelectorAll('.thumb').forEach(t => {
  t.addEventListener('click', () => swapBottle(t.dataset.bottle));
});
document.querySelectorAll('.arrow').forEach(a => {
  a.addEventListener('click', () => {
    const i = order.indexOf(state.current);
    const dir = a.dataset.dir === 'next' ? 1 : -1;
    const nxt = order[(i + dir + order.length) % order.length];
    swapBottle(nxt);
  });
});

/* light/dark theme */
document.getElementById('themeToggle').addEventListener('click', () => {
  const isLight = document.body.dataset.mode === 'light';
  document.body.dataset.mode = isLight ? '' : 'light';
  document.getElementById('themeToggle').textContent = isLight ? '☀' : '☾';
});

/* CTA button does the same as Close Up */
document.querySelector('.cta')?.addEventListener('click', () => moveCameraTo('close'));

/* =========================================================
   Animate
   ========================================================= */
function onResize() {
  camera.aspect = w() / h();
  camera.updateProjectionMatrix();
  renderer.setSize(w(), h());
  composer.setSize(w(), h());
}
window.addEventListener('resize', onResize);

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  if (state.spin) bottle.rotation.y += dt * 0.45;
  controls.update();
  composer.render();
}
animate();

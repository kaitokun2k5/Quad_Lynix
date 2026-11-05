// Interactive demo: one rotation about a fixed axis, shown as a drone model,
// a rotation vector, a quaternion and ZYX Euler angles. World frame is Z-up (ENU).

const AXIS = normalize([1, 2, 2]);
const DEG = Math.PI / 180;

const slider = document.getElementById('theta');
const out = {
  theta: document.getElementById('thetaOut'),
  angle: document.getElementById('roAngle'),
  rot: document.getElementById('roRot'),
  quat: document.getElementById('roQuat'),
  roll: document.getElementById('roRoll'),
  pitch: document.getElementById('roPitch'),
  yaw: document.getElementById('roYaw'),
};

function normalize(v) {
  const n = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / n, v[1] / n, v[2] / n];
}

function fmt(x, digits = 3) {
  const s = x.toFixed(digits);
  return /^-0\.?0*$/.test(s) ? s.slice(1) : s;
}

function quatFromAxisAngle(u, theta) {
  const s = Math.sin(theta / 2);
  return { w: Math.cos(theta / 2), x: u[0] * s, y: u[1] * s, z: u[2] * s };
}

function eulerZYX(q) {
  const { w, x, y, z } = q;
  const roll = Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y));
  const pitch = Math.asin(Math.max(-1, Math.min(1, 2 * (w * y - z * x))));
  const yaw = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z));
  return { roll, pitch, yaw };
}

// ---------- Readouts (work even without WebGL) ----------
let scene3d = null;

function update() {
  const deg = Number(slider.value);
  const theta = deg * DEG;
  const q = quatFromAxisAngle(AXIS, theta);
  const e = eulerZYX(q);

  out.theta.textContent = `${deg}°`;
  out.angle.textContent = `${deg}° = ${fmt(theta)} rad`;
  out.rot.textContent = `(${fmt(theta * AXIS[0])}, ${fmt(theta * AXIS[1])}, ${fmt(theta * AXIS[2])}) rad`;
  out.quat.textContent = `(${fmt(q.w)}, ${fmt(q.x)}, ${fmt(q.y)}, ${fmt(q.z)})`;
  out.roll.textContent = `${fmt(e.roll / DEG, 1)}°`;
  out.pitch.textContent = `${fmt(e.pitch / DEG, 1)}°`;
  out.yaw.textContent = `${fmt(e.yaw / DEG, 1)}°`;

  if (scene3d) scene3d.setRotation(theta, q);
}

slider.addEventListener('input', update);

// ---------- Play / reset ----------
const playBtn = document.getElementById('playBtn');
let playing = false;
let lastT = 0;
let acc = 0;

function setPlayLabel() {
  playBtn.querySelector('[lang="vi"]').textContent = playing ? '❚❚ Dừng' : '▶ Tự chạy';
  playBtn.querySelector('[lang="en"]').textContent = playing ? '❚❚ Pause' : '▶ Play';
}

function tick(t) {
  if (!playing) return;
  const dt = lastT ? (t - lastT) / 1000 : 0;
  lastT = t;
  acc += dt * 45; // degrees per second
  if (acc >= 1) {
    let v = Number(slider.value) + Math.floor(acc);
    acc -= Math.floor(acc);
    if (v > 180) v -= 360;
    slider.value = v;
    update();
  }
  requestAnimationFrame(tick);
}

playBtn.addEventListener('click', () => {
  playing = !playing;
  lastT = 0;
  setPlayLabel();
  if (playing) requestAnimationFrame(tick);
});

document.getElementById('resetBtn').addEventListener('click', () => {
  playing = false;
  setPlayLabel();
  slider.value = 0;
  update();
  if (scene3d) scene3d.resetCamera();
});

update();

// ---------- 3D scene ----------
async function init3d() {
  const view = document.getElementById('demoView');
  const fallback = document.getElementById('demoFallback');
  let THREE, OrbitControls;
  try {
    THREE = await import('three');
    ({ OrbitControls } = await import('three/addons/controls/OrbitControls.js'));
  } catch (err) {
    fallback.querySelector('[lang="vi"]').textContent = 'Không tải được three.js — các số liệu bên cạnh vẫn hoạt động.';
    fallback.querySelector('[lang="en"]').textContent = 'Could not load three.js — the numbers alongside still work.';
    return;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (err) {
    fallback.querySelector('[lang="vi"]').textContent = 'Trình duyệt không hỗ trợ WebGL — các số liệu bên cạnh vẫn hoạt động.';
    fallback.querySelector('[lang="en"]').textContent = 'WebGL is not available — the numbers alongside still work.';
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  view.appendChild(renderer.domElement);
  fallback.remove();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.up.set(0, 0, 1);
  const HOME = new THREE.Vector3(7.6, 5.7, 5.2);
  camera.position.copy(HOME);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 4;
  controls.maxDistance = 18;
  controls.target.set(0, 0, 0.9);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(4, -3, 8);
  scene.add(sun);

  const COLORS = { x: 0xe5484d, y: 0x30a46c, z: 0x3e63dd, orange: 0xf97316, purple: 0x8b5cf6 };

  // Text labels as sprites
  function label(text, color, size = 0.42) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.font = 'bold 84px "Be Vietnam Pro", system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = color;
    g.fillText(text, 64, 68);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    s.scale.set(size, size, 1);
    return s;
  }

  // World axes (thin) + grid in the XY plane
  const world = new THREE.Group();
  const L = 3.4;
  [['x', [L, 0, 0]], ['y', [0, L, 0]], ['z', [0, 0, L]]].forEach(([name, end]) => {
    const dir = new THREE.Vector3(...end).normalize();
    world.add(new THREE.ArrowHelper(dir, new THREE.Vector3(), L, COLORS[name], 0.22, 0.1));
    const lab = label(name, '#' + COLORS[name].toString(16).padStart(6, '0'));
    lab.position.copy(dir.multiplyScalar(L + 0.3));
    world.add(lab);
  });
  scene.add(world);

  let grid;
  function makeGrid() {
    if (grid) { scene.remove(grid); grid.geometry.dispose(); grid.material.dispose(); }
    const dark = document.documentElement.getAttribute('data-theme-effective') === 'dark';
    grid = new THREE.GridHelper(8, 16, dark ? 0x3a4660 : 0xb8c2d3, dark ? 0x232c3f : 0xdde3ec);
    grid.rotation.x = Math.PI / 2;
    scene.add(grid);
  }
  makeGrid();
  document.addEventListener('themechange', () => { makeGrid(); render(); });

  // Drone model, nose along +X (FLU body frame)
  const drone = new THREE.Group();
  const matBody = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.2 });
  const matArm = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });
  const matFront = new THREE.MeshStandardMaterial({ color: COLORS.orange, roughness: 0.4, transparent: true, opacity: 0.85 });
  const matRear = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, transparent: true, opacity: 0.85 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.16), matBody);
  drone.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 16), new THREE.MeshStandardMaterial({ color: COLORS.x }));
  nose.rotation.z = -Math.PI / 2;
  nose.position.set(0.42, 0, 0);
  drone.add(nose);

  const R = 0.95;
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sy]) => {
    const tip = new THREE.Vector3(sx * R / Math.SQRT2, sy * R / Math.SQRT2, 0);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, R, 10), matArm);
    arm.position.copy(tip.clone().multiplyScalar(0.5));
    arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tip.clone().normalize());
    drone.add(arm);
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 16), matBody);
    motor.rotation.x = Math.PI / 2;
    motor.position.set(tip.x, tip.y, 0.04);
    drone.add(motor);
    const prop = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.015, 40), sx > 0 ? matFront : matRear);
    prop.rotation.x = Math.PI / 2;
    prop.position.set(tip.x, tip.y, 0.11);
    drone.add(prop);
  });

  // Body axes, rotating with the drone
  [['x', [1, 0, 0]], ['y', [0, 1, 0]], ['z', [0, 0, 1]]].forEach(([name, d]) => {
    drone.add(new THREE.ArrowHelper(new THREE.Vector3(...d), new THREE.Vector3(), 1.35, COLORS[name], 0.18, 0.1));
  });
  scene.add(drone);

  // Fixed rotation axis (dashed)
  const u = new THREE.Vector3(...AXIS);
  const axisGeom = new THREE.BufferGeometry().setFromPoints([u.clone().multiplyScalar(-3.2), u.clone().multiplyScalar(3.2)]);
  const axisLine = new THREE.Line(axisGeom, new THREE.LineDashedMaterial({ color: COLORS.orange, dashSize: 0.16, gapSize: 0.1 }));
  axisLine.computeLineDistances();
  scene.add(axisLine);

  // Rotation vector r = θ·û, drawn to scale (1 unit = 1 rad)
  const rotArrow = new THREE.ArrowHelper(u, new THREE.Vector3(), 1, COLORS.purple, 0.25, 0.14);
  rotArrow.line.material.linewidth = 2;
  scene.add(rotArrow);
  const rLabel = label('r', '#8b5cf6', 0.4);
  scene.add(rLabel);

  const tmpQ = new THREE.Quaternion();
  function setRotation(theta, q) {
    tmpQ.set(q.x, q.y, q.z, q.w);
    drone.quaternion.copy(tmpQ);
    const len = Math.abs(theta);
    const visible = len > 0.02;
    rotArrow.visible = rLabel.visible = visible;
    if (visible) {
      const dir = u.clone().multiplyScalar(Math.sign(theta));
      rotArrow.setDirection(dir);
      rotArrow.setLength(len, Math.min(0.25, len * 0.4), Math.min(0.14, len * 0.25));
      rLabel.position.copy(dir.multiplyScalar(len + 0.25));
    }
    render();
  }

  function resetCamera() {
    camera.position.copy(HOME);
    controls.target.set(0, 0, 0.9);
    controls.update();
    render();
  }

  function resize() {
    const w = view.clientWidth, h = view.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    render();
  }

  let frameQueued = false;
  function render() {
    if (frameQueued) return;
    frameQueued = true;
    requestAnimationFrame(() => {
      frameQueued = false;
      // Damping needs a few extra frames after the user lets go.
      if (controls.update()) render();
      renderer.render(scene, camera);
    });
  }
  controls.addEventListener('change', render);
  new ResizeObserver(resize).observe(view);

  scene3d = { setRotation, resetCamera };
  resize();
  update();
}

init3d();

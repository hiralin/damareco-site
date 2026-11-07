// How it works: a three.js walkthrough of the app's flow.
// render(progress) is a pure function of 0..1, so scrolling back rewinds it and an autoplay driver can replace the scroll driver.
import * as THREE from "./vendor/three/three.module.min.js";

const STEPS = 6;
const START = .42, STOP = 2.8; // The moments the record and stop buttons are tapped, in step units.

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ramp = (s, a, b) => clamp((s - a) / (b - a));
const ease = (s, a, b) => { const t = ramp(s, a, b); return t * t * (3 - 2 * t); };

// Real screens. Positions are fractions of the screen image.
const IMAGES = { rec: "01-longrecord", pick: "02-successscene", frame: "03-composition", band: "04-recordindicator", look: "05-filter", logo: "06-logoshare", history: "07-storage" };
const AT = { button: [.4993, .9131], dot: [.44, .093], pill: [.4975, .093], pencil: [.915, .725], thumb: [.266, .8], confirm: [.5, .926], logo: [.503, .854], save: [.495, .929], pinch: [.5, .4] };
const CUTS = [[START, START + .08, "band"], [3.02, 3.1, "pick"], [4.1, 4.18, "frame"], [4.42, 4.48, "look"], [4.68, 4.74, "frame"], [4.82, 4.88, "logo"], [5.5, 5.58, "history"]];
const TAPS = [[START, "button"], [STOP, "button"], [4.38, "pencil"], [4.56, "thumb"], [4.66, "confirm"], [4.8, "logo"], [5.06, "save"]];

const PHONE_H = 2.6, PHONE_W = PHONE_H * 1320 / 2868, SCREEN_W = PHONE_W * .952, SCREEN_H = SCREEN_W * 1565 / 720;
const R_BUTTON = SCREEN_W * .06, R_DOT = SCREEN_W * .019; // The record button's red circle is 54pt of a 450pt wide screen.

function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function canvasTexture(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function layoutFor(width, height) {
  const aspect = width / height;
  // Same condition as the @media (min-aspect-ratio) rules in lp.css.
  const wide = width >= 900 && aspect >= .95;
  if (wide) {
    const V = 4.7, span = V * aspect, home = span * .2;
    // The limits on side and pickW keep the phone, the trim frame and its touch mark inside a narrow window.
    return { wide, V, home, side: Math.min(home + .7, span / 2 - .75), py: .25, tapeY: -1.35, pickY: -1.68, keep: 1.8, peel: .88, gap: .22, fw: .2, fh: .31, pickW: Math.min(3.4, span * .5 - .3) };
  }
  const V = Math.max(5.4, 2.75 / aspect), hw = V * aspect / 2;
  const py = V * .385 - 1.3;
  return { wide, V, home: 0, side: hw * .46, py, tapeY: py - 1.58, pickY: py - 1.96, keep: hw * .84, peel: .68, gap: .17, fw: .155, fh: .24, pickW: hw * 1.6 };
}

export async function start(section, off) {
  const live = () => section.classList.contains("guide-on");

  // Real screens: a missing one rejects, which restores the static section.
  const lang = document.documentElement.lang === "en" ? "en" : "ja";
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  const size = Math.min(innerWidth, innerHeight) * .46 * scale <= 400 ? 360 : 720;
  const loader = new THREE.TextureLoader();
  const textures = await Promise.all(Object.values(IMAGES).map((name) => loader.loadAsync(new URL(`img/screens/${lang}/${name}-${size}.webp`, import.meta.url).href)));
  if (!live()) return null;

  const guide = section.querySelector(".guide");
  const stage = guide.querySelector(".guide-stage");
  const canvas = guide.querySelector(".guide-canvas");
  const labels = guide.querySelector(".guide-labels");
  const marks = [...guide.querySelectorAll(".guide-marks button")];
  const steps = [...guide.querySelectorAll(".guide-steps li")];
  const badge = guide.querySelector("[data-guide-badge]");

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  canvas.addEventListener("webglcontextlost", off);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(20, 1, .1, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8bec6, 2.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(-2, 4, 6);
  scene.add(sun);

  const css = getComputedStyle(document.documentElement);
  const token = (name) => new THREE.Color(css.getPropertyValue(name).trim());

  // Phone: a generic rounded slab carrying the real screens.
  const phone = new THREE.Group(), inner = new THREE.Group();
  phone.add(inner);
  scene.add(phone);
  const bodyShape = roundedRect(PHONE_W, PHONE_H, .17);
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(bodyShape, { depth: .05, bevelEnabled: true, bevelThickness: .012, bevelSize: .012, bevelSegments: 2, curveSegments: 10 }),
    new THREE.MeshStandardMaterial({ color: 0x08090b, roughness: .4 }),
  );
  body.position.z = -.025;
  inner.add(body);

  const screenGeo = new THREE.ShapeGeometry(roundedRect(SCREEN_W, SCREEN_H, .13), 10);
  const uv = screenGeo.attributes.uv, pos = screenGeo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / SCREEN_W + .5, pos.getY(i) / SCREEN_H + .5);

  const screens = {};
  for (const [i, key] of Object.keys(IMAGES).entries()) {
    const tex = textures[i];
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const mesh = new THREE.Mesh(screenGeo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
    mesh.position.z = .04;
    mesh.visible = false;
    inner.add(mesh);
    screens[key] = mesh;
  }

  const onScreen = (u, v, z = .05) => new THREE.Vector3((u - .5) * SCREEN_W, (.5 - v) * SCREEN_H, z);
  const buttonAt = onScreen(...AT.button, .046), dotAt = onScreen(...AT.dot, .046);

  // Before recording the button is a red circle in the ring, so the screenshot's stop square stays hidden until the tap.
  const patch = new THREE.Mesh(new THREE.CircleGeometry(SCREEN_W * .05, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, depthWrite: false, toneMapped: false }));
  patch.position.copy(onScreen(...AT.button, .043));
  patch.renderOrder = 3;
  inner.add(patch);

  // The clock over the screenshot's timer pill.
  const clockCanvas = document.createElement("canvas");
  clockCanvas.width = 300; clockCanvas.height = 142;
  const clockTex = new THREE.CanvasTexture(clockCanvas);
  clockTex.colorSpace = THREE.SRGBColorSpace;
  const clock = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN_W * .209, SCREEN_W * .0986), new THREE.MeshBasicMaterial({ map: clockTex, transparent: true, depthWrite: false, toneMapped: false }));
  clock.position.copy(onScreen(...AT.pill, .044));
  clock.renderOrder = 4;
  inner.add(clock);
  let clockText = "";
  function setClock(seconds) {
    const text = `${Math.floor(seconds / 60)}:${String(Math.floor(seconds) % 60).padStart(2, "0")}`;
    if (text === clockText) return;
    clockText = text;
    const c = clockCanvas.getContext("2d");
    c.clearRect(0, 0, 300, 142);
    c.fillStyle = "rgba(38,40,42,.94)";
    c.beginPath(); c.roundRect(2, 2, 296, 138, 69); c.fill();
    c.fillStyle = "#fff";
    c.beginPath(); c.arc(72, 71, 25, 0, Math.PI * 2); c.arc(72, 71, 11, 0, Math.PI * 2, true); c.fill();
    c.font = '500 54px -apple-system, "Segoe UI", sans-serif';
    c.textBaseline = "middle"; c.textAlign = "right";
    c.fillText(text, 262, 74);
    clockTex.needsUpdate = true;
  }

  // Stand: only a base and a lip for the phone to rest on.
  const standMat = new THREE.MeshStandardMaterial({ color: token("--phone-edge"), roughness: .6 });
  const stand = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.34, .38, .05, 36), standMat);
  base.position.y = -.2;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.04, .05, .18, 16), standMat);
  neck.position.y = -.1;
  const lip = new THREE.Mesh(new THREE.BoxGeometry(PHONE_W * .62, .05, .2), standMat);
  stand.add(base, neck, lip);
  stand.position.y = -PHONE_H / 2 - .04;
  phone.add(stand);

  const shadowTex = canvasTexture(128, 64, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(22,25,29,.32)");
    g.addColorStop(1, "rgba(22,25,29,0)");
    c.setTransform(1, 0, 0, .5, 0, h / 4);
    c.fillStyle = g; c.fillRect(0, 0, w, w);
  });
  const shadow = () => new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, toneMapped: false }));
  const phoneShadow = shadow();
  phoneShadow.scale.set(1.3, .26, 1);
  scene.add(phoneShadow);

  // REC: the record button's red circle moves to the timer as the dot and goes out on stop. The only red on the stage.
  const rec = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: token("--rec"), transparent: true, depthWrite: false, toneMapped: false }));
  rec.renderOrder = 5;
  inner.add(rec);

  // Tape: frames cut from the real recording.
  const frameGeo = new THREE.PlaneGeometry(1, 1);
  const fuv = frameGeo.attributes.uv;
  for (let i = 0; i < fuv.count; i++) fuv.setXY(i, lerp(.02, .98, fuv.getX(i)), lerp(.16, .88, fuv.getY(i)));
  const MAX_FRAMES = 24;
  const tape = new THREE.InstancedMesh(frameGeo, new THREE.MeshBasicMaterial({ map: screens.rec.material.map, toneMapped: false }), MAX_FRAMES);
  tape.frustumCulled = false;
  tape.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  tape.setColorAt(0, new THREE.Color(1, 1, 1));
  scene.add(tape);

  // The yellow selection, the same shape as the app's trim frame.
  const yellow = new THREE.MeshBasicMaterial({ color: token("--active"), transparent: true, toneMapped: false });
  const bar = () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), yellow); scene.add(m); return m; };
  const trim = { top: bar(), bottom: bar(), left: bar(), right: bar() };

  // Touch marks.
  const markTex = canvasTexture(128, 128, (c, w) => {
    c.beginPath(); c.arc(w / 2, w / 2, 50, 0, Math.PI * 2);
    c.fillStyle = "rgba(255,255,255,.35)"; c.fill();
    c.lineWidth = 7; c.strokeStyle = "#fff"; c.stroke();
    c.lineWidth = 2; c.strokeStyle = "rgba(22,25,29,.45)";
    c.beginPath(); c.arc(w / 2, w / 2, 54, 0, Math.PI * 2); c.stroke();
  });
  const touch = () => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(.26, .26), new THREE.MeshBasicMaterial({ map: markTex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    m.renderOrder = 10;
    scene.add(m);
    return m;
  };
  const touches = [touch(), touch()];
  const showTouch = (m, point, opacity, size = 1) => {
    m.visible = opacity > .01;
    m.position.copy(point);
    m.quaternion.copy(inner.getWorldQuaternion(new THREE.Quaternion()));
    m.scale.setScalar(size);
    m.material.opacity = opacity;
  };

  const older = document.createElement("span"), keep = document.createElement("span");
  older.className = "older"; keep.className = "keep";
  const source = section.querySelectorAll(".tape-labels span");
  older.append(...source[0].cloneNode(true).childNodes);
  keep.textContent = source[1].textContent;
  labels.append(older, keep);

  let L, w = 1, h = 1;
  function resize() {
    w = stage.clientWidth; h = stage.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    L = layoutFor(w, h);
    camera.aspect = w / h;
    const distance = (L.V / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.set(0, .3, distance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), euler = new THREE.Euler(), v3 = new THREE.Vector3(), sv = new THREE.Vector3();
  const white = new THREE.Color(1, 1, 1), tint = new THREE.Color();
  const toPx = (x, y) => { const p = new THREE.Vector3(x, y, 0).project(camera); return [(p.x + 1) / 2 * w, (1 - p.y) / 2 * h]; };
  const world = (u, v, z) => inner.localToWorld(onScreen(u, v, z));

  let shownStep = -1;

  function render(p) {
    const s = clamp(p) * STEPS;

    // Phone.
    const away = ease(s, 1, 1.25) * (1 - ease(s, 2.05, 2.4));
    phone.position.set(lerp(L.home, L.side, away), L.py, 0);
    phone.rotation.set(-.04, lerp(lerp(-.2, -.1, ease(s, 1, 1.25)), 0, ease(s, 3.02, 3.4)), 0);
    phone.scale.setScalar(lerp(1, .92, ease(s, 5.6, 5.9)));
    const drop = 1 - ease(s, 0, .22);
    inner.position.y = drop * .2;
    inner.rotation.z = drop * -.06;
    phone.updateMatrixWorld(true);
    phoneShadow.position.set(phone.position.x, L.py - PHONE_H / 2 - .27, -.3);

    // Screens.
    let from = "rec", to = "rec", mix = 0;
    for (const [a, b, next] of CUTS) {
      if (s >= b) { from = to = next; mix = 0; continue; }
      if (s > a) { to = next; mix = ease(s, a, b); }
      break;
    }
    for (const key in screens) screens[key].visible = false;
    Object.assign(screens[from], { visible: true, renderOrder: 1 });
    screens[from].material.opacity = 1;
    if (to !== from) {
      Object.assign(screens[to], { visible: true, renderOrder: 2 });
      screens[to].material.opacity = mix;
    }
    patch.visible = s < START + .08;
    patch.material.opacity = 1 - ease(s, START, START + .08);

    // Clock: past 3 minutes the kept tape stays the same length.
    const clockOn = s < 3.22;
    clock.visible = clockOn;
    clock.material.opacity = 1 - ease(s, 3.02, 3.22);
    if (clockOn) setClock(s < 1 ? lerp(0, 12, ramp(s, START, 1)) : s < 2 ? lerp(12, 1122, ease(s, 1, 2)) : lerp(1122, 1130, ramp(s, 2, STOP)));

    // REC.
    const moved = ease(s, START + .02, START + .16);
    rec.position.lerpVectors(buttonAt, dotAt, moved);
    rec.scale.setScalar(Math.max(lerp(R_BUTTON, R_DOT, moved) * (1 - ease(s, STOP, STOP + .08)), .001));
    rec.visible = s < STOP + .08;

    // Tape.
    const flow = (Math.min(s, STOP) - Math.min(s, 1)) * 2.6 * (L.keep + L.peel) / 1.8;
    const total = Math.round((L.keep + L.peel) / L.gap) * L.gap;
    const count = Math.min(MAX_FRAMES, Math.round(total / L.gap));
    const reach = lerp(0, total, ramp(s, 1.02, 1.5));
    const lower = L.py - PHONE_H / 2 - .02;
    const settle = ease(s, 3.02, 3.4);
    const k = L.pickW / L.keep;
    const selFrom = lerp(0, .12, ease(s, 3.72, 3.92)), selTo = lerp(1, .62, ease(s, 3.5, 3.72));
    tape.count = count;
    tape.visible = s > 1 && s < 5.75;
    for (let i = 0; i < count; i++) {
      const d = (i * L.gap + flow) % total;
      const n = d / L.keep;
      let x = phone.position.x - d, y = L.tapeY + (lower - L.tapeY) * (1 - ease(d, 0, .36)), z = .45, rz = 0, size = ramp(d, 0, .14);
      if (d > reach) size = 0;
      if (d > L.keep) {
        const t = (d - L.keep) / (total - L.keep);
        x -= t * .12; y -= t * t * .75; rz = t * 1.5;
        size *= (1 - t * t) * (1 - ease(s, STOP, STOP + .2));
      }
      // After the stop, the kept frames spread out under the phone.
      const pickX = L.home + (L.keep / 2 - d) * k;
      x = lerp(x, pickX, settle); y = lerp(y, L.pickY, settle);
      let zoom = lerp(1, k, settle), col = 1;
      const selected = n >= selFrom - .001 && n <= selTo + .001;
      if (!selected) col = 1 - ease(s, 3.5, 3.9) * .6;
      if (d <= L.keep) size = lerp(size, 1, settle);
      // Saving: the selection goes into the phone, the rest disappears.
      if (selected) {
        const delay = clamp((n - .12) / .5) * .16;
        const t = ease(s, 5.1 + delay, 5.32 + delay);
        x = lerp(x, phone.position.x, t); y = lerp(y, L.py - .4, t); zoom = lerp(zoom, .55, t);
        size *= 1 - ramp(t, .7, 1);
      } else {
        const t = ease(s, 5.1, 5.35);
        y -= t * .6; size *= 1 - t;
      }
      euler.set(0, 0, rz); q.setFromEuler(euler);
      v3.set(x, y, z);
      sv.set(L.fw * zoom * Math.max(size, .0001), L.fh * zoom * Math.max(size, .0001), 1);
      tape.setMatrixAt(i, m4.compose(v3, q, sv));
      tape.setColorAt(i, col === 1 ? white : tint.setRGB(col, col, col));
    }
    tape.instanceMatrix.needsUpdate = true;
    if (tape.instanceColor) tape.instanceColor.needsUpdate = true;

    // Selection frame.
    const alpha = ease(s, 3.35, 3.5) * (1 - ease(s, 5.06, 5.14));
    const half = L.fw * k / 2;
    const xR = L.home + (L.keep / 2 - selFrom * L.keep) * k + half;
    const xL = L.home + (L.keep / 2 - selTo * L.keep) * k - half;
    const fh = L.fh * k + .08, cx = (xL + xR) / 2;
    yellow.opacity = alpha;
    for (const key in trim) trim[key].visible = alpha > .01;
    trim.top.position.set(cx, L.pickY + fh / 2, .47); trim.top.scale.set(xR - xL, .03, 1);
    trim.bottom.position.set(cx, L.pickY - fh / 2, .47); trim.bottom.scale.set(xR - xL, .03, 1);
    trim.left.position.set(xL, L.pickY, .47); trim.left.scale.set(.06, fh, 1);
    trim.right.position.set(xR, L.pickY, .47); trim.right.scale.set(.06, fh, 1);

    // Touch marks.
    let tap = null;
    for (const [at, target] of TAPS) if (s > at - .08 && s < at + .1) tap = [at, target];
    if (tap) {
      const [at, target] = tap;
      showTouch(touches[0], world(...AT[target], .1), ease(s, at - .08, at - .03) * (1 - ease(s, at + .02, at + .1)), 1 + ramp(s, at, at + .1) * .7);
      showTouch(touches[1], v3, 0);
    } else if (s > 4.05 && s < 4.36) {
      const sep = lerp(.09, .22, ease(s, 4.12, 4.33)), op = ease(s, 4.05, 4.1) * (1 - ease(s, 4.31, 4.36));
      showTouch(touches[0], world(AT.pinch[0] - sep, AT.pinch[1] + sep * .46, .1), op);
      showTouch(touches[1], world(AT.pinch[0] + sep, AT.pinch[1] - sep * .46, .1), op);
    } else if (s > 3.46 && s < 3.96) {
      const left = s < 3.72, x = left ? xL : xR;
      const op = left ? ease(s, 3.46, 3.5) * (1 - ease(s, 3.68, 3.72)) : ease(s, 3.72, 3.76) * (1 - ease(s, 3.92, 3.96));
      showTouch(touches[0], new THREE.Vector3(x, L.pickY, .5), op);
      touches[0].quaternion.identity();
      showTouch(touches[1], v3, 0);
    } else {
      showTouch(touches[0], v3, 0);
      showTouch(touches[1], v3, 0);
    }

    renderer.render(scene, camera);

    // DOM: step text, marks and the tape's existing labels.
    const step = Math.min(STEPS - 1, Math.floor(s + 1e-4));
    if (step !== shownStep) {
      shownStep = step;
      steps.forEach((li, i) => li.classList.toggle("is-active", i === step));
      marks.forEach((b, i) => (i === step ? b.setAttribute("aria-current", "step") : b.removeAttribute("aria-current")));
      if (badge) badge.tabIndex = step === STEPS - 1 ? 0 : -1;
    }
    const labelsOn = ease(s, 1.3, 1.5) * (1 - ease(s, 1.9, 2.05));
    labels.style.opacity = labelsOn;
    labels.style.visibility = labelsOn > 0 ? "visible" : "hidden";
    if (labelsOn > 0) {
      const [xKeepR, y] = toPx(phone.position.x, L.tapeY - L.fh / 2 - .05);
      const [xKeepL] = toPx(phone.position.x - L.keep, 0);
      keep.style.transform = `translate(${xKeepL}px, ${y}px)`;
      keep.style.width = `${xKeepR - xKeepL}px`;
      const [, yAbove] = toPx(0, L.tapeY + L.fh / 2 + .06);
      older.style.transform = `translate(calc(${xKeepL + 4}px - 100%), calc(${yAbove}px - 100%))`;
    }
  }

  // Scroll driver.
  let target = 0, shown = 0, frame = 0, last = 0, onscreen = true;
  const read = () => {
    const box = guide.getBoundingClientRect();
    return clamp(-box.top / Math.max(1, box.height - stage.offsetHeight));
  };
  const tick = (now) => {
    frame = 0;
    const gap = target - shown, dt = Math.min(50, now - last || 16);
    last = now;
    shown = Math.abs(gap) < .0003 ? target : shown + gap * (1 - Math.exp(-dt / 70));
    render(shown);
    if (shown !== target) schedule();
  };
  const schedule = () => { if (!frame && onscreen && !document.hidden && live()) frame = requestAnimationFrame(tick); };
  const onScroll = () => { target = read(); schedule(); };

  addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("visibilitychange", schedule);
  const seen = new IntersectionObserver((entries) => { onscreen = entries[0].isIntersecting; schedule(); });
  seen.observe(guide);
  const sized = new ResizeObserver(() => { if (!live()) return; resize(); onScroll(); schedule(); });
  sized.observe(stage);

  marks.forEach((button, i) => button.addEventListener("click", () => {
    const top = guide.getBoundingClientRect().top + scrollY;
    scrollTo({ top: top + (guide.offsetHeight - stage.offsetHeight) * (i + .86) / STEPS });
  }));

  resize();
  shown = target = read();
  render(shown);

  const stop = () => {
    cancelAnimationFrame(frame);
    removeEventListener("scroll", onScroll);
    document.removeEventListener("visibilitychange", schedule);
    seen.disconnect();
    sized.disconnect();
    canvas.removeEventListener("webglcontextlost", off);
    renderer.dispose();
    renderer.forceContextLoss();
  };
  return { render, stop };
}

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/**
 * The landing page's 3D centrepiece. Three looks are available:
 *  - "planet": a glowing "planet of the future" with a Saturn-like ring of
 *    light, a rocket circling it and career badges orbiting around;
 *  - "ai": a glass crystal "AI brain" with a pulsing core inside a neural
 *    network of glowing nodes;
 *  - "path": floating islands spiralling upwards like a staircase from
 *    school to career, with a glowing orb hopping along the path.
 *
 * Plain three.js, lazy-loaded. Rendering pauses when off-screen or when the
 * tab is hidden, quality is lowered on phones, and "reduce motion" users
 * get a single still frame.
 */

export type SceneVariant = "planet" | "ai" | "path" | "robot" | "student";

const VIOLET = 0x7c4dff;
const VIOLET_LIGHT = 0xa78bfa;
const BLUE = 0x4f6df5;
const CYAN = 0x22d3ee;
const PINK = 0xf472b6;
const AMBER = 0xfbbf24;

type Updater = (t: number) => void;

function phys(color: number, opts: Partial<THREE.MeshPhysicalMaterialParameters> = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.15, ...opts });
}

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.25, "rgba(255,255,255,0.55)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function glow(tex: THREE.Texture, color: number, size: number, opacity = 0.8) {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  s.scale.setScalar(size);
  return s;
}

/** A round glassy badge with an emoji on it, drawn into a canvas texture. */
function badge(emoji: string, ring: string, size = 0.9) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const grd = g.createLinearGradient(0, 0, 256, 256);
  grd.addColorStop(0, "rgba(255,255,255,0.95)");
  grd.addColorStop(1, "rgba(230,224,255,0.9)");
  g.beginPath();
  g.arc(128, 128, 112, 0, Math.PI * 2);
  g.fillStyle = grd;
  g.fill();
  g.lineWidth = 12;
  g.strokeStyle = ring;
  g.stroke();
  g.font = "120px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(emoji, 128, 138);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.setScalar(size);
  return s;
}

/** Soft fresnel "atmosphere" shell around a sphere. */
function atmosphere(radius: number, color: number, power = 2.5, strength = 1.2) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius, 64, 64),
    new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uPow: { value: power }, uStr: { value: strength } },
      vertexShader: `varying vec3 vN; varying vec3 vV;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform vec3 uColor; uniform float uPow; uniform float uStr; varying vec3 vN; varying vec3 vV;
        void main(){ float f = pow(1.0 - abs(dot(vN, vV)), uPow) * uStr; gl_FragColor = vec4(uColor * f, f); }`,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
}

/** Procedural banded "gas giant" texture in the brand colours. */
function planetTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const g = c.getContext("2d")!;
  const grd = g.createLinearGradient(0, 0, 0, 256);
  const stops = ["#2a1a7a", "#5b3df5", "#7c4dff", "#4f6df5", "#22d3ee", "#6d5dfc", "#a78bfa", "#3b2bb8", "#f472b6", "#5b3df5", "#2a1a7a"];
  stops.forEach((s, i) => grd.addColorStop(i / (stops.length - 1), s));
  g.fillStyle = grd;
  g.fillRect(0, 0, 512, 256);
  // Wavy bands for a "living" surface.
  for (let i = 0; i < 70; i++) {
    const y = Math.random() * 256;
    g.strokeStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.08})`;
    g.lineWidth = 1 + Math.random() * 5;
    g.beginPath();
    for (let x = 0; x <= 512; x += 16) g.lineTo(x, y + Math.sin(x / 40 + i) * 4);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

/* ------------------------------------------------------------------ */
/* Variant A: planet of the future                                    */
/* ------------------------------------------------------------------ */
function buildPlanet(world: THREE.Group, tex: THREE.Texture, small: boolean): Updater {
  const R = 1.55;
  const surface = planetTexture();
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(R, 96, 96),
    phys(0xffffff, { map: surface, roughness: 0.45, metalness: 0.1, clearcoat: 0.6, emissive: VIOLET, emissiveIntensity: 0.12 })
  );
  planet.rotation.z = 0.35;
  world.add(planet);
  world.add(atmosphere(R * 1.08, CYAN, 3, 1.4));
  const halo = glow(tex, VIOLET, R * 5.2, 0.55);
  halo.position.z = -1;
  world.add(halo);

  // Saturn-like ring made of glowing dust.
  const ringGroup = new THREE.Group();
  ringGroup.rotation.set(Math.PI / 2 - 0.42, 0, 0.25);
  const n = small ? 1400 : 3000;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const cA = new THREE.Color(VIOLET_LIGHT);
  const cB = new THREE.Color(CYAN);
  const cC = new THREE.Color(PINK);
  for (let i = 0; i < n; i++) {
    const r = R * (1.45 + Math.pow(Math.random(), 0.7) * 0.95);
    const a = Math.random() * Math.PI * 2;
    pos.set([Math.cos(a) * r, Math.sin(a) * r, (Math.random() - 0.5) * 0.06], i * 3);
    const c = i % 7 === 0 ? cC : cA.clone().lerp(cB, (r / R - 1.45) / 0.95);
    col.set([c.r, c.g, c.b], i * 3);
  }
  const ringGeo = new THREE.BufferGeometry();
  ringGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  ringGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const ringDust = new THREE.Points(
    ringGeo,
    new THREE.PointsMaterial({ size: 0.055, map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  ringGroup.add(ringDust);
  const ringLine = new THREE.Mesh(new THREE.TorusGeometry(R * 1.42, 0.012, 8, 200), new THREE.MeshBasicMaterial({ color: CYAN }));
  ringGroup.add(ringLine);
  world.add(ringGroup);

  // Rocket circling the planet.
  const rocketOrbit = new THREE.Group();
  rocketOrbit.rotation.set(0.5, 0, -0.35);
  const rocket = new THREE.Group();
  const white = phys(0xffffff, { metalness: 0.3, roughness: 0.2 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.36, 8, 24), white);
  rocket.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.22, 24), phys(PINK, { emissive: PINK, emissiveIntensity: 0.3 }));
  nose.position.y = 0.36;
  rocket.add(nose);
  const window_ = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), phys(CYAN, { emissive: CYAN, emissiveIntensity: 0.8 }));
  window_.position.set(0, 0.08, 0.12);
  rocket.add(window_);
  for (let i = 0; i < 3; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.14), phys(VIOLET));
    const a = (i / 3) * Math.PI * 2;
    fin.position.set(Math.sin(a) * 0.13, -0.22, Math.cos(a) * 0.13);
    fin.rotation.y = a;
    rocket.add(fin);
  }
  const flame = glow(tex, AMBER, 0.55, 0.95);
  flame.position.y = -0.38;
  rocket.add(flame);
  const flame2 = glow(tex, PINK, 0.35, 0.9);
  flame2.position.y = -0.5;
  rocket.add(flame2);
  rocket.scale.setScalar(1.25);
  const orbitR = R * 1.95;
  rocketOrbit.add(rocket);
  // Faint trail ring for the rocket.
  rocketOrbit.add(
    new THREE.Mesh(
      new THREE.TorusGeometry(orbitR, 0.008, 6, 200),
      new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0.35 })
    )
  );
  world.add(rocketOrbit);

  // Career badges floating around.
  const careers: [string, string, [number, number, number]][] = [
    ["💻", "#7c4dff", [-2.9, 1.3, 0.4]],
    ["🩺", "#22d3ee", [2.9, 1.5, 0.2]],
    ["🎨", "#f472b6", [-3.1, -1.1, 0.6]],
    ["⚖️", "#fbbf24", [3.0, -1.0, 0.8]],
    ["🔬", "#4f6df5", [-1.2, 2.5, -0.6]],
    ["🏗️", "#a78bfa", [1.5, -2.3, 1.0]],
  ];
  const badges = careers.map(([e, ring, p], i) => {
    const b = badge(e, ring, 0.85);
    b.position.set(...p);
    const bg = glow(tex, new THREE.Color(ring).getHex(), 1.6, 0.4);
    bg.position.set(p[0], p[1], p[2] - 0.05);
    world.add(bg, b);
    return { b, bg, base: p[1], phase: i * 1.1 };
  });

  return (t) => {
    planet.rotation.y = t * 0.15;
    surface.offset.x = t * 0.01;
    ringDust.rotation.z = t * 0.05;
    const a = t * 0.6;
    rocket.position.set(Math.cos(a) * orbitR, Math.sin(a) * orbitR, 0);
    rocket.rotation.z = a; // nose points along the orbit
    flame.scale.setScalar(0.5 + Math.sin(t * 20) * 0.08);
    badges.forEach(({ b, bg, base, phase }) => {
      const y = base + Math.sin(t * 0.9 + phase) * 0.15;
      b.position.y = y;
      bg.position.y = y;
    });
  };
}

/* ------------------------------------------------------------------ */
/* Variant B: AI crystal brain                                        */
/* ------------------------------------------------------------------ */
function buildAi(world: THREE.Group, tex: THREE.Texture, small: boolean): Updater {
  const crystal = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.35, 1),
    phys(VIOLET_LIGHT, {
      flatShading: true,
      roughness: 0.05,
      metalness: 0.2,
      emissive: VIOLET,
      emissiveIntensity: 0.25,
      transmission: 0.3,
      thickness: 1.2,
      ior: 1.5,
      iridescence: 1,
      iridescenceIOR: 1.8,
      transparent: true,
      opacity: 0.85,
    })
  );
  world.add(crystal);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 48, 48), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  world.add(core);
  const coreGlow = glow(tex, CYAN, 3.2, 0.9);
  const coreGlow2 = glow(tex, VIOLET, 5.5, 0.7);
  world.add(coreGlow2, coreGlow);
  const wire = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.9, 1)),
    new THREE.LineBasicMaterial({ color: VIOLET_LIGHT, transparent: true, opacity: 0.45 })
  );
  world.add(wire);

  // Neural network: nodes on a sphere, linked to nearest neighbours.
  const nodeCount = small ? 46 : 70;
  const nodes: THREE.Vector3[] = [];
  for (let i = 0; i < nodeCount; i++) {
    const y = 1 - (i / (nodeCount - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = i * 2.399963;
    nodes.push(new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r).multiplyScalar(2.9 + (i % 3) * 0.25));
  }
  const net = new THREE.Group();
  const linePos: number[] = [];
  const edges: [THREE.Vector3, THREE.Vector3][] = [];
  nodes.forEach((a, i) => {
    nodes
      .map((b, j) => ({ j, d: a.distanceTo(b) }))
      .filter((o) => o.j > i)
      .sort((x, y) => x.d - y.d)
      .slice(0, 2)
      .forEach(({ j }) => {
        linePos.push(a.x, a.y, a.z, nodes[j].x, nodes[j].y, nodes[j].z);
        edges.push([a, nodes[j]]);
      });
  });
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePos, 3));
  net.add(new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: VIOLET_LIGHT, transparent: true, opacity: 0.28 })));
  const colors = [CYAN, PINK, VIOLET_LIGHT, AMBER];
  nodes.forEach((p, i) => {
    const s = glow(tex, colors[i % colors.length], 0.32, 0.95);
    s.position.copy(p);
    net.add(s);
  });
  // Pulses travelling along links (signals).
  const pulses = Array.from({ length: small ? 14 : 24 }, (_, i) => {
    const s = glow(tex, i % 2 ? CYAN : PINK, 0.28, 1);
    net.add(s);
    return { s, e: edges[(i * 7) % edges.length], speed: 0.3 + (i % 5) * 0.08, off: i * 0.37 };
  });
  // Links from core to a few nodes.
  const spokes: number[] = [];
  nodes.forEach((p, i) => i % 6 === 0 && spokes.push(0, 0, 0, p.x, p.y, p.z));
  const spokeGeo = new THREE.BufferGeometry();
  spokeGeo.setAttribute("position", new THREE.Float32BufferAttribute(spokes, 3));
  net.add(new THREE.LineSegments(spokeGeo, new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.18 })));
  world.add(net);

  // Orbiting rings.
  const rings = [0.4, -0.6, 1.2].map((tilt, i) => {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(2.25 + i * 0.12, 0.015, 8, 160),
      new THREE.MeshBasicMaterial({ color: [CYAN, PINK, VIOLET_LIGHT][i], transparent: true, opacity: 0.7 })
    );
    m.rotation.set(Math.PI / 2 + tilt, tilt, 0);
    world.add(m);
    return m;
  });

  return (t) => {
    crystal.rotation.y = t * 0.25;
    crystal.rotation.x = Math.sin(t * 0.3) * 0.3;
    wire.rotation.y = -t * 0.12;
    wire.rotation.z = t * 0.05;
    const pulse = 1 + Math.sin(t * 2.2) * 0.12;
    core.scale.setScalar(pulse);
    coreGlow.scale.setScalar(3.2 * pulse);
    net.rotation.y = t * 0.06;
    rings.forEach((r, i) => (r.rotation.z = t * (0.2 + i * 0.1) * (i % 2 ? -1 : 1)));
    pulses.forEach(({ s, e, speed, off }) => {
      const k = (t * speed + off) % 1;
      s.position.lerpVectors(e[0], e[1], k);
    });
  };
}

/* ------------------------------------------------------------------ */
/* Variant C: path of floating islands                                */
/* ------------------------------------------------------------------ */
function buildPath(world: THREE.Group, tex: THREE.Texture): Updater {
  const steps: [string, number][] = [
    ["📚", BLUE],
    ["🧪", CYAN],
    ["🎯", PINK],
    ["🎓", VIOLET],
    ["🚀", AMBER],
  ];
  const points: THREE.Vector3[] = [];
  const islands = steps.map(([emoji, color], i) => {
    const a = -2.3 + i * 1.15;
    const p = new THREE.Vector3(Math.cos(a) * 2.2 - 0.3, -2.3 + i * 0.8, Math.sin(a) * 1.4);
    points.push(p.clone().add(new THREE.Vector3(0, 0.25, 0)));
    const g = new THREE.Group();
    g.position.copy(p);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.16, 6), phys(0xf5f3ff, { roughness: 0.3 }));
    g.add(top);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.5, 0.12, 6), phys(color, { emissive: color, emissiveIntensity: 0.6 }));
    rim.position.y = -0.13;
    g.add(rim);
    const rock = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.9, 6), phys(0x2a1f66, { roughness: 0.7, flatShading: true }));
    rock.rotation.x = Math.PI;
    rock.position.y = -0.64;
    g.add(rock);
    const under = glow(tex, color, 1.8, 0.5);
    under.position.y = -0.3;
    g.add(under);
    const b = badge(emoji, `#${new THREE.Color(color).getHexString()}`, 0.75);
    b.position.y = 0.62;
    g.add(b);
    world.add(g);
    return { g, base: p.y, i };
  });
  // Glowing dotted path between the islands.
  const curve = new THREE.CatmullRomCurve3(points);
  const pathMesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 200, 0.025, 8, false),
    new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.7 })
  );
  world.add(pathMesh);
  const traveller = glow(tex, 0xffffff, 0.7, 1);
  const travellerC = glow(tex, CYAN, 1.4, 0.8);
  world.add(travellerC, traveller);
  // Big star at the top: the goal.
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.22 : 0.5;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    if (i === 0) starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const star = new THREE.Mesh(
    new THREE.ExtrudeGeometry(starShape, { depth: 0.15, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 3 }),
    phys(AMBER, { metalness: 0.9, roughness: 0.2, emissive: AMBER, emissiveIntensity: 0.3 })
  );
  const last = points[points.length - 1];
  star.position.set(last.x, last.y + 1.05, last.z);
  world.add(star);
  const starGlow = glow(tex, AMBER, 2.6, 0.8);
  starGlow.position.copy(star.position);
  world.add(starGlow);
  const center = glow(tex, VIOLET, 7, 0.45);
  center.position.z = -2;
  world.add(center);

  return (t) => {
    islands.forEach(({ g, base, i }) => {
      g.position.y = base + Math.sin(t * 0.9 + i) * 0.08;
      g.rotation.y = Math.sin(t * 0.4 + i) * 0.2;
    });
    const k = (t * 0.12) % 1;
    const p = curve.getPointAt(k);
    traveller.position.copy(p);
    travellerC.position.copy(p);
    star.rotation.y = t * 0.8;
    starGlow.scale.setScalar(2.6 + Math.sin(t * 2) * 0.25);
  };
}

/* ------------------------------------------------------------------ */
/* Variant D: friendly robot mascot (the "AI advisor")                */
/* ------------------------------------------------------------------ */
type Pointer = { x: number; y: number };

function buildRobot(world: THREE.Group, tex: THREE.Texture, pointer: Pointer): Updater {
  const white = phys(0xf8f7ff, { roughness: 0.22, metalness: 0.05, clearcoat: 1 });
  const violet = phys(VIOLET, { roughness: 0.3, metalness: 0.3 });
  const glass = phys(0x0b0820, { roughness: 0.08, metalness: 0.4, clearcoat: 1 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x7df9ff });

  const robot = new THREE.Group();
  robot.position.y = -0.2;
  world.add(robot);

  // Body: a soft egg.
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.95, 64, 64), white);
  body.scale.set(1, 1.08, 0.9);
  body.position.y = -0.9;
  robot.add(body);
  const belly = new THREE.Mesh(new THREE.CircleGeometry(0.34, 48), glass);
  belly.position.set(0, -0.78, 0.84);
  robot.add(belly);
  const heart = glow(tex, PINK, 0.75, 1);
  heart.position.set(0, -0.78, 0.88);
  robot.add(heart);
  const heartCore = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 24), new THREE.MeshBasicMaterial({ color: 0xffd1ec }));
  heartCore.position.set(0, -0.78, 0.86);
  robot.add(heartCore);

  // Neck + head group (turns towards the pointer).
  const head = new THREE.Group();
  head.position.y = 0.55;
  robot.add(head);
  const skull = new THREE.Mesh(new RoundedBoxGeometry(2.0, 1.55, 1.5, 8, 0.55), white);
  head.add(skull);
  const face = new THREE.Mesh(new RoundedBoxGeometry(1.62, 1.12, 0.2, 8, 0.1), glass);
  face.position.z = 0.68;
  head.add(face);
  const faceGlow = glow(tex, CYAN, 2.2, 0.25);
  faceGlow.position.z = 0.8;
  head.add(faceGlow);
  // Eyes.
  const eyes = new THREE.Group();
  eyes.position.z = 0.8;
  head.add(eyes);
  const eyeGeo = new THREE.CapsuleGeometry(0.12, 0.16, 8, 24);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.36, 0.08, 0);
  eyeR.position.set(0.36, 0.08, 0);
  eyes.add(eyeL, eyeR);
  [eyeL, eyeR].forEach((e) => {
    const g = glow(tex, CYAN, 0.8, 0.9);
    g.position.copy(e.position);
    eyes.add(g);
  });
  // Smile.
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 12, 32, Math.PI), eyeMat);
  smile.rotation.z = Math.PI;
  smile.position.set(0, -0.2, 0.8);
  head.add(smile);
  // Cheeks.
  [-0.62, 0.62].forEach((x) => {
    const c = glow(tex, PINK, 0.5, 0.8);
    c.position.set(x, -0.18, 0.82);
    head.add(c);
  });
  // Ears.
  [-1.03, 1.03].forEach((x) => {
    const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.18, 40), violet);
    ear.rotation.z = Math.PI / 2;
    ear.position.x = x;
    head.add(ear);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.03, 8, 32), new THREE.MeshBasicMaterial({ color: CYAN }));
    ring.rotation.y = Math.PI / 2;
    ring.position.x = x * 1.1;
    head.add(ring);
  });
  // Graduation cap on top.
  const capMat = phys(0x1b1440, { roughness: 0.4, metalness: 0.3 });
  const cap = new THREE.Group();
  cap.position.set(0.1, 0.86, 0);
  cap.rotation.z = -0.12;
  const board = new THREE.Mesh(new RoundedBoxGeometry(1.45, 0.07, 1.45, 2, 0.03), capMat);
  board.rotation.y = Math.PI / 4;
  board.position.y = 0.2;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.55, 0.3, 40), capMat);
  crown.position.y = 0.04;
  const gold = phys(AMBER, { metalness: 0.95, roughness: 0.2 });
  const btn = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), gold);
  btn.position.y = 0.25;
  const tasselPivot = new THREE.Group();
  tasselPivot.position.set(0.55, 0.22, 0.35);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 8), gold);
  cord.position.y = -0.22;
  const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 12), gold);
  tassel.position.y = -0.48;
  tasselPivot.add(cord, tassel);
  cap.add(board, crown, btn, tasselPivot);
  head.add(cap);

  // Arms: left resting, right waving.
  const armGeo = new THREE.CapsuleGeometry(0.16, 0.55, 8, 24);
  const handGeo = new THREE.SphereGeometry(0.2, 32, 32);
  const mkArm = (side: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.92, -0.55, 0);
    const arm = new THREE.Mesh(armGeo, white);
    arm.position.y = -0.38;
    const hand = new THREE.Mesh(handGeo, violet);
    hand.position.y = -0.8;
    pivot.add(arm, hand);
    robot.add(pivot);
    return pivot;
  };
  const armL = mkArm(-1);
  const armR = mkArm(1);
  armL.rotation.z = -0.35;

  // Jet glow under the hovering body + platform ring.
  const jet = glow(tex, CYAN, 1.6, 0.9);
  jet.position.y = -2.05;
  robot.add(jet);
  const jet2 = glow(tex, VIOLET, 2.6, 0.6);
  jet2.position.y = -2.2;
  robot.add(jet2);
  const pad = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.03, 8, 120), new THREE.MeshBasicMaterial({ color: CYAN }));
  pad.rotation.x = Math.PI / 2;
  pad.position.y = -2.45;
  world.add(pad);
  const pad2 = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.015, 8, 120), new THREE.MeshBasicMaterial({ color: VIOLET_LIGHT, transparent: true, opacity: 0.6 }));
  pad2.rotation.x = Math.PI / 2;
  pad2.position.y = -2.45;
  world.add(pad2);
  const back = glow(tex, VIOLET, 7, 0.5);
  back.position.z = -2;
  world.add(back);

  // Floating career badges around the robot.
  const items: [string, string, [number, number, number]][] = [
    ["💡", "#fbbf24", [-2.4, 1.4, 0.3]],
    ["📚", "#4f6df5", [2.5, 1.2, 0.2]],
    ["🎯", "#f472b6", [-2.6, -0.9, 0.5]],
    ["🚀", "#22d3ee", [2.6, -1.0, 0.6]],
  ];
  const floaters = items.map(([e, ring, p], i) => {
    const b = badge(e, ring, 0.8);
    b.position.set(...p);
    world.add(b);
    return { b, y: p[1], i };
  });

  return (t) => {
    robot.position.y = -0.2 + Math.sin(t * 1.4) * 0.1;
    // Head and eyes follow the pointer.
    head.rotation.y += (pointer.x * 0.5 - head.rotation.y) * 0.08;
    head.rotation.x += (pointer.y * 0.25 - head.rotation.x) * 0.08;
    eyes.position.x = pointer.x * 0.08;
    eyes.position.y = -pointer.y * 0.05;
    // Blink every ~3.5 s.
    const blink = t % 3.5 < 0.12 ? 0.15 : 1;
    eyeL.scale.y = eyeR.scale.y = blink;
    // Wave.
    armR.rotation.z = 2.5 + Math.sin(t * 6) * 0.35;
    armL.rotation.z = -0.35 + Math.sin(t * 1.4) * 0.05;
    tasselPivot.rotation.z = Math.sin(t * 2) * 0.25;
    heart.scale.setScalar(0.75 + Math.sin(t * 3) * 0.12);
    jet.scale.setScalar(1.6 + Math.sin(t * 18) * 0.15);
    pad.scale.setScalar(1 + Math.sin(t * 2) * 0.03);
    floaters.forEach(({ b, y, i }) => (b.position.y = y + Math.sin(t + i * 1.3) * 0.15));
  };
}

/* ------------------------------------------------------------------ */
/* Variant E: cartoon student character                               */
/* ------------------------------------------------------------------ */
function buildStudent(world: THREE.Group, tex: THREE.Texture, pointer: Pointer): Updater {
  const skin = new THREE.MeshStandardMaterial({ color: 0xd99a6c, roughness: 0.6, metalness: 0 });
  const hair = phys(0x2b1b14, { roughness: 0.5, metalness: 0.1, clearcoat: 0.6 });
  const hoodie = phys(VIOLET, { roughness: 0.6, metalness: 0, clearcoat: 0.1, sheen: 1, sheenColor: new THREE.Color(VIOLET_LIGHT) });
  const pants = phys(0x23306b, { roughness: 0.7, metalness: 0, clearcoat: 0 });
  const shoe = phys(0xffffff, { roughness: 0.4 });
  const black = new THREE.MeshBasicMaterial({ color: 0x1a1030 });
  const whiteDot = new THREE.MeshBasicMaterial({ color: 0xffffff });

  const kid = new THREE.Group();
  kid.position.y = -0.35;
  world.add(kid);

  // Legs + shoes.
  [-0.25, 0.25].forEach((x) => {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.45, 8, 24), pants);
    leg.position.set(x, -1.75, 0);
    kid.add(leg);
    const s = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.2, 0.55, 4, 0.09), shoe);
    s.position.set(x, -2.12, 0.1);
    kid.add(s);
  });
  // Hoodie body.
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 0.55, 12, 40), hoodie);
  torso.position.y = -0.85;
  kid.add(torso);
  const pocket = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.25, 0.1, 4, 0.05), phys(0x6a3df0, { roughness: 0.6 }));
  pocket.position.set(0, -1.05, 0.58);
  kid.add(pocket);
  // Backpack.
  const pack = new THREE.Mesh(new RoundedBoxGeometry(0.9, 1.0, 0.45, 6, 0.18), phys(AMBER, { roughness: 0.45 }));
  pack.position.set(0, -0.8, -0.6);
  kid.add(pack);
  [-0.35, 0.35].forEach((x) => {
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 8, 24, Math.PI), phys(0xd97706));
    strap.rotation.y = Math.PI / 2;
    strap.position.set(x, -0.45, -0.05);
    kid.add(strap);
  });

  // Head (big, chibi style).
  const head = new THREE.Group();
  head.position.y = 0.55;
  kid.add(head);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.95, 64, 64), skin);
  face.scale.set(1, 0.96, 0.95);
  head.add(face);
  const hairTop = new THREE.Mesh(new THREE.SphereGeometry(1.0, 64, 64, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
  hairTop.position.y = 0.06;
  hairTop.rotation.x = -0.25;
  head.add(hairTop);
  // Fringe: one soft swoosh over the forehead.
  const fringe = new THREE.Mesh(new THREE.SphereGeometry(0.75, 48, 48), hair);
  fringe.scale.set(1.25, 0.42, 0.75);
  fringe.position.set(0.12, 0.52, 0.45);
  fringe.rotation.z = -0.18;
  head.add(fringe);
  // Eyes with sparkles.
  const eyes = new THREE.Group();
  head.add(eyes);
  const eyeParts: THREE.Mesh[] = [];
  [-0.32, 0.32].forEach((x) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.13, 32, 32), black);
    e.scale.set(0.85, 1.15, 0.5);
    e.position.set(x, 0.0, 0.87);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 16), whiteDot);
    h.position.set(x + 0.04, 0.06, 0.93);
    eyes.add(e, h);
    eyeParts.push(e);
  });
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 12, 32, Math.PI), new THREE.MeshBasicMaterial({ color: 0x8a2d3b }));
  smile.rotation.z = Math.PI;
  smile.position.set(0, -0.3, 0.86);
  head.add(smile);
  [-0.55, 0.55].forEach((x) => {
    const c = glow(tex, 0xff7aa8, 0.45, 0.7);
    c.position.set(x, -0.2, 0.8);
    head.add(c);
  });
  // Graduation cap.
  const capMat = phys(0x1b1440, { roughness: 0.4, metalness: 0.3 });
  const cap = new THREE.Group();
  cap.position.set(0.05, 0.8, -0.05);
  cap.rotation.set(-0.15, 0, -0.12);
  const board = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.07, 1.5, 2, 0.03), capMat);
  board.rotation.y = Math.PI / 4;
  board.position.y = 0.2;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.3, 40), capMat);
  crown.position.y = 0.04;
  const gold = phys(AMBER, { metalness: 0.95, roughness: 0.2 });
  const tasselPivot = new THREE.Group();
  tasselPivot.position.set(-0.6, 0.22, 0.35);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 8), gold);
  cord.position.y = -0.22;
  const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 12), gold);
  tassel.position.y = -0.48;
  tasselPivot.add(cord, tassel);
  cap.add(board, crown, tasselPivot);
  head.add(cap);

  // Arms: right waving, left holding a book.
  const mkArm = (side: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.62, -0.45, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.5, 8, 24), hoodie);
    arm.position.y = -0.35;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 24), skin);
    hand.position.y = -0.72;
    pivot.add(arm, hand);
    kid.add(pivot);
    return pivot;
  };
  const armR = mkArm(1);
  const armL = mkArm(-1);
  armL.rotation.set(-0.9, 0, -0.35);
  const book = new THREE.Group();
  const cover = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.12, 0.8, 2, 0.03), phys(CYAN, { roughness: 0.3 }));
  const pages = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.74), new THREE.MeshStandardMaterial({ color: 0xfffdf5 }));
  pages.position.x = 0.03;
  book.add(cover, pages);
  book.position.set(-0.55, -1.05, 0.55);
  book.rotation.set(0.9, 0.3, 1.2);
  kid.add(book);

  // Platform + glows.
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.12, 64), phys(0x1e1b4b, { metalness: 0.6, roughness: 0.3 }));
  pad.position.y = -2.6;
  world.add(pad);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.03, 8, 120), new THREE.MeshBasicMaterial({ color: CYAN }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -2.53;
  world.add(ring);
  const floor = glow(tex, CYAN, 4, 0.35);
  floor.position.y = -2.6;
  world.add(floor);
  const back = glow(tex, VIOLET, 7, 0.5);
  back.position.z = -2;
  world.add(back);

  // Thought bubbles with careers.
  const items: [string, string, [number, number, number]][] = [
    ["💻", "#7c4dff", [-2.3, 1.6, 0]],
    ["🩺", "#22d3ee", [2.3, 1.7, 0]],
    ["🎨", "#f472b6", [-2.5, -0.5, 0.3]],
    ["🏗️", "#fbbf24", [2.5, -0.4, 0.3]],
  ];
  const floaters = items.map(([e, c, p], i) => {
    const b = badge(e, c, 0.85);
    b.position.set(...p);
    world.add(b);
    return { b, y: p[1], i };
  });

  return (t) => {
    kid.position.y = -0.35 + Math.abs(Math.sin(t * 1.6)) * 0.06;
    head.rotation.y += (pointer.x * 0.45 - head.rotation.y) * 0.08;
    head.rotation.x += (pointer.y * 0.2 - head.rotation.x) * 0.08;
    head.rotation.z = Math.sin(t * 1.2) * 0.05;
    eyes.position.x = pointer.x * 0.04;
    const blink = t % 4 < 0.12 ? 0.12 : 1;
    eyeParts.forEach((e) => (e.scale.y = 1.15 * blink));
    armR.rotation.z = 2.4 + Math.sin(t * 6) * 0.35;
    tasselPivot.rotation.z = Math.sin(t * 2) * 0.25;
    floaters.forEach(({ b, y, i }) => (b.position.y = y + Math.sin(t + i * 1.3) * 0.15));
  };
}

export default function HeroScene3D({
  className,
  compact = false,
  variant = "planet",
}: {
  className?: string;
  compact?: boolean;
  variant?: SceneVariant;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isSmall = window.matchMedia("(max-width: 640px)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !isSmall, alpha: true, powerPreference: "high-performance" });
    } catch {
      return; // No WebGL: the page's fallback stays visible.
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSmall ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.style.display = "block";
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0.6, 10);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.HemisphereLight(0xc4b5fd, 0x1e1b4b, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(4, 5, 5);
    scene.add(key);
    const violetLight = new THREE.PointLight(VIOLET, 40, 14);
    violetLight.position.set(-3, 1.5, 2);
    scene.add(violetLight);
    const cyanLight = new THREE.PointLight(CYAN, 30, 14);
    cyanLight.position.set(3, -1, 2);
    scene.add(cyanLight);

    const tex = glowTexture();
    const world = new THREE.Group();
    scene.add(world);

    const target = { x: 0, y: 0 };
    const update =
      variant === "ai"
        ? buildAi(world, tex, isSmall)
        : variant === "path"
          ? buildPath(world, tex)
          : variant === "robot"
            ? buildRobot(world, tex, target)
            : variant === "student"
              ? buildStudent(world, tex, target)
              : buildPlanet(world, tex, isSmall);
    // Characters turn their head instead of the whole scene spinning.
    const character = variant === "robot" || variant === "student";

    // Background star dust.
    const count = isSmall ? 260 : 600;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const palette = [VIOLET_LIGHT, CYAN, PINK, 0xffffff, BLUE].map((c) => new THREE.Color(c));
    for (let i = 0; i < count; i++) {
      const r = 4 + Math.random() * 8;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph) * 0.6;
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th) - 3;
      const c = palette[i % palette.length];
      col.set([c.r, c.g, c.b], i * 3);
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    pGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const particles = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({ size: 0.09, map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    scene.add(particles);

    if (character) world.scale.setScalar(1.2);
    if (compact) world.scale.multiplyScalar(0.85);

    const onPointer = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = w / h;
      camera.position.z = w / h < 1 ? 14 : w / h < 1.3 ? 12 : 10.5;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(() => {
      resize();
      if (reduceMotion) renderer.render(scene, camera);
    });
    ro.observe(host);
    resize();

    const clock = new THREE.Clock();
    let raf = 0;
    let visible = true;
    let firstFrame = true;

    const tick = () => {
      raf = 0;
      const t = clock.getElapsedTime();
      const scroll = Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1.5);
      const spin = character ? 0.25 : 1;
      world.rotation.y += ((target.x * 0.45 + Math.sin(t * 0.2) * 0.2 + scroll * 0.6) * spin - world.rotation.y) * 0.05;
      world.rotation.x += ((target.y * 0.18 + scroll * 0.25) * spin - world.rotation.x) * 0.05;
      world.position.y = Math.sin(t * 0.8) * 0.08;
      update(t);
      particles.rotation.y = t * 0.02;
      renderer.render(scene, camera);
      if (firstFrame) {
        firstFrame = false;
        host.dataset.ready = "true";
      }
      if (visible) raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    let io: IntersectionObserver | null = null;
    const onVisibility = () => (document.hidden ? stop() : start());
    if (reduceMotion) {
      update(2);
      renderer.render(scene, camera);
      host.dataset.ready = "true";
    } else {
      io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
        else stop();
      });
      io.observe(host);
      document.addEventListener("visibilitychange", onVisibility);
      start();
    }

    return () => {
      stop();
      io?.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      scene.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (mat)
          (Array.isArray(mat) ? mat : [mat]).forEach((x) => {
            (x as THREE.SpriteMaterial).map?.dispose();
            x.dispose();
          });
      });
      tex.dispose();
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      delete host.dataset.ready;
    };
  }, [compact, variant]);

  return <div ref={hostRef} className={className} aria-hidden="true" />;
}

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * The landing page's 3D centrepiece: a glossy graduation cap on a stack of
 * books, two glowing orbit rings with little "planets" (one per school
 * subject colour), a compass, a growth arrow, glassy floating crystals and a
 * field of glowing particles. The scene follows the pointer / finger and
 * also tilts slightly as the page scrolls.
 *
 * Plain three.js, lazy-loaded only on the landing and auth pages. It stops
 * rendering when off-screen or when the tab is hidden, uses lower quality on
 * phones, and draws a single still frame for "reduce motion" users.
 */

const VIOLET = 0x7c4dff;
const VIOLET_LIGHT = 0xa78bfa;
const BLUE = 0x4f6df5;
const CYAN = 0x22d3ee;
const PINK = 0xf472b6;
const AMBER = 0xfbbf24;
const INK = 0x14102a;

function phys(color: number, opts: Partial<THREE.MeshPhysicalMaterialParameters> = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.25,
    metalness: 0.15,
    clearcoat: 1,
    clearcoatRoughness: 0.15,
    ...opts,
  });
}

/** Radial-gradient sprite texture used for glows and particles. */
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
    new THREE.SpriteMaterial({
      map: tex,
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  s.scale.setScalar(size);
  return s;
}

function roundedSlab(w: number, h: number, d: number, r: number) {
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -d / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + d - r);
  shape.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  shape.lineTo(x + r, y + d);
  shape.quadraticCurveTo(x, y + d, x, y + d - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: h,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 3,
    curveSegments: 8,
  });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, h / 2, 0);
  return geo;
}

function buildBook(w: number, h: number, d: number, cover: number) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(roundedSlab(w, h, d, 0.1), phys(cover, { metalness: 0.3 })));
  const pages = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.93, h * 0.68, d * 0.9),
    new THREE.MeshStandardMaterial({ color: 0xfaf7ff, roughness: 0.85 })
  );
  pages.position.x = 0.07;
  g.add(pages);
  // Gold stripe on the spine.
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, h * 0.9, d * 0.92),
    phys(AMBER, { metalness: 0.9, roughness: 0.2 })
  );
  stripe.position.x = -w / 2 + 0.25;
  g.add(stripe);
  return g;
}

function buildCap() {
  const g = new THREE.Group();
  const capMat = phys(INK, { roughness: 0.35, metalness: 0.4, sheen: 1, sheenColor: new THREE.Color(VIOLET) });
  const board = new THREE.Mesh(roundedSlab(2.1, 0.09, 2.1, 0.06), capMat);
  board.rotation.y = Math.PI / 4;
  board.position.y = 0.46;
  g.add(board);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.76, 0.5, 48), capMat);
  crown.position.y = 0.2;
  g.add(crown);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.035, 12, 64), phys(VIOLET, { emissive: VIOLET, emissiveIntensity: 1.2 }));
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.0;
  g.add(band);
  const gold = phys(AMBER, { metalness: 0.95, roughness: 0.18 });
  const button = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 20), gold);
  button.position.y = 0.56;
  g.add(button);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 8), gold);
  cord.rotation.z = Math.PI / 2;
  cord.position.set(0.5, 0.55, 0);
  g.add(cord);
  const hang = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 8), gold);
  hang.position.set(1.0, 0.25, 0);
  g.add(hang);
  const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.32, 16), gold);
  tassel.position.set(1.0, -0.08, 0);
  g.add(tassel);
  return g;
}

function buildCompass() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.12, 48),
    phys(0xffffff, { roughness: 0.1, transmission: 0, metalness: 0.1 })
  );
  body.rotation.x = Math.PI / 2;
  g.add(body);
  g.add(new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.06, 16, 64), phys(AMBER, { metalness: 0.95, roughness: 0.2 })));
  const n = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 4), phys(PINK, { emissive: PINK, emissiveIntensity: 0.4 }));
  n.position.set(0, 0.2, 0.09);
  g.add(n);
  const s = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 4), phys(BLUE));
  s.rotation.z = Math.PI;
  s.position.set(0, -0.2, 0.09);
  g.add(s);
  return g;
}

function buildArrow() {
  const pts = [
    new THREE.Vector3(-0.75, -0.5, 0),
    new THREE.Vector3(-0.28, -0.05, 0),
    new THREE.Vector3(0.08, -0.22, 0),
    new THREE.Vector3(0.62, 0.42, 0),
  ];
  const g = new THREE.Group();
  const m = phys(CYAN, { emissive: CYAN, emissiveIntensity: 0.6, metalness: 0.3 });
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.1), 64, 0.06, 12, false), m));
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 20), m);
  head.position.copy(pts[3]).add(new THREE.Vector3(0.07, 0.08, 0));
  head.rotation.z = -0.72;
  g.add(head);
  return g;
}

export default function HeroScene3D({ className, compact = false }: { className?: string; compact?: boolean }) {
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
    host.dataset.ready = "true";

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 1.4, 10);
    camera.lookAt(0, 0.3, 0);

    scene.add(new THREE.HemisphereLight(0xc4b5fd, 0x1e1b4b, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(3, 6, 5);
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

    // Central glow behind everything.
    const backGlow = glow(tex, VIOLET, 7.5, 0.55);
    backGlow.position.set(0, 0.2, -2);
    world.add(backGlow);
    const backGlow2 = glow(tex, BLUE, 5, 0.45);
    backGlow2.position.set(1.2, -0.6, -1.5);
    world.add(backGlow2);

    // Books + cap.
    const stack = new THREE.Group();
    const b1 = buildBook(2.7, 0.4, 1.8, BLUE);
    b1.position.y = -0.95;
    const b2 = buildBook(2.3, 0.36, 1.6, VIOLET);
    b2.position.y = -0.55;
    b2.rotation.y = 0.2;
    const b3 = buildBook(1.9, 0.32, 1.4, PINK);
    b3.position.y = -0.2;
    b3.rotation.y = -0.14;
    const cap = buildCap();
    cap.position.y = -0.04;
    cap.rotation.y = 0.5;
    stack.add(b1, b2, b3, cap);
    world.add(stack);

    // Glowing platform.
    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(2.1, 2.3, 0.14, 64),
      phys(0x1e1b4b, { metalness: 0.6, roughness: 0.3 })
    );
    platform.position.y = -1.25;
    world.add(platform);
    const platformRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.2, 0.03, 12, 96),
      new THREE.MeshBasicMaterial({ color: CYAN })
    );
    platformRing.rotation.x = Math.PI / 2;
    platformRing.position.y = -1.18;
    world.add(platformRing);
    const floorGlow = glow(tex, CYAN, 5.5, 0.35);
    floorGlow.position.set(0, -1.3, 0);
    world.add(floorGlow);

    // Two tilted orbit rings with "planets".
    const orbits: { pivot: THREE.Group; speed: number }[] = [];
    const ringDefs: [number, number, number, number[]][] = [
      [3.1, 0.35, 0.2, [VIOLET_LIGHT, CYAN, AMBER]],
      [3.7, -0.45, -0.3, [PINK, BLUE]],
    ];
    ringDefs.forEach(([radius, tiltX, tiltZ, colors], ri) => {
      const holder = new THREE.Group();
      holder.rotation.set(Math.PI / 2 + tiltX, 0, tiltZ);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.012, 8, 160),
        new THREE.MeshBasicMaterial({ color: ri ? PINK : VIOLET_LIGHT, transparent: true, opacity: 0.55 })
      );
      holder.add(ring);
      const pivot = new THREE.Group();
      holder.add(pivot);
      colors.forEach((c, i) => {
        const a = (i / colors.length) * Math.PI * 2;
        const planet = new THREE.Mesh(
          new THREE.SphereGeometry(ri ? 0.16 : 0.2, 32, 32),
          phys(c, { emissive: c, emissiveIntensity: 0.5, metalness: 0.2 })
        );
        planet.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
        const pg = glow(tex, c, 0.9, 0.7);
        pg.position.copy(planet.position);
        pivot.add(planet, pg);
      });
      world.add(holder);
      orbits.push({ pivot, speed: ri ? -0.18 : 0.25 });
    });

    const compass = buildCompass();
    compass.position.set(-2.5, 1.55, 0.4);
    world.add(compass);
    const arrow = buildArrow();
    arrow.position.set(2.5, 1.25, 0.2);
    world.add(arrow);

    // Glassy crystals.
    const crystalMat = (c: number) =>
      phys(c, { roughness: 0.05, metalness: 0.1, iridescence: 1, iridescenceIOR: 1.6, transparent: true, opacity: 0.9 });
    const floaters: { mesh: THREE.Object3D; base: THREE.Vector3; speed: number; phase: number }[] = [];
    const shapes: [THREE.BufferGeometry, number, [number, number, number]][] = [
      [new THREE.IcosahedronGeometry(0.28, 0), AMBER, [-2.9, -0.5, 1]],
      [new THREE.OctahedronGeometry(0.26, 0), VIOLET_LIGHT, [2.8, -0.7, 1.1]],
      [new THREE.TorusKnotGeometry(0.16, 0.06, 64, 8), CYAN, [-1.4, 2.5, -0.4]],
      [new THREE.DodecahedronGeometry(0.2, 0), PINK, [1.4, 2.6, 0.3]],
      [new THREE.TetrahedronGeometry(0.26, 0), BLUE, [0.3, -2.0, 1.8]],
      [new THREE.OctahedronGeometry(0.16, 0), CYAN, [-0.8, -1.9, 2.2]],
    ];
    shapes.forEach(([geo, color, [x, y, z]], i) => {
      const mesh = new THREE.Mesh(geo, crystalMat(color));
      mesh.position.set(x, y, z);
      world.add(mesh);
      floaters.push({ mesh, base: new THREE.Vector3(x, y, z), speed: 0.55 + i * 0.12, phase: i * 1.2 });
    });

    // Particle field.
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
      new THREE.PointsMaterial({
        size: 0.09,
        map: tex,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    scene.add(particles);

    if (compact) world.scale.setScalar(0.85);

    // Pointer parallax (whole window, so it reacts even over the text).
    const target = { x: 0, y: 0 };
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
      camera.position.z = w / h < 1 ? 13.5 : w / h < 1.3 ? 11.5 : 10;
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

    const tick = () => {
      raf = 0;
      const t = clock.getElapsedTime();
      const scroll = Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1.5);
      world.rotation.y += (target.x * 0.5 + Math.sin(t * 0.2) * 0.3 + scroll * 0.6 - world.rotation.y) * 0.05;
      world.rotation.x += (target.y * 0.2 + scroll * 0.25 - world.rotation.x) * 0.05;
      stack.position.y = Math.sin(t * 1.1) * 0.1;
      cap.rotation.y = 0.5 + Math.sin(t * 0.6) * 0.25;
      compass.rotation.z = Math.sin(t * 0.8) * 0.35;
      compass.position.y = 1.55 + Math.sin(t * 0.9 + 1) * 0.14;
      arrow.position.y = 1.25 + Math.sin(t + 2) * 0.12;
      orbits.forEach((o) => (o.pivot.rotation.z = t * o.speed));
      floaters.forEach((f) => {
        f.mesh.position.y = f.base.y + Math.sin(t * f.speed + f.phase) * 0.22;
        f.mesh.rotation.x = t * f.speed * 0.7;
        f.mesh.rotation.y = t * f.speed;
      });
      particles.rotation.y = t * 0.02;
      platformRing.scale.setScalar(1 + Math.sin(t * 2) * 0.015);
      renderer.render(scene, camera);
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
      renderer.render(scene, camera);
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
        if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((x) => x.dispose());
      });
      tex.dispose();
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      delete host.dataset.ready;
    };
  }, [compact]);

  return <div ref={hostRef} className={className} aria-hidden="true" />;
}

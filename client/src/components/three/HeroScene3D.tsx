import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Interactive 3D hero for the landing page: a graduation cap resting on a
 * stack of books, with a compass, a growth arrow and small shapes floating
 * around it. The whole group slowly turns and leans towards the pointer
 * (or the finger on phones).
 *
 * Built with plain three.js (no extra React wrapper) and lazy-loaded from
 * Landing.tsx, so the ~150 KB library is only downloaded on the landing page.
 * Rendering pauses when the scene is off-screen or the tab is hidden, the
 * pixel ratio is capped for weak phones, and users who prefer reduced motion
 * get a single still frame.
 */

const BRAND = 0x6c3ffb;
const BRAND_LIGHT = 0x8b6bff;
const BLUE = 0x4f6df5;
const AMBER = 0xf59e0b;
const INK = 0x1a1533;

function mat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.08, ...opts });
}

function roundedBox(w: number, h: number, d: number, r: number) {
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
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
    curveSegments: 6,
  });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, h / 2, 0);
  return geo;
}

function buildBook(w: number, h: number, d: number, cover: number) {
  const g = new THREE.Group();
  const coverMesh = new THREE.Mesh(roundedBox(w, h, d, 0.08), mat(cover));
  g.add(coverMesh);
  // Pages: a slightly smaller, cream-coloured block peeking out on one side.
  const pages = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.92, h * 0.7, d * 0.9),
    mat(0xfdfbf5, { roughness: 0.9 })
  );
  pages.position.set(0.06, 0, 0);
  g.add(pages);
  return g;
}

function buildCap() {
  const g = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 1.9), mat(INK, { roughness: 0.6 }));
  board.rotation.y = Math.PI / 4;
  board.position.y = 0.42;
  g.add(board);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.45, 32), mat(INK, { roughness: 0.6 }));
  crown.position.y = 0.2;
  g.add(crown);
  const button = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), mat(BRAND));
  button.position.y = 0.5;
  g.add(button);
  // Tassel: cord along the board, then hanging down.
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.95, 8), mat(AMBER));
  cord.rotation.z = Math.PI / 2;
  cord.position.set(0.47, 0.49, 0);
  g.add(cord);
  const hang = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 8), mat(AMBER));
  hang.position.set(0.94, 0.22, 0);
  g.add(hang);
  const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.28, 12), mat(AMBER));
  tassel.position.set(0.94, -0.08, 0);
  g.add(tassel);
  return g;
}

function buildCompass() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.12, 40), mat(0xffffff, { roughness: 0.3 }));
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 12, 48), mat(BRAND_LIGHT, { metalness: 0.3 }));
  g.add(rim);
  const needleN = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.36, 4), mat(BLUE));
  needleN.position.y = 0.18;
  needleN.position.z = 0.08;
  g.add(needleN);
  const needleS = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.36, 4), mat(0xcfc4ff));
  needleS.rotation.z = Math.PI;
  needleS.position.y = -0.18;
  needleS.position.z = 0.08;
  g.add(needleS);
  const pin = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), mat(INK));
  pin.position.z = 0.1;
  g.add(pin);
  return g;
}

function buildGrowthArrow() {
  const pts = [
    new THREE.Vector3(-0.7, -0.45, 0),
    new THREE.Vector3(-0.25, -0.05, 0),
    new THREE.Vector3(0.1, -0.2, 0),
    new THREE.Vector3(0.6, 0.4, 0),
  ];
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.1);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.055, 10, false), mat(BLUE, { metalness: 0.2 })));
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 16), mat(BLUE, { metalness: 0.2 }));
  head.position.copy(pts[3]);
  head.rotation.z = -Math.atan2(0.6, 0.5) + 0.15;
  head.position.add(new THREE.Vector3(0.06, 0.07, 0));
  g.add(head);
  return g;
}

export default function HeroScene3D({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isSmall = window.matchMedia("(max-width: 640px)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !isSmall, alpha: true, powerPreference: "low-power" });
    } catch {
      // No WebGL (very old phone / disabled GPU): leave the fallback in place.
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSmall ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = "block";
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);
    host.dataset.ready = "true";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 1.3, 9.5);
    camera.lookAt(0, 0.4, 0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8b6bff, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(3, 5, 4);
    scene.add(key);
    const rimLight = new THREE.PointLight(BLUE, 18, 12);
    rimLight.position.set(-3, 1, -2);
    scene.add(rimLight);

    const world = new THREE.Group();
    scene.add(world);

    // Main stack: books + cap.
    const stack = new THREE.Group();
    const b1 = buildBook(2.6, 0.38, 1.7, BLUE);
    b1.position.y = -0.9;
    const b2 = buildBook(2.2, 0.34, 1.5, BRAND_LIGHT);
    b2.position.y = -0.53;
    b2.rotation.y = 0.18;
    const b3 = buildBook(1.8, 0.3, 1.3, 0xffffff);
    b3.position.y = -0.21;
    b3.rotation.y = -0.12;
    const cap = buildCap();
    cap.position.y = -0.06;
    cap.rotation.y = 0.5;
    stack.add(b1, b2, b3, cap);
    world.add(stack);

    // Soft glowing disc under the stack.
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(2.4, 48),
      new THREE.MeshBasicMaterial({ color: BRAND, transparent: true, opacity: 0.12 })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = -1.12;
    world.add(disc);

    const compass = buildCompass();
    compass.position.set(-2.3, 1.4, 0.2);
    world.add(compass);

    const arrow = buildGrowthArrow();
    arrow.position.set(2.3, 1.1, 0);
    world.add(arrow);

    // Little floating shapes for depth.
    const floaters: { mesh: THREE.Mesh; base: THREE.Vector3; speed: number; phase: number }[] = [];
    const shapes: [THREE.BufferGeometry, number, [number, number, number]][] = [
      [new THREE.IcosahedronGeometry(0.22, 0), AMBER, [-2.6, -0.4, 0.8]],
      [new THREE.OctahedronGeometry(0.2, 0), BRAND, [2.5, -0.6, 0.9]],
      [new THREE.TorusGeometry(0.18, 0.07, 12, 32), BLUE, [-1.3, 2.3, -0.6]],
      [new THREE.SphereGeometry(0.14, 20, 20), BRAND_LIGHT, [1.2, 2.4, 0.3]],
      [new THREE.TetrahedronGeometry(0.2, 0), AMBER, [0.2, -1.7, 1.6]],
    ];
    shapes.forEach(([geo, color, [x, y, z]], i) => {
      const mesh = new THREE.Mesh(geo, mat(color, { metalness: 0.25, roughness: 0.3 }));
      mesh.position.set(x, y, z);
      world.add(mesh);
      floaters.push({ mesh, base: new THREE.Vector3(x, y, z), speed: 0.6 + i * 0.13, phase: i * 1.3 });
    });

    // Pointer / finger parallax.
    const target = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      target.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    const onLeave = () => {
      target.x = 0;
      target.y = 0;
    };
    host.addEventListener("pointermove", onPointer, { passive: true });
    host.addEventListener("pointerleave", onLeave);

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = w / h;
      // Pull the camera back on narrow screens so nothing is cut off.
      camera.position.z = w / h < 1 ? 11.5 : 9.5;
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
      world.rotation.y += ((target.x * 0.45 + Math.sin(t * 0.25) * 0.35) - world.rotation.y) * 0.05;
      world.rotation.x += ((target.y * 0.18) - world.rotation.x) * 0.05;
      stack.position.y = Math.sin(t * 1.1) * 0.08;
      cap.rotation.y = 0.5 + Math.sin(t * 0.7) * 0.15;
      compass.rotation.z = Math.sin(t * 0.8) * 0.25;
      compass.position.y = 1.4 + Math.sin(t * 0.9 + 1) * 0.12;
      arrow.position.y = 1.1 + Math.sin(t * 1.0 + 2) * 0.1;
      floaters.forEach((f) => {
        f.mesh.position.y = f.base.y + Math.sin(t * f.speed + f.phase) * 0.18;
        f.mesh.rotation.x = t * f.speed * 0.6;
        f.mesh.rotation.y = t * f.speed * 0.8;
      });
      renderer.render(scene, camera);
      if (visible) raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (!raf && visible && !document.hidden) {
        clock.getDelta();
        raf = requestAnimationFrame(tick);
      }
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
      host.removeEventListener("pointermove", onPointer);
      host.removeEventListener("pointerleave", onLeave);
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((m) => m.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      delete host.dataset.ready;
    };
  }, []);

  return <div ref={hostRef} className={className} aria-hidden="true" />;
}

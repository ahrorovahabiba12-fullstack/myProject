/**
 * 3D "tilt" effect for clickable cards.
 *
 * Any element with a `data-tilt` attribute leans towards the mouse pointer
 * and gets a soft light glare, so tiles feel like physical cards. One global
 * listener drives every card (no per-component code needed).
 *
 * Only runs on devices with a real mouse (`hover: hover`); touch devices get
 * the CSS press-depth effect from styles.css instead. Users who asked their
 * OS for reduced motion get no tilt at all.
 */
const MAX_DEG = 8;

export function initTilt3d() {
  if (typeof window === "undefined") return;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  let active: HTMLElement | null = null;
  let frame = 0;
  let lastEvent: PointerEvent | null = null;

  const reset = (el: HTMLElement) => {
    el.style.removeProperty("--tilt-x");
    el.style.removeProperty("--tilt-y");
    el.style.removeProperty("--glare-x");
    el.style.removeProperty("--glare-y");
    el.removeAttribute("data-tilting");
  };

  const apply = () => {
    frame = 0;
    const e = lastEvent;
    if (!e || !active) return;
    const r = active.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const px = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
    const py = Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1);
    // Smaller cards may lean more; wide banners lean less so text stays readable.
    const scale = Math.min(1, 320 / Math.max(r.width, 1));
    const deg = MAX_DEG * Math.max(scale, 0.35);
    active.style.setProperty("--tilt-x", `${((0.5 - py) * 2 * deg).toFixed(2)}deg`);
    active.style.setProperty("--tilt-y", `${((px - 0.5) * 2 * deg).toFixed(2)}deg`);
    active.style.setProperty("--glare-x", `${(px * 100).toFixed(1)}%`);
    active.style.setProperty("--glare-y", `${(py * 100).toFixed(1)}%`);
    active.setAttribute("data-tilting", "");
  };

  document.addEventListener(
    "pointermove",
    (e) => {
      if (!fine.matches || reduce.matches || e.pointerType !== "mouse") return;
      const target = (e.target as Element | null)?.closest<HTMLElement>("[data-tilt]") ?? null;
      if (target !== active) {
        if (active) reset(active);
        active = target;
      }
      if (!active) return;
      if (active.matches(":disabled, [aria-disabled='true']")) return;
      lastEvent = e;
      if (!frame) frame = requestAnimationFrame(apply);
    },
    { passive: true }
  );

  const leave = () => {
    if (active) reset(active);
    active = null;
  };
  document.addEventListener("pointerleave", leave);
  window.addEventListener("blur", leave);
}

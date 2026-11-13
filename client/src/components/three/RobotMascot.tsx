import { Suspense, lazy } from "react";
import clsx from "clsx";

const HeroScene3D = lazy(() => import("./HeroScene3D"));

/**
 * The site's 3D robot mascot (the "AI advisor"), for embedding next to page
 * titles and banners. Size it with `className` (e.g. "w-40 h-44").
 */
export function RobotMascot({ className }: { className?: string }) {
  return (
    <div className={clsx(!/\babsolute\b/.test(className ?? "") && "relative", "pointer-events-none", className)} aria-hidden="true">
      <Suspense fallback={null}>
        <HeroScene3D className="absolute inset-0" variant="robot" minimal />
      </Suspense>
    </div>
  );
}

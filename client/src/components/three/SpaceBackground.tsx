/**
 * Pure-CSS animated "space" backdrop: soft aurora blobs, a twinkling star
 * layer and a glowing perspective grid floor. Cheap enough for every phone,
 * so it is used behind the landing and auth pages (and the 3D scene sits on
 * top of it).
 */
export function SpaceBackground() {
  return (
    <div className="space-bg" aria-hidden="true">
      <div className="aurora aurora-1" />
      <div className="aurora aurora-2" />
      <div className="aurora aurora-3" />
      <div className="stars" />
      <div className="grid-floor" />
    </div>
  );
}

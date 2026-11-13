/**
 * Background for the signed-in app: soft aurora lights and a faint 3D grid
 * floor. Follows the theme: pastel in light mode, deep space in dark mode.
 * Pure CSS, so it costs almost nothing on phones.
 */
export function AppBackground() {
  return (
    <div className="app-bg" aria-hidden="true">
      <div className="aurora aurora-1" />
      <div className="aurora aurora-2" />
      <div className="aurora aurora-3" />
      <div className="app-stars" />
      <div className="grid-floor" />
    </div>
  );
}

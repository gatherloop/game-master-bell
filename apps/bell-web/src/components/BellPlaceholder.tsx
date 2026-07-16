import "./BellPlaceholder.css";

/**
 * Static placeholder for the bell — the PixiJS scene (idle sway, tap animation,
 * ring sound) lands in Phase 4. This just establishes the visual slot and copy.
 */
export function BellPlaceholder() {
  return (
    <div className="bell-placeholder" role="img" aria-label="Bel game master">
      <span className="bell-placeholder__icon">🔔</span>
    </div>
  );
}

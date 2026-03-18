export default function ElevationQuickStats({ elevation, derived }) {
  const label = elevation.label || 'Untitled';
  const access = elevation.access_type || 'ground';
  const w = elevation.width_ft || 0;
  const h = elevation.height_to_eave_ft || 0;

  return (
    <div className="room-quick-stats">
      <span className="rqs-label">{label}</span>
      <span className="rqs-badges">
        <span className="rqs-badge">{access}</span>
      </span>
      <span className="rqs-divider" />
      <span className="rqs-dims">{w}&times;{h} ft</span>
      <span className="rqs-divider" />
      <span className="rqs-stat">{derived.netSidingSF} <small>SF siding</small></span>
      <span className="rqs-stat">{derived.totalTrimLF} <small>LF trim</small></span>
      <span className="rqs-stat">{derived.totalWindows} <small>win</small></span>
      <span className="rqs-stat">{derived.totalDoors} <small>doors</small></span>
      {derived.totalDeductionSF > 0 && (
        <span className="rqs-stat rqs-deduct">-{derived.totalDeductionSF} <small>SF deduct</small></span>
      )}
    </div>
  );
}

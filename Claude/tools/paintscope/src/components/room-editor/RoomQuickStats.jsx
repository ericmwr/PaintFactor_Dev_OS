export default function RoomQuickStats({ room, derived }) {
  const label = room.label || 'Untitled';
  const qt = room.quality_tier || 'QT3';
  const hb = derived.heightBand || 'STD';
  const L = room.length_ft || 0;
  const W = room.width_ft || 0;
  const H = room.height_ft || 0;
  const closetCount = (room.closets || []).length;

  return (
    <div className="room-quick-stats">
      <span className="rqs-label">{label}</span>
      <span className="rqs-badges">
        <span className="rqs-badge">{qt}</span>
        <span className="rqs-badge">{hb} height</span>
      </span>
      <span className="rqs-divider" />
      <span className="rqs-dims">{L}&times;{W}&times;{H} ft</span>
      <span className="rqs-divider" />
      <span className="rqs-stat">{derived.perimeter} <small>LF perim</small></span>
      <span className="rqs-stat">{derived.wall_field_sf} <small>SF wall</small></span>
      <span className="rqs-stat">{derived.ceiling_field_sf} <small>SF ceil</small></span>
      {derived.openingDeduction > 0 && (
        <span className="rqs-stat rqs-deduct">-{derived.openingDeduction} <small>SF opens</small></span>
      )}
      {derived.extraWallSF > 0 && (
        <span className="rqs-stat" style={{color: 'var(--accent)'}}>+{derived.extraWallSF} <small>SF extra</small></span>
      )}
      {derived.wallDeductSF > 0 && (
        <span className="rqs-stat rqs-deduct">-{derived.wallDeductSF} <small>SF deduct</small></span>
      )}
      {closetCount > 0 && (
        <span className="rqs-stat">{closetCount} <small>closet{closetCount > 1 ? 's' : ''}</small></span>
      )}
    </div>
  );
}

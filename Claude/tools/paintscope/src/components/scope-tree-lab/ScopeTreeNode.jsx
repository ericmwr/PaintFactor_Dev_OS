// Recursive renderer for a single ScopeTree node + its descendants.
// Stateless; expansion state is owned by LabScopeTree.

const KIND_BADGES = {
  project:        null,
  room:           'Room',
  element_group:  'Group',
  substrate:      'Substrate',
  coating:        'Coating',
  phase:          'Phase',
  task:           'Task',
  merged_task:    'Task',
  activity:       'Activity',
};

export default function ScopeTreeNode({
  node,
  isExpanded,
  onToggle,
  onTaskClick,
  selectedTaskId,
  depth = 0,
}) {
  const expanded = isExpanded(node);
  const hasChildren = node.children && node.children.length > 0;
  const isTask = node.kind === 'task' || node.kind === 'merged_task';
  const isActivity = node.kind === 'activity';
  const isSelected = isTask && selectedTaskId === node.id;
  const annotation = node.displayAnnotation || null;
  const meta = isTask ? (node.taskMeta || {}) : null;
  // qty/rate cells: tasks show both; activities show qty (summed) only —
  // rate lives at the atomic level since the activity aggregates mixed rates.
  const qtyCell = isTask
    ? formatQty(meta)
    : (isActivity ? formatActivityQty(node.activityMeta) : null);
  const rateCell = isTask ? formatRate(meta) : null;
  const roomChips = node.roomChips || null;
  const substrateChips = node.substrateChips || null;

  const handleClick = (e) => {
    e.stopPropagation();
    if (isTask) {
      onTaskClick(node);
    } else if (hasChildren) {
      onToggle(node.id, !expanded);
    }
  };

  return (
    <div className={`stn-node stn-kind-${node.kind} stn-level-${node.level}`}>
      <div
        className={`stn-row ${isSelected ? 'stn-selected' : ''} ${hasChildren ? 'stn-clickable' : ''}`}
        style={{ paddingLeft: 8 + depth * 16 }}
        onClick={handleClick}
      >
        <span className="stn-twisty">
          {hasChildren ? (expanded ? '▾' : '▸') : ''}
        </span>
        {KIND_BADGES[node.kind] && (
          <span className={`stn-badge stn-badge-${node.kind}`}>{KIND_BADGES[node.kind]}</span>
        )}
        <span className="stn-label">{node.label}</span>
        {annotation && (
          <span className="stn-annotation" title="combined-pass / finish-group flag">
            {annotation}
          </span>
        )}
        {node.isOutlier && (
          <span className="stn-outlier" title="Fires in 25% or fewer of this phase's rooms">
            outlier
          </span>
        )}
        {substrateChips && substrateChips.length > 0 && (
          <span className="stn-subchips" title="substrates this task fires on">
            {substrateChips.map(sc => (
              <span key={sc.substrateId} className="stn-subchip" data-group={sc.group} title={`${sc.label} — ${sc.group}`}>
                {sc.label}
              </span>
            ))}
          </span>
        )}
        {roomChips && roomChips.length > 0 && (
          <span className="stn-roomchips">
            {roomChips.map(rc => (
              <span key={rc.roomIndex} className="stn-roomchip" title={rc.label}>
                {rc.label}
              </span>
            ))}
          </span>
        )}
        <span className="stn-spacer" />
        {qtyCell && (
          <span className="stn-qty" title="quantity × UOM">{qtyCell}</span>
        )}
        {rateCell && (
          <span className="stn-rate" title="base rate (UOM/hr) or fixed minutes">{rateCell}</span>
        )}
        {node.hours > 0 && (
          <span className="stn-hours">{node.hours.toFixed(2)}h</span>
        )}
        {node.dollars > 0 && (
          <span className="stn-dollars">${node.dollars.toFixed(2)}</span>
        )}
      </div>
      {expanded && hasChildren && (
        <div className="stn-children">
          {node.children.map(child => (
            <ScopeTreeNode
              key={child.id}
              node={child}
              isExpanded={isExpanded}
              onToggle={onToggle}
              onTaskClick={onTaskClick}
              selectedTaskId={selectedTaskId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function formatQty(meta) {
  const { quantity, uom } = meta;
  if (quantity == null) return null;
  // Fixed-minute tasks have quantity 1 — surface as a dash
  if (meta.isFixed) return null;
  const q = Number(quantity);
  if (!Number.isFinite(q) || q <= 0) return null;
  const display = q >= 100 ? q.toFixed(0) : q.toFixed(2);
  return uom ? `${display} ${uom}` : display;
}

function formatRate(meta) {
  if (meta.isFixed && meta.baseRate) {
    // Fixed-minute tasks: baseRate is rendered upstream as "Xm"
    return String(meta.baseRate);
  }
  if (meta.baseRate == null) return null;
  const r = Number(meta.baseRate);
  if (!Number.isFinite(r) || r <= 0) return null;
  const display = r >= 100 ? r.toFixed(0) : r.toFixed(1);
  return meta.uom ? `${display}/${meta.uom}/hr` : `${display}/hr`;
}

function formatActivityQty(activityMeta) {
  if (!activityMeta) return null;
  const q = Number(activityMeta.quantity);
  if (!Number.isFinite(q) || q <= 0) return null;
  const display = q >= 100 ? q.toFixed(0) : q.toFixed(2);
  return activityMeta.uom ? `${display} ${activityMeta.uom}` : display;
}

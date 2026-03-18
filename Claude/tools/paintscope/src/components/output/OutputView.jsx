import { useState } from 'react';
import WorkOrderView from '../workorder/WorkOrderView';
import ExportImport from '../export/ExportImport';

const SUB_TABS = [
  { id: 'workorder', label: 'Work Order' },
  { id: 'export',    label: 'Export / Import' },
];

export default function OutputView() {
  const [subTab, setSubTab] = useState('workorder');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="editor-tab-bar">
        {SUB_TABS.map(t => (
          <div
            key={t.id}
            className={`editor-tab${subTab === t.id ? ' active' : ''}`}
            onClick={() => setSubTab(t.id)}
          >
            {t.label}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        {subTab === 'workorder' && <WorkOrderView />}
        {subTab === 'export' && <ExportImport />}
      </div>
    </div>
  );
}

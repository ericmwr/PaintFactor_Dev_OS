// Two-button pair: Copy-to-clipboard + Download JSON. Accepts a prebuilt
// debug blob object from the parent (DevView).

import { useState } from 'react';

export default function DebugBlobButton({ blob, fileNameHint = 'paintscope-debug' }) {
  const [flashMsg, setFlashMsg] = useState('');

  const flash = (msg, ms = 1800) => {
    setFlashMsg(msg);
    setTimeout(() => setFlashMsg(''), ms);
  };

  const handleCopy = async () => {
    const json = JSON.stringify(blob, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      flash(`Copied (${(json.length / 1024).toFixed(1)} KB)`);
    } catch (e) {
      console.error('[DebugBlobButton] clipboard error:', e);
      flash('Copy failed — see console');
    }
  };

  const handleDownload = () => {
    const json = JSON.stringify(blob, null, 2);
    const blobObj = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blobObj);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `${fileNameHint}-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flash('Downloaded');
  };

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <button className="btn btn-sm btn-accent" onClick={handleCopy} title="Copy JSON to clipboard for pasting into a bug report or chat">
        Copy Debug Blob
      </button>
      <button className="btn btn-sm" onClick={handleDownload} title="Download JSON file">
        Download
      </button>
      {flashMsg && (
        <span style={{ fontSize: 10, color: '#5aa85a', fontWeight: 600 }}>{flashMsg}</span>
      )}
    </div>
  );
}

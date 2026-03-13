// Modal overlay orchestrating the photo analysis flow:
// Step 1: Upload photos
// Step 2: Analyzing (progress spinner)
// Step 3: Review & Accept detections
// Supports re-opening with previously saved analysis via savedResult prop.

import { useState, useCallback, useRef } from 'react';
import PhotoUploader from './PhotoUploader';
import AnalysisReview from './AnalysisReview';
import { analyzeRoomPhotos } from '../../services/photo-analysis';
import { buildRoomPatch } from '../../services/photo-analysis/mapper';

const PHASE_LABELS = {
  resize: 'Optimizing images...',
  encode: 'Encoding images...',
  overview: 'Analyzing room layout...',
  detail: 'Identifying surfaces and items...',
  merge: 'Preparing results...',
};

export default function PhotoAnalysisModal({ roomId, savedResult, onApply, onCreateRoom, onClose }) {
  // If we have a saved result, start in review mode
  const [step, setStep] = useState(savedResult ? 'review' : 'upload');
  const [files, setFiles] = useState([]);
  const [phase, setPhase] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(savedResult || null);
  const abortRef = useRef(null);

  const handleAnalyze = useCallback(async () => {
    if (files.length === 0) return;
    setStep('analyzing');
    setError('');
    abortRef.current = new AbortController();

    try {
      const analysisResult = await analyzeRoomPhotos(files, {
        signal: abortRef.current.signal,
        onProgress: (p) => setPhase(p),
      });
      setResult(analysisResult);
      setStep('review');
    } catch (err) {
      if (err.name === 'AbortError') {
        setStep('upload');
      } else {
        setError(err.message);
        setStep('error');
      }
    }
  }, [files]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setStep('upload');
  }, []);

  const handleApply = useCallback(() => {
    if (!result) return;
    const patch = buildRoomPatch(result);
    if (roomId) {
      onApply(roomId, patch, result);
    } else {
      onCreateRoom(patch, result);
    }
    onClose();
  }, [result, roomId, onApply, onCreateRoom, onClose]);

  const activeCount = result ? countActive(result) : 0;

  return (
    <div className="photo-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="photo-modal">
        {/* Header */}
        <div className="photo-modal-header">
          <h3>
            {step === 'upload' && 'Scan Room Photos'}
            {step === 'analyzing' && 'Analyzing...'}
            {step === 'review' && 'Review Detections'}
            {step === 'error' && 'Analysis Error'}
          </h3>
          <button className="photo-modal-close" onClick={onClose}>x</button>
        </div>

        {/* Body */}
        <div className="photo-modal-body">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <>
              <PhotoUploader files={files} onFilesChange={setFiles} />
              <div className="photo-modal-actions">
                <button className="btn" onClick={onClose}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={handleAnalyze}
                  disabled={files.length === 0}
                >
                  Analyze {files.length} Photo{files.length !== 1 ? 's' : ''}
                </button>
              </div>
            </>
          )}

          {/* Step 2: Analyzing */}
          {step === 'analyzing' && (
            <div className="photo-analyzing">
              <div className="photo-spinner" />
              <p className="photo-phase-label">{PHASE_LABELS[phase] || 'Processing...'}</p>
              <button className="btn" onClick={handleCancel}>Cancel</button>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && result && (
            <>
              <div className="photo-review-layout">
                {/* Photo thumbnails on left (only available for fresh scans) */}
                {files.length > 0 && (
                  <div className="photo-review-images">
                    {files.map((f, i) => (
                      <img key={i} src={URL.createObjectURL(f)} alt={`Room photo ${i + 1}`} className="review-thumb" />
                    ))}
                  </div>
                )}
                {/* Detections */}
                <div className={`photo-review-detections${files.length === 0 ? ' photo-review-detections-full' : ''}`}>
                  <AnalysisReview result={result} onResultChange={setResult} />
                </div>
              </div>
              <div className="photo-modal-actions">
                <button className="btn" onClick={() => { setResult(null); setStep('upload'); }}>
                  {savedResult ? 'New Scan' : 'Back'}
                </button>
                <button className="btn btn-primary" onClick={handleApply}>
                  Apply {activeCount} Detection{activeCount !== 1 ? 's' : ''}
                </button>
              </div>
            </>
          )}

          {/* Error state */}
          {step === 'error' && (
            <div className="photo-error">
              <p className="photo-error-msg">{error}</p>
              <div className="photo-modal-actions">
                <button className="btn" onClick={onClose}>Close</button>
                <button className="btn" onClick={() => setStep('upload')}>Try Again</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Count non-skip detections
function countActive(result) {
  let count = 0;
  if (result.surfaces) count += Object.values(result.surfaces).filter(s => s.scope && s.scope !== 'skip').length;
  if (result.trim) count += Object.values(result.trim).filter(t => t.scope && t.scope !== 'skip').length;
  if (result.doors) count += result.doors.filter(d => d.scope && d.scope !== 'skip').length;
  if (result.windows) count += result.windows.filter(w => w.scope && w.scope !== 'skip').length;
  if (result.openings) count += result.openings.filter(o => o.scope && o.scope !== 'skip').length;
  if (result.fixtures) count += result.fixtures.filter(f => f.scope && f.scope !== 'skip').length;
  if (result.specialty) count += Object.values(result.specialty).filter(s => s.scope && s.scope !== 'skip').length;
  if (result.roomPatch) count += 1;
  return count;
}

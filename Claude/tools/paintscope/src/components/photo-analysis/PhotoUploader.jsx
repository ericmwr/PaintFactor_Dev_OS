// Drag-drop + file picker for room photos (up to 5)

import { useState, useRef, useCallback } from 'react';

const MAX_PHOTOS = 5;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

export default function PhotoUploader({ files, onFilesChange }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const addFiles = useCallback((newFiles) => {
    const valid = Array.from(newFiles).filter(f => ACCEPTED_TYPES.includes(f.type));
    const combined = [...files, ...valid].slice(0, MAX_PHOTOS);
    onFilesChange(combined);
  }, [files, onFilesChange]);

  const removeFile = useCallback((index) => {
    onFilesChange(files.filter((_, i) => i !== index));
  }, [files, onFilesChange]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  return (
    <div className="photo-uploader">
      {/* Drop zone */}
      <div
        className={`photo-drop-zone ${dragOver ? 'drag-over' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          multiple
          style={{ display: 'none' }}
          onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
        />
        <div className="drop-zone-content">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21,15 16,10 5,21" />
          </svg>
          <p>Drop room photos here or click to browse</p>
          <span className="drop-zone-hint">Up to {MAX_PHOTOS} photos (JPEG, PNG, WebP)</span>
        </div>
      </div>

      {/* Thumbnails */}
      {files.length > 0 && (
        <div className="photo-thumbnails">
          {files.map((file, i) => (
            <div key={i} className="photo-thumb">
              <img src={URL.createObjectURL(file)} alt={`Room photo ${i + 1}`} />
              <button
                className="photo-thumb-remove"
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                title="Remove photo"
              >
                x
              </button>
            </div>
          ))}
          {files.length < MAX_PHOTOS && (
            <div
              className="photo-thumb photo-thumb-add"
              onClick={() => inputRef.current?.click()}
              title="Add another photo"
            >
              +
            </div>
          )}
        </div>
      )}

      {files.length > 0 && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          {files.length}/{MAX_PHOTOS} photos selected
        </div>
      )}
    </div>
  );
}

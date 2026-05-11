import React, { useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { savePhoto } from '../../services/storage';

/**
 * PhotoCapture – camera or file input that converts the image to base64,
 * saves it to IndexedDB, and calls onCapture({ id, preview }) where
 * `id` is the IndexedDB key and `preview` is a small base64 thumbnail.
 */
export default function PhotoCapture({ onCapture, label = 'Add Photo', className = '' }) {
  const inputRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64 = evt.target.result;
      const id = uuidv4();
      await savePhoto(id, base64, { type: file.type, name: file.name });
      onCapture({ id, preview: base64 });
    };
    reader.readAsDataURL(file);
    // Reset input so the same file can be selected again
    e.target.value = '';
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`btn-secondary flex items-center gap-2 ${className}`}
      >
        📷 {label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
    </>
  );
}

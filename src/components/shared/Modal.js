import React from 'react';

/**
 * Modal – simple overlay modal wrapper.
 */
export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-surface-800 rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
          <h2 className="text-lg font-bold text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 text-2xl leading-none w-10 h-10 flex items-center justify-center rounded-xl"
            style={{ touchAction: 'manipulation' }}
          >&times;</button>
        </div>
        <div
          className="p-5"
          style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

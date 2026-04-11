'use client';

import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/30 transition-opacity"
          onClick={onClose}
        />
        <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
          {children}
        </div>
      </div>
    </div>
  );
}

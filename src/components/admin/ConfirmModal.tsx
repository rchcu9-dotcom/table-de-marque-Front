import type { ReactNode } from 'react';

export interface ConfirmModalProps {
  title: string;
  message: ReactNode;
  confirmingLabel: string;
  onClose: () => void;
  onConfirm: () => void;
  submitting: boolean;
}

export default function ConfirmModal({
  title,
  message,
  confirmingLabel,
  onClose,
  onConfirm,
  submitting,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-[999] bg-black/60 flex items-center justify-center px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-sm w-full flex flex-col gap-4"
      >
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <div className="text-sm text-slate-300">{message}</div>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:bg-slate-800 transition"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-50 transition"
          >
            {submitting ? confirmingLabel : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}

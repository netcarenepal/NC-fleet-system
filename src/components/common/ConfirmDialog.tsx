import React from 'react';
import { AlertTriangle, AlertCircle, HelpCircle, CheckCircle2, X } from 'lucide-react';
import { Modal } from './Modal';

export type ConfirmVariant = 'danger' | 'warning' | 'primary';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  variant = 'primary',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const config = {
    danger: {
      icon: AlertCircle,
      iconBg: 'bg-rose-50 text-rose-600 border border-rose-200',
      btnBg: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-200',
      btnBg: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    primary: {
      icon: CheckCircle2,
      iconBg: 'bg-slate-100 text-slate-800 border border-slate-200',
      btnBg: 'bg-slate-900 hover:bg-slate-800 text-white',
    },
  }[variant];

  const IconComponent = config.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="md">
      <div className="space-y-4">
        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 rounded-xl shrink-0 ${config.iconBg}`}>
            <IconComponent className="w-5 h-5" />
          </div>
          <div className="text-xs text-slate-600 leading-relaxed pt-0.5">
            <p>{description}</p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5 ${config.btnBg}`}
          >
            {isLoading && (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

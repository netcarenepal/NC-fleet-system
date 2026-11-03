import React from 'react';
import { LucideIcon, PackageOpen } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = PackageOpen,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`bg-white rounded-2xl p-10 border border-slate-200 text-center shadow-xs flex flex-col items-center justify-center max-w-lg mx-auto my-6 ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center mb-3 shadow-xs">
        <Icon className="w-6 h-6 stroke-[1.8]" />
      </div>
      <h3 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h3>
      <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

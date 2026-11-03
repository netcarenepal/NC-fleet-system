import React from 'react';

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 6,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs animate-pulse">
      <div className="bg-slate-50 border-b border-slate-200 p-3.5 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className="h-3.5 bg-slate-200 rounded-md"
            style={{ width: `${Math.floor(80 / columns)}%` }}
          />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-3.5 flex items-center gap-4">
            {Array.from({ length: columns }).map((_, c) => (
              <div
                key={c}
                className="h-3 bg-slate-100 rounded"
                style={{ width: `${Math.floor(75 / columns) + (c % 2 === 0 ? 10 : -5)}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs animate-pulse space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 bg-slate-200 rounded" />
            <div className="h-3.5 w-16 bg-slate-100 rounded" />
          </div>
          <div className="h-8 w-32 bg-slate-200 rounded-lg" />
          <div className="h-3 w-40 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  );
};

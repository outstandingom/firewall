import React, { ReactNode } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  className?: string;
}

export function EmptyState({ icon, title, description, className }: EmptyStateProps) {
  return (
    <div className={twMerge('flex flex-col items-center justify-center p-8 text-center text-slate-500', className)}>
      <div className="mb-4 text-slate-400">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-slate-300 mb-1">{title}</h3>
      {description && <p className="text-sm">{description}</p>}
    </div>
  );
}

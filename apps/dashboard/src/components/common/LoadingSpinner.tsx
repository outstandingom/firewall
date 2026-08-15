import React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface LoadingSpinnerProps {
  className?: string;
  size?: number;
}

export function LoadingSpinner({ className, size = 24 }: LoadingSpinnerProps) {
  return (
    <div className={twMerge('flex justify-center items-center p-4', className)}>
      <Loader2 size={size} className="animate-spin text-indigo-500" />
    </div>
  );
}

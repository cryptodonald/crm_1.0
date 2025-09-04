'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const FormMessageSubtle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  if (!children) {
    return null;
  }

  return (
    <p
      ref={ref}
      className={cn(
        'text-xs text-red-500 dark:text-red-400 mt-1 leading-relaxed',
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
});

FormMessageSubtle.displayName = 'FormMessageSubtle';

export { FormMessageSubtle };

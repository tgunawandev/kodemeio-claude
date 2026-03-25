import React from 'react';
import { cn } from '@/lib/utils';

{{props}}

export function {{componentName}}({
  className,
  onSubmit,
  ...props
}: {{componentName}}Props) {
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit?.(event);
  };

  return (
    <form
      className={cn("space-y-4", className)}
      onSubmit={handleSubmit}
      noValidate
      {{accessibility}}
      {...props}
    >
      {children}
    </form>
  );
}
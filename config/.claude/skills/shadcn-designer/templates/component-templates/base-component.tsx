import React from 'react';
import { cn } from '@/lib/utils';

{{props}}

export function {{componentName}}({
{{defaultProps}}
}: {{componentName}}Props) {
  return (
    <div
      className={cn(
        "base-component",
        {{styling}}
      )}
      {{accessibility}}
    >
      {children}
    </div>
  );
}
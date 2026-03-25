// Minimal Composition Pattern
// {{description}}

// Base component - minimal and focused
const BaseComponent = React.forwardRef<HTMLDivElement, BaseComponentProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("base-component", className)}
      {...props}
    >
      {children}
    </div>
  )
);

// Enhanced component - composes base functionality
const EnhancedComponent = React.forwardRef<HTMLDivElement, EnhancedComponentProps>(
  ({ variant, size, ...props }, ref) => (
    <BaseComponent
      ref={ref}
      className={getVariantClasses(variant, size)}
      {...props}
    >
      <ComponentContent />
    </BaseComponent>
  )
);

// Usage: Compose instead of inherit
const MyComponent = () => (
  <EnhancedComponent variant="primary" size="large">
    Content here
  </EnhancedComponent>
);
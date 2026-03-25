import { type ComponentSpec, type DesignRequirement, type StylePreferences, type ComponentCategory, type UltrathinkPattern } from './types.js';

/**
 * Template engine for generating component, block, and pattern templates
 */
export class TemplateEngine {
  private componentTemplates = new Map<string, ComponentTemplate>();
  private blockTemplates = new Map<string, BlockTemplate>();
  private patternTemplates = new Map<string, PatternTemplate>();

  constructor() {
    this.initializeComponentTemplates();
    this.initializeBlockTemplates();
    this.initializePatternTemplates();
  }

  /**
   * Generate component from template
   */
  generateComponent(
    templateName: string,
    spec: ComponentSpec,
    requirements: DesignRequirement,
    customizations?: Record<string, any>
  ): {
    code: string;
    styles: string;
    imports: string[];
    exports: string[];
  } {
    const template = this.componentTemplates.get(templateName);
    if (!template) {
      throw new Error(`Component template '${templateName}' not found`);
    }

    return this.renderComponentTemplate(template, spec, requirements, customizations);
  }

  /**
   * Generate block from template
   */
  generateBlock(
    templateName: string,
    components: string[],
    layout: string,
    requirements: DesignRequirement
  ): {
    code: string;
    styles: string;
    imports: string[];
  } {
    const template = this.blockTemplates.get(templateName);
    if (!template) {
      throw new Error(`Block template '${templateName}' not found`);
    }

    return this.renderBlockTemplate(template, components, layout, requirements);
  }

  /**
   * Generate pattern from template
   */
  generatePattern(
    patternName: string,
    context: any,
    requirements: DesignRequirement
  ): {
    code: string;
    explanation: string;
    examples: string[];
  } {
    const template = this.patternTemplates.get(patternName);
    if (!template) {
      throw new Error(`Pattern template '${patternName}' not found`);
    }

    return this.renderPatternTemplate(template, context, requirements);
  }

  /**
   * Find the best template for given requirements
   */
  findBestTemplate(
    category: ComponentCategory,
    requirements: DesignRequirement,
    features: string[]
  ): string {
    const templates = Array.from(this.componentTemplates.entries())
      .filter(([_, template]) => template.category === category);

    let bestTemplate = templates[0]?.[0];
    let bestScore = 0;

    for (const [name, template] of templates) {
      const score = this.calculateTemplateScore(template, requirements, features);
      if (score > bestScore) {
        bestScore = score;
        bestTemplate = name;
      }
    }

    return bestTemplate || 'base-component';
  }

  /**
   * Create custom template from existing component
   */
  createCustomTemplate(
    name: string,
    componentCode: string,
    description: string,
    category: ComponentCategory
  ): void {
    const template: ComponentTemplate = {
      name,
      description,
      category,
      template: componentCode,
      variables: this.extractVariables(componentCode),
      dependencies: this.extractDependencies(componentCode),
      styles: this.extractStyles(componentCode)
    };

    this.componentTemplates.set(name, template);
  }

  /**
   * Render component template with data
   */
  private renderComponentTemplate(
    template: ComponentTemplate,
    spec: ComponentSpec,
    requirements: DesignRequirement,
    customizations?: Record<string, any>
  ): {
    code: string;
    styles: string;
    imports: string[];
    exports: string[];
  } {
    const variables = {
      componentName: spec.name,
      description: spec.description,
      props: this.generatePropsInterface(spec),
      defaultProps: this.generateDefaultProps(spec),
      variants: this.generateVariantsCode(spec),
      accessibility: this.generateAccessibilityCode(spec),
      styling: this.generateStylingCode(requirements.style),
      ...customizations
    };

    let code = template.template;

    // Replace template variables
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      code = code.replace(regex, value as string);
    });

    // Generate imports
    const imports = [
      "import React from 'react';",
      "import { cn } from '@/lib/utils';",
      ...template.dependencies.map(dep => `import { ${dep} } from '${dep}';`)
    ];

    // Generate exports
    const exports = [
      `export { ${spec.name} };`,
      `export type { ${spec.name}Props };`
    ];

    return {
      code: code.trim(),
      styles: template.styles,
      imports,
      exports
    };
  }

  /**
   * Render block template with data
   */
  private renderBlockTemplate(
    template: BlockTemplate,
    components: string[],
    layout: string,
    requirements: DesignRequirement
  ): {
    code: string;
    styles: string;
    imports: string[];
  } {
    const variables = {
      components: components.map(comp => `import { ${comp} } from './${comp}';`).join('\n'),
      layout,
      title: this.generateBlockTitle(components),
      description: requirements.description,
      styling: this.generateBlockStyling(requirements.style)
    };

    let code = template.template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      code = code.replace(regex, value as string);
    });

    const imports = [
      "import React from 'react';",
      "import { cn } from '@/lib/utils';",
      ...components.map(comp => `import { ${comp} } from './${comp}';`)
    ];

    return {
      code: code.trim(),
      styles: template.styles,
      imports
    };
  }

  /**
   * Render pattern template with data
   */
  private renderPatternTemplate(
    template: PatternTemplate,
    context: any,
    requirements: DesignRequirement
  ): {
    code: string;
    explanation: string;
    examples: string[];
  } {
    const variables = {
      context: JSON.stringify(context, null, 2),
      description: requirements.description,
      principles: template.principles.join('\n- '),
      examples: template.examples.join('\n\n')
    };

    let code = template.template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      code = code.replace(regex, value as string);
    });

    return {
      code: code.trim(),
      explanation: template.explanation,
      examples: template.examples
    };
  }

  /**
   * Initialize component templates
   */
  private initializeComponentTemplates(): void {
    // Base component template
    this.componentTemplates.set('base-component', {
      name: 'base-component',
      description: 'Basic component template with props and styling',
      category: 'layout',
      template: `import React from 'react';
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
}`,
      variables: ['componentName', 'props', 'defaultProps', 'styling', 'accessibility'],
      dependencies: [],
      styles: `.base-component {
  /* Base component styles */
}`
    });

    // Button component template
    this.componentTemplates.set('button', {
      name: 'button',
      description: 'Button component with variants and states',
      category: 'feedback',
      template: `import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

{{props}}

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export function {{componentName}}({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: {{componentName}}Props) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {{accessibility}}
      {...props}
    >
      {children}
    </Comp>
  );
}`,
      variables: ['componentName', 'props', 'accessibility'],
      dependencies: ['Slot'],
      styles: ''
    });

    // Form component template
    this.componentTemplates.set('form', {
      name: 'form',
      description: 'Form component with validation and accessibility',
      category: 'forms',
      template: `import React from 'react';
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
}`,
      variables: ['componentName', 'props', 'accessibility'],
      dependencies: [],
      styles: `.form-field {
  @apply space-y-2;
}

.form-label {
  @apply text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70;
}

.form-input {
  @apply flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50;
}`
    });

    // Card component template
    this.componentTemplates.set('card', {
      name: 'card',
      description: 'Card container with header, content, and footer',
      category: 'layout',
      template: `import React from 'react';
import { cn } from '@/lib/utils';

{{props}}

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    {{accessibility}}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {{accessibility}}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {{accessibility}}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {{accessibility}}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {{accessibility}}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };`,
      variables: ['props', 'accessibility'],
      dependencies: [],
      styles: ''
    });
  }

  /**
   * Initialize block templates
   */
  private initializeBlockTemplates(): void {
    // Dashboard block template
    this.blockTemplates.set('dashboard', {
      name: 'dashboard',
      description: 'Dashboard layout with sidebar and main content',
      category: 'layout',
      template: `{{components}}

export function Dashboard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      <aside className="hidden w-64 flex-col md:flex">
        <div className="flex h-14 items-center border-b px-4">
          <h2 className="text-lg font-semibold">Dashboard</h2>
        </div>
        <nav className="flex-1 space-y-2 p-4">
          {/* Navigation items */}
        </nav>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="border-b">
          <div className="flex h-14 items-center px-4">
            {/* Header content */}
          </div>
        </header>

        <div className="p-6">
          {{layout}}
          {children}
        </div>
      </main>
    </div>
  );
}`,
      styles: `.dashboard-grid {
  @apply grid gap-6 md:grid-cols-2 lg:grid-cols-3;
}`
    });

    // Hero section block template
    this.blockTemplates.set('hero', {
      name: 'hero',
      description: 'Hero section with headline and CTA',
      category: 'layout',
      template: `{{components}}

export function HeroSection({
  title,
  subtitle,
  ctaText,
  onCtaClick
}: {
  title: string;
  subtitle: string;
  ctaText: string;
  onCtaClick: () => void;
}) {
  return (
    <section className="relative py-20 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            {title}
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
            {subtitle}
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button onClick={onCtaClick} size="lg">
              {ctaText}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}`,
      styles: ''
    });
  }

  /**
   * Initialize pattern templates
   */
  private initializePatternTemplates(): void {
    // Minimal composition pattern
    this.patternTemplates.set('minimal-composition', {
      name: 'minimal-composition',
      description: 'Minimal composition pattern for component design',
      category: 'pattern',
      explanation: 'This pattern emphasizes composing simple components into complex ones, avoiding inheritance and maintaining single responsibility.',
      principles: [
        'Composition over inheritance',
        'Single responsibility principle',
        'Minimal API surface',
        'Clear separation of concerns'
      ],
      template: `// Minimal Composition Pattern
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
);`,
      examples: [
        `// Composition example
const Card = ({ children, ...props }) => (
  <div className="card" {...props}>
    {children}
  </div>
);

const InteractiveCard = ({ onClick, ...props }) => (
  <Card
    className="interactive"
    onClick={onClick}
    {...props}
  >
    <CardHeader />
    <CardContent />
  </Card>
);`
      ]
    });

    // Progressive enhancement pattern
    this.patternTemplates.set('progressive-enhancement', {
      name: 'progressive-enhancement',
      description: 'Progressive enhancement pattern for accessibility',
      category: 'pattern',
      explanation: 'Start with semantic HTML that works without JavaScript, then enhance with JavaScript for better user experience.',
      principles: [
        'Semantic HTML first',
        'JavaScript enhances functionality',
        'Graceful degradation',
        'Universal accessibility'
      ],
      template: `// Progressive Enhancement Pattern
// {{description}}

// 1. Semantic HTML foundation
const FormComponent = () => (
  <form
    action="/submit"
    method="post"
    onSubmit={handleSubmit}
    noValidate
  >
    <label htmlFor="email">Email Address</label>
    <input
      type="email"
      id="email"
      name="email"
      required
      aria-describedby="email-error"
    />
    <div id="email-error" role="alert"></div>

    <button type="submit">Subscribe</button>
  </form>
);

// 2. JavaScript enhancement
const EnhancedForm = () => {
  const [errors, setErrors] = useState({});

  const validateEmail = (email) => {
    // Enhanced validation logic
    return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    // Enhanced submission with validation
    if (validateEmail(formData.email)) {
      // Submit with fetch API
      submitForm(formData);
    } else {
      setErrors({ email: 'Invalid email address' });
    }
  };

  return (
    <FormComponent onSubmit={handleSubmit} />
  );
};`,
      examples: [
        `// Navigation enhancement
const Navigation = () => (
  <nav>
    <ul>
      <li><a href="/home">Home</a></li>
      <li><a href="/about">About</a></li>
    </ul>
  </nav>
);

// Enhanced with SPA behavior
const EnhancedNavigation = () => {
  const navigate = useNavigate();

  return (
    <nav>
      <ul>
        <li><Link to="/home">Home</Link></li>
        <li><Link to="/about">About</Link></li>
      </ul>
    </nav>
  );
);`
      ]
    });
  }

  // Helper methods
  private calculateTemplateScore(
    template: ComponentTemplate,
    requirements: DesignRequirement,
    features: string[]
  ): number {
    let score = 0;

    // Base score for matching category
    score += 10;

    // Score for feature matching
    features.forEach(feature => {
      if (template.description.toLowerCase().includes(feature.toLowerCase())) {
        score += 5;
      }
    });

    // Score for requirement matching
    if (requirements.constraints.responsive && template.description.includes('responsive')) {
      score += 3;
    }

    if (requirements.accessibility.level !== 'minimal' && template.description.includes('accessibility')) {
      score += 3;
    }

    return score;
  }

  private generatePropsInterface(spec: ComponentSpec): string {
    const props = spec.props.map(prop => {
      const optional = prop.required ? '' : '?';
      return `  ${prop.name}${optional}: ${prop.type};`;
    }).join('\n');

    return `interface ${spec.name}Props {\n${props}\n}`;
  }

  private generateDefaultProps(spec: ComponentSpec): string {
    return spec.props.map(prop => {
      if (prop.name === 'className') return `  className?,`;
      if (prop.name === 'children') return `  children,`;
      return `  ${prop.name}?,`;
    }).join('\n');
  }

  private generateVariantsCode(spec: ComponentSpec): string {
    return spec.variants.map(variant =>
      `'${variant.name}': '${variant.className}'`
    ).join(',\n    ');
  }

  private generateAccessibilityCode(spec: ComponentSpec): string {
    const attrs: string[] = [];

    if (spec.accessibility.role) {
      attrs.push(`role="${spec.accessibility.role}"`);
    }

    if (spec.accessibility.ariaAttributes) {
      Object.entries(spec.accessibility.ariaAttributes).forEach(([key, value]) => {
        attrs.push(`aria-${key}="${value}"`);
      });
    }

    return attrs.length > 0 ? attrs.join(' ') : '';
  }

  private generateStylingCode(style: StylePreferences): string {
    const classes: string[] = [];

    if (style.primaryColor) {
      classes.push('bg-primary', 'text-primary-foreground');
    }

    if (style.borderRadius) {
      classes.push(`rounded-${style.borderRadius}`);
    }

    if (style.spacing) {
      classes.push(`p-${style.spacing === 'tight' ? '2' : style.spacing === 'relaxed' ? '6' : '4'}`);
    }

    return classes.length > 0 ? `"${classes.join(' ')}"` : '""';
  }

  private generateBlockTitle(components: string[]): string {
    return components.map(comp =>
      comp.replace(/Component$/, '')
    ).join(' + ');
  }

  private generateBlockStyling(style: StylePreferences): string {
    return this.generateStylingCode(style);
  }

  private extractVariables(code: string): string[] {
    const variableRegex = /{{\\s*(\\w+)\\s*}}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(code)) !== null) {
      variables.push(match[1]);
    }

    return [...new Set(variables)];
  }

  private extractDependencies(code: string): string[] {
    const importRegex = /import\\s*{([^}]+)}\\s*from\\s*['"]([^'"]+)['"]/g;
    const dependencies: string[] = [];
    let match;

    while ((match = importRegex.exec(code)) !== null) {
      dependencies.push(match[1].trim());
    }

    return [...new Set(dependencies)];
  }

  private extractStyles(code: string): string {
    // Extract CSS from template (would be more sophisticated in real implementation)
    const styleRegex = /```css\\n([\\s\\S]*?)\\n```/g;
    const match = styleRegex.exec(code);

    return match ? match[1] : '';
  }
}

// Template type definitions
interface ComponentTemplate {
  name: string;
  description: string;
  category: ComponentCategory;
  template: string;
  variables: string[];
  dependencies: string[];
  styles: string;
}

interface BlockTemplate {
  name: string;
  description: string;
  category: string;
  template: string;
  styles: string;
}

interface PatternTemplate {
  name: string;
  description: string;
  category: string;
  explanation: string;
  principles: string[];
  template: string;
  examples: string[];
}
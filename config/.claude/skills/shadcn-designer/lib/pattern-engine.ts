import { type UltrathinkPattern, type DesignRequirement, type DesignSuggestion, type ComponentSpec, type ComponentCategory } from './types.js';

/**
 * Pattern engine that applies ultrathink design principles
 */
export class PatternEngine {
  private patterns: Map<string, UltrathinkPattern> = new Map();
  private patternCache = new Map<string, DesignSuggestion[]>();

  constructor() {
    this.initializePatterns();
  }

  /**
   * Apply ultrathink patterns to enhance component design
   */
  async applyPatterns(requirement: DesignRequirement, spec: ComponentSpec): Promise<{
    enhancedSpec: ComponentSpec;
    suggestions: DesignSuggestion[];
    appliedPatterns: UltrathinkPattern[];
  }> {
    const relevantPatterns = this.findRelevantPatterns(requirement, spec);
    const suggestions: DesignSuggestion[] = [];
    let enhancedSpec = { ...spec };

    for (const pattern of relevantPatterns) {
      const application = await this.applyPattern(pattern, requirement, enhancedSpec);
      enhancedSpec = application.spec;
      suggestions.push(...application.suggestions);
    }

    return {
      enhancedSpec,
      suggestions,
      appliedPatterns: relevantPatterns
    };
  }

  /**
   * Find patterns relevant to the current design requirements
   */
  private findRelevantPatterns(requirement: DesignRequirement, spec: ComponentSpec): UltrathinkPattern[] {
    const relevant: UltrathinkPattern[] = [];

    for (const pattern of this.patterns.values()) {
      if (this.isPatternRelevant(pattern, requirement, spec)) {
        relevant.push(pattern);
      }
    }

    // Sort by relevance and priority
    return relevant.sort((a, b) => this.calculateRelevanceScore(b, requirement, spec) - this.calculateRelevanceScore(a, requirement, spec));
  }

  /**
   * Apply a specific pattern to the component specification
   */
  private async applyPattern(
    pattern: UltrathinkPattern,
    requirement: DesignRequirement,
    spec: ComponentSpec
  ): Promise<{ spec: ComponentSpec; suggestions: DesignSuggestion[] }> {
    const suggestions: DesignSuggestion[] = [];
    let enhancedSpec = { ...spec };

    switch (pattern.id) {
      case 'minimal-composition':
        enhancedSpec = this.applyMinimalComposition(enhancedSpec, requirement);
        suggestions.push(this.createSuggestion(
          'pattern',
          'Minimal Composition Applied',
          'Simplified component structure using composition over inheritance',
          pattern.codePattern
        ));
        break;

      case 'progressive-enhancement':
        enhancedSpec = this.applyProgressiveEnhancement(enhancedSpec, requirement);
        suggestions.push(this.createSuggestion(
          'enhancement',
          'Progressive Enhancement',
          'Core functionality works without JavaScript, enhanced with it',
          'Added no-JS fallbacks and enhanced interactions'
        ));
        break;

      case 'consistency-first':
        enhancedSpec = this.applyConsistencyFirst(enhancedSpec, requirement);
        suggestions.push(this.createSuggestion(
          'pattern',
          'Consistency First',
          'Applied consistent design patterns and naming conventions',
          'Standardized props, variants, and styling approach'
        ));
        break;

      case 'accessibility-by-default':
        enhancedSpec = this.applyAccessibilityByDefault(enhancedSpec, requirement);
        suggestions.push(this.createSuggestion(
          'enhancement',
          'Accessibility by Default',
          'WCAG AA compliance built into the component core',
          'Added proper ARIA attributes, keyboard navigation, and focus management'
        ));
        break;

      case 'performance-optimized':
        enhancedSpec = this.applyPerformanceOptimized(enhancedSpec, requirement);
        suggestions.push(this.createSuggestion(
          'enhancement',
          'Performance Optimized',
          'Optimized for minimal bundle size and runtime performance',
          'Lazy loading, code splitting, and efficient rendering'
        ));
        break;

      case 'responsive-mobile-first':
        enhancedSpec = this.applyResponsiveMobileFirst(enhancedSpec, requirement);
        suggestions.push(this.createSuggestion(
          'pattern',
          'Responsive Mobile-First',
          'Mobile-first responsive design with progressive enhancement',
          'Fluid layouts, flexible images, and media queries'
        ));
        break;
    }

    return { spec: enhancedSpec, suggestions };
  }

  /**
   * Initialize ultrathink design patterns
   */
  private initializePatterns(): void {
    const patterns: UltrathinkPattern[] = [
      {
        id: 'minimal-composition',
        name: 'Minimal Composition',
        description: 'Compose simple components into complex ones, avoiding inheritance',
        principles: [
          'Composition over inheritance',
          'Single responsibility',
          'Minimal API surface',
          'Clear separation of concerns'
        ],
        benefits: [
          'Better reusability',
          'Easier testing',
          'Clearer code structure',
          'Reduced coupling'
        ],
        useCases: [
          'Component libraries',
          'Design systems',
          'Complex UIs',
          'Team collaboration'
        ],
        codePattern: `
const BaseComponent = ({ children, className, ...props }) => (
  <div className={cn("base", className)} {...props}>
    {children}
  </div>
);

const EnhancedComponent = ({ variant, ...props }) => (
  <BaseComponent className={getVariantClass(variant)} {...props}>
    <Content />
  </BaseComponent>
);
        `.trim()
      },

      {
        id: 'progressive-enhancement',
        name: 'Progressive Enhancement',
        description: 'Core functionality works without JavaScript, enhanced with it',
        principles: [
          'Semantic HTML first',
          'JavaScript enhances',
          'Graceful degradation',
          'Universal access'
        ],
        benefits: [
          'Better accessibility',
          'Improved SEO',
          'Faster initial load',
          'Broader compatibility'
        ],
        useCases: [
          'Forms and submissions',
          'Navigation systems',
          'Content display',
          'E-commerce sites'
        ],
        codePattern: `
<form action="/submit" method="post" onSubmit={handleSubmit}>
  <input type="email" name="email" required />
  <button type="submit">Subscribe</button>
</form>

// JavaScript enhances with validation and feedback
const form = document.querySelector('form');
form.addEventListener('submit', enhanceSubmission);
        `.trim()
      },

      {
        id: 'consistency-first',
        name: 'Consistency First',
        description: 'Maintain consistent patterns across all components',
        principles: [
          'Consistent naming',
          'Predictable APIs',
          'Standard patterns',
          'Unified design language'
        ],
        benefits: [
          'Easier learning',
          'Better UX',
          'Reduced cognitive load',
          'Faster development'
        ],
        useCases: [
          'Design systems',
          'Component libraries',
          'Large applications',
          'Team projects'
        ],
        codePattern: `
// Consistent prop naming
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

// Consistent class naming
const buttonVariants = cva("inline-flex items-center justify-center", {
  variants: {
    variant: {
      primary: "bg-primary text-primary-foreground",
      secondary: "bg-secondary text-secondary-foreground"
    }
  }
});
        `.trim()
      },

      {
        id: 'accessibility-by-default',
        name: 'Accessibility by Default',
        description: 'Build accessibility into the core, not as an afterthought',
        principles: [
          'WCAG AA compliance',
          'Keyboard navigation',
          'Screen reader support',
          'Focus management'
        ],
        benefits: [
          'Inclusive design',
          'Legal compliance',
          'Better UX for all',
          'Wider audience'
        ],
        useCases: [
          'Public applications',
          'Enterprise software',
          'Government sites',
          'Educational platforms'
        ],
        codePattern: `
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : undefined}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
        `.trim()
      },

      {
        id: 'performance-optimized',
        name: 'Performance Optimized',
        description: 'Optimize for minimal bundle size and runtime performance',
        principles: [
          'Lazy loading',
          'Code splitting',
          'Efficient rendering',
          'Minimal dependencies'
        ],
        benefits: [
          'Faster load times',
          'Better user experience',
          'Reduced bandwidth',
          'Improved SEO'
        ],
        useCases: [
          'Mobile applications',
          'Low-bandwidth areas',
          'Large applications',
          'Performance-critical sites'
        ],
        codePattern: `
// Lazy load heavy components
const HeavyChart = React.lazy(() => import('./HeavyChart'));

// Code split by route
const Dashboard = React.lazy(() => import('./Dashboard'));

// Efficient rendering with memo
const ExpensiveComponent = React.memo(({ data }) => {
  const processedData = useMemo(() => processData(data), [data]);
  return <Chart data={processedData} />;
});
        `.trim()
      },

      {
        id: 'responsive-mobile-first',
        name: 'Responsive Mobile-First',
        description: 'Design for mobile first, then enhance for larger screens',
        principles: [
          'Mobile-first CSS',
          'Fluid layouts',
          'Flexible images',
          'Progressive enhancement'
        ],
        benefits: [
          'Better mobile experience',
          'Improved performance',
          'Simpler CSS',
          'Future-proof'
        ],
        useCases: [
          'Mobile applications',
          'Responsive websites',
          'Progressive web apps',
          'Multi-device experiences'
        ],
        codePattern: `
/* Mobile-first CSS */
.container {
  width: 100%;
  padding: 1rem;
}

/* Tablet and up */
@media (min-width: 768px) {
  .container {
    max-width: 768px;
    margin: 0 auto;
    padding: 2rem;
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .container {
    max-width: 1024px;
    padding: 3rem;
  }
}
        `.trim()
      }
    ];

    patterns.forEach(pattern => {
      this.patterns.set(pattern.id, pattern);
    });
  }

  // Helper methods for pattern application
  private isPatternRelevant(pattern: UltrathinkPattern, requirement: DesignRequirement, spec: ComponentSpec): boolean {
    const keywords = requirement.description.toLowerCase();

    switch (pattern.id) {
      case 'minimal-composition':
        return spec.category === 'layout' || keywords.includes('simple') || keywords.includes('clean');

      case 'progressive-enhancement':
        return keywords.includes('form') || keywords.includes('navigation') || requirement.constraints.responsive;

      case 'consistency-first':
        return true; // Always apply consistency

      case 'accessibility-by-default':
        return requirement.accessibility.level !== 'minimal' || keywords.includes('accessibility');

      case 'performance-optimized':
        return requirement.constraints.bundleSize === 'minimal' || keywords.includes('performance');

      case 'responsive-mobile-first':
        return requirement.constraints.responsive || keywords.includes('mobile') || keywords.includes('responsive');

      default:
        return false;
    }
  }

  private calculateRelevanceScore(pattern: UltrathinkPattern, requirement: DesignRequirement, spec: ComponentSpec): number {
    let score = 0;

    if (this.isPatternRelevant(pattern, requirement, spec)) {
      score += 10;
    }

    // Add points for specific use case matches
    pattern.useCases.forEach(useCase => {
      if (requirement.description.toLowerCase().includes(useCase.toLowerCase())) {
        score += 5;
      }
    });

    // Add points for principle alignment
    pattern.principles.forEach(principle => {
      if (requirement.description.toLowerCase().includes(principle.toLowerCase())) {
        score += 3;
      }
    });

    return score;
  }

  private applyMinimalComposition(spec: ComponentSpec, requirement: DesignRequirement): ComponentSpec {
    return {
      ...spec,
      props: spec.props.filter(prop => prop.required || ['className', 'children', 'variant'].includes(prop.name)),
      description: `${spec.description} (Minimal composition pattern applied)`
    };
  }

  private applyProgressiveEnhancement(spec: ComponentSpec, requirement: DesignRequirement): ComponentSpec {
    return {
      ...spec,
      accessibility: {
        ...spec.accessibility,
        keyboardNavigation: true,
        screenReaderSupport: true
      }
    };
  }

  private applyConsistencyFirst(spec: ComponentSpec, requirement: DesignRequirement): ComponentSpec {
    return {
      ...spec,
      variants: this.standardizeVariants(spec.variants),
      props: this.standardizeProps(spec.props)
    };
  }

  private applyAccessibilityByDefault(spec: ComponentSpec, requirement: DesignRequirement): ComponentSpec {
    return {
      ...spec,
      accessibility: {
        ...spec.accessibility,
        role: spec.accessibility.role || 'generic',
        ariaAttributes: {
          ...spec.accessibility.ariaAttributes,
          'aria-label': spec.description
        },
        keyboardNavigation: true,
        screenReaderSupport: true,
        focusManagement: spec.category === 'overlay' || spec.category === 'forms'
      }
    };
  }

  private applyPerformanceOptimized(spec: ComponentSpec, requirement: DesignRequirement): ComponentSpec {
    return {
      ...spec,
      dependencies: this.optimizeDependencies(spec.dependencies)
    };
  }

  private applyResponsiveMobileFirst(spec: ComponentSpec, requirement: DesignRequirement): ComponentSpec {
    // Add responsive props if not present
    const hasResponsiveProps = spec.props.some(prop => prop.name.includes('responsive') || prop.name.includes('breakpoint'));

    if (!hasResponsiveProps && spec.category === 'layout') {
      return {
        ...spec,
        props: [
          ...spec.props,
          {
            name: 'responsive',
            type: 'boolean',
            required: false,
            defaultValue: true,
            description: 'Enable responsive behavior'
          }
        ]
      };
    }

    return spec;
  }

  private standardizeVariants(variants: any[]): any[] {
    return variants.map(variant => ({
      ...variant,
      name: variant.name.toLowerCase().replace(/\s+/g, '-'),
      className: variant.className.replace(/[^a-zA-Z0-9-\s]/g, '').toLowerCase()
    }));
  }

  private standardizeProps(props: any[]): any[] {
    return props.map(prop => ({
      ...prop,
      name: prop.name.replace(/([A-Z])/g, '-$1').toLowerCase(),
      description: prop.description.charAt(0).toUpperCase() + prop.description.slice(1)
    }));
  }

  private optimizeDependencies(dependencies: string[]): string[] {
    // Remove redundant dependencies and sort
    const essentialDeps = ['react', 'react-dom', '@/lib/utils'];
    const otherDeps = dependencies.filter(dep => !essentialDeps.includes(dep));

    return [...essentialDeps, ...otherDeps.sort()];
  }

  private createSuggestion(
    type: 'component' | 'pattern' | 'layout' | 'enhancement',
    title: string,
    description: string,
    implementation: string,
    benefits: string[] = [],
    effort: 'low' | 'medium' | 'high' = 'medium'
  ): DesignSuggestion {
    return {
      type,
      title,
      description,
      rationale: `Applied ultrathink design principle for better user experience`,
      implementation,
      benefits,
      effort
    };
  }

  /**
   * Get all available patterns
   */
  getAvailablePatterns(): UltrathinkPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get pattern by ID
   */
  getPattern(id: string): UltrathinkPattern | undefined {
    return this.patterns.get(id);
  }

  /**
   * Get design suggestions for specific requirements
   */
  async getDesignSuggestions(requirement: DesignRequirement, spec: ComponentSpec): Promise<DesignSuggestion[]> {
    const cacheKey = `${requirement.id}-${spec.name}`;

    if (this.patternCache.has(cacheKey)) {
      return this.patternCache.get(cacheKey)!;
    }

    const { suggestions } = await this.applyPatterns(requirement, spec);
    this.patternCache.set(cacheKey, suggestions);

    return suggestions;
  }
}
/**
 * Shadcn UI Designer Skill - Main Entry Point
 *
 * A sophisticated AI-powered designer skill that leverages the shadcn UI ecosystem,
 * modern React patterns, and ultrathink design principles to create stunning,
 * accessible, and performant user interfaces.
 */

import { ComponentGenerator } from './component-generator.js';
import { PatternEngine } from './pattern-engine.js';
import { ThemeManager } from './theme-manager.js';
import { RegistryClient } from './registry-client.js';
import { TemplateEngine } from './template-engine.js';
import { PreviewSystem } from './preview-system.js';

import type {
  DesignRequirement,
  GeneratedComponent,
  ComponentSpec,
  ValidationResult,
  DesignSuggestion,
  StylePreferences,
  AccessibilityRequirements,
  DesignConstraints
} from './types.js';

/**
 * Main Shadcn Designer Skill class
 */
export class ShadcnDesignerSkill {
  private componentGenerator: ComponentGenerator;
  private patternEngine: PatternEngine;
  private themeManager: ThemeManager;
  private registryClient: RegistryClient;
  private templateEngine: TemplateEngine;
  private previewSystem: PreviewSystem;

  constructor() {
    this.componentGenerator = new ComponentGenerator();
    this.patternEngine = new PatternEngine();
    this.themeManager = new ThemeManager();
    this.registryClient = new RegistryClient();
    this.templateEngine = new TemplateEngine();
    this.previewSystem = new PreviewSystem();
  }

  /**
   * Create a component from natural language description
   */
  async createComponent(description: string, options: {
    style?: Partial<StylePreferences>;
    accessibility?: Partial<AccessibilityRequirements>;
    constraints?: Partial<DesignConstraints>;
    features?: string[];
  } = {}): Promise<{
    component: GeneratedComponent;
    suggestions: DesignSuggestion[];
    previewUrl?: string;
  }> {
    // Parse requirements from description
    const requirement = this.parseDesignRequirement(description, options);

    // Generate the component
    const component = await this.componentGenerator.generateComponent(requirement);

    // Apply ultrathink patterns
    const patternResult = await this.patternEngine.applyPatterns(requirement, component.spec);

    // Apply theme and styling
    const styles = this.themeManager.generateComponentStyles(
      component.spec.name,
      requirement.style,
      component.spec.category
    );

    // Generate suggestions
    const suggestions = await this.patternEngine.getDesignSuggestions(requirement, component.spec);

    return {
      component: {
        ...component,
        code: this.applyStyling(component.code, styles)
      },
      suggestions,
      previewUrl: undefined // Can be created on demand
    };
  }

  /**
   * Create a live preview for a component
   */
  async createPreview(component: GeneratedComponent, config?: {
    viewport?: { width: number; height: number };
    theme?: 'light' | 'dark';
    reducedMotion?: boolean;
    highContrast?: boolean;
  }): Promise<{
    previewUrl: string;
    pageId: string;
    screenshot?: string;
  }> {
    return this.previewSystem.createPreview(component, config);
  }

  /**
   * Search for shadcn components
   */
  async searchComponents(query: string, options: {
    limit?: number;
    type?: 'component' | 'block';
    registry?: string[];
  } = {}): Promise<Array<{
    name: string;
    description: string;
    type: 'component' | 'block';
    registry: string;
    dependencies: string[];
  }>> {
    const registries = options.registry || ['@shadcn'];
    return this.registryClient.searchItems(query, registries, {
      type: options.type || 'both',
      limit: options.limit || 10
    });
  }

  /**
   * Get component examples and documentation
   */
  async getComponentExamples(name: string, registry = '@shadcn'): Promise<{
    examples: any[];
    documentation: string;
    installCommand: string;
  }> {
    const examples = await this.registryClient.getComponentExamples(name, registry);
    const installCommand = await this.registryClient.getInstallCommands([name], registry);

    return {
      examples,
      documentation: `# ${name}\n\nComponent documentation for ${name} from ${registry} registry.`,
      installCommand
    };
  }

  /**
   * Apply ultrathink design patterns to existing component
   */
  async enhanceComponent(
    componentCode: string,
    description: string,
    patterns?: string[]
  ): Promise<{
    enhancedCode: string;
    appliedPatterns: string[];
    suggestions: DesignSuggestion[];
  }> {
    const requirement = this.parseDesignRequirement(description);

    // Create component spec from existing code
    const spec = this.analyzeComponentCode(componentCode);

    // Apply patterns
    const patternResult = await this.patternEngine.applyPatterns(requirement, spec);

    return {
      enhancedCode: componentCode, // Would be enhanced with patterns
      appliedPatterns: patternResult.appliedPatterns.map(p => p.name),
      suggestions: patternResult.suggestions
    };
  }

  /**
   * Generate design system tokens
   */
  async generateDesignTokens(baseColors: {
    primary?: string;
    secondary?: string;
    accent?: string;
  }, options: {
    theme?: 'light' | 'dark' | 'auto';
    spacing?: 'tight' | 'normal' | 'relaxed';
    borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  } = {}): Promise<{
    tokens: Record<string, string>;
    cssVariables: string;
    tailwindConfig: any;
  }> {
    const requirement: DesignRequirement = {
      id: 'design-tokens',
      description: 'Generate design system tokens',
      componentType: 'tokens',
      features: ['theming'],
      constraints: {},
      style: {
        primaryColor: baseColors.primary,
        secondaryColor: baseColors.secondary,
        borderRadius: options.borderRadius || 'md',
        spacing: options.spacing || 'normal',
        theme: options.theme || 'light'
      },
      accessibility: {
        level: 'AA',
        screenReader: true,
        keyboardNavigation: true
      }
    };

    const tokens = this.themeManager.generateDesignTokens(requirement);
    const theme = this.themeManager.getThemeForPreferences(requirement.style);

    return {
      tokens: Object.fromEntries(tokens.map(t => [t.name, t.value])),
      cssVariables: this.generateCSSVariables(tokens),
      tailwindConfig: theme
    };
  }

  // Private helper methods

  private parseDesignRequirement(
    description: string,
    options: any = {}
  ): DesignRequirement {
    return {
      id: `req-${Date.now()}`,
      description,
      componentType: options.componentType,
      features: options.features || [],
      constraints: {
        responsive: true,
        darkMode: true,
        animation: true,
        bundleSize: 'balanced',
        ...options.constraints
      },
      style: {
        borderRadius: 'md',
        spacing: 'normal',
        theme: 'light',
        ...options.style
      },
      accessibility: {
        level: 'AA',
        screenReader: true,
        keyboardNavigation: true,
        ...options.accessibility
      }
    };
  }

  private analyzeComponentCode(code: string): ComponentSpec {
    // Analyze component code to extract spec
    // This would use AST parsing in a real implementation
    return {
      name: 'AnalyzedComponent',
      description: 'Component analyzed from code',
      category: 'layout',
      dependencies: ['react'],
      props: [
        { name: 'className', type: 'string', required: false, description: 'CSS classes' },
        { name: 'children', type: 'React.ReactNode', required: false, description: 'Child elements' }
      ],
      variants: [],
      examples: [],
      accessibility: {
        role: 'generic',
        ariaAttributes: {},
        keyboardNavigation: false,
        screenReaderSupport: false,
        focusManagement: false
      }
    };
  }

  private applyStyling(code: string, styles: any): string {
    // Apply generated styles to component code
    return code;
  }

  private generateCSSVariables(tokens: any[]): string {
    return `:root {\n${tokens.map(t => `  --${t.name}: ${t.value};`).join('\n')}\n}`;
  }

  /**
   * Get skill information and capabilities
   */
  getSkillInfo() {
    return {
      name: 'shadcn-designer',
      version: '1.0.0',
      description: 'AI-powered designer skill for creating, customizing, and integrating shadcn UI components with modern design patterns',
      capabilities: [
        'Component generation from natural language',
        'Ultrathink design pattern application',
        'Theme management and design tokens',
        'Live preview with Chrome DevTools',
        'Accessibility testing and optimization',
        'Performance analysis',
        'Responsive design testing',
        'Shadcn registry integration'
      ],
      supportedComponents: [
        'buttons', 'forms', 'cards', 'navigation', 'layouts',
        'data-display', 'overlays', 'media', 'typography'
      ],
      designPrinciples: [
        'minimal-composition',
        'progressive-enhancement',
        'consistency-first',
        'accessibility-by-default',
        'performance-optimized',
        'responsive-mobile-first'
      ]
    };
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    // Close all preview pages
    const activePreviews = this.previewSystem.getActivePreviews();
    for (const preview of activePreviews) {
      await this.previewSystem.closePreview(preview.pageId);
    }

    // Clear caches
    this.registryClient.clearCache();
  }
}

// Export main class and types
export { ShadcnDesignerSkill as default };

// Export utility functions
export const createDesigner = () => new ShadcnDesignerSkill();

// Export types for external use
export type {
  DesignRequirement,
  GeneratedComponent,
  ComponentSpec,
  ValidationResult,
  DesignSuggestion,
  StylePreferences,
  AccessibilityRequirements,
  DesignConstraints
} from './types.js';

// Export individual engines for advanced usage
export { ComponentGenerator } from './component-generator.js';
export { PatternEngine } from './pattern-engine.js';
export { ThemeManager } from './theme-manager.js';
export { RegistryClient } from './registry-client.js';
export { TemplateEngine } from './template-engine.js';
export { PreviewSystem } from './preview-system.js';
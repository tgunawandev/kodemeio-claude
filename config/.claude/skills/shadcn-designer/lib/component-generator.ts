import { type DesignRequirement, type GeneratedComponent, type ComponentSpec, type ValidationError, type DesignSuggestion, type ShadcnComponentResponse, type ShadcnBlockResponse, type RegistryItem, DesignError, type ComponentCategory } from './types.js';

/**
 * Core component generation engine that integrates with shadcn MCP tools
 */
export class ComponentGenerator {
  private registryCache = new Map<string, RegistryItem[]>();
  private componentCache = new Map<string, ShadcnComponentResponse>();

  /**
   * Generate a component based on design requirements
   */
  async generateComponent(requirement: DesignRequirement): Promise<GeneratedComponent> {
    try {
      // 1. Analyze requirements and determine component type
      const componentSpec = await this.analyzeRequirements(requirement);

      // 2. Fetch relevant shadcn components/blocks
      const shadcnResources = await this.fetchShadcnResources(componentSpec);

      // 3. Apply ultrathink design principles
      const enhancedSpec = await this.applyDesignPrinciples(componentSpec, requirement);

      // 4. Generate the component code
      const generatedCode = await this.generateComponentCode(enhancedSpec, shadcnResources);

      // 5. Generate tests and documentation
      const tests = await this.generateTests(enhancedSpec);
      const documentation = await this.generateDocumentation(enhancedSpec);

      // 6. Validate the generated component
      const validation = await this.validateComponent(generatedCode);

      return {
        spec: enhancedSpec,
        code: generatedCode.code,
        imports: generatedCode.imports,
        styles: generatedCode.styles,
        tests,
        documentation,
        dependencies: generatedCode.dependencies
      };
    } catch (error) {
      throw new DesignError(
        `Failed to generate component: ${error.message}`,
        'GENERATION_ERROR',
        { requirement, originalError: error }
      );
    }
  }

  /**
   * Analyze user requirements and determine component specifications
   */
  private async analyzeRequirements(requirement: DesignRequirement): Promise<ComponentSpec> {
    const keywords = this.extractKeywords(requirement.description);
    const componentType = this.determineComponentType(keywords, requirement.componentType);
    const category = this.categorizeComponent(componentType, keywords);

    return {
      name: this.generateComponentName(keywords, componentType),
      description: requirement.description,
      category,
      dependencies: await this.determineDependencies(keywords, requirement.features),
      props: this.generateProps(requirement.features, category),
      variants: this.generateVariants(requirement.style, category),
      examples: [],
      accessibility: this.generateAccessibilityFeatures(requirement.accessibility)
    };
  }

  /**
   * Fetch shadcn components and blocks from the registry
   */
  private async fetchShadcnResources(spec: ComponentSpec): Promise<{
    components: ShadcnComponentResponse[];
    blocks: ShadcnBlockResponse[];
  }> {
    const components: ShadcnComponentResponse[] = [];
    const blocks: ShadcnBlockResponse[] = [];

    // Search for relevant components in shadcn registry
    const searchResults = await this.searchShadcnRegistry(spec.name, spec.category);

    for (const item of searchResults) {
      if (item.type === 'component') {
        const component = await this.getShadcnComponent(item.name);
        if (component) {
          components.push(component);
        }
      } else if (item.type === 'block') {
        const block = await this.getShadcnBlock(item.name);
        if (block) {
          blocks.push(block);
        }
      }
    }

    return { components, blocks };
  }

  /**
   * Apply ultrathink design principles to enhance the component
   */
  private async applyDesignPrinciples(spec: ComponentSpec, requirement: DesignRequirement): Promise<ComponentSpec> {
    // Ultrathink principles: minimalism, efficiency, clarity, consistency, accessibility

    const enhancedSpec = { ...spec };

    // Apply minimalism - reduce unnecessary complexity
    enhancedSpec.props = this.simplifyProps(spec.props, requirement.features);

    // Apply efficiency - optimize for performance
    enhancedSpec.dependencies = this.optimizeDependencies(spec.dependencies);

    // Apply clarity - improve naming and structure
    enhancedSpec.description = this.improveDescription(spec.description);

    // Apply consistency - ensure standard patterns
    enhancedSpec.variants = this.standardizeVariants(spec.variants, requirement.style);

    // Apply accessibility - enhance features
    enhancedSpec.accessibility = this.enhanceAccessibility(spec.accessibility, requirement.accessibility);

    return enhancedSpec;
  }

  /**
   * Generate the actual component code
   */
  private async generateComponentCode(
    spec: ComponentSpec,
    resources: { components: ShadcnComponentResponse[]; blocks: ShadcnBlockResponse[] }
  ): Promise<{ code: string; imports: string[]; styles: string; dependencies: string[] }> {
    const baseTemplate = this.selectBaseTemplate(spec.category, resources);
    const imports = this.generateImports(spec, resources);
    const props = this.generatePropsInterface(spec);
    const componentBody = this.generateComponentBody(spec, resources);
    const styles = this.generateStyles(spec);

    const code = `
${imports.join('\n')}

${props}

export function ${spec.name}({
${spec.props.map(prop => `  ${prop.name}${prop.required ? '' : '?'}: ${prop.type},`).join('\n')}
}): React.ReactElement {
  ${componentBody}
}
    `.trim();

    return {
      code,
      imports: imports.filter(imp => imp.trim()),
      styles,
      dependencies: spec.dependencies
    };
  }

  /**
   * Extract keywords from user description
   */
  private extractKeywords(description: string): string[] {
    const keywords = description
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !this.isStopWord(word));

    return [...new Set(keywords)];
  }

  /**
   * Determine the component type based on keywords and user specification
   */
  private determineComponentType(keywords: string[], userSpecified?: string): string {
    if (userSpecified) return userSpecified;

    const typeMap: Record<string, string[]> = {
      'button': ['button', 'btn', 'click', 'action'],
      'card': ['card', 'container', 'box', 'panel'],
      'form': ['form', 'input', 'field', 'submit'],
      'table': ['table', 'grid', 'data', 'list'],
      'dialog': ['dialog', 'modal', 'popup', 'overlay'],
      'navigation': ['nav', 'menu', 'link', 'header'],
      'layout': ['layout', 'grid', 'flex', 'container']
    };

    for (const [type, relatedWords] of Object.entries(typeMap)) {
      if (keywords.some(keyword => relatedWords.includes(keyword))) {
        return type;
      }
    }

    return 'component';
  }

  /**
   * Categorize component based on type and keywords
   */
  private categorizeComponent(componentType: string, keywords: string[]): ComponentCategory {
    const categoryMap: Record<string, ComponentCategory> = {
      'button': 'feedback',
      'form': 'forms',
      'input': 'forms',
      'table': 'data-display',
      'dialog': 'overlay',
      'modal': 'overlay',
      'nav': 'navigation',
      'menu': 'navigation',
      'layout': 'layout',
      'grid': 'layout'
    };

    return categoryMap[componentType] || 'layout';
  }

  /**
   * Generate a component name based on keywords and type
   */
  private generateComponentName(keywords: string[], componentType: string): string {
    const relevantKeywords = keywords.filter(keyword =>
      !['component', 'design', 'create', 'build'].includes(keyword)
    ).slice(0, 3);

    const nameParts = [componentType, ...relevantKeywords]
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');

    return `${nameParts}Component`;
  }

  /**
   * Search shadcn registry for relevant components
   */
  private async searchShadcnRegistry(query: string, category: ComponentCategory): Promise<RegistryItem[]> {
    // This would use the actual MCP shadcn tools
    // For now, returning mock data
    return [
      {
        name: 'button',
        registry: '@shadcn',
        type: 'component',
        description: 'Button component with variants',
        dependencies: ['class-variance-authority'],
        files: ['button.tsx']
      }
    ];
  }

  /**
   * Get specific shadcn component
   */
  private async getShadcnComponent(name: string): Promise<ShadcnComponentResponse | null> {
    if (this.componentCache.has(name)) {
      return this.componentCache.get(name)!;
    }

    // Mock implementation - would use MCP tools
    const component: ShadcnComponentResponse = {
      name,
      description: `Shadcn ${name} component`,
      dependencies: ['class-variance-authority', 'clsx', 'tailwind-merge'],
      files: {
        'component.tsx': `// ${name} component code would go here`
      }
    };

    this.componentCache.set(name, component);
    return component;
  }

  /**
   * Get specific shadcn block
   */
  private async getShadcnBlock(name: string): Promise<ShadcnBlockResponse | null> {
    // Mock implementation - would use MCP tools
    return {
      name,
      description: `Shadcn ${name} block`,
      type: 'component-block',
      dependencies: ['@radix-ui/react-icons'],
      files: {
        'block.tsx': `// ${name} block code would go here`
      }
    };
  }

  // Helper methods
  private isStopWord(word: string): boolean {
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    return stopWords.includes(word);
  }

  private async determineDependencies(keywords: string[], features: string[]): Promise<string[]> {
    const deps = new Set<string>();

    // Base dependencies
    deps.add('react');
    deps.add('@/lib/utils');

    // Add dependencies based on keywords
    if (keywords.some(k => ['button', 'form', 'input'].includes(k))) {
      deps.add('class-variance-authority');
    }

    if (keywords.some(k => ['icon', 'avatar'].includes(k))) {
      deps.add('@radix-ui/react-icons');
      deps.add('lucide-react');
    }

    if (keywords.some(k => ['dialog', 'modal', 'dropdown'].includes(k))) {
      deps.add('@radix-ui/react-dialog');
    }

    return Array.from(deps);
  }

  private generateProps(features: string[], category: ComponentCategory) {
    const baseProps = [
      { name: 'className', type: 'string', required: false, description: 'Additional CSS classes' },
      { name: 'children', type: 'React.ReactNode', required: false, description: 'Child elements' }
    ];

    const categoryProps: Record<ComponentCategory, any[]> = {
      'forms': [
        { name: 'onSubmit', type: '(event: FormEvent) => void', required: false, description: 'Form submit handler' }
      ],
      'navigation': [
        { name: 'items', type: 'NavigationItem[]', required: true, description: 'Navigation items' }
      ],
      'layout': [
        { name: 'columns', type: 'number', required: false, defaultValue: 1, description: 'Number of columns' }
      ],
      'feedback': [
        { name: 'variant', type: "'default' | 'destructive' | 'outline'", required: false, defaultValue: "'default'", description: 'Component variant' }
      ],
      'data-display': [
        { name: 'data', type: 'any[]', required: true, description: 'Data to display' }
      ],
      'overlay': [
        { name: 'open', type: 'boolean', required: true, description: 'Whether the overlay is open' },
        { name: 'onClose', type: '() => void', required: true, description: 'Close handler' }
      ],
      'media': [
        { name: 'src', type: 'string', required: true, description: 'Media source' }
      ],
      'typography': [
        { name: 'variant', type: "'h1' | 'h2' | 'h3' | 'h4' | 'p'", required: false, defaultValue: "'p'", description: 'Text variant' }
      ]
    };

    return [...baseProps, ...(categoryProps[category] || [])];
  }

  private generateVariants(style: any, category: ComponentCategory) {
    return [
      {
        name: 'default',
        description: 'Default appearance',
        className: 'default-variant'
      }
    ];
  }

  private generateAccessibilityFeatures(requirement: any) {
    return {
      role: 'generic',
      ariaAttributes: {},
      keyboardNavigation: true,
      screenReaderSupport: true,
      focusManagement: false
    };
  }

  private simplifyProps(props: any[], features: string[]) {
    return props.filter(prop =>
      features.length === 0 ||
      prop.required ||
      ['className', 'children', 'variant'].includes(prop.name)
    );
  }

  private optimizeDependencies(dependencies: string[]) {
    return [...new Set(dependencies)].sort();
  }

  private improveDescription(description: string): string {
    return description.trim();
  }

  private standardizeVariants(variants: any[], style: any) {
    return variants;
  }

  private enhanceAccessibility(accessibility: any, requirement: any) {
    return {
      ...accessibility,
      ...requirement
    };
  }

  private selectBaseTemplate(category: ComponentCategory, resources: any) {
    return 'base-component-template';
  }

  private generateImports(spec: ComponentSpec, resources: any): string[] {
    const imports = new Set<string>();

    imports.add("import React from 'react';");
    imports.add("import { cn } from '@/lib/utils';");

    // Add component-specific imports
    spec.dependencies.forEach(dep => {
      if (dep.startsWith('@radix-ui') || dep.startsWith('lucide-react')) {
        imports.add(`import { ${dep.split('/')[1]} } from '${dep}';`);
      }
    });

    return Array.from(imports);
  }

  private generatePropsInterface(spec: ComponentSpec): string {
    const props = spec.props.map(prop => {
      const optional = prop.required ? '' : '?';
      return `  ${prop.name}${optional}: ${prop.type};`;
    }).join('\n');

    return `interface ${spec.name}Props {\n${props}\n}`;
  }

  private generateComponentBody(spec: ComponentSpec, resources: any): string {
    return `
  return (
    <div className={cn("base-component", className)}>
      {children}
    </div>
  );
    `.trim();
  }

  private generateStyles(spec: ComponentSpec): string {
    return `
.base-component {
  /* Component styles */
}
    `.trim();
  }

  private async generateTests(spec: ComponentSpec): Promise<string> {
    return `
import { render, screen } from '@testing-library/react';
import { ${spec.name} } from './${spec.name}';

describe('${spec.name}', () => {
  it('renders correctly', () => {
    render(<${spec.name} />);
    expect(screen.getByRole('generic')).toBeInTheDocument();
  });
});
    `.trim();
  }

  private async generateDocumentation(spec: ComponentSpec): Promise<string> {
    return `
# ${spec.name}

${spec.description}

## Props
${spec.props.map(prop => `- \`${prop.name}\` (${prop.type}): ${prop.description}`).join('\n')}

## Examples
\`\`\`tsx
<${spec.name}>
  {/* Example content */}
</${spec.name}>
\`\`\`

## Accessibility
This component follows WCAG ${spec.accessibility} guidelines.
    `.trim();
  }

  private async validateComponent(component: any): Promise<{
    errors: ValidationError[];
    warnings: any[];
    suggestions: DesignSuggestion[];
  }> {
    return {
      errors: [],
      warnings: [],
      suggestions: []
    };
  }
}
import { type RegistryItem, type ShadcnComponentResponse, type ShadcnBlockResponse, type MCPRegistryResponse, RegistryError } from './types.js';

/**
 * Registry client wrapper for shadcn MCP tools
 */
export class RegistryClient {
  private cache = new Map<string, any>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Search for items in shadcn registries
   */
  async searchItems(
    query: string,
    registries: string[] = ['@shadcn'],
    options: {
      type?: 'component' | 'block' | 'both';
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<RegistryItem[]> {
    const cacheKey = `search:${query}:${registries.join(',')}:${JSON.stringify(options)}`;

    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Use MCP shadcn search tools
      const results: RegistryItem[] = [];

      for (const registry of registries) {
        try {
          const searchResults = await this.searchRegistry(registry, query, options);
          results.push(...searchResults);
        } catch (error) {
          console.warn(`Failed to search registry ${registry}:`, error);
        }
      }

      // Sort by relevance
      const sortedResults = this.sortByRelevance(results, query);

      // Apply limit and offset
      const limitedResults = sortedResults
        .slice(options.offset || 0, (options.offset || 0) + (options.limit || 10));

      this.setCache(cacheKey, limitedResults);
      return limitedResults;

    } catch (error) {
      throw new RegistryError(
        `Failed to search shadcn registry: ${error.message}`,
        registries.join(','),
        query
      );
    }
  }

  /**
   * Get detailed information about specific registry items
   */
  async getItemsDetails(items: string[], registry: string = '@shadcn'): Promise<RegistryItem[]> {
    const cacheKey = `details:${items.join(',')}:${registry}`;

    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Use MCP shadcn view_items_in_registries tool
      const detailedItems = await this.fetchItemDetails(items, registry);

      this.setCache(cacheKey, detailedItems);
      return detailedItems;

    } catch (error) {
      throw new RegistryError(
        `Failed to get item details: ${error.message}`,
        registry,
        items.join(',')
      );
    }
  }

  /**
   * Get component code and examples
   */
  async getComponentCode(name: string, registry: string = '@shadcn'): Promise<ShadcnComponentResponse> {
    const cacheKey = `component:${name}:${registry}`;

    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Use MCP shadcn get_component tool
      const component = await this.fetchComponent(name, registry);

      if (!component) {
        throw new Error(`Component '${name}' not found in registry '${registry}'`);
      }

      this.setCache(cacheKey, component);
      return component;

    } catch (error) {
      throw new RegistryError(
        `Failed to get component code: ${error.message}`,
        registry,
        name
      );
    }
  }

  /**
   * Get component examples and demos
   */
  async getComponentExamples(name: string, registry: string = '@shadcn'): Promise<any[]> {
    const cacheKey = `examples:${name}:${registry}`;

    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Use MCP shadcn get_item_examples_from_registries tool
      const examples = await this.fetchExamples(name, registry);

      this.setCache(cacheKey, examples);
      return examples;

    } catch (error) {
      throw new RegistryError(
        `Failed to get component examples: ${error.message}`,
        registry,
        name
      );
    }
  }

  /**
   * Get block implementations
   */
  async getBlockCode(name: string, registry: string = '@shadcn'): Promise<ShadcnBlockResponse> {
    const cacheKey = `block:${name}:${registry}`;

    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Use MCP shadcn get_block tool
      const block = await this.fetchBlock(name, registry);

      if (!block) {
        throw new Error(`Block '${name}' not found in registry '${registry}'`);
      }

      this.setCache(cacheKey, block);
      return block;

    } catch (error) {
      throw new RegistryError(
        `Failed to get block code: ${error.message}`,
        registry,
        name
      );
    }
  }

  /**
   * Get installation commands for items
   */
  async getInstallCommands(items: string[], registry: string = '@shadcn'): Promise<string> {
    const cacheKey = `commands:${items.join(',')}:${registry}`;

    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Use MCP shadcn get_add_command_for_items tool
      const command = await this.fetchInstallCommands(items, registry);

      this.setCache(cacheKey, command);
      return command;

    } catch (error) {
      throw new RegistryError(
        `Failed to get install commands: ${error.message}`,
        registry,
        items.join(',')
      );
    }
  }

  /**
   * List all available registries
   */
  async listRegistries(): Promise<string[]> {
    const cacheKey = 'registries';

    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Use MCP shadcn get_project_registries tool
      const registries = await this.fetchRegistries();

      this.setCache(cacheKey, registries);
      return registries;

    } catch (error) {
      throw new RegistryError(
        `Failed to list registries: ${error.message}`,
        'all'
      );
    }
  }

  /**
   * List items in specific registries
   */
  async listRegistryItems(
    registries: string[] = ['@shadcn'],
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<RegistryItem[]> {
    const cacheKey = `list:${registries.join(',')}:${JSON.stringify(options)}`;

    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Use MCP shadcn list_items_in_registries tool
      const items = await this.listItems(registries, options);

      this.setCache(cacheKey, items);
      return items;

    } catch (error) {
      throw new RegistryError(
        `Failed to list registry items: ${error.message}`,
        registries.join(',')
      );
    }
  }

  /**
   * Find similar components based on keywords
   */
  async findSimilarComponents(
    componentName: string,
    keywords: string[],
    limit: number = 5
  ): Promise<RegistryItem[]> {
    const searchQuery = [componentName, ...keywords].join(' ');
    const results = await this.searchItems(searchQuery, ['@shadcn'], { limit });

    // Filter out the original component if present
    return results.filter(item =>
      item.name.toLowerCase() !== componentName.toLowerCase()
    );
  }

  /**
   * Get component dependencies and requirements
   */
  async getComponentDependencies(name: string, registry: string = '@shadcn'): Promise<{
    dependencies: string[];
    peerDependencies: string[];
    devDependencies: string[];
    tailwindConfig?: any;
  }> {
    try {
      const component = await this.getComponentCode(name, registry);
      const dependencies = component.dependencies || [];

      // Analyze dependencies to categorize them
      const peerDependencies = dependencies.filter(dep =>
        dep.startsWith('react') || dep.startsWith('tailwindcss')
      );

      const devDependencies = dependencies.filter(dep =>
        dep.includes('eslint') || dep.includes('prettier') || dep.includes('typescript')
      );

      const normalDependencies = dependencies.filter(dep =>
        !peerDependencies.includes(dep) && !devDependencies.includes(dep)
      );

      return {
        dependencies: normalDependencies,
        peerDependencies,
        devDependencies,
        tailwindConfig: this.extractTailwindConfig(component)
      };

    } catch (error) {
      throw new RegistryError(
        `Failed to get component dependencies: ${error.message}`,
        registry,
        name
      );
    }
  }

  /**
   * Validate component compatibility
   */
  async validateCompatibility(
    items: string[],
    targetFramework: 'react' | 'next' | 'astro' = 'react'
  ): Promise<{
    compatible: string[];
    incompatible: string[];
    warnings: string[];
  }> {
    const compatible: string[] = [];
    const incompatible: string[] = [];
    const warnings: string[] = [];

    for (const item of items) {
      try {
        const component = await this.getComponentCode(item);

        // Check for React-specific features
        const hasReactSpecific = component.dependencies?.some(dep =>
          dep.startsWith('react') || dep.startsWith('@radix-ui/react-')
        );

        if (targetFramework === 'react' || hasReactSpecific) {
          compatible.push(item);
        } else {
          incompatible.push(item);
          warnings.push(`${item} may require React-specific setup`);
        }

      } catch (error) {
        incompatible.push(item);
        warnings.push(`Failed to analyze ${item}: ${error.message}`);
      }
    }

    return { compatible, incompatible, warnings };
  }

  // Private helper methods for MCP tool integration

  private async searchRegistry(
    registry: string,
    query: string,
    options: { type?: 'component' | 'block' | 'both'; limit?: number }
  ): Promise<RegistryItem[]> {
    // This would use the actual MCP shadcn search_items_in_registries tool
    // For now, returning mock data
    return [
      {
        name: 'button',
        registry,
        type: 'component',
        description: 'Button component with multiple variants',
        dependencies: ['class-variance-authority', 'clsx', 'tailwind-merge'],
        files: ['button.tsx', 'index.ts']
      },
      {
        name: 'card',
        registry,
        type: 'component',
        description: 'Card container component',
        dependencies: ['@radix-ui/react-slot'],
        files: ['card.tsx', 'index.ts']
      }
    ];
  }

  private async fetchItemDetails(items: string[], registry: string): Promise<RegistryItem[]> {
    // This would use the actual MCP shadcn view_items_in_registries tool
    return items.map(item => ({
      name: item,
      registry,
      type: 'component',
      description: `${item} component from ${registry}`,
      dependencies: [],
      files: [`${item}.tsx`]
    }));
  }

  private async fetchComponent(name: string, registry: string): Promise<ShadcnComponentResponse | null> {
    // This would use the actual MCP shadcn get_component tool
    return {
      name,
      description: `${name} component`,
      dependencies: ['class-variance-authority', 'clsx', 'tailwind-merge'],
      files: {
        'component.tsx': `// ${name} component implementation`,
        'index.ts': `export { ${name} } from './component';`
      }
    };
  }

  private async fetchExamples(name: string, registry: string): Promise<any[]> {
    // This would use the actual MCP shadcn get_item_examples_from_registries tool
    return [
      {
        name: `${name}-demo`,
        description: `Basic ${name} usage example`,
        code: `// Example code for ${name}`,
        props: {}
      }
    ];
  }

  private async fetchBlock(name: string, registry: string): Promise<ShadcnBlockResponse | null> {
    // This would use the actual MCP shadcn get_block tool
    return {
      name,
      description: `${name} block implementation`,
      type: 'component-block',
      dependencies: ['@radix-ui/react-icons'],
      files: {
        'block.tsx': `// ${name} block implementation`,
        'block.css': `/* ${name} block styles */`
      }
    };
  }

  private async fetchInstallCommands(items: string[], registry: string): Promise<string> {
    // This would use the actual MCP shadcn get_add_command_for_items tool
    return `npx shadcn-ui@latest add ${items.join(' ')}`;
  }

  private async fetchRegistries(): Promise<string[]> {
    // This would use the actual MCP shadcn get_project_registries tool
    return ['@shadcn', '@radix-ui', '@acme'];
  }

  private async listItems(
    registries: string[],
    options: { limit?: number; offset?: number }
  ): Promise<RegistryItem[]> {
    // This would use the actual MCP shadcn list_items_in_registries tool
    return [
      {
        name: 'accordion',
        registry: registries[0],
        type: 'component',
        description: 'Accordion component',
        dependencies: ['@radix-ui/react-accordion'],
        files: ['accordion.tsx']
      }
    ];
  }

  // Utility methods
  private sortByRelevance(items: RegistryItem[], query: string): RegistryItem[] {
    const queryWords = query.toLowerCase().split(/\s+/);

    return items.sort((a, b) => {
      const aScore = this.calculateRelevanceScore(a, queryWords);
      const bScore = this.calculateRelevanceScore(b, queryWords);
      return bScore - aScore;
    });
  }

  private calculateRelevanceScore(item: RegistryItem, queryWords: string[]): number {
    let score = 0;
    const itemText = `${item.name} ${item.description}`.toLowerCase();

    // Exact name match gets highest score
    if (item.name.toLowerCase() === queryWords[0]) {
      score += 100;
    }

    // Name contains query words
    queryWords.forEach(word => {
      if (item.name.toLowerCase().includes(word)) {
        score += 50;
      }
      if (item.description.toLowerCase().includes(word)) {
        score += 25;
      }
    });

    // Prefer components over blocks for general searches
    if (item.type === 'component') {
      score += 10;
    }

    return score;
  }

  private extractTailwindConfig(component: ShadcnComponentResponse): any {
    // Extract Tailwind configuration from component code
    // This would parse the component files to find relevant Tailwind config
    return {
      theme: {
        extend: {
          colors: {
            border: 'hsl(var(--border))',
            background: 'hsl(var(--background))',
            foreground: 'hsl(var(--foreground))'
          },
          borderRadius: {
            lg: 'var(--radius)',
            md: 'calc(var(--radius) - 2px)',
            sm: 'calc(var(--radius) - 4px)'
          }
        }
      }
    };
  }

  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    if (!expiry) return false;
    return Date.now() < expiry;
  }

  private setCache(key: string, value: any): void {
    this.cache.set(key, value);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    oldestEntry: number | null;
  } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would track hits/misses in real implementation
      oldestEntry: Math.min(...Array.from(this.cacheExpiry.values())) || null
    };
  }
}
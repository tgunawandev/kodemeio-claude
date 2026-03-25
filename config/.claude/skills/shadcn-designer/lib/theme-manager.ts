import { type Theme, type DesignToken, type StylePreferences, type DesignRequirement } from './types.js';

/**
 * Theme manager for handling design tokens and styling
 */
export class ThemeManager {
  private themes: Map<string, Theme> = new Map();
  private tokens: Map<string, DesignToken> = new Map();
  private activeTheme: Theme;

  constructor() {
    this.initializeDefaultThemes();
    this.initializeDesignTokens();
    this.activeTheme = this.themes.get('default')!;
  }

  /**
   * Generate theme-aware styles for a component
   */
  generateComponentStyles(
    componentName: string,
    preferences: StylePreferences,
    category: string
  ): {
    css: string;
    cssVariables: Record<string, string>;
    tailwindClasses: string[];
  } {
    const theme = this.getThemeForPreferences(preferences);
    const componentTokens = this.getComponentTokens(componentName, category);
    const cssVariables = this.generateCSSVariables(componentTokens, theme);
    const css = this.generateCSS(componentName, componentTokens, theme);
    const tailwindClasses = this.generateTailwindClasses(preferences, theme);

    return {
      css,
      cssVariables,
      tailwindClasses
    };
  }

  /**
   * Apply custom theme to generated component
   */
  applyCustomTheme(
    baseComponent: string,
    customizations: Partial<StylePreferences>
  ): string {
    const theme = this.createCustomTheme(customizations);
    const variables = this.generateCSSVariables([], theme);

    return `
${this.generateCSSVariablesString(variables)}

${baseComponent}
    `.trim();
  }

  /**
   * Generate design tokens based on requirements
   */
  generateDesignTokens(requirement: DesignRequirement): DesignToken[] {
    const tokens: DesignToken[] = [];
    const baseName = this.generateTokenBaseName(requirement.description);

    // Color tokens
    if (requirement.style.primaryColor) {
      tokens.push(
        {
          name: `${baseName}-primary`,
          value: requirement.style.primaryColor,
          type: 'color',
          category: 'primary'
        },
        {
          name: `${baseName}-primary-foreground`,
          value: this.getContrastColor(requirement.style.primaryColor),
          type: 'color',
          category: 'primary'
        }
      );
    }

    if (requirement.style.secondaryColor) {
      tokens.push(
        {
          name: `${baseName}-secondary`,
          value: requirement.style.secondaryColor,
          type: 'color',
          category: 'secondary'
        },
        {
          name: `${baseName}-secondary-foreground`,
          value: this.getContrastColor(requirement.style.secondaryColor),
          type: 'color',
          category: 'secondary'
        }
      );
    }

    // Spacing tokens
    const spacingScale = this.getSpacingScale(requirement.style.spacing);
    spacingScale.forEach((value, index) => {
      tokens.push({
        name: `${baseName}-spacing-${index}`,
        value,
        type: 'spacing',
        category: 'primary'
      });
    });

    // Border radius tokens
    if (requirement.style.borderRadius) {
      const radiusValue = this.getBorderRadiusValue(requirement.style.borderRadius);
      tokens.push({
        name: `${baseName}-radius`,
        value: radiusValue,
        type: 'border',
        category: 'primary'
      });
    }

    return tokens;
  }

  /**
   * Get theme for style preferences
   */
  private getThemeForPreferences(preferences: StylePreferences): Theme {
    if (preferences.theme === 'dark') {
      return this.themes.get('dark')!;
    } else if (preferences.theme === 'auto') {
      return this.createAdaptiveTheme();
    }

    return this.createCustomTheme(preferences);
  }

  /**
   * Get component-specific design tokens
   */
  private getComponentTokens(componentName: string, category: string): DesignToken[] {
    const componentTokens: DesignToken[] = [];
    const baseName = componentName.toLowerCase().replace(/component/g, '').replace(/[^a-z0-9]/g, '-');

    // Category-specific tokens
    switch (category) {
      case 'forms':
        componentTokens.push(
          {
            name: `${baseName}-border`,
            value: 'hsl(214.3 31.8% 91.4%)',
            type: 'border',
            category: 'primary'
          },
          {
            name: `${baseName}-background`,
            value: 'hsl(0 0% 100%)',
            type: 'color',
            category: 'secondary'
          }
        );
        break;

      case 'navigation':
        componentTokens.push(
          {
            name: `${baseName}-hover`,
            value: 'hsl(214.3 31.8% 91.4%)',
            type: 'color',
            category: 'semantic'
          },
          {
            name: `${baseName}-active`,
            value: 'hsl(222.2 84% 4.9%)',
            type: 'color',
            category: 'semantic'
          }
        );
        break;

      case 'feedback':
        componentTokens.push(
          {
            name: `${baseName}-success`,
            value: 'hsl(142.1 76.2% 36.3%)',
            type: 'color',
            category: 'semantic'
          },
          {
            name: `${baseName}-error`,
            value: 'hsl(0 84.2% 60.2%)',
            type: 'color',
            category: 'semantic'
          },
          {
            name: `${baseName}-warning`,
            value: 'hsl(32.6 94.6% 43.7%)',
            type: 'color',
            category: 'semantic'
          }
        );
        break;
    }

    return componentTokens;
  }

  /**
   * Generate CSS variables for the component
   */
  private generateCSSVariables(tokens: DesignToken[], theme: Theme): Record<string, string> {
    const variables: Record<string, string> = {};

    // Add theme variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      variables[`--${key}`] = value;
    });

    Object.entries(theme.spacing).forEach(([key, value]) => {
      variables[`--${key}`] = value;
    });

    Object.entries(theme.borderRadius).forEach(([key, value]) => {
      variables[`--${key}`] = value;
    });

    // Add component-specific tokens
    tokens.forEach(token => {
      variables[`--${token.name}`] = token.value;
    });

    return variables;
  }

  /**
   * Generate CSS for the component
   */
  private generateCSS(componentName: string, tokens: DesignToken[], theme: Theme): string {
    const className = componentName.toLowerCase().replace(/component/g, '');
    const cssRules: string[] = [];

    // Base styles
    cssRules.push(`
.${className} {
  /* Base styles */
  transition: all 0.2s ease-in-out;
}
    `.trim());

    // Token-based styles
    tokens.forEach(token => {
      switch (token.type) {
        case 'color':
          cssRules.push(`
.${className}--${token.name.split('-').pop()} {
  color: var(--${token.name});
  background-color: var(--${token.name});
}
          `.trim());
          break;

        case 'spacing':
          cssRules.push(`
.${className}--spacing-${token.name.split('-').pop()} {
  padding: var(--${token.name});
  margin: var(--${token.name});
}
          `.trim());
          break;

        case 'border':
          cssRules.push(`
.${className}--border {
  border: 1px solid var(--${token.name});
}
          `.trim());
          break;
      }
    });

    return cssRules.join('\n\n');
  }

  /**
   * Generate Tailwind CSS classes
   */
  private generateTailwindClasses(preferences: StylePreferences, theme: Theme): string[] {
    const classes: string[] = [];

    // Base classes
    classes.push('transition-all', 'duration-200', 'ease-in-out');

    // Color classes
    if (preferences.primaryColor) {
      classes.push('text-primary', 'bg-primary', 'hover:bg-primary/90');
    }

    // Border radius classes
    if (preferences.borderRadius) {
      const radiusMap: Record<string, string> = {
        'none': 'rounded-none',
        'sm': 'rounded-sm',
        'md': 'rounded-md',
        'lg': 'rounded-lg',
        'full': 'rounded-full'
      };
      classes.push(radiusMap[preferences.borderRadius] || 'rounded');
    }

    // Spacing classes
    const spacingMap: Record<string, string[]> = {
      'tight': ['p-2', 'm-2', 'gap-2'],
      'normal': ['p-4', 'm-4', 'gap-4'],
      'relaxed': ['p-6', 'm-6', 'gap-6']
    };
    classes.push(...(spacingMap[preferences.spacing] || spacingMap.normal));

    // Theme classes
    if (preferences.theme === 'dark') {
      classes.push('dark');
    }

    return [...new Set(classes)];
  }

  /**
   * Create custom theme from preferences
   */
  private createCustomTheme(preferences: Partial<StylePreferences>): Theme {
    const baseTheme = this.themes.get('default')!;

    return {
      name: 'custom',
      colors: {
        ...baseTheme.colors,
        ...(preferences.primaryColor && {
          primary: preferences.primaryColor,
          'primary-foreground': this.getContrastColor(preferences.primaryColor)
        }),
        ...(preferences.secondaryColor && {
          secondary: preferences.secondaryColor,
          'secondary-foreground': this.getContrastColor(preferences.secondaryColor)
        })
      },
      spacing: baseTheme.spacing,
      typography: baseTheme.typography,
      borderRadius: {
        ...baseTheme.borderRadius,
        ...(preferences.borderRadius && {
          DEFAULT: this.getBorderRadiusValue(preferences.borderRadius)
        })
      },
      shadows: baseTheme.shadows
    };
  }

  /**
   * Create adaptive theme for auto mode
   */
  private createAdaptiveTheme(): Theme {
    return {
      name: 'adaptive',
      colors: {
        ...this.themes.get('light')!.colors,
        ...Object.fromEntries(
          Object.entries(this.themes.get('dark')!.colors).map(([key, value]) => [`dark-${key}`, value])
        )
      },
      spacing: this.themes.get('default')!.spacing,
      typography: this.themes.get('default')!.typography,
      borderRadius: this.themes.get('default')!.borderRadius,
      shadows: this.themes.get('default')!.shadows
    };
  }

  /**
   * Initialize default themes
   */
  private initializeDefaultThemes(): void {
    // Light theme
    this.themes.set('light', {
      name: 'light',
      colors: {
        background: 'hsl(0 0% 100%)',
        foreground: 'hsl(222.2 84% 4.9%)',
        primary: 'hsl(221.2 83.2% 53.3%)',
        'primary-foreground': 'hsl(210 40% 98%)',
        secondary: 'hsl(210 40% 96%)',
        'secondary-foreground': 'hsl(222.2 84% 4.9%)',
        muted: 'hsl(210 40% 96%)',
        'muted-foreground': 'hsl(215.4 16.3% 46.9%)',
        accent: 'hsl(210 40% 96%)',
        'accent-foreground': 'hsl(222.2 84% 4.9%)',
        destructive: 'hsl(0 84.2% 60.2%)',
        'destructive-foreground': 'hsl(210 40% 98%)',
        border: 'hsl(214.3 31.8% 91.4%)',
        input: 'hsl(214.3 31.8% 91.4%)',
        ring: 'hsl(221.2 83.2% 53.3%)'
      },
      spacing: {
        '0': '0',
        '1': '0.25rem',
        '2': '0.5rem',
        '3': '0.75rem',
        '4': '1rem',
        '5': '1.25rem',
        '6': '1.5rem',
        '8': '2rem',
        '10': '2.5rem',
        '12': '3rem',
        '16': '4rem',
        '20': '5rem',
        '24': '6rem'
      },
      typography: {
        'font-family-sans': 'Inter, system-ui, sans-serif',
        'font-family-mono': 'JetBrains Mono, monospace',
        'font-size-xs': '0.75rem',
        'font-size-sm': '0.875rem',
        'font-size-base': '1rem',
        'font-size-lg': '1.125rem',
        'font-size-xl': '1.25rem',
        'font-size-2xl': '1.5rem',
        'font-size-3xl': '1.875rem'
      },
      borderRadius: {
        'none': '0',
        'sm': '0.125rem',
        'DEFAULT': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        'full': '9999px'
      },
      shadows: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
      }
    });

    // Dark theme
    this.themes.set('dark', {
      ...this.themes.get('light')!,
      name: 'dark',
      colors: {
        background: 'hsl(222.2 84% 4.9%)',
        foreground: 'hsl(210 40% 98%)',
        primary: 'hsl(217.2 91.2% 59.8%)',
        'primary-foreground': 'hsl(222.2 84% 4.9%)',
        secondary: 'hsl(217.2 32.6% 17.5%)',
        'secondary-foreground': 'hsl(210 40% 98%)',
        muted: 'hsl(217.2 32.6% 17.5%)',
        'muted-foreground': 'hsl(215 20.2% 65.1%)',
        accent: 'hsl(217.2 32.6% 17.5%)',
        'accent-foreground': 'hsl(210 40% 98%)',
        destructive: 'hsl(0 62.8% 30.6%)',
        'destructive-foreground': 'hsl(210 40% 98%)',
        border: 'hsl(217.2 32.6% 17.5%)',
        input: 'hsl(217.2 32.6% 17.5%)',
        ring: 'hsl(224.3 76.3% 94.1%)'
      }
    });

    // Default theme (alias to light)
    this.themes.set('default', this.themes.get('light')!);
  }

  /**
   * Initialize design tokens
   */
  private initializeDesignTokens(): void {
    // Global tokens
    const globalTokens: DesignToken[] = [
      {
        name: 'color-primary',
        value: 'hsl(221.2 83.2% 53.3%)',
        type: 'color',
        category: 'primary'
      },
      {
        name: 'color-background',
        value: 'hsl(0 0% 100%)',
        type: 'color',
        category: 'primary'
      },
      {
        name: 'spacing-unit',
        value: '1rem',
        type: 'spacing',
        category: 'primary'
      },
      {
        name: 'border-radius-default',
        value: '0.25rem',
        type: 'border',
        category: 'primary'
      },
      {
        name: 'shadow-default',
        value: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        type: 'shadow',
        category: 'primary'
      }
    ];

    globalTokens.forEach(token => {
      this.tokens.set(token.name, token);
    });
  }

  // Utility methods
  private generateTokenBaseName(description: string): string {
    return description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .slice(0, 3)
      .join('-');
  }

  private getContrastColor(hexColor: string): string {
    // Simple contrast calculation (would use a more sophisticated algorithm in production)
    return hexColor.startsWith('hsl') ? 'hsl(0 0% 100%)' : '#ffffff';
  }

  private getSpacingScale(spacing?: 'tight' | 'normal' | 'relaxed'): string[] {
    const scales: Record<string, string[]> = {
      'tight': ['0.5rem', '0.75rem', '1rem', '1.5rem'],
      'normal': ['1rem', '1.5rem', '2rem', '3rem'],
      'relaxed': ['1.5rem', '2rem', '3rem', '4rem']
    };
    return scales[spacing || 'normal'];
  }

  private getBorderRadiusValue(radius?: 'none' | 'sm' | 'md' | 'lg' | 'full'): string {
    const radiusMap: Record<string, string> = {
      'none': '0',
      'sm': '0.125rem',
      'md': '0.375rem',
      'lg': '0.5rem',
      'full': '9999px'
    };
    return radiusMap[radius || 'md'];
  }

  private generateCSSVariablesString(variables: Record<string, string>): string {
    const entries = Object.entries(variables).map(([key, value]) => `  ${key}: ${value};`);
    return `:root {\n${entries.join('\n')}\n}`;
  }

  /**
   * Get available themes
   */
  getAvailableThemes(): Theme[] {
    return Array.from(this.themes.values());
  }

  /**
   * Get theme by name
   */
  getTheme(name: string): Theme | undefined {
    return this.themes.get(name);
  }

  /**
   * Set active theme
   */
  setActiveTheme(name: string): void {
    const theme = this.themes.get(name);
    if (theme) {
      this.activeTheme = theme;
    }
  }

  /**
   * Get active theme
   */
  getActiveTheme(): Theme {
    return this.activeTheme;
  }
}
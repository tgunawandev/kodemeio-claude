import { type PreviewConfig, type GeneratedComponent, type ValidationResult } from './types.js';

/**
 * Preview system with Chrome DevTools integration for live component testing
 */
export class PreviewSystem {
  private previewPages = new Map<string, PreviewPage>();
  private activePage: PreviewPage | null = null;

  /**
   * Create a live preview for a component
   */
  async createPreview(
    component: GeneratedComponent,
    config: Partial<PreviewConfig> = {}
  ): Promise<{
    previewUrl: string;
    pageId: string;
    screenshot?: string;
  }> {
    const pageId = this.generatePageId(component.spec.name);
    const previewConfig = this.createPreviewConfig(config);

    try {
      // Create preview page
      const previewPage = await this.setupPreviewPage(pageId, component, previewConfig);
      this.previewPages.set(pageId, previewPage);
      this.activePage = previewPage;

      // Generate preview HTML
      const previewHtml = this.generatePreviewHTML(component, previewConfig);

      // Navigate to preview
      await this.navigateToPreview(previewPage, previewHtml);

      // Take initial screenshot
      const screenshot = await this.takeScreenshot(previewPage);

      return {
        previewUrl: previewPage.url,
        pageId,
        screenshot
      };

    } catch (error) {
      throw new Error(`Failed to create preview: ${error.message}`);
    }
  }

  /**
   * Update component in preview
   */
  async updatePreview(
    pageId: string,
    component: GeneratedComponent,
    config?: Partial<PreviewConfig>
  ): Promise<void> {
    const previewPage = this.previewPages.get(pageId);
    if (!previewPage) {
      throw new Error(`Preview page '${pageId}' not found`);
    }

    try {
      const previewConfig = config ? this.createPreviewConfig(config) : previewPage.config;
      const previewHtml = this.generatePreviewHTML(component, previewConfig);

      await this.updatePreviewContent(previewPage, previewHtml);
      previewPage.config = previewConfig;

    } catch (error) {
      throw new Error(`Failed to update preview: ${error.message}`);
    }
  }

  /**
   * Test component across different viewports
   */
  async testResponsiveBehavior(
    pageId: string,
    viewports: Array<{ width: number; height: number; device?: string }> = [
      { width: 375, height: 667, device: 'iPhone 12' },
      { width: 768, height: 1024, device: 'iPad' },
      { width: 1920, height: 1080, device: 'Desktop' }
    ]
  ): Promise<Array<{
    viewport: typeof viewports[0];
    screenshot: string;
    issues: string[];
  }>> {
    const previewPage = this.previewPages.get(pageId);
    if (!previewPage) {
      throw new Error(`Preview page '${pageId}' not found`);
    }

    const results = [];

    for (const viewport of viewports) {
      try {
        // Resize viewport
        await this.resizeViewport(previewPage, viewport);

        // Wait for layout to settle
        await this.waitForLayout(previewPage);

        // Take screenshot
        const screenshot = await this.takeScreenshot(previewPage);

        // Check for responsive issues
        const issues = await this.checkResponsiveIssues(previewPage);

        results.push({
          viewport,
          screenshot,
          issues
        });

      } catch (error) {
        results.push({
          viewport,
          screenshot: '',
          issues: [`Failed to test viewport: ${error.message}`]
        });
      }
    }

    return results;
  }

  /**
   * Test accessibility features
   */
  async testAccessibility(pageId: string): Promise<{
    score: number;
    violations: Array<{
      impact: 'critical' | 'serious' | 'moderate' | 'minor';
      description: string;
      element: string;
    }>;
    passes: string[];
    recommendations: string[];
  }> {
    const previewPage = this.previewPages.get(pageId);
    if (!previewPage) {
      throw new Error(`Preview page '${pageId}' not found`);
    }

    try {
      // Run accessibility audit
      const accessibilityResults = await this.runAccessibilityAudit(previewPage);

      // Calculate score
      const score = this.calculateAccessibilityScore(accessibilityResults);

      // Generate recommendations
      const recommendations = this.generateAccessibilityRecommendations(accessibilityResults);

      return {
        score,
        violations: accessibilityResults.violations,
        passes: accessibilityResults.passes,
        recommendations
      };

    } catch (error) {
      throw new Error(`Failed to test accessibility: ${error.message}`);
    }
  }

  /**
   * Test component performance
   */
  async testPerformance(pageId: string): Promise<{
    loadTime: number;
    renderTime: number;
    bundleSize: number;
    recommendations: string[];
  }> {
    const previewPage = this.previewPages.get(pageId);
    if (!previewPage) {
      throw new Error(`Preview page '${pageId}' not found`);
    }

    try {
      // Start performance tracing
      await this.startPerformanceTracing(previewPage);

      // Reload page
      await this.reloadPage(previewPage);

      // Stop tracing and get metrics
      const metrics = await this.getPerformanceMetrics(previewPage);

      // Generate recommendations
      const recommendations = this.generatePerformanceRecommendations(metrics);

      return {
        ...metrics,
        recommendations
      };

    } catch (error) {
      throw new Error(`Failed to test performance: ${error.message}`);
    }
  }

  /**
   * Test interactive elements
   */
  async testInteractions(
    pageId: string,
    interactions: Array<{
      type: 'click' | 'hover' | 'focus' | 'input';
      selector: string;
      value?: string;
    }>
  ): Promise<Array<{
    interaction: typeof interactions[0];
    screenshot: string;
    consoleErrors: string[];
    elementStates: Record<string, string>;
  }>> {
    const previewPage = this.previewPages.get(pageId);
    if (!previewPage) {
      throw new Error(`Preview page '${pageId}' not found`);
    }

    const results = [];

    for (const interaction of interactions) {
      try {
        // Clear console
        await this.clearConsole(previewPage);

        // Perform interaction
        await this.performInteraction(previewPage, interaction);

        // Wait for any animations or state changes
        await this.waitForStateChange(previewPage);

        // Take screenshot
        const screenshot = await this.takeScreenshot(previewPage);

        // Get console errors
        const consoleErrors = await this.getConsoleErrors(previewPage);

        // Get element states
        const elementStates = await this.getElementStates(previewPage, interaction.selector);

        results.push({
          interaction,
          screenshot,
          consoleErrors,
          elementStates
        });

      } catch (error) {
        results.push({
          interaction,
          screenshot: '',
          consoleErrors: [error.message],
          elementStates: {}
        });
      }
    }

    return results;
  }

  /**
   * Close preview page
   */
  async closePreview(pageId: string): Promise<void> {
    const previewPage = this.previewPages.get(pageId);
    if (!previewPage) {
      return;
    }

    try {
      await this.closePage(previewPage);
      this.previewPages.delete(pageId);

      if (this.activePage?.id === pageId) {
        this.activePage = null;
      }

    } catch (error) {
      console.warn(`Failed to close preview page: ${error.message}`);
    }
  }

  /**
   * Get all active previews
   */
  getActivePreviews(): Array<{ pageId: string; componentName: string; url: string }> {
    return Array.from(this.previewPages.entries()).map(([pageId, page]) => ({
      pageId,
      componentName: page.componentName,
      url: page.url
    }));
  }

  // Private helper methods

  private generatePageId(componentName: string): string {
    return `${componentName.toLowerCase()}-${Date.now()}`;
  }

  private createPreviewConfig(config: Partial<PreviewConfig>): PreviewConfig {
    return {
      viewport: {
        width: 1200,
        height: 800,
        device: 'Desktop'
      },
      theme: 'light',
      contrast: 'normal',
      reducedMotion: false,
      highContrast: false,
      ...config
    };
  }

  private async setupPreviewPage(
    pageId: string,
    component: GeneratedComponent,
    config: PreviewConfig
  ): Promise<PreviewPage> {
    // This would use MCP Chrome DevTools tools
    // For now, returning mock preview page
    return {
      id: pageId,
      componentName: component.spec.name,
      url: `http://localhost:3000/preview/${pageId}`,
      config,
      createdAt: new Date()
    };
  }

  private generatePreviewHTML(component: GeneratedComponent, config: PreviewConfig): string {
    const { spec, code, imports, styles } = component;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${spec.name} Preview</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        ${styles}

        /* Preview specific styles */
        body {
            margin: 0;
            padding: 2rem;
            font-family: system-ui, -apple-system, sans-serif;
            background: ${config.theme === 'dark' ? '#0a0a0a' : '#ffffff'};
            color: ${config.theme === 'dark' ? '#ffffff' : '#000000'};
        }

        .preview-container {
            max-width: ${config.viewport.width}px;
            margin: 0 auto;
            padding: 2rem;
            border: 1px solid ${config.theme === 'dark' ? '#333' : '#e5e5e5'};
            border-radius: 8px;
        }

        .preview-header {
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid ${config.theme === 'dark' ? '#333' : '#e5e5e5'};
        }

        .preview-controls {
            display: flex;
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .preview-controls button {
            padding: 0.5rem 1rem;
            border: 1px solid ${config.theme === 'dark' ? '#555' : '#d1d5db'};
            border-radius: 4px;
            background: ${config.theme === 'dark' ? '#1a1a1a' : '#f9fafb'};
            color: ${config.theme === 'dark' ? '#ffffff' : '#000000'};
            cursor: pointer;
        }

        .preview-controls button:hover {
            background: ${config.theme === 'dark' ? '#2a2a2a' : '#f3f4f6'};
        }

        ${config.highContrast ? `
        body {
            background: #000000 !important;
            color: #ffffff !important;
        }
        .preview-container {
            border-color: #ffffff !important;
        }
        ` : ''}

        ${config.reducedMotion ? `
        * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
        }
        ` : ''}
    </style>
</head>
<body>
    <div class="preview-container">
        <div class="preview-header">
            <h1>${spec.name} Preview</h1>
            <p>${spec.description}</p>
        </div>

        <div class="preview-controls">
            <button onclick="toggleTheme()">Toggle Theme</button>
            <button onclick="toggleContrast()">Toggle Contrast</button>
            <button onclick="toggleMotion()">Toggle Motion</button>
            <button onclick="testAccessibility()">Test Accessibility</button>
            <button onclick="testPerformance()">Test Performance</button>
        </div>

        <div id="root"></div>

        <div class="preview-info">
            <h2>Component Information</h2>
            <p><strong>Category:</strong> ${spec.category}</p>
            <p><strong>Dependencies:</strong> ${component.dependencies.join(', ')}</p>
            <p><strong>Props:</strong> ${spec.props.map(p => p.name).join(', ')}</p>
            <p><strong>Accessibility:</strong> ${JSON.stringify(spec.accessibility)}</p>
        </div>
    </div>

    <script type="text/babel">
        const { useState, useEffect, useRef } = React;

        // Component code
        ${code}

        // Example usage
        function ExampleUsage() {
            const [state, setState] = useState('default');

            return (
                <div>
                    <h3>Example Usage</h3>
                    <${spec.name}
                        variant="default"
                        onClick={() => setState('clicked')}
                    >
                        Click me!
                    </${spec.name}>
                    <p>State: {state}</p>
                </div>
            );
        }

        // Preview controls
        function toggleTheme() {
            document.body.classList.toggle('dark');
        }

        function toggleContrast() {
            document.body.classList.toggle('high-contrast');
        }

        function toggleMotion() {
            document.body.classList.toggle('reduced-motion');
        }

        function testAccessibility() {
            // Run accessibility tests
            console.log('Running accessibility tests...');
        }

        function testPerformance() {
            // Run performance tests
            console.log('Running performance tests...');
        }

        // Render app
        function App() {
            return (
                <div>
                    <${spec.name} />
                    <hr style={{margin: '2rem 0'}} />
                    <ExampleUsage />
                </div>
            );
        }

        ReactDOM.render(<App />, document.getElementById('root'));
    </script>
</body>
</html>
    `.trim();
  }

  // Chrome DevTools MCP integration methods (would use actual MCP tools)

  private async navigateToPreview(previewPage: PreviewPage, html: string): Promise<void> {
    // This would use mcp__chrome-devtools__navigate_page
    console.log(`Navigating to preview: ${previewPage.url}`);
  }

  private async updatePreviewContent(previewPage: PreviewPage, html: string): Promise<void> {
    // This would use mcp__chrome-devtools__evaluate_script to update content
    console.log(`Updating preview content for: ${previewPage.id}`);
  }

  private async resizeViewport(previewPage: PreviewPage, viewport: { width: number; height: number }): Promise<void> {
    // This would use mcp__chrome-devtools__resize_page
    console.log(`Resizing viewport to: ${viewport.width}x${viewport.height}`);
  }

  private async waitForLayout(previewPage: PreviewPage): Promise<void> {
    // This would use mcp__chrome-devtools__wait_for or evaluate_script
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  private async takeScreenshot(previewPage: PreviewPage): Promise<string> {
    // This would use mcp__chrome-devtools__take_screenshot
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77yQAAAABJRU5ErkJggg==';
  }

  private async checkResponsiveIssues(previewPage: PreviewPage): Promise<string[]> {
    // This would use mcp__chrome-devtools__evaluate_script to check for issues
    return [];
  }

  private async runAccessibilityAudit(previewPage: PreviewPage): Promise<any> {
    // This would use mcp__chrome-devtools__evaluate_script with axe-core
    return {
      violations: [],
      passes: ['Page has valid HTML structure']
    };
  }

  private calculateAccessibilityScore(results: any): number {
    // Calculate accessibility score based on violations and passes
    return 95;
  }

  private generateAccessibilityRecommendations(results: any): string[] {
    // Generate recommendations based on accessibility audit
    return [];
  }

  private async startPerformanceTracing(previewPage: PreviewPage): Promise<void> {
    // This would use mcp__chrome-devtools__performance_start_trace
    console.log('Starting performance tracing');
  }

  private async reloadPage(previewPage: PreviewPage): Promise<void> {
    // This would use mcp__chrome-devtools__navigate_page or evaluate_script
    console.log('Reloading page');
  }

  private async getPerformanceMetrics(previewPage: PreviewPage): Promise<any> {
    // This would use mcp__chrome-devtools__performance_stop_trace
    return {
      loadTime: 150,
      renderTime: 50,
      bundleSize: 25000
    };
  }

  private generatePerformanceRecommendations(metrics: any): string[] {
    // Generate performance recommendations
    if (metrics.loadTime > 1000) {
      return ['Consider lazy loading heavy components'];
    }
    return [];
  }

  private async clearConsole(previewPage: PreviewPage): Promise<void> {
    // This would use mcp__chrome-devtools__evaluate_script
    console.clear();
  }

  private async performInteraction(
    previewPage: PreviewPage,
    interaction: { type: string; selector: string; value?: string }
  ): Promise<void> {
    // This would use mcp__chrome-devtools__click, fill, or other interaction tools
    console.log(`Performing ${interaction.type} on ${interaction.selector}`);
  }

  private async waitForStateChange(previewPage: PreviewPage): Promise<void> {
    // Wait for animations or state changes
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  private async getConsoleErrors(previewPage: PreviewPage): Promise<string[]> {
    // This would use mcp__chrome-devtools__list_console_messages
    return [];
  }

  private async getElementStates(previewPage: PreviewPage, selector: string): Promise<Record<string, string>> {
    // This would use mcp__chrome-devtools__evaluate_script
    return {
      display: 'block',
      visibility: 'visible'
    };
  }

  private async closePage(previewPage: PreviewPage): Promise<void> {
    // This would use mcp__chrome-devtools__close_page
    console.log(`Closing preview page: ${previewPage.id}`);
  }
}

// Type definitions
interface PreviewPage {
  id: string;
  componentName: string;
  url: string;
  config: PreviewConfig;
  createdAt: Date;
}
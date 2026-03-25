# Shadcn UI Designer Skill

A sophisticated AI-powered designer skill that leverages the shadcn UI ecosystem, modern React patterns, and ultrathink design principles to create stunning, accessible, and performant user interfaces.

## 🚀 Features

### 🎨 Component Generation
- **Natural Language to Code**: Describe UI components in plain English and get production-ready React code
- **Shadcn Integration**: Full integration with the shadcn/ui component library and registry
- **TypeScript Support**: Complete type safety with comprehensive interface definitions
- **Ultrathink Principles**: Applied minimalist, efficient, and accessible design patterns

### 🧩 Advanced Design Patterns
- **Minimal Composition**: Compose simple components into complex ones
- **Progressive Enhancement**: Core functionality works without JavaScript
- **Consistency First**: Standardized patterns and naming conventions
- **Accessibility by Default**: WCAG AA compliance built-in
- **Performance Optimized**: Bundle size and runtime efficiency
- **Responsive Mobile-First**: Mobile-first responsive design

### 🎯 Theme & Style Management
- **Design Tokens**: Comprehensive design token system
- **Theme Intelligence**: Automatic theme adaptation and consistency
- **Custom Styling**: Easy customization with CSS variables
- **Dark/Light Mode**: Built-in theme switching support

### 🔍 Live Preview & Testing
- **Chrome DevTools Integration**: Live preview with browser automation
- **Responsive Testing**: Test across multiple viewports and devices
- **Accessibility Auditing**: Automated accessibility testing and validation
- **Performance Analysis**: Real-time performance metrics and optimization suggestions
- **Interactive Testing**: Test component interactions and user flows

### 📦 Registry Integration
- **Shadcn Registry**: Direct access to 400+ shadcn components and blocks
- **Smart Search**: Fuzzy search for components by name or description
- **Dependency Management**: Automatic dependency resolution and installation
- **Version Compatibility**: Ensure compatibility with your project setup

## 📦 Installation

The skill is automatically available when using Claude Code with the required MCP servers configured:

1. **Shadcn MCP Server**: For component registry access
2. **Context7 MCP Server**: For up-to-date documentation
3. **Chrome DevTools MCP Server**: For live preview functionality

## 🎯 Usage Examples

### Basic Component Generation

```
"Create a modern card component with hover effects and proper spacing using shadcn patterns"
```

### Complex Layout Design

```
"Design a responsive dashboard layout with sidebar navigation, data tables, and KPI cards"
```

### Form with Validation

```
"Build a contact form with validation, proper error states, and accessibility features"
```

### Component Customization

```
"Customize a button component with loading states, variants, and proper sizing"
```

## 🛠️ API Reference

### Main Class: ShadcnDesignerSkill

```typescript
import { ShadcnDesignerSkill } from '@claude/skills/shadcn-designer';

const designer = new ShadcnDesignerSkill();

// Create a component
const result = await designer.createComponent(
  "Create a modern button with hover effects",
  {
    style: { primaryColor: '#3b82f6', borderRadius: 'md' },
    accessibility: { level: 'AA', screenReader: true },
    features: ['loading', 'variants', 'accessibility']
  }
);

// Create live preview
const preview = await designer.createPreview(result.component, {
  viewport: { width: 1200, height: 800 },
  theme: 'light'
});

// Search components
const components = await designer.searchComponents("button", {
  limit: 10,
  type: 'component'
});
```

### Core Methods

#### `createComponent(description, options)`
Generate a React component from natural language description.

**Parameters:**
- `description`: Natural language description of the component
- `options.style`: Style preferences (colors, spacing, borders)
- `options.accessibility`: Accessibility requirements
- `options.constraints`: Technical constraints (responsive, dark mode, etc.)
- `options.features`: Specific features needed

**Returns:**
```typescript
{
  component: GeneratedComponent,
  suggestions: DesignSuggestion[],
  previewUrl?: string
}
```

#### `createPreview(component, config)`
Create a live preview for testing and validation.

**Parameters:**
- `component`: Generated component object
- `config.viewport`: Viewport dimensions
- `config.theme`: Theme ('light' | 'dark')
- `config.reducedMotion`: Enable reduced motion
- `config.highContrast`: Enable high contrast mode

#### `searchComponents(query, options)`
Search the shadcn registry for components.

**Parameters:**
- `query`: Search term
- `options.limit`: Maximum results
- `options.type`: Filter by type ('component' | 'block')
- `options.registry`: Specific registries to search

#### `enhanceComponent(code, description, patterns)`
Apply ultrathink patterns to existing component code.

#### `generateDesignTokens(baseColors, options)`
Generate a comprehensive design token system.

## 🎨 Design Principles

### Ultrathink Principles

1. **Minimalism**: Clean, focused designs with purposeful elements
2. **Efficiency**: Optimized performance and loading speeds
3. **Clarity**: Intuitive interfaces that reduce cognitive overhead
4. **Consistency**: Cohesive design language across all components
5. **Accessibility**: WCAG compliance by default, not as an afterthought

### Applied Patterns

- **Composition over Inheritance**: Build complex UIs from simple, focused components
- **Progressive Enhancement**: Core functionality works without JavaScript
- **Semantic HTML**: Proper HTML structure for accessibility and SEO
- **Mobile-First Design**: Responsive design starting from mobile layouts
- **Performance Optimization**: Lazy loading, code splitting, and efficient rendering

## 🧪 Testing & Validation

### Accessibility Testing
```typescript
const accessibility = await designer.testAccessibility(pageId);
console.log(`Accessibility Score: ${accessibility.score}%`);
console.log('Violations:', accessibility.violations);
console.log('Recommendations:', accessibility.recommendations);
```

### Performance Testing
```typescript
const performance = await designer.testPerformance(pageId);
console.log(`Load Time: ${performance.loadTime}ms`);
console.log(`Bundle Size: ${performance.bundleSize} bytes`);
console.log('Recommendations:', performance.recommendations);
```

### Responsive Testing
```typescript
const responsive = await designer.testResponsiveBehavior(pageId, [
  { width: 375, height: 667, device: 'iPhone 12' },
  { width: 768, height: 1024, device: 'iPad' },
  { width: 1920, height: 1080, device: 'Desktop' }
]);
```

## 📚 Examples

### Dashboard Component
See `examples/dashboard-example.tsx` for a comprehensive dashboard layout featuring:
- KPI cards with trend indicators
- Responsive grid layouts
- Interactive charts and data tables
- Tabbed navigation
- Export functionality

### Advanced Form
See `examples/form-example.tsx` for a sophisticated form featuring:
- Multi-step form with progress indicator
- Real-time validation with error states
- Accessibility features (ARIA labels, keyboard navigation)
- Responsive design
- Loading and success states

## 🔧 Configuration

### Environment Setup
Ensure your environment has:
- Node.js 18+
- React 18+
- TypeScript 5+
- Tailwind CSS 3+
- Shadcn/ui configured

### MCP Server Configuration
The skill requires these MCP servers:

```json
{
  "mcpServers": {
    "shadcn": {
      "command": "node",
      "args": ["path/to/shadcn-mcp-server"]
    },
    "context7": {
      "command": "node",
      "args": ["path/to/context7-mcp-server"]
    },
    "chrome-devtools": {
      "command": "node",
      "args": ["path/to/chrome-devtools-mcp-server"]
    }
  }
}
```

## 🎯 Best Practices

1. **Descriptive Requirements**: Provide clear, detailed descriptions of what you need
2. **Specify Constraints**: Mention accessibility requirements, responsive needs, etc.
3. **Iterative Design**: Start with basic components, then enhance them
4. **Test Thoroughly**: Use the built-in testing capabilities for accessibility and performance
5. **Follow Patterns**: Leverage the ultrathink patterns for consistent, maintainable code

## 🤝 Contributing

This skill is part of the Claude Code ecosystem. To contribute:

1. Follow the established code patterns and TypeScript conventions
2. Ensure comprehensive testing for new features
3. Maintain documentation alongside code changes
4. Adhere to the ultrathink design principles

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Related Resources

- [Shadcn/ui Documentation](https://ui.shadcn.com)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Web Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Claude Code Documentation](https://docs.claude.com)

---

Transform your UI/UX workflow with AI-powered design automation and the powerful shadcn UI ecosystem. 🚀
# Shadcn Designer Skill Templates

This directory contains official and custom templates used by the Shadcn UI Designer Skill to generate components, blocks, and patterns.

## 📁 Directory Structure

```
templates/
├── component-templates/          # Component-level templates
│   ├── base-component.tsx        # Base component template
│   ├── button.tsx                # Custom button template
│   ├── button-official.tsx       # Official shadcn button template
│   ├── card.tsx                  # Card component template
│   ├── form.tsx                  # Form component template
│   └── styles.css                # Common component styles
├── block-templates/              # Page/block level templates
│   ├── dashboard.tsx              # Dashboard layout template
│   ├── dashboard-01-official.tsx  # Official shadcn dashboard block
│   ├── hero.tsx                  # Hero section template
│   └── login-03-official.tsx     # Official shadcn login block
└── pattern-templates/            # Design pattern templates
    ├── minimal-composition.tsx   # Minimal composition pattern
    └── progressive-enhancement.tsx # Progressive enhancement pattern
```

## 🎨 Template Variables

Templates use double curly braces for variables that get replaced during generation:

### Component Variables
- `{{componentName}}` - Name of the generated component
- `{{props}}` - Component props interface
- `{{defaultProps}}` - Default props destructuring
- `{{styling}}` - Dynamic styling classes
- `{{accessibility}}` - ARIA attributes and accessibility props
- `{{additional-props}}` - Additional component-specific props

### Block Variables
- `{{components}}` - Import statements for child components
- `{{layout}}` - Layout content structure
- `{{title}}` - Block/page title
- `{{company-name}}` - Company or brand name
- `{{section-name}}` - Section name for data
- `{{section-type}}` - Section type classification
- `{{status}}` - Status indicator
- `{{target}}` - Target value
- `{{limit}}` - Limit value
- `{{reviewer}}` - Reviewer name

## 🔧 Official Shadcn Templates

### Components
- **Button Template** (`button-official.tsx`) - Based on official shadcn/ui button
- **Card Template** (`card.tsx`) - Complete card with header, content, footer
- **Form Template** (`form.tsx`) - Form with validation and accessibility

### Blocks
- **Dashboard-01** (`dashboard-01-official.tsx`) - Official shadcn dashboard block
- **Login-03** (`login-03-official.tsx`) - Official shadcn login page block

## 🎯 Design Pattern Templates

### Minimal Composition Pattern
```typescript
// Compose simple components into complex ones
const BaseComponent = React.forwardRef(...)
const EnhancedComponent = ({ variant, ...props }) => (
  <BaseComponent className={getVariantClasses(variant)} {...props}>
    <ComponentContent />
  </BaseComponent>
)
```

### Progressive Enhancement Pattern
```typescript
// Start with semantic HTML
<form action="/submit" method="post">
  <label htmlFor="email">Email</label>
  <input type="email" id="email" required />
  <button type="submit">Submit</button>
</form>

// Then enhance with JavaScript
const EnhancedForm = () => {
  const handleSubmit = (event) => {
    event.preventDefault();
    // Enhanced validation and submission
  };
  return <FormComponent onSubmit={handleSubmit} />;
};
```

## 🚀 Template Usage

### Component Generation
```bash
# Generate a button component
"Create a button with primary variant and large size"

# Uses: button-official.tsx template
# Result: Button with shadcn styling and variants
```

### Block Generation
```bash
# Generate a dashboard
"Create a dashboard with sidebar navigation and KPI cards"

# Uses: dashboard-01-official.tsx template
# Result: Complete dashboard with shadcn components
```

### Pattern Application
```bash
# Apply minimal composition
"Enhance this component with minimal composition pattern"

# Uses: minimal-composition.tsx template
# Result: Refactored component with composition pattern
```

## 🎨 Customization

### Adding New Templates
1. Create template file in appropriate directory
2. Use template variables with `{{variable}}` syntax
3. Update template engine registry
4. Test template generation

### Template Variables
- Use descriptive variable names
- Follow camelCase convention
- Include default values where appropriate
- Document variable usage in comments

### Styling Integration
- Use Tailwind CSS classes
- Follow shadcn design patterns
- Include responsive variants
- Support dark/light themes

## 🔍 Template Features

### Accessibility Built-in
- ARIA attributes
- Keyboard navigation
- Screen reader support
- Focus management

### Responsive Design
- Mobile-first approach
- Container queries
- Adaptive layouts
- Breakpoint-specific classes

### Performance Optimization
- Lazy loading patterns
- Code splitting ready
- Bundle optimization
- Runtime efficiency

### TypeScript Support
- Complete type definitions
- Generic components
- Variant props
- Interface inheritance

## 📝 Template Standards

### Code Quality
- ESLint compliant
- Prettier formatted
- TypeScript strict mode
- No console.log statements

### Documentation
- JSDoc comments
- Component descriptions
- Prop documentation
- Usage examples

### Testing Ready
- Test-friendly structure
- Mockable dependencies
- Accessible test selectors
- Storybook compatible

## 🔄 Template Updates

Templates are regularly updated to:
- Match latest shadcn/ui versions
- Include new design patterns
- Fix accessibility issues
- Improve performance

## 🛠️ Maintenance

### Regular Tasks
- Update dependencies
- Sync with shadcn changes
- Test template generation
- Validate accessibility

### Quality Assurance
- Code review templates
- Test output components
- Validate TypeScript types
- Check responsive behavior

---

These templates ensure that all generated components follow shadcn/ui best practices, accessibility standards, and modern React patterns. They provide a solid foundation for rapid UI development while maintaining code quality and consistency.
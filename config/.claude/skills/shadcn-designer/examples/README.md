# Shadcn Designer Skill Examples

This directory contains practical examples demonstrating the capabilities of the Shadcn UI Designer Skill.

## 📁 Example Files

### [`dashboard-example.tsx`](./dashboard-example.tsx)
A comprehensive dashboard layout showcasing:
- **KPI Cards**: Metric display with trend indicators
- **Responsive Grid Layout**: Mobile-first design that adapts to different screen sizes
- **Tabbed Navigation**: Organized content sections
- **Data Tables**: Sortable and filterable data display
- **Interactive Elements**: Buttons, badges, and progress indicators
- **Accessibility Features**: Proper ARIA labels and semantic HTML
- **Modern Design Patterns**: Card-based layout with consistent spacing

**Key Features Demonstrated:**
- Component composition and reusability
- Responsive design patterns
- Data visualization layout
- Navigation and information architecture
- Styling consistency with design tokens

### [`form-example.tsx`](./form-example.tsx)
An advanced multi-step form showcasing:
- **Multi-Step Form**: Progressive disclosure with step indicators
- **Real-time Validation**: Input validation with helpful error messages
- **Accessibility**: Full WCAG AA compliance with proper ARIA attributes
- **Responsive Design**: Optimized for mobile and desktop
- **Interactive Elements**: Various input types and form controls
- **State Management**: Form state handling with React Hook Form and Zod
- **Loading States**: Visual feedback during form submission

**Key Features Demonstrated:**
- Complex form patterns and validation
- Progressive enhancement techniques
- Accessibility best practices
- User experience optimization
- Error handling and user feedback

## 🎯 Usage Examples

### Generating a Dashboard Component

```typescript
import { ShadcnDesignerSkill } from '@claude/skills/shadcn-designer';

const designer = new ShadcnDesignerSkill();

// Create a dashboard KPI card
const kpiCard = await designer.createComponent(
  "Create a KPI card component with title, value, change indicator, and icon",
  {
    style: { primaryColor: '#3b82f6', borderRadius: 'lg' },
    accessibility: { level: 'AA', screenReader: true },
    features: ['hover-effects', 'responsive', 'accessibility']
  }
);

// Create a data table
const dataTable = await designer.createComponent(
  "Build a responsive data table with sorting, filtering, and pagination",
  {
    style: { spacing: 'normal' },
    constraints: { responsive: true, darkMode: true },
    features: ['sorting', 'filtering', 'pagination']
  }
);
```

### Generating a Form Component

```typescript
// Create a contact form
const contactForm = await designer.createComponent(
  "Create a contact form with name, email, message fields and validation",
  {
    style: { primaryColor: '#10b981' },
    accessibility: {
      level: 'AAA',
      screenReader: true,
      keyboardNavigation: true
    },
    features: ['validation', 'error-states', 'loading-states']
  }
);

// Create a multi-step registration form
const registrationForm = await designer.createComponent(
  "Build a 3-step registration form with progress indicator and validation",
  {
    constraints: { responsive: true },
    features: ['multi-step', 'progress-indicator', 'validation']
  }
);
```

## 🧪 Testing Examples

### Accessibility Testing

```typescript
// Test component accessibility
const accessibilityResults = await designer.testAccessibility(previewPageId);

console.log(`Accessibility Score: ${accessibilityResults.score}%`);
console.log('Violations found:', accessibilityResults.violations.length);
console.log('Recommendations:', accessibilityResults.recommendations);
```

### Responsive Testing

```typescript
// Test across multiple devices
const responsiveResults = await designer.testResponsiveBehavior(previewPageId, [
  { width: 375, height: 667, device: 'iPhone 12' },
  { width: 768, height: 1024, device: 'iPad' },
  { width: 1920, height: 1080, device: 'Desktop' }
]);

responsiveResults.forEach(result => {
  console.log(`${result.viewport.device}: ${result.issues.length} issues found`);
});
```

### Performance Testing

```typescript
// Analyze component performance
const performanceResults = await designer.testPerformance(previewPageId);

console.log(`Load Time: ${performanceResults.loadTime}ms`);
console.log(`Bundle Size: ${performanceResults.bundleSize} bytes`);
console.log('Optimization suggestions:', performanceResults.recommendations);
```

## 🎨 Design Patterns Applied

### Ultrathink Principles in Action

1. **Minimal Composition**
   ```typescript
   // Simple, focused components
   const KPIData = ({ value, change }) => ({ value, change });
   const KPIIcon = ({ icon }) => <IconWrapper>{icon}</IconWrapper>;

   // Compose into complex component
   const KPICard = ({ title, value, change, icon }) => (
     <Card>
       <CardHeader>
         <KPIIcon icon={icon} />
         <CardTitle>{title}</CardTitle>
       </CardHeader>
       <CardContent>
         <KPIData value={value} change={change} />
       </CardContent>
     </Card>
   );
   ```

2. **Progressive Enhancement**
   ```typescript
   // Semantic HTML foundation
   <form action="/submit" method="post">
     <label htmlFor="email">Email</label>
     <input type="email" id="email" required />
     <button type="submit">Submit</button>
   </form>

   // Enhanced with JavaScript
   const EnhancedForm = () => {
     const [isValidating, setIsValidating] = useState(false);
     // Enhanced validation and UX
   };
   ```

3. **Accessibility by Default**
   ```typescript
   const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
     ({ children, disabled, ...props }, ref) => (
       <button
         ref={ref}
         disabled={disabled}
         aria-disabled={disabled}
         tabIndex={disabled ? -1 : undefined}
         {...props}
       >
         {children}
       </button>
     )
   );
   ```

## 📱 Responsive Patterns

### Mobile-First Grid Layout

```css
/* Mobile-first approach */
.dashboard-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
}

/* Tablet and up */
@media (min-width: 768px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 2rem;
  }
}
```

### Fluid Typography

```css
.responsive-text {
  font-size: clamp(1rem, 2.5vw, 1.5rem);
  line-height: 1.5;
}
```

## 🎯 Component Categories

### Layout Components
- **Cards**: Flexible content containers
- **Grids**: Responsive layout systems
- **Sections**: Page layout building blocks

### Navigation Components
- **Headers**: Page navigation bars
- **Menus**: Dropdown and sidebar navigation
- **Breadcrumbs**: Navigation path indicators

### Form Components
- **Inputs**: Text, email, number inputs
- **Selectors**: Dropdowns, radio buttons, checkboxes
- **Validators**: Real-time form validation

### Data Display Components
- **Tables**: Sortable, filterable data tables
- **Lists**: Flexible list layouts
- **Cards**: Data presentation cards

### Feedback Components
- **Alerts**: Status messages and notifications
- **Progress**: Loading and progress indicators
- **Tooltips**: Contextual help text

## 🔧 Customization Examples

### Theme Customization

```typescript
// Create custom theme
const customTheme = await designer.generateDesignTokens({
  primary: '#6366f1',
  secondary: '#8b5cf6',
  accent: '#ec4899'
}, {
  theme: 'dark',
  spacing: 'relaxed',
  borderRadius: 'lg'
});

// Apply to component
const themedComponent = await designer.createComponent(
  "Create a themed card component",
  {
    style: { ...customTheme.tokens },
    features: ['theming', 'dark-mode']
  }
);
```

### Style Customization

```typescript
// Custom styling preferences
const stylePreferences = {
  primaryColor: '#059669',
  secondaryColor: '#0891b2',
  borderRadius: 'full',
  spacing: 'relaxed',
  theme: 'auto'
};

const customComponent = await designer.createComponent(
  "Create a modern button with custom styling",
  { style: stylePreferences }
);
```

## 📚 Learning Resources

### Recommended Reading
- [Shadcn/ui Documentation](https://ui.shadcn.com) - Component library documentation
- [React Patterns](https://reactpatterns.com) - React design patterns
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) - WCAG accessibility standards
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) - Utility-first CSS framework

### Video Tutorials
- Building Accessible React Components
- Responsive Design Patterns
- Modern Form Validation Techniques
- Component Composition Strategies

### Community Resources
- [GitHub Discussions](https://github.com/shadcn-ui/ui/discussions) - Community discussions
- [Stack Overflow](https://stackoverflow.com/questions/tagged/shadcn-ui) - Q&A and troubleshooting
- [Discord Community](https://discord.gg/shadcn) - Real-time community support

---

These examples demonstrate the power and flexibility of the Shadcn UI Designer Skill. Use them as starting points for your own projects and adapt them to your specific needs.
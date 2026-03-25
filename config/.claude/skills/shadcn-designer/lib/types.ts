/**
 * Core type definitions for the Shadcn UI Designer Skill
 */

export interface DesignRequirement {
  id: string;
  description: string;
  componentType?: string;
  features: string[];
  constraints: DesignConstraints;
  style: StylePreferences;
  accessibility: AccessibilityRequirements;
}

export interface DesignConstraints {
  responsive?: boolean;
  darkMode?: boolean;
  animation?: boolean;
  bundleSize?: 'minimal' | 'balanced' | 'full';
  browserSupport?: string[];
}

export interface StylePreferences {
  primaryColor?: string;
  secondaryColor?: string;
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  spacing?: 'tight' | 'normal' | 'relaxed';
  typography?: 'sans' | 'serif' | 'mono';
  theme?: 'light' | 'dark' | 'auto';
}

export interface AccessibilityRequirements {
  level: 'AA' | 'AAA' | 'minimal';
  screenReader?: boolean;
  keyboardNavigation?: boolean;
  highContrast?: boolean;
  reducedMotion?: boolean;
}

export interface ComponentSpec {
  name: string;
  description: string;
  category: ComponentCategory;
  dependencies: string[];
  props: ComponentProp[];
  variants: ComponentVariant[];
  examples: ComponentExample[];
  accessibility: AccessibilityFeatures;
}

export type ComponentCategory =
  | 'forms'
  | 'navigation'
  | 'layout'
  | 'feedback'
  | 'data-display'
  | 'overlay'
  | 'media'
  | 'typography';

export interface ComponentProp {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: any;
}

export interface ComponentVariant {
  name: string;
  description: string;
  className: string;
  props?: Record<string, any>;
}

export interface ComponentExample {
  name: string;
  description: string;
  code: string;
  props?: Record<string, any>;
}

export interface AccessibilityFeatures {
  role?: string;
  ariaAttributes?: Record<string, string>;
  keyboardNavigation?: boolean;
  screenReaderSupport?: boolean;
  focusManagement?: boolean;
}

export interface UltrathinkPattern {
  id: string;
  name: string;
  description: string;
  principles: string[];
  benefits: string[];
  useCases: string[];
  codePattern: string;
}

export interface DesignToken {
  name: string;
  value: string;
  type: 'color' | 'spacing' | 'typography' | 'border' | 'shadow';
  category: 'primary' | 'secondary' | 'semantic';
}

export interface Theme {
  name: string;
  colors: Record<string, string>;
  spacing: Record<string, string>;
  typography: Record<string, any>;
  borderRadius: Record<string, string>;
  shadows: Record<string, string>;
}

export interface GeneratedComponent {
  spec: ComponentSpec;
  code: string;
  imports: string[];
  styles: string;
  tests: string;
  documentation: string;
  dependencies: string[];
}

export interface DesignSuggestion {
  type: 'component' | 'pattern' | 'layout' | 'enhancement';
  title: string;
  description: string;
  rationale: string;
  implementation: string;
  benefits: string[];
  effort: 'low' | 'medium' | 'high';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: DesignSuggestion[];
}

export interface ValidationError {
  type: 'syntax' | 'accessibility' | 'performance' | 'design';
  message: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationWarning {
  type: 'accessibility' | 'performance' | 'design' | 'seo';
  message: string;
  recommendation: string;
  priority: 'low' | 'medium' | 'high';
}

export interface PreviewConfig {
  viewport: {
    width: number;
    height: number;
    device?: string;
  };
  theme: 'light' | 'dark';
  contrast: 'normal' | 'high';
  reducedMotion: boolean;
  highContrast: boolean;
}

export interface RegistryItem {
  name: string;
  registry: string;
  type: 'component' | 'block';
  description: string;
  dependencies: string[];
  files: string[];
}

export interface MCPRegistryResponse {
  items: RegistryItem[];
  total: number;
  hasMore: boolean;
}

// API response types
export interface ShadcnComponentResponse {
  name: string;
  description: string;
  dependencies: string[];
  files: {
    'component.tsx'?: string;
    'index.ts'?: string;
    'styles.css'?: string;
  };
}

export interface ShadcnBlockResponse {
  name: string;
  description: string;
  type: string;
  dependencies: string[];
  files: Record<string, string>;
  iframe_url?: string;
}

// Error types
export class DesignError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DesignError';
  }
}

export class RegistryError extends Error {
  constructor(
    message: string,
    public registry: string,
    public component?: string
  ) {
    super(message);
    this.name = 'RegistryError';
  }
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
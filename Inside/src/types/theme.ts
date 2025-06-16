// Theme management types for customizing visitor experience

export interface ThemeColors {
  primary: string;
  secondary: string;
  tertiary?: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  error: string;
  warning: string;
  success: string;
  info: string;
  border: string;
  headerBackground: string;
  headerText: string;
  buttonBackground: string;
  buttonText: string;
  linkColor: string;
}

export interface ThemeFonts {
  primary: string;
  secondary?: string;
  heading: string;
  body: string;
  button: string;
  sizes: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  weights: {
    light: string;
    regular: string;
    medium: string;
    semibold: string;
    bold: string;
  };
}

export interface ThemeImages {
  logo: string;
  logoDark?: string;
  background?: string;
  welcomeImage?: string;
  successImage?: string;
  errorImage?: string;
  loadingAnimation?: string;
  headerPattern?: string;
  watermark?: string;
}

export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export interface ThemeBorderRadius {
  none: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  full: number;
}

export interface ThemeShadows {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface ThemeAnimations {
  duration: {
    fast: number;
    normal: number;
    slow: number;
  };
  easing: {
    linear: string;
    easeIn: string;
    easeOut: string;
    easeInOut: string;
  };
}

export interface ThemeFormConfig {
  defaultFormIds: string[]; // Default forms to show for this theme
  formOrder: string[]; // Custom form ordering
  hiddenFormIds: string[]; // Forms to hide when using this theme
  formStyles: {
    [formId: string]: {
      backgroundColor?: string;
      textColor?: string;
      borderColor?: string;
      buttonColor?: string;
    };
  };
}

export interface ThemeLayoutConfig {
  showLogo: boolean;
  logoPosition: 'left' | 'center' | 'right';
  showCompanyName: boolean;
  showWelcomeMessage: boolean;
  welcomeMessage?: string;
  showDateTime: boolean;
  showLocationInfo: boolean;
  footerText?: string;
  copyrightText?: string;
}

export interface CustomTheme {
  id: string;
  name: string;
  description?: string;
  category: 'default' | 'seasonal' | 'brand' | 'event' | 'custom';
  status: 'active' | 'inactive' | 'draft';
  
  // Visual customization
  colors: ThemeColors;
  fonts: ThemeFonts;
  images: ThemeImages;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
  shadows: ThemeShadows;
  animations: ThemeAnimations;
  
  // Form configuration
  formConfig: ThemeFormConfig;
  
  // Layout configuration
  layoutConfig: ThemeLayoutConfig;
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  companyId: string;
  locationIds?: string[]; // Optional: limit to specific locations
  
  // Usage statistics
  timesUsed?: number;
  lastUsedAt?: Date;
  
  // Version control
  version: number;
  parentThemeId?: string; // For theme inheritance
  isDefault?: boolean;
  
  // Scheduling (optional)
  schedule?: {
    startDate?: Date;
    endDate?: Date;
    timeOfDay?: {
      start: string; // "09:00"
      end: string; // "17:00"
    };
    daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  };
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: string;
  theme: Partial<CustomTheme>;
}

// Common theme presets
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'modern-blue',
    name: 'Modern Blue',
    description: 'Clean and professional blue theme',
    thumbnail: '🎨',
    category: 'default',
    theme: {
      colors: {
        primary: '#2563eb',
        secondary: '#3b82f6',
        background: '#ffffff',
        surface: '#f3f4f6',
        text: '#111827',
        textSecondary: '#6b7280',
        error: '#ef4444',
        warning: '#f59e0b',
        success: '#10b981',
        info: '#3b82f6',
        border: '#e5e7eb',
        headerBackground: '#2563eb',
        headerText: '#ffffff',
        buttonBackground: '#2563eb',
        buttonText: '#ffffff',
        linkColor: '#2563eb',
      },
      fonts: {
        primary: 'System',
        heading: 'System',
        body: 'System',
        button: 'System',
        sizes: {
          xs: 10,
          sm: 12,
          md: 14,
          lg: 16,
          xl: 20,
          xxl: 24,
        },
        weights: {
          light: '300',
          regular: '400',
          medium: '500',
          semibold: '600',
          bold: '700',
        },
      },
    },
  },
  {
    id: 'dark-mode',
    name: 'Dark Mode',
    description: 'Easy on the eyes dark theme',
    thumbnail: '🌙',
    category: 'default',
    theme: {
      colors: {
        primary: '#6366f1',
        secondary: '#8b5cf6',
        background: '#111827',
        surface: '#1f2937',
        text: '#f9fafb',
        textSecondary: '#d1d5db',
        error: '#f87171',
        warning: '#fbbf24',
        success: '#34d399',
        info: '#60a5fa',
        border: '#374151',
        headerBackground: '#1f2937',
        headerText: '#f9fafb',
        buttonBackground: '#6366f1',
        buttonText: '#ffffff',
        linkColor: '#818cf8',
      },
    },
  },
  {
    id: 'nature-green',
    name: 'Nature Green',
    description: 'Fresh and eco-friendly green theme',
    thumbnail: '🌿',
    category: 'default',
    theme: {
      colors: {
        primary: '#059669',
        secondary: '#10b981',
        background: '#ffffff',
        surface: '#ecfdf5',
        text: '#064e3b',
        textSecondary: '#047857',
        error: '#dc2626',
        warning: '#f59e0b',
        success: '#10b981',
        info: '#0891b2',
        border: '#6ee7b7',
        headerBackground: '#059669',
        headerText: '#ffffff',
        buttonBackground: '#059669',
        buttonText: '#ffffff',
        linkColor: '#059669',
      },
    },
  },
];

// Theme validation
export interface ThemeValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateTheme(theme: Partial<CustomTheme>): ThemeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (!theme.name) errors.push('Theme name is required');
  if (!theme.colors) errors.push('Theme colors are required');
  if (!theme.fonts) errors.push('Theme fonts are required');
  
  // Color validation
  if (theme.colors) {
    const requiredColors = ['primary', 'background', 'text'];
    requiredColors.forEach(color => {
      if (!theme.colors![color as keyof ThemeColors]) {
        errors.push(`Color '${color}' is required`);
      }
    });
  }
  
  // Warnings
  if (!theme.description) warnings.push('Consider adding a description');
  if (!theme.images?.logo) warnings.push('No logo image specified');
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
import { Platform } from 'react-native';

// Cross-platform font helpers
const getFontFamily = (fontType: 'system' | 'serif' | 'bold' | 'light') => {
  if (Platform.OS === 'ios') {
    switch (fontType) {
      case 'system': return 'System';
      case 'serif': return 'Georgia';
      case 'bold': return 'System';
      case 'light': return 'System';
      default: return 'System';
    }
  } else {
    switch (fontType) {
      case 'system': return 'sans-serif';
      case 'serif': return 'serif';
      case 'bold': return 'sans-serif';
      case 'light': return 'sans-serif-light';
      default: return 'sans-serif';
    }
  }
};

export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  background: string;
  surface: string;
  cardBackground: string;
  headerBackground: string;
  text: string;
  textSecondary: string;
  textLight: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface WelcomeImage {
  id: number;
  name: string;
  emoji: string;
  color: string;
  description: string;
}

export interface Theme {
  name: string;
  colors: ThemeColors;
  welcomeImages: WelcomeImage[];
  fonts: {
    primary: string;
    secondary: string;
    weights: {
      light: '300';
      regular: '400';
      medium: '500';
      bold: '700';
    };
  };
  background: {
    type: 'gradient' | 'pattern' | 'animated';
    gradient?: {
      colors: string[];
      start: { x: number; y: number };
      end: { x: number; y: number };
    };
    pattern?: {
      backgroundColor: string;
      overlayColor?: string;
      opacity?: number;
    };
    animated?: {
      type: 'chip-manufacturing' | 'data-flow' | 'particles' | 'waterfall';
      backgroundColor: string;
      colors: string[];
    };
  };
  borderRadius: {
    small: number;
    medium: number;
    large: number;
  };
  shadow: {
    small: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    medium: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
  };
}

// High Tech Theme - Futuristic, clean, tech-focused
export const highTechTheme: Theme = {
  name: 'High Tech',
  colors: {
    primary: '#0066ff',
    primaryDark: '#0052cc',
    primaryLight: '#3385ff',
    secondary: '#00d4aa',
    background: '#f8fafc',
    surface: '#ffffff',
    cardBackground: '#ffffff',
    headerBackground: '#0066ff',
    text: '#1e293b',
    textSecondary: '#64748b',
    textLight: '#94a3b8',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  welcomeImages: [
    { id: 1, name: 'Check In', emoji: '🔐', color: '#0066ff', description: 'Secure digital entry' },
    { id: 2, name: 'Meeting', emoji: '💻', color: '#8b5cf6', description: 'Virtual collaboration' },
    { id:3, name: 'Delivery', emoji: '🚀', color: '#06b6d4', description: 'Express delivery' },
    { id: 4, name: 'Support', emoji: '⚡', color: '#10b981', description: 'Tech support' },
    { id: 5, name: 'Guest', emoji: '🔬', color: '#f59e0b', description: 'Innovation visit' },
    { id: 6, name: 'Tour', emoji: '🌐', color: '#ef4444', description: 'Facility tour' },
  ],
  fonts: {
    primary: getFontFamily('system'),
    secondary: getFontFamily('system'),
    weights: {
      light: '300',
      regular: '400',
      medium: '500',
      bold: '700',
    },
  },
  background: {
    type: 'animated',
    animated: {
      type: 'chip-manufacturing',
      backgroundColor: '#0a0f1c',
      colors: ['#0066ff', '#00d4aa', '#3385ff', '#1e40af', '#0891b2'],
    },
  },
  borderRadius: {
    small: 8,
    medium: 12,
    large: 16,
  },
  shadow: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
  },
};

// Law Firm Theme - Traditional, professional, conservative
export const lawFirmTheme: Theme = {
  name: 'Law Firm',
  colors: {
    primary: '#7c2d12',
    primaryDark: '#5c1a0b',
    primaryLight: '#9a3412',
    secondary: '#a16207',
    background: '#fefdf8',
    surface: '#fffbeb',
    cardBackground: '#ffffff',
    headerBackground: '#7c2d12',
    text: '#292524',
    textSecondary: '#57534e',
    textLight: '#78716c',
    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626',
    info: '#1d4ed8',
  },
  welcomeImages: [
    { id: 1, name: 'Consultation', emoji: '⚖️', color: '#7c2d12', description: 'Legal consultation' },
    { id: 2, name: 'Meeting', emoji: '📋', color: '#a16207', description: 'Client meeting' },
    { id: 3, name: 'Appointment', emoji: '📚', color: '#166534', description: 'Scheduled appointment' },
    { id: 4, name: 'Document', emoji: '📄', color: '#1e40af', description: 'Document review' },
    { id: 5, name: 'Witness', emoji: '✍️', color: '#7c3aed', description: 'Witness statement' },
    { id: 6, name: 'Guest', emoji: '🤝', color: '#be123c', description: 'Professional visit' },
  ],
  fonts: {
    primary: getFontFamily('serif'),
    secondary: getFontFamily('system'),
    weights: {
      light: '300',
      regular: '400',
      medium: '500',
      bold: '700',
    },
  },
  background: {
    type: 'gradient',
    gradient: {
      colors: ['#7c2d12', '#a16207', '#5c1a0b'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
  },
  borderRadius: {
    small: 4,
    medium: 6,
    large: 8,
  },
  shadow: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
  },
};

// Metropolitan Theme - High energy, vibrant, modern city life
export const metropolitanTheme: Theme = {
  name: 'Metropolitan',
  colors: {
    primary: '#db2777',
    primaryDark: '#be185d',
    primaryLight: '#ec4899',
    secondary: '#7c3aed',
    background: '#fafafa',
    surface: '#ffffff',
    cardBackground: '#ffffff',
    headerBackground: '#db2777',
    text: '#18181b',
    textSecondary: '#52525b',
    textLight: '#71717a',
    success: '#22c55e',
    warning: '#eab308',
    error: '#f43f5e',
    info: '#06b6d4',
  },
  welcomeImages: [
    { id: 1, name: 'Check In', emoji: '🏙️', color: '#db2777', description: 'City center entry' },
    { id: 2, name: 'Meeting', emoji: '💼', color: '#7c3aed', description: 'Business meeting' },
    { id: 3, name: 'Event', emoji: '🎯', color: '#06b6d4', description: 'Corporate event' },
    { id: 4, name: 'Delivery', emoji: '🚛', color: '#22c55e', description: 'Urban delivery' },
    { id: 5, name: 'VIP', emoji: '⭐', color: '#eab308', description: 'VIP visit' },
    { id: 6, name: 'Network', emoji: '🌆', color: '#f43f5e', description: 'Networking event' },
  ],
  fonts: {
    primary: getFontFamily('bold'),
    secondary: getFontFamily('system'),
    weights: {
      light: '300',
      regular: '400',
      medium: '500',
      bold: '700',
    },
  },
  background: {
    type: 'gradient',
    gradient: {
      colors: ['#db2777', '#7c3aed', '#06b6d4'],
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
    },
  },
  borderRadius: {
    small: 6,
    medium: 10,
    large: 14,
  },
  shadow: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 4,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 6,
    },
  },
};

// Zen Theme - Calm, peaceful, wellness-focused
export const zenTheme: Theme = {
  name: 'Calm Zen',
  colors: {
    primary: '#059669',
    primaryDark: '#047857',
    primaryLight: '#10b981',
    secondary: '#0891b2',
    background: '#f0fdf4',
    surface: '#ffffff',
    cardBackground: '#ffffff',
    headerBackground: '#059669',
    text: '#14532d',
    textSecondary: '#374151',
    textLight: '#6b7280',
    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626',
    info: '#0284c7',
  },
  welcomeImages: [
    { id: 1, name: 'Welcome', emoji: '🧘', color: '#059669', description: 'Peaceful entry' },
    { id: 2, name: 'Wellness', emoji: '💧', color: '#0891b2', description: 'Wellness visit' },
    { id: 3, name: 'Therapy', emoji: '🌊', color: '#06b6d4', description: 'Therapy session' },
    { id: 4, name: 'Nature', emoji: '🌿', color: '#10b981', description: 'Nature connection' },
    { id: 5, name: 'Mindful', emoji: '☯️', color: '#22d3ee', description: 'Mindful visit' },
    { id: 6, name: 'Harmony', emoji: '🏔️', color: '#059669', description: 'Inner harmony' },
  ],
  fonts: {
    primary: getFontFamily('light'),
    secondary: getFontFamily('system'),
    weights: {
      light: '300',
      regular: '400',
      medium: '500',
      bold: '700',
    },
  },
  background: {
    type: 'animated',
    animated: {
      type: 'waterfall',
      backgroundColor: '#065f46',
      colors: ['#10b981', '#059669', '#0891b2', '#06b6d4', '#22d3ee'],
    },
  },
  borderRadius: {
    small: 12,
    medium: 16,
    large: 20,
  },
  shadow: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 4,
    },
  },
};

export const themes = {
  hightech: highTechTheme,
  lawfirm: lawFirmTheme,
  metropolitan: metropolitanTheme,
  zen: zenTheme,
};

export type ThemeType = keyof typeof themes;
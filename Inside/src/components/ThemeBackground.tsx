import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../themes/themes';
import SimpleAnimatedChipBackground from './SimpleAnimatedChipBackground';
import WaterfallBackground from './WaterfallBackground';

interface ThemeBackgroundProps {
  theme: Theme;
  style?: ViewStyle;
  children: React.ReactNode;
}

const ThemeBackground: React.FC<ThemeBackgroundProps> = ({ theme, style, children }) => {
  // Handle animated backgrounds
  if (theme.background.type === 'animated' && theme.background.animated) {
    return (
      <View style={[styles.container, style]}>
        {theme.background.animated.type === 'chip-manufacturing' && (
          <SimpleAnimatedChipBackground
            backgroundColor={theme.background.animated.backgroundColor}
            colors={theme.background.animated.colors}
          />
        )}
        
        {theme.background.animated.type === 'waterfall' && (
          <WaterfallBackground
            backgroundColor={theme.background.animated.backgroundColor}
            colors={theme.background.animated.colors}
          />
        )}
        
        {/* Content */}
        <View style={styles.content}>
          {children}
        </View>
      </View>
    );
  }
  
  // Handle gradient backgrounds
  if (theme.background.type === 'gradient' && theme.background.gradient) {
    const gradientColors = theme.background.gradient.colors;
    
    // Create a simplified gradient effect using multiple overlays
    return (
      <View style={[styles.container, style]}>
        {/* Base background */}
        <View style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: gradientColors[0] }
        ]} />
        
        {/* Gradient overlay using opacity layers */}
        <View style={[
          StyleSheet.absoluteFillObject,
          styles.gradientOverlay,
          { backgroundColor: gradientColors[1] }
        ]} />
        
        {gradientColors[2] && (
          <View style={[
            StyleSheet.absoluteFillObject,
            styles.gradientOverlay2,
            { backgroundColor: gradientColors[2] }
          ]} />
        )}
        
        {/* Content */}
        <View style={styles.content}>
          {children}
        </View>
      </View>
    );
  }

  // Pattern background
  return (
    <View style={[
      styles.container,
      style,
      { backgroundColor: theme.background.pattern?.backgroundColor || theme.colors.background }
    ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientOverlay: {
    opacity: 0.6,
  },
  gradientOverlay2: {
    opacity: 0.3,
  },
  content: {
    flex: 1,
  },
});

export default ThemeBackground;
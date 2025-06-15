import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';

interface SimpleAnimatedChipBackgroundProps {
  backgroundColor: string;
  colors: string[];
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Simple pulsing circle component
const PulsingCircle: React.FC<{ 
  color: string; 
  delay: number; 
  x: number; 
  y: number; 
  size: number; 
}> = ({ color, delay, x, y, size }) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000 + delay * 100,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 2000 + delay * 100,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    const timer = setTimeout(startAnimation, delay * 200);
    return () => clearTimeout(timer);
  }, [pulseAnim, delay]);

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.4],
  });

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  return (
    <Animated.View
      style={[
        styles.circle,
        {
          left: x - size / 2,
          top: y - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          transform: [{ scale }],
          opacity,
        },
      ]}
    />
  );
};

// Simple flowing line component
const FlowingLine: React.FC<{ color: string; delay: number }> = ({ color, delay }) => {
  const flowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startAnimation = () => {
      Animated.loop(
        Animated.timing(flowAnim, {
          toValue: 1,
          duration: 4000 + delay * 200,
          useNativeDriver: true,
        })
      ).start();
    };

    const timer = setTimeout(startAnimation, delay * 100);
    return () => clearTimeout(timer);
  }, [flowAnim, delay]);

  const translateX = flowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, screenWidth + 100],
  });

  const opacity = flowAnim.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Animated.View
      style={[
        styles.line,
        {
          backgroundColor: color,
          top: Math.random() * (screenHeight - 100) + 50,
          transform: [{ translateX }],
          opacity,
        },
      ]}
    />
  );
};

// Glowing dot component
const GlowingDot: React.FC<{ 
  color: string; 
  delay: number; 
  x: number; 
  y: number; 
}> = ({ color, delay, x, y }) => {
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500 + delay * 150,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500 + delay * 150,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    const timer = setTimeout(startAnimation, delay * 100);
    return () => clearTimeout(timer);
  }, [glowAnim, delay]);

  const scale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2],
  });

  const opacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 0.3],
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          left: x,
          top: y,
          backgroundColor: color,
          transform: [{ scale }],
          opacity,
        },
      ]}
    />
  );
};

const SimpleAnimatedChipBackground: React.FC<SimpleAnimatedChipBackgroundProps> = ({ 
  backgroundColor, 
  colors 
}) => {
  // Generate random positions for elements
  const circles = React.useMemo(() => {
    const items = [];
    for (let i = 0; i < 12; i++) {
      items.push({
        id: i,
        color: colors[i % colors.length],
        delay: i,
        x: Math.random() * (screenWidth - 40) + 20,
        y: Math.random() * (screenHeight - 40) + 20,
        size: 12 + Math.random() * 16,
      });
    }
    return items;
  }, [colors]);

  const lines = React.useMemo(() => {
    const items = [];
    for (let i = 0; i < 6; i++) {
      items.push({
        id: i,
        color: colors[i % colors.length],
        delay: i,
      });
    }
    return items;
  }, [colors]);

  const dots = React.useMemo(() => {
    const items = [];
    for (let i = 0; i < 20; i++) {
      items.push({
        id: i,
        color: colors[i % colors.length],
        delay: i,
        x: Math.random() * (screenWidth - 20) + 10,
        y: Math.random() * (screenHeight - 20) + 10,
      });
    }
    return items;
  }, [colors]);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Glowing dots */}
      {dots.map((dot) => (
        <GlowingDot
          key={`dot-${dot.id}`}
          color={dot.color}
          delay={dot.delay}
          x={dot.x}
          y={dot.y}
        />
      ))}

      {/* Pulsing circles */}
      {circles.map((circle) => (
        <PulsingCircle
          key={`circle-${circle.id}`}
          color={circle.color}
          delay={circle.delay}
          x={circle.x}
          y={circle.y}
          size={circle.size}
        />
      ))}

      {/* Flowing lines */}
      {lines.map((line) => (
        <FlowingLine
          key={`line-${line.id}`}
          color={line.color}
          delay={line.delay}
        />
      ))}

      {/* Semi-transparent overlay for text readability */}
      <View style={styles.overlay} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  circle: {
    position: 'absolute',
    shadowColor: '#0066ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  line: {
    position: 'absolute',
    width: 60,
    height: 3,
    borderRadius: 1.5,
    shadowColor: '#00d4aa',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 6,
  },
  dot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    shadowColor: '#3385ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 4,
    elevation: 4,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
});

export default SimpleAnimatedChipBackground;
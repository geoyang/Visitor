import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';

interface WaterfallBackgroundProps {
  backgroundColor: string;
  colors: string[];
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Water droplet component
const WaterDroplet: React.FC<{ 
  color: string; 
  delay: number; 
  x: number;
  speed: number;
}> = ({ color, delay, x, speed }) => {
  const fallAnim = useRef(new Animated.Value(-20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startAnimation = () => {
      // Reset position
      fallAnim.setValue(-20);
      opacityAnim.setValue(0);
      
      // Start falling animation
      Animated.parallel([
        Animated.timing(fallAnim, {
          toValue: screenHeight + 50,
          duration: speed,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0.8,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.3,
            duration: speed - 600,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      ]).start(() => {
        // Restart animation with random delay
        setTimeout(startAnimation, Math.random() * 2000 + 500);
      });
    };

    const timer = setTimeout(startAnimation, delay);
    return () => clearTimeout(timer);
  }, [fallAnim, opacityAnim, delay, speed]);

  return (
    <Animated.View
      style={[
        styles.droplet,
        {
          left: x,
          backgroundColor: color,
          transform: [{ translateY: fallAnim }],
          opacity: opacityAnim,
        },
      ]}
    />
  );
};

// Floating bubble component
const FloatingBubble: React.FC<{ 
  color: string; 
  delay: number; 
  x: number;
  y: number;
  size: number;
}> = ({ color, delay, x, y, size }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const startAnimation = () => {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(floatAnim, {
              toValue: -30,
              duration: 3000 + delay * 100,
              useNativeDriver: true,
            }),
            Animated.timing(floatAnim, {
              toValue: 30,
              duration: 3000 + delay * 100,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.2,
              duration: 2000 + delay * 50,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 0.8,
              duration: 2000 + delay * 50,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    };

    const timer = setTimeout(startAnimation, delay * 200);
    return () => clearTimeout(timer);
  }, [floatAnim, scaleAnim, delay]);

  return (
    <Animated.View
      style={[
        styles.bubble,
        {
          left: x - size / 2,
          top: y - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          transform: [
            { translateY: floatAnim },
            { scale: scaleAnim }
          ],
        },
      ]}
    />
  );
};

// Ripple effect component
const WaterRipple: React.FC<{ 
  color: string; 
  delay: number; 
  x: number;
  y: number;
}> = ({ color, delay, x, y }) => {
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startAnimation = () => {
      rippleAnim.setValue(0);
      opacityAnim.setValue(0);
      
      Animated.parallel([
        Animated.timing(rippleAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0.6,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: true,
          }),
        ])
      ]).start(() => {
        setTimeout(startAnimation, Math.random() * 3000 + 1000);
      });
    };

    const timer = setTimeout(startAnimation, delay * 300);
    return () => clearTimeout(timer);
  }, [rippleAnim, opacityAnim, delay]);

  const scale = rippleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 4],
  });

  return (
    <Animated.View
      style={[
        styles.ripple,
        {
          left: x - 15,
          top: y - 15,
          borderColor: color,
          transform: [{ scale }],
          opacity: opacityAnim,
        },
      ]}
    />
  );
};

// Flowing stream component
const FlowingStream: React.FC<{ 
  color: string; 
  delay: number;
  startY: number;
}> = ({ color, delay, startY }) => {
  const flowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startAnimation = () => {
      Animated.loop(
        Animated.timing(flowAnim, {
          toValue: 1,
          duration: 8000 + delay * 300,
          useNativeDriver: true,
        })
      ).start();
    };

    const timer = setTimeout(startAnimation, delay * 100);
    return () => clearTimeout(timer);
  }, [flowAnim, delay]);

  const translateX = flowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-screenWidth * 0.3, screenWidth * 1.3],
  });

  const opacity = flowAnim.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0, 0.4, 0.4, 0],
  });

  return (
    <Animated.View
      style={[
        styles.stream,
        {
          top: startY,
          backgroundColor: color,
          transform: [{ translateX }],
          opacity,
        },
      ]}
    />
  );
};

const WaterfallBackground: React.FC<WaterfallBackgroundProps> = ({ 
  backgroundColor, 
  colors 
}) => {
  // Generate water droplets
  const droplets = React.useMemo(() => {
    const items = [];
    for (let i = 0; i < 25; i++) {
      items.push({
        id: i,
        color: colors[i % colors.length],
        delay: i * 200,
        x: Math.random() * screenWidth,
        speed: 3000 + Math.random() * 2000,
      });
    }
    return items;
  }, [colors]);

  // Generate floating bubbles
  const bubbles = React.useMemo(() => {
    const items = [];
    for (let i = 0; i < 8; i++) {
      items.push({
        id: i,
        color: colors[i % colors.length],
        delay: i,
        x: Math.random() * (screenWidth - 40) + 20,
        y: Math.random() * (screenHeight - 40) + 20,
        size: 15 + Math.random() * 25,
      });
    }
    return items;
  }, [colors]);

  // Generate ripples
  const ripples = React.useMemo(() => {
    const items = [];
    for (let i = 0; i < 6; i++) {
      items.push({
        id: i,
        color: colors[i % colors.length],
        delay: i,
        x: Math.random() * screenWidth,
        y: screenHeight * 0.6 + Math.random() * (screenHeight * 0.4),
      });
    }
    return items;
  }, [colors]);

  // Generate flowing streams
  const streams = React.useMemo(() => {
    const items = [];
    for (let i = 0; i < 4; i++) {
      items.push({
        id: i,
        color: colors[i % colors.length],
        delay: i,
        startY: screenHeight * 0.2 + i * (screenHeight * 0.15),
      });
    }
    return items;
  }, [colors]);

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Flowing streams */}
      {streams.map((stream) => (
        <FlowingStream
          key={`stream-${stream.id}`}
          color={stream.color}
          delay={stream.delay}
          startY={stream.startY}
        />
      ))}

      {/* Water droplets */}
      {droplets.map((droplet) => (
        <WaterDroplet
          key={`droplet-${droplet.id}`}
          color={droplet.color}
          delay={droplet.delay}
          x={droplet.x}
          speed={droplet.speed}
        />
      ))}

      {/* Floating bubbles */}
      {bubbles.map((bubble) => (
        <FloatingBubble
          key={`bubble-${bubble.id}`}
          color={bubble.color}
          delay={bubble.delay}
          x={bubble.x}
          y={bubble.y}
          size={bubble.size}
        />
      ))}

      {/* Water ripples */}
      {ripples.map((ripple) => (
        <WaterRipple
          key={`ripple-${ripple.id}`}
          color={ripple.color}
          delay={ripple.delay}
          x={ripple.x}
          y={ripple.y}
        />
      ))}

      {/* Gentle overlay for text readability */}
      <View style={styles.overlay} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  droplet: {
    position: 'absolute',
    width: 3,
    height: 8,
    borderRadius: 1.5,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  bubble: {
    position: 'absolute',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  ripple: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
  },
  stream: {
    position: 'absolute',
    width: screenWidth * 0.6,
    height: 4,
    borderRadius: 2,
    shadowColor: '#0891b2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 2,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(6, 95, 70, 0.15)',
  },
});

export default WaterfallBackground;
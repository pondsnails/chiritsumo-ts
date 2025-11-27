import React, { PropsWithChildren } from 'react';
import { Pressable, PressableProps } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface PressableScaleProps extends PressableProps {
  scaleFrom?: number;
  scaleTo?: number;
  springStiffness?: number;
  springDamping?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PressableScale({
  children,
  scaleFrom = 1,
  scaleTo = 0.97,
  springStiffness = 280,
  springDamping = 20,
  ...rest
}: PropsWithChildren<PressableScaleProps>) {
  const s = useSharedValue(scaleFrom);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));

  return (
    <AnimatedPressable
      onPressIn={(e) => {
        rest.onPressIn?.(e);
        s.value = withSpring(scaleTo, { stiffness: springStiffness, damping: springDamping });
      }}
      onPressOut={(e) => {
        rest.onPressOut?.(e);
        s.value = withSpring(scaleFrom, { stiffness: springStiffness, damping: springDamping });
      }}
      style={[rest.style as any, style]}
      android_ripple={{ color: 'rgba(255,255,255,0.05)' }}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

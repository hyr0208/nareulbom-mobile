import { useEffect, useRef, type ComponentProps, type ReactNode } from 'react';
import { Animated, Easing, Platform, StyleSheet } from 'react-native';
import { PlatformPressable } from 'expo-router/react-navigation';
import { colors } from '@/constants/theme';

const nativeDriver = Platform.OS !== 'web';
type ButtonProps = ComponentProps<typeof PlatformPressable> & { reducedMotion: boolean };
export function AnimatedTabButton({ reducedMotion, style, onPressIn, onPressOut, ...props }: ButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => { if (reducedMotion) { scale.stopAnimation(); scale.setValue(1); } }, [reducedMotion, scale]);
  useEffect(() => () => scale.stopAnimation(), [scale]);
  return <PlatformPressable {...props} style={[style, { transform: [{ scale }] }]} pressOpacity={1}
    onPressIn={event => {
      scale.stopAnimation();
      if (!reducedMotion) Animated.timing(scale, { toValue: 0.94, duration: 80, easing: Easing.out(Easing.quad), useNativeDriver: nativeDriver, isInteraction: false }).start();
      onPressIn?.(event);
    }}
    onPressOut={event => {
      scale.stopAnimation();
      if (!reducedMotion) Animated.spring(scale, { toValue: 1, speed: 28, bounciness: 3, useNativeDriver: nativeDriver, isInteraction: false }).start();
      else scale.setValue(1);
      onPressOut?.(event);
    }} />;
}

export function AnimatedTabIcon({ focused, reducedMotion, children }: { focused: boolean; reducedMotion: boolean; children: ReactNode }) {
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    progress.stopAnimation();
    if (reducedMotion) { progress.setValue(focused ? 1 : 0); return; }
    const animation = Animated.timing(progress, { toValue: focused ? 1 : 0, duration: 170, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver, isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [focused, reducedMotion, progress]);
  return <Animated.View accessible={false} style={styles.frame}>
    <Animated.View pointerEvents="none" style={[styles.highlight, { opacity: progress, transform: [{ scaleX: progress.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }) }] }]} />
    <Animated.View style={{ transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -1] }) }] }}>{children}</Animated.View>
  </Animated.View>;
}
const styles = StyleSheet.create({
  frame: { width: 48, height: 30, alignItems: 'center', justifyContent: 'center' },
  highlight: { position: 'absolute', width: 48, height: 30, borderRadius: 12, backgroundColor: colors.pale },
});

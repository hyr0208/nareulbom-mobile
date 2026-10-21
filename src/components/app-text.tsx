import { forwardRef } from 'react';
import { StyleSheet, Text as NativeText, type TextProps } from 'react-native';
import { fonts } from '@/constants/fonts';

// Use an actual font file per weight, avoiding platform-specific synthetic bold.
export const Text = forwardRef<NativeText, TextProps>(function AppText({ style, ...props }, ref) {
  const weight = StyleSheet.flatten(style)?.fontWeight;
  const numericWeight = weight === 'bold' ? 700 : Number(weight || 400);
  const fontFamily = numericWeight >= 700 ? fonts.bold : numericWeight >= 600 ? fonts.semibold : numericWeight >= 500 ? fonts.medium : fonts.regular;
  return <NativeText {...props} ref={ref} style={[style, { fontFamily, fontWeight: 'normal' }]} />;
});

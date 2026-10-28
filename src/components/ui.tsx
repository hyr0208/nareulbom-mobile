import { WellnessIcon, type WellnessIconKind } from '@/components/wellness-icon';
import { fonts } from '@/constants/fonts';
import { Text } from '@/components/app-text';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors as c } from '@/constants/theme';
export function Page({ eyebrow, title, description, icon, children }: { eyebrow: string; title: string; description?: string; icon?: WellnessIconKind; children: ReactNode }) {
  return <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.scroll}>
    <View style={s.container}>{icon ? <View style={s.pageHeading}><View style={s.pageHeadingCopy}><Text style={s.eyebrow}>{eyebrow}</Text><Text accessibilityRole="header" style={s.title}>{title}</Text></View><WellnessIcon kind={icon}/></View> : <><Text style={s.eyebrow}>{eyebrow}</Text><Text accessibilityRole="header" style={s.title}>{title}</Text></>}
    {description && <Text style={s.description}>{description}</Text>}{children}</View>
  </ScrollView></SafeAreaView>;
}
export function Card({ children, tone = 'white' }: { children: ReactNode; tone?: 'white' | 'green' | 'peach' }) {
  return <View style={[s.card, { backgroundColor: tone === 'green' ? c.pale : tone === 'peach' ? c.peach : c.paper }]}>{children}</View>;
}
export function Expandable({ title, children }: { title: string; children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  return <View style={s.expandable}><Pressable accessibilityRole="button" accessibilityState={{expanded}} onPress={() => setExpanded(!expanded)} style={s.expandableHeader}><Text style={s.expandableTitle}>{title}</Text><Text style={s.expandableChevron}>{expanded ? '−' : '+'}</Text></Pressable>{expanded && <View style={s.expandableContent}>{children}</View>}</View>;
}
export function Heading({ children }: { children: ReactNode }) { return <Text accessibilityRole="header" style={s.heading}>{children}</Text>; }
export function Body({ children }: { children: ReactNode }) { return <Text style={s.body}>{children}</Text>; }
export function Note({ children }: { children: ReactNode }) { return <Text style={s.note}>{children}</Text>; }
export function Button({ label, onPress, secondary = false, disabled = false }: { label: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondary, { opacity: disabled ? 0.45 : pressed ? 0.75 : 1 }]}>
    <Text style={[s.buttonText, secondary && { color: c.green }]}>{label}</Text></Pressable>;
}
export const s = StyleSheet.create({
  expandable: { borderWidth: 1, borderColor: c.line, borderRadius: 14, backgroundColor: c.paper }, expandableHeader: { minHeight: 56, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, expandableTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: c.ink }, expandableChevron: { fontSize: 22, color: c.green }, expandableContent: { padding: 16, paddingTop: 0, gap: 14 },
  pageHeading: { flexDirection: 'row', alignItems: 'center', gap: 16 }, pageHeadingCopy: { flex: 1, gap: 12 },
  safe: { flex: 1, backgroundColor: c.background }, scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  container: { width: '100%', maxWidth: 680, alignSelf: 'center', gap: 20 },
  eyebrow: { color: c.green, fontSize: 12, fontWeight: '700', letterSpacing: 0 },
  title: { fontSize: 28, lineHeight: 39, fontWeight: '700', color: c.ink, letterSpacing: -1 },
  description: { fontSize: 15, lineHeight: 25, color: c.muted, marginTop: -8 },
  card: { borderRadius: 14, padding: 20, gap: 13, borderWidth: 1, borderColor: c.line },
  heading: { fontSize: 19, lineHeight: 28, fontWeight: '700', color: c.ink },
  body: { fontSize: 15, lineHeight: 25, color: '#62676E' }, note: { fontSize: 12, lineHeight: 20, color: c.muted },
  button: { minHeight: 48, backgroundColor: c.green, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  secondary: { backgroundColor: c.pale }, buttonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  input: { fontFamily: fonts.regular, minHeight: 52, borderWidth: 1, borderColor: c.line, backgroundColor: c.paper, borderRadius: 10, paddingHorizontal: 16, color: c.ink, fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
});

import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, type ColorValue } from 'react-native';
import { SessionProvider } from '@/data/session';
import { colors as c } from '@/constants/theme';
const tabs = [
  { name: 'index', title: '홈', icon: 'home' }, { name: 'search', title: '검색', icon: 'search' },
  { name: 'medicines', title: '복용함', icon: 'box' }, { name: 'guide', title: '가이드', icon: 'guide' },
  { name: 'profile', title: '내 정보', icon: 'user' },
] as const;
export default function Layout() {
  return <SessionProvider><StatusBar style="dark" /><Tabs screenOptions={{ headerShown: false,
    tabBarActiveTintColor: c.green, tabBarInactiveTintColor: c.muted,
    tabBarStyle: { backgroundColor: c.paper, borderTopColor: c.line }, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
  }}>{tabs.map(tab => <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title,
    tabBarIcon: ({ color }) => <TabIcon name={tab.icon} color={color} />,
  }} />)}</Tabs></SessionProvider>;
}

function TabIcon({ name, color }: { name: 'home' | 'search' | 'box' | 'guide' | 'user'; color: ColorValue }) {
  const stroke = { borderColor: color };
  return <View accessible={false} style={icons.frame}>
    {name === 'home' && <><View style={[icons.roof, stroke]} /><View style={[icons.house, stroke]} /><View style={[icons.door, stroke]} /></>}
    {name === 'search' && <><View style={[icons.lens, stroke]} /><View style={[icons.handle, { backgroundColor: color }]} /></>}
    {name === 'box' && <><View style={[icons.box, stroke]} /><View style={[icons.boxLine, { backgroundColor: color }]} /></>}
    {name === 'guide' && <><View style={[icons.book, stroke]} /><View style={[icons.bookSpine, { backgroundColor: color }]} /></>}
    {name === 'user' && <><View style={[icons.head, stroke]} /><View style={[icons.shoulders, stroke]} /></>}
  </View>;
}
const icons = StyleSheet.create({
  frame: { width: 24, height: 24 }, roof: { position: 'absolute', width: 13, height: 13, borderLeftWidth: 1.6, borderTopWidth: 1.6, transform: [{ rotate: '45deg' }], top: 3, left: 5.5 },
  house: { position: 'absolute', top: 10, left: 4, width: 16, height: 11, borderLeftWidth: 1.6, borderRightWidth: 1.6, borderBottomWidth: 1.6, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  door: { position: 'absolute', left: 10, top: 14, width: 4, height: 7, borderWidth: 1.4, borderBottomWidth: 0 },
  lens: { position: 'absolute', left: 3, top: 3, width: 14, height: 14, borderRadius: 8, borderWidth: 1.6 }, handle: { position: 'absolute', top: 17, left: 15, width: 7, height: 1.6, transform: [{ rotate: '45deg' }] },
  box: { position: 'absolute', left: 4, top: 5, width: 16, height: 16, borderRadius: 3, borderWidth: 1.6 }, boxLine: { position: 'absolute', top: 10, left: 4, width: 16, height: 1.4 },
  book: { position: 'absolute', top: 4, left: 3, width: 18, height: 17, borderWidth: 1.6, borderRadius: 3 }, bookSpine: { position: 'absolute', top: 4, left: 11.5, height: 17, width: 1.4 },
  head: { position: 'absolute', top: 2, left: 8, width: 8, height: 8, borderRadius: 5, borderWidth: 1.6 }, shoulders: { position: 'absolute', top: 13, left: 4, width: 16, height: 8, borderWidth: 1.6, borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
});

import { Text } from '@/components/app-text';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Page, Note } from '@/components/ui';
import { colors as c } from '@/constants/theme';
import { useSession } from '@/data/session';

export default function Home() {
  const router = useRouter();
  const { medicines } = useSession();
  return <Page eyebrow="나를봄" title="나를 챙기는 일상" description="약 정보부터 매일의 건강관리까지.">
    <Pressable accessibilityRole="button" accessibilityLabel="약 검색하기" onPress={() => router.push('/search')} style={({ pressed }) => [local.search, { opacity: pressed ? 0.6 : 1 }]}>
      <View accessible={false} style={local.searchIcon}><View style={local.searchCircle} /><View style={local.searchHandle} /></View>
      <Text style={local.searchText}>궁금한 약을 검색해 보세요</Text>
    </Pressable>
    <View style={local.section}>
      <View style={local.sectionHeader}><View style={local.labelRow}><Text accessibilityRole="header" style={local.heading}>내 복용함</Text><Text style={local.count}>{medicines.length}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="복용함 전체 보기" onPress={() => router.push('/medicines')} style={local.textButton}><Text style={local.more}>전체 보기</Text></Pressable></View>
      {medicines.length ? <Pressable accessibilityRole="button" onPress={() => router.push('/medicines')} style={local.product}><Text style={local.productName}>{medicines[0].name}</Text><Text style={local.caption}>{medicines.length}개 제품 등록</Text></Pressable> : <View style={local.empty}><Text style={local.emptyTitle}>등록한 약이 없어요</Text><Text style={local.caption}>먹고 있는 약을 한곳에 모아보세요.</Text></View>}
      <Pressable accessibilityRole="button" onPress={() => router.push('/search')} style={({ pressed }) => [local.addButton, { opacity: pressed ? 0.65 : 1 }]}><Text style={local.addText}>약 등록하기</Text></Pressable>
    </View>
    <View style={local.divider} />
    <View style={local.section}>
      <Text accessibilityRole="header" style={local.heading}>건강 알아보기</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="건강 가이드 보기" onPress={() => router.push('/guide')} style={({ pressed }) => [local.menuRow, { opacity: pressed ? 0.6 : 1 }]}><View style={local.menuCopy}><Text style={local.menuTitle}>건강 가이드</Text><Text style={local.caption}>질환과 영양소에 관한 정보</Text></View><Text accessible={false} style={local.chevron}>›</Text></Pressable>
      <View style={local.hairline} />
      <Pressable accessibilityRole="button" accessibilityLabel="내 정보 보기" onPress={() => router.push('/profile')} style={({ pressed }) => [local.menuRow, { opacity: pressed ? 0.6 : 1 }]}><View style={local.menuCopy}><Text style={local.menuTitle}>나의 건강정보</Text><Text style={local.caption}>건강 프로필과 계정 관리</Text></View><Text accessible={false} style={local.chevron}>›</Text></Pressable>
    </View>
    <Note>개발 미리보기 · 복용 목록은 앱 실행 중에만 유지돼요.</Note>
  </Page>;
}
const local = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 56, paddingHorizontal: 18, borderRadius: 12, backgroundColor: '#F5F6F7', marginTop: 7 },
  searchText: { color: '#73777E', fontSize: 14, flex: 1 }, searchIcon: { width: 18, height: 20 },
  searchCircle: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.6, borderColor: '#747A80', position: 'absolute', top: 1, left: 0 },
  searchHandle: { width: 7, height: 1.6, borderRadius: 1, backgroundColor: '#747A80', position: 'absolute', left: 11, top: 14, transform: [{ rotate: '45deg' }] },
  section: { gap: 8, paddingTop: 10 }, sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, heading: { color: c.ink, fontSize: 18, fontWeight: '600', lineHeight: 28 },
  count: { fontSize: 16, color: c.green, fontWeight: '600' }, textButton: { minHeight: 44, paddingLeft: 16, justifyContent: 'center' }, more: { color: c.muted, fontSize: 12 },
  empty: { alignItems: 'center', paddingVertical: 28, gap: 8 }, emptyTitle: { fontSize: 15, fontWeight: '500', color: '#484D53' }, caption: { fontSize: 13, lineHeight: 21, color: c.muted },
  addButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: c.green, borderRadius: 10 }, addText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  divider: { height: 1, backgroundColor: c.line, marginTop: 12 }, hairline: { height: 1, backgroundColor: c.line },
  menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 19, gap: 15 }, menuCopy: { flex: 1, gap: 5 }, menuTitle: { color: c.ink, fontSize: 16, fontWeight: '500', lineHeight: 24 }, chevron: { color: '#969BA1', fontSize: 24 },
  product: { gap: 6, paddingVertical: 24 }, productName: { fontSize: 16, lineHeight: 24, color: c.ink },
});

import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, TextInput, View } from 'react-native';
import { Page, Card, Heading, Body, Note, Button, s } from '@/components/ui';
import { colors as c } from '@/constants/theme';
import { searchDrugs, type Drug } from '@/services/api';
import { useSession } from '@/data/session';
export default function Search() {
  const [query, setQuery] = useState(''); const [items, setItems] = useState<Drug[]>([]);
  const [selected, setSelected] = useState<Drug | null>(null); const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); const [searched, setSearched] = useState(false);
  const active = useRef<AbortController | null>(null); const { medicines, addMedicine } = useSession();
  useEffect(() => () => active.current?.abort(), []);
  async function search() {
    const q = query.trim(); if (!q) return;
    active.current?.abort(); const controller = new AbortController(); active.current = controller;
    setLoading(true); setError(''); setItems([]); setSelected(null); setSearched(true);
    const timer = setTimeout(() => controller.abort(), 15000);
    try { const result = await searchDrugs(q, controller.signal); if (active.current === controller) setItems(result); }
    catch (e) { if (active.current === controller) setError(controller.signal.aborted ? '검색 시간이 길어지고 있어요. 다시 시도해 주세요.' : e instanceof Error ? e.message : '검색하지 못했어요.'); }
    finally { clearTimeout(timer); if (active.current === controller) setLoading(false); }
  }
  return <Page eyebrow="찾아봄" title="궁금한 약, 찾아보세요." description="식약처 e약은요의 의약품 정보를 확인해요.">
    <TextInput accessibilityLabel="의약품 제품명" placeholder="의약품 제품명을 입력하세요" placeholderTextColor={c.muted} style={s.input} value={query} maxLength={100} onChangeText={setQuery} returnKeyType="search" onSubmitEditing={() => void search()} />
    <Button label="의약품 검색" disabled={loading || !query.trim()} onPress={() => void search()} />
    <Note>현재 제품명 검색을 지원해요. 영양제·성분 검색은 준비 중이에요.</Note>
    {loading && <ActivityIndicator accessibilityLabel="검색 중" color={c.green} />}
    {error ? <Card tone="peach"><Heading>검색을 완료하지 못했어요</Heading><Body>{error}</Body></Card> : null}
    {searched && !loading && !error && !items.length && <Card><Body>검색 결과가 없어요. 제품명을 다시 확인해 주세요.</Body><Note>e약은요에 공개되지 않은 제품은 검색되지 않을 수 있어요.</Note></Card>}
    {!searched && <Card tone="green"><Heading>이름과 제조사를 함께 확인해요</Heading><Body>비슷한 이름의 약도 제품과 함량이 다를 수 있어요. 정확한 제품을 선택해 주세요.</Body></Card>}
    {items.map(drug => <Card key={drug.id}><Note>{drug.manufacturer}</Note><Heading>{drug.name}</Heading><Button secondary label={selected?.id === drug.id ? '상세 닫기' : '제품 정보 보기'} onPress={() => setSelected(selected?.id === drug.id ? null : drug)} />
      {selected?.id === drug.id && <View style={{ gap: 15 }}>{[
        ['효능', drug.effect], ['사용법', drug.usage], ['주의 경고', drug.warning], ['주의사항', drug.precaution],
        ['상호작용', drug.interaction], ['부작용', drug.sideEffect], ['보관법', drug.storage],
      ].map(([label, content]) => <View key={label} style={{ gap: 5 }}><Heading>{label}</Heading><Body>{content || '제공된 정보가 없어요. 설명서 또는 약사에게 확인해 주세요.'}</Body></View>)}
      <Note>출처: 식약처 e약은요 · 원문 수정일: {drug.updatedAt || '미제공'}</Note>
      <Button secondary label="식약처 원문 열기" onPress={() => void Linking.openURL(drug.sourceUrl)} />
      <Button label={medicines.some(m => m.id === drug.id) ? '복용함에 등록됨' : '이 제품을 복용함에 추가'} disabled={medicines.some(m => m.id === drug.id)} onPress={() => addMedicine(drug)} />
      <Note>제품 목록 등록 기능이에요. 복용량·일정 및 개인별 적합성을 확인한 결과는 아니에요.</Note></View>}
    </Card>)}
  </Page>;
}

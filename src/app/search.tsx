import { ManualMedicineForm } from '@/components/manual-medicine';
import { Pressable } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, TextInput, View } from 'react-native';
import { Page, Card, Heading, Body, Note, Button } from '@/components/ui';
import { DrugDetail } from '@/components/drug-detail';
import { Text } from '@/components/app-text';
import { colors as c } from '@/constants/theme';
import { s } from '@/components/ui';
import { searchDrugs, type Drug } from '@/services/api';
import { useSession } from '@/data/session';
export default function Search({onDone}:{onDone?:()=>void} = {}) {
  const [source,setSource]=useState<'easy'|'permit'>('easy');const [submittedSource,setSubmittedSource]=useState<'easy'|'permit'>('easy');
  const [manual,setManual]=useState(false);
  const [query, setQuery] = useState(''); const [submitted, setSubmitted] = useState('');
  const [items, setItems] = useState<Drug[]>([]); const [selected, setSelected] = useState<Drug | null>(null);
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false); const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0); const [hasMore, setHasMore] = useState(false);
  const active = useRef<AbortController | null>(null); const { medicines } = useSession();
  useEffect(() => () => { active.current?.abort(); active.current = null; }, []);
  async function search(more = false) {
    // Additional pages always use the submitted query, even when the input has changed.
    if (more && active.current) return;
    const q = more ? submitted : query.trim(); if (!q) return;
    Keyboard.dismiss(); active.current?.abort(); const controller = new AbortController(); active.current = controller;
    const nextPage = more ? page + 1 : 1;const searchSource=more?submittedSource:source;
    setLoading(true); setError('');
    if (!more) { setSubmitted(q); setSubmittedSource(searchSource); setItems([]); setSelected(null); setPage(0); setTotal(0); setHasMore(false); setSearched(true); }
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const result = await searchDrugs(q, nextPage, controller.signal, searchSource);
      if (active.current !== controller) return;
      setItems(old => {
        if (!more) return result.items;
        const seen = new Set(old.map(item => item.id));
        return [...old, ...result.items.filter(item => !seen.has(item.id))];
      });
      setTotal(result.total); setPage(result.page); setHasMore(result.hasMore);
    } catch (e) {
      if (active.current === controller) setError(controller.signal.aborted ? '검색 시간이 길어지고 있어요. 다시 시도해 주세요.' : e instanceof Error ? e.message : '검색하지 못했어요.');
    } finally { clearTimeout(timer); if (active.current === controller) { active.current = null; setLoading(false); } }
  }
  return <>
    <Page eyebrow="찾아봄" title="궁금한 약, 찾아보세요." description="제품명으로 검색하고 정확한 약을 확인해요.">
      {onDone && <Button secondary label="문진으로 돌아가기" onPress={onDone} />}
      <View accessibilityRole="radiogroup" style={{flexDirection:'row',gap:10}}>{([['easy','일반약 설명'],['permit','전체 의약품']] as const).map(([value,label])=><Pressable key={value} accessibilityRole="radio" accessibilityState={{checked:source===value}} onPress={()=>{
        if(source===value)return;active.current?.abort();active.current=null;setLoading(false);setSource(value);setSearched(false);setItems([]);setError('');setPage(0);setTotal(0);setHasMore(false);setSelected(null);
      }} style={{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:10,borderWidth:1,borderColor:source===value?c.green:c.line,backgroundColor:source===value?c.pale:c.paper}}><Text style={{color:c.ink}}>{label}</Text></Pressable>)}</View>
      <TextInput accessibilityLabel="의약품 제품명" placeholder="의약품 제품명을 입력하세요" placeholderTextColor={c.muted} style={s.input} value={query} maxLength={100} onChangeText={setQuery} returnKeyType="search" onSubmitEditing={() => void search()} />
      <Button label="의약품 검색" disabled={!query.trim()} onPress={() => void search()} />
      <Note>{source==='easy'?'e약은요에 공개된 일부 일반의약품 설명을 검색해요. 처방약은 전체 의약품에서 찾아보세요.':'식약처 허가정보에서 처방약을 포함한 의약품을 검색해요. 검색 결과가 현재 판매·유통 여부를 보장하지는 않아요.'}</Note>
      <Button secondary label="검색되지 않는 약 직접 등록" onPress={()=>setManual(true)} />
      {!searched && <Card><Heading>포장의 제품명을 확인해 주세요</Heading><Body>이름이 비슷해도 함량과 제형이 다를 수 있어요. 검색 결과에서 제품명과 제조사를 함께 확인해 주세요.</Body></Card>}
      {searched && page > 0 && <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={{ color: c.ink, flex: 1, fontSize: 14 }}>‘{submitted}’ 검색 결과</Text><Note>{items.length} / {total}개</Note></View>}
      {error && !items.length ? <Card><Heading>검색을 완료하지 못했어요</Heading><Body>{error}</Body><Button secondary label="다시 검색" onPress={() => void search()} /></Card> : null}
      {searched && !loading && !error && !items.length && <Card><Heading>검색 결과가 없어요</Heading><Body>제품명 철자를 확인하거나 짧게 입력해 보세요.</Body><Note>검색되지 않는다고 허가되지 않은 약이거나 복용하면 안 되는 약이라는 뜻은 아니에요. 포장이나 약국에서 제품을 확인해 주세요.</Note></Card>}
      {items.map(drug => <Card key={drug.id}><Note>{drug.manufacturer || '제조사 정보 미제공'}</Note><Heading>{drug.name}</Heading><Note>{drug.source==='permit'?'식약처 허가정보':'e약은요'}{drug.classification?` · ${drug.classification}`:''}</Note><Note>품목기준코드 {drug.id}{medicines.some(item => item.id === drug.id) ? ' · 복용함에 등록됨' : ''}</Note><Button secondary label="상세 정보 보기" onPress={() => setSelected(drug)} /></Card>)}
      {error && items.length > 0 ? <Body>{error} 기존 검색 결과는 그대로 볼 수 있어요.</Body> : null}
      {loading && <ActivityIndicator accessibilityLabel="검색 중" color={c.green} />}
      {hasMore && <Button secondary label={error ? '다음 결과 다시 불러오기' : '검색 결과 더 보기'} disabled={loading} onPress={() => void search(true)} />}
    </Page>
    <ManualMedicineForm navigateOnSave={!onDone} visible={manual} initialName={query.trim()} onClose={()=>setManual(false)} />
    <DrugDetail onShowMedicines={onDone} drug={selected} onClose={() => setSelected(null)} />
  </>;
}

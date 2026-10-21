import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/app-text';
import { Page, Card, Heading, Body, Note, Button } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useSession } from '@/data/session';
import { fetchDrug, type Drug } from '@/services/api';
import type { Medicine } from '@/data/medicine-model';
import { StorageStatus } from '@/components/storage-status';

export function DrugDetail({ drug, onClose }: { drug: Medicine | null; onClose: () => void }) {
  const [confirmed, setConfirmed] = useState(false);
  const [resolved, setResolved] = useState<Drug | null>(null); const [detailError, setDetailError] = useState('');
  const [attempt, setAttempt] = useState(0); const [saveError, setSaveError] = useState('');
  const [linkError, setLinkError] = useState('');
  const { medicines, addMedicine, ready, busy, consentAt } = useSession();
  const router = useRouter();
  useEffect(() => { setConfirmed(false); setLinkError(''); setSaveError(''); }, [drug?.id]);
  useEffect(() => {
    setResolved(null); setDetailError('');
    if (!drug || drug.source === 'manual' || drug.detailsLoaded !== false) return;
    const controller = new AbortController(); let active = true;
    const timer = setTimeout(() => controller.abort(), 15000);
    void fetchDrug(drug.id, controller.signal, drug.source==='permit'?'permit':'easy').then(item => { if (active) setResolved(item); }).catch(error => { if (active) setDetailError(controller.signal.aborted ? '제품 조회 시간이 길어지고 있어요. 다시 시도해 주세요.' : error instanceof Error ? error.message : '제품 설명을 불러오지 못했어요.'); }).finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [drug?.id, drug?.detailsLoaded, drug?.source, attempt]);
  if (!drug) return null;
  if(drug.source==='manual')return <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}><Page eyebrow="직접 등록" title={drug.name} description="직접 입력한 제품 정보예요."> <Button secondary label="상세 닫기" onPress={onClose} /><Card><Heading>직접 등록 · 정보 미확인</Heading><Body>제품 종류: {drug.category==='supplement'?'영양제':'약'}</Body><Body>제조사: {drug.manufacturer||'미입력'}</Body><Body>제품 함량: {drug.strength||'미입력'}</Body><Note>공식 제품과 연결되지 않은 기록이에요. 성분·효능·주의사항·상호작용을 자동 판단하지 않아요. 포장·처방전 또는 약사에게 확인해 주세요.</Note></Card></Page></Modal>;
  const resolvedMatches = resolved?.id === drug.id && (resolved.source || 'easy') === (drug.source || 'easy');
  const detail = resolvedMatches ? resolved : drug;
  const needsFetch = drug.detailsLoaded === false && !resolvedMatches;
  const registered = medicines.some(item => item.id === drug.id);
  return <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <Page eyebrow="의약품 정보" title={drug.name} description={drug.manufacturer || '제조사 정보 미제공'}>
      <Button secondary label="상세 닫기" onPress={onClose} />
      <Note>품목기준코드 {drug.id} · 이름·함량·제형을 포장과 비교해 확인해 주세요.</Note>
      <StorageStatus /><Card><Heading>복용함에 등록하기</Heading>
        {registered ? <><Body>복용함에 등록된 제품이에요.</Body><Button label="복용함 보기" onPress={() => { onClose(); router.push('/medicines'); }} /></> : <>
          <Body>복용 중인 제품의 이름과 제조사가 맞는지 확인해 주세요.</Body>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: confirmed }} accessibilityLabel="제품명과 제조사를 확인했어요" onPress={() => setConfirmed(value => !value)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}>
            <View style={{ height: 22, width: 22, borderRadius: 5, borderWidth: 1, borderColor: confirmed ? colors.green : colors.muted, backgroundColor: confirmed ? colors.green : colors.paper, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.paper }}>{confirmed ? '✓' : ''}</Text></View>
            <Text style={{ flex: 1, color: colors.ink, fontSize: 14, lineHeight: 23 }}>제품명과 제조사를 확인했어요</Text>
          </Pressable>
          <Button label={consentAt ? "이 제품을 복용함에 추가" : "복용함에 임시 추가"} disabled={!confirmed || !ready || busy} onPress={() => { setSaveError(''); void addMedicine(detail).catch(e => setSaveError(e.message)); }} />
        </>}
        <Note>제품 목록만 등록해요. 복용량·일정 및 개인별 적합성을 확인한 결과는 아니에요. 기기 보관 동의 여부에 따라 보관 방식이 달라요.</Note>
      </Card>
      {detail.source==='permit'&&<Card><Heading>의약품 허가정보</Heading>{detail.classification?<Body>구분: {detail.classification}</Body>:null}{detail.ingredients?<Body>주성분: {detail.ingredients}</Body>:null}{detail.permitStatus?<Body>허가 상태: {detail.permitStatus}</Body>:null}<Note>아래 내용은 허가사항이에요. 표·상세 형식은 식약처 원문을 함께 확인해 주세요.</Note></Card>}
      {saveError ? <Body>{saveError}</Body> : null}
      {needsFetch ? <Card>{detailError ? <><Body>{detailError}</Body><Button secondary label="제품 설명 다시 불러오기" onPress={() => setAttempt(value => value + 1)} /></> : <><Body>제품 설명을 불러오는 중이에요.</Body><ActivityIndicator color={colors.green} /></>}</Card> : <>
      {(detail.source==='permit'? [['효능·효과',detail.effect],['용법·용량',detail.usage],['사용상 주의사항',detail.precaution],['보관법',detail.storage]] : [
        ['효능', detail.effect], ['사용법', detail.usage], ['주의 경고', detail.warning], ['주의사항', detail.precaution],
        ['상호작용', detail.interaction], ['부작용', detail.sideEffect], ['보관법', detail.storage],
      ]).map(([label, content]) => <View key={label} style={{ gap: 8, paddingVertical: 8 }}><Heading>{label}</Heading><Body>{content || '제공된 정보가 없어요. 제품 설명서 또는 약사에게 확인해 주세요.'}</Body></View>)}
      <Note>출처: {detail.source==='permit'?'식약처 의약품 허가정보':'식약처 e약은요'} · 원문 수정일: {detail.updatedAt || '미제공'}</Note></>}
      <Button secondary label="식약처 원문 열기" onPress={() => { setLinkError(''); void Linking.openURL(drug.sourceUrl).catch(() => setLinkError('원문을 열지 못했어요. 잠시 후 다시 시도해 주세요.')); }} />
      {linkError ? <Body>{linkError}</Body> : null}
    </Page>
  </Modal>;
}

import { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/app-text';
import { Page, Card, Heading, Body, Note, Button } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useSession } from '@/data/session';
import type { Drug } from '@/services/api';

export function DrugDetail({ drug, onClose }: { drug: Drug | null; onClose: () => void }) {
  const [confirmed, setConfirmed] = useState(false);
  const [linkError, setLinkError] = useState('');
  const { medicines, addMedicine } = useSession();
  const router = useRouter();
  useEffect(() => { setConfirmed(false); setLinkError(''); }, [drug?.id]);
  if (!drug) return null;
  const registered = medicines.some(item => item.id === drug.id);
  return <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <Page eyebrow="의약품 정보" title={drug.name} description={drug.manufacturer || '제조사 정보 미제공'}>
      <Button secondary label="상세 닫기" onPress={onClose} />
      <Note>품목기준코드 {drug.id} · 이름·함량·제형을 포장과 비교해 확인해 주세요.</Note>
      <Card><Heading>복용함에 등록하기</Heading>
        {registered ? <><Body>복용함에 등록된 제품이에요.</Body><Button label="복용함 보기" onPress={() => { onClose(); router.push('/medicines'); }} /></> : <>
          <Body>복용 중인 제품의 이름과 제조사가 맞는지 확인해 주세요.</Body>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: confirmed }} accessibilityLabel="제품명과 제조사를 확인했어요" onPress={() => setConfirmed(value => !value)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}>
            <View style={{ height: 22, width: 22, borderRadius: 5, borderWidth: 1, borderColor: confirmed ? colors.green : colors.muted, backgroundColor: confirmed ? colors.green : colors.paper, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.paper }}>{confirmed ? '✓' : ''}</Text></View>
            <Text style={{ flex: 1, color: colors.ink, fontSize: 14, lineHeight: 23 }}>제품명과 제조사를 확인했어요</Text>
          </Pressable>
          <Button label="이 제품을 복용함에 추가" disabled={!confirmed} onPress={() => addMedicine(drug)} />
        </>}
        <Note>제품 목록만 등록해요. 복용량·일정 및 개인별 적합성을 확인한 결과는 아니에요. 목록은 앱 실행 중에만 유지돼요.</Note>
      </Card>
      {[
        ['효능', drug.effect], ['사용법', drug.usage], ['주의 경고', drug.warning], ['주의사항', drug.precaution],
        ['상호작용', drug.interaction], ['부작용', drug.sideEffect], ['보관법', drug.storage],
      ].map(([label, content]) => <View key={label} style={{ gap: 8, paddingVertical: 8 }}><Heading>{label}</Heading><Body>{content || '제공된 정보가 없어요. 제품 설명서 또는 약사에게 확인해 주세요.'}</Body></View>)}
      <Note>출처: 식약처 e약은요 · 원문 수정일: {drug.updatedAt || '미제공'}</Note>
      <Button secondary label="식약처 원문 열기" onPress={() => { setLinkError(''); void Linking.openURL(drug.sourceUrl).catch(() => setLinkError('원문을 열지 못했어요. 잠시 후 다시 시도해 주세요.')); }} />
      {linkError ? <Body>{linkError}</Body> : null}
    </Page>
  </Modal>;
}

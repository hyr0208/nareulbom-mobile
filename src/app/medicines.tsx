import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { DrugDetail } from '@/components/drug-detail';
import { RegimenEditor } from '@/components/regimen-editor';
import { StorageStatus } from '@/components/storage-status';
import type { Medicine } from '@/data/medicine-model';
import { useRouter } from 'expo-router';
import { Page, Card, Heading, Body, Note, Button } from '@/components/ui';
import { useSession } from '@/data/session';
import { colors } from '@/constants/theme';
export default function Medicines() {
  const [selected, setSelected] = useState<Medicine | null>(null);
  const [editing, setEditing] = useState<string | null>(null); const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const router = useRouter(); const { medicines, removeMedicine, ready, busy } = useSession();
  return <><Page eyebrow="챙겨봄" title="나의 복용함" description="복용 중인 약과 직접 입력한 일정을 관리해요.">
    <StorageStatus />
    {!ready ? <ActivityIndicator color={colors.green} /> : medicines.length ? medicines.map(drug => <Card key={drug.id}>
      <Note>{drug.manufacturer}</Note><Heading>{drug.name}</Heading>
      {drug.regimen ? <><Body>1회 {drug.regimen.dose} · {drug.regimen.mode === 'asNeeded' ? '필요 시' : '매일'}</Body>{drug.regimen.mode === 'daily' && <Body>{drug.regimen.times.join(' · ')}</Body>}</> : <Body>복용량·일정 미등록</Body>}
      {editing === drug.id ? <RegimenEditor medicine={drug} onClose={() => setEditing(null)} /> : <Button label={drug.regimen ? '복용 일정 수정' : '복용량·시간 등록'} disabled={busy} onPress={() => { setDeleting(null); setEditing(drug.id); }} />}
      <Button secondary label="제품 정보 보기" onPress={() => setSelected(drug)} />
      {deleting === drug.id ? <View style={{ gap: 10 }}><Body>이 제품과 복용 일정을 복용함에서 삭제할까요?</Body><Button label="제품과 일정 삭제" disabled={busy} onPress={() => { setError(''); void removeMedicine(drug.id).then(() => setDeleting(null)).catch(e => setError(e.message)); }} /><Button secondary label="삭제 취소" disabled={busy} onPress={() => setDeleting(null)} /></View> : <Button secondary label="목록에서 삭제" disabled={busy} onPress={() => { setEditing(null); setDeleting(drug.id); }} />}
    </Card>) : <Card><Heading>나를 위한 첫 번째 기록</Heading><Body>정확한 제품을 확인한 후 복용함에 추가해 보세요.</Body></Card>}
    {error ? <Body>{error}</Body> : null}
    <Button label="약 검색해서 추가하기" onPress={() => router.push('/search')} />
    <Note>일정은 기록용이며 복용 알림은 아직 제공하지 않아요.</Note>
    <Card><Heading>조합 확인은 준비 중이에요</Heading><Body>등록된 약의 병용금기·중복 성분 분석은 아직 제공하지 않아요.</Body><Note>목록에 경고가 없다는 이유로 함께 복용해도 된다는 뜻은 아니에요.</Note></Card>
  </Page><DrugDetail drug={selected} onClose={() => setSelected(null)} /></>;
}

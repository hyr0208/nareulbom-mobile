import { AsNeededForm } from '@/components/as-needed-form';
import { ReminderSettings } from '@/components/reminder-settings';
import { ManualMedicineForm } from '@/components/manual-medicine';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { DrugDetail } from '@/components/drug-detail';
import { RegimenEditor } from '@/components/regimen-editor';
import { StorageStatus } from '@/components/storage-status';
import type { Medicine } from '@/data/medicine-model';
import { useRouter } from 'expo-router';
import { Page, Card, Heading, Body, Note, Button, Expandable } from '@/components/ui';
import { useSession } from '@/data/session';
import { colors } from '@/constants/theme';
export default function Medicines() {
  const [asNeededId,setAsNeededId] = useState<string>();
  const [manual,setManual]=useState(false);const [manualId,setManualId]=useState<string|undefined>();
  const [selected, setSelected] = useState<Medicine | null>(null);
  const [editing, setEditing] = useState<string | null>(null); const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const router = useRouter(); const { medicines, removeMedicine, ready, busy } = useSession();
  return <><Page icon="medicines" eyebrow="챙겨봄" title="나의 복용함" description="복용 중인 약과 직접 입력한 일정을 관리해요.">
    <Button secondary label="복용 기록 달력" onPress={() => router.push('/history')} />
    <Expandable title="보관 및 알림 설정"><StorageStatus /><ReminderSettings compact /></Expandable>
    {!ready ? <ActivityIndicator color={colors.green} /> : medicines.length ? medicines.map(drug => <Card key={drug.id}>
      <Note>{drug.source==='manual'?'직접 등록 · 정보 미확인':drug.source==='permit'?'식약처 허가정보':'e약은요'}</Note><Note>{drug.manufacturer||'제조사 미입력'}</Note><Heading>{drug.name}</Heading>{drug.strength?<Body>제품 함량: {drug.strength}</Body>:null}{drug.source==='manual'&&<Note>공식 제품과 연결되지 않아 성분·상호작용 정보를 확인할 수 없어요.</Note>}
      {drug.regimen ? <><Body>1회 {drug.regimen.dose} · {drug.regimen.mode === 'asNeeded' ? '필요 시' : '매일'}</Body>{drug.regimen.mode === 'daily' && <Body>{drug.regimen.times.join(' · ')}</Body>}</> : <Body>복용량·일정 미등록</Body>}
      <Expandable title="제품 관리">
      {editing === drug.id ? <RegimenEditor medicine={drug} onClose={() => setEditing(null)} /> : <Button label={drug.regimen ? '복용 일정 수정' : '복용량·시간 등록'} disabled={busy} onPress={() => { setDeleting(null); setEditing(drug.id); }} />}
      {drug.regimen?.mode==='asNeeded'&&<Button secondary label="먹었을 때 기록하기" disabled={busy} onPress={()=>setAsNeededId(drug.id)} />}
      {drug.source==='manual'&&<Button secondary label="직접 등록 정보 수정" disabled={busy} onPress={()=>{setManualId(drug.id);setManual(true);}} />}
      <Button secondary label="제품 정보 보기" onPress={() => setSelected(drug)} />
      {deleting === drug.id ? <View style={{ gap: 10 }}><Body>이 제품과 복용 일정·복용 기록을 복용함에서 삭제할까요?</Body><Button label="제품과 일정·기록 삭제" disabled={busy} onPress={() => { setError(''); void removeMedicine(drug.id).then(() => setDeleting(null)).catch(e => setError(e.message)); }} /><Button secondary label="삭제 취소" disabled={busy} onPress={() => setDeleting(null)} /></View> : <Button secondary label="목록에서 삭제" disabled={busy} onPress={() => { setEditing(null); setDeleting(drug.id); }} />}
      </Expandable>
    </Card>) : <Card><Heading>나를 위한 첫 번째 기록</Heading><Body>정확한 제품을 확인한 후 복용함에 추가해 보세요.</Body></Card>}
    {error ? <Body>{error}</Body> : null}
    <Button label="약 검색해서 추가하기" onPress={() => router.push('/search')} />
    <Button secondary label="약 직접 등록하기" onPress={()=>{setManualId(undefined);setManual(true);}} />
    <Note>홈의 오늘의 복용에서 먹었어요·건너뜀을 기록할 수 있어요. 알림 설정은 내 정보에서 관리해요.</Note>
    <Note>병용금기·중복 성분 분석은 아직 제공하지 않아요. 경고가 없어도 함께 복용해도 된다는 뜻은 아니에요.</Note>
  </Page><AsNeededForm medicine={medicines.find(item=>item.id===asNeededId)} onClose={()=>setAsNeededId(undefined)} /><ManualMedicineForm visible={manual} medicine={medicines.find(item=>item.id===manualId)} onClose={()=>setManual(false)} /><DrugDetail drug={selected} onClose={() => setSelected(null)} /></>;
}

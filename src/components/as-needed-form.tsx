import { useEffect, useState } from 'react';
import { Modal, TextInput } from 'react-native';
import { Text } from '@/components/app-text';
import { Body, Button, Note, Page, s } from '@/components/ui';
import { colors as c } from '@/constants/theme';
import { localDateKey } from '@/data/dose-model';
import type { Medicine } from '@/data/medicine-model';
import { useSession } from '@/data/session';
export function AsNeededForm({medicine,onClose}:{medicine?:Medicine;onClose:()=>void}) {
  const {recordAsNeeded,ready,busy,storageError,recordConsentAt} = useSession();
  const [date,setDate] = useState('');
  const [time,setTime] = useState('');
  const [dose,setDose] = useState('');
  const [error,setError] = useState('');
  useEffect(() => {
    if (!medicine) return;
    const now = new Date();
    setDate(localDateKey(now));
    setTime(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`);
    setDose(medicine.regimen?.dose || '');
    setError('');
  },[medicine?.id]);
  async function save() {
    if (!medicine) return;
    setError('');
    try { await recordAsNeeded({medicineId:medicine.id,date,time,dose}); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : '기록하지 못했어요. 다시 시도해 주세요.'); }
  }
  return <Modal visible={Boolean(medicine)} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => {if (!busy) onClose();}}>{medicine && <Page eyebrow="필요 시 복용" title="먹었을 때, 기록해요" description={medicine.name} icon="medicines">
    <Button secondary label="필요 시 기록 닫기" disabled={busy} onPress={onClose}/>
    <Note>{date.replaceAll('-','.')} · 오늘 복용한 내용을 남겨요. 과거 날짜의 추가·수정은 아직 지원하지 않아요.</Note>
    <Body>복용한 시각 (24시간 형식)</Body><TextInput accessibilityLabel="필요 시 복용한 시각" editable={!busy} value={time} onChangeText={setTime} maxLength={5} autoCapitalize="none" autoCorrect={false} placeholder="14:30" placeholderTextColor={c.muted} style={s.input}/>
    <Body>실제로 복용한 양</Body><TextInput accessibilityLabel="필요 시 실제 복용량" editable={!busy} value={dose} onChangeText={setDose} maxLength={40} placeholder="복용량과 단위를 입력하세요" placeholderTextColor={c.muted} style={s.input}/>
    <Note>등록해 둔 복용량을 가져왔어요. 실제로 먹은 양과 다르면 수정해 주세요. 앱이 복용 여부·용량·간격을 제안하는 화면은 아니에요.</Note>
    {medicine.source === 'manual' && <Note>직접 등록 · 공식 제품 정보 미확인</Note>}
    <Note>필요 시 복용에는 미기록·건너뜀 상태나 반복 알림을 만들지 않아요. 오늘 기록을 수정하려면 기록 취소 후 다시 남겨 주세요.</Note>
    <Note>{recordConsentAt ? '기존 기록 보관 설정에 따라 기기에 보관해요.' : '이 기록은 이번 실행에서만 유지돼요. 기기 보관은 내 정보에서 별도로 선택할 수 있어요.'}</Note>
    {storageError ? <Text accessibilityRole="alert" style={{color:c.amber}}>{storageError}</Text> : null}
    {error ? <Text accessibilityRole="alert" style={{color:c.amber,fontSize:14,lineHeight:23}}>{error}</Text> : null}
    <Button label="복용한 내용 기록" disabled={!ready || busy || Boolean(storageError) || !time || !dose.trim()} onPress={() => void save()}/>
  </Page>}</Modal>;
}

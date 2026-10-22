import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Text } from '@/components/app-text';
import { Body, Note, Button, s } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useSession } from '@/data/session';
import { parseRegimen, type Medicine, type Regimen } from '@/data/medicine-model';
export function RegimenEditor({ medicine, onClose }: { medicine: Medicine; onClose: () => void }) {
  const { setRegimen, busy } = useSession();
  const [dose, setDose] = useState(medicine.regimen?.dose || '');
  const [mode, setMode] = useState<Regimen['mode']>(medicine.regimen?.mode || 'daily');
  const [times, setTimes] = useState(medicine.regimen?.times.join(', ') || '');
  const [error, setError] = useState('');
  async function save(clear = false) {
    setError('');
    try { await setRegimen(medicine.id, clear ? undefined : parseRegimen(dose, mode, times)); onClose(); }
    catch (error) { setError(error instanceof Error ? error.message : '저장하지 못했어요.'); }
  }
  return <View style={{ gap: 14 }}>
    <Note>처방·제품 설명서에서 확인한 복용량과 시간을 직접 기록해 주세요. 앱이 용량이나 시간을 권장하지 않아요.</Note>
    <Body>1회 복용량</Body>
    <TextInput editable={!busy} accessibilityLabel="1회 복용량" value={dose} onChangeText={setDose} maxLength={40} placeholder="복용량과 단위를 입력하세요" placeholderTextColor={colors.muted} style={s.input} />
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 10 }}>
      {([['daily', '매일'], ['asNeeded', '필요 시']] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: mode === value }} disabled={busy} onPress={() => setMode(value)} style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: mode === value ? colors.green : colors.line, borderRadius: 10, backgroundColor: mode === value ? colors.pale : colors.paper }}><Text style={{ color: mode === value ? colors.green : colors.muted }}>{label}</Text></Pressable>)}
    </View>
    {mode === 'daily' ? <><Body>복용 시간 (24시간 형식)</Body><TextInput editable={!busy} accessibilityLabel="복용 시간" value={times} onChangeText={setTimes} maxLength={100} autoCapitalize="none" placeholder="08:00, 20:00" placeholderTextColor={colors.muted} style={s.input} /><Note>쉼표로 구분해 최대 8개까지 입력할 수 있어요. 매일 반복하는 일정만 기록할 수 있어요.</Note></> : <Note>필요 시 복용은 정해진 시간을 저장하지 않아요.</Note>}
    <Note>복용 알림이 켜져 있으면 시간 변경·일정 삭제가 알림에도 반영돼요. 필요 시 복용에는 알림을 보내지 않아요.</Note>
    {error ? <Body>{error}</Body> : null}
    <Button label="복용 일정 저장" disabled={busy} onPress={() => void save()} />
    {medicine.regimen && <Button secondary label="복용 일정 지우기" disabled={busy} onPress={() => void save(true)} />}
    <Button secondary label="수정 취소" disabled={busy} onPress={onClose} />
  </View>;
}

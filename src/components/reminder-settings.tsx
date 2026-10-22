import { useState } from 'react';
import { Linking, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Body, Button, Card, Heading, Note } from '@/components/ui';
import { useSession } from '@/data/session';
import { remindersAvailable } from '@/services/reminders';
export function ReminderSettings({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { remindersEnabled, reminderCount, reminderError, setRemindersEnabled, refreshReminders, consentAt, medicines, ready, busy, storageError } = useSession();
  const [error,setError] = useState('');
  const daily = medicines.some(item => item.regimen?.mode === 'daily' && item.regimen.times.length);
  async function toggle() {
    setError('');
    try { await setRemindersEnabled(!remindersEnabled); }
    catch (e) { setError(e instanceof Error ? e.message : '알림 설정을 변경하지 못했어요.'); }
  }
  const status = !remindersAvailable ? '웹에서는 기기 알림을 보내지 않아요.' : reminderError ? '알림 연결을 확인해 주세요.' : remindersEnabled ? reminderCount ? `매일 ${reminderCount}개 시간대에 일정 확인 알림을 예약했어요.` : '알림 설정은 켜져 있고, 등록된 매일 시간이 없어요.' : '복용 알림이 꺼져 있어요.';
  if (compact) return <View style={{gap:8,paddingVertical:8}}><Heading>복용 알림</Heading><Note>{status}</Note>{reminderError ? <Body>{reminderError}</Body> : null}<Button secondary label="복용 알림 설정" onPress={() => router.push('/profile')} /></View>;
  return <Card><Heading>복용 알림</Heading><Body>{status}</Body>
    <Note>직접 입력한 매일 일정만 알려드려요. 같은 시간은 하나로 묶으며, 필요 시 복용은 알리지 않아요. 먹었어요·건너뜀 기록과 관계없이 등록한 시간에 매일 반복돼요.</Note>
    <Note>잠금화면에는 약 이름·복용량을 표시하지 않아요. 알림 시각과 일반 안내만 기기 알림 시스템에 등록하며 서버로 전송하지 않아요.</Note>
    {remindersAvailable ? <>
      {!consentAt && <Note>복용함 기기 보관에 먼저 동의해 주세요. 앱을 종료한 뒤에도 같은 일정으로 알리기 위해 필요해요.</Note>}
      {!daily && <Note>복용함에서 매일 복용하는 제품의 시간을 입력해 주세요.</Note>}
      <Button label={remindersEnabled ? '복용 알림 끄기' : '복용 알림 켜기'} disabled={!ready || busy || (!remindersEnabled && (!consentAt || !daily || Boolean(storageError)))} onPress={() => void toggle()} />
      {(remindersEnabled || reminderError) && <Button secondary label="알림 다시 연결" disabled={!ready || busy || Boolean(storageError)} onPress={() => {setError('');void refreshReminders();}} />}
      <Button secondary label="기기 알림 설정 열기" disabled={busy} onPress={() => {setError('');void Linking.openSettings().catch(() => setError('기기 설정을 열지 못했어요. 설정 앱에서 나를봄 알림을 확인해 주세요.'));}} />
    </> : <Note>모바일 앱에서 알림을 켤 수 있어요. 웹 알림은 지원하지 않아요.</Note>}
    <Note>기기 알림 권한·집중 모드·절전 상태에 따라 알림이 지연되거나 표시되지 않을 수 있어요. 기기 시간대가 바뀌면 앱을 다시 열어 알림을 갱신해 주세요.</Note>
    {reminderError ? <Body>{reminderError}</Body> : null}{error && error !== reminderError ? <Body>{error}</Body> : null}
  </Card>;
}

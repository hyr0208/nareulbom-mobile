import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Card, Heading, Body, Note, Button } from '@/components/ui';
import { useSession } from '@/data/session';
export function DoseRecordStorage() {
  const router = useRouter();
  const { recordConsentAt, doseRecords, consentAt, storageAvailable, ready, busy, storageError, enableRecordStorage, eraseDoseRecords } = useSession();
  const [expanded,setExpanded] = useState(false);
  const [confirm,setConfirm] = useState(false);
  const [error,setError] = useState('');
  async function act(erase = false) {
    setError('');
    try { if (erase) await eraseDoseRecords(); else await enableRecordStorage(); setExpanded(false); setConfirm(false); }
    catch (e) { setError(e instanceof Error ? e.message : '복용 기록 설정을 변경하지 못했어요.'); }
  }
  return <Card><Heading>복용 기록 보관</Heading>
    <Body>{recordConsentAt ? '먹었어요·건너뜀 기록을 이 기기에 보관 중이에요.' : '복용 기록은 이번 실행에서만 유지돼요. 기기 보관은 별도 선택 동의예요.'}</Body>
    <Note>최근 30일 범위에서 최대 400개 기록을 관리해요. 30일이 지난 기록은 목록에서 제외하고, 다음 저장 시 기기에서도 정리해요. 서버에는 전송하지 않아요.</Note>
    <Button secondary label="복용 기록 달력 보기" onPress={() => router.push('/history')} />
    {recordConsentAt ? <Note>기록 보관 동의일: {new Date(recordConsentAt).toLocaleDateString('ko-KR')}</Note> : storageAvailable ? <>
      <Button secondary label={expanded ? '기록 보관 안내 접기' : '복용 기록 기기 보관 안내'} disabled={!ready || busy} onPress={() => setExpanded(!expanded)} />
      {expanded && <><Note>보관 항목: 제품명·품목 코드·일정 날짜와 시간·직접 입력한 1회 복용량·먹었어요 또는 건너뜀 상태·기록 시각. 목적은 내 복용 내역 확인이에요. 동의하면 현재 임시 기록도 기기 보안 저장소에 함께 보관해요. 기록 삭제·동의 철회는 아래에서 할 수 있어요.</Note>{!consentAt && <Note>위의 복용함 기기 보관에 먼저 동의해 주세요.</Note>}<Button label="복용 기록 기기 보관에 동의 (선택)" disabled={!ready || busy || !consentAt || Boolean(storageError)} onPress={() => void act()} /></>}
    </> : <Note>웹에서는 복용 기록을 기기에 보관하지 않아요. 모바일 앱에서 선택할 수 있어요.</Note>}
    {(doseRecords.length > 0 || recordConsentAt) && (confirm ? <><Body>복용 기록을 모두 삭제하고 기록 보관 동의를 철회할까요? 제품 목록·복용 일정·건강 프로필은 유지돼요. 삭제한 기록은 복구할 수 없어요.</Body><Button label="복용 기록 삭제하고 보관 동의 철회" disabled={!ready || busy} onPress={() => void act(true)} /><Button secondary label="복용 기록 삭제 취소" disabled={busy} onPress={() => setConfirm(false)} /></> : <Button secondary label="복용 기록 삭제 안내" disabled={!ready || busy} onPress={() => setConfirm(true)} />)}
    {error ? <Body>{error}</Body> : null}
  </Card>;
}

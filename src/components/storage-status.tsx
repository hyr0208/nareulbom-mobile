import { useState } from 'react';
import { Platform } from 'react-native';
import { Card, Heading, Body, Note, Button } from '@/components/ui';
import { useSession } from '@/data/session';
export function StorageStatus() {
  const { ready, busy, consentAt, storageAvailable, storageError, enableStorage, retryLoad } = useSession();
  const [expanded, setExpanded] = useState(false); const [error, setError] = useState('');
  if (!ready) return <Note>복용 정보를 불러오는 중이에요.</Note>;
  return <>
    {storageError ? <Card><Heading>기기 보관 확인이 필요해요</Heading><Body>{storageError}</Body><Button secondary label="다시 불러오기" disabled={busy} onPress={() => void retryLoad()} /></Card> : null}
    {consentAt ? <Note>이 기기에 보관 중 · 보관 동의와 전체 삭제는 내 정보에서 관리해요.</Note> : <Card>
      <Heading>{storageAvailable ? '복용함을 이 기기에 보관할까요?' : '웹에서는 임시 복용함이에요'}</Heading>
      <Body>{storageAvailable ? '동의하면 앱을 다시 실행해도 목록과 직접 입력한 일정이 유지돼요. 동의하지 않아도 검색과 임시 복용함은 이용할 수 있어요.' : '복용 목록과 일정은 이번 실행 중에만 유지돼요. 계속 보관하려면 모바일 앱을 이용해 주세요.'}</Body>
      {storageAvailable && <><Button secondary label={expanded ? '보관 안내 접기' : '기기 보관 안내 보기'} onPress={() => setExpanded(!expanded)} />
        {expanded && <>
          <Body>보관 항목: 제품명·품목 코드·제조사·복용량·복용 시간{`\n`}목적: 내 복용 목록과 일정 관리{`\n`}기간: 동의 철회 또는 전체 삭제할 때까지</Body>
          <Note>현재 임시 목록도 함께 저장해요. 복용 기록을 서버에 전송하지 않으며, 보관 동의는 내 정보에서 철회할 수 있어요.</Note>
          {Platform.OS === 'ios' && <Note>iOS에서는 앱을 삭제해도 보안 저장소의 정보가 남을 수 있어요. 기기를 공유하거나 사용을 마칠 때는 앱의 전체 삭제를 이용해 주세요.</Note>}
          <Button label="복용정보 기기 보관에 동의" disabled={busy || Boolean(storageError)} onPress={() => { setError(''); void enableStorage().then(() => setExpanded(false)).catch(e => setError(e.message)); }} />
        </>}
      </>}
    </Card>}
    {error ? <Body>{error}</Body> : null}
  </>;
}

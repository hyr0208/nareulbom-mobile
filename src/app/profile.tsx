import { useState } from 'react';
import { Page, Card, Heading, Body, Note, Button } from '@/components/ui';
import { StorageStatus } from '@/components/storage-status';
import { useSession } from '@/data/session';
export default function Profile() {
  const [expanded, setExpanded] = useState(false); const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState(''); const [deleted, setDeleted] = useState(false);
  const { consentAt, eraseAll, busy, ready } = useSession();
  return <Page eyebrow="돌아봄" title="나를 알아가는 공간" description="내 몸의 정보는 내가 선택하고 관리해요.">
    <StorageStatus />
    {consentAt && <Note>기기 보관 동의일: {new Date(consentAt).toLocaleDateString('ko-KR')}</Note>}
    <Card><Heading>복용정보 전체 삭제</Heading><Body>제품 목록과 복용 일정, 기기 보관 동의를 함께 삭제해요.</Body>
      {confirmDelete ? <><Note>삭제한 기록은 복구할 수 없어요. 기기 보관 동의도 철회됩니다.</Note><Button label="전체 삭제하고 동의 철회" disabled={!ready || busy} onPress={() => { setError(''); void eraseAll().then(() => { setConfirmDelete(false); setDeleted(true); }).catch(e => setError(e.message)); }} /><Button secondary label="취소" disabled={busy} onPress={() => setConfirmDelete(false)} /></> : <Button secondary label="복용정보 전체 삭제하기" disabled={!ready || busy} onPress={() => { setDeleted(false); setConfirmDelete(true); }} />}
      {deleted && <Body>복용정보와 보관 동의를 삭제했어요.</Body>}{error ? <Body>{error}</Body> : null}
    </Card>
    <Card><Heading>건강 프로필</Heading><Body>질환·알레르기 등 추가 건강 문진은 준비 중이에요.</Body><Button secondary label={expanded ? '문진 항목 접기' : '어떤 정보를 물어보나요?'} onPress={() => setExpanded(!expanded)} />{expanded && <Body>연령과 관리 목표, 진단받은 질환, 알레르기, 임신·수유 여부를 필요한 범위에서 확인할 예정이에요.</Body>}</Card>
    <Card><Heading>연결 준비 중</Heading><Body>카카오·Apple 로그인{`\n`}기기 간 동기화{`\n`}복용 알림</Body></Card>
    <Note>나를봄 0.1.0 · 개발 미리보기</Note>
  </Page>;
}

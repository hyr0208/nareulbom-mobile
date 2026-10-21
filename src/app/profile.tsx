import { useState } from 'react';
import { Page, Card, Heading, Body, Note, Button } from '@/components/ui';
export default function Profile() {
  const [expanded, setExpanded] = useState(false);
  return <Page eyebrow="돌아봄" title="나를 알아가는 공간" description="내 몸의 정보는 내가 선택하고 관리해요.">
    <Card tone="green"><Note>반가워요</Note><Heading>나를 돌보는 시작, 나를봄</Heading><Body>지금은 가입 없이 약을 검색하고 임시 복용 목록을 만들어 볼 수 있어요.</Body></Card>
    <Card><Heading>건강 프로필</Heading><Body>건강정보 동의와 보관·삭제 기능을 갖춘 뒤 문진을 시작할 예정이에요.</Body><Button secondary label={expanded ? '문진 항목 접기' : '어떤 정보를 물어보나요?'} onPress={() => setExpanded(!expanded)} />
      {expanded && <Body>연령과 관리 목표, 진단받은 질환, 알레르기, 임신·수유 여부, 복용 중인 제품을 필요한 범위에서 확인해요. 모르는 항목은 건너뛸 수 있도록 설계하고 있어요.</Body>}</Card>
    <Card><Heading>연결 준비 중</Heading><Body>카카오·Apple 로그인{`\n`}복용 기록 저장·동기화{`\n`}복용 일정과 알림</Body></Card>
    <Note>나를봄 0.1.0 · 개발 미리보기</Note>
  </Page>;
}

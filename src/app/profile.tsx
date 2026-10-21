import { useState } from 'react';
import { Modal } from 'react-native';
import { Page, Card, Heading, Body, Note, Button } from '@/components/ui';
import { HealthOnboarding, HealthSummary } from '@/components/health-onboarding';
import { StorageStatus } from '@/components/storage-status';
import { useSession } from '@/data/session';
export default function Profile() {
  const [editing,setEditing]=useState(false); const [confirmHealth,setConfirmHealth]=useState(false); const [confirmDelete,setConfirmDelete]=useState(false);
  const [error,setError]=useState(''); const [message,setMessage]=useState('');
  const {health,medicines,consentAt,eraseHealth,eraseAll,busy,ready}=useSession();
  return <>
    <Page eyebrow="돌아봄" title="나를 알아가는 공간" description="내 몸의 정보는 내가 선택하고 관리해요.">
      <Card><Heading>내 건강 프로필</Heading>
        {health?<><Note>{health.remember?'이 기기에 보관 중':'이번 실행에서만 임시 유지 중'} · 건강정보 이용 동의 {new Date(health.consentAt).toLocaleDateString('ko-KR')}</Note><HealthSummary profile={health.profile} medicineCount={medicines.length} /><Button label="건강정보 수정하기" disabled={!ready||busy} onPress={()=>setEditing(true)} />
          {confirmHealth?<><Note>건강 프로필과 건강정보 이용·보관 동의를 삭제해요. 복용함은 유지되며 삭제한 건강정보는 복구할 수 없어요.</Note><Button label="건강정보 삭제하고 동의 철회" disabled={busy} onPress={()=>{setError('');void eraseHealth().then(()=>{setConfirmHealth(false);setMessage('건강정보와 관련 동의를 삭제했어요.');}).catch(e=>setError(e.message));}} /><Button secondary label="건강정보 삭제 취소" disabled={busy} onPress={()=>setConfirmHealth(false)} /></>:<Button secondary label="건강정보 삭제 안내" disabled={!ready||busy} onPress={()=>{setMessage('');setConfirmHealth(true);}} />}
        </>:<><Body>관리 목표부터 생활습관까지, 단계별 질문으로 내 몸의 정보를 정리해요. 모르는 항목은 건너뛸 수 있어요.</Body><Button label="건강정보 입력 시작하기" disabled={!ready||busy} onPress={()=>setEditing(true)} /></>}
      </Card>
      {message?<Body>{message}</Body>:null}{error?<Body>{error}</Body>:null}
      <StorageStatus />
      {consentAt&&<Note>복용함 기기 보관 동의일: {new Date(consentAt).toLocaleDateString('ko-KR')}</Note>}
      <Card><Heading>모든 정보 삭제</Heading><Body>건강 프로필, 제품 목록과 복용 일정, 이용·보관 동의를 함께 삭제해요.</Body>
        {confirmDelete?<><Note>삭제한 기록은 복구할 수 없어요.</Note><Button label="모든 정보 삭제하고 동의 철회" disabled={!ready||busy} onPress={()=>{setError('');void eraseAll().then(()=>{setConfirmDelete(false);setConfirmHealth(false);setMessage('모든 정보와 동의를 삭제했어요.');}).catch(e=>setError(e.message));}} /><Button secondary label="전체 삭제 취소" disabled={busy} onPress={()=>setConfirmDelete(false)} /></>:<Button secondary label="모든 정보 삭제 안내" disabled={!ready||busy} onPress={()=>{setMessage('');setConfirmDelete(true);}} />}
      </Card>
      <Card><Heading>연결 준비 중</Heading><Body>건강정보 기반 약·영양제 추천{`\n`}개인별 상호작용 분석{`\n`}카카오·Apple 로그인과 기기 간 동기화{`\n`}복용 알림</Body></Card>
      <Note>나를봄 0.1.0 · 개발 미리보기</Note>
    </Page>
    <Modal visible={editing} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>{if(!busy)setEditing(false);}}>{editing&&<HealthOnboarding onClose={()=>setEditing(false)} />}</Modal>
  </>;
}

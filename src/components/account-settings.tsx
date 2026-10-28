import { useState } from 'react';
import { Modal } from 'react-native';
import { Body, Button, Card, Heading, Note } from '@/components/ui';
import { useAccount } from '@/data/account';
import { useSession } from '@/data/session';
import { AccountLogin } from '@/components/account-login';
export function AccountSettings() {
  const account = useAccount();
  const session = useSession();
  const [login,setLogin] = useState(false);
  const [confirm,setConfirm] = useState(false);
  const [message,setMessage] = useState('');
  async function leave() {
    setMessage('');
    try {
      await account.deleteAccount();setConfirm(false);
      try {await session.eraseAll();setMessage('계정과 이 기기 정보를 삭제했어요.');}
      catch {setMessage('계정은 삭제했지만 이 기기의 정보 삭제가 완료되지 않았어요. 아래 모든 정보 삭제를 다시 실행해 주세요.');}
    } catch {}
  }
  return <><Card><Heading>{account.user ? '로그인 계정' : '로그인 없이 이용 중이에요'}</Heading>
    <Body>{account.user ? '나를봄 계정에 로그인했어요.' : '계정을 연결해도 기존 건강정보가 자동으로 업로드되지 않아요.'}</Body>
    <Note>현재 건강정보와 복용함·알림은 이 기기 전용이며 계정과 연결되지 않아요. 백업·동기화는 준비 중이에요.</Note>
    {account.user ? <><Button secondary label="로그아웃" disabled={account.busy || session.busy} onPress={() => {setMessage('');void account.signOut().then(() => {setConfirm(false);setMessage('로그아웃했어요. 기기 전용 기록과 알림은 유지돼요.');}).catch(() => {});}}/>
      {confirm ? <><Note>소셜 로그인 연결과 회원 계정·모든 로그인 세션을 삭제해요. 이어서 이 기기의 건강정보·복용함·기록·알림도 삭제해요. 복구할 수 없어요. 오래 로그인한 상태라면 로그아웃 후 다시 로그인해야 탈퇴할 수 있어요.</Note><Button label="탈퇴하고 이 기기 정보 삭제" disabled={account.busy || session.busy || !session.ready} onPress={() => void leave()}/><Button secondary label="회원 탈퇴 취소" disabled={account.busy} onPress={() => setConfirm(false)}/></> : <Button secondary label="회원 탈퇴 안내" disabled={account.busy || session.busy} onPress={() => setConfirm(true)}/>}</> : <Button label="로그인하기" disabled={account.busy} onPress={() => setLogin(true)}/>}
    {message && <Body>{message}</Body>}{account.error && <Note>{account.error}</Note>}
  </Card><Modal visible={login} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => {if (!account.busy) setLogin(false);}}><AccountLogin onClose={() => setLogin(false)}/></Modal></>;
}

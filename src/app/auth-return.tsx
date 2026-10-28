import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Page, Note, Button } from '@/components/ui';
import { authClient } from '@/services/auth-client';
// Native authentication is consumed by the Expo auth plugin; never render callback query parameters.
export default function AuthReturn() {
  const router=useRouter();
  useEffect(() => {let alive=true;void authClient.getSession().then(() => {if(alive)router.replace('/profile');});return () => {alive=false;};},[router]);
  return <Page eyebrow="나를봄" title="로그인 결과 확인"><Note>계정 연결을 확인하고 있어요. 로그인 취소·실패 시 내 정보에서 다시 시도할 수 있어요.</Note><Button secondary label="내 정보로 이동" onPress={() => router.replace('/profile')}/></Page>;
}

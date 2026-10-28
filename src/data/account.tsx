import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { authClient, fetchAuthAvailability, type AuthAvailability } from '@/services/auth-client';
export const ACCOUNT_CONSENT_VERSION = '2026-10-27';
const guestKey = 'nareulbom_auth_entry';
type Account = {
  user: {id:string;name:string} | null; ready:boolean; entryDone:boolean; busy:boolean;
  availability:AuthAvailability | null; error:string;
  guest:() => Promise<void>; reload:() => Promise<void>; signIn:(provider:'kakao'|'apple') => Promise<boolean>; signOut:() => Promise<void>; deleteAccount:() => Promise<void>;
};
const Context = createContext<Account | null>(null);
export function AccountProvider({children}:{children:ReactNode}) {
  const session = authClient.useSession();
  const [ready,setReady] = useState(false);
  const [entryDone,setEntryDone] = useState(false);
  const [busy,setBusy] = useState(false);
  const lock = useRef(false);
  const [availability,setAvailability] = useState<AuthAvailability | null>(null);
  const [error,setError] = useState('');
  async function reload() {
    try { setAvailability(await fetchAuthAvailability()); setError(''); }
    catch {setAvailability(null);setError('로그인 서버에 연결하지 못했어요. 로그인 없이 이용하거나 다시 연결해 주세요.');}
  }
  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {if (Platform.OS !== 'web' && await SecureStore.getItemAsync(guestKey) === 'visited' && mounted) setEntryDone(true);}
      catch {if (mounted) setError('로그인 시작 설정을 읽지 못했어요. 로그인 없이 계속할 수 있어요.');}
      finally {if (mounted) setReady(true);}
    })();
    void reload();
    return () => {mounted=false;};
  },[]);
  useEffect(() => {if (session.data?.user) setEntryDone(true);},[session.data?.user.id]);
  async function rememberEntry() {
    if (Platform.OS !== 'web') await SecureStore.setItemAsync(guestKey,'visited',{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});
    setEntryDone(true);
  }
  async function operation<T>(action:() => Promise<T>):Promise<T> {
    if (lock.current) throw new Error('로그인 작업 중이에요. 잠시 기다려 주세요.');
    lock.current=true;setBusy(true);setError('');
    try {return await action();}
    catch(e) {const message=e instanceof Error ? e.message : '계정 작업을 완료하지 못했어요.';setError(message);throw new Error(message);}
    finally {lock.current=false;setBusy(false);}
  }
  return <Context.Provider value={{user:session.data?.user || null,ready,entryDone,busy,availability,error,reload,
    guest:async () => {try {await rememberEntry();} catch {setEntryDone(true);setError('시작 설정은 저장하지 못했지만 이번 실행에서는 계속 이용할 수 있어요.');}},
    signIn:provider => operation(async () => {
      if (!availability?.ready || !availability[provider]) throw new Error('이 로그인은 아직 준비 중이에요. 로그인 없이 이용할 수 있어요.');
      const callbackURL = Platform.OS === 'web' ? `${window.location.origin}/auth-return` : Linking.createURL('auth-return',{scheme:'nareulbom'});
      const result = await authClient.signIn.social({provider,callbackURL,errorCallbackURL:callbackURL,additionalData:{accountConsentVersion:ACCOUNT_CONSENT_VERSION}});
      if (result.error) throw new Error('로그인을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.');
      const verified = await authClient.getSession({query:{disableCookieCache:true}});
      if (verified.error || !verified.data?.user) throw new Error('로그인이 취소되었거나 완료되지 않았어요. 다시 시도해 주세요.');
      await rememberEntry();return true;
    }),
    signOut:() => operation(async () => {
      const result = await authClient.signOut();
      if (result.error) throw new Error('로그아웃을 완료하지 못했어요. 연결을 확인하고 다시 시도해 주세요.');
      await authClient.getSession();
    }),
    deleteAccount:() => operation(async () => {
      const result = await authClient.deleteUser();
      if (result.error) throw new Error('회원 탈퇴를 완료하지 못했어요. 로그아웃 후 다시 로그인하고, 연결을 확인한 뒤 탈퇴를 재시도해 주세요.');
      await authClient.signOut();
      await authClient.getSession();
    }),
  }}>{children}</Context.Provider>;
}
export function useAccount() {const value=useContext(Context);if (!value) throw new Error('AccountProvider missing');return value;}

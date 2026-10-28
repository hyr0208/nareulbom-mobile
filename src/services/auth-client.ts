import { Platform } from 'react-native';
import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';
export const AUTH_API_URL = (process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:8788' : 'http://localhost:8788')).replace(/\/$/,'');
const options = {keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY};
export const authStorage = {
  getItem:(key:string) => SecureStore.getItem(key,options),
  setItem:(key:string,value:string) => SecureStore.setItem(key,value,options),
  getItemAsync:(key:string) => SecureStore.getItemAsync(key,options),
  setItemAsync:(key:string,value:string) => SecureStore.setItemAsync(key,value,options),
};
export const authClient = createAuthClient({
  baseURL:AUTH_API_URL,
  fetchOptions:{timeout:10000},
  plugins:[expoClient({scheme:'nareulbom',storagePrefix:'nareulbom_auth',cookiePrefix:'nareulbom',storage:authStorage,disableCache:true,webBrowserOptions:{preferEphemeralSession:true}})],
});
export type AuthAvailability = {ready:boolean;kakao:boolean;apple:boolean;consentVersion:string};
export async function fetchAuthAvailability(): Promise<AuthAvailability> {
  const response = await fetch(`${AUTH_API_URL}/api/auth-config`,{signal:AbortSignal.timeout(5000)});
  if (!response.ok) throw new Error('로그인 연결을 확인하지 못했어요. 로그인 없이 이용하거나 다시 연결해 주세요.');
  const data = await response.json();
  if (typeof data.ready !== 'boolean' || typeof data.kakao !== 'boolean' || typeof data.apple !== 'boolean' || typeof data.consentVersion !== 'string') throw new Error('로그인 설정을 확인하지 못했어요.');
  return data;
}

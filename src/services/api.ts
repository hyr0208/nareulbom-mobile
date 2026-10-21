import { Platform } from 'react-native';
export type Drug = {
  id: string; name: string; manufacturer: string; effect: string; usage: string;
  warning: string; precaution: string; interaction: string; sideEffect: string;
  storage: string; updatedAt: string; sourceUrl: string;
};
const baseUrl = (process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:8788' : 'http://localhost:8788')).replace(/\/$/, '');
export async function searchDrugs(query: string, signal?: AbortSignal): Promise<Drug[]> {
  const response = await fetch(`${baseUrl}/api/drugs?q=${encodeURIComponent(query)}`, { signal });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || '검색하지 못했어요. 잠시 후 다시 시도해 주세요.');
  return body.items;
}

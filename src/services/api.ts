import { Platform } from 'react-native';
export type DrugSource = 'easy' | 'permit' | 'manual';
export type Drug = {
  source?: DrugSource; strength?: string; category?: 'medicine' | 'supplement';
  classification?: string; ingredients?: string; permitStatus?: string;
  id: string; name: string; manufacturer: string; effect: string; usage: string;
  warning: string; precaution: string; interaction: string; sideEffect: string;
  storage: string; updatedAt: string; sourceUrl: string;
};
const baseUrl = (process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:8788' : 'http://localhost:8788')).replace(/\/$/, '');
export type DrugSearchPage = { items: Drug[]; total: number; page: number; pageSize: number; hasMore: boolean };
export async function searchDrugs(query: string, page = 1, signal?: AbortSignal, source: 'easy' | 'permit' = 'easy'): Promise<DrugSearchPage> {
  let response: Response;
  try { response = await fetch(`${baseUrl}/api/drugs?q=${encodeURIComponent(query)}&page=${page}&source=${source}`, { signal }); }
  catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('검색 서비스에 연결하지 못했어요. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.');
  }
  let body: DrugSearchPage & { message?: string };
  try { body = await response.json(); }
  catch { throw new Error('검색 응답을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.'); }
  if (!response.ok) throw new Error(body.message || '검색하지 못했어요. 잠시 후 다시 시도해 주세요.');
  if (!Array.isArray(body.items) || !Number.isSafeInteger(body.total) || body.total < 0 || body.page !== page || body.pageSize !== 20 || typeof body.hasMore !== 'boolean' || body.items.some(item => typeof item?.id !== 'string' || typeof item?.name !== 'string')) {
    throw new Error('검색 결과 형식이 올바르지 않아요. 잠시 후 다시 시도해 주세요.');
  }
  return body;
}

export async function fetchDrug(id: string, signal?: AbortSignal, source: 'easy' | 'permit' = 'easy'): Promise<Drug> {
  const response = await fetch(`${baseUrl}/api/drugs/${encodeURIComponent(id)}?source=${source}`, { signal });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || '제품 정보를 불러오지 못했어요.');
  if (!body.item || body.item.id !== id || typeof body.item.name !== 'string') throw new Error('제품 정보 형식이 올바르지 않아요.');
  return body.item;
}

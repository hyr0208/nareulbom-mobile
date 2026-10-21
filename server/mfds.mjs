export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function plain(value) {
  return String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}
export async function searchDrugs(query, { key = process.env.MFDS_SERVICE_KEY, fetchImpl = fetch } = {}) {
  if (!key) throw new ApiError(503, '의약품 검색을 준비 중이에요. 서버에 공공데이터 API 인증키를 연결해야 해요.');
  const url = new URL('https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList');
  url.search = new URLSearchParams({ serviceKey: key, itemName: query, pageNo: '1', numOfRows: '20', type: 'json' }).toString();
  let response;
  try { response = await fetchImpl(url, { signal: AbortSignal.timeout(10000) }); }
  catch { throw new ApiError(502, '공공데이터 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.'); }
  if (!response.ok) throw new ApiError(502, '공공데이터 서버가 응답하지 않아요. 잠시 후 다시 시도해 주세요.');
  let payload;
  try { payload = await response.json(); }
  catch { throw new ApiError(502, '공공데이터 응답을 확인하지 못했어요. API 이용 승인 상태를 확인해 주세요.'); }
  if (!['00', '0'].includes(String(payload.header?.resultCode))) throw new ApiError(502, '공공데이터 조회가 완료되지 않았어요. API 인증키와 이용 승인 상태를 확인해 주세요.');
  const total = Number(payload.body?.totalCount);
  if (!Number.isFinite(total) || total < 0) throw new ApiError(502, '공공데이터 응답 형식이 올바르지 않아요.');
  if (total === 0) return [];
  const rows = payload.body?.items;
  if (!Array.isArray(rows) || rows.some(item => !item?.itemSeq || !item?.itemName)) throw new ApiError(502, '공공데이터 제품 정보를 확인하지 못했어요.');
  return rows.map(item => ({
    id: String(item.itemSeq), name: plain(item.itemName), manufacturer: plain(item.entpName),
    effect: plain(item.efcyQesitm), usage: plain(item.useMethodQesitm), warning: plain(item.atpnWarnQesitm),
    precaution: plain(item.atpnQesitm), interaction: plain(item.intrcQesitm), sideEffect: plain(item.seQesitm),
    storage: plain(item.depositMethodQesitm), updatedAt: plain(item.updateDe),
    sourceUrl: `https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=${encodeURIComponent(item.itemSeq)}`,
  }));
}

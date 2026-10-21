import { ApiError } from './mfds.mjs';
// Official data.go.kr dataset 15095677, current Swagger checked 2026-10-21.
const endpoint = 'https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService08/getDrugPrdtPrmsnDtlInq08';
function plain(value) {
  return String(value ?? '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}
export async function searchPermitDrugs(query, { page = 1, itemSeq, key = process.env.MFDS_PERMIT_SERVICE_KEY?.trim() || process.env.MFDS_SERVICE_KEY, fetchImpl = fetch } = {}) {
  if (!key?.trim()) throw new ApiError(503, '전체 의약품 검색을 아직 이용할 수 없어요. 일반약 설명 검색 또는 직접 등록을 이용해 주세요.');
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw new ApiError(400, '올바른 페이지 번호가 필요해요.');
  const url = new URL(endpoint);
  url.search = new URLSearchParams({serviceKey:key.trim(),pageNo:String(page),numOfRows:'20',type:'json',...(itemSeq ? {item_seq:itemSeq} : {item_name:query})}).toString();
  let response;
  try { response=await fetchImpl(url,{signal:AbortSignal.timeout(10000)}); }
  catch {throw new ApiError(502,'전체 의약품 검색에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');}
  if ([401,403].includes(response.status)) throw new ApiError(503,'전체 의약품 검색을 아직 이용할 수 없어요. 일반약 설명 검색 또는 직접 등록을 이용해 주세요.');
  if (!response.ok) throw new ApiError(502,'의약품 허가정보 서버가 응답하지 않아요.');
  let payload;try {payload=await response.json();}catch{throw new ApiError(502,'의약품 허가정보 응답을 확인하지 못했어요.');}
  const code=String(payload.header?.resultCode);
  if (!['00','0'].includes(code)) throw new ApiError(['20','30','31','32'].includes(code)?503:502,'전체 의약품 조회를 완료하지 못했어요. 일반약 설명 검색 또는 직접 등록을 이용해 주세요.');
  const total=Number(payload.body?.totalCount);
  if(!Number.isSafeInteger(total)||total<0)throw new ApiError(502,'의약품 허가정보 형식이 올바르지 않아요.');
  if(!total)return {items:[],total:0,page,pageSize:20,hasMore:false};
  const raw=payload.body?.items;
  const rows=Array.isArray(raw)?raw:Array.isArray(raw?.item)?raw.item:raw?.item?[raw.item]:null;
  if(!rows||rows.some(row=>!row?.ITEM_SEQ||!row?.ITEM_NAME)||(page*20<=total&&!rows.length))throw new ApiError(502,'의약품 허가 제품 정보를 확인하지 못했어요.');
  const items=rows.map(row=>({id:String(row.ITEM_SEQ),name:plain(row.ITEM_NAME),manufacturer:plain(row.ENTP_NAME),source:'permit',
    classification:plain(row.ETC_OTC_CODE),ingredients:plain(row.MAIN_ITEM_INGR),permitStatus:plain(row.CANCEL_NAME),
    effect:plain(row.EE_DOC_DATA),usage:plain(row.UD_DOC_DATA),precaution:plain(row.NB_DOC_DATA),
    warning:'',interaction:'',sideEffect:'',storage:plain(row.STORAGE_METHOD),updatedAt:plain(row.CHANGE_DATE),
    sourceUrl:`https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail?itemSeq=${encodeURIComponent(row.ITEM_SEQ)}`,
  }));
  return {items,total,page,pageSize:20,hasMore:items.length>0&&page*20<total};
}
export async function getPermitDrug(id,options={}) {
  const result=await searchPermitDrugs('',{...options,itemSeq:id});const item=result.items.find(item=>item.id===id);
  if(!item)throw new ApiError(404,'현재 허가정보에서 해당 제품을 찾지 못했어요. 포장 또는 약사에게 확인해 주세요.');
  return item;
}

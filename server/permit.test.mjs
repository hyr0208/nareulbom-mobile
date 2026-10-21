import test from 'node:test';
import assert from 'node:assert/strict';
import {searchPermitDrugs,getPermitDrug} from './permit.mjs';
import {createApp} from './app.mjs';
function response(items,total=items.length){return {ok:true,status:200,json:async()=>({header:{resultCode:'00'},body:{totalCount:total,items}})};}
test('permit search uses current official 08 endpoint and keeps authorization metadata',async()=>{
  const result=await searchPermitDrugs('처방약',{key:'test+key=',page:2,fetchImpl:async url=>{
    assert.equal(url.pathname,'/1471000/DrugPrdtPrmsnInfoService08/getDrugPrdtPrmsnDtlInq08');
    assert.equal(url.searchParams.get('item_name'),'처방약');assert.equal(url.searchParams.get('pageNo'),'2');assert.equal(url.searchParams.get('serviceKey'),'test+key=');
    return response([{ITEM_SEQ:'202106092',ITEM_NAME:'테스트 제품',ENTP_NAME:'테스트 제조사',ETC_OTC_CODE:'전문의약품',MAIN_ITEM_INGR:'시험성분',EE_DOC_DATA:'<DOC><![CDATA[효능 원문]]></DOC>',UD_DOC_DATA:'<DOC>용법 원문</DOC>',NB_DOC_DATA:'<DOC>주의 원문</DOC>',CANCEL_NAME:'정상'}],41);
  }});
  assert.equal(result.items[0].source,'permit');assert.equal(result.items[0].classification,'전문의약품');assert.equal(result.items[0].effect,'효능 원문');assert.equal(result.items[0].interaction,'');assert.equal(result.hasMore,true);
});
test('permit permission failure is an error, not a zero-result success',async()=>{
  await assert.rejects(searchPermitDrugs('약',{key:'test',fetchImpl:async()=>({ok:false,status:403})}),error=>error.status===503);
  await assert.rejects(searchPermitDrugs('약',{key:'test',fetchImpl:async()=>({ok:true,status:200,json:async()=>({header:{resultCode:'30'}})})}),error=>error.status===503);
});
test('permit API accepts documented item containers and rejects malformed data',async()=>{
  const item={ITEM_SEQ:'202106092',ITEM_NAME:'시험'};
  const result=await searchPermitDrugs('약',{key:'test',fetchImpl:async()=>({ok:true,status:200,json:async()=>({header:{resultCode:'00'},body:{totalCount:1,items:{item:[item]}}})})});
  assert.equal(result.items[0].id,'202106092');
  await assert.rejects(searchPermitDrugs('약',{key:'test',fetchImpl:async()=>response([{}],1)}),error=>error.status===502);
  assert.equal((await searchPermitDrugs('약',{key:'test',fetchImpl:async()=>response([],0)})).hasMore,false);
});
test('permit detail requires exact code even when upstream sends unrelated products',async()=>{
  await assert.rejects(getPermitDrug('202106092',{key:'test',fetchImpl:async url=>{
    assert.equal(url.searchParams.get('item_seq'),'202106092');assert.equal(url.searchParams.has('item_name'),false);
    return response([{ITEM_SEQ:'202005623',ITEM_NAME:'다른 제품'}]);
  }}),error=>error.status===404);
});
test('search sources are isolated and manual IDs are never sent to an official lookup',async()=>{
  let easy=0,permit=0,detail=0;
  const server=createApp({search:async()=>{easy++;return {items:[],total:0,page:1,pageSize:20,hasMore:false};},permitSearch:async()=>{permit++;return {items:[],total:0,page:1,pageSize:20,hasMore:false};},detail:async()=>{detail++;return {};},permitDetail:async id=>({id,name:'시험'})});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const base=`http://127.0.0.1:${server.address().port}`;
    assert.equal((await fetch(`${base}/api/drugs?q=test`)).status,200);assert.equal(easy,1);assert.equal(permit,0);
    const result=await fetch(`${base}/api/drugs?q=test&source=permit`);assert.equal((await result.json()).source,'permit');assert.equal(permit,1);assert.equal(easy,1);
    assert.equal((await fetch(`${base}/api/drugs?q=test&source=manual`)).status,400);
    assert.equal((await fetch(`${base}/api/drugs/manual-example`)).status,400);assert.equal(detail,0);
    assert.equal((await fetch(`${base}/api/drugs/202106092?source=permit`)).status,200);
  }finally{await new Promise(resolve=>server.close(resolve));}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.mjs';
import { searchDrugs, ApiError } from './mfds.mjs';

test('missing API key is unavailable, never an empty success', async () => {
  await assert.rejects(searchDrugs('제품', { key: '' }), error => error instanceof ApiError && error.status === 503);
});
test('upstream auth errors and malformed responses are not empty results', async () => {
  for (const payload of [{ header: { resultCode: '30' } }, { header: { resultCode: '00' }, body: {} }]) {
    await assert.rejects(searchDrugs('제품', { key: 'test', fetchImpl: async () => ({ ok: true, json: async () => payload }) }), error => error.status === 502);
  }
  await assert.rejects(searchDrugs('제품', { key: 'test', fetchImpl: async () => ({ ok: true, json: async () => { throw new Error('XML'); } }) }), error => error.status === 502);
});
test('search safely encodes query and maps source fields without inventing missing warnings', async () => {
  const result = await searchDrugs('제품 & 이름', { key: 'test+key=', fetchImpl: async url => {
    assert.equal(url.searchParams.get('itemName'), '제품 & 이름');
    assert.equal(url.searchParams.get('serviceKey'), 'test+key=');
    return { ok: true, json: async () => ({ header: { resultCode: '00' }, body: { totalCount: 1, items: [{ itemSeq: '123', itemName: '시험 제품', efcyQesitm: '<p>원문 설명</p>' }] } }) };
  } });
  assert.equal(result.items[0].effect, '원문 설명');
  assert.equal(result.items[0].interaction, '');
  assert.equal(result.items[0].id, '123');
});
test('API validates input and separates service errors from no matches', async () => {
  const server = createApp({ search: async query => { if (query === '실패') throw new ApiError(502, '연결 실패'); return { items: [], total: 0, page: 1, pageSize: 20, hasMore: false }; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    assert.equal((await fetch(`${base}/health`)).status, 200);
    assert.equal((await fetch(`${base}/api/drugs?q=`)).status, 400);
    const empty = await fetch(`${base}/api/drugs?q=test`);
    assert.equal(empty.status, 200); assert.deepEqual((await empty.json()).items, []);
    assert.equal((await fetch(`${base}/api/drugs?q=${encodeURIComponent('실패')}`)).status, 502);
    assert.equal((await fetch(`${base}/api/drugs`, { method: 'POST' })).status, 405);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('pagination forwards requested page and preserves total and hasMore', async () => {
  const result = await searchDrugs('제품', { key: 'test', page: 2, fetchImpl: async url => {
    assert.equal(url.searchParams.get('pageNo'), '2');
    assert.equal(url.searchParams.get('numOfRows'), '20');
    return { ok: true, json: async () => ({ header: { resultCode: '00' }, body: { totalCount: 41, items: [{ itemSeq: '321', itemName: '다음 제품' }] } }) };
  } });
  assert.equal(result.total, 41); assert.equal(result.page, 2); assert.equal(result.hasMore, true);
  const last = await searchDrugs('제품', { key: 'test', page: 3, fetchImpl: async () => ({ ok: true, json: async () => ({ header: { resultCode: '00' }, body: { totalCount: 41, items: [{ itemSeq: '322', itemName: '마지막 제품' }] } }) }) });
  assert.equal(last.hasMore, false);
});
test('genuine empty results have explicit pagination metadata', async () => {
  const result = await searchDrugs('없는제품', { key: 'test', fetchImpl: async () => ({ ok: true, json: async () => ({ header: { resultCode: '00' }, body: { totalCount: 0 } }) }) });
  assert.deepEqual(result, { items: [], total: 0, page: 1, pageSize: 20, hasMore: false });
});
test('network failure and malformed products are errors rather than empty success', async () => {
  await assert.rejects(searchDrugs('제품', { key: 'test', fetchImpl: async () => { throw new Error('timeout'); } }), error => error.status === 502);
  for (const items of [[{ itemName: '코드누락' }], []]) {
    await assert.rejects(searchDrugs('제품', { key: 'test', fetchImpl: async () => ({ ok: true, json: async () => ({ header: { resultCode: '00' }, body: { totalCount: 20, items } }) }) }), error => error.status === 502);
  }
});
test('HTTP pagination rejects malformed values before requesting upstream', async () => {
  let calls = 0;
  const server = createApp({ search: async (_, options) => { calls++; return { items: [], total: 0, page: options.page, pageSize: 20, hasMore: false }; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}/api/drugs?q=test`;
    for (const page of ['0', '-1', '1.2', '1e2', '2abc', '10001', '']) assert.equal((await fetch(`${base}&page=${page}`)).status, 400);
    assert.equal(calls, 0);
    const response = await fetch(`${base}&page=2`);
    assert.equal(response.status, 200); assert.equal((await response.json()).page, 2); assert.equal(calls, 1);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('product detail lookup uses the exact product code and rejects missing products', async () => {
  const {getDrug}=await import('./mfds.mjs');
  const row={itemSeq:'202106092',itemName:'테스트 제품'};
  const item=await getDrug('202106092',{key:'test',fetchImpl:async url=>{
    assert.equal(url.searchParams.get('itemSeq'),'202106092');
    assert.equal(url.searchParams.has('itemName'),false);
    return {ok:true,json:async()=>({header:{resultCode:'00'},body:{totalCount:1,items:[row]}})};
  }});
  assert.equal(item.id,'202106092');
  await assert.rejects(getDrug('202106092',{key:'test',fetchImpl:async()=>({ok:true,json:async()=>({header:{resultCode:'00'},body:{totalCount:0}})})}),error=>error.status===404);
});
test('detail route validates code before calling upstream', async () => {
  let calls=0;const server=createApp({detail:async id=>{calls++;return {id,name:'테스트 제품'};}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const base=`http://127.0.0.1:${server.address().port}`;
    assert.equal((await fetch(`${base}/api/drugs/not-a-code`)).status,400);assert.equal(calls,0);
    const response=await fetch(`${base}/api/drugs/202106092`);
    assert.equal(response.status,200);assert.equal((await response.json()).item.id,'202106092');assert.equal(calls,1);
  }finally {await new Promise(resolve=>server.close(resolve));}
});

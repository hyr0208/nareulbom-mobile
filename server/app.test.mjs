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
  const items = await searchDrugs('제품 & 이름', { key: 'test+key=', fetchImpl: async url => {
    assert.equal(url.searchParams.get('itemName'), '제품 & 이름');
    assert.equal(url.searchParams.get('serviceKey'), 'test+key=');
    return { ok: true, json: async () => ({ header: { resultCode: '00' }, body: { totalCount: 1, items: [{ itemSeq: '123', itemName: '시험 제품', efcyQesitm: '<p>원문 설명</p>' }] } }) };
  } });
  assert.equal(items[0].effect, '원문 설명');
  assert.equal(items[0].interaction, '');
  assert.equal(items[0].id, '123');
});
test('API validates input and separates service errors from no matches', async () => {
  const server = createApp({ search: async query => { if (query === '실패') throw new ApiError(502, '연결 실패'); return []; } });
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

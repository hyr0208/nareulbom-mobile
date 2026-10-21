import { searchPermitDrugs, getPermitDrug } from './permit.mjs';
import http from 'node:http';
import { ApiError, searchDrugs, getDrug } from './mfds.mjs';
export function createApp({ search = searchDrugs, detail = getDrug, permitSearch = searchPermitDrugs, permitDetail = getPermitDrug, origin = process.env.CORS_ORIGIN || 'http://localhost:8081' } = {}) {
  return http.createServer(async (request, response) => {
    const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, OPTIONS', Vary: 'Origin' };
    const send = (status, body) => { response.writeHead(status, headers); response.end(JSON.stringify(body)); };
    if (request.method === 'OPTIONS') { response.writeHead(204, headers); response.end(); return; }
    try {
      const url = new URL(request.url, 'http://localhost');
      if (request.method !== 'GET') return send(405, { message: '지원하지 않는 요청이에요.' });
      if (url.pathname === '/health') return send(200, { status: 'ok', service: 'nareulbom-api', drugSearchConfigured: Boolean(process.env.MFDS_SERVICE_KEY) });
      const source = url.searchParams.get('source') || 'easy';
      if (!['easy','permit'].includes(source)) throw new ApiError(400, '지원하지 않는 검색 범위예요.');
      if (url.pathname.startsWith('/api/drugs/')) {
        const id = url.pathname.slice('/api/drugs/'.length);
        if (!/^[0-9]{9}$/.test(id)) throw new ApiError(400, '올바른 제품 코드가 필요해요.');
        return send(200, { item: await (source === 'permit' ? permitDetail : detail)(id) });
      }
      if (url.pathname === '/api/drugs') {
        const query = (url.searchParams.get('q') || '').trim();
        if (!query || query.length > 100) throw new ApiError(400, '검색어를 1~100자로 입력해 주세요.');
        const pageText = url.searchParams.get('page') ?? '1';
        if (!/^[1-9][0-9]{0,4}$/.test(pageText) || Number(pageText) > 10000) throw new ApiError(400, '올바른 페이지 번호가 필요해요.');
        return send(200, { ...await (source === 'permit' ? permitSearch : search)(query, { page: Number(pageText) }), source });
      }
      return send(404, { message: '찾을 수 없는 주소예요.' });
    } catch (error) {
      send(error instanceof ApiError ? error.status : 500, { message: error instanceof ApiError ? error.message : '요청을 처리하지 못했어요.' });
    }
  });
}

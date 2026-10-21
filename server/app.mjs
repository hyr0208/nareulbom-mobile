import http from 'node:http';
import { ApiError, searchDrugs } from './mfds.mjs';
export function createApp({ search = searchDrugs, origin = process.env.CORS_ORIGIN || 'http://localhost:8081' } = {}) {
  return http.createServer(async (request, response) => {
    const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, OPTIONS', Vary: 'Origin' };
    const send = (status, body) => { response.writeHead(status, headers); response.end(JSON.stringify(body)); };
    if (request.method === 'OPTIONS') { response.writeHead(204, headers); response.end(); return; }
    try {
      const url = new URL(request.url, 'http://localhost');
      if (request.method !== 'GET') return send(405, { message: '지원하지 않는 요청이에요.' });
      if (url.pathname === '/health') return send(200, { status: 'ok', service: 'nareulbom-api', drugSearchConfigured: Boolean(process.env.MFDS_SERVICE_KEY) });
      if (url.pathname === '/api/drugs') {
        const query = (url.searchParams.get('q') || '').trim();
        if (!query || query.length > 100) throw new ApiError(400, '검색어를 1~100자로 입력해 주세요.');
        return send(200, { items: await search(query), source: '식약처 e약은요', limit: 20 });
      }
      return send(404, { message: '찾을 수 없는 주소예요.' });
    } catch (error) {
      send(error instanceof ApiError ? error.status : 500, { message: error instanceof ApiError ? error.message : '요청을 처리하지 못했어요.' });
    }
  });
}

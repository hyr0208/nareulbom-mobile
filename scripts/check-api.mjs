import { searchDrugs } from '../server/mfds.mjs';
if (!process.env.MFDS_SERVICE_KEY?.trim()) {
  console.error('MFDS_SERVICE_KEY가 비어 있어요. e약은요 활용 신청 후 .env에 Decoding 인증키를 입력하세요.');
  process.exitCode = 1;
} else {
  try {
    const result = await searchDrugs('타이레놀');
    console.log(`e약은요 연결 확인: 전체 ${result.total}개, 첫 페이지 ${result.items.length}개`);
    if (result.total === 0) { console.error('응답은 받았지만 검증 검색어의 결과가 없어 추가 확인이 필요해요.'); process.exitCode = 1; }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}

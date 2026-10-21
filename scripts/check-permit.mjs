import {searchPermitDrugs} from '../server/permit.mjs';
try {
  const result=await searchPermitDrugs('노바스크');
  console.log(`의약품 허가정보 연결: 전체 ${result.total}개, 첫 페이지 ${result.items.length}개`);
  if(!result.total){console.error('응답은 받았지만 검증 검색어의 결과가 없어 추가 확인이 필요해요.');process.exitCode=1;}
}catch(error){console.error(error.message);process.exitCode=1;}

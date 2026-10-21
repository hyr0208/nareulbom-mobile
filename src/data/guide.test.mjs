import test from 'node:test';
import assert from 'node:assert/strict';
import { guides,selectGuides } from './guide-data.ts';
import { emptyHealthProfile } from './medicine-model.ts';
const record=patch=>({version:1,consentAt:'2026-10-21T00:00:00Z',remember:false,profile:{...emptyHealthProfile(),...patch}});
test('no profile has no invented personal matches while all public materials remain available',()=>{
  assert.deepEqual(selectGuides(null),{matches:[],unmatched:[]});assert.equal(guides.length,6);
});
test('multiple goals deduplicate a shared article while retaining matching reasons',()=>{
  const result=selectGuides(record({goals:['sleep','energy','nutrition','medicine']}));
  assert.deepEqual(result.matches.map(item=>item.guide.id),['sleep','supplements','vitamin-d']);
  assert.equal(result.matches[0].reasons.length,2);assert.equal(result.matches[1].reasons.length,2);
});
test('only confirmed condition entries match exact reviewed names and unknown entries remain explicit',()=>{
  const result=selectGuides(record({conditions:{status:'yes',items:[' 고혈압 ','당뇨병','고혈압 의심','폐고혈압','기타 질환','constructor']}}));
  assert.deepEqual(result.matches.map(item=>item.guide.id),['hypertension','diabetes']);
  assert.deepEqual(result.unmatched,['고혈압 의심','폐고혈압','기타 질환','constructor']);
  assert.deepEqual(selectGuides(record({conditions:{status:'unknown',items:[]}})).matches,[]);
});
test('allergies and low sleep duration do not become diagnosis or supplement recommendations',()=>{
  const result=selectGuides(record({allergies:{status:'yes',items:['고혈압']},sleep:'under6'}));assert.deepEqual(result.matches,[]);
});
test('every source has a fixed official URL and a separate checked date; unavailable update dates stay null',()=>{
  for(const guide of guides){const url=new URL(guide.url);assert.equal(url.protocol,'https:');assert.ok(['health.kdca.go.kr','ods.od.nih.gov','www.nhlbi.nih.gov'].includes(url.hostname));assert.equal(guide.checkedAt,'2026-10-21');assert.ok(guide.sourceUpdatedAt===null||/^\d{4}-\d{2}-\d{2}$/.test(guide.sourceUpdatedAt));if(guide.kind==='original')assert.deepEqual(guide.points,[]);}
  assert.equal(guides.find(item=>item.id==='hypertension').sourceUpdatedAt,null);
});

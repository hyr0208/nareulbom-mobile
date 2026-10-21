import test from 'node:test';
import assert from 'node:assert/strict';
import { homeOverview } from './home-model.ts';
import { emptyHealthProfile,createManualMedicine } from './medicine-model.ts';
const record=profile=>({version:1,consentAt:'2026-10-21T00:00:00Z',remember:false,profile});
const medicine=()=>createManualMedicine({name:'테스트 제품',manufacturer:'',strength:'',category:'medicine'});
test('skipping health consent still offers a profile entry without inventing answers',()=>{
  const view=homeOverview(null,[]);assert.equal(view.actions[0].step,1);assert.deepEqual(view.missing,[]);assert.equal(view.unscheduled,0);
});
test('unknown health and medication status remain missing while none answers are respected',()=>{
  const p=emptyHealthProfile();const unknown=homeOverview(record(p),[]);
  assert.ok(unknown.missing.includes('건강 상태'));assert.ok(unknown.missing.includes('복용 여부'));
  const none=homeOverview(record({...p,conditions:{status:'none',items:[]},allergies:{status:'none',items:[]},medicationStatus:'none'}),[]);
  assert.ok(!none.missing.includes('건강 상태'));assert.ok(!none.missing.includes('복용 여부'));assert.ok(!none.actions.some(action=>action.id==='products'));
});
test('known medication use with no listed products links to search without claiming a completed dose',()=>{
  const view=homeOverview(record({...emptyHealthProfile(),medicationStatus:'taking'}),[]);
  assert.equal(view.actions.find(action=>action.id==='products').target,'/search');assert.equal(view.unscheduled,0);
});
test('manual products and absent schedules are tracked separately and respond to regimen changes',()=>{
  const item=medicine();const before=homeOverview(null,[item]);assert.equal(before.unverified,1);assert.equal(before.unscheduled,1);assert.equal(before.actions[0].target,'/medicines');
  const after=homeOverview(null,[{...item,regimen:{dose:'확인한 복용량',mode:'asNeeded',times:[]}}]);assert.equal(after.unverified,1);assert.equal(after.unscheduled,0);assert.ok(!after.actions.some(action=>action.id==='schedule'));
});
test('optional body measurements and sex do not become required completion tasks',()=>{
  const profile={...emptyHealthProfile(),goals:['routine'],ageBand:'30-39',conditions:{status:'none',items:[]},allergies:{status:'none',items:[]},medicationStatus:'none',sleep:'6-8',exercise:'rare',smoking:'never',alcohol:'none'};
  const view=homeOverview(record(profile),[]);assert.deepEqual(view.missing,[]);assert.deepEqual(view.actions,[]);
});

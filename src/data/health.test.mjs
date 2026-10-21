import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyHealthProfile, validateHealthProfile, persistedSnapshot, restoreSnapshot, createManualMedicine } from './medicine-model.ts';
import { createVault } from './vault-core.ts';
const record = (remember=true) => ({version:1,consentAt:'2026-10-21T00:00:00Z',remember,profile:{...emptyHealthProfile(),goals:['routine'],conditions:{status:'yes',items:['테스트 질환']}}});
const medicine = createManualMedicine({name:'테스트 제품',strength:'',manufacturer:'',category:'medicine'});
test('skipped answers remain unknown and entered numeric and status fields are validated',()=>{
  const empty=emptyHealthProfile();assert.deepEqual(validateHealthProfile(empty),empty);
  assert.equal(empty.conditions.status,'unknown');assert.notEqual(empty.conditions.status,'none');
  for(const patch of [{height:'-1'},{weight:'0'},{height:'abc'},{goals:['invented']},{pregnancy:'invalid'},{conditions:{status:'none',items:['test']}}])assert.throws(()=>validateHealthProfile({...empty,...patch}));
  assert.deepEqual(validateHealthProfile({...empty,allergies:{status:'yes',items:[' 시험 알레르기 ','','시험 알레르기']}}).allergies.items,['시험 알레르기']);
});
test('health storage consent never persists an unconsented medicine list',()=>{
  const snapshot=persistedSnapshot({medicines:[medicine],consentAt:null,health:record(),onboardingDone:true});
  assert.equal(snapshot.version,2);assert.equal(snapshot.consentAt,null);assert.deepEqual(snapshot.medicines,[]);assert.equal(snapshot.health.profile.conditions.items[0],'테스트 질환');
  assert.deepEqual(restoreSnapshot(JSON.parse(JSON.stringify(snapshot))),snapshot);
  assert.throws(()=>restoreSnapshot({...snapshot,medicines:[medicine]}));
});
test('medicine storage consent excludes temporary health answers and no health consent retains only the completion marker',()=>{
  const state={medicines:[medicine],health:record(false),onboardingDone:true,consentAt:'2026-10-21T00:00:00Z'};
  const snapshot=persistedSnapshot(state);assert.equal(snapshot.health,undefined);assert.equal(snapshot.medicines.length,1);
  const marker=persistedSnapshot({...state,consentAt:null});assert.equal(marker.health,undefined);assert.deepEqual(marker.medicines,[]);assert.equal(restoreSnapshot(marker).onboardingDone,true);
  assert.equal(persistedSnapshot({...state,consentAt:null,onboardingDone:false}),null);
});
test('restoration rejects health records without storage consent or a valid consent version',()=>{
  const snapshot=persistedSnapshot({medicines:[],consentAt:null,health:record(),onboardingDone:true});
  assert.throws(()=>restoreSnapshot({...snapshot,health:record(false)}));
  assert.throws(()=>restoreSnapshot({...snapshot,health:{...record(),version:2}}));
  assert.throws(()=>restoreSnapshot({...snapshot,health:{...record(),consentAt:''}}));
});
test('health profile restores through a fresh secure-store adapter and whole deletion clears it',async()=>{
  const values=new Map();const store={get:async key=>values.get(key)??null,set:async(key,value)=>{values.set(key,value);},remove:async key=>{values.delete(key);}};
  const snapshot=persistedSnapshot({medicines:[],consentAt:null,health:record(),onboardingDone:true});
  await createVault(store).write(snapshot);const restored=restoreSnapshot(await createVault(store).read());
  assert.equal(restored.onboardingDone,true);assert.deepEqual(restored.health,record());
  await createVault(store).clear();assert.equal(await createVault(store).read(),null);assert.equal(values.size,0);
});

test('a completion marker cannot smuggle health or medication data without consent',()=>{
  const marker=persistedSnapshot({medicines:[medicine],health:record(false),consentAt:null,onboardingDone:true});
  assert.deepEqual(marker,{version:2,consentVersion:1,consentAt:null,medicines:[],onboardingDone:true});
  assert.throws(()=>restoreSnapshot({...marker,medicines:[medicine]}));
  assert.throws(()=>restoreSnapshot({...marker,onboardingDone:false}));
});

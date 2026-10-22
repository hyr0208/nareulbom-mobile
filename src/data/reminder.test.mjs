import test from 'node:test';
import assert from 'node:assert/strict';
import { reminderPlan, reminderPlanKey, syncReminderPlan } from './reminder-model.ts';
import { createManualMedicine, persistedSnapshot, restoreSnapshot } from './medicine-model.ts';
const product=()=>({...createManualMedicine({name:'비공개 테스트 제품',strength:'',manufacturer:'',category:'medicine'}),regimen:{dose:'비공개 복용량',mode:'daily',times:['20:00','08:00']}});
function driver({allowed=true,failAt=0,cancelFailsAt=0}={}) {
  const pending=new Map([['stale',true]]);let cancels=0;let schedules=0;const events=[];
  return {pending,events,api:{cancel:async()=>{events.push('cancel');if(++cancels===cancelFailsAt)throw new Error('cancel failed');pending.clear();},allowed:async()=>{events.push('permission');return allowed;},schedule:async time=>{events.push(time.time);if(++schedules===failAt)throw new Error('schedule failed');pending.set(time.id,time);}}};
}
test('same-time medicines share one sorted daily notification and PRN or unscheduled products are excluded',()=>{
  const a=product();const b={...product(),regimen:{dose:'2정',mode:'daily',times:['08:00','12:30']}};
  const prn={...product(),regimen:{dose:'1정',mode:'asNeeded',times:[]}};
  const plan=reminderPlan([a,b,prn,{...product(),regimen:undefined}],true);
  assert.deepEqual(plan.map(item=>item.time),['08:00','12:30','20:00']);assert.deepEqual([plan[1].hour,plan[1].minute],[12,30]);
  assert.ok(!JSON.stringify(plan).includes(a.name));assert.ok(!JSON.stringify(plan).includes(a.regimen.dose));assert.ok(!JSON.stringify(plan).includes(a.id));
  assert.deepEqual(reminderPlan([a,b],false),[]);
});
test('dose or product-name edits retain the generic alarm plan, while time changes, removals and disabling update it',()=>{
  const a=product();const renamed={...a,name:'다른 이름',regimen:{...a.regimen,dose:'2정'}};
  assert.equal(reminderPlanKey([a],true),reminderPlanKey([renamed],true));
  assert.notEqual(reminderPlanKey([a],true),reminderPlanKey([{...a,regimen:{...a.regimen,times:['09:00']}}],true));
  assert.notEqual(reminderPlanKey([a],true),reminderPlanKey([],true));
  assert.notEqual(reminderPlanKey([a],true),reminderPlanKey([a],false));
});
test('invalid times and excessive distinct times fail before scheduling rather than silently dropping alarms',()=>{
  const a=product();assert.throws(()=>reminderPlan([{...a,regimen:{...a.regimen,times:['24:00']}}],true));
  const times=Array.from({length:61},(_,i)=>`${String(Math.floor(i/60)).padStart(2,'0')}:${String(i%60).padStart(2,'0')}`);
  assert.throws(()=>reminderPlan([{...a,regimen:{...a.regimen,times}}],true),/60/);
});
test('reconciliation removes old requests before scheduling and repeated app startup never duplicates alarms',async()=>{
  const d=driver();const plan=reminderPlan([product()],true);
  assert.equal(await syncReminderPlan(d.api,plan),2);assert.deepEqual(d.events,['cancel','permission','08:00','20:00']);assert.equal(d.pending.size,2);
  await syncReminderPlan(d.api,plan);assert.equal(d.pending.size,2);assert.ok(!d.pending.has('stale'));
});
test('disable, last-product deletion, and whole deletion cancel pending notifications without asking permission',async()=>{
  for(const plan of [reminderPlan([product()],false),reminderPlan([],true),[]]){
    const d=driver({allowed:false});assert.equal(await syncReminderPlan(d.api,plan),0);assert.equal(d.pending.size,0);assert.deepEqual(d.events,['cancel']);
  }
});
test('revoked permission cancels stale alarms and reports failure without scheduling',async()=>{
  const d=driver({allowed:false});await assert.rejects(syncReminderPlan(d.api,reminderPlan([product()],true)),/권한/);assert.equal(d.pending.size,0);assert.deepEqual(d.events,['cancel','permission']);
});
test('partial scheduling failures clean all requests and cancellation failures stay explicit',async()=>{
  const d=driver({failAt:2});await assert.rejects(syncReminderPlan(d.api,reminderPlan([product()],true)),/예약/);assert.equal(d.pending.size,0);assert.equal(d.events.at(-1),'cancel');
  const blocked=driver({cancelFailsAt:1});await assert.rejects(syncReminderPlan(blocked.api,reminderPlan([product()],true)));assert.equal(blocked.pending.size,1);assert.deepEqual(blocked.events,['cancel']);
  const partial=driver({failAt:2,cancelFailsAt:2});await assert.rejects(syncReminderPlan(partial.api,reminderPlan([product()],true)),/일부 알림/);
});
test('reminder preference restores only with medicine storage consent; old data defaults off',()=>{
  const a=product();const state={medicines:[a],consentAt:'2026-10-22T00:00:00Z',health:null,onboardingDone:true,remindersEnabled:true};
  assert.equal(restoreSnapshot(persistedSnapshot(state)).remindersEnabled,true);
  assert.equal(restoreSnapshot(persistedSnapshot({...state,remindersEnabled:false})).remindersEnabled,undefined);
  assert.throws(()=>persistedSnapshot({...state,consentAt:null}),/동의/);
  const marker=persistedSnapshot({...state,medicines:[],consentAt:null,remindersEnabled:false});
  assert.throws(()=>restoreSnapshot({...marker,remindersEnabled:true}),/동의/);
  assert.throws(()=>restoreSnapshot({...persistedSnapshot(state),remindersEnabled:'yes'}),/알림/);
});

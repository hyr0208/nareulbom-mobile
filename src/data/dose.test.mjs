import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { changeDoseRecord, todayDoses, localDateKey, recentDoseRecords } from './dose-model.ts';
import { createManualMedicine, persistedSnapshot, restoreSnapshot, validateDoseRecords } from './medicine-model.ts';
import { createVault } from './vault-core.ts';
const now = new Date(2026,9,22,12,30);
const date = localDateKey(now);
const medicine = {...createManualMedicine({name:'기록 테스트 제품',strength:'',manufacturer:'',category:'medicine'}),regimen:{dose:'1정',mode:'daily',times:['20:00','08:00']}};
const slot = {medicineId:medicine.id,date,time:'08:00',dose:'1정'};
const state = records => ({medicines:[medicine],consentAt:'2026-10-21T00:00:00Z',health:null,onboardingDone:true,doseRecords:records,recordConsentAt:'2026-10-22T00:00:00Z'});
test('today slots sort by time, never invent records, and exclude PRN / missing schedules',()=>{
  const prn={...medicine,id:medicine.id+'prn',regimen:{dose:'1정',mode:'asNeeded',times:[]}};
  const rows=todayDoses([medicine,prn,{...medicine,id:'empty',regimen:undefined}],[],date);
  assert.deepEqual(rows.map(row=>row.time),['08:00','20:00']);assert.ok(rows.every(row=>row.record===undefined));
});
test('each slot and each medicine has an independent taken/skipped record, duplicate clicks reject and undo restores pending',()=>{
  const second={...medicine,id:medicine.id+'other'};
  let records=changeDoseRecord([medicine,second],[],slot,'taken',now);
  assert.throws(()=>changeDoseRecord([medicine,second],records,slot,'skipped',now),/이미 기록/);
  records=changeDoseRecord([medicine,second],records,{...slot,medicineId:second.id},'skipped',now);
  records=changeDoseRecord([medicine,second],records,{...slot,time:'20:00'},'skipped',now);
  const rows=todayDoses([medicine,second],records,date);
  assert.equal(rows.filter(row=>row.record?.status==='taken').length,1);
  assert.equal(rows.filter(row=>row.record?.status==='skipped').length,2);
  records=changeDoseRecord([medicine,second],records,slot,null,now);
  assert.equal(records.length,2);assert.equal(todayDoses([medicine,second],records,date).find(row=>row.medicineId===medicine.id&&row.time==='08:00').record,undefined);
});
test('old-day controls cannot write after midnight; new day is unrecorded',()=>{
  const records=changeDoseRecord([medicine],[],slot,'taken',now);
  const tomorrow=new Date(2026,9,23,0,0);
  assert.throws(()=>changeDoseRecord([medicine],records,slot,'taken',tomorrow),/날짜/);
  assert.throws(()=>changeDoseRecord([medicine],records,slot,null,tomorrow),/날짜/);
  assert.ok(todayDoses([medicine],records,localDateKey(tomorrow)).every(row=>!row.record));
});
test('schedule edits retain old records visibly without marking the new dose/time complete',()=>{
  const records=changeDoseRecord([medicine],[],slot,'taken',now);
  const changed={...medicine,regimen:{dose:'2정',mode:'daily',times:['08:00','21:00']}};
  const rows=todayDoses([changed],records,date);
  assert.equal(rows.length,3);assert.equal(rows.filter(row=>!row.changed&&row.record).length,0);
  assert.equal(rows.find(row=>row.changed).dose,'1정');
  assert.throws(()=>changeDoseRecord([changed],[],slot,'taken',now),/일정/);
  assert.deepEqual(changeDoseRecord([changed],records,slot,null,now),[]);
  assert.throws(()=>changeDoseRecord([],records,slot,null,now),/제품/);
  const prn={...medicine,regimen:{dose:'1정',mode:'asNeeded',times:[]}};
  assert.throws(()=>changeDoseRecord([prn],[],slot,'taken',now),/일정/);
});
test('local calendar day respects timezone across UTC date boundaries',()=>{
  const url=new URL('./dose-model.ts',import.meta.url).href;
  for(const [tz,expected] of [['Asia/Seoul','2026-10-22'],['America/Los_Angeles','2026-10-21']]){
    const result=spawnSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',`import {localDateKey} from ${JSON.stringify(url)}; process.stdout.write(localDateKey(new Date('2026-10-21T16:00:00Z')));`],{env:{...process.env,TZ:tz},encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);assert.equal(result.stdout,expected);
  }
});
test('retention includes 30 calendar days only; full capacity fails without changing the original records',()=>{
  const records=changeDoseRecord([medicine],[],slot,'taken',now);
  assert.equal(recentDoseRecords([{...records[0],date:'2026-09-22'},{...records[0],date:'2026-09-23'}],now).length,1);
  const full=Array.from({length:400},(_,i)=>({...records[0],medicineId:`id-${i}`}));
  assert.throws(()=>changeDoseRecord([medicine],full,slot,'taken',now),/400/);assert.equal(full.length,400);
});
test('separate record consent is required even with medicine or health storage consent; old snapshots still restore',()=>{
  const records=changeDoseRecord([medicine],[],slot,'taken',now);
  const saved= persistedSnapshot(state(records));
  assert.equal(restoreSnapshot(saved).doseRecords.length,1);
  const without=persistedSnapshot({...state(records),recordConsentAt:null});
  assert.equal(without.doseRecords,undefined);assert.equal(without.recordConsentAt,undefined);assert.equal(restoreSnapshot(without).medicines.length,1);
  assert.throws(()=>persistedSnapshot({...state(records),consentAt:null}),/보관 동의/);
  assert.throws(()=>restoreSnapshot({...without,doseRecords:records}),/동의/);
  assert.throws(()=>restoreSnapshot({...saved,recordConsentAt:'invalid'}),/동의/);
  assert.throws(()=>restoreSnapshot({...saved,consentAt:null,medicines:[]}),/동의/);
});
test('corrupt, duplicate, impossible dates and orphaned records are rejected on restoration',()=>{
  const [record]=changeDoseRecord([medicine],[],slot,'taken',now);
  for(const patch of [{date:'2026-02-30'},{date:'not-date'},{time:'24:00'},{status:'pending'},{dose:''},{medicineId:'unknown'},{recordedAt:'wrong'}]) assert.throws(()=>validateDoseRecords([{...record,...patch}],[medicine]));
  assert.throws(()=>validateDoseRecords([record,record],[medicine]));
});
test('record consent round-trips through secure vault; failed writes preserve prior state; withdrawal and whole deletion remove records',async()=>{
  const values=new Map();const store={get:async key=>values.get(key)??null,set:async(key,value)=>{values.set(key,value);},remove:async key=>{values.delete(key);}};
  const records=changeDoseRecord([medicine],[],slot,'taken',now);
  await createVault(store).write(persistedSnapshot(state(records)));
  const restored=restoreSnapshot(await createVault(store).read());assert.deepEqual(restored.doseRecords,records);
  const set=store.set;store.set=async()=>{throw new Error('locked');};
  await assert.rejects(createVault(store).write(persistedSnapshot(state([]))));
  assert.deepEqual(restoreSnapshot(await createVault(store).read()).doseRecords,records);store.set=set;
  await createVault(store).write(persistedSnapshot({...state([]),recordConsentAt:null}));
  const withdrawn=restoreSnapshot(await createVault(store).read());assert.equal(withdrawn.doseRecords,undefined);assert.equal(withdrawn.medicines.length,1);
  assert.ok([...values.values()].every(value=>!value.includes('recordedAt')));
  await createVault(store).clear();assert.equal(await createVault(store).read(),null);assert.equal(values.size,0);
});

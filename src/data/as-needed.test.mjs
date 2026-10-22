import test from 'node:test';
import assert from 'node:assert/strict';
import { asNeededRecordsForDate, changeDoseRecord, doseKey, localDateKey, recordAsNeededDose, recordHistoryWindow, recordHistorySummary, recordsForDate, todayDoses } from './dose-model.ts';
import { createManualMedicine, persistedSnapshot, restoreSnapshot, validateDoseRecords } from './medicine-model.ts';
import { createVault } from './vault-core.ts';
import { reminderPlanKey } from './reminder-model.ts';
const now=new Date(2026,9,22,12,30);
const date=localDateKey(now);
const medicine={...createManualMedicine({name:'필요 시 테스트 제품',strength:'',manufacturer:'',category:'medicine'}),regimen:{mode:'asNeeded',dose:'등록한 복용량',times:[]}};
const slot={medicineId:medicine.id,date,time:'08:10',dose:'  실제 1정  '};
const state=records=>({medicines:[medicine],health:null,onboardingDone:true,consentAt:'2026-10-22T00:00:00Z',recordConsentAt:'2026-10-22T00:00:00Z',doseRecords:records});
test('PRN records retain user-entered actual time/dose and creation timestamp without changing the saved regimen',()=>{
  const before=structuredClone(medicine);const [record]=recordAsNeededDose([medicine],[],slot,now);
  assert.equal(record.kind,'asNeeded');assert.equal(record.status,'taken');assert.equal(record.dose,'실제 1정');assert.equal(record.time,'08:10');assert.equal(record.recordedAt,now.toISOString());assert.equal(record.medicineName,medicine.name);assert.deepEqual(medicine,before);
});
test('multiple actual times are independent, newest first, and duplicate product/minute clicks reject even with changed dose',()=>{
  let records=recordAsNeededDose([medicine],[],slot,now);
  assert.throws(()=>recordAsNeededDose([medicine],records,slot,now),/이미/);
  assert.throws(()=>recordAsNeededDose([medicine],records,{...slot,dose:'다른 복용량'},now),/이미/);
  records=recordAsNeededDose([medicine],records,{...slot,time:'11:00'},now);
  assert.deepEqual(asNeededRecordsForDate(records,date).map(record=>record.time),['11:00','08:10']);assert.equal(records[0].time,'08:10');
  const other={...medicine,id:medicine.id+'other'};assert.equal(recordAsNeededDose([medicine,other],records,{...slot,medicineId:other.id},now).length,3);
});
test('invalid, future or stale-date actual times and empty/overlong doses are rejected before mutation',()=>{
  for(const patch of [{time:'8:10'},{time:''},{time:'24:00'},{time:'08:60'},{time:'12:31'},{date:'2026-10-21'},{date:'2026-10-23'},{dose:''},{dose:' '},{dose:'x'.repeat(41)}]) assert.throws(()=>recordAsNeededDose([medicine],[],{...slot,...patch},now));
  assert.equal(recordAsNeededDose([medicine],[],{...slot,time:'12:30'},now).length,1);
  assert.throws(()=>recordAsNeededDose([medicine],[],slot,new Date(2026,9,23,0,0)),/날짜/);
});
test('only a current PRN product can create PRN records; stale, deleted, daily or missing regimens cannot',()=>{
  assert.throws(()=>recordAsNeededDose([],[],slot,now),/제품/);
  for(const regimen of [undefined,{mode:'daily',dose:'1정',times:['08:10']}]) assert.throws(()=>recordAsNeededDose([{...medicine,regimen}],[],slot,now),/필요 시/);
});
test('PRN records never become daily pending/changed slots and cannot be marked skipped through the daily action',()=>{
  const records=recordAsNeededDose([medicine],[],slot,now);
  assert.deepEqual(todayDoses([medicine],records,date),[]);
  const daily={...medicine,regimen:{mode:'daily',dose:'실제 1정',times:['08:10']}};
  const rows=todayDoses([daily],records,date);assert.equal(rows.length,1);assert.equal(rows[0].changed,false);assert.equal(rows[0].record,undefined);
  assert.throws(()=>changeDoseRecord([daily],records,records[0],'skipped',now),/별도/);
  assert.equal(reminderPlanKey([medicine],true),JSON.stringify([true,[]]));
});
test('same-minute daily schedule and actual PRN entries have distinct keys; undo removes just the selected kind even after a regimen change',()=>{
  const dailyRecord={medicineId:medicine.id,medicineName:medicine.name,date,time:'08:10',dose:'실제 1정',status:'taken',recordedAt:now.toISOString()};
  const records=recordAsNeededDose([medicine],[dailyRecord],slot,now);assert.notEqual(doseKey(records[0]),doseKey(records[1]));
  const daily={...medicine,regimen:{mode:'daily',dose:'실제 1정',times:['08:10']}};
  const after=changeDoseRecord([daily],records,records[1],null,now);assert.deepEqual(after,[dailyRecord]);
  assert.equal(recordsForDate(records,date,recordHistoryWindow(now)).length,2);assert.deepEqual(recordHistorySummary(records,recordHistoryWindow(now)).byDate.get(date),{taken:2,skipped:0});
});
test('new kind survives persistence and old records without a kind remain daily-compatible',()=>{
  const records=recordAsNeededDose([medicine],[],slot,now);
  assert.equal(restoreSnapshot(persistedSnapshot(state(records))).doseRecords[0].kind,'asNeeded');
  const legacy={...records[0]};delete legacy.kind;
  const restored=restoreSnapshot(persistedSnapshot(state([legacy])));assert.equal(restored.doseRecords[0].kind,undefined);assert.deepEqual(asNeededRecordsForDate(restored.doseRecords,date),[]);
  assert.equal(persistedSnapshot({...state(records),recordConsentAt:null}).doseRecords,undefined);
});
test('restoration rejects unknown kinds, skipped PRN records, and duplicate product/actual minute regardless of dose',()=>{
  const [record]=recordAsNeededDose([medicine],[],slot,now);
  for(const kind of ['daily','wrong','',null]) assert.throws(()=>validateDoseRecords([{...record,kind}],[medicine]));
  assert.throws(()=>validateDoseRecords([{...record,status:'skipped'}],[medicine]));
  assert.throws(()=>validateDoseRecords([record,{...record,dose:'2정'}],[medicine]));
  const cleaned=validateDoseRecords([{...record,unexpectedHealthAnswer:'not persisted'}],[medicine]);assert.equal(cleaned[0].unexpectedHealthAnswer,undefined);
});
test('PRN records share retention/capacity with daily records and do not silently evict recent data',()=>{
  const [record]=recordAsNeededDose([medicine],[],slot,now);
  const full=Array.from({length:400},(_,index)=>({...record,medicineId:'other-'+index}));
  assert.throws(()=>recordAsNeededDose([medicine],full,slot,now),/400/);assert.equal(full.length,400);
  assert.equal(recordAsNeededDose([medicine],full.map(record=>({...record,date:'2026-09-22'})),slot,now).length,1);
});
test('secure vault restores the new kind after restart and failed staged writes preserve its prior record',async()=>{
  const values=new Map();const store={get:async key=>values.get(key)??null,set:async(key,value)=>{values.set(key,value);},remove:async key=>{values.delete(key);}};
  const records=recordAsNeededDose([medicine],[],slot,now);await createVault(store).write(persistedSnapshot(state(records)));
  assert.deepEqual(restoreSnapshot(await createVault(store).read()).doseRecords,records);
  const original=store.set;store.set=async()=>{throw new Error('locked');};await assert.rejects(createVault(store).write(persistedSnapshot(state([]))));
  assert.deepEqual(restoreSnapshot(await createVault(store).read()).doseRecords,records);store.set=original;
  await createVault(store).clear();assert.equal(await createVault(store).read(),null);
});

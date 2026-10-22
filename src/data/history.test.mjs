import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { firstRecordDateInMonth, recordCalendarMonth, recordHistorySummary, recordHistoryWindow, recordsForDate, selectableRecordDate, shiftRecordMonth } from './dose-model.ts';
const now=new Date(2026,9,22,12);
const window=recordHistoryWindow(now);
const record=(patch={})=>({medicineId:'test-product',medicineName:'기록 당시 제품명',date:'2026-10-22',time:'08:00',dose:'기록 당시 복용량',status:'taken',recordedAt:'2026-10-22T00:10:00Z',...patch});
test('month grid uses Sunday-first complete weeks with correct leading and trailing blanks',()=>{
  const jan=recordCalendarMonth('2026-01');assert.equal(jan.length,35);assert.deepEqual(jan.slice(0,4),[null,null,null,null]);assert.equal(jan[4],'2026-01-01');assert.equal(jan.at(-1),'2026-01-31');
  const nov=recordCalendarMonth('2026-11');assert.equal(nov[0],'2026-11-01');assert.equal(nov.filter(Boolean).length,30);assert.equal(nov.length%7,0);
  const aug=recordCalendarMonth('2026-08');assert.equal(aug.length,42);assert.equal(aug.filter(Boolean).at(-1),'2026-08-31');
});
test('leap years, century rules and year/month navigation stay correct',()=>{
  assert.ok(recordCalendarMonth('2024-02').includes('2024-02-29'));
  assert.ok(recordCalendarMonth('2000-02').includes('2000-02-29'));
  assert.equal(recordCalendarMonth('2100-02').filter(Boolean).length,28);
  assert.equal(shiftRecordMonth('2026-01',-1),'2025-12');assert.equal(shiftRecordMonth('2026-12',1),'2027-01');
  assert.throws(()=>recordCalendarMonth('2026-13'));assert.throws(()=>shiftRecordMonth('not-a-month',1));
});
test('30-day inclusive window spans year changes and can overlap three months',()=>{
  assert.deepEqual(recordHistoryWindow(new Date(2027,0,5,12)),{first:'2026-12-07',today:'2027-01-05'});
  const three=recordHistoryWindow(new Date(2026,2,1,12));assert.deepEqual(three,{first:'2026-01-31',today:'2026-03-01'});
  assert.equal(firstRecordDateInMonth('2026-01',three),'2026-01-31');assert.equal(firstRecordDateInMonth('2026-02',three),'2026-02-01');assert.equal(firstRecordDateInMonth('2026-03',three),'2026-03-01');
});
test('selection is limited to real dates in the retention window and month navigation never selects a disabled date',()=>{
  assert.deepEqual(window,{first:'2026-09-23',today:'2026-10-22'});
  assert.equal(firstRecordDateInMonth('2026-09',window),'2026-09-23');assert.equal(firstRecordDateInMonth('2026-10',window),'2026-10-22');
  for(const month of ['2026-08','2026-11'])assert.throws(()=>firstRecordDateInMonth(month,window));
  for(const date of ['2026-09-22','2026-10-23','2026-10-2','2026-10-32','not-date'])assert.equal(selectableRecordDate(date,window),false);
  assert.equal(selectableRecordDate('2026-09-23',window),true);assert.equal(selectableRecordDate('2026-10-22',window),true);
});
test('summary counts actual saved taken/skipped records only, excluding expired, future and malformed dates',()=>{
  const records=[record(),record({time:'20:00',status:'skipped'}),record({date:'2026-09-23'}),record({date:'2026-09-22'}),record({date:'2026-10-23'}),record({date:'2026-10-2'})];
  const summary=recordHistorySummary(records,window);assert.equal(summary.taken,2);assert.equal(summary.skipped,1);assert.equal(summary.recordedDays,2);assert.deepEqual(summary.byDate.get('2026-10-22'),{taken:1,skipped:1});
  assert.equal(summary.byDate.has('2026-10-21'),false);assert.equal('missed' in summary,false);assert.equal('adherence' in summary,false);
});
test('date details preserve original name and dose, sort by schedule time, and never mutate source data',()=>{
  const records=[record({time:'20:00',status:'skipped'}),record(),record({date:'2026-10-21',medicineName:'이전 기록'})];const before=structuredClone(records);
  const rows=recordsForDate(records,'2026-10-22',window);assert.deepEqual(rows.map(row=>row.time),['08:00','20:00']);assert.equal(rows[0].medicineName,'기록 당시 제품명');assert.equal(rows[0].dose,'기록 당시 복용량');assert.deepEqual(records,before);
  assert.deepEqual(recordsForDate(records,'2026-09-22',window),[]);assert.deepEqual(recordsForDate(records,'2026-10-23',window),[]);
});
test('undo and deletion immediately remove dots and totals; no record is not interpreted as a missed dose',()=>{
  const original=recordHistorySummary([record()],window);assert.equal(original.recordedDays,1);
  const empty=recordHistorySummary([],window);assert.equal(empty.recordedDays,0);assert.equal(empty.taken,0);assert.equal(empty.skipped,0);assert.equal(empty.byDate.size,0);assert.deepEqual(recordsForDate([],'2026-10-21',window),[]);
});
test('a retained view excludes a record that ages out at midnight without requiring a storage mutation',()=>{
  const recordAtEdge=record({date:'2026-09-23'});assert.equal(recordHistorySummary([recordAtEdge],window).taken,1);
  const tomorrow=recordHistoryWindow(new Date(2026,9,23,0));assert.equal(recordHistorySummary([recordAtEdge],tomorrow).taken,0);assert.equal(selectableRecordDate(recordAtEdge.date,tomorrow),false);
});
test('history window uses the device day across UTC and daylight-saving boundaries',()=>{
  const url=new URL('./dose-model.ts',import.meta.url).href;
  for(const [tz,expected] of [['UTC',{first:'2026-02-08',today:'2026-03-09'}],['America/New_York',{first:'2026-02-07',today:'2026-03-08'}]]){
    const child=spawnSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',`import {recordHistoryWindow} from ${JSON.stringify(url)}; process.stdout.write(JSON.stringify(recordHistoryWindow(new Date('2026-03-09T01:30:00Z'))));`],{env:{...process.env,TZ:tz},encoding:'utf8'});
    assert.equal(child.status,0,child.stderr);assert.deepEqual(JSON.parse(child.stdout),expected);
  }
});

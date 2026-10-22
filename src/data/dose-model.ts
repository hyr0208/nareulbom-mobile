import type { DoseRecord, Medicine } from './medicine-model';
export type DoseSlot = { medicineId: string; date: string; time: string; dose: string; kind?: 'asNeeded' };
export type TodayDose = DoseSlot & { name: string; record?: DoseRecord; changed: boolean };
export function localDateKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
export function doseKey(slot: DoseSlot): string { return JSON.stringify([slot.medicineId,slot.date,slot.time,slot.dose,...(slot.kind ? [slot.kind] : [])]); }
export function recentDoseRecords(records: DoseRecord[], now = new Date()): DoseRecord[] {
  const cutoff = new Date(now.getFullYear(),now.getMonth(),now.getDate()-29);
  return records.filter(record => record.date >= localDateKey(cutoff));
}
export function todayDoses(medicines: Medicine[], records: DoseRecord[], date: string): TodayDose[] {
  const today = records.filter(record => record.date === date && !record.kind);
  const rows: TodayDose[] = medicines.flatMap(medicine => medicine.regimen?.mode === 'daily' ? medicine.regimen.times.map(time => {
    const slot = {medicineId:medicine.id,date,time,dose:medicine.regimen!.dose};
    return {...slot,name:medicine.name,record:today.find(record => doseKey(record) === doseKey(slot)),changed:false};
  }) : []);
  const keys = new Set(rows.map(doseKey));
  for (const record of today) {
    if (!keys.has(doseKey(record)) && medicines.some(medicine => medicine.id === record.medicineId)) rows.push({...record,name:record.medicineName,record,changed:true});
  }
  return rows.sort((a,b) => a.time.localeCompare(b.time) || a.name.localeCompare(b.name) || a.dose.localeCompare(b.dose));
}
export function changeDoseRecord(medicines: Medicine[], records: DoseRecord[], slot: DoseSlot, status: DoseRecord['status'] | null, now = new Date()): DoseRecord[] {
  if (slot.date !== localDateKey(now)) throw new Error('날짜가 바뀌었어요. 오늘 목록을 확인한 후 다시 기록해 주세요.');
  const medicine = medicines.find(item => item.id === slot.medicineId);
  if (!medicine) throw new Error('복용함에서 제품을 찾지 못했어요.');
  const recent = recentDoseRecords(records,now);
  const without = recent.filter(record => doseKey(record) !== doseKey(slot));
  if (status === null) return without;
  if (slot.kind) throw new Error('필요 시 복용은 별도의 기록 화면에서 남겨 주세요.');
  if (!['taken','skipped'].includes(status)) throw new Error('복용 기록 상태를 확인해 주세요.');
  if (medicine.regimen?.mode !== 'daily' || medicine.regimen.dose !== slot.dose || !medicine.regimen.times.includes(slot.time)) throw new Error('일정이 변경됐어요. 오늘 목록을 다시 확인해 주세요.');
  if (recent.some(record => doseKey(record) === doseKey(slot))) throw new Error('이미 기록한 일정이에요. 기록 취소 후 다시 선택해 주세요.');
  if (without.length >= 400) throw new Error('보관 가능한 복용 기록 400개가 찼어요. 내 정보에서 기록을 삭제한 후 다시 시도해 주세요.');
  return [...without,{...slot,medicineName:medicine.name,status,recordedAt:now.toISOString()}];
}

export type HistoryWindow = { first: string; today: string };
export function recordHistoryWindow(now = new Date()): HistoryWindow {
  return {first:localDateKey(new Date(now.getFullYear(),now.getMonth(),now.getDate()-29,12)),today:localDateKey(now)};
}
function monthStart(month: string): Date {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('달력의 연월을 확인해 주세요.');
  const [year,value] = month.split('-').map(Number);
  return new Date(year,value-1,1,12);
}
export function shiftRecordMonth(month: string, amount: number): string {
  const start = monthStart(month);
  return localDateKey(new Date(start.getFullYear(),start.getMonth()+amount,1,12)).slice(0,7);
}
export function recordCalendarMonth(month: string): (string | null)[] {
  const start = monthStart(month);
  const last = new Date(start.getFullYear(),start.getMonth()+1,0,12).getDate();
  const cells: (string | null)[] = Array.from({length:start.getDay()},() => null);
  for (let day=1;day<=last;day++) cells.push(`${month}-${String(day).padStart(2,'0')}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}
export function selectableRecordDate(date: string, window: HistoryWindow): boolean {
  const parsed = Date.parse(date+'T12:00:00Z');
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0,10) === date && date >= window.first && date <= window.today;
}
export function firstRecordDateInMonth(month: string, window: HistoryWindow): string {
  monthStart(month);
  if (month < window.first.slice(0,7) || month > window.today.slice(0,7)) throw new Error('보관 범위를 벗어난 달이에요.');
  return month === window.today.slice(0,7) ? window.today : month === window.first.slice(0,7) ? window.first : `${month}-01`;
}
export function recordHistorySummary(records: DoseRecord[], window: HistoryWindow) {
  const kept = records.filter(record => selectableRecordDate(record.date,window));
  const byDate = new Map<string,{taken:number;skipped:number}>();
  let taken = 0; let skipped = 0;
  for (const record of kept) {
    const counts = byDate.get(record.date) || {taken:0,skipped:0};
    if (record.status === 'taken') { counts.taken++; taken++; }
    else { counts.skipped++; skipped++; }
    byDate.set(record.date,counts);
  }
  return {taken,skipped,recordedDays:byDate.size,byDate};
}
export function recordsForDate(records: DoseRecord[], date: string, window: HistoryWindow): DoseRecord[] {
  if (!selectableRecordDate(date,window)) return [];
  return records.filter(record => record.date === date).sort((a,b) => a.time.localeCompare(b.time) || a.medicineName.localeCompare(b.medicineName) || a.recordedAt.localeCompare(b.recordedAt));
}

export function asNeededRecordsForDate(records: DoseRecord[], date: string): DoseRecord[] {
  return records.filter(record => record.kind === 'asNeeded' && record.date === date).sort((a,b) => b.time.localeCompare(a.time) || b.recordedAt.localeCompare(a.recordedAt));
}
export function recordAsNeededDose(medicines: Medicine[], records: DoseRecord[], input: DoseSlot, now = new Date()): DoseRecord[] {
  if (input.date !== localDateKey(now)) throw new Error('날짜가 바뀌었어요. 오늘 날짜로 다시 열어 기록해 주세요.');
  const medicine = medicines.find(item => item.id === input.medicineId);
  if (!medicine) throw new Error('복용함에서 제품을 찾지 못했어요.');
  if (medicine.regimen?.mode !== 'asNeeded') throw new Error('필요 시 복용으로 등록된 제품만 이곳에서 기록할 수 있어요. 복용함을 확인해 주세요.');
  if (typeof input.time !== 'string' || !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(input.time)) throw new Error('복용한 시각을 24시간 형식으로 입력해 주세요. 예: 14:30');
  const timeNow = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  if (input.time > timeNow) throw new Error('아직 지나지 않은 시각이에요. 실제로 복용한 시각을 확인해 주세요.');
  if (typeof input.dose !== 'string' || !input.dose.trim() || input.dose.trim().length > 40) throw new Error('실제로 복용한 양을 단위와 함께 1~40자로 입력해 주세요.');
  const recent = recentDoseRecords(records,now);
  if (recent.some(record => record.kind === 'asNeeded' && record.medicineId === input.medicineId && record.date === input.date && record.time === input.time)) throw new Error('이 제품의 같은 시각 기록이 이미 있어요. 수정하려면 기존 기록을 취소한 후 다시 남겨 주세요.');
  if (recent.length >= 400) throw new Error('보관 가능한 복용 기록 400개가 찼어요. 내 정보에서 기록을 삭제한 후 다시 시도해 주세요.');
  return [...recent,{medicineId:medicine.id,medicineName:medicine.name,date:input.date,time:input.time,dose:input.dose.trim(),kind:'asNeeded',status:'taken',recordedAt:now.toISOString()}];
}

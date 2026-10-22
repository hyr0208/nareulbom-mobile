import type { DoseRecord, Medicine } from './medicine-model';
export type DoseSlot = { medicineId: string; date: string; time: string; dose: string };
export type TodayDose = DoseSlot & { name: string; record?: DoseRecord; changed: boolean };
export function localDateKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
export function doseKey(slot: DoseSlot): string { return JSON.stringify([slot.medicineId,slot.date,slot.time,slot.dose]); }
export function recentDoseRecords(records: DoseRecord[], now = new Date()): DoseRecord[] {
  const cutoff = new Date(now.getFullYear(),now.getMonth(),now.getDate()-29);
  return records.filter(record => record.date >= localDateKey(cutoff));
}
export function todayDoses(medicines: Medicine[], records: DoseRecord[], date: string): TodayDose[] {
  const today = records.filter(record => record.date === date);
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
  if (!['taken','skipped'].includes(status)) throw new Error('복용 기록 상태를 확인해 주세요.');
  if (medicine.regimen?.mode !== 'daily' || medicine.regimen.dose !== slot.dose || !medicine.regimen.times.includes(slot.time)) throw new Error('일정이 변경됐어요. 오늘 목록을 다시 확인해 주세요.');
  if (recent.some(record => doseKey(record) === doseKey(slot))) throw new Error('이미 기록한 일정이에요. 기록 취소 후 다시 선택해 주세요.');
  if (without.length >= 400) throw new Error('보관 가능한 복용 기록 400개가 찼어요. 내 정보에서 기록을 삭제한 후 다시 시도해 주세요.');
  return [...without,{...slot,medicineName:medicine.name,status,recordedAt:now.toISOString()}];
}

import type { Medicine } from './medicine-model';
export const reminderPrefix = 'nareulbom-dose-v1-';
export type ReminderTime = { id: string; time: string; hour: number; minute: number };
export type ReminderDriver = { cancel: () => Promise<void>; allowed: () => Promise<boolean>; schedule: (time: ReminderTime) => Promise<void> };
export function reminderPlan(medicines: Medicine[], enabled: boolean): ReminderTime[] {
  if (!enabled) return [];
  const times = [...new Set(medicines.flatMap(item => item.regimen?.mode === 'daily' ? item.regimen.times : []))].sort();
  if (times.length > 60) throw new Error('복용 알림은 서로 다른 시간 60개까지 설정할 수 있어요. 복용함에서 시간을 확인해 주세요.');
  return times.map(time => {
    if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(time)) throw new Error('알림을 설정할 복용 시간을 확인해 주세요.');
    const [hour,minute] = time.split(':').map(Number);
    return {id:reminderPrefix+time.replace(':',''),time,hour,minute};
  });
}
export function reminderPlanKey(medicines: Medicine[], enabled: boolean): string {
  return JSON.stringify([enabled,reminderPlan(medicines,enabled).map(item => item.time)]);
}
// Always remove stale requests first. A failed batch is cleaned up, never silently partially enabled.
export async function syncReminderPlan(driver: ReminderDriver, plan: ReminderTime[]): Promise<number> {
  await driver.cancel();
  if (!plan.length) return 0;
  if (!await driver.allowed()) throw new Error('기기 알림 권한이 꺼져 있어요. 시스템 설정에서 허용한 뒤 알림을 다시 연결해 주세요.');
  try { for (const time of plan) await driver.schedule(time); }
  catch {
    try { await driver.cancel(); }
    catch { throw new Error('일부 알림 정리를 완료하지 못했어요. 알림 끄기 또는 다시 연결을 시도해 주세요.'); }
    throw new Error('알림 예약을 완료하지 못했어요. 다시 연결해 주세요.');
  }
  return plan.length;
}

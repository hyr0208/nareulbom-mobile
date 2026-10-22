import { AppState } from 'react-native';
import { reminderPlan, reminderPlanKey } from './reminder-model';
import { cancelReminders, reminderPermission, remindersAvailable, syncReminders } from '@/services/reminders';
import { changeDoseRecord, recentDoseRecords, type DoseSlot } from './dose-model';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Drug } from '@/services/api';
import { deviceStorageAvailable, deviceVault } from './device-vault';
import { persistedSnapshot, validateHealthRecord, validateManualFields, sameManualProduct, parseRegimen, restoreMedicine, restoreSnapshot, type Medicine, type Regimen, type HealthRecord, type DoseRecord } from './medicine-model';
type State = { medicines: Medicine[]; consentAt: string | null; health: HealthRecord | null; onboardingDone: boolean; doseRecords: DoseRecord[]; recordConsentAt: string | null; remindersEnabled: boolean };
type Session = State & {
  recordDose: (slot: DoseSlot, status: DoseRecord['status'] | null) => Promise<void>; enableRecordStorage: () => Promise<void>; eraseDoseRecords: () => Promise<void>;
  reminderError: string; reminderCount: number; setRemindersEnabled: (enabled: boolean) => Promise<void>; refreshReminders: () => Promise<void>;
  ready: boolean; busy: boolean; storageAvailable: boolean; storageError: string;
  finishOnboarding: (health?: HealthRecord) => Promise<void>; eraseHealth: () => Promise<void>;
  updateManualMedicine: (id: string, fields: import('./medicine-model').ManualFields) => Promise<void>;
  addMedicine: (drug: Drug) => Promise<void>; removeMedicine: (id: string) => Promise<void>;
  setRegimen: (id: string, regimen?: Regimen) => Promise<void>;
  enableStorage: () => Promise<void>; eraseAll: () => Promise<void>; retryLoad: () => Promise<void>;
};
const Context = createContext<Session | null>(null);
const emptyState: State = { medicines: [], consentAt: null, health: null, onboardingDone: false, doseRecords: [], recordConsentAt: null, remindersEnabled: false };
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(emptyState);
  const current = useRef(state); const locked = useRef(false); const mounted = useRef(true);
  const blocked = useRef(false); const readyRef = useRef(false);
  const [ready, setReady] = useState(false); const [busy, setBusy] = useState(false); const [storageError, setStorageError] = useState('');
  const [reminderError,setReminderError] = useState('');
  const [reminderCount,setReminderCount] = useState(0);
  async function reconnect(next: State) {
    try { const count = await syncReminders(reminderPlan(next.medicines,next.remindersEnabled)); if (mounted.current) { setReminderCount(count); setReminderError(''); } }
    catch (e) { if (mounted.current) { setReminderCount(0); setReminderError(e instanceof Error ? e.message : '알림 연결을 확인해 주세요.'); } }
  }
  async function refreshReminders() {
    if (locked.current || !readyRef.current || blocked.current) return;
    locked.current = true; setBusy(true);
    try { await reconnect(current.current); }
    finally { locked.current = false; if (mounted.current) setBusy(false); }
  }
  useEffect(() => {
    const listener = AppState.addEventListener('change',value => { if (value === 'active') void refreshReminders(); });
    return () => listener.remove();
  },[]);
  async function load() {
    if (locked.current) return;
    locked.current = true; setBusy(true); setStorageError('');
    try { await cancelReminders(); } catch { if (mounted.current) setReminderError('기존 알림 정리를 확인하지 못했어요. 알림 다시 연결을 시도해 주세요.'); }
    try {
      const value = deviceStorageAvailable ? await deviceVault.read() : null;
      const snapshot = value === null ? null : restoreSnapshot(value);
      const next = snapshot ? { medicines: snapshot.medicines.map(restoreMedicine), consentAt: snapshot.consentAt, health: snapshot.health || null, onboardingDone: snapshot.onboardingDone || false, doseRecords: recentDoseRecords(snapshot.doseRecords || []), recordConsentAt: snapshot.recordConsentAt || null, remindersEnabled: snapshot.remindersEnabled || false } : emptyState;
      if (mounted.current) { current.current = next; setState(next); blocked.current = false; }
      await reconnect(next);
    } catch { if (mounted.current) { blocked.current = true; setStorageError('저장된 정보를 읽지 못했어요. 기기 잠금을 해제하고 다시 불러오거나, 내 정보에서 전체 삭제를 시도해 주세요.'); } }
    finally { locked.current = false; readyRef.current = true; if (mounted.current) { setReady(true); setBusy(false); } }
  }
  useEffect(() => { mounted.current = true; void load(); return () => { mounted.current = false; }; }, []);
  async function mutate(change: (old: State) => State, erase = false, requestPermission = false) {
    if (locked.current || !readyRef.current) throw new Error('저장 작업 중이에요. 잠시 후 다시 시도해 주세요.');
    if (blocked.current && !erase) throw new Error('저장된 정보를 먼저 다시 불러오거나 전체 삭제해 주세요.');
    const changed = change(current.current);
    const next = {...changed,doseRecords:recentDoseRecords(changed.doseRecords)};
    const changedPlan = erase || reminderPlanKey(current.current.medicines,current.current.remindersEnabled) !== reminderPlanKey(next.medicines,next.remindersEnabled);
    locked.current = true; setBusy(true); setStorageError('');
    let phase: 'alarm' | 'storage' = 'alarm';
    try {
      if (requestPermission && !await reminderPermission(true)) throw new Error('알림 권한이 허용되지 않았어요. 시스템 설정에서 허용한 뒤 다시 켜 주세요.');
      if (changedPlan) { await cancelReminders(); if (mounted.current) setReminderCount(0); }
      phase = 'storage';
      let cleanupPending = false;
      if (erase) { if (deviceStorageAvailable) await deviceVault.clear(); blocked.current = false; }
      else if ((next.consentAt || next.health?.remember || next.onboardingDone) && deviceStorageAvailable) {
        const snapshot = persistedSnapshot(next)!;
        cleanupPending = (await deviceVault.write(snapshot)).cleanupPending;
      }
      if (!erase && deviceStorageAvailable && !next.consentAt && !next.health?.remember && !next.onboardingDone && (current.current.consentAt || current.current.health?.remember)) await deviceVault.clear();
      current.current = next;
      if (mounted.current) { setState(next); if (cleanupPending) setStorageError('변경은 저장했지만 이전 임시 저장본 정리가 완료되지 않았어요. 내 정보에서 전체 삭제로 정리할 수 있어요.'); }
      if (changedPlan) await reconnect(next);
    } catch (error) {
      const message = error instanceof Error ? error.message : '저장하지 못했어요.';
      if (mounted.current) { if (phase === 'storage') { setStorageError('기기 저장·삭제를 완료하지 못했어요. 기존 표시 내용을 유지합니다. 다시 시도해 주세요.'); if (changedPlan) setReminderError('알림은 중지됐어요. 저장정보를 다시 확인한 뒤 알림을 다시 연결해 주세요.'); } else setReminderError(message); }
      throw new Error(message);
    } finally { locked.current = false; if (mounted.current) setBusy(false); }
  }
  return <Context.Provider value={{ ...state, ready, busy, storageError, storageAvailable: deviceStorageAvailable,
    retryLoad: load,
    reminderError, reminderCount, refreshReminders,
    setRemindersEnabled: enabled => mutate(old => {
      if (enabled && (!remindersAvailable || !old.consentAt)) throw new Error('모바일 앱에서 복용함 기기 보관에 동의한 뒤 알림을 켤 수 있어요.');
      if (enabled && !reminderPlan(old.medicines,true).length) throw new Error('복용함에서 매일 복용할 시간을 먼저 입력해 주세요.');
      return {...old,remindersEnabled:enabled};
    },false,enabled),
    recordDose: (slot,status) => mutate(old => ({...old,doseRecords:changeDoseRecord(old.medicines,old.doseRecords,slot,status)})),
    enableRecordStorage: () => deviceStorageAvailable ? mutate(old => {
      if (!old.consentAt) throw new Error('복용함 기기 보관에 먼저 동의해 주세요.');
      return {...old,recordConsentAt:old.recordConsentAt || new Date().toISOString(),doseRecords:recentDoseRecords(old.doseRecords)};
    }) : Promise.reject(new Error('기록 보관은 모바일 앱에서 이용할 수 있어요.')),
    eraseDoseRecords: () => mutate(old => ({...old,doseRecords:[],recordConsentAt:null})),
    enableStorage: () => deviceStorageAvailable ? mutate(old => ({ ...old, consentAt: old.consentAt || new Date().toISOString() })) : Promise.reject(new Error('기기 보관은 모바일 앱에서 이용할 수 있어요.')),
    eraseAll: () => mutate(() => ({...emptyState,onboardingDone:true}), true),
    finishOnboarding: health => mutate(old => {
      const checked = health ? validateHealthRecord(health) : null;
      if (checked?.remember && !deviceStorageAvailable) throw new Error('웹에서는 건강정보를 보관할 수 없어요.');
      if (checked && checked.profile.medicationStatus === 'none' && old.medicines.length) throw new Error('등록한 제품이 있어요. 복용 여부를 다시 확인해 주세요.');
      return {...old, health:checked, onboardingDone:true};
    }),
    eraseHealth: () => mutate(old => ({...old,health:null})),
    updateManualMedicine: (id, fields) => mutate(old => {
      const product=old.medicines.find(item=>item.id===id);
      if(!product||product.source!=='manual')throw new Error('직접 등록한 제품만 수정할 수 있어요.');
      const next={...product,...validateManualFields(fields)};
      if(old.medicines.some(item=>item.id!==id&&sameManualProduct(item,next)))throw new Error('동일한 직접 등록 제품이 이미 있어요.');
      return {...old,medicines:old.medicines.map(item=>item.id===id?next:item)};
    }),
    addMedicine: drug => mutate(old => {
      if (old.medicines.some(item => item.id === drug.id)) return old;
      if(drug.source==='manual'){ validateManualFields(drug);if(old.medicines.some(item=>sameManualProduct(item,drug)))throw new Error('동일한 직접 등록 제품이 이미 있어요.'); }
      if (old.medicines.length >= 100) throw new Error('복용함에는 최대 100개 제품을 등록할 수 있어요.');
      return { ...old, medicines: [...old.medicines, { ...drug, detailsLoaded: true }] };
    }),
    removeMedicine: id => mutate(old => ({ ...old, medicines: old.medicines.filter(item => item.id !== id), doseRecords: old.doseRecords.filter(record => record.medicineId !== id) })),
    setRegimen: (id, regimen) => mutate(old => {
      if (!old.medicines.some(item => item.id === id)) throw new Error('복용함에서 제품을 찾지 못했어요.');
      const checked = regimen ? parseRegimen(regimen.dose, regimen.mode, regimen.times.join(',')) : undefined;
      return { ...old, medicines: old.medicines.map(item => item.id === id ? { ...item, regimen: checked } : item) };
    }),
  }}>{children}</Context.Provider>;
}
export function useSession() {
  const session = useContext(Context);
  if (!session) throw new Error('SessionProvider is required');
  return session;
}

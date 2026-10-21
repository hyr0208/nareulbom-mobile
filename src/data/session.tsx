import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Drug } from '@/services/api';
import { deviceStorageAvailable, deviceVault } from './device-vault';
import { persistedSnapshot, validateHealthRecord, validateManualFields, sameManualProduct, parseRegimen, restoreMedicine, restoreSnapshot, type Medicine, type Regimen, type HealthRecord } from './medicine-model';
type State = { medicines: Medicine[]; consentAt: string | null; health: HealthRecord | null; onboardingDone: boolean };
type Session = State & {
  ready: boolean; busy: boolean; storageAvailable: boolean; storageError: string;
  finishOnboarding: (health?: HealthRecord) => Promise<void>; eraseHealth: () => Promise<void>;
  updateManualMedicine: (id: string, fields: import('./medicine-model').ManualFields) => Promise<void>;
  addMedicine: (drug: Drug) => Promise<void>; removeMedicine: (id: string) => Promise<void>;
  setRegimen: (id: string, regimen?: Regimen) => Promise<void>;
  enableStorage: () => Promise<void>; eraseAll: () => Promise<void>; retryLoad: () => Promise<void>;
};
const Context = createContext<Session | null>(null);
const emptyState: State = { medicines: [], consentAt: null, health: null, onboardingDone: false };
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(emptyState);
  const current = useRef(state); const locked = useRef(false); const mounted = useRef(true);
  const blocked = useRef(false); const readyRef = useRef(false);
  const [ready, setReady] = useState(false); const [busy, setBusy] = useState(false); const [storageError, setStorageError] = useState('');
  async function load() {
    if (locked.current) return;
    locked.current = true; setBusy(true); setStorageError('');
    try {
      const value = deviceStorageAvailable ? await deviceVault.read() : null;
      const snapshot = value === null ? null : restoreSnapshot(value);
      const next = snapshot ? { medicines: snapshot.medicines.map(restoreMedicine), consentAt: snapshot.consentAt, health: snapshot.health || null, onboardingDone: snapshot.onboardingDone || false } : emptyState;
      if (mounted.current) { current.current = next; setState(next); blocked.current = false; }
    } catch { if (mounted.current) { blocked.current = true; setStorageError('저장된 정보를 읽지 못했어요. 기기 잠금을 해제하고 다시 불러오거나, 내 정보에서 전체 삭제를 시도해 주세요.'); } }
    finally { locked.current = false; readyRef.current = true; if (mounted.current) { setReady(true); setBusy(false); } }
  }
  useEffect(() => { mounted.current = true; void load(); return () => { mounted.current = false; }; }, []);
  async function mutate(change: (old: State) => State, erase = false) {
    if (locked.current || !readyRef.current) throw new Error('저장 작업 중이에요. 잠시 후 다시 시도해 주세요.');
    if (blocked.current && !erase) throw new Error('저장된 정보를 먼저 다시 불러오거나 전체 삭제해 주세요.');
    const next = change(current.current);
    locked.current = true; setBusy(true); setStorageError('');
    try {
      let cleanupPending = false;
      if (erase) { if (deviceStorageAvailable) await deviceVault.clear(); blocked.current = false; }
      else if ((next.consentAt || next.health?.remember || next.onboardingDone) && deviceStorageAvailable) {
        const snapshot = persistedSnapshot(next)!;
        cleanupPending = (await deviceVault.write(snapshot)).cleanupPending;
      }
      if (!erase && deviceStorageAvailable && !next.consentAt && !next.health?.remember && !next.onboardingDone && (current.current.consentAt || current.current.health?.remember)) await deviceVault.clear();
      current.current = next;
      if (mounted.current) { setState(next); if (cleanupPending) setStorageError('변경은 저장했지만 이전 임시 저장본 정리가 완료되지 않았어요. 내 정보에서 전체 삭제로 정리할 수 있어요.'); }
    } catch (error) {
      const message = error instanceof Error ? error.message : '저장하지 못했어요.';
      if (mounted.current) setStorageError('기기 저장·삭제를 완료하지 못했어요. 기존 표시 내용을 유지합니다. 다시 시도해 주세요.');
      throw new Error(message);
    } finally { locked.current = false; if (mounted.current) setBusy(false); }
  }
  return <Context.Provider value={{ ...state, ready, busy, storageError, storageAvailable: deviceStorageAvailable,
    retryLoad: load,
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
    removeMedicine: id => mutate(old => ({ ...old, medicines: old.medicines.filter(item => item.id !== id) })),
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

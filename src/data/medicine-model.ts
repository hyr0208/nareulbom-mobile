import type { Drug } from '@/services/api';
export type Regimen = { dose: string; mode: 'daily' | 'asNeeded'; times: string[] };
export type Medicine = Drug & { detailsLoaded?: boolean; regimen?: Regimen };
export type SavedMedicine = Pick<Drug, 'id' | 'name' | 'manufacturer' | 'sourceUrl' | 'updatedAt' | 'source' | 'strength' | 'category' | 'classification' | 'ingredients' | 'permitStatus'> & { regimen?: Regimen };
export type Snapshot = { version: 1 | 2; consentVersion: 1; consentAt: string | null; medicines: SavedMedicine[]; health?: HealthRecord; onboardingDone?: boolean };
export function parseRegimen(dose: string, mode: Regimen['mode'], input: string): Regimen {
  const cleanedDose = dose.trim();
  if (!cleanedDose || cleanedDose.length > 40) throw new Error('1회 복용량을 1~40자로 입력해 주세요.');
  if (mode !== 'daily' && mode !== 'asNeeded') throw new Error('복용 방식을 선택해 주세요.');
  const times = mode === 'asNeeded' ? [] : input.split(',').map(value => value.trim());
  if (mode === 'daily' && (!times.length || times.length > 8 || times.some(value => !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value)))) throw new Error('시간은 24시간 형식으로 입력해 주세요. 예: 08:00, 20:00 (최대 8개)');
  if (new Set(times).size !== times.length) throw new Error('같은 시간이 중복되어 있어요.');
  return { dose: cleanedDose, mode, times: times.sort() };
}
export function savedMedicine(item: Medicine): SavedMedicine {
  return { source: item.source || 'easy', strength: item.strength, category: item.category, classification: item.classification, ingredients: item.ingredients, permitStatus: item.permitStatus, id: item.id, name: item.name, manufacturer: item.manufacturer, sourceUrl: item.sourceUrl, updatedAt: item.updatedAt, ...(item.regimen ? { regimen: item.regimen } : {}) };
}
export function restoreSnapshot(value: unknown): Snapshot {
  const snapshot = value as Snapshot;
  if (!snapshot || ![1, 2].includes(snapshot.version) || snapshot.consentVersion !== 1 || (snapshot.consentAt === null ? snapshot.version !== 2 : typeof snapshot.consentAt !== 'string' || !Number.isFinite(Date.parse(snapshot.consentAt))) || !Array.isArray(snapshot.medicines) || snapshot.medicines.length > 100) throw new Error('저장된 복용 정보 형식을 확인하지 못했어요.');
  if (snapshot.health) { validateHealthRecord(snapshot.health); if (snapshot.version !== 2 || !snapshot.health.remember) throw new Error('건강정보 보관 동의를 확인하지 못했어요.'); }
  if (snapshot.consentAt === null && (snapshot.medicines.length || (!snapshot.health && snapshot.onboardingDone !== true))) throw new Error('보관 동의를 확인하지 못했어요.');
  if (snapshot.onboardingDone !== undefined && typeof snapshot.onboardingDone !== 'boolean') throw new Error('시작 정보를 확인하지 못했어요.');
  const ids = new Set<string>();
  for (const item of snapshot.medicines) {
    if (!item || typeof item.id !== 'string' || (item.source === 'manual' ? !/^manual-[a-z0-9]+-[a-z0-9]{8}$/.test(item.id) : !/^[0-9]{9}$/.test(item.id)) || ids.has(item.id) || typeof item.name !== 'string' || !item.name.trim() || typeof item.manufacturer !== 'string' || typeof item.updatedAt !== 'string' || typeof item.sourceUrl !== 'string' || (item.source === 'manual' ? item.sourceUrl !== '' : !item.sourceUrl.startsWith('https://nedrug.mfds.go.kr/'))) throw new Error('저장된 제품 정보를 확인하지 못했어요.');
    if (item.source !== undefined && !['easy','permit','manual'].includes(item.source)) throw new Error('저장된 정보 출처를 확인하지 못했어요.');
    if (item.source === 'manual') validateManualFields(item);
    ids.add(item.id);
    if (item.regimen) {
      if (!Array.isArray(item.regimen.times) || item.regimen.times.some(time => typeof time !== 'string')) throw new Error('저장된 복용 시간을 확인하지 못했어요.');
      parseRegimen(item.regimen.dose, item.regimen.mode, item.regimen.times.join(','));
      if (item.regimen.mode === 'asNeeded' && item.regimen.times.length) throw new Error('저장된 복용 방식을 확인하지 못했어요.');
    }
  }
  return snapshot;
}
export function restoreMedicine(item: SavedMedicine): Medicine {
  return { effect: '', usage: '', warning: '', precaution: '', interaction: '', sideEffect: '', storage: '', ...item, detailsLoaded: item.source === 'manual' };
}

export type ManualFields = { name: string; strength: string; manufacturer: string; category: 'medicine' | 'supplement' };
export function validateManualFields(input: {name: unknown; strength?: unknown; manufacturer: unknown; category?: unknown}): ManualFields {
  if(typeof input.name!=='string'||!input.name.trim()||input.name.trim().length>100)throw new Error('제품명을 1~100자로 입력해 주세요.');
  if(typeof input.manufacturer!=='string'||input.manufacturer.trim().length>100)throw new Error('제조사는 100자 이내로 입력해 주세요.');
  if(input.strength!==undefined&&(typeof input.strength!=='string'||input.strength.trim().length>60))throw new Error('함량은 60자 이내로 입력해 주세요.');
  if(!['medicine','supplement'].includes(String(input.category)))throw new Error('제품 종류를 선택해 주세요.');
  return {name:input.name.trim(),strength:String(input.strength||'').trim(),manufacturer:input.manufacturer.trim(),category:input.category as ManualFields['category']};
}
export function createManualMedicine(fields: ManualFields): Medicine {
  const input=validateManualFields(fields);
  const id=`manual-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10).padEnd(8,'0')}`;
  return {...input,id,source:'manual',sourceUrl:'',updatedAt:'',effect:'',usage:'',warning:'',precaution:'',interaction:'',sideEffect:'',storage:'',detailsLoaded:true};
}
export function sameManualProduct(a: Medicine, b: Medicine) {
  return a.source==='manual'&&b.source==='manual'&&a.name.toLocaleLowerCase()===b.name.toLocaleLowerCase()&&(a.strength||'').toLocaleLowerCase()===(b.strength||'').toLocaleLowerCase()&&a.manufacturer.toLocaleLowerCase()===b.manufacturer.toLocaleLowerCase()&&a.category===b.category;
}


export const healthOptions = {
  goals: [['routine', '꾸준한 건강관리'], ['nutrition', '영양제 알아보기'], ['medicine', '복용 약 관리'], ['sleep', '수면·휴식'], ['energy', '활력 관리'], ['condition', '질환 관련 정보']],
  ageBand: [['under19', '19세 미만'], ['19-29', '19–29세'], ['30-39', '30–39세'], ['40-49', '40–49세'], ['50-64', '50–64세'], ['65plus', '65세 이상']],
  sex: [['female', '여성'], ['male', '남성'], ['other', '그 외']],
  pregnancy: [['none', '해당 없음'], ['planning', '임신 준비 중'], ['pregnant', '임신 중'], ['breastfeeding', '수유 중']],
  medicationStatus: [['taking', '복용 중이에요'], ['none', '복용하지 않아요']],
  sleep: [['under6', '6시간 미만'], ['6-8', '6–8시간'], ['over8', '8시간 초과']],
  exercise: [['rare', '거의 안 해요'], ['1-2', '주 1–2회'], ['3plus', '주 3회 이상']],
  smoking: [['never', '피우지 않아요'], ['past', '과거에 피웠어요'], ['current', '피우고 있어요']],
  alcohol: [['none', '마시지 않아요'], ['sometimes', '가끔 마셔요'], ['often', '자주 마셔요']],
} as const;
export type HealthProfile = {
  goals: string[]; ageBand: string; sex: string; height: string; weight: string;
  conditions: { status: 'unknown' | 'none' | 'yes'; items: string[] };
  allergies: { status: 'unknown' | 'none' | 'yes'; items: string[] };
  pregnancy: string; medicationStatus: string;
  sleep: string; exercise: string; smoking: string; alcohol: string;
};
export type HealthRecord = { version: 1; consentAt: string; remember: boolean; profile: HealthProfile };
export function emptyHealthProfile(): HealthProfile {
  return { goals: [], ageBand: '', sex: '', height: '', weight: '', conditions: {status:'unknown',items:[]}, allergies:{status:'unknown',items:[]}, pregnancy:'', medicationStatus:'', sleep:'', exercise:'', smoking:'', alcohol:'' };
}
export function healthLabel(key: keyof typeof healthOptions, value: string) {
  return healthOptions[key].find(option => option[0] === value)?.[1] || '미입력';
}
export function validateHealthProfile(value: HealthProfile): HealthProfile {
  if (!value || typeof value !== 'object') throw new Error('건강정보를 확인하지 못했어요.');
  const result = emptyHealthProfile();
  if (!Array.isArray(value.goals) || value.goals.length > 6 || new Set(value.goals).size !== value.goals.length || value.goals.some(goal => !healthOptions.goals.some(option => option[0] === goal))) throw new Error('관리 목표를 다시 선택해 주세요.');
  result.goals = [...value.goals];
  for (const key of ['ageBand','sex','pregnancy','medicationStatus','sleep','exercise','smoking','alcohol'] as const) {
    if (typeof value[key] !== 'string' || (value[key] !== '' && !healthOptions[key].some(option => option[0] === value[key]))) throw new Error('선택한 건강정보 항목을 확인해 주세요.');
    result[key] = value[key];
  }
  for (const key of ['height','weight'] as const) {
    const input = value[key];
    if (typeof input !== 'string' || (input !== '' && (!/^\d{1,3}(\.\d{1,2})?$/.test(input.trim()) || Number(input) <= 0 || Number(input) > (key === 'height' ? 300 : 700)))) throw new Error(`${key === 'height' ? '키(cm)' : '몸무게(kg)'}를 올바른 숫자로 입력해 주세요.`);
    result[key] = input.trim();
  }
  for (const key of ['conditions','allergies'] as const) {
    const item = value[key];
    if (!item || !['unknown','none','yes'].includes(item.status) || !Array.isArray(item.items) || item.items.length > 12 || item.items.some(text => typeof text !== 'string' || text.trim().length > 60) || (item.status !== 'yes' && item.items.length)) throw new Error('질환·알레르기 입력을 확인해 주세요. 항목마다 60자, 최대 12개까지 입력할 수 있어요.');
    result[key] = {status:item.status,items:[...new Set(item.items.map(text => text.trim()).filter(Boolean))]};
  }
  return result;
}
export function validateHealthRecord(value: HealthRecord): HealthRecord {
  if (!value || value.version !== 1 || typeof value.consentAt !== 'string' || !Number.isFinite(Date.parse(value.consentAt)) || typeof value.remember !== 'boolean') throw new Error('건강정보 동의를 확인하지 못했어요.');
  return {version:1,consentAt:value.consentAt,remember:value.remember,profile:validateHealthProfile(value.profile)};
}


export function persistedSnapshot(state: {medicines:Medicine[];consentAt:string|null;health:HealthRecord|null;onboardingDone:boolean}): Snapshot | null {
  const health = state.health?.remember ? validateHealthRecord(state.health) : undefined;
  if (!state.consentAt && !health && !state.onboardingDone) return null;
  return {version:2,consentVersion:1,consentAt:state.consentAt,medicines:state.consentAt?state.medicines.map(savedMedicine):[],...(health?{health}:{}),onboardingDone:state.onboardingDone};
}

import type { HealthRecord,Medicine,NutrientId } from './medicine-model';
export const nutrientInfo={
  b12:{name:'비타민 B12',role:'혈액·신경세포의 기능과 DNA 생성에 관여해요.',food:'동물성 식품을 제한한다면 B12 강화식품이나 보충제를 통한 섭취를 검토할 수 있어요.',url:'https://ods.od.nih.gov/factsheets/VitaminB12-Consumer/',updatedAt:'2023-12-15'},
  calcium:{name:'칼슘',role:'뼈·치아를 유지하고 근육·신경 기능에 관여해요.',food:'유제품, 칼슘 강화식품, 뼈째 먹는 생선 등 식품으로 섭취할 수 있는 양부터 살펴봐요.',url:'https://ods.od.nih.gov/factsheets/Calcium-Consumer/',updatedAt:'2023-09-14'},
  vitaminD:{name:'비타민 D',role:'칼슘 흡수와 뼈 건강에 관여해요.',food:'의료진에게 안내받은 검사 결과와 기존 섭취량을 함께 확인해요.',url:'https://ods.od.nih.gov/factsheets/VitaminD-Consumer/',updatedAt:'2022-11-08'},
} as const;
export type NutrientCandidate={id:NutrientId;reasons:string[];status:'consider'|'review'|'existing'|'hold';checks:string[]};
export type NutritionQuestion={label:string;step:2|3|4|6};
export function nutritionCandidates(health:HealthRecord|null,medicines:Medicine[]) {
  const candidates:NutrientCandidate[]=[];const questions:NutritionQuestion[]=[];const context:string[]=[];
  const p=health?.profile;const n=p?.nutrition;
  if(!p||!n)return {candidates,questions:[{label:'식습관과 영양제·검사 정보를 알려주세요.',step:6 as const}],context};
  const ask=(label:string,step:NutritionQuestion['step'])=>{if(!questions.some(item=>item.label===label))questions.push({label,step});};
  if(!p.ageBand){ask('연령대를 확인해 주세요.',2);context.push('연령대가 미입력되어 개인별 복용 적합성을 확인하지 못했어요.');}
  else if(p.ageBand==='under19')context.push('19세 미만은 성장 단계에 따른 별도 확인이 필요해요.');
  if(p.conditions.status==='unknown'){ask('진단받은 질환이 있는지 알려주세요.',3);context.push('질환 정보가 미입력·모름 상태예요.');}
  else if(p.conditions.status==='yes')context.push('진단받은 질환이 있어 의료진과 보충 필요 여부를 확인해 주세요.');
  if(p.allergies.status==='unknown'){ask('알레르기 여부를 확인해 주세요.',3);context.push('알레르기 정보가 미입력·모름 상태예요.');}
  else if(p.allergies.status==='yes')context.push('알레르기가 있어 실제 제품의 원료·첨가물을 확인해야 해요.');
  if(!p.pregnancy){ask('임신·수유 여부를 확인해 주세요.',3);context.push('임신·수유 여부를 확인하지 못했어요.');}
  else if(p.pregnancy!=='none')context.push('임신 준비·임신·수유 중에는 의료진과 영양 계획을 먼저 확인해 주세요.');
  if(!p.medicationStatus&&!medicines.length){ask('복용 약 여부를 확인해 주세요.',4);context.push('복용 약 여부를 확인하지 못했어요.');}
  if(p.medicationStatus==='taking'||medicines.length)context.push('복용 제품이 있어 약사·의료진의 성분·상호작용 확인이 필요해요. 현재 앱은 전체 상호작용을 분석하지 않아요.');
  if(!n.diet)ask('평소 식사 유형을 알려주세요.',6);
  if(['vegan','vegetarian'].includes(n.diet)&&!n.fortifiedB12)ask('B12 강화식품을 먹는지 알려주세요.',6);
  if(!n.calciumFoods)ask('칼슘 식품을 얼마나 자주 먹는지 알려주세요.',6);
  if(!n.supplements){ask('현재 영양제를 먹는지 알려주세요.',6);context.push('현재 섭취 중인 영양제를 확인하지 못했어요.');}
  else if(n.supplements==='taking')context.push('현재 영양제를 섭취 중이므로 기존 제품의 함량과 중복 성분을 먼저 확인해요.');
  const rationale:Record<NutrientId,string[]>={b12:[],calcium:[],vitaminD:[]};
  if(['vegan','vegetarian'].includes(n.diet)&&n.fortifiedB12==='no')rationale.b12.push('동물성 식품을 제한하고 B12 강화식품도 먹지 않는다고 답했어요.');
  if(n.calciumFoods==='rare')rationale.calcium.push('유제품·칼슘 강화식품·뼈째 먹는 생선 등 칼슘 식품을 거의 먹지 않는다고 답했어요.');
  for(const id of ['b12','calcium','vitaminD'] as const){
    const lab=n.labs[id];const existing=n.nutrients.includes(id);
    if(lab==='low')rationale[id].push('최근 검사에서 낮다는 안내를 의료진에게 받았다고 답했어요.');
    if(lab==='high')rationale[id].push('최근 검사에서 높다는 안내를 의료진에게 받았다고 답했어요.');
    if(existing&&!rationale[id].length)rationale[id].push('현재 섭취 중인 영양소로 입력했어요.');
    if(!rationale[id].length)continue;
    const checks=[...context];
    if(lab==='low'||lab==='high')checks.unshift('입력한 검사 안내는 진단을 대신하지 않아요. 검사 시점·원인·치료 계획을 의료진과 먼저 확인해 주세요.');
    if(existing)checks.unshift('새로 추가하기 전에 현재 제품의 성분과 하루 총섭취량을 확인해요.');
    if(id==='calcium')checks.push('식품 섭취 빈도만으로 칼슘 결핍이나 보충제 필요량을 알 수는 없어요.');
    const status=lab==='high'?'hold':existing?'existing':lab==='low'||context.length?'review':'consider';
    candidates.push({id,reasons:rationale[id],status,checks});
  }
  return {candidates,questions,context};
}

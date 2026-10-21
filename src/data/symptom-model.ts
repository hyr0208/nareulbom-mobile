import type {HealthRecord,Medicine} from './medicine-model';
export type Answer=''|'yes'|'no'|'unknown';
export const riskQuestions=[
  {id:'sudden',label:'갑자기 시작한 극심한 두통인가요?'},
  {id:'neurological',label:'시력 상실·마비·말하거나 걷기 어려움·경련·의식 변화가 있나요?'},
  {id:'injury',label:'최근 3개월 안에 머리를 다친 뒤 두통이 있나요?'},
  {id:'infection',label:'매우 높은 열·목 경직·빛에 심한 불편감 또는 눌러도 사라지지 않는 발진이 있나요?'},
  {id:'urgent',label:'눈·시야 문제, 구토, 기침·운동·몸을 숙일 때 심해지는 두통, 씹을 때 턱 통증이나 두피 압통이 있나요?'},
  {id:'overdose',label:'아세트아미노펜을 표시된 양보다 많이 먹었거나 과량 복용했을 가능성이 있나요?'},
] as const;
export type RiskId=typeof riskQuestions[number]['id'];
export type SymptomAnswers={consent:boolean;risks:Record<RiskId,Answer>;severity:''|'mild'|'moderate'|'severe';duration:''|'today'|'few-days'|'longer';repeated:Answer;todayProducts:Answer;heavyDrinking:Answer;longPainkillerUse:Answer;profileCurrent:Answer};
export function emptySymptomAnswers():SymptomAnswers{return {consent:false,risks:{sudden:'',neurological:'',injury:'',infection:'',urgent:'',overdose:''},severity:'',duration:'',repeated:'',todayProducts:'',heavyDrinking:'',longPainkillerUse:'',profileCurrent:''};}
export type HeadacheResult={kind:'consent'|'emergency'|'urgent'|'appointment'|'questions'|'ingredient';title:string;reasons:string[];ingredient?:'acetaminophen';profileSteps:number[]};
export const symptomSources=[
  {title:'NHS · Headaches',url:'https://www.nhs.uk/symptoms/headaches/',updatedAt:'2024-04-17'},
  {title:'NHS · Paracetamol for adults',url:'https://www.nhs.uk/medicines/paracetamol-for-adults/',updatedAt:'2026-03-24'},
  {title:'MedlinePlus · Acetaminophen',url:'https://medlineplus.gov/druginfo/meds/a681004.html',updatedAt:'2025-10-15'},
] as const;
export function assessHeadache(a:SymptomAnswers,health:HealthRecord|null,medicines:Medicine[]):HeadacheResult{
  const result=(kind:HeadacheResult['kind'],title:string,reasons:string[],profileSteps:number[]=[]):HeadacheResult=>({kind,title,reasons,profileSteps});
  if(!a.consent)return result('consent','증상 안내 이용 여부를 선택해 주세요',[]);
  const critical=riskQuestions.filter(question=>['sudden','neurological','injury','infection'].includes(question.id)&&a.risks[question.id]==='yes');
  // Positive danger signs always override unfinished questions and missing profile data.
  if(critical.length)return result('emergency','지금 응급 진료가 필요해요',critical.map(item=>`선택한 신호: ${item.label}`));
  if(a.risks.overdose==='yes'||a.risks.overdose==='unknown')return result('urgent','지금 의료기관에 문의해 주세요',['과량 복용 가능성은 증상이 없어도 즉시 의료진의 확인이 필요해요.']);
  if(a.risks.urgent==='yes'||a.severity==='severe')return result('urgent','빠른 진료를 받아 주세요',['동반 증상이나 심한 통증을 의료진에게 먼저 알려주세요.']);
  if(riskQuestions.some(item=>!['yes','no'].includes(a.risks[item.id])))return result('questions','위험 신호 확인이 필요해요',['위험 신호와 과량 복용 여부를 모두 확인해 주세요. 판단하기 어려운 증상은 의료진에게 바로 문의해 주세요.']);
  if(a.repeated==='yes'||a.longPainkillerUse==='yes'||a.duration==='longer')return result('appointment','약을 더 고르기 전에 진료로 확인해요',['호전되지 않거나 반복되는 두통, 오래 지속된 증상·진통제 사용은 진료로 확인해 주세요.']);
  const missing:string[]=[];
  if(!['mild','moderate','severe'].includes(a.severity)||!['today','few-days','longer'].includes(a.duration))missing.push('통증 정도와 시작 시점을 알려주세요.');
  for(const [value,label] of [[a.repeated,'반복·악화 여부'],[a.todayProducts,'오늘 복용한 약·영양제'],[a.heavyDrinking,'과음·알코올 의존 여부'],[a.longPainkillerUse,'진통제 장기 사용 여부'],[a.profileCurrent,'현재 프로필과 건강 상태의 일치 여부']] as const)if(!['yes','no'].includes(value))missing.push(`${label}를 확인해 주세요.`);
  if(missing.length)return result('questions','성분 안내 전 확인이 필요해요',missing);
  const p=health?.profile;const reasons:string[]=[];const steps=new Set<number>();
  const hold=(text:string,step:number)=>{reasons.push(text);steps.add(step);};
  if(!p||!['19-29','30-39','40-49','50-64','65plus'].includes(p.ageBand))hold('성인 연령대 확인이 필요해요. 현재 성분 안내는 19세 이상만 다뤄요.',2);
  if(!p||!p.weight||!Number.isFinite(Number(p.weight))||Number(p.weight)<50)hold('체중이 미입력이거나 50kg 미만이면 개인별 용량 확인을 위해 약사·의료진에게 먼저 문의해 주세요.',2);
  if(!p||p.conditions.status!=='none')hold('질환이 있거나 미입력되어 있어요. 특히 간·신장 질환 등은 약사·의료진이 확인해야 해요.',3);
  if(!p||p.allergies.status!=='none')hold('알레르기가 있거나 미입력되어 있어 제품 성분 확인이 필요해요.',3);
  if(!p||p.pregnancy!=='none')hold('임신 준비·임신·수유 여부에 맞는 상담을 먼저 받아 주세요. 해당 없음도 직접 확인해 주세요.',3);
  if(!p||p.medicationStatus!=='none'||medicines.length||p.nutrition?.supplements==='taking')hold('기존 복용 제품·성분 또는 미입력 복용정보를 약사와 확인해 주세요. 앱은 전체 상호작용을 분석하지 않아요.',4);
  if(a.profileCurrent!=='yes')hold('건강 프로필을 현재 상태로 수정하고 증상 답변에서 다시 확인해 주세요.',3);
  if(a.todayProducts==='yes')reasons.push('오늘 먹은 약·영양제의 성분과 중복 여부를 먼저 확인해야 해요.');
  if(a.heavyDrinking==='yes'||p?.alcohol==='often')reasons.push('과음·알코올 관련 위험을 약사·의료진에게 먼저 알려주세요.');
  if(reasons.length)return result('questions','개인별 확인을 먼저 해 주세요',reasons,[...steps]);
  return {...result('ingredient','약사와 상의할 성분',['답변한 두통에 대해 일반 자료에서 다루는 진통 성분이에요. 개인별 복용 안전성이나 진단이 확정된 것은 아니에요.']),ingredient:'acetaminophen'};
}

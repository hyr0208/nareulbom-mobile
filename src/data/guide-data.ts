import type { HealthRecord } from './medicine-model';
export type Guide = {
  id:string; title:string; description:string; source:string; sourceTitle:string; url:string;
  language:'한국어'|'영어'; sourceUpdatedAt:string|null; checkedAt:string;
  kind:'summary'|'original'; points:readonly string[];
};
const checkedAt='2026-10-21';
const kdca='https://health.kdca.go.kr/healthinfo/biz/health/gnrlzHealthInfo/gnrlzHealthInfo/gnrlzHealthInfoView.do';
export const guides:readonly Guide[]=[
  {id:'sleep',title:'수면 습관, 작은 것부터 살펴봐요',description:'수면 일정과 잠자리 환경에 관한 기초 정보예요.',source:'미국 NIH · NHLBI',sourceTitle:'Healthy Sleep Habits',url:'https://www.nhlbi.nih.gov/health/sleep-deprivation/healthy-sleep-habits',language:'영어',sourceUpdatedAt:'2022-03-24',checkedAt,kind:'summary',points:['잠드는 시간과 일어나는 시간을 일정하게 유지하는 습관이 도움이 될 수 있어요.','잠자리는 조용하고 서늘하고 어둡게 유지하고, 잠들기 전 밝은 화면을 줄여보세요.']},
  {id:'supplements',title:'영양제를 알아보기 전 확인할 것',description:'제품 표시와 복용 중인 약을 함께 확인하는 방법을 알아봐요.',source:'미국 NIH · ODS',sourceTitle:'Dietary Supplements: What You Need to Know',url:'https://ods.od.nih.gov/factsheets/WYNTK-Consumer/',language:'영어',sourceUpdatedAt:'2023-01-04',checkedAt,kind:'summary',points:['제품에 표시된 성분, 1회 섭취량과 함량을 확인해요.','일부 영양제는 약과 상호작용할 수 있어요. 복용 중인 약과 영양제 목록을 의료진·약사와 함께 확인해요.']},
  {id:'vitamin-d',title:'비타민 D의 역할과 섭취 시 주의사항',description:'영양소의 역할과 과다 섭취 시 주의할 점을 살펴봐요.',source:'미국 NIH · ODS',sourceTitle:'Vitamin D — Fact Sheet for Consumers',url:'https://ods.od.nih.gov/factsheets/VitaminD-Consumer/',language:'영어',sourceUpdatedAt:'2022-11-08',checkedAt,kind:'summary',points:['비타민 D는 칼슘 흡수와 뼈 건강에 관여해요.','보충제로 비타민 D를 과도하게 섭취하면 해로울 수 있어요. 필요 여부와 섭취량은 개인 상태를 확인한 뒤 정해요.']},
  {id:'hypertension',title:'고혈압: 질병관리청 공식 정보',description:'질환 개요부터 생활습관 관리까지 원문에서 확인해요.',source:'질병관리청 · 국가건강정보포털',sourceTitle:'고혈압',url:`${kdca}?cntnts_sn=6765`,language:'한국어',sourceUpdatedAt:null,checkedAt,kind:'original',points:[]},
  {id:'diabetes',title:'당뇨병: 질병관리청 공식 정보',description:'당뇨병의 종류와 관리에 관한 공식 원문을 확인해요.',source:'질병관리청 · 국가건강정보포털',sourceTitle:'당뇨병',url:`${kdca}?cntnts_sn=5305`,language:'한국어',sourceUpdatedAt:null,checkedAt,kind:'original',points:[]},
  {id:'health-portal',title:'궁금한 건강정보 찾아보기',description:'질병관리청의 건강문제·생활습관 정보를 찾아볼 수 있어요.',source:'질병관리청 · 국가건강정보포털',sourceTitle:'국가건강정보포털',url:'https://health.kdca.go.kr/healthinfo/',language:'한국어',sourceUpdatedAt:null,checkedAt,kind:'original',points:[]},
];
const goalGuides:Record<string,readonly string[]>={routine:['health-portal'],nutrition:['supplements','vitamin-d'],medicine:['supplements'],sleep:['sleep'],energy:['sleep'],condition:['health-portal']};
// Only reviewed names match. Never infer a disease from symptoms, medicines or substrings.
const conditionGuides:Record<string,string>={'고혈압':'hypertension','당뇨병':'diabetes','당뇨':'diabetes'};
export type GuideReason={kind:'goal'|'condition';value:string};
export type MatchedGuide={guide:Guide;reasons:GuideReason[]};
export function selectGuides(health:HealthRecord|null) {
  const matches=new Map<string,MatchedGuide>();const unmatched:string[]=[];
  function add(id:string,reason:GuideReason){const guide=guides.find(item=>item.id===id);if(!guide)return;const existing=matches.get(id);if(existing){if(!existing.reasons.some(item=>item.kind===reason.kind&&item.value===reason.value))existing.reasons.push(reason);}else matches.set(id,{guide,reasons:[reason]});}
  if(health){
    if(health.profile.conditions.status==='yes')for(const raw of health.profile.conditions.items){const name=raw.trim();if(!name)continue;const key=name.replace(/\s+/g,'');const id=Object.hasOwn(conditionGuides,key)?conditionGuides[key]:undefined;if(id)add(id,{kind:'condition',value:name});else if(!unmatched.includes(name))unmatched.push(name);}
    for(const goal of health.profile.goals)for(const id of (Object.hasOwn(goalGuides,goal)?goalGuides[goal]:[]))add(id,{kind:'goal',value:goal});
  }
  return {matches:[...matches.values()],unmatched};
}

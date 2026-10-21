import type { HealthRecord, Medicine } from './medicine-model';
export type HomeAction = {id:string;title:string;description:string;target:'/profile'|'/search'|'/medicines';step?:number};
export function homeOverview(health:HealthRecord|null,medicines:Medicine[]) {
  const missing:string[]=[];const actions:HomeAction[]=[];
  if(!health) {
    actions.push({id:'profile',title:'내 몸의 정보를 알려주세요',description:'아는 만큼만 입력하고 건강 프로필을 만들어요.',target:'/profile',step:1});
  } else {
    const p=health.profile;
    if(!p.goals.length){missing.push('관리 목표');actions.push({id:'goals',title:'관리 목표를 골라볼까요?',description:'관심 있는 목표를 선택하면 홈에 반영돼요.',target:'/profile',step:1});}
    if(!p.ageBand){missing.push('기본정보');actions.push({id:'basics',title:'기본정보를 이어서 입력해요',description:'연령대를 알려주세요. 입력은 선택이에요.',target:'/profile',step:2});}
    if(p.conditions.status==='unknown'||p.allergies.status==='unknown'||(p.conditions.status==='yes'&&!p.conditions.items.length)||(p.allergies.status==='yes'&&!p.allergies.items.length)){
      missing.push('건강 상태');actions.push({id:'health',title:'질환·알레르기 정보를 확인해요',description:'알고 있는 정보를 기록하고, 모르면 비워둘 수 있어요.',target:'/profile',step:3});
    }
    if(!medicines.length&&p.medicationStatus==='taking') actions.push({id:'products',title:'먹고 있는 제품을 등록해요',description:'문진에서 복용 중이라고 알려주셨어요.',target:'/search'});
    else if(!medicines.length&&!p.medicationStatus){missing.push('복용 여부');actions.push({id:'medication',title:'복용 중인 제품이 있나요?',description:'약과 영양제의 복용 여부를 기록해요.',target:'/profile',step:4});}
    if(!p.sleep||!p.exercise||!p.smoking||!p.alcohol){missing.push('생활습관');actions.push({id:'lifestyle',title:'평소 생활습관을 정리해요',description:'수면·운동·흡연·음주 중 비어 있는 항목을 입력해요.',target:'/profile',step:5});}
  }
  const unscheduled=medicines.filter(item=>!item.regimen).length;
  const unverified=medicines.filter(item=>item.source==='manual').length;
  // A recorded schedule is not evidence that a dose was actually taken.
  if(unscheduled)actions.unshift({id:'schedule',title:'복용 일정을 기록해 볼까요?',description:`등록한 ${unscheduled}개 제품에 일정이 없어요. 확인한 복용량과 시간을 입력해요.`,target:'/medicines'});
  return {missing,actions,unscheduled,unverified};
}

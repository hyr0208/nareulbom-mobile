import { TodayDoses } from '@/components/today-doses';
import { WellnessIcon, type WellnessIconKind } from '@/components/wellness-icon';
import { RecommendationEntry } from '@/components/recommendation-entry';
import { Text } from '@/components/app-text';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Page, Note } from '@/components/ui';
import { colors as c } from '@/constants/theme';
import { healthLabel, type Medicine } from '@/data/medicine-model';
import { homeOverview, type HomeAction } from '@/data/home-model';
import { useSession } from '@/data/session';
const focusByGoal:Record<string,{description:string;label:string;target:'/profile'|'/guide'|'/medicines';step?:number}>={
  routine:{description:'내 몸의 정보를 차근차근 정리해요.',label:'내 건강정보 확인',target:'/profile'},
  nutrition:{description:'영양소에 관한 정보를 출처와 함께 살펴봐요.',label:'영양소 정보 살펴보기',target:'/guide'},
  medicine:{description:'등록한 복용 제품과 기록한 일정을 확인해요.',label:'내 복용함 확인',target:'/medicines'},
  sleep:{description:'기록한 수면시간과 평소 생활습관을 돌아봐요.',label:'생활습관 확인',target:'/profile',step:5},
  energy:{description:'평소 생활습관부터 차근차근 정리해요.',label:'생활습관 확인',target:'/profile',step:5},
  condition:{description:'진단받은 질환과 알레르기 정보를 관리해요.',label:'건강 상태 확인',target:'/profile',step:3},
};
function scheduleLabel(item:Medicine) {
  if(!item.regimen)return '복용 일정 미입력';
  return item.regimen.mode==='asNeeded'?`기록한 일정 · 필요 시 · ${item.regimen.dose}`:`기록한 일정 · 매일 ${item.regimen.times.join(', ')} · ${item.regimen.dose}`;
}
export default function Home() {
  const router=useRouter();const {medicines,consentAt,health}=useSession();
  const {missing,actions,unverified}=homeOverview(health,medicines);
  const goals=health?.profile.goals||[];const focus=focusByGoal[goals[0]];
  function open(target:'/profile'|'/guide'|'/medicines'|'/search',step?:number){if(step)router.push({pathname:'/profile',params:{step:String(step)}});else router.push(target);}
  return <Page eyebrow="나를봄" title="오늘도, 나를 챙겨요" description={health?'알려주신 정보를 바탕으로, 할 일을 정리했어요.':'나의 속도에 맞춰 건강관리를 시작해요.'}>
    <View style={st.shortcuts}>
      {([
        {kind:'nutrition',label:'영양제 찾기',target:'/nutrition'},
        {kind:'search',label:'약 검색',target:'/search'},
        {kind:'medicines',label:'내 복용함',target:'/medicines'},
        {kind:'profile',label:'내 건강정보',target:'/profile'},
      ] as const).map(item=><Pressable key={item.kind} accessibilityRole="button" accessibilityLabel={item.label} onPress={()=>router.push(item.target)} style={({pressed})=>[st.shortcut,{opacity:pressed?0.65:1,transform:[{scale:pressed?0.96:1}]}]}><WellnessIcon kind={item.kind as WellnessIconKind}/><Text style={st.shortcutLabel}>{item.label}</Text></Pressable>)}
    </View>
    <TodayDoses />
    <RecommendationEntry />
      <View style={st.focus}>
      <View style={st.sectionHeader}><Text style={st.overline}>나의 관리 목표</Text><Pressable accessibilityRole="button" accessibilityLabel="관리 목표 수정" onPress={()=>open('/profile',1)} style={st.textButton}><Text style={st.link}>{goals.length?'수정':'선택하기'}</Text></Pressable></View>
      {goals.length?<><View style={st.chips}>{goals.map(goal=><View key={goal} style={st.chip}><Text style={st.chipText}>{healthLabel('goals',goal)}</Text></View>)}</View>{focus&&<><Text style={st.body}>{focus.description}</Text><Pressable accessibilityRole="button" onPress={()=>open(focus.target,focus.step)} style={st.focusLink}><Text style={st.link}>{focus.label}</Text><Text accessible={false} style={st.arrow}>›</Text></Pressable></>}</>:<><Text style={st.title}>어떤 관리를 시작하고 싶나요?</Text><Text style={st.body}>목표를 선택하면 이곳에서 이어갈 수 있어요.{!health?' 건강정보 입력은 선택이에요.':''}</Text></>}
    </View>
    {actions.length>0&&<View style={st.section}><Text accessibilityRole="header" style={st.heading}>이어서 챙겨보기</Text>{actions.slice(0,2).map((action:HomeAction)=><Pressable key={action.id} accessibilityRole="button" accessibilityLabel={action.title} onPress={()=>open(action.target,action.step)} style={({pressed})=>[st.action,{opacity:pressed?0.65:1}]}><View style={st.copy}><Text style={st.title}>{action.title}</Text><Text style={st.caption}>{action.description}</Text></View><Text accessible={false} style={st.arrow}>›</Text></Pressable>)}</View>}
    <View style={st.section}>
      <View style={st.sectionHeader}><View style={st.labelRow}><Text accessibilityRole="header" style={st.heading}>내 복용함</Text><Text style={st.count}>{medicines.length}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="복용함 전체 보기" onPress={()=>open('/medicines')} style={st.textButton}><Text style={st.link}>전체 보기</Text></Pressable></View>
      {medicines.length?<>{medicines.slice(0,3).map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${item.name} 복용함에서 보기`} onPress={()=>open('/medicines')} style={({pressed})=>[st.product,{opacity:pressed?0.65:1}]}><Text style={st.title}>{item.name}</Text><Text style={st.caption}>{scheduleLabel(item)}</Text>{item.source==='manual'&&<Text style={st.status}>직접 등록 · 정보 미확인</Text>}</Pressable>)}{medicines.length>3&&<Note>외 {medicines.length-3}개 제품은 복용함에서 확인해요.</Note>}{unverified>0&&<Note>직접 등록한 {unverified}개 제품은 공식 정보와 연결되지 않았어요.</Note>}</>:<View style={st.empty}><Text style={st.title}>{health?.profile.medicationStatus==='none'?'복용하지 않는다고 알려주셨어요':health?.profile.medicationStatus==='taking'?'먹고 있는 제품을 등록해 주세요':'아직 등록한 제품이 없어요'}</Text><Text style={st.caption}>{health?.profile.medicationStatus==='none'?'새로 챙겨 먹는 제품이 생기면 추가해 주세요.':'약 포장이나 처방전의 제품명을 확인해 주세요.'}</Text></View>}
      <Pressable accessibilityRole="button" accessibilityLabel="복용 제품 검색해서 추가" onPress={()=>open('/search')} style={({pressed})=>[st.addButton,{opacity:pressed?0.7:1}]}><Text style={st.addText}>약·영양제 등록하기</Text></Pressable>
      <Note>표시한 일정은 직접 입력한 기록이에요. 오늘의 복용에서 먹었어요·건너뜀을 기록할 수 있어요. 알림 설정은 내 정보에서 관리해요.</Note>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="약 검색하기" onPress={()=>open('/search')} style={({pressed})=>[st.search,{opacity:pressed?0.65:1}]}><View accessible={false} style={st.searchIcon}><View style={st.lens}/><View style={st.handle}/></View><Text style={st.searchText}>궁금한 약을 검색해 보세요</Text></Pressable>
    <View style={st.section}>
      <Text accessibilityRole="header" style={st.heading}>나의 건강정보</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="건강 프로필 보기" onPress={()=>open('/profile')} style={st.action}><View style={st.copy}><Text style={st.title}>{health?'입력한 정보 확인하기':'내 몸의 정보 입력하기'}</Text><Text style={st.caption}>{health?(missing.length?`아직 비어 있는 항목 · ${missing.join(' · ')}`:'입력한 건강정보를 확인하고 수정할 수 있어요.'):'관리 목표부터 생활습관까지, 아는 만큼만 알려주세요.'}</Text></View><Text accessible={false} style={st.arrow}>›</Text></Pressable>
      {health&&<Note>{health.remember?'건강 프로필은 이 기기에 보관 중이에요.':'건강 프로필은 이번 실행에서만 임시로 유지돼요.'}</Note>}
      <Pressable accessibilityRole="button" accessibilityLabel="건강 가이드 보기" onPress={()=>open('/guide')} style={st.action}><View style={st.copy}><Text style={st.title}>건강정보 알아보기</Text><Text style={st.caption}>공식 출처의 질환·영양소 정보를 살펴봐요.</Text></View><Text accessible={false} style={st.arrow}>›</Text></Pressable>
    </View>
    <Note>{consentAt?'복용함은 이 기기에 보관 중이에요.':'복용함은 임시 보관 중이에요. 보관 설정은 내 정보에서 관리해요.'}{'\n'}개별 상품·용량 추천과 상호작용 분석은 준비 중이에요.</Note>
  </Page>;
}
const st=StyleSheet.create({
  shortcuts:{flexDirection:'row',gap:4,paddingVertical:4},shortcut:{flex:1,minHeight:94,alignItems:'center',justifyContent:'center',gap:10,paddingVertical:8},shortcutLabel:{fontSize:12,lineHeight:18,fontWeight:'500',color:c.ink,textAlign:'center'},
  focus:{backgroundColor:c.pale,borderRadius:14,padding:20,gap:12},section:{gap:8,paddingTop:4},sectionHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},overline:{fontSize:12,fontWeight:'600',color:c.green},heading:{fontSize:18,lineHeight:28,fontWeight:'600',color:c.ink},title:{fontSize:15,lineHeight:24,fontWeight:'500',color:c.ink},body:{fontSize:14,lineHeight:23,color:'#62676E'},caption:{fontSize:13,lineHeight:22,color:c.muted},chips:{flexDirection:'row',flexWrap:'wrap',gap:8},chip:{paddingHorizontal:11,paddingVertical:6,borderRadius:8,backgroundColor:c.paper},chipText:{fontSize:13,lineHeight:20,color:c.green,fontWeight:'500'},textButton:{minHeight:44,justifyContent:'center',paddingLeft:12},link:{fontSize:13,color:c.green,fontWeight:'500'},focusLink:{minHeight:44,flexDirection:'row',alignItems:'center',gap:8,alignSelf:'flex-start'},arrow:{color:'#969BA1',fontSize:24},action:{flexDirection:'row',alignItems:'center',gap:16,paddingVertical:16,borderBottomWidth:1,borderColor:c.line},copy:{flex:1,gap:5},labelRow:{flexDirection:'row',alignItems:'center',gap:8},count:{fontSize:16,color:c.green,fontWeight:'600'},product:{paddingVertical:15,gap:6,borderBottomWidth:1,borderColor:c.line},status:{fontSize:12,lineHeight:20,color:c.muted},empty:{paddingVertical:20,gap:6},addButton:{minHeight:48,backgroundColor:c.green,borderRadius:10,alignItems:'center',justifyContent:'center',paddingHorizontal:16,paddingVertical:12,marginTop:8},addText:{fontSize:14,fontWeight:'600',color:c.paper},search:{flexDirection:'row',alignItems:'center',gap:13,minHeight:56,paddingHorizontal:18,borderRadius:12,backgroundColor:'#F5F6F7'},searchText:{fontSize:14,color:c.muted,flex:1},searchIcon:{width:18,height:20},lens:{width:14,height:14,borderRadius:7,borderWidth:1.6,borderColor:c.muted,position:'absolute',top:1,left:0},handle:{width:7,height:1.6,backgroundColor:c.muted,position:'absolute',left:11,top:14,transform:[{rotate:'45deg'}]},
});

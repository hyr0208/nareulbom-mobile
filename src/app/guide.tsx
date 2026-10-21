import { useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/app-text';
import { Page, Card, Heading, Body, Note, Button } from '@/components/ui';
import { colors as c } from '@/constants/theme';
import { healthLabel } from '@/data/medicine-model';
import { guides, selectGuides, type Guide, type GuideReason } from '@/data/guide-data';
import { useSession } from '@/data/session';
function reasonLabel(reason:GuideReason){return reason.kind==='condition'?`입력한 질환 · ${reason.value}`:`선택한 목표 · ${healthLabel('goals',reason.value)}`;}
export default function GuideScreen() {
  const router=useRouter();const {health}=useSession();
  const [mode,setMode]=useState<'mine'|'all'>('mine');const [selected,setSelected]=useState<Guide|null>(null);const [linkError,setLinkError]=useState('');
  const {matches,unmatched}=selectGuides(health);
  const items=mode==='mine'?matches:guides.map(guide=>({guide,reasons:[] as GuideReason[]}));
  function editProfile(step:number){router.push({pathname:'/profile',params:{step:String(step)}});}
  return <>
    <Page eyebrow="알아봄" title="내 몸을 알아가는 가이드" description="선택한 목표와 입력한 질환에 관련된 공식 자료를 모았어요.">
      <View accessibilityRole="radiogroup" accessibilityLabel="가이드 보기 범위" style={st.tabs}>{([['mine','나의 가이드'],['all','전체 자료']] as const).map(([value,label])=><Pressable key={value} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{checked:mode===value}} onPress={()=>setMode(value)} style={[st.tab,mode===value&&st.activeTab]}><Text style={[st.tabText,mode===value&&st.activeText]}>{label}</Text></Pressable>)}</View>
      {mode==='mine'&&<Note>연결 기준은 입력한 목표·질환명이에요. 개인별 진단·처방·영양제 추천 결과는 아니에요.</Note>}
      {mode==='mine'&&unmatched.length>0&&<View style={st.notice}><Heading>아직 연결한 자료가 없어요</Heading><Body>{unmatched.join(' · ')}</Body><Note>해당 질환의 가이드는 아직 준비되지 않았어요. 자료가 없다는 것이 주의할 점이 없다는 뜻은 아니에요.</Note><Button secondary label="입력한 질환명 확인" onPress={()=>editProfile(3)} /></View>}
      {mode==='mine'&&!items.length&&<Card><Heading>{health?'연결된 가이드가 없어요':'관심 있는 목표를 알려주세요'}</Heading><Body>{health?'관리 목표를 선택하거나 전체 자료에서 읽을거리를 살펴보세요.':'목표·진단받은 질환을 입력하면 관련 자료를 이곳에서 확인할 수 있어요. 입력 없이 전체 자료도 볼 수 있어요.'}</Body><Button label={health?'관리 목표 선택':'건강정보 입력하기'} onPress={()=>editProfile(1)} /><Button secondary label="전체 자료 보기" onPress={()=>setMode('all')} /></Card>}
      {items.length>0&&<View style={st.headingRow}><Text accessibilityRole="header" style={st.sectionTitle}>{mode==='mine'?'나의 읽을거리':'공식 자료 모아보기'}</Text><Note>{items.length}개</Note></View>}
      {items.map(({guide,reasons})=><View key={guide.id} style={st.article}>
        {reasons.length>0&&<View style={st.reasons}>{reasons.map(reason=><Text key={`${reason.kind}-${reason.value}`} style={st.reason}>{reasonLabel(reason)}</Text>)}</View>}
        <Heading>{guide.title}</Heading><Body>{guide.description}</Body><Note>{guide.source} · {guide.language==='영어'?'영문 원문':'한국어 원문'}</Note>
        <Button secondary label={`${guide.title} 읽기`} onPress={()=>{setLinkError('');setSelected(guide);}} />
      </View>)}
      <Note>자료는 일반적인 건강정보예요. 임신·수유, 연령, 알레르기나 여러 질환을 고려한 개인별 적합성 분석은 준비 중이에요.</Note>
    </Page>
    <Modal visible={Boolean(selected)} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setSelected(null)}>{selected&&<Page eyebrow={selected.kind==='summary'?'공식 자료 읽기':'공식 원문 안내'} title={selected.title} description={selected.description}>
      <Button secondary label="가이드 닫기" onPress={()=>setSelected(null)} />
      {selected.kind==='summary'?<><Heading>함께 살펴볼 내용</Heading>{selected.points.map((point,index)=><View key={point} style={st.point}><Text style={st.pointNumber}>{index+1}</Text><Body>{point}</Body></View>)}<Note>NIH 공식 자료의 일부 내용을 한국어로 짧게 정리했어요. 원문은 영어이며 국내 기준과 다를 수 있어요.</Note></>:<><Heading>공식 원문에서 확인해 주세요</Heading><Body>질병관리청 자료는 원문으로 연결해요. 아래 버튼을 누르면 해당 자료를 볼 수 있어요.</Body></>}
      <Card><Heading>출처와 확인 정보</Heading><Body>{selected.source}</Body><Note>원문 제목: {selected.sourceTitle}{'\n'}원문 갱신일: {selected.sourceUpdatedAt||'페이지에 표시되지 않음'}{'\n'}앱 자료 확인일: {selected.checkedAt}</Note><Note>앱 자료 확인일은 원문 갱신일과 달라요. 원문의 최신 내용도 함께 확인해 주세요.</Note><Button label="공식 원문 열기 ↗" onPress={()=>{setLinkError('');void Linking.openURL(selected.url).catch(()=>setLinkError('원문을 열지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.'));}} />{linkError?<Text accessibilityRole="alert" style={st.error}>{linkError}</Text>:null}</Card>
      <Note>일반적인 건강정보이며 개인별 진단·처방·안전성 판단 결과는 아니에요.</Note>
    </Page>}</Modal>
  </>;
}
const st=StyleSheet.create({tabs:{flexDirection:'row',backgroundColor:c.pale,borderRadius:10,padding:4,gap:4},tab:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:8},activeTab:{backgroundColor:c.paper},tabText:{fontSize:14,color:c.muted},activeText:{color:c.green,fontWeight:'600'},notice:{gap:12,padding:18,borderWidth:1,borderColor:c.line,borderRadius:12},headingRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},sectionTitle:{fontSize:17,fontWeight:'600',color:c.ink},article:{gap:12,paddingVertical:16,borderBottomWidth:1,borderColor:c.line},reasons:{gap:4},reason:{fontSize:12,lineHeight:20,color:c.green},point:{flexDirection:'row',alignItems:'flex-start',gap:12,paddingVertical:8,paddingRight:24},pointNumber:{fontSize:13,lineHeight:25,fontWeight:'600',color:c.green},error:{fontSize:14,lineHeight:23,color:c.amber}});

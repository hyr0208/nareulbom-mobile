import { useState } from 'react';
import { Linking,Modal,StyleSheet,View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/app-text';
import { Page,Card,Heading,Body,Note,Button } from '@/components/ui';
import { HealthOnboarding } from '@/components/health-onboarding';
import { useSession } from '@/data/session';
import { nutritionCandidates,nutrientInfo } from '@/data/nutrition-model';
import { colors as c } from '@/constants/theme';
const statusLabels={consider:'영양소 검토 후보',review:'추가 확인 먼저',existing:'이미 섭취 중 · 중복 확인',hold:'추가 보충 제안 보류'};
export default function NutritionScreen(){
  const router=useRouter();const {health,medicines,busy}=useSession();const [step,setStep]=useState(6);const [editing,setEditing]=useState(false);const [error,setError]=useState('');
  const {candidates,questions,context}=nutritionCandidates(health,medicines);
  function edit(value:number){setStep(value);setEditing(true);}
  return <>
    <Page icon="nutrition" eyebrow="나에게 맞는 영양제" title="나에게 맞는 영양소" description="알려주신 식습관과 섭취·검사 정보를 함께 살펴봤어요.">
      <Button secondary label="홈으로 돌아가기" onPress={()=>router.replace('/')} />
      {!health?.profile.nutrition?<Card><Heading>나에게 필요한 후보부터 찾아봐요</Heading><Body>식습관과 이미 먹는 영양제, 의료진에게 안내받은 검사 결과에 따라 영양소 검토 후보가 달라져요.</Body><Button label="영양정보 질문에 답하기" onPress={()=>edit(6)} /></Card>:<><View style={st.row}><Text style={st.count}>확인할 영양소 {candidates.length}개</Text><Button secondary label="답변 수정" onPress={()=>edit(6)} /></View><Note>공식 자료의 입력 조건에 따른 초기 후보 안내예요. 전문 임상 검수를 마친 개인별 처방·상품·용량 추천은 아니에요.</Note></>}
      {candidates.map(candidate=>{const info=nutrientInfo[candidate.id];return <Card key={candidate.id}>
        <Text style={st.status}>{statusLabels[candidate.status]}</Text><Heading>{info.name}</Heading><Body>{info.role}</Body>
        <Text style={st.label}>이 후보가 보이는 이유</Text>{candidate.reasons.map(reason=><Body key={reason}>{reason}</Body>)}
        <Note>{info.food}</Note>
        {candidate.checks.length>0&&<View style={st.checks}><Text style={st.label}>먼저 확인해 주세요</Text>{candidate.checks.map(check=><Note key={check}>• {check}</Note>)}</View>}
        <Note>출처: 미국 NIH ODS · 영문 원문{'\n'}원문 갱신일 {info.updatedAt} · 앱 확인일 2026-10-21</Note>
        <Button secondary label={`${info.name} 근거 원문 보기`} onPress={()=>{setError('');void Linking.openURL(info.url).catch(()=>setError('원문을 열지 못했어요. 인터넷 연결을 확인해 주세요.'));}} />
      </Card>;})}
      {health?.profile.nutrition&&!candidates.length&&<Card><Heading>현재 답변에서 추가 후보를 찾지 못했어요</Heading><Body>확인한 세 영양소의 조건에 해당하지 않거나 정보가 부족할 수 있어요. 모든 영양소가 충분하거나 안전하다는 뜻은 아니에요.</Body></Card>}
      {questions.length>0&&<View style={{gap:12}}><Heading>조금 더 알려주세요</Heading>{questions.map(question=><Button key={question.label} secondary label={question.label} onPress={()=>edit(question.step)} />)}</View>}
      {context.length>0&&candidates.length===0&&<Card><Heading>함께 확인할 정보</Heading>{context.map(item=><Note key={item}>{item}</Note>)}</Card>}
      {error?<Text accessibilityRole="alert" style={st.error}>{error}</Text>:null}
      <Note>식품 섭취 빈도나 피로감만으로 결핍을 진단하지 않아요. 검사에서 낮거나 높다고 안내받았거나 질환·복용 약 등이 있으면 의료진·약사와 보충 계획을 확인해 주세요.</Note>
      <Button secondary label="건강 상태·복용정보 확인" onPress={()=>edit(3)} />
    </Page>
    <Modal visible={editing} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>{if(!busy)setEditing(false);}}>{editing&&<HealthOnboarding initialStep={step} onClose={()=>setEditing(false)} />}</Modal>
  </>;
}
const st=StyleSheet.create({row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},count:{fontSize:15,color:c.ink,fontWeight:'600'},status:{fontSize:12,lineHeight:20,color:c.green,fontWeight:'600'},label:{fontSize:14,lineHeight:23,color:c.ink,fontWeight:'600'},checks:{gap:8,borderTopWidth:1,borderColor:c.line,paddingTop:14},error:{fontSize:14,lineHeight:23,color:c.amber}});

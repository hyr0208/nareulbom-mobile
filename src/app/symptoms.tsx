import {useCallback,useEffect,useState} from 'react';
import {AppState,Linking,Modal,Pressable,StyleSheet,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from '@/components/app-text';
import {Page,Card,Heading,Body,Note,Button} from '@/components/ui';
import {HealthOnboarding} from '@/components/health-onboarding';
import {useSession} from '@/data/session';
import {assessHeadache,emptySymptomAnswers,riskQuestions,symptomSources,type Answer,type SymptomAnswers} from '@/data/symptom-model';
import {colors as c} from '@/constants/theme';
export default function SymptomScreen(){
  const router=useRouter();const {health,medicines,busy}=useSession();
  const [answers,setAnswers]=useState(emptySymptomAnswers);const [stage,setStage]=useState(0);const [editing,setEditing]=useState(false);const [profileStep,setProfileStep]=useState(2);const [error,setError]=useState('');
  const reset=useCallback(()=>{setAnswers(emptySymptomAnswers());setStage(0);setEditing(false);setError('');},[]);
  useFocusEffect(useCallback(()=>{reset();return reset;},[reset]));
  useEffect(()=>{const listener=AppState.addEventListener('change',state=>{if(state!=='active')reset();});return ()=>listener.remove();},[reset]);
  const result=assessHeadache(answers,health,medicines);const danger=result.kind==='emergency'||result.kind==='urgent';
  // Only a newly detected danger changes screens; editing the same answer stays possible.
  useEffect(()=>{if(result.kind==='emergency'||result.kind==='urgent')setStage(3);},[result.kind]);
  function set<K extends keyof SymptomAnswers>(key:K,value:SymptomAnswers[K]){setAnswers(old=>({...old,[key]:value}));}
  function editProfile(step:number){setProfileStep(step);setEditing(true);}
  function open(url:string){setError('');void Linking.openURL(url).catch(()=>setError('페이지를 열지 못했어요. 인터넷 연결을 확인해 주세요.'));}
  const risksComplete=riskQuestions.every(item=>answers.risks[item.id]==='no');
  return <View style={st.safe}>
    <Page icon="symptoms" key={stage} eyebrow="증상별 일반약 안내 · 첫 범위: 두통" title={stage===0?'증상부터 확인해요':stage===1?'먼저 위험 신호를 확인해요':stage===2?'지금 두통은 어떤가요?':result.title} description={stage===0?'증상 확인 뒤 약사와 상의할 일반약 성분을 안내해요.':stage===3?'현재 답변을 바탕으로 정리한 안내예요.':`${stage} / 2 · 모르는 항목은 모름으로 남겨주세요.`}>
      <Pressable accessibilityRole="button" accessibilityLabel={stage===0?'홈으로 돌아가기':'이전 단계'} style={st.back} onPress={()=>{if(stage===0)router.replace('/');else if(stage===1)reset();else setStage(stage===3?1:stage-1);}}><Text style={st.link}>‹ {stage===0?'홈으로':'이전'}</Text></Pressable>
      {stage===0?<>
        <Card><Heading>현재는 두통을 다뤄요</Heading><Body>두통의 동반 증상과 지속 상태를 먼저 확인해요. 다른 증상과 처방약 선택·변경 안내는 준비 중이에요.</Body><Note>갑자기 극심한 두통, 마비·의식 변화·시력 상실 등의 증상이 있으면 앱 질문을 기다리지 말고 응급 진료를 받아 주세요. 한국 응급 신고는 119예요.</Note></Card>
        <Body>이번 증상 답변과 기존 건강 프로필·복용함을 함께 참고해 진료 확인 사항과 약사 상담용 성분을 안내해요.</Body><Note>증상 답변은 기기에서 이번 화면에만 사용해요. 서버·AI·기기 저장소에 저장·전송하지 않고, 화면을 나가거나 앱이 백그라운드로 전환되면 초기화해요. 기존 건강 프로필의 보관 설정은 유지돼요.</Note>
        <Pressable accessibilityRole="checkbox" accessibilityLabel="증상 안내에 내 정보를 이용하는 데 동의해요 (선택)" accessibilityState={{checked:answers.consent}} onPress={()=>set('consent',!answers.consent)} style={st.check}><View style={[st.checkBox,answers.consent&&{backgroundColor:c.green,borderColor:c.green}]}><Text style={{color:c.paper}}>{answers.consent?'✓':''}</Text></View><Text style={st.checkText}>증상 안내에 내 정보를 이용하는 데 동의해요 (선택)</Text></Pressable>
        <Note>이 안내는 의료진의 진단이나 검증된 중증도 분류를 대신하지 않아요.</Note>
      </>:stage===1?<>
        {danger&&<Card><Heading>{result.title}</Heading><Body>해당 신호가 있다면 질문을 계속하기보다 진료를 먼저 받아 주세요.</Body><Button label="진료 안내 보기" onPress={()=>setStage(3)} /></Card>}
        {riskQuestions.map(question=><View key={question.id} style={st.field}><Text accessibilityRole="header" style={st.question}>{question.label}</Text><AnswerChoices value={answers.risks[question.id]} onChange={value=>set('risks',{...answers.risks,[question.id]:value})} /></View>)}
        {!risksComplete&&<Note>하나라도 판단하기 어렵다면 성분을 임의로 고르지 말고 의료진에게 문의해 주세요.</Note>}
      </>:stage===2?<>
        <View style={st.field}><Heading>통증 정도</Heading><Options options={[["mild","가벼워요"],["moderate","중간 정도예요"],["severe","심해요"]]} value={answers.severity} onChange={value=>set('severity',value as SymptomAnswers['severity'])} /></View>
        <View style={st.field}><Heading>언제 시작했나요?</Heading><Options options={[["today","오늘"],["few-days","1~3일 전"],["longer","4일 이상 전"]]} value={answers.duration} onChange={value=>set('duration',value as SymptomAnswers['duration'])} /></View>
        {([['repeated','두통이 자주 반복되거나 자가관리 후에도 호전되지 않고 악화하나요?'],['todayProducts','오늘 약·영양제·감기약·진통제를 먹었나요?'],['heavyDrinking','알코올 의존 또는 최근 한 번에 많은 술을 마신 일이 있나요?'],['longPainkillerUse','진통제를 3일 넘게 계속 사용하고 있나요?'],['profileCurrent','내 정보에 기록한 건강 상태·복용정보가 지금도 맞나요?']] as const).map(([id,label])=><View key={id} style={st.field}><Text accessibilityRole="header" style={st.question}>{label}</Text><AnswerChoices value={answers[id]} onChange={value=>set(id,value)} /></View>)}
      </>:<>
        {result.kind==='emergency'?<Card><Heading>응급 진료를 우선해 주세요</Heading><Body>한국에서는 119에 도움을 요청하거나 응급의료기관으로 바로 가세요. 직접 운전하지 말고 도움을 요청해 주세요.</Body>{result.reasons.map(reason=><Note key={reason}>{reason}</Note>)}</Card>:result.kind==='urgent'?<Card><Heading>의료진에게 바로 알려주세요</Heading>{result.reasons.map(reason=><Body key={reason}>{reason}</Body>)}<Note>한국에서는 119를 통해 응급의료 상담·도움을 요청할 수 있어요. 과량 복용 가능성은 증상이 없어도 바로 문의해 주세요.</Note></Card>:result.kind==='appointment'?<Card><Heading>진료로 원인을 확인해요</Heading>{result.reasons.map(reason=><Body key={reason}>{reason}</Body>)}<Note>새로운 위험 신호가 생기면 예약을 기다리지 말고 바로 진료를 받아 주세요.</Note></Card>:result.kind==='ingredient'?<Card><Note>일반 자료에 있는 약사 상담용 성분</Note><Heading>아세트아미노펜</Heading><Body>두통의 통증 완화에 사용되는 성분이에요. 파라세타몰(paracetamol)이라고도 불려요.</Body><Body>{result.reasons[0]}</Body><Note>감기약·복합진통제에도 포함될 수 있어 중복 복용에 주의해요. 실제 제품의 함량·제형·복용량은 포장과 약사에게 확인해 주세요.</Note><Button secondary label="아세트아미노펜 공식 자료 보기" onPress={()=>open(symptomSources[1].url)} /></Card>:<Card><Heading>아직 약 성분을 제안하지 않았어요</Heading>{result.reasons.map(reason=><Body key={reason}>{reason}</Body>)}{result.profileSteps.map(step=><Button key={step} secondary label={`${step===2?'연령·체중':step===3?'질환·알레르기·임신·수유':'복용정보'} 확인하기`} onPress={()=>editProfile(step)} />)}</Card>}
        <Button secondary label="증상 답변 다시 확인" onPress={()=>setStage(1)} />
        <Card><Heading>근거와 적용 범위</Heading><Note>성분 안내는 19세 이상 두통의 제한된 입력 조건만 다뤄요. 위험 신호 미선택은 안전 판정이 아니며, 특정 상품·용량이나 처방약을 추천하지 않아요. 전문가 임상 검증과 국내 적용 검토는 후속 단계예요.</Note>{symptomSources.map(source=><View key={source.url} style={{gap:6}}><Note>{source.title} · 원문 갱신 {source.updatedAt}</Note><Button secondary label={`${source.title} 원문`} onPress={()=>open(source.url)} /></View>)}<Note>영문 자료 · 앱 확인일 2026-10-21</Note></Card>
      </>}
      {error?<Text accessibilityRole="alert" style={st.error}>{error}</Text>:null}
    </Page>
    <SafeAreaView edges={['bottom']} style={st.footer}><View style={st.footerContent}><Button label={stage===0?(answers.consent?'두통 질문 시작':'입력 없이 홈으로'):stage===1?(danger?'진료 안내 확인':risksComplete?'다음':'확인 필요한 항목 보기'):stage===2?'안내 확인':'홈으로 돌아가기'} onPress={()=>{if(stage===0){if(answers.consent)setStage(1);else router.replace('/');}else if(stage===1)setStage(danger||!risksComplete?3:2);else if(stage===2)setStage(3);else router.replace('/');}} /></View></SafeAreaView>
    <Modal visible={editing} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>{if(!busy)setEditing(false);}}>{editing&&<HealthOnboarding initialStep={profileStep} onClose={()=>setEditing(false)} />}</Modal>
  </View>;
}
function Options({options,value,onChange}:{options:readonly (readonly [string,string])[];value:string;onChange:(value:string)=>void}){return <View accessibilityRole="radiogroup" style={st.options}>{options.map(([id,label])=><Pressable key={id} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{checked:value===id}} onPress={()=>onChange(value===id?'':id)} style={[st.option,value===id&&st.selected]}><Text style={[st.optionText,value===id&&{color:c.green}]}>{label}</Text></Pressable>)}</View>;}
function AnswerChoices({value,onChange}:{value:Answer;onChange:(value:Answer)=>void}){return <Options value={value} onChange={next=>onChange(next as Answer)} options={[["yes","예"],["no","아니오"],["unknown","모름"]]} />;}
const st=StyleSheet.create({safe:{flex:1,backgroundColor:c.paper},back:{minHeight:44,justifyContent:'center',alignSelf:'flex-start'},link:{fontSize:14,color:c.green},check:{flexDirection:'row',alignItems:'center',gap:12,minHeight:48},checkBox:{width:22,height:22,borderWidth:1,borderColor:c.muted,borderRadius:5,alignItems:'center',justifyContent:'center'},checkText:{fontSize:14,lineHeight:23,color:c.ink,flex:1},field:{gap:14,paddingVertical:14,borderBottomWidth:1,borderColor:c.line},question:{fontSize:16,lineHeight:26,fontWeight:'600',color:c.ink},options:{flexDirection:'row',gap:8,flexWrap:'wrap'},option:{minHeight:48,paddingHorizontal:18,paddingVertical:12,borderWidth:1,borderColor:c.line,borderRadius:10,justifyContent:'center'},selected:{borderColor:c.green,backgroundColor:c.pale},optionText:{fontSize:14,color:c.ink},footer:{backgroundColor:c.paper,borderTopWidth:1,borderColor:c.line},footerContent:{paddingHorizontal:24,paddingTop:12,paddingBottom:12,width:'100%',maxWidth:680,alignSelf:'center'},error:{fontSize:14,color:c.amber,lineHeight:23}});

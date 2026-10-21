import { useRef, useState, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/app-text';
import { Body, Button, Heading, Note, s } from '@/components/ui';
import { ManualMedicineForm } from '@/components/manual-medicine';
import Search from '@/app/search';
import { colors as c } from '@/constants/theme';
import { emptyNutritionAnswers, nutritionOptions, type NutritionAnswers, emptyHealthProfile, healthLabel, healthOptions, validateHealthProfile, type HealthProfile } from '@/data/medicine-model';
import { useSession } from '@/data/session';

const titles = ['나에게 필요한 관리는\n어떤 것인가요?', '기본정보를\n알려주세요', '건강 상태를\n알려주세요', '지금 챙겨 먹는\n제품이 있나요?', '평소의 생활은\n어떤가요?', '영양제 후보를 위해\n조금 더 알려주세요'];
const descriptions = ['관심 있는 목표를 모두 골라주세요.', '알려주고 싶은 항목만 입력해 주세요.', '진단받은 질환과 알레르기를 구분해 기록해요.', '약과 영양제를 함께 확인해요.', '정확하지 않아도 괜찮아요. 평소를 떠올려 주세요.', '식습관과 기존 섭취·검사 정보를 함께 확인해요.'];
export function HealthOnboarding({ onClose, initialStep = 1 }: { onClose?: () => void; initialStep?: number }) {
  const { health, medicines, ready, busy, storageAvailable, storageError, finishOnboarding, retryLoad, eraseAll } = useSession();
  const startStep = Number.isInteger(initialStep) && initialStep >= 1 && initialStep <= 6 ? initialStep : 1;
  const [step, setStep] = useState(health ? startStep : 0);
  const [draft, setDraft] = useState<HealthProfile>(() => health?.profile || emptyHealthProfile());
  const [accepted, setAccepted] = useState(false);
  const [acceptedAt, setAcceptedAt] = useState(health?.consentAt || '');
  const [remember, setRemember] = useState(health?.remember || false);
  const [error, setError] = useState('');
  const [manual, setManual] = useState(false); const [search, setSearch] = useState(false);
  const [confirmErase, setConfirmErase] = useState(false);
  const scroll = useRef<ScrollView>(null);
  function go(next: number) { Keyboard.dismiss(); setError(''); setStep(next); scroll.current?.scrollTo({y:0,animated:false}); }
  function set<K extends keyof HealthProfile>(key: K, value: HealthProfile[K]) { setDraft(old => ({...old,[key]:value})); setError(''); }
  function next() {
    try { validateHealthProfile(draft); go(step + 1); }
    catch (e) { setError(e instanceof Error ? e.message : '입력을 확인해 주세요.'); }
  }
  function skip() {
    const blank = emptyHealthProfile();
    const fields: (keyof HealthProfile)[][] = [[],['goals'],['ageBand','sex','height','weight'],['conditions','allergies','pregnancy'],['medicationStatus'],['sleep','exercise','smoking','alcohol'],['nutrition']];
    setDraft(old => Object.fromEntries(Object.entries(old).map(([key,value]) => [key,fields[step].includes(key as keyof HealthProfile) ? blank[key as keyof HealthProfile] : value])) as HealthProfile);
    go(step + 1);
  }
  async function finish() {
    setError('');
    try {
      const profile = validateHealthProfile({...draft,medicationStatus:medicines.length ? 'taking' : draft.medicationStatus});
      await finishOnboarding({version:1,consentAt:acceptedAt,remember:storageAvailable && remember,profile});
      onClose?.();
    } catch (e) { setError(e instanceof Error ? e.message : '저장하지 못했어요. 다시 시도해 주세요.'); }
  }
  const checkedProfile = {...draft,medicationStatus:medicines.length ? 'taking' : draft.medicationStatus};
  return <SafeAreaView style={styles.safe}>
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.shell}>
        <View style={styles.top}>
          <View style={styles.headerSide}>{step > 0 ? <Pressable accessibilityRole="button" accessibilityLabel="이전 단계" disabled={busy} onPress={()=>go(step-1)} style={styles.backButton}><Text accessible={false} style={styles.backChevron}>‹</Text><Text style={styles.muted}>이전</Text></Pressable> : <Text style={styles.brand}>나를봄</Text>}</View>
          {step > 0 && <Text style={styles.muted}>{step <= 6 ? `${step} / 6` : '마지막 확인'}</Text>}
          <View style={[styles.headerSide,{alignItems:'flex-end'}]}>{onClose && <Pressable accessibilityRole="button" accessibilityLabel="건강정보 수정 닫기" disabled={busy} onPress={onClose} style={styles.textButton}><Text style={styles.muted}>닫기</Text></Pressable>}</View>
        </View>
        {step > 0 && <View accessibilityRole="progressbar" accessibilityLabel="건강정보 입력 진행률" accessibilityValue={{min:0,max:6,now:Math.min(step,6)}} style={styles.track}><View style={[styles.fill,{width:`${Math.min(step,6)*100/6}%`}]} /></View>}
        <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          {step === 0 ? <>
            <Text style={styles.eyebrow}>나에게 맞는 관리의 시작</Text>
            <Text accessibilityRole="header" style={styles.title}>나를 알아가는{`\n`}첫 걸음</Text>
            <Text style={styles.description}>몇 가지 질문으로 내 몸의 정보를 정리해요.{`\n`}아는 만큼만, 편하게 알려주세요.</Text>
            <View style={styles.outline}>{['관리 목표와 기본정보','질환·알레르기와 복용 제품','생활습관과 식습관·검사 정보'].map((text,index)=><View key={text} style={styles.outlineRow}><Text style={styles.number}>0{index+1}</Text><Text style={styles.optionText}>{text}</Text></View>)}</View>
            <Heading>건강정보 입력 안내</Heading>
            <Body>입력한 정보는 나의 건강 프로필을 구성하고 확인하는 데 사용해요. 영양정보 이용에 별도로 동의하면 영양소 후보 안내에도 활용해요. 질환·알레르기·임신·수유·복용정보 등 민감정보가 포함될 수 있어요.</Body>
            <Note>문진 답변은 현재 서버나 AI에 전송하지 않아요. 기기 보관은 마지막에 별도로 선택하며, 보관하지 않으면 이번 실행에서만 유지돼요. 내 정보에서 수정·삭제·동의 철회가 가능해요. 앱에서는 시작 안내 완료 여부만 별도로 기억해요.</Note>
            <Note>문진만으로 질환이나 영양소 결핍을 진단하지 않아요. 영양소 후보는 공식 자료의 입력 조건으로 안내해요. 개별 제품·용량 추천과 상호작용 분석은 준비 중이에요.</Note>
            <Note>건강정보 입력을 위한 선택 동의예요. 동의하지 않아도 약 검색과 복용함은 이용할 수 있어요.</Note>
            <Check label="건강정보 입력·이용에 동의해요 (선택)" checked={accepted} onPress={()=>setAccepted(!accepted)} />
          </> : step <= 6 ? <>
            <Text style={styles.eyebrow}>{['','관리 목표','기본정보','건강 상태','복용 제품','생활습관','영양정보'][step]}</Text>
            <Text accessibilityRole="header" style={styles.title}>{titles[step-1]}</Text><Text style={styles.description}>{descriptions[step-1]}</Text>
            {step === 1 && <Choices options={healthOptions.goals} values={draft.goals} onSelect={value=>set('goals',draft.goals.includes(value)?draft.goals.filter(item=>item!==value):[...draft.goals,value])} multiple />}
            {step === 2 && <>
              <Field title="연령대"><Choices options={healthOptions.ageBand} value={draft.ageBand} onSelect={value=>set('ageBand',value)} /></Field>
              <Field title="성별 (선택)"><Choices options={healthOptions.sex} value={draft.sex} onSelect={value=>set('sex',value)} /></Field>
              <View style={styles.row}><View style={styles.flex}><Label>키 (cm)</Label><TextInput accessibilityLabel="키 cm" keyboardType="decimal-pad" value={draft.height} onChangeText={value=>set('height',value)} maxLength={6} placeholder="선택 입력" placeholderTextColor={c.muted} style={s.input} /></View><View style={styles.flex}><Label>몸무게 (kg)</Label><TextInput accessibilityLabel="몸무게 kg" keyboardType="decimal-pad" value={draft.weight} onChangeText={value=>set('weight',value)} maxLength={6} placeholder="선택 입력" placeholderTextColor={c.muted} style={s.input} /></View></View>
            </>}
            {step === 3 && <>
              {(['conditions','allergies'] as const).map(key=><Field key={key} title={key==='conditions'?'진단받은 질환':'알레르기'}><Choices options={[["none","없어요"],["yes","있어요"],["unknown","잘 모르겠어요"]]} value={draft[key].status} onSelect={value=>set(key,{status:(value||'unknown') as 'none'|'yes'|'unknown',items:value==='yes'?draft[key].items:[]})} />{draft[key].status==='yes'&&<><TextInput accessibilityLabel={key==='conditions'?'진단받은 질환 이름':'알레르기 이름'} value={draft[key].items.join(',')} onChangeText={value=>set(key,{status:'yes',items:value.split(',')})} maxLength={730} placeholder={key==='conditions'?'진단받은 질환명을 입력하세요':'알고 있는 약물·음식 등의 알레르기'} placeholderTextColor={c.muted} style={s.input} /><Note>여러 항목은 쉼표로 구분해 주세요. 증상만으로 질환명을 추측해서 입력하지 않아도 돼요.</Note></>}</Field>)}
              <Field title="임신·수유 여부 (선택)"><Choices options={healthOptions.pregnancy} value={draft.pregnancy} onSelect={value=>set('pregnancy',value)} /></Field>
            </>}
            {step === 4 && <>
              <Choices options={healthOptions.medicationStatus} value={medicines.length?'taking':draft.medicationStatus} onSelect={value=>{if(value==='none'&&medicines.length){setError('복용함에 등록한 제품이 있어요. 시작 후 복용함에서 확인해 주세요.');return;}set('medicationStatus',value);}} />
              {medicines.map(item=><View key={item.id} style={styles.product}><Text style={styles.optionText}>{item.name}</Text><Note>{item.source==='manual'?'직접 등록 · 정보 미확인':item.manufacturer||'제조사 정보 미제공'}</Note></View>)}
              <Button secondary label="먹고 있는 약 검색하기" onPress={()=>setSearch(true)} /><Button secondary label="약·영양제 이름으로 직접 등록" onPress={()=>setManual(true)} />
              <Note>약 포장이나 처방전의 제품명·함량·제조사를 확인해 주세요. 복용량과 일정은 시작 후 복용함에서 따로 설정할 수 있어요.</Note>
            </>}
            {step === 5 && <>
              {(['sleep','exercise','smoking','alcohol'] as const).map((key,index)=><Field key={key} title={['평균 수면시간','평소 운동 횟수','흡연 여부','음주 습관'][index]}><Choices options={healthOptions[key]} value={draft[key]} onSelect={value=>set(key,value)} /></Field>)}
            </>}
            {step === 6 && <NutritionFields value={draft.nutrition} onChange={value=>set('nutrition',value)} />}
          </> : <>
            <Text style={styles.eyebrow}>준비가 되었어요</Text><Text accessibilityRole="header" style={styles.title}>내 몸의 정보를{`\n`}한눈에 확인해요</Text><Text style={styles.description}>빠진 내용은 나중에 채워도 괜찮아요.{`\n`}입력한 정보는 내 정보에서 수정할 수 있어요.</Text>
            <HealthSummary profile={checkedProfile} medicineCount={medicines.length} onEdit={value=>go(value)} />
            {storageAvailable ? <><Check label="이 기기에 건강정보 보관하기 (선택)" checked={remember} onPress={()=>setRemember(!remember)} /><Note>동의하면 입력한 목표·기본정보·질환·알레르기·임신·수유·복용 여부·생활습관과 동의한 식습관·영양제·검사 안내 정보를 기기 보안 저장소에 보관해요. 목적은 건강 프로필 유지이며, 건강정보 삭제 또는 전체 삭제할 때까지 보관해요. 복용 제품 목록은 별도 복용함 보관 동의에 따라 저장돼요.</Note><Note>선택하지 않으면 이번 실행에서만 유지돼요. iOS는 앱 삭제 후에도 보안 저장소 정보가 남을 수 있어 앱 내 삭제를 이용해 주세요.</Note></> : <Note>웹에서는 건강정보를 이번 실행에서만 임시로 유지해요. 앱에서 기기 보관을 선택할 수 있어요.</Note>}
            <Note>저장 후 홈에서 영양제 후보를 확인할 수 있어요. 영양소 후보는 공식 자료의 입력 조건으로 안내해요. 개별 제품·용량 추천과 상호작용 분석은 준비 중이에요.</Note>
          </>}
          {storageError ? <View style={styles.recovery}><Heading>저장정보 확인이 필요해요</Heading><Body>{storageError}</Body><Button secondary label="저장정보 다시 불러오기" disabled={busy} onPress={()=>void retryLoad()} />{confirmErase?<><Note>건강정보·복용함과 보관 동의를 모두 삭제해요. 복구할 수 없어요.</Note><Button label="모든 정보 삭제하고 동의 철회" disabled={busy} onPress={()=>{void eraseAll().then(()=>onClose?.()).catch(()=>setError('삭제를 완료하지 못했어요. 다시 시도해 주세요.'));}} /><Button secondary label="삭제 취소" onPress={()=>setConfirmErase(false)} /></>:<Button secondary label="모든 정보 삭제 안내" onPress={()=>setConfirmErase(true)} />}</View> : null}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        </ScrollView>
        <View style={styles.footer}>
          <View style={styles.primary}><Button label={step===0?(accepted?'동의하고 문진 시작':onClose?'입력하지 않고 돌아가기':'입력 없이 시작하기'):step===7?(onClose?'건강정보 저장':'나를봄 시작하기'):'다음'} disabled={!ready||busy||Boolean(storageError)} onPress={()=>{if(step===0){if(accepted){setAcceptedAt(new Date().toISOString());go(startStep);}else if(onClose){onClose();}else{void finishOnboarding().catch(e=>setError(e.message));}}else if(step===7)void finish();else next();}} /></View>
          {step>0&&step<7&&<Pressable accessibilityRole="button" disabled={busy} onPress={skip} style={styles.skipButton}><Text style={styles.muted}>이 단계는 건너뛰기</Text></Pressable>}
        </View>

      </View>
    </KeyboardAvoidingView>
    <ManualMedicineForm visible={manual} onClose={()=>setManual(false)} navigateOnSave={false} />
    <Modal visible={search} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setSearch(false)}>{search&&<Search onDone={()=>setSearch(false)} />}</Modal>
  </SafeAreaView>;
}

export function HealthSummary({ profile, medicineCount, onEdit }: {profile:HealthProfile;medicineCount:number;onEdit?:(step:number)=>void}) {
  const status = (value:HealthProfile['conditions']) => value.status==='none'?'없음':value.status==='unknown'?'미입력·모름':value.items.filter(Boolean).join(', ')||'있음 · 이름 미입력';
  const rows = [
    ['관리 목표',profile.goals.map(value=>healthLabel('goals',value)).join(' · ')||'미입력'],
    ['기본정보',[profile.ageBand?healthLabel('ageBand',profile.ageBand):'',profile.sex?healthLabel('sex',profile.sex):'',profile.height?`${profile.height}cm`:'',profile.weight?`${profile.weight}kg`:''].filter(Boolean).join(' · ')||'미입력'],
    ['건강 상태',`진단 질환: ${status(profile.conditions)}\n알레르기: ${status(profile.allergies)}\n임신·수유: ${healthLabel('pregnancy',profile.pregnancy)}`],
    ['복용 제품',`${healthLabel('medicationStatus',medicineCount?'taking':profile.medicationStatus)}${medicineCount?` · 복용함 ${medicineCount}개`:''}`],
    ['생활습관',`수면: ${healthLabel('sleep',profile.sleep)}\n운동: ${healthLabel('exercise',profile.exercise)}\n흡연: ${healthLabel('smoking',profile.smoking)}\n음주: ${healthLabel('alcohol',profile.alcohol)}`],
    ['영양정보',nutritionSummary(profile.nutrition)],
  ];
  return <View>{rows.map(([label,value],index)=><View key={label} style={styles.summaryRow}><View style={styles.row}><Text style={styles.label}>{label}</Text>{onEdit&&<Pressable accessibilityRole="button" accessibilityLabel={`${label} 수정`} onPress={()=>onEdit(index+1)} style={styles.textButton}><Text style={styles.link}>수정</Text></Pressable>}</View><Body>{value}</Body></View>)}</View>;
}
function Label({children}:{children:ReactNode}) {return <Text style={styles.label}>{children}</Text>;}
function Field({title,children}:{title:string;children:ReactNode}) {return <View style={styles.field}><Label>{title}</Label>{children}</View>;}
function Choices({options,value,values,onSelect,multiple=false}:{options:readonly (readonly [string,string])[];value?:string;values?:string[];onSelect:(value:string)=>void;multiple?:boolean}) {
  return <View accessibilityRole={multiple?'none':'radiogroup'} style={styles.choices}>{options.map(([key,label])=>{const selected=multiple?values?.includes(key):value===key;return <Pressable key={key} accessibilityRole={multiple?'checkbox':'radio'} accessibilityState={{checked:Boolean(selected)}} onPress={()=>onSelect(selected&&!multiple?'':key)} style={({pressed})=>[styles.choice,selected&&styles.selected,{opacity:pressed?0.65:1}]}><Text style={[styles.optionText,selected&&styles.selectedText]}>{label}</Text>{selected&&<Text accessible={false} style={styles.link}>✓</Text>}</Pressable>;})}</View>;
}
function Check({label,checked,onPress}:{label:string;checked:boolean;onPress:()=>void}) {return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{checked}} onPress={onPress} style={styles.checkRow}><View style={[styles.checkbox,checked&&styles.checkSelected]}><Text style={styles.tick}>{checked?'✓':''}</Text></View><Text style={styles.checkLabel}>{label}</Text></Pressable>;}
const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:c.paper},shell:{flex:1,width:'100%',maxWidth:680,alignSelf:'center'},top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:24,minHeight:64},brand:{fontSize:16,fontWeight:'700',color:c.green},muted:{fontSize:13,color:c.muted},track:{height:3,backgroundColor:c.line,marginHorizontal:24},fill:{height:3,backgroundColor:c.green},content:{paddingHorizontal:24,paddingTop:30,paddingBottom:28,gap:22},eyebrow:{fontSize:12,color:c.green,fontWeight:'600'},title:{fontSize:30,lineHeight:42,letterSpacing:-0.8,fontWeight:'700',color:c.ink},description:{fontSize:15,lineHeight:25,color:c.muted},outline:{borderTopWidth:1,borderBottomWidth:1,borderColor:c.line,paddingVertical:12,gap:4},outlineRow:{flexDirection:'row',gap:18,alignItems:'center',paddingVertical:10},number:{fontSize:13,color:c.green},optionText:{fontSize:15,lineHeight:23,color:c.ink},choices:{flexDirection:'row',flexWrap:'wrap',gap:10},choice:{minHeight:50,paddingVertical:12,paddingHorizontal:16,borderWidth:1,borderColor:c.line,borderRadius:10,flexDirection:'row',alignItems:'center',gap:12},selected:{borderColor:c.green,backgroundColor:c.pale},selectedText:{color:c.green,fontWeight:'500'},field:{gap:12,paddingBottom:8},label:{fontSize:15,fontWeight:'600',color:c.ink,marginBottom:8},row:{flexDirection:'row',gap:12,alignItems:'center',justifyContent:'space-between'},flex:{flex:1},footer:{alignItems:'stretch',gap:4,borderTopWidth:1,borderColor:c.line,paddingHorizontal:24,paddingTop:16,paddingBottom:12,backgroundColor:c.paper},primary:{width:'100%'},headerSide:{width:70},backButton:{minHeight:44,flexDirection:'row',alignItems:'center',gap:6},backChevron:{fontSize:30,lineHeight:34,color:c.ink},skipButton:{minHeight:44,alignItems:'center',justifyContent:'center'},textButton:{minHeight:44,justifyContent:'center',paddingHorizontal:2},checkRow:{flexDirection:'row',alignItems:'center',gap:12,minHeight:48},checkbox:{width:22,height:22,borderWidth:1,borderColor:c.muted,borderRadius:5,alignItems:'center',justifyContent:'center'},checkSelected:{backgroundColor:c.green,borderColor:c.green},tick:{color:c.paper},checkLabel:{fontSize:14,lineHeight:23,color:c.ink,flex:1},summaryRow:{borderBottomWidth:1,borderColor:c.line,paddingVertical:16,gap:2},link:{fontSize:13,color:c.green,fontWeight:'500'},product:{gap:6,paddingBottom:14,borderBottomWidth:1,borderColor:c.line},error:{fontSize:14,lineHeight:23,color:c.amber},recovery:{gap:12,borderWidth:1,borderColor:c.line,padding:16,borderRadius:12},
});


function NutritionFields({value,onChange}:{value?:NutritionAnswers;onChange:(value:NutritionAnswers|undefined)=>void}) {
  function update<K extends keyof NutritionAnswers>(key:K,next:NutritionAnswers[K]){if(value)onChange({...value,[key]:next});}
  return <>
    <Body>기존 건강 프로필·복용함과 이 단계의 식습관·섭취 영양제·검사 안내 정보를 함께 사용해 영양소 검토 후보와 추가 확인 사항을 안내해요.</Body>
    <Note>답변은 기기에서 처리하며 서버·AI에 전송하지 않아요. 보관 여부는 마지막에 선택해요. 이 동의를 해제하고 저장하거나 건강정보를 삭제하면 관련 답변도 삭제돼요.</Note>
    <Check label="영양소 후보 안내에 내 정보를 이용하는 데 동의해요 (선택)" checked={Boolean(value)} onPress={()=>onChange(value?undefined:emptyNutritionAnswers(new Date().toISOString()))} />
    {value&&<>
      <Field title="평소 식사 유형"><Choices options={nutritionOptions.diet} value={value.diet} onSelect={next=>update('diet',next)} /></Field>
      {['vegan','vegetarian'].includes(value.diet)&&<Field title="B12 강화식품을 먹나요?"><Note>영양표시에 비타민 B12가 첨가되었다고 적힌 시리얼·음료 등을 말해요. 모르면 선택하지 않아도 돼요.</Note><Choices options={nutritionOptions.fortifiedB12} value={value.fortifiedB12} onSelect={next=>update('fortifiedB12',next)} /></Field>}
      <Field title="칼슘 식품을 얼마나 자주 먹나요?"><Note>유제품, 칼슘 강화음료·두부, 뼈째 먹는 생선 등 전체 식사를 떠올려 주세요.</Note><Choices options={nutritionOptions.calciumFoods} value={value.calciumFoods} onSelect={next=>update('calciumFoods',next)} /></Field>
      <Field title="현재 영양제를 먹고 있나요?"><Choices options={nutritionOptions.supplements} value={value.supplements} onSelect={next=>onChange({...value,supplements:next,nutrients:next==='taking'?value.nutrients:[]})} /></Field>
      {value.supplements==='taking'&&<Field title="현재 먹는 영양소를 모두 골라주세요"><Choices multiple options={nutritionOptions.nutrients} values={value.nutrients} onSelect={next=>update('nutrients',value.nutrients.includes(next)?value.nutrients.filter(id=>id!==next):[...value.nutrients,next])} /><Note>종합비타민에 포함된 성분도 선택해 주세요. 모르면 그 외·성분 모름을 선택하고 제품을 확인해요.</Note></Field>}
      <Heading>의료진에게 검사 결과를 안내받았나요?</Heading><Note>직접 검사 수치를 해석하지 말고, 최근 의료진에게 들은 내용을 선택해 주세요. 기억나지 않으면 모름으로 남겨주세요. 결과 수치로 앱이 결핍을 진단하지 않아요.</Note>
      {([['b12','비타민 B12 검사'],['calcium','칼슘 검사'],['vitaminD','비타민 D 검사']] as const).map(([id,label])=><Field key={id} title={label}><Choices options={nutritionOptions.lab} value={value.labs[id]} onSelect={next=>update('labs',{...value.labs,[id]:next||'unknown'})} /></Field>)}
    </>}
  </>;
}

function nutritionSummary(value?:NutritionAnswers){
  if(!value)return '미입력 · 이용 동의 없음';
  const label=(key:keyof typeof nutritionOptions,answer:string)=>nutritionOptions[key].find(option=>option[0]===answer)?.[1]||'미입력';
  return `식사: ${label('diet',value.diet)}\nB12 강화식품: ${label('fortifiedB12',value.fortifiedB12)}\n칼슘 식품: ${label('calciumFoods',value.calciumFoods)}\n영양제: ${label('supplements',value.supplements)}${value.nutrients.length?' · '+value.nutrients.map(id=>label('nutrients',id)).join(', '):''}\nB12 검사: ${label('lab',value.labs.b12)}\n칼슘 검사: ${label('lab',value.labs.calcium)}\n비타민 D 검사: ${label('lab',value.labs.vitaminD)}`;
}

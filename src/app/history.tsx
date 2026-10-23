import { useEffect, useState } from 'react';
import { AppState, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/app-text';
import { Body, Button, Heading, Note, Page, s } from '@/components/ui';
import { colors as c } from '@/constants/theme';
import { doseKey, firstRecordDateInMonth, localDateKey, recordCalendarMonth, recordHistorySummary, recordHistoryWindow, recordProductOptions, recordsForProduct, recordsForDate, selectableRecordDate, shiftRecordMonth } from '@/data/dose-model';
import { useSession } from '@/data/session';
const weekdays = ['일','월','화','수','목','금','토'];
function dateLabel(date: string) { const [year,month,day] = date.split('-').map(Number); return `${year}년 ${month}월 ${day}일`; }
export default function History() {
  const router = useRouter();
  const {medicines,doseRecords,recordConsentAt,ready,storageError} = useSession();
  const [now,setNow] = useState(() => new Date());
  const [selected,setSelected] = useState(() => localDateKey());
  const [month,setMonth] = useState(() => localDateKey().slice(0,7));
  const [productId,setProductId] = useState<string | null>(null);
  const [choosingProduct,setChoosingProduct] = useState(false);
  const [query,setQuery] = useState('');
  const window = recordHistoryWindow(now);
  const products = recordProductOptions(medicines,doseRecords,window);
  // Deletion or consent withdrawal may remove a selected product while this view is retained.
  const product = products.find(item => item.id === productId);
  const activeProductId = product?.id ?? null;
  useEffect(() => { if (productId !== null && !medicines.some(item => item.id === productId)) setProductId(null); },[productId,medicines]);
  const filteredRecords = recordsForProduct(doseRecords,activeProductId);
  const search = query.trim().toLocaleLowerCase();
  const matches = products.filter(item => `${item.name} ${item.manufacturer} ${item.strength || ''}`.toLocaleLowerCase().includes(search));
  function selectProduct(id: string | null) { setProductId(id); setChoosingProduct(false); setQuery(''); }

  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = setInterval(refresh,15000);
    const listener = AppState.addEventListener('change',state => { if (state === 'active') refresh(); });
    return () => { clearInterval(timer); listener.remove(); };
  },[]);
  // A retained tab can cross midnight or a time-zone change. Keep its selection within the visible window.
  const activeDate = selectableRecordDate(selected,window) ? selected : window.today;
  const activeMonth = activeDate !== selected ? window.today.slice(0,7) : month >= window.first.slice(0,7) && month <= window.today.slice(0,7) ? month : window.today.slice(0,7);
  const summary = recordHistorySummary(filteredRecords,window);
  const records = recordsForDate(filteredRecords,activeDate,window);
  const counts = summary.byDate.get(activeDate) || {taken:0,skipped:0};
  const cells = recordCalendarMonth(activeMonth);
  function showMonth(value: string) { setMonth(value); setSelected(firstRecordDateInMonth(value,window)); }
  function showToday() { setMonth(window.today.slice(0,7)); setSelected(window.today); }
  return <><Page eyebrow="기록해봄" title="나의 복용 기록" icon="calendar" description="직접 남긴 복용 기록을 날짜별로 돌아봐요.">
    <View style={st.toolbar}><Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={st.textButton}><Text style={st.link}>‹ 홈으로</Text></Pressable><Text style={st.storage}>{recordConsentAt ? '기기에 보관 중' : '이번 실행의 임시 기록'}</Text></View>
    {storageError ? <Text accessibilityRole="alert" style={st.error}>{storageError}</Text> : null}
    {!ready ? <Note>복용 기록을 불러오는 중이에요.</Note> : <>
      <View style={st.filter}>
        <Text style={st.filterLabel}>조회할 제품</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`제품 선택: ${product?.name || '전체 제품'}`} accessibilityState={{expanded:choosingProduct}} onPress={() => {setQuery('');setChoosingProduct(true);}} style={st.filterButton}><View style={{flex:1,gap:4}}><Text style={st.filterName}>{product?.name || '전체 제품'}</Text>{product && <Note>{[product.strength,product.manufacturer].filter(Boolean).join(' · ') || '제조사·함량 미입력'}</Note>}</View><Text style={st.link}>변경 ›</Text></Pressable>
        {product && <Pressable accessibilityRole="button" onPress={() => selectProduct(null)} style={st.resetButton}><Text style={st.link}>전체 제품으로 보기</Text></Pressable>}
        <Note>{product ? '선택한 제품의 달력·집계·날짜별 기록이에요.' : '복용함에 등록된 모든 제품의 기록이에요.'}</Note>
      </View>
      <View style={st.overview}><Text style={st.overline}>최근 30일 · 기록을 남긴 날 {summary.recordedDays}일</Text><Text style={st.totals}>먹었어요 {summary.taken}건 <Text style={st.separator}>· 건너뜀 {summary.skipped}건</Text></Text><Note>{window.first.replaceAll('-','.')} – {window.today.replaceAll('-','.')}</Note></View>
      <View style={st.calendar}>
        <View style={st.monthBar}><Pressable accessibilityRole="button" accessibilityLabel="이전 달" accessibilityState={{disabled:activeMonth <= window.first.slice(0,7)}} disabled={activeMonth <= window.first.slice(0,7)} onPress={() => showMonth(shiftRecordMonth(activeMonth,-1))} style={st.monthButton}><Text style={[st.chevron,activeMonth <= window.first.slice(0,7) && st.disabled]}>‹</Text></Pressable><Text accessibilityRole="header" style={st.month}>{Number(activeMonth.slice(0,4))}년 {Number(activeMonth.slice(5))}월</Text><Pressable accessibilityRole="button" accessibilityLabel="다음 달" accessibilityState={{disabled:activeMonth >= window.today.slice(0,7)}} disabled={activeMonth >= window.today.slice(0,7)} onPress={() => showMonth(shiftRecordMonth(activeMonth,1))} style={st.monthButton}><Text style={[st.chevron,activeMonth >= window.today.slice(0,7) && st.disabled]}>›</Text></Pressable></View>
        <View style={st.week}>{weekdays.map(day => <Text key={day} style={st.weekday}>{day}</Text>)}</View>
        <View style={st.grid}>{cells.map((date,index) => {
          if (!date) return <View key={`blank-${index}`} accessible={false} style={st.day} />;
          const enabled = selectableRecordDate(date,window);
          const picked = date === activeDate;
          const dayCounts = summary.byDate.get(date);
          const label = `${dateLabel(date)}${date === window.today ? ', 오늘' : ''}, ${!enabled ? date > window.today ? '미래 날짜' : '보관 범위 밖' : `먹었어요 ${dayCounts?.taken || 0}건, 건너뜀 ${dayCounts?.skipped || 0}건`}`;
          return <Pressable key={date} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected:picked,disabled:!enabled}} disabled={!enabled} onPress={() => setSelected(date)} style={({pressed}) => [st.day,{opacity:pressed?0.65:1}]}>
            <View style={[st.dayNumber,picked && st.picked,date === window.today && !picked && st.today]}><Text style={[st.dayText,!enabled && st.disabled,picked && st.pickedText]}>{Number(date.slice(8))}</Text></View>
            <View accessible={false} style={st.dots}>{enabled && Boolean(dayCounts?.taken) && <View style={st.takenDot}/>}{enabled && Boolean(dayCounts?.skipped) && <View style={st.skippedDot}/>}</View>
          </Pressable>;
        })}</View>
        <View style={st.legend}><View style={st.legendItem}><View style={st.takenDot}/><Text style={st.legendText}>먹었어요 기록</Text></View><View style={st.legendItem}><View style={st.skippedDot}/><Text style={st.legendText}>건너뜀 기록</Text></View><Pressable accessibilityRole="button" accessibilityLabel="오늘 날짜 선택" onPress={showToday} style={st.todayButton}><Text style={st.link}>오늘</Text></Pressable></View>
      </View>
      <View style={st.detailHeader}><Heading>{Number(activeDate.slice(5,7))}월 {Number(activeDate.slice(8))}일의 기록</Heading><Note>총 {records.length}건</Note></View>
      {records.length ? <><Text style={st.daySummary}>먹었어요 {counts.taken}건 · 건너뜀 {counts.skipped}건</Text>{records.map(record => <View key={doseKey(record)} style={st.record}>
        <View style={st.recordTop}><Text style={st.time}>{record.time}</Text><Text style={[st.status,record.status === 'taken' && st.taken]}>{record.status === 'taken' ? '먹었어요' : '건너뜀'}</Text></View>
        <Text style={st.name}>{record.medicineName}</Text><Note>{record.kind === 'asNeeded' ? '필요 시 · 직접 입력한 복용 시각' : '매일 · 기록 당시 일정 시각'}</Note><Note>기록 당시 1회 복용량 · {record.dose}</Note><Note>기록 시각 · {new Date(record.recordedAt).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false})}</Note>
      </View>)}<Note>기록 당시의 제품명·복용량이에요. 매일 기록은 일정 시각, 필요 시 기록은 직접 입력한 복용 시각을 보여줘요. 기록 시각은 실제 복용 시각과 다를 수 있어요.</Note></> : <View style={st.empty}><Body>{product ? '선택한 제품은 이 날짜에 남긴 기록이 없어요.' : '이 날짜에 남긴 기록이 없어요.'}</Body><Note>기록이 없다고 복용하지 않았다는 뜻은 아니에요. 과거의 미기록 횟수는 추정하지 않아요.</Note></View>}
      {activeDate === window.today && <Button secondary label="오늘의 복용 기록·수정하기" onPress={() => router.replace('/')} />}
      <Note>최근 30일·최대 400개의 남아 있는 기록만 보여요. 제품 삭제·기록 삭제·보관 동의 여부에 따라 보이는 내역이 달라질 수 있어요. 과거 기록은 조회만 할 수 있어요.</Note>
      <Button secondary label="복용 기록 보관 설정" onPress={() => router.push('/profile')} />
    </>}
  </Page>
    <Modal visible={choosingProduct} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setChoosingProduct(false)}>
      <Page eyebrow="제품별 기록" title="어떤 제품을 볼까요?" description="제품을 선택하면 달력과 기록을 함께 좁혀 볼 수 있어요.">
        <Button secondary label="제품 선택 닫기" onPress={() => setChoosingProduct(false)}/>
        <TextInput accessibilityLabel="복용 기록 제품 검색" placeholder="제품명·제조사·함량 검색" placeholderTextColor={c.muted} value={query} onChangeText={setQuery} autoCorrect={false} maxLength={100} style={s.input}/>
        <Pressable accessibilityRole="radio" accessibilityState={{checked:activeProductId === null}} onPress={() => selectProduct(null)} style={[st.option,activeProductId === null && st.selectedOption]}><Text style={st.filterName}>전체 제품</Text><Note>최근 30일의 모든 복용 기록</Note></Pressable>
        <Note>복용함의 제품 {matches.length}개 · 건수는 최근 30일에 남긴 기록 수예요.</Note>
        {matches.map(item => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{checked:activeProductId === item.id}} onPress={() => selectProduct(item.id)} style={[st.option,activeProductId === item.id && st.selectedOption]}><Text style={st.filterName}>{item.name}</Text><Note>{[item.strength,item.manufacturer].filter(Boolean).join(' · ') || '제조사·함량 미입력'}</Note><Text style={st.optionCount}>기록 {item.count}건{activeProductId === item.id ? ' · 선택됨' : ''}</Text></Pressable>)}
        {!matches.length && <Body>{products.length ? '검색어에 맞는 제품이 없어요. 제품명이나 제조사를 다시 확인해 주세요.' : '복용함에 등록된 제품이 없어요. 제품을 등록하고 기록을 남기면 여기서 선택할 수 있어요.'}</Body>}
      </Page>
    </Modal>
  </>;
}
const st = StyleSheet.create({
  filter:{gap:8},filterLabel:{fontSize:12,color:c.muted},filterButton:{minHeight:56,borderWidth:1,borderColor:c.line,borderRadius:12,padding:14,flexDirection:'row',alignItems:'center',gap:12},filterName:{fontSize:15,lineHeight:24,color:c.ink,fontWeight:'600'},resetButton:{minHeight:44,justifyContent:'center',alignSelf:'flex-start'},option:{minHeight:68,padding:16,borderWidth:1,borderColor:c.line,borderRadius:12,gap:6},selectedOption:{borderColor:c.green,backgroundColor:c.pale},optionCount:{fontSize:12,lineHeight:20,color:c.green},
  toolbar:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},textButton:{minHeight:44,justifyContent:'center',paddingRight:14},link:{fontSize:13,color:c.green,fontWeight:'600'},storage:{fontSize:12,color:c.muted},overview:{backgroundColor:c.pale,padding:18,borderRadius:16,gap:8},overline:{fontSize:12,lineHeight:20,color:c.green},totals:{fontSize:19,lineHeight:29,color:c.green,fontWeight:'600'},separator:{color:c.muted,fontWeight:'500'},calendar:{borderWidth:1,borderColor:c.line,borderRadius:18,padding:8,gap:8},monthBar:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},monthButton:{width:44,minHeight:44,alignItems:'center',justifyContent:'center'},chevron:{fontSize:27,color:c.ink},month:{fontSize:17,lineHeight:26,fontWeight:'600',color:c.ink},disabled:{color:'#B8BEC1'},week:{flexDirection:'row'},weekday:{width:'14.285714%',textAlign:'center',fontSize:12,lineHeight:24,color:c.muted},grid:{flexDirection:'row',flexWrap:'wrap'},day:{width:'14.285714%',minHeight:48,alignItems:'center',justifyContent:'center',paddingVertical:3},dayNumber:{width:32,height:32,borderRadius:16,alignItems:'center',justifyContent:'center'},dayText:{fontSize:14,lineHeight:22,color:c.ink},picked:{backgroundColor:c.green},pickedText:{color:c.paper,fontWeight:'600'},today:{backgroundColor:c.pale,borderWidth:1,borderColor:c.green},dots:{flexDirection:'row',height:7,alignItems:'center',gap:3,marginTop:3},takenDot:{width:5,height:5,borderRadius:3,backgroundColor:c.green},skippedDot:{width:5,height:5,borderRadius:3,borderWidth:1,borderColor:c.muted},legend:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:12,paddingHorizontal:8,borderTopWidth:1,borderColor:c.line},legendItem:{flexDirection:'row',alignItems:'center',gap:5},legendText:{fontSize:11,color:c.muted},todayButton:{minHeight:44,justifyContent:'center',paddingHorizontal:8,marginLeft:'auto'},detailHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},daySummary:{fontSize:13,lineHeight:21,color:c.muted},record:{borderBottomWidth:1,borderColor:c.line,paddingBottom:18,gap:8},recordTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},time:{fontSize:17,lineHeight:26,fontWeight:'600',color:c.ink},status:{fontSize:12,lineHeight:20,color:c.muted},taken:{color:c.green,fontWeight:'600'},name:{fontSize:15,lineHeight:24,fontWeight:'500',color:c.ink},empty:{padding:18,gap:10,borderRadius:14,backgroundColor:c.pale},error:{fontSize:13,lineHeight:22,color:c.amber},
});

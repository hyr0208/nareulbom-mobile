import { useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/app-text';
import { Button, Heading, Note } from '@/components/ui';
import { colors as c } from '@/constants/theme';
import { doseKey, localDateKey, todayDoses } from '@/data/dose-model';
import type { DoseRecord } from '@/data/medicine-model';
import { useSession } from '@/data/session';

export function TodayDoses() {
  const router = useRouter();
  const { medicines, doseRecords, recordDose, recordConsentAt, ready, busy, storageError } = useSession();
  const [now,setNow] = useState(() => new Date());
  const [error,setError] = useState('');
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = setInterval(refresh,15000);
    const listener = AppState.addEventListener('change',state => { if (state === 'active') refresh(); });
    return () => { clearInterval(timer); listener.remove(); };
  },[]);
  const date = localDateKey(now);
  const rows = todayDoses(medicines,doseRecords,date);
  const scheduled = rows.filter(row => !row.changed);
  const taken = scheduled.filter(row => row.record?.status === 'taken').length;
  const skipped = scheduled.filter(row => row.record?.status === 'skipped').length;
  const excluded = medicines.filter(item => item.regimen?.mode !== 'daily').length;
  async function record(row: typeof rows[number],status: DoseRecord['status'] | null) {
    setError('');
    try { await recordDose(row,status); }
    catch (e) { setError(e instanceof Error ? e.message : '기록하지 못했어요. 다시 시도해 주세요.'); }
    finally { setNow(new Date()); }
  }
  return <View style={st.section}>
    <View style={st.header}><Heading>오늘의 복용</Heading><Text style={st.date}>{now.getMonth()+1}월 {now.getDate()}일</Text></View>
    {!ready ? <Note>복용 정보를 불러오는 중이에요.</Note> : <>
      {rows.length > 0 ? <>
        <Text style={st.summary}>먹었어요 {taken} · 건너뜀 {skipped} · 미기록 {scheduled.length-taken-skipped}</Text>
        {rows.map(row => <View key={doseKey(row)} style={st.row}>
          <View style={st.rowHeader}><Text style={st.time}>{row.time}</Text><Text style={[st.status,row.record?.status === 'taken' && st.taken]}>{row.record ? row.record.status === 'taken' ? '먹었어요' : '건너뜀' : '미기록'}</Text></View>
          <Text style={st.name}>{row.name}</Text><Text style={st.dose}>직접 입력한 1회 복용량 · {row.dose}</Text>
          {row.changed && <Note>변경 전 일정의 기록이에요. 현재 일정과 따로 표시해요.</Note>}
          {row.record ? <View style={st.recorded}><Note>기록 시각 {new Date(row.record.recordedAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false})}</Note><Pressable accessibilityRole="button" accessibilityLabel={`${row.time} ${row.name} 기록 취소`} accessibilityState={{disabled:busy}} disabled={busy} onPress={() => void record(row,null)} style={st.undo}><Text style={st.undoText}>기록 취소</Text></Pressable></View> : <View style={st.buttons}>
            {([['taken','먹었어요'],['skipped','건너뛰기']] as const).map(([status,label]) => <Pressable key={status} accessibilityRole="button" accessibilityLabel={`${row.time} ${row.name} ${label}`} accessibilityState={{disabled:busy || Boolean(storageError)}} disabled={busy || Boolean(storageError)} onPress={() => void record(row,status)} style={({pressed}) => [st.recordButton,status === 'taken' && st.primary,{opacity:busy || storageError ? 0.45 : pressed ? 0.65 : 1}]}><Text style={[st.buttonText,status === 'taken' && st.primaryText]}>{label}</Text></Pressable>)}
          </View>}
        </View>)}
        <Note>표시한 시간은 직접 입력한 일정이에요. 미기록은 복용하지 않았다는 뜻이 아니에요. 알림은 아직 제공하지 않아요.</Note>
      </> : <View style={st.empty}><Text style={st.name}>오늘 표시할 정해진 시간이 없어요</Text><Note>복용함에서 매일 복용하는 제품의 시간을 입력하면 이곳에 모아드려요.</Note><Button secondary label={medicines.length ? '복용 시간 입력하기' : '복용 제품 등록하기'} onPress={() => router.push(medicines.length ? '/medicines' : '/search')} /></View>}
      {excluded > 0 && <Note>필요 시 복용·일정 미입력 제품 {excluded}개는 정해진 시간 목록에 포함하지 않아요.</Note>}
      {rows.length > 0 && <Pressable accessibilityRole="button" onPress={() => router.push('/profile')} style={st.storageLink}><Text style={st.undoText}>{recordConsentAt ? '복용 기록 기기 보관 중 · 보관 설정' : '복용 기록은 이번 실행에서만 유지돼요 · 보관 설정'}</Text></Pressable>}
      {storageError ? <Text accessibilityRole="alert" style={st.error}>{storageError}</Text> : null}
      {error ? <Text accessibilityRole="alert" style={st.error}>{error}</Text> : null}
    </>}
  </View>;
}
const st = StyleSheet.create({
  section:{gap:12},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12},date:{fontSize:13,color:c.muted},summary:{fontSize:13,lineHeight:21,color:c.green},
  row:{padding:18,borderWidth:1,borderColor:c.line,borderRadius:16,gap:9},rowHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12},time:{fontSize:18,lineHeight:26,fontWeight:'600',color:c.ink},status:{fontSize:12,color:c.muted},taken:{color:c.green,fontWeight:'600'},name:{fontSize:15,lineHeight:24,fontWeight:'600',color:c.ink},dose:{fontSize:13,lineHeight:21,color:c.muted},
  buttons:{flexDirection:'row',gap:10,marginTop:3},recordButton:{flex:1,minHeight:44,borderRadius:10,backgroundColor:c.pale,alignItems:'center',justifyContent:'center',padding:10},primary:{backgroundColor:c.green},buttonText:{fontSize:13,fontWeight:'600',color:c.green},primaryText:{color:c.paper},recorded:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8},undo:{minHeight:44,paddingHorizontal:8,justifyContent:'center'},undoText:{fontSize:12,lineHeight:21,color:c.green},empty:{padding:18,gap:10,borderRadius:16,backgroundColor:c.pale},storageLink:{minHeight:44,justifyContent:'center'},error:{fontSize:13,lineHeight:22,color:c.amber},
});

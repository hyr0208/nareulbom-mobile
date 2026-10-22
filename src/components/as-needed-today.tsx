import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/app-text';
import { Body, Button, Heading, Note } from '@/components/ui';
import { AsNeededForm } from '@/components/as-needed-form';
import { colors as c } from '@/constants/theme';
import { asNeededRecordsForDate, doseKey } from '@/data/dose-model';
import type { DoseRecord } from '@/data/medicine-model';
import { useSession } from '@/data/session';
export function AsNeededToday({date}:{date:string}) {
  const router = useRouter();
  const {medicines,doseRecords,recordDose,recordConsentAt,ready,busy,storageError} = useSession();
  const [selectedId,setSelectedId] = useState<string>();
  const [expanded,setExpanded] = useState(false);
  const [error,setError] = useState('');
  const products = medicines.filter(item => item.regimen?.mode === 'asNeeded');
  const records = asNeededRecordsForDate(doseRecords,date);
  if (!products.length && !records.length) return null;
  async function undo(record:DoseRecord) {
    setError('');
    try { await recordDose(record,null); }
    catch (e) { setError(e instanceof Error ? e.message : '취소하지 못했어요. 다시 시도해 주세요.'); }
  }
  return <View style={st.section}>
    <Heading>필요할 때 챙긴 기록</Heading><Note>필요 시 제품은 복용한 뒤 직접 기록해요. 정해진 시간이나 반복 알림은 없어요.</Note>
    {products.slice(0,3).map(medicine => <View key={medicine.id} style={st.product}><Text style={st.name}>{medicine.name}</Text><Note>등록한 1회 복용량 · {medicine.regimen!.dose}</Note><Button secondary label={`${medicine.name} 먹었을 때 기록`} disabled={!ready || busy || Boolean(storageError)} onPress={() => setSelectedId(medicine.id)}/></View>)}
    {products.length > 3 && <Button secondary label={`나머지 필요 시 제품 ${products.length-3}개 · 복용함 보기`} onPress={() => router.push('/medicines')}/>}
    <View style={st.header}><Text accessibilityRole="header" style={st.label}>오늘 남긴 기록</Text><Note>{records.length}건</Note></View>
    {records.length ? (expanded ? records : records.slice(0,3)).map(record => <View key={doseKey(record)} style={st.record}>
      <View style={st.header}><Text style={st.time}>복용한 시각 · {record.time}</Text><Text style={st.badge}>필요 시 · 먹었어요</Text></View><Text style={st.name}>{record.medicineName}</Text><Body>복용량 · {record.dose}</Body>
      <View style={st.header}><Note>기록 시각 {new Date(record.recordedAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false})}</Note><Pressable accessibilityRole="button" accessibilityLabel={`${record.time} ${record.medicineName} 필요 시 기록 취소`} accessibilityState={{disabled:busy || Boolean(storageError)}} disabled={busy || Boolean(storageError)} onPress={() => void undo(record)} style={st.undo}><Text style={st.link}>기록 취소</Text></Pressable></View>
    </View>) : <Note>오늘 남긴 필요 시 복용 기록이 없어요. 복용하지 않았다는 판정은 아니에요.</Note>}
    {records.length > 3 && <Button secondary label={expanded ? '오늘의 필요 시 기록 접기' : `오늘의 필요 시 기록 모두 보기 (${records.length}건)`} onPress={() => setExpanded(!expanded)}/>}
    {records.length > 0 && <><Note>{recordConsentAt ? '기기에 보관 중인 기록이에요.' : '이번 실행에서만 유지되는 임시 기록이에요.'} 오늘 기록의 수정은 취소 후 다시 남겨 주세요.</Note><Button secondary label="필요 시 기록도 달력에서 보기" onPress={() => router.push('/history')}/></>}
    {error ? <Text accessibilityRole="alert" style={st.error}>{error}</Text> : null}
    <AsNeededForm medicine={medicines.find(item => item.id === selectedId)} onClose={() => setSelectedId(undefined)}/>
  </View>;
}
const st = StyleSheet.create({
  section:{gap:12,paddingTop:12,borderTopWidth:1,borderColor:c.line},product:{padding:16,borderRadius:14,backgroundColor:c.pale,gap:8},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'},label:{fontSize:15,lineHeight:24,fontWeight:'600',color:c.ink},name:{fontSize:15,lineHeight:24,fontWeight:'500',color:c.ink},record:{paddingVertical:12,gap:8,borderBottomWidth:1,borderColor:c.line},time:{fontSize:14,lineHeight:23,fontWeight:'600',color:c.ink},badge:{fontSize:12,lineHeight:20,color:c.green},undo:{minHeight:44,paddingHorizontal:8,justifyContent:'center'},link:{fontSize:12,color:c.green},error:{fontSize:13,lineHeight:22,color:c.amber},
});

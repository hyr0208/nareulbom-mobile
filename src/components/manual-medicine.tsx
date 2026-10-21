import { useEffect, useState } from 'react';
import { Modal, Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/app-text';
import { Page, Heading, Body, Note, Button, s } from '@/components/ui';
import { StorageStatus } from '@/components/storage-status';
import { colors } from '@/constants/theme';
import { createManualMedicine, validateManualFields, type Medicine, type ManualFields } from '@/data/medicine-model';
import { useSession } from '@/data/session';
export function ManualMedicineForm({ visible, medicine, initialName = '', onClose }: { visible: boolean; medicine?: Medicine; initialName?: string; onClose: () => void }) {
  const [name,setName]=useState('');const [strength,setStrength]=useState('');const [manufacturer,setManufacturer]=useState('');
  const [category,setCategory]=useState<ManualFields['category']>('medicine');const [error,setError]=useState('');
  const {addMedicine,updateManualMedicine,ready,busy,consentAt}=useSession();const router=useRouter();
  useEffect(()=>{if(visible){setName(medicine?.name||initialName);setStrength(medicine?.strength||'');setManufacturer(medicine?.manufacturer||'');setCategory(medicine?.category||'medicine');setError('');}},[visible,medicine?.id,initialName]);
  async function save(){
    setError('');try{
      const fields=validateManualFields({name,strength,manufacturer,category});
      if(medicine)await updateManualMedicine(medicine.id,fields);else await addMedicine(createManualMedicine(fields));
      onClose();if(!medicine)router.push('/medicines');
    }catch(error){setError(error instanceof Error?error.message:'등록하지 못했어요.');}
  }
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <Page eyebrow="직접 등록 · 정보 미확인" title={medicine?'등록 정보 수정':'검색되지 않는 약 등록'} description="약 포장이나 처방전의 표기를 그대로 입력해 주세요.">
      <Button secondary label="직접 등록 닫기" disabled={busy} onPress={onClose} />
      <View accessibilityRole="radiogroup" style={{flexDirection:'row',gap:10}}>{([['medicine','약'],['supplement','영양제']] as const).map(([value,label])=><Pressable key={value} accessibilityRole="radio" accessibilityState={{checked:category===value}} disabled={busy} onPress={()=>setCategory(value)} style={{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:10,borderWidth:1,borderColor:category===value?colors.green:colors.line,backgroundColor:category===value?colors.pale:colors.paper}}><Text style={{color:colors.ink}}>{label}</Text></Pressable>)}</View>
      <Body>제품명 (필수)</Body><TextInput accessibilityLabel="직접 등록 제품명" value={name} onChangeText={setName} editable={!busy} maxLength={100} placeholder="제품명을 입력하세요" placeholderTextColor={colors.muted} style={s.input} />
      <Body>함량 (선택)</Body><TextInput accessibilityLabel="제품 함량" value={strength} onChangeText={setStrength} editable={!busy} maxLength={60} placeholder="포장에 표시된 함량" placeholderTextColor={colors.muted} style={s.input} />
      <Note>제품의 함량과 1회 복용량은 달라요. 복용량·시간은 등록 후 별도로 입력할 수 있어요.</Note>
      <Body>제조사 (선택)</Body><TextInput accessibilityLabel="직접 등록 제조사" value={manufacturer} onChangeText={setManufacturer} editable={!busy} maxLength={100} placeholder="모르면 비워두세요" placeholderTextColor={colors.muted} style={s.input} />
      <Heading>공식 제품 정보와 연결되지 않아요</Heading><Body>직접 등록한 내용은 정보 미확인으로 표시돼요. 성분·효능·상호작용을 자동으로 판단하지 않아요.</Body>
      <StorageStatus />
      {error?<Body>{error}</Body>:null}
      <Button label={medicine?'직접 등록 정보 저장':consentAt?'확인되지 않은 제품으로 등록':'확인되지 않은 제품으로 임시 등록'} disabled={!ready||busy||!name.trim()} onPress={()=>void save()} />
    </Page>
  </Modal>;
}

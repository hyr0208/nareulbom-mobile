import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/app-text';
import { Body, Button, Card, Heading, Note, Page } from '@/components/ui';
import { useAccount, ACCOUNT_CONSENT_VERSION } from '@/data/account';
import { colors as c } from '@/constants/theme';
export function AccountLogin({onClose}:{onClose?:() => void}) {
  const account = useAccount();
  const [accepted,setAccepted] = useState(false);
  const [details,setDetails] = useState(false);
  const [message,setMessage] = useState('');
  const [apple,setApple] = useState<typeof import('expo-apple-authentication') | null>(null);
  useEffect(() => {if (Platform.OS === 'ios') void import('expo-apple-authentication').then(async module => {if (await module.isAvailableAsync()) setApple(module);}).catch(() => {});},[]);
  useEffect(() => {if (account.user) onClose?.();},[account.user?.id]);
  async function signIn(provider:'kakao'|'apple') {try {await account.signIn(provider);} catch {}}
  return <Page eyebrow="나를봄" title={'나를 챙기는 시작,\n가볍게 함께해요'} description="로그인하거나, 먼저 둘러보세요.">
    {onClose && <Button secondary label="로그인 화면 닫기" disabled={account.busy} onPress={onClose}/>}
    <View style={st.hero}><Image source={require('../../assets/images/app-icon.png')} style={st.icon} accessibilityLabel="나를봄 새잎 로고"/><Heading>매일의 건강을 나의 속도로</Heading><Body>약 검색부터 내 몸의 정보와 복용 기록까지, 로그인 없이도 시작할 수 있어요.</Body></View>
    <Card><Heading>로그인 계정 정보 안내</Heading><Note>계정 식별자와 로그인 세션을 사용해요. 건강정보는 자동으로 업로드하지 않아요.</Note><Pressable accessibilityRole="button" accessibilityState={{expanded:details}} onPress={() => setDetails(value => !value)} style={{minHeight:44,justifyContent:'center'}}><Text style={{color:c.green,fontSize:13}}>{details ? '계정 안내 접기' : '계정 정보 이용 안내 자세히 보기'}</Text></Pressable>{details && <><Note>카카오·Apple의 계정 식별자, 로그인 세션과 안내 확인 시각을 계정 관리·로그인 유지에 사용하고 탈퇴 시 삭제해요. 이름·프로필 사진·실제 이메일은 별도로 보관하지 않아요.</Note><Note>현재 건강정보·복용 기록은 이 기기 전용이에요. 로그인해도 서버에 업로드하지 않으며, 계정 백업·기기 간 동기화는 준비 중이에요. 동기화를 연결할 때 별도로 안내하고 선택을 받을 예정이에요.</Note><Note>안내 버전 {ACCOUNT_CONSENT_VERSION}</Note></>}
      <Pressable accessibilityRole="checkbox" accessibilityState={{checked:accepted,disabled:account.busy}} disabled={account.busy} onPress={() => setAccepted(value => !value)} style={st.consent}><Text style={st.check}>{accepted ? '✓' : '○'}</Text><Text style={st.consentText}>계정 정보 이용 안내를 확인했어요{`\n`}로그인할 때 필요 · 비회원 이용은 선택하지 않아도 돼요</Text></Pressable>
    </Card>
    <Button label={account.availability?.kakao ? '카카오로 시작하기' : '카카오 로그인 준비 중'} disabled={!accepted || account.busy || !account.availability?.kakao} onPress={() => void signIn('kakao')}/>
    {Platform.OS === 'ios' && (account.availability?.apple && apple ? <View pointerEvents={!accepted || account.busy ? 'none' : 'auto'} accessibilityElementsHidden={!accepted || account.busy} style={{opacity:!accepted || account.busy ? 0.45 : 1}}><apple.AppleAuthenticationButton buttonType={apple.AppleAuthenticationButtonType.CONTINUE} buttonStyle={apple.AppleAuthenticationButtonStyle.BLACK} cornerRadius={10} style={{height:48,width:'100%'}} onPress={() => void signIn('apple')}/></View> : <Button secondary label={account.availability?.apple ? 'Apple 로그인은 앱 업데이트 후 이용할 수 있어요' : 'Apple 로그인 준비 중'} disabled onPress={() => {}}/>)}
    {(!account.availability?.ready || account.error) && <><Note>개발자 설정·회원 DB가 연결되면 로그인을 사용할 수 있어요.</Note><Button secondary label="로그인 연결 다시 확인" disabled={account.busy} onPress={() => void account.reload()}/></>}
    {account.error && <Text accessibilityRole="alert" style={st.error}>{account.error}</Text>}{message && <Note>{message}</Note>}
    <Button secondary label={onClose ? '로그인 없이 계속하기' : '로그인 없이 시작하기'} disabled={account.busy} onPress={() => {void account.guest().then(() => {setMessage('로그인 없이 이용 중이에요.');onClose?.();});}}/>
    <Note>회원 탈퇴는 내 정보에서 할 수 있어요. 로그인 없이 작성한 기기 기록은 로그인 계정과 연결되지 않아요.</Note>
  </Page>;
}
const st=StyleSheet.create({hero:{gap:12,paddingVertical:8},icon:{width:72,height:72,borderRadius:18,marginBottom:6},consent:{flexDirection:'row',alignItems:'center',gap:12,minHeight:52},check:{fontSize:22,color:c.green},consentText:{flex:1,fontSize:13,lineHeight:22,color:c.ink},error:{fontSize:13,lineHeight:22,color:c.amber}});

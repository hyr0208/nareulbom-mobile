import { Linking } from 'react-native';
import { Page, Card, Heading, Body, Note, Button } from '@/components/ui';
export default function Guide() {
  return <Page eyebrow="알아봄" title="내 몸을 알아가는 가이드" description="건강정보도, 출처부터 차근차근 확인해요.">
    <Card tone="green"><Note>건강정보 찾아보기</Note><Heading>질환에 대해 궁금한가요?</Heading><Body>질병관리청 국가건강정보포털에서 질환과 생활관리 정보를 살펴볼 수 있어요.</Body><Button label="국가건강정보포털 열기 ↗" onPress={() => void Linking.openURL('https://health.kdca.go.kr/')} /></Card>
    <Card><Heading>영양소에 대해 알아보기</Heading><Body>미국 NIH ODS의 영양소별 자료를 확인할 수 있어요. 영문 자료이며 국내 기준과 다를 수 있어요.</Body><Button secondary label="NIH 영양소 정보 열기 ↗" onPress={() => void Linking.openURL('https://ods.od.nih.gov/factsheets/list-all/')} /></Card>
    <Card tone="peach"><Heading>나에게 맞는 안내는 준비 중이에요</Heading><Body>건강 문진, 질환별 생활 팁, 개인별 영양제 후보 안내는 근거 자료와 검토 기준을 갖춘 뒤 제공할 예정이에요.</Body></Card>
  </Page>;
}

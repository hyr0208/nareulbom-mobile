import { useState } from 'react';
import { DrugDetail } from '@/components/drug-detail';
import type { Drug } from '@/services/api';
import { useRouter } from 'expo-router';
import { Page, Card, Heading, Body, Note, Button } from '@/components/ui';
import { useSession } from '@/data/session';
export default function Medicines() {
  const [selected, setSelected] = useState<Drug | null>(null);
  const router = useRouter(); const { medicines, removeMedicine } = useSession();
  return <><Page eyebrow="챙겨봄" title="나의 복용함" description="먹고 있는 약을 한곳에서 살펴봐요.">
    <Note>현재 목록은 임시로 유지돼요. 앱을 다시 실행하면 초기화될 수 있어요.</Note>
    {medicines.length ? medicines.map(drug => <Card key={drug.id}><Note>{drug.manufacturer}</Note><Heading>{drug.name}</Heading><Body>복용량·일정 미등록</Body><Button secondary label="제품 정보 보기" onPress={() => setSelected(drug)} /><Button secondary label="목록에서 삭제" onPress={() => removeMedicine(drug.id)} /></Card>) : <Card tone="green"><Heading>나를 위한 첫 번째 기록</Heading><Body>검색에서 정확한 제품을 확인한 후 복용함에 추가해 보세요.</Body></Card>}
    <Button label="약 검색해서 추가하기" onPress={() => router.push('/search')} />
    <Card><Heading>조합 확인은 준비 중이에요</Heading><Body>등록된 약의 병용금기·중복 성분 분석은 아직 제공하지 않아요.</Body><Note>목록에 경고가 없다는 이유로 함께 복용해도 된다는 뜻은 아니에요.</Note></Card>
  </Page><DrugDetail drug={selected} onClose={() => setSelected(null)} /></>;
}

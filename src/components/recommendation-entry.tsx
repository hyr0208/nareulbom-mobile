import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Heading, Body, Button } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useSession } from '@/data/session';
import { nutritionCandidates } from '@/data/nutrition-model';

export function RecommendationEntry() {
  const router = useRouter();
  const { health, medicines } = useSession();
  const result = nutritionCandidates(health, medicines);

  return <View style={styles.card}>
    <View style={styles.intro}>
      <View style={styles.copy}>
        <Heading>나에게 맞는 영양제</Heading>
        <Body>{health?.profile.nutrition
          ? `내 답변으로 추린 영양소 ${result.candidates.length}개와 추가 확인 사항을 살펴봐요.`
          : '식습관과 내 몸의 정보로 영양소 검토 후보를 찾아봐요.'}</Body>
      </View>

    </View>
    <Button label={health?.profile.nutrition ? '내 영양소 후보 확인' : '영양제 후보 찾아보기'} onPress={() => router.push('/nutrition')} />
    <Button secondary label="증상으로 일반약 알아보기" onPress={() => router.push('/symptoms')} />
  </View>;
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 18, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  intro: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 4 },
  copy: { flex: 1, gap: 8 },
});

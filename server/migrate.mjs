import { getMigrations } from 'better-auth/db/migration';
import { createAuthRuntime } from './auth.mjs';
const runtime = await createAuthRuntime();
try {
  if (!runtime.configured) throw new Error('DATABASE_URL, AUTH_BASE_URL, 32자 이상의 BETTER_AUTH_SECRET 설정이 필요합니다.');
  const migration = await getMigrations(runtime.options);
  if (process.argv.includes('--plan')) console.log(await migration.compileMigrations());
  else { await migration.runMigrations(); console.log('회원·계정·세션 DB 준비 완료'); }
} catch { console.error('인증 DB 준비 실패: 환경변수·DB 연결과 권한을 확인하세요. 민감정보는 출력하지 않습니다.'); process.exitCode=1; }
finally { await runtime.pool?.end(); }

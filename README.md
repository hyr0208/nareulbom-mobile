# 나를봄 · Nareulbom

> 나를 알아가고, 나에게 맞게 챙기다.

약·영양제 검색과 건강정보 기반 맞춤 관리를 목표로 하는 iOS·Android 앱입니다.
기술 기반은 housing-tracker-mobile과 같은 Expo 57 / React Native 0.86 / TypeScript / Expo Router / Node.js입니다.
디자인과 서비스 코드는 별도로 구성합니다.

## 현재 구현

- 크림색·초록색·살구색 테마와 홈 / 검색 / 복용함 / 가이드 / 내 정보 5개 탭
- e약은요 제품명 검색, 제품 상세, 출처·원문 수정일 표시
- 검색한 제품의 임시 복용 목록 추가·삭제 (앱 실행 중 메모리에서만 유지)
- 질병관리청·NIH ODS 공식 자료 링크
- Node.js 검색 API, 입력 검증, 상류 API 오류·빈 결과 구분
- Docker 실행 설정, 서버 회귀 테스트

건강 문진, 로그인, 영구 저장, 알림, 영양제·성분 검색, DUR 분석, AI 추천은 아직 구현하지 않았습니다.
실제 개인 건강정보를 입력하거나 보관하는 출시용 서비스가 아닙니다.

## 실행

Node.js 22.13 이상이 필요합니다.

```bash
npm install
cp .env.example .env
npm run server
```

별도 터미널:

```bash
npm start
# 브라우저 미리보기
npm run web
# 네이티브 빌드 (Xcode 또는 Android 개발 환경 필요)
npm run ios
npm run android
```

검색하려면 공공데이터포털에서 e약은요 활용 신청 후 `.env`의 `MFDS_SERVICE_KEY`에 **Decoding 인증키**를 설정하고 서버를 다시 실행합니다.
키가 없을 때는 검색을 준비 중이라는 안내를 표시합니다. 가짜 의약품 결과를 반환하지 않습니다.

`EXPO_PUBLIC_API_URL`은 모바일 앱에서 접근할 서버 주소입니다. iOS 시뮬레이터·웹은 localhost,
Android 에뮬레이터는 10.0.2.2, 실기기는 개발 컴퓨터의 LAN IP를 사용하세요.
환경변수 변경 후 Expo를 다시 시작하세요. 웹 포트 변경 시 CORS_ORIGIN도 맞춰 주세요.

## 검증

```bash
npm run typecheck
npm run test:server
npm run export:web
```

## 서버

- `GET /health`: 상태와 검색 API 키 설정 여부
- `GET /api/drugs?q=제품명`: e약은요 검색, 첫 20개 결과
- Docker: `docker compose up --build -d`

개발용 API입니다. 외부 운영 배포 전 인증, 요청 제한, HTTPS 및 운영 관측 체계가 필요합니다.
API 키와 사용자 건강정보를 클라이언트 번들·로그에 포함하지 않습니다.

## 다음 개발 단계

1. 실제 API 키로 검색 응답 확인, 페이지네이션 및 접근성·기기 QA
2. 건강정보 처리 동의, 카카오·Apple 로그인, PostgreSQL 및 계정별 접근 제어
3. 건강 프로필·복용량·기록 저장, 복용 알림
4. 건강기능식품·DUR 수집과 성분 매핑
5. 전문가 검토를 거친 판단 규칙·질환 콘텐츠와 AI 설명

세부 설계와 데이터 출처는 `docs/product-plan.md`를 참고하세요.

## 초기 검증 결과 (2026-10-21)

- TypeScript 타입 검사 통과
- 서버 테스트 4개 통과 (키 누락, 외부 오류·잘못된 응답, 필드 매핑, HTTP 입력 검증)
- Expo 웹 정적 빌드 통과 및 Expo 의존성 호환 검사 통과
- 390px 모바일 크기에서 홈→검색 이동 및 API 키 미설정 안내 확인
- 실제 공공데이터 응답과 iOS·Android 네이티브 빌드는 미검증
- npm audit: 28건 (high 18, moderate 10). Expo/React Native 의존성 체인에 대한 경고 포함.
  자동 제안에 Expo 44 등 호환되지 않는 주요 버전 변경이 포함되어 강제 수정하지 않았다.
  외부 배포 전 취약 패키지별 영향과 SDK 호환 패치를 검토해야 한다.

## 글꼴

Pretendard 1.3.9의 Regular·Medium·SemiBold·Bold를 앱에 포함하고 expo-font로 불러옵니다.
본문·제목·입력창·탭 라벨에 적용하며 외부 폰트 CDN을 사용하지 않습니다.
출처: https://github.com/orioncactus/pretendard
라이선스: SIL Open Font License 1.1 (`assets/fonts/LICENSE.txt`).

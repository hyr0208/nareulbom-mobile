# 카카오·Apple 계정 로그인

## 구현 범위

Expo 앱과 기존 Node HTTP 서버에 Better Auth 1.7.14 + 공식 Expo 플러그인을 연결한다. 비회원 이용을 유지한다. 계정 생성·인증 세션·갱신·로그아웃·회원 탈퇴를 제공하며 PostgreSQL을 사용한다. 인증 정보는 건강정보 SecureStore 저장본과 별도 관리한다.

**건강 프로필·약 목록·복용 기록의 서버 백업과 동기화는 아직 제공하지 않는다.** 로그인·로그아웃에 관계없이 이 기기 전용 데이터이며 자동 업로드하지 않는다. 이후 서버 보관 동의·계정별 데이터 격리·이관 확인·충돌 처리를 추가한 뒤 연결해야 한다. 기기 정보 전체 삭제는 회원 탈퇴와 별도다. 회원 탈퇴 메뉴는 소셜 연결 해제 및 서버 계정 삭제 후 이 기기의 전체 정보·알림 삭제를 시도한다. 로컬 삭제 실패 시 별도 재시도를 안내한다.

## 로컬 준비

1. `npm install`과 `npm install --prefix server`를 실행한다.
2. `.env.example`의 인증 항목을 `.env`에 추가한다. 기존 공공데이터 키를 지우지 않는다.
3. `openssl rand -base64 48`로 `BETTER_AUTH_SECRET`을 만들어 서버에만 설정한다. 값은 로그·채팅·커밋에 남기지 않는다. 토큰 암호화에도 사용하므로 임의로 변경하면 기존 세션·소셜 토큰을 복호화하지 못할 수 있다.
4. 로컬 개발에서는 `npm run auth:db`로 프로젝트 내부 PostgreSQL을 시작할 수 있다. 최초 실행 시 `server/data/` 아래에 무작위 관리자/앱 비밀번호와 DB 파일을 만들고, **비어 있는 `DATABASE_URL`만** 채운다. localhost `55432`에만 수신하고 scram-sha-256 인증을 사용하며 앱 접속 계정은 비슈퍼유저다. `server/data/`와 `.env`는 Git에서 제외한다. 이 세션은 Ctrl+C로 종료한다. 다시 시작할 때도 같은 명령을 실행한다. 시스템 계정·서비스는 설치하지 않는다. 이미 다른 DB 주소가 있으면 덮어쓰지 않는다. 운영에서는 이 개발용 도구를 사용하지 않는다.

   외부 DB를 사용할 때는 PostgreSQL DB와 최소 권한 계정을 준비하여 `DATABASE_URL`에 연결한다. Docker가 있다면 `.env`에 강한 `POSTGRES_PASSWORD`를 정하고 `docker compose --profile auth-db up -d db`로 개발 DB만 실행할 수 있다. 연결 예: `postgresql://nareulbom:<URL 인코딩한 비밀번호>@localhost:5432/nareulbom`. API도 Docker로 실행하면 호스트 이름은 `db`다. 이 저장소에는 비밀번호 기본값이 없다.
5. `AUTH_BASE_URL=http://localhost:8788`, `CORS_ORIGIN=http://localhost:8081`을 설정한다. `AUTH_BASE_URL`은 서버의 고정된 외부 주소이며 요청 헤더에서 추론하지 않는다.
6. `npm run auth:plan`으로 변경 계획을 보고 `npm run auth:migrate`로 회원·계정·세션·인증 상태 테이블을 만든다. 서버 시작 때 자동 마이그레이션하지 않는다. 운영 적용 전 DB 백업과 변경 계획 확인이 필요하다.
7. `npm run server`로 재시작한다. `GET /api/auth-config`는 연결 준비 여부만 반환한다. DB·키 미설정/DB 스키마 미준비 시 로그인은 비활성화되며 약 검색과 비회원 기능은 이용할 수 있다.

운영에서는 HTTPS, DB TLS 인증서 검증, 비공개 DB 접근, 백업/접근 정책을 설정한다. 여러 API 인스턴스를 운영하면 현재 메모리 요청 제한을 공유 저장소 기반으로 전환해야 한다.

## 카카오: 나를봄 전용 앱

다른 서비스의 앱·키는 재사용하지 않는다.

1. Kakao Developers에서 새 앱 `나를봄`을 만든다.
2. 제품 설정 → 카카오 로그인 → 일반 → 사용 설정을 ON으로 한다. OpenID Connect는 이번 OAuth 코드 방식에 필수가 아니다.
3. **앱 → 플랫폼 키 → REST API 키**를 연다.
4. **카카오 로그인 리다이렉트 URI**에 `http://localhost:8788/api/auth/callback/kakao`를 입력하고 `+` 및 저장을 누른다. 비즈니스 인증 리다이렉트 URI와 구분한다.
5. 같은 REST API 키의 값을 `.env`의 `KAKAO_CLIENT_ID`에, Client Secret을 `KAKAO_CLIENT_SECRET`에 넣는다. 이 값들은 `EXPO_PUBLIC_`에 두지 않는다.
6. 계정 ID만 사용한다. 코드에서 기본 이메일·닉네임·프로필 사진 scope를 요청하지 않는다. 앱 설정에서 기존 필수 동의항목을 켜 두면 카카오 화면에 나타날 수 있으므로 불필요한 정보 수집 설정도 확인한다.
7. 실제 기기나 운영에서 사용할 때는 `AUTH_BASE_URL`과 Kakao Redirect URI를 같은 외부 접근 가능한 HTTPS 주소로 함께 바꾼다. 시뮬레이터의 localhost 설정을 실제 휴대폰에 그대로 쓰면 안 된다.

카카오에서 사용자가 직접 연결을 끊는 경우를 운영에서 반영하려면 검증된 연결 해제/계정 상태 웹훅도 연결해야 한다. 현재는 앱 내 탈퇴 시 unlink API를 호출하며 웹훅 수신은 아직 구현하지 않는다. NAS 운영 배포 준비 파일은 `deploy/nas/`를 참고한다.

## Apple: 개발자 설정 확인

1. Apple Developer 유료 멤버십과 Certificates, Identifiers & Profiles 접근 권한이 있는지 확인한다.
2. App ID `kr.co.uulab.nareulbom`에 **Sign in with Apple** 기능을 활성화한다.
3. 웹 OAuth용 **Service ID**를 만들고 위 App ID와 연결한다. 이 Service ID가 `APPLE_CLIENT_ID`다.
4. 실제 HTTPS 도메인과 Return URL `https://<인증 서버 도메인>/api/auth/callback/apple`을 등록한다. Apple 브라우저 OAuth의 Return URL에는 localhost를 쓸 수 없다.
5. Sign in with Apple용 `.p8` 키를 만들고 `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY_PATH`를 서버에 설정한다. 파일은 서버에만 두고 커밋하지 않는다. Docker 배포 시 읽기 전용 secret 파일로 마운트하고 컨테이너 내부 경로를 사용한다.
6. 클라이언트 시크릿 JWT는 서버에서 1일 유효기간으로 생성한다. 인증 코드·state·nonce 검증은 라이브러리의 OAuth 흐름을 사용하고 앱이 임의의 ID token을 보내는 흐름은 허용하지 않는다.
7. iOS는 공식 Apple 버튼을 사용하며 시스템 인증 브라우저로 돌아오는 OAuth 흐름이다. 새 모듈·Sign in with Apple entitlement 적용 후 네이티브 앱을 다시 빌드한다. 설정 전에는 준비 중으로 표시한다.

## 보안·세션·탈퇴

- 이메일 비밀번호 로그인과 계정 연결은 비활성화한다. 이메일이 같다는 이유로 자동으로 합치지 않는다.
- 제공자와 subject를 기반으로 회원을 구분한다. 이메일 필드는 내부 식별용 해시 주소이며 실제 사용자 이메일·이름·사진은 저장하지 않는다.
- 계정 이용 안내 버전/확인 시각을 회원 생성 때 보관한다. 건강정보 이용·보관 동의와는 별개다. 앱의 선택 동의 없이도 비회원 기능을 사용할 수 있다.
- 제공자 access/refresh token은 인증 라이브러리로 암호화하여 DB에 보관한다. 세션은 서버 DB에서 검증하며 7일 유효, 하루 단위 갱신이다. 앱에서는 세션 cookie만 별도 SecureStore 영역에 보관하고 사용자 세션 캐시는 끈다. 웹은 HttpOnly cookie를 사용한다.
- 허용한 인증 경로만 Node 서버에서 노출한다. 제공자 토큰 조회·임의 계정 수정·링크 API는 앱 HTTP 경로로 공개하지 않는다. HTTPS 및 설정한 웹 Origin·앱 scheme만 신뢰한다.
- 탈퇴는 최근 10분 내 로그인 세션을 요구한다. 오래됐으면 로그아웃 후 다시 로그인한다. 제공자 unlink/revoke 성공 후 회원과 세션을 삭제한다. 연결 해제 실패 시 회원을 유지하고 재시도를 안내한다.
- 로그아웃은 현재 기기의 세션을 무효화한다. 이 기기 전용 기록·알림은 유지하며 화면에 안내한다. 인증 라이브러리의 요청·응답 로깅은 끄고 토큰/콜백 URL을 로그에 출력하지 않는다.
- 계정 백업·다중 기기 동기화, 계정 간 명시적 연결, 제공자 계정 상태 웹훅, 운영 개인정보 처리방침 확정은 후속 작업이다. 현재 개발용 계정 안내는 출시 전 실제 운영 정책과 맞춰야 한다.

## 검증 한계

테스트의 OAuth 제공자는 fixture이며 실제 카카오/Apple 계정 인증을 대신하지 않는다. 로컬 PostgreSQL 연결·마이그레이션·실제 키를 사용한 로그인 시작 요청과 state 저장을 확인했다. 제공자 승인·리다이렉트 완료·실제 계정의 기기 재실행·탈퇴 검증은 사용자의 실제 로그인 후 진행해야 한다. 키가 없는데 로그인 성공으로 표시하는 우회 기능은 없다.

공식 참고: [Better Auth Expo](https://better-auth.com/docs/integrations/expo), [카카오 설정](https://developers.kakao.com/docs/ko/kakaologin/prerequisite), [Apple 설정](https://better-auth.com/docs/authentication/apple).

### iOS 시뮬레이터 개발 빌드

`Sign in with Apple`와 알림 entitlement 추가 후 Expo CLI가 개발자 인증서를 요구할 수 있다. Apple 개발자 설정 전 시뮬레이터에서만 테스트하려면 `xcodebuild`의 `CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual CODE_SIGNING_ALLOWED=YES CODE_SIGN_ENTITLEMENTS= DEVELOPMENT_TEAM=` 옵션으로 로컬 서명한다. 원본 `app.json`의 배포용 entitlement는 유지한다. 실제 기기의 Apple 로그인에는 개발자 계정·서명과 서비스 설정이 필요하다. `CODE_SIGNING_ALLOWED=NO` 빌드는 Keychain 사용에 실패할 수 있어 사용하지 않는다.

# UGREEN NAS 배포 준비

Docker 앱을 지원하는 모델을 기준으로 준비한 설정이다. **NAS에는 아직 접속·배포하지 않았다.** 모델명, Docker 앱 설치 여부, HTTPS 도메인과 기존 프록시 방식 확인 후 실제 경로·네트워크를 맞춰야 한다.

- PostgreSQL은 내부 Docker 네트워크에만 있고 DB 포트는 NAS 호스트나 인터넷에 열지 않는다.
- API는 기본적으로 NAS의 localhost:8788에서만 접근한다. 외부 앱은 HTTPS 프록시를 통해 연결한다.
- DB 슈퍼유저와 앱 계정 비밀번호를 분리한다. 앱 계정은 회원 DB 안에서만 테이블을 생성·조회·변경한다.
- DB에는 계정·세션 정보만 저장한다. 건강정보와 복용 기록 동기화는 아직 없다.

## 준비 및 실행

1. 저장소 전체를 NAS의 전용 프로젝트 폴더에 놓는다. Compose가 상위 저장소의 Dockerfile과 server 소스를 사용한다.
2. 이 폴더 `.env.example`을 `.env`로 복사하고 직접 채운다. DB 비밀번호는 URL 안전한 hex 값으로 각각 생성한다. 실제 키·인증서 파일은 저장소에 넣지 않는다.
3. `AUTH_DOMAIN`에 실제 인증 서버 도메인을 정한다. DNS·HTTPS 프록시·NAS 외부 접근은 별도 설정이다. 기존 NAS 프록시가 있으면 `https://도메인 → NAS localhost:8788`로 연결한다. 별도 프록시 컨테이너를 쓰면 API의 frontend 네트워크 연결을 맞춘다. Caddy를 새로 쓸 때만 `https` 프로필을 사용하고, 기존 80/443 포트와 충돌하지 않는지 확인한다.
4. 이 폴더에서 `docker compose up -d db`로 DB를 시작한다.
5. `docker compose build api`로 서버를 빌드한다.
6. `docker compose run --rm api node server/migrate.mjs --plan`으로 계획을 검토하고 `docker compose run --rm api node server/migrate.mjs`로 회원 테이블을 만든다.
7. `docker compose up -d api`로 시작한다. Caddy 사용 시 `docker compose --profile https up -d`를 사용한다.
8. 카카오 Developers → 앱 → 플랫폼 키 → REST API 키 → **카카오 로그인 리다이렉트 URI**에 `https://실제도메인/api/auth/callback/kakao`를 추가한다. 기존 localhost 주소는 개발용으로 남길 수 있다.
9. 모바일 앱의 `.env`에서 `EXPO_PUBLIC_API_URL=https://실제도메인`으로 바꾸고 앱을 다시 번들/빌드한다. 여기에 카카오 시크릿이나 DB 주소를 넣으면 안 된다.
10. `/health`, `/api/auth-config`, 비회원 검색, 실제 카카오 로그인·재실행·로그아웃·탈퇴를 순서대로 검증한다.

초기 역할 생성 스크립트는 빈 DB 볼륨에서만 실행된다. 이미 만들어진 DB의 비밀번호를 바꿀 때 `.env`만 고치거나 볼륨을 지우지 말고 DB 역할의 비밀번호도 함께 변경해야 한다. 계정 데이터가 생긴 볼륨은 백업·복구 절차를 확인한 뒤 관리한다.

Apple 로그인은 유료 개발자 계정·서비스 ID·HTTPS Return URL·서버 키가 준비된 뒤 추가한다. `.p8` 파일은 API 컨테이너에 읽기 전용 secret 볼륨으로 연결한다.

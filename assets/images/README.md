# 나를봄 앱 아이콘

- `app-icon.png`: 1024×1024 불투명 PNG. iOS·Android 공통 기본 앱 아이콘.
- `favicon.png`: 64×64 웹 파비콘.

`app.json`에서 연결한다. 아이콘 변경은 JavaScript 새로고침에 반영되지 않으며 네이티브 앱을 다시 빌드해야 한다. 기존 `ios`·`android` 폴더가 있다면 Expo prebuild로 설정을 동기화한 후 빌드한다. 원본은 모서리를 자르지 않고 운영체제가 형태를 적용한다.

제작: 내장 image_gen 도구. 앱 이름이나 의료 효능을 표현하는 문구 없이 새잎과 감싸는 곡선을 사용했다.

## 생성 프롬프트

Use case: logo-brand. Create a production mobile app icon for Korean personal health and medicine tracking app Nareulbom (name means caring for myself / spring). One single bold, beautifully simple white abstract sprout emblem: two soft asymmetrical leaves rising from a short stem, with a gentle rounded open cup-shaped curve underneath suggesting self-care and embrace. Tasteful modern Korean app branding, exceptionally clean geometric silhouette, optically balanced and distinctive at 32px. Solid deep forest green #176B53 full-bleed square background, pure white symbol only. Symbol centered inside the middle 60% width and height with generous breathing room for Android adaptive cropping. Flat vector-like graphic, crisp smooth edges. No letters, no text, no medical cross, no pills, no human character, no gradients, no shadows, no texture, no border, no device mockup, no rounded-square container or rounded image corners: background must fill the entire square canvas. Output a single square 1024x1024 app icon.


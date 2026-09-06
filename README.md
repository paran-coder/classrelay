# ClassRelay v2.1.1

로컬 퍼스트 방식의 온라인 강의 녹화본 발송 관리자 웹도구입니다.

## UI v2.1.1

첨부된 Frontend Forge 검토 기준과 Mobbin 계열 디자인 토큰을 적용했습니다. 흰 캔버스, #141414 잉크, 중성 surface ladder, 16/24px radius, pill 인터랙션, 무그림자 카드를 기본으로 하며 운영 상태 배지에만 제한적으로 semantic color를 사용합니다.

## 핵심 원칙

- 로그인/회원가입 없음
- 중앙 DB 없음
- 사용자가 자신의 Google OAuth Client ID를 직접 사용(BYO OAuth)
- Google Form 응답, 은행 CSV, 매칭 결과, 발송 로그는 브라우저 IndexedDB에 저장
- Google Access Token은 메모리에만 유지하고 영구 저장하지 않음
- 은행 CSV는 브라우저에서만 파싱
- 입금 매칭이 애매하면 자동 발송하지 않음

## 기능

- Google Form URL 연결
- 폼 질문 자동 인식 + 수동 매핑
- 기존 응답 동기화
- 은행 CSV 업로드/열 매핑
- 입금자명 + 금액 정확 일치 자동 매칭
- 애매한 거래 확인필요 처리
- 수동 입금확인
- Gmail 개별발송 / 명시적 재발송
- 발송 로그
- 강의/YouTube URL 관리
- 로컬 데이터 JSON 백업/복원
- 상세 `/guide` 사용자 가이드

## 실행

빌드 단계가 없는 정적 웹앱입니다.

로컬 확인 예시:

```bash
python3 -m http.server 5173
```

그 후 `http://localhost:5173`에서 확인합니다.

Google OAuth 테스트 시 Google Cloud OAuth Web Client의 Authorized JavaScript origins에 다음을 추가해야 합니다.

```text
http://localhost:5173
```

실제 배포 후에는 Vercel production origin도 추가합니다.

```text
https://YOUR-PROJECT.vercel.app
```

## Vercel

`vercel.json`이 SPA 라우팅과 정적 캐시 정책을 정의합니다. GitHub 저장소를 Vercel에 연결하면 별도 서버 없이 배포할 수 있습니다.

## 중요한 제한

브라우저를 닫은 동안 Google Form을 백그라운드에서 실시간 수집하지 않습니다. 앱을 열거나 `지금 동기화`를 실행할 때 Google Form API를 읽습니다.

Access Token은 만료될 수 있으며, Google API 작업 시 사용자가 다시 권한 버튼을 눌러 새 토큰을 받을 수 있습니다.

## 문서

- `User manual.md`: 운영자용 사용 설명서
- `/guide`: 배포된 웹 가이드
- `context-notes.md`: 제품/아키텍처 결정 기록
- `checklist.md`: 구현 및 검증 상태

## v2.1.1 UI system

`DESIGN-SYSTEM.md` defines the ClassRelay-specific typography, density, spacing, state-color, responsive, and accessibility rules. External design tokens are treated as references for restraint and geometry rather than as a fixed specification.

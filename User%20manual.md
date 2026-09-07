# ClassRelay v2.8.5 — User Manual

## 이번 버전에서 달라진 점

Google 연결 과정에서 자주 막히는 두 부분을 보완합니다.

### Google Form URL
- ClassRelay에는 Google Form의 **편집 화면 긴 URL**을 입력합니다.
- 일반 편집 URL `https://docs.google.com/forms/d/FORM_ID/edit`와 계정 경로가 포함된 `https://docs.google.com/forms/u/0/d/FORM_ID/edit` 형태를 지원합니다.
- `https://forms.gle/...` 축약 링크와 `/viewform` 응답자용 링크는 연결용으로 사용하지 않습니다.
- 비지원 링크를 넣으면 긴 편집 URL을 복사하라는 안내를 표시합니다.

### OAuth Test user
Google Auth Platform의 Audience가 `External + Testing`이라면 **실제로 ClassRelay에서 사용할 Google 계정을 Test users에 반드시 추가**해야 합니다. 누락하면 Google 권한 화면에서 `403 access_denied`가 발생할 수 있습니다.

## 기본 운영 흐름
1. Google OAuth Client ID 설정
2. 새 강의 추가
3. 새 강의의 Google Form 편집 URL 연결
4. Form 응답 동기화
5. 은행 CSV 가져오기 및 입금 매칭
6. 강의별 발송 가능 신청자 선택
7. Gmail 발송 및 발송 당시 내용 보존
8. 강의 히스토리에서 CS 확인/재발송

## 데이터 보존
Form 재동기화와 CSV 추가 업로드는 기존 입금·발송·CS 히스토리를 초기화하지 않습니다. 운영 데이터는 사용자의 브라우저 IndexedDB에 누적 저장하며 JSON 백업/복원을 제공합니다.

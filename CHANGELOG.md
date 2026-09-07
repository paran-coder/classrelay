# CHANGELOG

## v2.9.1
- `/guide` 문서 타이포그래피 위계를 재조정했습니다.
- 핵심 본문/행동 설명은 16px, 보조 설명은 15px, 메타/라벨은 12~13px 기준으로 정리했습니다.
- 핵심 지시문은 muted 대신 ink 계열을 사용해 가독성을 높였습니다.
- 완료 기준/주의/팁/클릭 경로/용어 설명/실습 카드의 글자 크기와 내부 여백을 함께 조정했습니다.
- 모바일에서도 핵심 본문이 15px 아래로 내려가지 않도록 가이드 전용 타입 가드를 추가했습니다.
- 앱 운영 기능과 IndexedDB 스키마는 변경하지 않았습니다.


## v2.9.0

- `/guide`를 완전 초보자용 클릭 따라하기 튜토리얼로 전면 재작성
- Google Cloud 용어 설명과 3단계 운영 구조(처음 설정 / 강의별 연결 / 반복 운영) 추가
- Google Cloud 프로젝트 생성, Forms API/Gmail API 활성화 클릭 경로 상세화
- Google Auth Platform의 Branding, Audience, Data Access, Clients 설정을 실제 메뉴 순서로 상세화
- Test user 등록 및 403 access_denied 해결 안내 강화
- Forms body readonly, responses readonly, Gmail send scope 3개 등록 과정 추가
- Authorized JavaScript origins, Web application Client ID 생성 과정을 초보자 기준으로 풀어씀
- 강의 추가, 추천 Form 질문, 긴 편집 URL 복사, 질문 매핑 설명 상세화
- CSV 열 매핑과 자동매칭 상태 설명 상세화
- Course-first Gmail 발송, CS, 백업 단계 상세화
- 테스트 강의 → Form → 테스트 CSV → 본인 Gmail 발송 전체 실습 챕터 추가
- 기능/IndexedDB/Form/Gmail 발송 로직 변경 없음

## v2.8.5

- Google Form 편집 URL 파서가 `/forms/u/N/d/.../edit` 계정 경로를 지원하도록 보강
- `forms.gle` 축약 링크 입력 시 긴 편집 URL 필요 안내 추가
- `/viewform` 및 `/forms/d/e/...` 응답자 링크 입력 시 편집 URL 필요 안내 추가
- Form 연결 모달에 지원 URL 예시와 비지원 링크 안내 추가
- 설정 → Google OAuth에 `External + Testing` 상태의 Test user 등록 필수 경고 추가
- `/guide`의 Test user 단계와 `403 access_denied` 문제 해결 안내 강화
- 기존 Form/입금/Gmail/CS/DB 운영 로직은 변경하지 않음

## v2.8.4

- 서비스 OG 이미지 `classrelay-og-1200x630.png` 추가
- 메인 페이지에 canonical / Open Graph / Twitter Card 메타 태그 추가
- OG 이미지 URL을 `https://classrelay.vercel.app/classrelay-og-1200x630.png`로 연결
- 앱/문서/백업 appVersion을 v2.8.4로 갱신
- 기능 및 데이터 모델 변경 없음

## v2.8.3

- Dashboard, 입금 관리, 강의 히스토리의 KPI/Metric Card 시각 규칙 통일
- KPI 숫자를 항상 ink-black으로 고정해 데이터와 인터랙션 색 역할 분리
- `보기 →` drill-down 라벨만 `#2563EB`로 유지
- in-place filter에서 실제 선택된 카드만 `#EFF4FF` + blue border 사용
- Dashboard 이동형 KPI는 selected 상태를 사용하지 않음
- Metric Card hover/focus/active 규칙을 공통 CSS로 중앙화
- 기능/DB/Form/Gmail 로직 변경 없음

## v2.8.2

- `#2563EB` interaction accent 실제 적용
- focus ring, selected row, active filter, template/course selection, inline drill-down link에 blue 적용
- Primary Action은 `#141414` 검정 유지
- success/warning/error semantic colors 유지
- 기능 및 데이터 모델 변경 없음

## v2.8.1

### Fixed
- `강의 추가` 모달의 `가격`과 `상태` 입력 컨트롤 상단 기준선이 도움말 높이 때문에 어긋나던 문제 수정
- 모달 전용 `.course-form-grid`에서 field를 상단 정렬해 도움말 길이가 달라도 정렬 유지

### Changed
- `/guide`를 v2.8.x 실제 동작 기준으로 전수 검수·갱신
- `폼 추가 / 전체 폼 동기화 / 이 강의 폼 동기화`의 역할과 사용 시점을 표로 명시
- 강의 중심 Form 연결, 비파괴 재동기화, Course-first Sending, 전체 폭 발송로그 설명 보강
- YouTube 일부공개/비공개 설명을 현재 공식 안내와 맞게 정리
- README/User Manual을 현재 UI·운영 흐름과 일치하도록 갱신

### Design review
- Mobbin 참고 토큰의 `#0066FF`와 ClassRelay 후보 `#2563EB` 비교를 DESIGN-SYSTEM.md에 추가
- 추천은 `#2563EB`를 interaction accent로 사용하고 `#141414`를 primary action으로 유지하는 방식
- 포인트 컬러는 v2.8.1 실제 UI에는 적용하지 않음
# CHANGELOG

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
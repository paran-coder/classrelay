# CHANGELOG

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

# ClassRelay v2.7.0 — Context Notes

## 목표
- v2.6.2의 안정된 local-first 구조와 settings 기반 메일 템플릿 구조를 유지한다.
- **강의가 중심 엔티티**이고 Google Form은 해당 강의의 신청 수집 채널로 연결한다.
- 대시보드에서 `폼 추가`와 `전체 폼 동기화`를 바로 사용할 수 있게 한다.
- 강의 히스토리에서는 `이 강의 폼 동기화`로 범위를 명확히 구분한다.
- 새 강의 생성 직후 Google Form 연결을 이어갈 수 있게 한다.
- 템플릿 `사용 강의`를 관리자 화면에 맞는 리스트형 선택 UI로 개선한다.
- 최근 발송 내역은 전체 폭 테이블로 재구성한다.
- `/guide`를 실제 v2.7.0 동작과 공식 Google/YouTube 설명에 맞게 재검수한다.

## 비목표
- Google Drive API로 사용자의 모든 Form 목록을 조회하지 않는다.
- 기존 Google Form을 계정에서 자동 검색/선택하는 기능을 만들지 않는다.
- 중앙 DB/로그인/공용 OAuth를 추가하지 않는다.
- 기존 신청/입금/발송/CS 히스토리를 초기화하지 않는다.

## 데이터 원칙
- Form connection은 `courseId`에 귀속된다.
- 새 강의에는 새 Form을 연결한다.
- 과거 연결 이력이 있는 Form을 새 강의에 재사용하지 않는다.
- Form response 저장 ID는 `formId + responseId`이며 같은 response는 merge, 다른 response는 별도 신청 건이다.
- 전체 폼 동기화는 사용 중 강의의 활성 Form 연결만 병합하고, 강의별 동기화는 현재 Form 하나만 병합한다.

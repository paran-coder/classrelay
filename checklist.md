# ClassRelay v2.6.1 Checklist

## 사전 준비
- [x] v2.5.1 안정 기준 복사
- [x] context-notes.md / checklist.md / README.md / User manual.md 선행 생성

## 1. 템플릿 저장/선택
- [x] `emailTemplates` settings 배열
- [x] 기존 `emailTemplate` 비파괴 마이그레이션
- [x] 저장 템플릿 선택 UI
- [x] 고버전 orphan `templates` store 복구 경로

## 2. 기본 템플릿
- [x] `defaultEmailTemplateId`
- [x] 기본 지정 UI
- [x] 기본 fallback 단위 테스트

## 3. 강의별 연결
- [x] `course.emailTemplateId`
- [x] 템플릿 편집에서 강의 연결
- [x] 미연결 강의 기본 fallback
- [x] 강의 관리/히스토리에 현재 템플릿 표시

## 4. 복제/삭제/미리보기
- [x] 추가
- [x] 복제
- [x] 삭제
- [x] 기본 템플릿 삭제 방지
- [x] 삭제 시 강의 fallback
- [x] 변수 미리보기

## 5. 발송 snapshot
- [x] `{{신청번호}}` / `{{금액}}`
- [x] 성공 발송 snapshot 저장
- [x] 메일 로그에서 조회
- [x] 신청자/강의 CS 로그에서 조회

## 복구/호환성
- [x] IndexedDB 명시 버전 제거
- [x] v2.6.0 orphan store recovery
- [x] v2.6.0 backup template migration
- [x] 초기화 실패 recovery UI

## 최종 QA
- [x] 전체 unit/static tests 통과
- [x] `npm run check` 통과
- [x] 이전 버전 핵심 표기 검사
- [x] 정적 내부 링크/자산 검사
- [ ] 실제 Vercel 브라우저 smoke test
- [ ] 실제 Gmail 1건 + snapshot 확인

# ClassRelay v2.6.1 Context Notes

## 기준점
- v2.5.1을 안정 기준으로 사용한다.
- v2.6.0의 IndexedDB schema v2 / templates store 변경은 사용하지 않는다.
- DB_VERSION은 1을 유지한다.

## 이번 버전 목표
1. 다중 메일 템플릿 저장/선택
2. 기본 템플릿 지정
3. 강의별 템플릿 연결 및 기본 fallback
4. 템플릿 복제/삭제/미리보기
5. 성공 발송 시 실제 제목/본문/녹화본 URL snapshot을 로그에 보존

## 데이터 전략
- templates는 IndexedDB의 새 store가 아니라 기존 settings store의 `emailTemplates` 배열로 저장한다.
- 기본 템플릿 ID는 `defaultEmailTemplateId` setting으로 저장한다.
- Course의 `emailTemplateId` 필드는 기존 courses store record에 추가한다.
- 기존 `emailTemplate` setting은 최초 migration source로만 사용하고 삭제하지 않는다.

## 안전 원칙
- v2.5.1 기존 신청/입금/발송/CS 기록을 변경하지 않는다.
- 템플릿 삭제 시 기본 템플릿은 삭제할 수 없다.
- 삭제된 템플릿을 연결한 강의는 기본 템플릿 fallback을 사용한다.
- 발송 성공 로그에 snapshot을 저장한다.
- 각 단계 후 앱 초기 렌더/메일 화면/새로고침/기존 데이터 유지 테스트를 수행한다.

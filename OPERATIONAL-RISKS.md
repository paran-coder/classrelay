# ClassRelay v2.7.0 — Operational Risk Status

## Resolved baseline risks
- 자동 입금매칭 기간 상·하한 적용
- CSV 날짜 정규화 / 은행 참조번호 우선 중복판정
- Gmail 발송중 / 발송 확인 필요 / 중복 실행 보호
- 신청자↔입금 원자적 저장
- 입금/발송 이력이 있는 강의 변경 확인
- 사용 중지 강의 전체 Form 동기화 제외
- 멀티탭 쓰기 작업 조정
- 템플릿 DB schema 회귀 방지
- 초기화 실패 복구 UI

## v2.7.0 Form-specific protections
1. **강의와 Form 연결이 분리되어 모호해지는 위험** — Form connection에 `courseId`를 저장하고 동기화 시 그 강의를 강제합니다.
2. **같은 Form을 다른 강의에 재사용해 response ID가 충돌하는 위험** — 활성/비활성 과거 연결 이력 전체를 검사해 재사용을 차단합니다.
3. **기존 Form 재동기화가 과거 운영 이력을 초기화하는 위험** — response ID 기반 merge로 입금/발송/CS 필드를 보존합니다.
4. **사용 중지 강의가 전체 동기화로 다시 유입되는 위험** — `전체 폼 동기화`에서 활성 강의 ID에 연결된 Form만 실행합니다.
5. **기존 단일 Form 설정 손실 위험** — legacy connection/mapping/default course/lastSync 값을 강의별 연결 배열로 마이그레이션합니다.
6. **Form 교체 중 과거 히스토리 삭제 위험** — 기존 connection은 inactive history로 남기고 신청 데이터는 삭제하지 않습니다.

## Still requires real-environment testing
- Google Forms API 실제 응답 구조/권한 승인
- 여러 강의 Form을 연속 동기화할 때 OAuth token UX
- Gmail API 실제 발송 및 snapshot
- 실제 은행 CSV 열/고유번호 포맷
- 브라우저 reload/persistence 및 모바일 UI

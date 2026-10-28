# ClassRelay v2.11.1 — Self Audit

## v2.11.1 변경 범위 감사
- 기준본은 사용자가 첨부한 `class-relay-v2.11.0.zip`이며 기존 은행 파서, 입금매칭, Google Form, Gmail 모듈은 수정하지 않았다.
- 강의 삭제/보관 로직과 설정의 전체 초기화 UX, 관련 스타일/문서/테스트만 수정했다.
- DB schema version은 변경하지 않았다. 보관 상태는 기존 course 레코드의 `archived`/`archivedAt` 필드로 저장한다.
- 운영 이력 판단은 신청 레코드뿐 아니라 courseId가 연결된 입금/로그도 확인한다. 이력이 있으면 실제 delete를 차단한다.
- 보관 시 `active=false`를 요구하고, 보관 해제 후에도 중지 상태를 유지해 새 Form 자동동기화에 갑자기 다시 들어오지 않게 한다.
- 전체 초기화는 기존 `db.resetAll()`의 단일 transaction을 재사용한다. 실행 전 현재 강의/신청/입금/로그 건수를 표시하고 settings 전체 삭제 범위를 명시한다.

## v2.11.1 자동 검증
- `npm test`: **125/125 통과**. 기존 120개 회귀 테스트 + 보관/초기화/가이드 5개 테스트를 통과했다.
- `npm run check`: **전체 JavaScript syntax 통과**.
- 기존 `assets/core.mjs`, `assets/bank-import.mjs`, `assets/google.mjs`, `assets/coordination.mjs`는 기준본과 동일 hash인지 패키징 전 재확인한다.

## v2.11.1 UI QA
- Chromium render harness: desktop 1440×1000 / mobile 390×844.
- document/modal/modal-body horizontal overflow: **0px**.
- 새 modal action: **44px**. 모바일 강의 액션: **44px**.
- focus-visible outline: **2px solid**, offset **3px**.
- 초기화 요약: desktop 4열, mobile 2열.

## v2.11.1 자체평가
**9.7 / 10**

삭제와 보관의 의미를 분리해 과거 운영 이력을 훼손하지 않으면서 목록 정리가 가능해졌고, 전체 초기화도 실제 삭제 범위를 확인한 뒤 실행하도록 강화했다. 남은 0.3은 이 실행 환경의 브라우저 정책 때문에 실제 localhost origin에서 IndexedDB까지 포함한 클릭 E2E를 자동화하지 못한 점이다. 코드 회귀 테스트와 동일 stylesheet/markup 실제 Chromium 렌더 QA는 통과했다.

---

## 변경 범위
- 은행별 하드코딩 대신 사용자가 직접 저장하는 `은행 내역 템플릿` import 계층을 추가했다.
- CSV/TSV와 Excel 97-2003 `.xls`를 브라우저에서 직접 읽는다.
- 새 템플릿은 `샘플 파일 → 헤더 행 → 열 매핑 → 최대 5행 미리보기 → 자유 이름 → 저장` 흐름을 사용한다.
- 템플릿은 기존 IndexedDB `settings`의 `bankImportTemplates`에 저장하며 DB schema는 올리지 않는다.
- 저장된 템플릿으로 다음 파일을 가져올 때 저장 당시의 헤더 위치/이름을 다시 검증한 뒤 기존 입금 누적·자동매칭 로직으로 넘긴다.
- v2.10.0의 강의 가격 스냅샷, 선택형 녹화본 URL, 일반 안내메일 규칙은 유지했다.

## 파서/정규화 검수
- CSV/TSV: 구분자 판별, quoted value, UTF-8 우선/EUC-KR fallback을 적용한다.
- `.xls`: OLE2/CFB 컨테이너와 BIFF8 Workbook/SST/cell record를 브라우저용 zero-dependency parser로 읽는다.
- HTML `.xls`: 파일 안에 실제 표가 있는 경우 읽고, 외부 `*.files/sheet001.htm`만 참조하는 shell은 잘못 읽지 않고 `EXTERNAL_HTML_SHEET` 오류를 낸다.
- 날짜와 시간이 분리된 은행 파일은 `입금 날짜 + 입금 시간`을 하나의 입금일시로 정규화한다.
- 필수 매핑은 입금 날짜, 입금자명, 입금액이며 은행 고유번호는 선택이다.
- 저장 템플릿은 선택 필드를 포함해 매핑한 모든 헤더 위치/이름이 달라졌는지 검사한다.
- 은행 고유번호가 없으면 기존 `paymentFingerprint()` fallback을 유지한다.

## 빈 샘플 안전장치
- 헤더만 있고 실제 입금 행이 없는 파일도 템플릿 자체는 저장할 수 있다.
- 이 경우 `previewVerified=false`로 저장하고, 첫 실제 입금 파일에서 최대 5행 미리보기를 한 번 더 확인해야 import가 진행된다.
- 실제 데이터가 있는 샘플은 저장 시 미리보기 후 바로 가져오기 + 기존 자동매칭을 실행한다.
- 같은 이름의 템플릿을 조용히 덮어쓰지 않고 다른 이름 사용/기존 삭제를 요구한다.

## 실제 사용자 제공 샘플 QA
- 신한은행 샘플: OLE2 `.xls` 파싱 성공, 헤더 7행 자동 추천 성공 (`거래일자 / 거래시간 / 적요 / 출금(원) / 입금(원) / 내용 / 잔액(원) / 거래점`).
- KB 샘플: OLE2 `.xls` 파싱 성공, 헤더 5행 자동 추천 성공 (`거래일시 / 적요 / 보낸분/받는분 / 송금메모 / 출금액 / 입금액 / 잔액 / 거래점 / 구분`).
- 기업은행 샘플: 파일 자체에는 입금 표가 없고 외부 `기업은행_샘플.files/sheet001.htm`만 참조하는 HTML workbook shell임을 감지했다. 원본 한 파일 안에 데이터가 없으므로 임의 복원하지 않고 명확한 안내를 표시한다.
- 사용자 샘플 파일은 테스트 fixture나 배포 ZIP에 복사하지 않았다.

## 저장/백업 검수
- `bankImportTemplates`는 기존 `settings` store에 저장한다.
- `exportBackup()`은 전체 settings를 export하므로 은행 내역 템플릿도 JSON 백업에 포함된다.
- `importBackup()`도 settings를 복원하므로 별도 migration 없이 템플릿이 복구된다.
- 새 object store를 만들지 않아 과거 DB 버전 호환 전략을 유지한다.

## 자동 검증
- `npm test`: **120/120 통과**.
- `npm run check`: **`bank-import.mjs`를 포함한 전체 JavaScript syntax 통과**.
- synthetic OLE/BIFF `.xls`, CSV/TSV, 외부 HTML sheet 오류, 날짜/시간 결합, 저장 템플릿 구조 변경 검사를 단위 테스트로 고정했다.
- 정적 테스트에서 템플릿 settings 저장, JSON backup 포함 구조, 가이드/사용자 UI 용어, 빈 샘플 흐름을 고정한다.

## UI QA
- Frontend Forge의 admin surface 기준대로 기존 ClassRelay 폼/모달 시스템을 재사용하고 장식보다 정보 명확성과 오류 예방을 우선했다.
- 실제 `assets/styles.css`와 은행 템플릿 wizard markup을 Chromium harness로 1440×1000 / 390×844에서 렌더했다.
- 390px 모바일에서 document, modal, modal-body 모두 horizontal overflow 0을 확인했다. 넓은 5행 표만 기존 `.table-wrap` 안에서 가로 스크롤한다.
- 모바일 file input의 intrinsic width가 modal 내부 폭을 넘는 문제를 발견해 `width/max-width/min-width` containment 규칙을 추가했다.
- 환경상 localhost/file URL 실제 앱 내비게이션은 차단될 수 있어 시각 QA는 실제 stylesheet + representative markup harness로 수행했다. 최종 Vercel에서 실제 파일 선택/IndexedDB 저장/입금매칭 E2E는 사용자 테스트가 마지막 확인 단계다.

## 알려진 제한
- `.xlsx`는 이번 버전 범위에 포함하지 않았다. 현재 지원 대상은 CSV/TSV와 Excel 97-2003 `.xls`다.
- 실제 표가 파일 안에 존재하지 않는 외부-sheet HTML `.xls`는 단일 파일만으로 읽을 수 없다. 다른 다운로드 형식이 없고 Excel/한셀에서 내역이 보인다면 CSV로 다시 저장하는 우회가 필요하다.
- 신한 샘플에는 실제 입금 행이 없어 `적요`와 `내용` 중 어느 열이 실제 입금자명인지 자동 확정할 수 없다. 그래서 최종 선택은 사용자가 5행 미리보기로 확인하게 한다.

## 자체평가
**9.6 / 10**

은행별 하드코딩 대신 재사용 가능한 사용자 매핑 계층으로 바꿔 장기 유지보수성과 신규 은행 대응성이 좋아졌다. 남은 0.4는 실제 배포 origin에서 사용자 은행 파일로 `템플릿 저장 → 다음 파일 import → IndexedDB 누적 → 자동매칭 → JSON 백업/복원` 전체 E2E를 아직 이 환경에서 실행하지 못한 점과, 기업은행 샘플 자체에 데이터가 존재하지 않는 외부 형식 제한이다.

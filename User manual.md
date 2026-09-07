# ClassRelay v2.9.2 — User Manual

## 가장 먼저 볼 문서
처음 사용하는 사용자는 `/guide`를 위에서부터 순서대로 따라가세요. v2.9.2 가이드는 Google Cloud를 한 번도 써보지 않은 사용자를 기준으로, 실제 Google 화면에서 눌러야 하는 선택지와 다음 버튼까지 설명합니다.

## 처음 설정
1. Google Cloud에서 ClassRelay 프로젝트를 만듭니다.
2. Google Forms API와 Gmail API를 켭니다.
3. Google Auth Platform에서 External/Testing을 설정하고 본인 Gmail을 Test user로 추가합니다.
4. Data Access에서 Forms 읽기 2개와 Gmail send scope를 추가합니다.
5. Web application Client를 만들고 현재 ClassRelay origin을 Authorized JavaScript origins에 등록합니다.
6. Client ID를 ClassRelay 설정에 저장합니다.

## 강의 운영
1. 강의 관리에서 강의명, 가격, 녹화본 URL을 저장합니다.
2. 해당 강의의 Google Form 긴 편집 `/edit` URL을 연결합니다.
3. 전체 폼 동기화 또는 이 강의 폼 동기화로 신청자를 가져옵니다.
4. 은행 CSV를 가져오면 신규 입금을 누적하고 즉시 자동매칭합니다.
5. 메일 템플릿을 확인합니다.
6. 발송 대상 선택 → 강의 선택 → 발송 가능 신청자 선택 → 최종 확인 → Gmail 발송 순서로 진행합니다.
7. 이후 강의 히스토리에서 발송 기록과 CS 메모를 확인할 수 있습니다.

## 데이터
운영 데이터는 현재 브라우저 IndexedDB에 저장됩니다. 정기적으로 설정의 백업 내보내기를 실행하세요.

## v2.9.1 가이드 읽기 규칙
초보자 가이드는 관리자 화면보다 여유 있는 문서 타이포그래피를 사용합니다. 따라 해야 하는 설명과 단계 문장은 16px, 보조 설명은 15px로 표시하고, 12~13px은 출처·라벨·상태 같은 메타 정보에만 사용합니다. 모바일에서도 이 본문 크기를 유지하며 넓은 표만 표 내부에서 가로 스크롤됩니다.


## v2.9.2 Google OAuth 초보자 체크
- 개인 Gmail이면 Audience 초기 설정에서 `외부(External)`를 선택하고 `다음(Next)`을 누릅니다.
- 이후 `대상(Audience)` → 화면 아래 `테스트 사용자(Test users)` → `Add users`에서 실제 사용할 본인 Gmail을 추가하고 저장합니다.
- `데이터 액세스(Data Access)`에서는 `범위 직접 추가(Manually add scopes)`에 ClassRelay가 사용하는 scope 3개를 문자열 그대로 붙여넣습니다.
- OAuth Client 생성 완료 팝업에서는 Client ID를 확인/복사한 뒤 `확인`을 누릅니다. Client Secret은 사용하지 않습니다.
- `Google에서 확인하지 않은 앱` 화면이 나오면 Test user로 등록한 본인 계정인지 확인하고 `계속`을 누릅니다.
- Forms 권한 화면에서는 Form 구조/응답 읽기 두 항목을 선택하거나 `모두 선택`한 뒤 아래로 내려 `계속`을 누릅니다.

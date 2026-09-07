# ClassRelay v2.9.0 — User Manual

## 가장 먼저 볼 문서
처음 사용하는 사용자는 `/guide`를 위에서부터 순서대로 따라가세요. v2.9.0 가이드는 Google Cloud를 한 번도 써보지 않은 사용자를 기준으로 작성되어 있습니다.

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

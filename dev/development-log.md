# ParkBuddy Web 개발일지

작성일: 2026-05-31

## 1. 프로젝트 목적

ParkBuddy Web은 파크골프 동호회 운영자가 회원관리, 라운딩 생성, 참가자 선택, 조편성, 점수 입력, 순위표, 라운딩 기록 저장 흐름을 웹에서 빠르게 사용할 수 있도록 만든 React MVP입니다.

기존 ParkBuddy Android 앱에서 논의했던 기능 흐름을 웹앱 형태로 옮긴 버전이며, 현재는 단일 화면 앱처럼 `src/main.jsx`에서 상태와 화면 전환을 관리합니다.

## 2. 현재 기술 구조

- 빌드 도구: Vite
- UI 프레임워크: React
- 아이콘: lucide-react
- 주요 코드: `src/main.jsx`
- 주요 스타일: `src/styles.css`
- 저장 방식: React `useState` 메모리 상태

현재는 새로고침하면 회원, 라운딩, 기록 데이터가 초기화됩니다. 다음 저장 단계는 웹 기준으로 `localStorage`를 먼저 적용하고, 이후 Supabase 또는 Firebase 같은 백엔드 저장소를 검토하는 방향이 좋습니다.

## 3. 참고 문서 기준으로 확인한 구현 상태

참고한 문서:

- `ParkBuddy_conversation_summary.txt`
- `경기방식.txt`

현재 구현된 주요 기능:

- 홈 화면
- 회원 등록, 수정, 삭제
- 연락처 자동 하이픈 처리
- 이름, 성별, 연락처 필수 검사
- CSV 회원 양식 다운로드
- CSV 회원 일괄등록
- 라운딩 생성
- 도/광역시 선택 후 파크골프장 선택
- 참가자 선택
- 조장 후보 선택
- 조편성
- 홀별 점수 입력
- 스트로크 플레이 및 신페리오 순위 계산
- 라운딩 기록 저장 및 목록 보기

## 4. 경기 방식 반영 상태

`경기방식.txt` 기준으로 라운딩 생성 화면의 점수/경기 방식 목록은 아래처럼 구성되어 있습니다.

- 스트로크 플레이
- 신페리오
- 매치 플레이
- 포섬
- 포볼

샷건은 점수 계산 방식이 아니라 출발/운영 방식에 가까우므로 현재 선택 목록에서 제외되어 있습니다. 이 방향은 이전 논의의 최종 결론과 맞습니다.

현재 계산 연결 상태:

- 스트로크 플레이: 총타수 기준 순위
- 신페리오: 임시 핸디캡 계산 후 최종 점수 기준 순위
- 매치 플레이, 포섬, 포볼: 선택은 가능하지만 아직 실제 규칙 계산은 없고 총타수 기준으로 처리됨

## 5. 현재 코드에서 발견한 개선 포인트

우선순위가 높은 항목:

1. 회원 수정 시 중복 이름 처리 보완
   - 신규 등록은 중복 이름 자동 정리 로직이 있음
   - 수정은 현재 바로 덮어쓰기 때문에 이전 Android 논의와 다름

2. 신페리오 숨김 홀 방식 개선
   - 현재는 앞에서부터 2/3 홀을 숨김 홀처럼 사용함
   - 실제 운영에 맞게 무작위 선택 또는 운영자 직접 지정 기능이 필요함

3. 데이터 영구 저장
   - 현재는 `useState`만 사용함
   - 1차로 `localStorage` 저장을 적용하면 새로고침 후에도 데이터 유지 가능

4. CSV 파싱 안정성 개선
   - 현재는 쉼표 기준 단순 분리 방식
   - 잘못된 핸디캡 값이 들어오면 `NaN`이 저장될 수 있음

5. 매치 플레이, 포섬, 포볼 실제 규칙 반영
   - 현재는 방식 선택지만 있고 계산 로직은 스트로크 플레이와 거의 같음
   - 팀전 점수 구조를 별도로 설계해야 함

## 6. 추천 개발 순서

1. `localStorage` 저장 적용
   - 회원, 최근 장소, 라운딩 기록부터 저장
   - 점수 입력 중 새로고침 복구까지 할지는 이후 결정

2. 회원관리 안정화
   - 수정 시 중복 이름 처리
   - 회원 검색
   - 삭제 시 참가자/점수/기록 영향 안내 강화

3. 신페리오 기능 개선
   - 숨김 홀 자동 선택
   - 운영자 직접 지정
   - 숨김 홀 표시 여부 선택

4. 라운딩 기록 강화
   - 기록 상세 보기
   - 기록 삭제
   - CSV 또는 이미지 내보내기

5. 경기 방식 확장
   - 매치 플레이는 홀별 승패 구조 필요
   - 포섬/포볼은 개인 점수 입력 구조와 팀 점수 계산 구조를 분리해야 함

6. 파크골프장 목록 관리
   - 코드 내부 목록을 JSON/CSV로 분리
   - 사용자 직접 추가/수정 지원
   - 추후 지도 API 연동 검토

## 7. 새 개발자가 먼저 볼 파일

- `README.md`: 실행 방법과 포함 기능 요약
- `src/main.jsx`: 화면, 상태, 계산 로직 전체
- `src/styles.css`: 앱 전체 스타일
- `dev/development-log.md`: 현재 개발 방향과 남은 작업

## 8. Git 관리 방향

이 프로젝트는 이제 Git으로 추적할 수 있도록 준비합니다.

권장 커밋 흐름:

```bash
git status
git add .
git commit -m "작업 내용 요약"
```

다른 장소에서도 수정하려면 GitHub 같은 원격 저장소를 만든 뒤 아래 흐름으로 연결합니다.

```bash
git remote add origin 원격저장소주소
git branch -M main
git push -u origin main
```

원격 저장소 주소는 사용자의 GitHub 계정에서 새 저장소를 만든 뒤 복사해서 넣으면 됩니다.

## 9. 2026-06-01 조편성 고도화 작업

이번 작업 목표:

- 기존 단순 랜덤 조편성을 경기 방식별 조편성으로 확장
- 개인전과 팀전 구조 분리
- 실력 균형, 조장 분산, 직전 조 중복 최소화 기준 반영
- 조편성 로직을 UI 컴포넌트에서 분리

추가 파일:

- `src/services/teamAssignment.js`

주요 함수:

- `calculateSkillScore(member, stats)`
- `createBalancedIndividualTeams(participants, options)`
- `createFoursomeTeams(participants, options)`
- `createFourBallTeams(participants, options)`
- `calculatePreviousOverlapScore(candidateTeams, previousRoundTeams)`
- `selectBestTeamAssignment(candidates)`

실력 점수 기준:

- 평균 타수 점수: 50%
- 참가 횟수 점수: 30%
- 실력 등급 점수: 20%

평균 타수는 낮을수록 높은 실력으로 보고, 참가 횟수는 많을수록 경험이 높은 것으로 봅니다. 기존 회원에 평균 타수와 참가 횟수가 없어도 오류가 나지 않도록 기본값을 적용합니다.

개인전 처리:

- 스트로크 플레이
- 신페리오
- 매치 플레이

개인전은 실력 점수 높은 순서로 정렬한 뒤 지그재그 방식으로 조에 배치합니다. 직전 조 중복 최소화 옵션을 선택하면 여러 후보 조편성을 만들고, 조별 실력 편차와 직전 조 중복, 조장 후보 분포를 평가해 가장 나은 후보를 선택합니다.

팀전 처리:

- 포섬
- 포볼

포섬은 비슷한 실력끼리 2인 팀을 만들고, 포볼은 강자와 약자를 짝지어 2인 팀을 만듭니다. 이후 2개 팀을 하나의 조로 배치합니다.

UI 변경:

- 참가자 선택 화면에 조편성 방식 선택 카드 추가
- 개인전은 랜덤, 실력 균형, 조장 기준, 실력 균형 + 직전 조 중복 최소화 제공
- 포섬/포볼은 포섬 추천 팀 편성, 포볼 추천 팀 편성, 실력 균형 + 직전 조 중복 최소화 제공
- 조편성 결과 화면에서 개인전 조와 팀전 조 표시를 구분

기록 변경:

- 라운딩 기록 저장 시 조편성 방식과 조/팀 구조도 함께 저장
- 다음 라운딩 조편성 시 가장 최근의 저장된 조 정보를 이용해 직전 조 중복을 줄임

## 10. 2026-06-01 화면 캡처 검증

사용자 요청에 따라 주요 화면 흐름별 스크린샷을 `C:\Capture` 폴더에 생성하고 확인했습니다.

생성된 캡처:

- `01-home.png`
- `02-members.png`
- `03-round-create-stroke.png`
- `04-member-select-stroke.png`
- `05-team-result-individual.png`
- `06-score-input.png`
- `07-ranking.png`
- `08-records.png`
- `09-round-create-포섬.png`
- `09-member-select-포섬.png`
- `09-team-result-포섬.png`
- `12-round-create-포볼.png`
- `12-member-select-포볼.png`
- `12-team-result-포볼.png`

검증 중 발견하고 수정한 내용:

1. 라운딩 생성 기본 날짜가 UTC 기준으로 잡혀 한국 시간보다 하루 이전 날짜가 표시되는 문제를 수정했습니다.
   - `new Date().toISOString().slice(0, 10)` 대신 `Asia/Seoul` 기준 날짜 문자열을 사용합니다.

2. 점수 입력 화면에서 하단 버튼 영역이 점수 입력 카드 위에 겹쳐 보이는 문제를 수정했습니다.
   - `.bottom-actions`의 sticky 고정을 제거해 입력 필드를 덮지 않도록 했습니다.

3. 반복 검증을 위해 `dev/capture-flow.mjs`를 추가했습니다.
   - Vite 서버와 Chrome headless를 실행합니다.
   - 홈, 회원관리, 라운딩 생성, 참가자 선택, 조편성 결과, 점수 입력, 순위표, 기록 보기, 포섬/포볼 팀전 결과 화면을 자동 캡처합니다.
   - 캡처 파일은 `C:\Capture`에 저장하고 임시 Chrome 프로필은 실행 후 정리합니다.

검증 결과:

- 개인전 조편성 결과 표시 정상
- 포섬 팀전 결과 표시 정상
- 포볼 팀전 결과 표시 정상
- 날짜 표시 정상
- 점수 입력 화면 버튼 겹침 해소

## 11. 2026-06-01 배포 설정

GitHub Pages 자동 배포를 위해 아래 파일을 추가했습니다.

- `.github/workflows/deploy.yml`
- `vite.config.js`

배포 방식:

- `main` 브랜치에 푸시
- GitHub Actions에서 `npm ci` 실행
- `GITHUB_PAGES=true npm run build` 실행
- `dist` 폴더를 `gh-pages` 브랜치에 게시

배포 주소:

```text
https://joon7jihoo-ctrl.github.io/parkbuddy-webapp/
```

Vite는 GitHub Pages 배포 시 `/parkbuddy-webapp/` 경로를 기준으로 asset URL을 생성하도록 설정했습니다. 로컬 개발/일반 로컬 빌드는 기존처럼 `/` 기준으로 동작합니다.

초기 GitHub Pages Actions 배포는 `Configure Pages` 단계에서 실패했습니다. 저장소 Pages 설정이 아직 GitHub Actions 배포 모드로 활성화되지 않은 경우를 피하기 위해, `peaceiris/actions-gh-pages`로 `gh-pages` 브랜치에 정적 파일을 게시하는 방식으로 변경했습니다.

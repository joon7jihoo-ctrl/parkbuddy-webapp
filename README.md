# ParkBuddy Web

ParkBuddy Android 앱에서 진행했던 기능을 React 웹앱 형태로 옮긴 MVP 버전입니다.

## 포함 기능

- 회원 등록/수정/삭제
- 회원 검색
- 회원 목록 접힘/확장 표시
- 회원별 동호회 이름/직책 관리
- 회장/부회장/총무/경기위원/홍보위원/재무 우선 회원 정렬
- 연락처 자동 하이픈 처리
- 필수항목 검사
- CSV 샘플 다운로드
- CSV 회원 일괄등록
- 라운딩 생성
- 도/광역시 선택 후 파크골프장 선택
- 사용자 구장 등록/삭제
- 기본 홀 수 9~81홀 선택
- 라운딩별 코스별 규정타수 입력
- 참가자 선택
- 조장 후보 선택
- 조편성 방식 선택
- 조당 3명 이상 조편성
- 조편성 결과 공유 메시지 생성
- 개인전 실력 균형 조편성
- 직전 라운딩 같은 조 중복 최소화
- 포섬/포볼 2인 팀전 편성
- 라운딩 기록에서 점수 입력/수정
- 코스별 점수 입력
- 공유 링크 기반 코스 탭/표 형태 점수 입력
- 공유 점수 입력값의 라운딩 기록 실시간 갱신
- 규정타수를 점수 입력 기본값으로 사용
- 스트로크 플레이 / 신페리오 / 매치 플레이 / 스크램블 / 포섬 / 포볼 / 스테이블포드 순위 계산
- 신페리오 숨김 홀 자동 선정
- 신페리오 숨김 홀 직접 선택 및 공개 여부 설정
- Supabase 정규 테이블 기반 회원/기록/점수/순위/최근 장소/사용자 구장 자동 저장
- 조편성 완료 라운딩 기록 저장 후 홈 복귀
- 라운딩 기록 상세 보기, CSV 내보내기, 삭제
- 공유 링크 기반 회원/팀별 점수 입력
- 라운딩 기록 화면의 순위 자동 동기화
- 개인점수관리 및 기준파 대비 기록 추이 그래프
- 브라우저 뒤로가기 화면 이동
- 스포츠 플랫폼 콘셉트 홈/점수/순위/공유 카드 UI

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 Vite가 안내하는 주소를 열면 됩니다.

## 배포

`main` 브랜치에 푸시하면 GitHub Actions가 빌드 후 GitHub Pages로 배포합니다.

예상 배포 주소:

```text
https://joon7jihoo-ctrl.github.io/parkbuddy-webapp/
```

## 현재 저장 방식

Supabase 환경변수가 설정되어 있으면 회원, 라운딩 기록, 최근 장소, 사용자 구장을 Supabase에 자동 저장합니다.
환경변수가 없으면 기존처럼 브라우저 화면 상태에만 저장되며, 새로고침하면 데이터가 초기화됩니다.
조편성/점수 입력 공유는 브라우저의 공유 기능 또는 클립보드 복사를 사용하므로, 모바일에서는 MMS나 카카오톡을 선택해 전송할 수 있습니다.
공유 링크 점수 입력 화면은 코스별 가로 탭과 1~9홀 표 입력을 사용하며, 입력된 점수는 라운딩 기록과 순위에 자동 반영됩니다.

## Supabase 설정

1. Supabase 프로젝트를 만듭니다.
2. Supabase SQL Editor에서 `supabase/schema.sql` 내용을 실행합니다.
3. `.env.example`을 참고해 `.env`를 만들고 값을 입력합니다.

```text
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_PARKBUDDY_STATE_KEY=default
```

현재 스키마는 `parkbuddy_clubs`, `parkbuddy_members`, `parkbuddy_courses`, `parkbuddy_rounds`, `parkbuddy_round_scores`, `parkbuddy_round_rankings`, `parkbuddy_app_settings` 정규 테이블을 우선 사용합니다.
기존 `parkbuddy_app_state` 단일 JSON 테이블은 새 스키마가 아직 적용되지 않은 배포 환경을 위한 fallback/migration 저장소로 유지합니다.
로그인과 여러 동호회 권한 관리가 들어가면 Supabase Auth의 사용자 ID와 `club_id`를 연결하고, 관리자/일반 사용자 권한에 맞춰 RLS 정책을 좁히는 것이 좋습니다.

GitHub Pages 배포에서도 Supabase 저장을 사용하려면 GitHub 저장소의 `Settings > Secrets and variables > Actions`에 아래 secrets를 등록해야 합니다.

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_PARKBUDDY_STATE_KEY
```

## 조편성 기준

참가자별 실력 점수는 평균 타수, 참가 횟수, 실력 등급을 함께 사용합니다.

- 평균 타수: 50%
- 참가 횟수: 30%
- 실력 등급: 20%

평균 타수나 참가 횟수 기록이 없는 회원도 기본값으로 안전하게 계산합니다.
스트로크 플레이, 신페리오, 매치 플레이, 스테이블포드는 개인전 조편성으로 처리합니다.
스크램블은 조 단위 팀 점수를 입력하고, 포섬과 포볼은 2인 팀을 먼저 만든 뒤 2개 팀을 한 조로 배치합니다.

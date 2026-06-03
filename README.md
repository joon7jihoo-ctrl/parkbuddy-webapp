# ParkBuddy Web

ParkBuddy Android 앱에서 진행했던 기능을 React 웹앱 형태로 옮긴 MVP 버전입니다.

## 포함 기능

- 회원 등록/수정/삭제
- 회원 검색
- 회원별 동호회 이름/직책 관리
- 연락처 자동 하이픈 처리
- 필수항목 검사
- CSV 샘플 다운로드
- CSV 회원 일괄등록
- 라운딩 생성
- 도/광역시 선택 후 파크골프장 선택
- 사용자 구장 등록/삭제
- 라운딩별 홀별 규정타수 입력
- 참가자 선택
- 조장 후보 선택
- 조편성 방식 선택
- 개인전 실력 균형 조편성
- 직전 라운딩 같은 조 중복 최소화
- 포섬/포볼 2인 팀전 편성
- 홀별 점수 입력
- 규정타수를 점수 입력 기본값으로 사용
- 스트로크 플레이 / 신페리오 / 매치 플레이 / 스크램블 / 포섬 / 포볼 / 스테이블포드 순위 계산
- 신페리오 숨김 홀 자동 선정
- 신페리오 숨김 홀 직접 선택 및 공개 여부 설정
- Supabase 기반 회원/기록/최근 장소/사용자 구장 자동 저장
- 라운딩 기록 저장, 상세 보기, CSV 내보내기, 삭제

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

## Supabase 설정

1. Supabase 프로젝트를 만듭니다.
2. Supabase SQL Editor에서 `supabase/schema.sql` 내용을 실행합니다.
3. `.env.example`을 참고해 `.env`를 만들고 값을 입력합니다.

```text
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_PARKBUDDY_STATE_KEY=default
```

현재 스키마는 로그인 전 MVP 저장을 위해 단일 JSON 상태 테이블을 사용합니다. 로그인과 여러 동호회 권한 관리가 들어가면 `clubs`, `members`, `round_records` 같은 정규 테이블과 인증 기반 RLS 정책으로 분리하는 것이 좋습니다.

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

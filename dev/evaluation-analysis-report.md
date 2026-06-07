# ParkBuddy Web 평가분석보고서

작성일: 2026-06-07

## 1. 평가 범위

이번 평가는 Supabase 정규 테이블 전환, 스포츠 플랫폼 방향 UI/UX 반영, 기존 라운딩 운영 기능의 정상 동작 여부를 대상으로 수행했습니다.

평가 대상:

- Supabase 저장 구조 전환
- 회원/구장/라운딩/점수/순위 데이터 저장 안정성
- 홈 화면 스포츠 플랫폼 UI
- 코스별 공유 점수 입력 화면
- AI 조편성 UX
- 라운딩 결과 공유 카드
- 회원 관리, 라운딩 생성, 조편성, 점수 입력, 순위표, 기록 보기 흐름
- 빌드 및 자동 브라우저 검증

## 2. 구현 결과

Supabase 정규 테이블 전환:

- `supabase/schema.sql`을 정규 테이블 구조로 개편했습니다.
- 신규 테이블은 `parkbuddy_clubs`, `parkbuddy_members`, `parkbuddy_courses`, `parkbuddy_rounds`, `parkbuddy_round_scores`, `parkbuddy_round_rankings`, `parkbuddy_app_settings`입니다.
- 기존 `parkbuddy_app_state`는 fallback/migration 저장소로 유지했습니다.
- 앱 저장 서비스는 정규 테이블을 우선 사용하고, 정규 테이블이 아직 없는 환경에서는 기존 JSON 테이블로 자동 fallback합니다.
- 회원, 사용자 구장, 라운딩 기록, 점수, 순위를 Supabase Table Editor에서 각각 확인할 수 있는 구조로 분리했습니다.

스포츠 플랫폼 UI/UX:

- 홈 화면을 스포츠 대시보드 톤으로 재구성했습니다.
- 조편성 결과 화면은 AI 추천 리포트 형태로 편성 이유와 밸런스 지표를 보여줍니다.
- 점수 입력 화면은 참가자별 입력과 라이브 순위 미리보기를 중심으로 정리했습니다.
- 순위표에는 공유 카드와 포디엄 UI를 추가했습니다.
- 공유 링크 점수 입력 화면은 코스별 가로 탭과 1~9홀 표 입력 구조로 변경했습니다.
- 밝은 모드와 다크 모드 디자인 토큰을 정리해 야간 라운딩에서도 사용할 수 있도록 했습니다.
- 앱 내부 이전 버튼은 제거하고 브라우저 뒤로가기 흐름은 유지했습니다.

## 3. 검증 결과

빌드 검증:

```text
npm.cmd run build
결과: 통과
```

자동 브라우저 검증:

```text
C:\Program Files\nodejs\node.exe dev\capture-flow.mjs
결과: 통과
캡처 경로: C:\Capture
```

확인된 대표 캡처:

- `C:\Capture\01-home.png`
- `C:\Capture\05-team-result-individual.png`
- `C:\Capture\09-records-detail.png`
- `C:\Capture\09-records-mobile.png`
- `C:\Capture\09-shared-score-entry.png`
- `C:\Capture\10-personal-scores.png`

Supabase REST 확인:

- 기존 fallback 테이블 `parkbuddy_app_state`: 조회 정상
- 신규 정규 테이블 `parkbuddy_members`: 현재 원격 DB에는 아직 없음
- 원격 DB에 정규 테이블을 생성하려면 Supabase SQL Editor에서 `supabase/schema.sql`을 실행해야 합니다.
- anon key는 데이터 조회/입력용 공개 키이므로 테이블 생성 DDL을 원격으로 실행할 수 없습니다.

## 4. 품질 분석

강점:

- 저장 계층을 `src/services/supabaseStorage.js`로 격리해 UI 코드 변경 없이 저장 방식을 전환할 수 있습니다.
- 정규 테이블이 없는 배포 환경에서도 fallback 저장이 작동하므로 즉시 장애가 발생하지 않습니다.
- 라운딩 기록의 점수와 순위를 별도 테이블로 분리해 향후 통계, 검색, 권한 분리에 유리합니다.
- 스포츠 플랫폼 UI가 홈, 조편성, 점수 입력, 순위표, 공유 카드까지 일관되게 확장되었습니다.
- 자동 브라우저 검증이 홈, 회원, 라운딩 생성, 조편성, 점수 입력, 기록, 공유 점수 입력까지 넓게 커버합니다.
- 공유 점수 입력은 코스 탭 전환 후에도 값을 유지하고, 입력 즉시 순위 갱신 흐름을 탑니다.

제한 사항:

- 원격 Supabase 정규 테이블은 아직 생성되지 않았습니다. 스키마 파일은 준비됐지만 SQL Editor 실행이 필요합니다.
- 현재 RLS 정책은 MVP 운영을 위해 anon 접근을 넓게 허용합니다. 로그인 도입 전까지 운영 데이터 보호 수준이 낮습니다.
- 라운딩 기록의 복잡한 메타데이터는 앱 호환성을 위해 JSON 백업도 함께 저장합니다.
- 공유 카드는 브라우저 공유/텍스트 복사 중심입니다. 실제 이미지 파일 생성/인스타그램 직접 공유는 추가 구현이 필요합니다.
- MMS/카카오톡 자동 발송은 별도 메시지 API와 백엔드가 필요합니다.
- 브라우저 경로 기반 라우팅은 아직 단순 화면 상태 방식입니다.

## 5. 개선사항 도출

우선순위 1:

- Supabase SQL Editor에서 `supabase/schema.sql`을 실행하고 Table Editor에서 신규 테이블 생성을 확인합니다.
- 정규 테이블 적용 후 앱에서 회원/기록을 한 번 저장해 기존 JSON 데이터를 정규 테이블로 마이그레이션합니다.
- Supabase Auth를 붙이고 `club_id` 기반 RLS 정책으로 관리자/일반 사용자 권한을 분리합니다.

우선순위 2:

- 공유 카드를 실제 PNG 이미지로 내보내는 기능을 추가합니다.
- 카카오톡 공유는 Kakao JavaScript SDK 또는 서버 메시지 API로 확장합니다.
- MMS 발송은 문자 발송 사업자 API와 Edge Function을 연결합니다.

우선순위 3:

- 개인점수관리 대시보드에 최근 5라운드 추세, 코스별 강약, 기준파 대비 평균, 베스트 기록 배지를 추가합니다.
- 라운딩 기록 검색을 정규 테이블 쿼리 기반으로 확장합니다.
- React Router를 도입해 화면별 URL, 새로고침 복원, 공유 링크 안정성을 높입니다.
- 신페리오/순위 계산/조편성 알고리즘에 단위 테스트를 추가합니다.

## 6. 결론

ParkBuddy Web은 이번 작업으로 운영 도구형 MVP에서 데이터 스포츠 플랫폼 방향으로 한 단계 전환되었습니다. 저장 구조는 정규 테이블 우선 구조로 개편되었고, UI는 라이브 경기, AI 조편성, 성과 데이터, 공유 카드 중심의 톤으로 개선되었습니다.

다만 원격 Supabase DB의 신규 테이블 생성은 anon key 권한으로 수행할 수 없어 `supabase/schema.sql` 실행이 필요합니다. 스키마가 적용되면 앱은 자동으로 정규 테이블 저장 모드로 전환됩니다.

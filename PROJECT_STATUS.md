# 실증 개발 원칙

실증에서 확인된 필요에 따라 기능을 유지·보완·보류·제외한다. 법적 의무와 구현 기능은 구분한다.

2026-11-05: 첫 정적 실증 UI 구성. 브라우저 저장만 사용하며 서버 계정·중앙 DB·실제 개인정보 입력은 지원하지 않는다. 기존 domain 함수 7개 시험은 별도 핵심 규칙 검증이며 정적 UI의 실제 서버 접근제어를 의미하지 않는다.

Vercel team: tellowss-projects
Vercel project: contractor-safety
Project ID: prj_IebR7V9ApDBY5VQ1NzpHOrjkjhjm

GitHub 저장소 생성은 브라우저 계정 로그인 후 진행한다.

## 2026-11-05 배포 검증
- URL: https://contractor-safety.vercel.app
- Deployment: dpl_BvgZFMdtwtfi59Ct9pDD9ZMgfrVA / READY
- npm run build: 7/7 시험 및 정적 빌드 통과
- 배포 브라우저: 가상 현장 등록·종료, 의견 저장, 새로고침 후 집계 유지 확인
- 브라우저 증빙: pilot-preview.jpg
- GitHub: 로그인 화면 확인, 저장소 미생성. Vercel은 소스 직접 배포이며 Git 자동 연결 전.

2026-11-05: GitHub main 업로드 및 Vercel Git 연결 완료. 문서 갱신 커밋으로 자동 배포 검증 진행.

## 2026-11-05 v0.3
- 회사 로그인·현장별 중앙 실증 의견 UI/클라이언트 코드 추가
- 신규 DB용 RLS schema.sql 준비, 기존 DB에는 적용 안 함
- PostgreSQL 기반 접근권한 시험 포함 총 15개 통과
- SMART 조직 신규 프로젝트 생성 선택 답변 대기
- 환경변수 없을 때 연결 준비 중 화면만 제공; 실제 로그인과 서버 저장은 미활성

## 2026-11-05 v0.4 무료 개발 전환
- 사용자 비용 0원 제약에 따라 신규 Supabase 생성 보류; 조직 선택 요청은 더 이상 선행 조건 아님
- PC 영속 PostgreSQL(.local-data) 및 역할 모의시험 서버 구현, localhost 전용
- 현장 관리·실증 의견·역할별 JSON 내보내기
- 총 16개 시험 통과: DB 재시작 보존, 동시 역할 요청 분리, 쓰기 거부 포함
- 브라우저에서 현장 추가·의견 저장·B사 데이터 차단 확인
- 로컬 DB와 개인정보는 Git 업로드 제외. 유료 리소스 생성 없음.

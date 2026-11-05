# 골조 협력사 안전관리 — 실증판 v0.2

본사와 최대 15개 활성 현장을 대상으로, 실증 의견에 따라 기능을 유지·보완·보류·제외하는 신규 프로젝트입니다.

## 실행

Node.js 22: `npm test`, `npm run build`, `npm start` (http://127.0.0.1:4173).
외부 패키지 의존성 없이 정적 웹을 dist에 생성합니다.

## 구현 범위

- 본사 현황, 현장 추가·종료·재개 (활성 최대 15개)
- 9개 업무 분류의 검토 상태 기록
- 기능별 유지·보완·보류·제외 검토 의견과 JSON 내보내기
- 브라우저 localStorage 저장. 다른 기기나 사용자와 공유되지 않습니다.
- 별도 domain 함수: 회사·현장 인가, 상태 전이, revision 충돌, 독립 확인자, 변경 이력 등 7개 회귀시험

정적 UI에는 서버 인증과 중앙 DB가 아직 없습니다. domain 시험 통과가 실제 서버 접근제어 구현을 뜻하지 않습니다. 실제 근로자·민감 자료를 입력하지 않습니다. 업무 분류는 법적 준수 판정이 아닙니다.

## 배포

https://contractor-safety.vercel.app
Vercel: tellowss-projects / contractor-safety
2026-11-05 소스 직접 배포 READY 확인. GitHub TELLOWSS/contractor-safety 연결 완료. main 푸시로 자동 배포합니다.

## 기존 제품 활용

NEW-PSI의 회사 인증·조치 revision 패턴을 참고했습니다. 기존 소스 자체는 아직 이식하지 않았습니다. 카메라·출력은 NEW-PSI, 골조 PTW는 SMART-SFCS, TBM·일지는 기존 제품에서 검증 후 선별 이전합니다.

## 다음 단계

1. GitHub 저장소 및 Vercel 자동 배포 연결 완료
2. 회사·현장별 서버 인증·인가와 중앙 저장소
3. 증빙·조치 검토 흐름, 감사 이력
4. 현장 실증 의견을 바탕으로 기존 모듈 선별 이식

기존 운영 서비스와 DB는 변경하지 않았습니다.

## v0.3 회사 계정·중앙 저장 기반

회사 계정 화면 `/workspace.html`, Supabase 로그인 클라이언트, 회사·현장별 RLS SQL, 현장별 실증 의견 저장 코드를 추가했습니다. 전용 DB 생성 조직은 사용자 확인 중이며, 현재 운영 배포는 ‘연결 준비 중’ 상태입니다. 로그인·중앙 저장은 아직 활성화되지 않았습니다.

개발 의존성은 package-lock.json에 고정합니다. 최초 `npm ci --ignore-scripts`, 이후 `npm run build`, `npm start` 순서로 실행합니다. `npm start`는 빌드된 dist를 제공합니다.

`npm test`는 총 15개를 통과했습니다. PGlite PostgreSQL에서 사용자 역할과 auth.uid를 재현해 RLS를 검증했으며, 실제 Supabase Auth/Data API 통합 검증은 별도 프로젝트 생성 후 진행합니다. 적용 절차와 미완료 범위는 db/README.md를 참고하세요.

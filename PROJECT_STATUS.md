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

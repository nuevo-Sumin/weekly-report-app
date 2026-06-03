# Project Handoff Summary

이 문서는 새 채팅에서 작업을 이어가기 위한 프로젝트 요약본입니다. 세부 UI 변경 이력보다 현재 구조, 흐름, 남은 작업에 집중합니다.

## 프로젝트

- 이름: weekly-report-app
- 목적: 주간업무보고 등록, 제출, 취합, 최종 텍스트 복사
- 기술 스택:
  - Backend: Spring Boot, Spring Security, JWT, JPA
  - Frontend: React + Vite
  - DB: 기본 MySQL, H2 file DB fallback profile
- 저장소/원격: GitHub `weekly-report-app`
- 현재 주요 브랜치:
  - `main`
  - `dev`
  - 두 브랜치는 현재 최신 커밋 기준 같은 위치에 있음
- 최신 확인 커밋: `921ae28 Refine weekly report UI palette and issue links`

## 작업 경로

실제 앱 소스가 있는 작업 경로:

```text
C:\Users\Public\Documents\ESTsoft\CreatorTemp\metabuild-weekly-report-app
```

현재 시스템 workspace로 잡힌 다음 경로는 별도 문서/초기 자료만 있는 상태일 수 있다.

```text
C:\Users\btheb\metabuild_weekly_report
```

새 작업을 시작할 때는 먼저 실제 앱 소스 경로와 브랜치를 확인한다.

```powershell
git status --short --branch
```

## 전체 기능 흐름

1. 사용자가 회원가입한다.
2. 로그인하면 JWT access token을 발급받는다.
3. 개발자는 주간업무 항목을 직접 입력하거나 CSV로 가져온다.
4. 개발자는 금주/차주 제출 항목을 선택한다.
5. 선택된 항목은 단위업무와 업무 구분 기준으로 병합된다.
6. 개발자는 병합 결과를 저장하거나 복사할 수 있다.
7. PL은 제출된 개발자 항목을 조회한다.
8. PL은 취합 대상 항목을 선택해 최종 보고 텍스트를 생성한다.
9. PL은 최종 텍스트를 직접 수정하고 저장/복사한다.

## 인증 및 권한

- JWT access token 사용
- 비밀번호는 BCrypt 해시 저장
- `/api/me`로 현재 사용자 확인
- refresh token은 아직 없음
- PL 즉시 가입은 차단
- PL 요청 계정은 다음 상태로 생성됨:
  - `role = USER`
  - `requestedRole = MANAGER`
  - `roleApprovalStatus = PENDING`
- MVP 단계에서는 PL 승인을 DB 수동 update로 운영

## DB 상태

- 기본 DB: MySQL
- MySQL profile: `backend/src/main/resources/application-mysql.yml`
- H2 fallback profile: `backend/src/main/resources/application-h2.yml`
- H2 위치: `./data/weekly_report` (백엔드를 `backend/`에서 실행해도 루트 `data/`를 사용)
- `SPRING_PROFILES_ACTIVE=h2`를 지정하면 기존 H2 file DB로 실행 가능
- MySQL 실사용 흐름 테스트는 아직 남은 작업
- H2 데이터를 MySQL로 이관하는 자동 스크립트는 아직 없음

## 프론트/백엔드 서빙 구조

개발 중:

- Vite: `http://localhost:5173`
- Spring Boot API: `http://localhost:8080`
- Vite proxy가 `/api`를 백엔드로 전달

단일 서버:

- `npm run build:spring`으로 React 결과물을 `backend/src/main/resources/static`에 생성
- Spring Boot가 React 화면과 API를 함께 서빙
- 접속 URL: `http://localhost:8080`

8080에 프론트 변경이 반영되지 않으면:

```powershell
cd frontend
npm run build:spring
cd ..\backend
.\mvnw.cmd process-resources
```

필요하면 Spring Boot 서버를 재시작하거나 브라우저 강력 새로고침을 한다.

## 주요 파일

문서:

- `README.md`
- `docs/REQUIREMENTS.md`
- `docs/DB_DESIGN.md`
- `docs/WEEKLY_REPORT_UI_DESIGN.md`
- `docs/MYSQL_AND_ADMIN_OPERATIONS.md`

백엔드:

- `backend/src/main/resources/application.yml`
- `backend/src/main/resources/application-mysql.yml`
- `backend/src/main/resources/application-h2.yml`
- `backend/src/main/java/com/metabuild/weeklyreport/security/*`
- `backend/src/main/java/com/metabuild/weeklyreport/auth/*`
- `backend/src/main/java/com/metabuild/weeklyreport/reportitem/*`
- `backend/src/main/java/com/metabuild/weeklyreport/mergedreport/*`

프론트엔드:

- `frontend/src/App.jsx`
- `frontend/src/components/AuthPanel.jsx`
- `frontend/src/components/MemberReportScreen.jsx`
- `frontend/src/components/ManagerReportScreen.jsx`
- `frontend/src/csvReportImport.js`
- `frontend/src/dateUtils.js`
- `frontend/src/reportPreview.js`
- `frontend/src/styles.css`

정적 빌드 산출물:

- `backend/src/main/resources/static/*`

프론트 변경 후 Spring Boot 단일 서버 반영이 필요하면 `npm run build:spring` 결과를 함께 커밋한다.

## 실행 명령

백엔드:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

프론트 개발 서버:

```powershell
cd frontend
npm install
npm run dev
```

Spring Boot 정적 서빙용 프론트 빌드:

```powershell
cd frontend
npm run build:spring
```

테스트:

```powershell
cd frontend
npm run test
cd ..\backend
.\mvnw.cmd test
```

## 최근 검증 상태

- 이전 검증에서 프론트 테스트 통과
- 이전 검증에서 `npm run build:spring` 통과
- 이전 검증에서 백엔드 32개 테스트 통과
- 최신 UI 정리 커밋 직전에는 사용자 요청에 따라 테스트를 생략하고 `build:spring`, `process-resources`만 수행

## 배포 후보

- 개인 PC 운영 + Cloudflare Tunnel
- Oracle Cloud Always Free
- AWS Lightsail
- AWS EC2 + RDS

현재는 Spring Boot 하나로 React 정적 파일과 API를 같이 제공할 수 있는 구조다.

## 남은 주요 마일스톤

1. MySQL DB 생성 및 로컬 실사용 흐름 테스트
2. H2 데이터 MySQL 이관 방식 결정
3. DB 백업/복구 절차 작성
4. 배포 전략 확정
5. CSV edge case 추가 테스트
6. 저장된 병합 결과 운영 흐름 점검

## 작업 시 주의사항

- 작은 변경 단위로 진행한다.
- 사용자가 명시하기 전에는 인증/세션 구조를 크게 바꾸지 않는다.
- 관리자 승인 자동화 API/화면은 현재 보류 상태다.
- `backend/src/main/resources/static`은 React 빌드 산출물이다.
- 프론트 변경 후 단일 서버 반영이 필요하면 `npm run build:spring`을 실행한다.
- 정적 asset 해시 파일은 삭제/추가를 함께 커밋해야 한다.
- 최신 UI 개선은 세부 이력보다 현재 흐름 중심으로만 설명한다.
- AGENTS 지침상 커밋은 사용자 허가 후 진행한다.

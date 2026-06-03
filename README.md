# Weekly Report App

Spring Boot + React/Vite 기반 주간업무보고 앱입니다.

개발자는 주간 업무를 직접 입력하거나 CSV로 가져온 뒤 제출할 항목을 선택하고, PL은 제출된 항목을 취합해 최종 주간업무보고 텍스트를 생성합니다.

## 목표

- 개발자가 금주/차주 업무 항목을 등록한다.
- 개발자가 제출할 항목을 체크박스로 선택한다.
- 선택 항목은 업무 구분과 단위업무 기준으로 병합된다.
- PL은 개발자가 제출한 항목을 조회하고 최종 취합본을 작성한다.
- 최종 결과는 plain text로 표시되어 쉽게 복사할 수 있다.

## 현재 구현 상태

### 인증

- 회원가입
- 로그인
- JWT access token 발급
- JWT 인증 필터
- `/api/me`
- BCrypt 비밀번호 해시 저장
- PL 권한 요청 및 승인 대기 상태 관리

PL 권한은 MVP 단계에서 자동 승인하지 않습니다. 회원가입 시 PL을 요청해도 실제 권한은 `USER`로 생성되고, 운영자가 DB에서 수동 승인합니다.

### 개발자 보고 흐름

- 오늘 날짜 기준 보고 기간 자동 계산
- 금주/차주 업무 항목 등록
- 사업관리/수행 구분 등록
- CSV 업로드 및 row별 주차 선택
- 임시저장, 저장, 수정
- 저장 항목 선택 및 제출
- 선택 항목 기준 병합 미리보기
- 병합 결과 저장, 수정, 복사

### PL 취합 흐름

- 제출된 개발자 업무 항목 조회
- 보고 기간, 개발자 아이디, 단위업무, 주차 구분 필터
- 취합 대상 체크박스 선택
- 선택 항목 병합
- 최종 텍스트 직접 수정
- 병합 결과 저장, 수정, 복사

### 데이터 저장

- 기본 DB는 H2 file DB
- DB 위치: `./data/weekly_report` (백엔드를 `backend/`에서 실행해도 루트 `data/`를 사용)
- 서버를 꺼도 `data/` 폴더를 지우지 않으면 데이터가 유지된다.
- MySQL 전환용 profile 준비 완료
- MySQL 실연결 테스트와 운영 이관 절차는 아직 남아 있다.

## 실행 방법

### 백엔드 실행

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

로컬 개발에서는 `JWT_SECRET`이 없어도 임시 키로 실행됩니다. 운영 환경에서는 32바이트 이상의 `JWT_SECRET`을 반드시 환경변수 또는 외부 설정으로 지정해야 합니다.

### 프론트엔드 개발 서버

```powershell
cd frontend
npm install
npm run dev
```

Vite 개발 서버는 `http://localhost:5173`에서 실행됩니다. `/api` 요청은 Vite proxy를 통해 `http://localhost:8080` 백엔드로 전달됩니다.

### Spring Boot 단일 서버로 실행

React 빌드 결과를 Spring Boot 정적 리소스로 생성합니다.

```powershell
cd frontend
npm install
npm run build:spring
cd ..\backend
.\mvnw.cmd spring-boot:run
```

이후 `http://localhost:8080`에서 React 화면과 API를 같은 서버로 사용할 수 있습니다.

이미 실행 중인 Spring Boot 서버에 최신 React 빌드 결과를 반영하려면 다음을 실행한 뒤 서버 재시작 또는 강력 새로고침을 합니다.

```powershell
cd frontend
npm run build:spring
cd ..\backend
.\mvnw.cmd process-resources
```

## MySQL profile

MySQL 전환용 설정 파일은 다음 위치에 있습니다.

- `backend/src/main/resources/application-mysql.yml`

예시 실행:

```powershell
$env:SPRING_PROFILES_ACTIVE = "mysql"
$env:MYSQL_USER = "weekly_report"
$env:MYSQL_PASSWORD = "로컬비밀번호"
$env:JWT_SECRET = "32바이트이상의로컬개발용JWT시크릿값"
cd backend
.\mvnw.cmd spring-boot:run
```

MySQL 준비, H2/MySQL 운영 차이, PL 수동 승인 SQL은 [docs/MYSQL_AND_ADMIN_OPERATIONS.md](docs/MYSQL_AND_ADMIN_OPERATIONS.md)를 참고합니다.

## 주요 API

### 인증

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/me`

### 업무 항목

- `POST /api/report-items`
- `GET /api/report-items`
- `PUT /api/report-items/{itemId}`
- `POST /api/report-items/submit`

### PL 취합

- `GET /api/admin/report-items`

### 병합 결과

- `POST /api/merged-reports`
- `GET /api/merged-reports?reportStartDate=YYYY-MM-DD&reportEndDate=YYYY-MM-DD`
- `PUT /api/merged-reports/{reportId}`

`mergeType`은 개발자 병합 결과에 `MEMBER`, PL 취합 결과에 `ADMIN`을 사용합니다. `ADMIN` 병합 결과 저장은 실제 `MANAGER` 권한 사용자만 가능합니다.

## 테스트

프론트엔드:

```powershell
cd frontend
npm run test
npm run build:spring
```

백엔드:

```powershell
cd backend
.\mvnw.cmd test
```

최근 확인된 백엔드 테스트는 32개입니다.

## 배포 방향

현재 앱은 Spring Boot 하나로 React 정적 파일과 API를 같이 제공할 수 있습니다.

후보:

- 개인 PC 운영 + Cloudflare Tunnel
- Oracle Cloud Always Free
- AWS Lightsail
- AWS EC2 + RDS

운영 전 필수 확인:

- 운영 profile 정리
- `JWT_SECRET` 외부 설정
- MySQL 실연결 테스트
- DB 백업/복구 절차
- H2 사용 시 데이터 보존/백업 정책

## 다음 마일스톤

1. 배포 방식 확정
2. MySQL 실연결 테스트
3. DB 백업/복구 절차 작성
4. 운영용 실행 스크립트 또는 profile 정리
5. 저장된 병합 결과 운영 흐름 점검
6. CSV edge case 추가 테스트

## 관련 문서

- [요구사항](docs/REQUIREMENTS.md)
- [DB 설계](docs/DB_DESIGN.md)
- [UI 설계](docs/WEEKLY_REPORT_UI_DESIGN.md)
- [MySQL 전환 및 관리자 승인 운영](docs/MYSQL_AND_ADMIN_OPERATIONS.md)

# Weekly Report App

주간업무보고 앱으로 전환 중인 Spring Boot + React/Vite 프로젝트입니다.

## 목표

- 팀원이 주간업무 항목을 직접 입력하거나 파일로 업로드한다.
- 팀원은 제출할 항목을 체크박스로 선택한다.
- 선택된 항목은 단위업무와 금주/차주 기준으로 병합된다.
- 병합 결과는 텍스트로 미리보고 복사할 수 있다.
- 팀장은 팀원이 제출한 항목을 조회하고 병합 결과를 수정/복사한다.

## 현재 구현 상태

- Spring Boot 백엔드 기본 구조
- 공통 `ApiResponse`와 전역 예외 처리
- 회원가입, 로그인, JWT 발급
- JWT 인증 필터와 `/api/me`
- 팀원 주간업무 항목 생성, 조회, 수정, 제출
- React/Vite 로그인/회원가입 화면
- 팀원 제출 화면
  - 기준 일자 선택과 보고 기간 계산
  - 금주/차주 업무 항목 입력
  - 임시저장, 저장, 수정, 제출
  - 체크박스 선택
  - 단위업무별 병합 미리보기
  - 텍스트 복사

## 관리자 승인 정책

관리자 즉시 가입은 허용하지 않습니다.

회원가입 시 `MANAGER`를 요청하면 계정은 다음 상태로 생성됩니다.

- `role = USER`
- `requestedRole = MANAGER`
- `roleApprovalStatus = PENDING`

MVP 단계에서는 관리자 승인을 별도 화면/API로 만들지 않고 DB에서 수동으로 처리합니다.

승인 시 운영자가 DB에서 다음 값으로 변경합니다.

- `role = MANAGER`
- `roleApprovalStatus = APPROVED`

팀장 취합 API는 실제 `role`이 `MANAGER`인 사용자만 접근할 수 있게 구현합니다.

## 실행 방법

### 백엔드

Windows PowerShell:

```powershell
.\mvnw.cmd spring-boot:run
```

또는 IntelliJ IDEA에서 `WeeklyReportApplication`을 실행합니다.

JWT secret은 최소 32바이트 이상이어야 합니다. 개발 기본값은 `application.yml`에 있고, 운영 환경에서는 환경변수 또는 외부 설정으로 교체해야 합니다.

### 프론트엔드

```powershell
cd frontend
npm install
npm run dev
```

Vite 개발 서버에서 백엔드 API를 같은 origin으로 쓰려면 프록시 설정 또는 배포 구성이 추가로 필요합니다. 현재 백엔드 API 직접 테스트는 `http://localhost:8080` 기준입니다.

## 주요 API

### 인증

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/me`

### 팀원 업무 항목

- `POST /api/report-items`
- `GET /api/report-items`
- `PUT /api/report-items/{itemId}`
- `POST /api/report-items/submit`

## 다음 마일스톤

1. 팀장 취합 백엔드
   - 제출된 항목 조회
   - 기간/팀원/단위업무/금주·차주 필터
   - 관리자 권한 검증

2. 팀장 취합 프론트
   - 팀원별 제출 항목 그리드
   - 항목 선택
   - 단위업무별 병합 미리보기
   - 최종 텍스트 복사

3. 병합 결과 저장
   - `MergedReport` 엔터티
   - 일반사용자/관리자 병합 결과 저장과 수정

4. CSV/Excel 업로드
   - 금주/차주 구분
   - 업로드 row 검토
   - 업무 항목 저장 연결

## MVP 완성도 메모

현재 MVP 기준 완성도는 약 55%입니다.

완료 비중이 높은 영역은 인증, 팀원 업무 항목 API, 팀원 제출 화면입니다. 남은 핵심 공백은 팀장 취합, 병합 결과 저장, CSV/Excel 업로드입니다.

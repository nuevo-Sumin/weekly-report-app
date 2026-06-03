# MySQL 전환 준비 및 관리자 승인 운영

이 문서는 기본 DB를 MySQL로 운영하기 위한 설정과, H2 file DB fallback 및 MVP 단계의 관리자 승인 운영 방법을 정리한다.

## 1. 현재 DB 운영 방식

기본 실행은 `mysql` profile을 사용한다. `backend/src/main/resources/application.yml`에서 기본 profile이 `mysql`로 지정되어 있으므로 별도 `SPRING_PROFILES_ACTIVE`를 주지 않으면 MySQL로 연결한다.

MySQL 설정 파일:

- `backend/src/main/resources/application-mysql.yml`

H2 file DB는 기존 데이터 확인이나 임시 fallback이 필요할 때만 `h2` profile로 실행한다.

- DB 파일 위치: `./data/weekly_report`
- JDBC URL: `jdbc:h2:file:../data/weekly_report;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE` (`backend/`에서 실행할 때 루트 `data/`를 사용)
- 서버를 꺼도 `data/` 폴더를 지우지 않으면 회원/보고 데이터가 유지된다.
- `data/` 폴더는 `.gitignore`에 포함되어 GitHub에 올라가지 않는다.

## 2. MySQL 설정

MySQL profile은 기본 활성화된다.

사용 환경변수:

- `MYSQL_URL`: MySQL JDBC URL
- `MYSQL_USER`: MySQL 사용자
- `MYSQL_PASSWORD`: MySQL 비밀번호
- `JPA_DDL_AUTO`: Hibernate DDL 전략. 로컬 준비 단계 기본값은 `update`
- `JWT_SECRET`: 운영/공유 환경에서 사용할 32바이트 이상 JWT secret
- `JWT_EXPIRATION`: access token 만료 시간(ms)

환경변수 대신 로컬 전용 설정 파일을 사용할 수도 있다. `backend/config/application-local.example.yml`을 `backend/config/application-local.yml`로 복사하고, MySQL 사용자 비밀번호와 JWT secret을 적는다. `application-local.yml`은 Git에 커밋하지 않는다. IntelliJ 실행 위치가 프로젝트 루트이든 `backend/`이든 이 파일을 읽도록 설정되어 있다.

기본 JDBC URL은 로컬 개발 편의를 위한 값이다.

```text
jdbc:mysql://localhost:3306/weekly_report?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Seoul&characterEncoding=UTF-8
```

## 3. 로컬 MySQL 준비 예시

MySQL에 접속해 DB와 사용자를 만든다. 비밀번호는 실제 로컬 값으로 바꿔서 실행한다.
같은 내용의 템플릿은 `backend/scripts/init-mysql.example.sql`에도 있다. 실제 비밀번호를 넣은 `backend/scripts/init-mysql.sql`은 로컬 전용으로 만들고 Git에 커밋하지 않는다.

```sql
CREATE DATABASE weekly_report
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

CREATE USER 'weekly_report'@'localhost' IDENTIFIED BY '로컬비밀번호';
GRANT ALL PRIVILEGES ON weekly_report.* TO 'weekly_report'@'localhost';
FLUSH PRIVILEGES;
```

PowerShell에서 MySQL로 실행한다.

```powershell
$env:MYSQL_USER = "weekly_report"
$env:MYSQL_PASSWORD = "로컬비밀번호"
$env:JWT_SECRET = "32바이트이상의로컬개발용JWT시크릿값을넣으세요"
cd backend
.\mvnw.cmd spring-boot:run
```

로컬 설정 파일로 실행할 때는 다음처럼 준비한다.

```powershell
copy backend\config\application-local.example.yml backend\config\application-local.yml
notepad backend\config\application-local.yml
cd backend
.\mvnw.cmd spring-boot:run
```

IntelliJ IDEA에서는 Run Configuration의 Environment variables에 다음 값을 추가한다.

```text
MYSQL_USER=weekly_report;MYSQL_PASSWORD=로컬비밀번호;JWT_SECRET=32바이트이상의로컬개발용JWT시크릿값
```

기존 H2 file DB로 실행해야 할 때는 다음처럼 profile을 명시한다.

```powershell
$env:SPRING_PROFILES_ACTIVE = "h2"
cd backend
.\mvnw.cmd spring-boot:run
```

## 4. H2에서 MySQL로 옮길 때 주의점

MVP 단계에서는 Flyway/Liquibase 마이그레이션을 아직 사용하지 않는다. 따라서 MySQL 첫 전환 시에는 다음 순서를 권장한다.

1. MySQL DB를 빈 상태로 만든다.
2. 기본 실행으로 앱을 한 번 실행해 JPA가 테이블을 생성하게 한다.
3. 회원가입, 로그인, 업무 항목 저장, 팀장 조회, 병합 저장을 수동 테스트한다.
4. 실사용 전에는 `JPA_DDL_AUTO=validate` 또는 명시적 SQL 마이그레이션 도입을 검토한다.

기존 H2 데이터는 MySQL로 이관하지 않는다. 필요한 경우 H2 profile로만 과거 데이터를 확인하고, 운영 데이터는 MySQL에서 새로 시작한다.

## 5. 관리자 승인 정책

MVP에서는 관리자 승인 화면/API를 만들지 않는다. 팀장 권한은 DB에서 수동으로 승인한다.

회원가입 시 PL을 선택하면 계정은 다음 상태로 생성된다.

- `role = USER`
- `requested_role = MANAGER`
- `role_approval_status = PENDING`

승인 후에는 다음 상태가 되어야 한다.

- `role = MANAGER`
- `requested_role = MANAGER`
- `role_approval_status = APPROVED`

## 6. 관리자 승인 SQL

승인 대상 확인:

```sql
SELECT id, login_id, email, name, role, requested_role, role_approval_status, active
FROM users
WHERE requested_role = 'MANAGER'
  AND role_approval_status = 'PENDING';
```

특정 사용자 승인:

```sql
UPDATE users
SET role = 'MANAGER',
    role_approval_status = 'APPROVED'
WHERE login_id = '승인할아이디'
  AND requested_role = 'MANAGER'
  AND role_approval_status = 'PENDING';
```

승인 확인:

```sql
SELECT id, login_id, name, role, requested_role, role_approval_status
FROM users
WHERE login_id = '승인할아이디';
```

승인 후 사용자는 다시 로그인해야 새 JWT에 `MANAGER` 권한이 반영된다.

## 7. H2 file DB에서 수동 승인하는 방법

H2 file DB를 직접 수정할 때는 앱을 먼저 종료한다.

IntelliJ IDEA Database 도구에서 다음 값으로 연결한다.

- Driver: H2
- URL: `jdbc:h2:file:../data/weekly_report;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE`
- User: `sa`
- Password: 없음

연결 후 위 관리자 승인 SQL을 실행한다.

## 8. MySQL에서 수동 승인하는 방법

MySQL Workbench, DBeaver, IntelliJ Database, 또는 `mysql` CLI로 `weekly_report` DB에 접속한 뒤 위 관리자 승인 SQL을 실행한다.

CLI 예시:

```powershell
mysql -u weekly_report -p weekly_report
```

운영 실수 방지를 위해 `SELECT`로 대상 사용자를 확인한 뒤 `UPDATE`를 실행한다.

## 9. MySQL 백업 절차

백업 파일은 저장소 루트의 `backups/` 폴더에 보관한다. 이 폴더는 `.gitignore`에 포함되어 Git에 올라가지 않는다.

백업 전에는 가능하면 사용자가 적은 시간대에 진행한다. MVP 단계에서는 짧은 점검 시간 동안 앱을 잠시 중지한 뒤 백업하는 방식을 권장한다.

PowerShell 예시:

```powershell
cd C:\Users\Public\Documents\ESTsoft\CreatorTemp\metabuild-weekly-report-app
New-Item -ItemType Directory -Force backups | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
mysqldump -u weekly_report -p `
  --single-transaction `
  --routines `
  --triggers `
  --default-character-set=utf8mb4 `
  weekly_report `
  > "backups\weekly_report-$timestamp.sql"
```

`-p` 뒤에 비밀번호를 직접 붙이지 않는다. 프롬프트가 뜨면 MySQL 비밀번호를 입력한다.

백업 후 확인:

```powershell
Get-Item "backups\weekly_report-$timestamp.sql" | Select-Object Name, Length, LastWriteTime
```

파일 크기가 0이면 백업 실패로 보고 다시 수행한다.

## 10. MySQL 복구 절차

복구는 기존 DB를 덮어쓰는 작업이다. 반드시 현재 DB를 먼저 백업한 뒤 진행한다.

복구 대상 DB를 비우고 다시 만든다. 운영 DB라면 앱을 먼저 중지한다.

```powershell
mysql -u root -p -e "DROP DATABASE IF EXISTS weekly_report; CREATE DATABASE weekly_report DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci;"
mysql -u root -p -e "GRANT ALL PRIVILEGES ON weekly_report.* TO 'weekly_report'@'localhost'; FLUSH PRIVILEGES;"
mysql -u weekly_report -p weekly_report < backups\weekly_report-백업시각.sql
```

복구 후 앱을 실행하고 다음을 확인한다.

1. 로그인 가능 여부
2. 업무 항목 목록 조회
3. 제출 항목 조회
4. 저장된 병합 결과 조회
5. PL 권한 계정의 취합 화면 접근

복구 검증용 SQL:

```sql
SELECT COUNT(*) AS user_count FROM users;
SELECT COUNT(*) AS report_item_count FROM weekly_report_items;
SELECT COUNT(*) AS merged_report_count FROM merged_reports;
```

## 11. 백업 운영 규칙

- 실사용 기간에는 최소 하루 1회 백업한다.
- 기능 변경 또는 배포 직전에는 수동 백업을 1회 만든다.
- 최근 7일 백업은 보관하고, 오래된 파일은 외부 저장소로 옮기거나 삭제한다.
- 비밀번호가 포함된 명령, dump 파일, 로컬 설정 파일은 Git에 커밋하지 않는다.

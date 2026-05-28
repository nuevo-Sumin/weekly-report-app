# MySQL 전환 준비 및 관리자 승인 운영

이 문서는 로컬 H2 file DB를 유지하면서, 이후 MySQL로 전환할 때 필요한 최소 설정과 MVP 단계의 관리자 승인 운영 방법을 정리한다.

## 1. 현재 DB 운영 방식

기본 실행은 H2 file DB를 사용한다.

- DB 파일 위치: `./data/weekly_report`
- JDBC URL: `jdbc:h2:file:./data/weekly_report;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE`
- 서버를 꺼도 `data/` 폴더를 지우지 않으면 회원/보고 데이터가 유지된다.
- `data/` 폴더는 `.gitignore`에 포함되어 GitHub에 올라가지 않는다.

## 2. MySQL profile

MySQL 전환을 위해 `mysql` Spring profile을 추가했다.

설정 파일:

- `src/main/resources/application-mysql.yml`

사용 환경변수:

- `MYSQL_URL`: MySQL JDBC URL
- `MYSQL_USER`: MySQL 사용자
- `MYSQL_PASSWORD`: MySQL 비밀번호
- `JPA_DDL_AUTO`: Hibernate DDL 전략. 로컬 준비 단계 기본값은 `update`
- `JWT_SECRET`: 운영/공유 환경에서 사용할 32바이트 이상 JWT secret
- `JWT_EXPIRATION`: access token 만료 시간(ms)

기본 JDBC URL은 로컬 개발 편의를 위한 값이다.

```text
jdbc:mysql://localhost:3306/weekly_report?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Seoul&characterEncoding=UTF-8
```

## 3. 로컬 MySQL 준비 예시

MySQL에 접속해 DB와 사용자를 만든다. 비밀번호는 실제 로컬 값으로 바꿔서 실행한다.

```sql
CREATE DATABASE weekly_report
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

CREATE USER 'weekly_report'@'localhost' IDENTIFIED BY '로컬비밀번호';
GRANT ALL PRIVILEGES ON weekly_report.* TO 'weekly_report'@'localhost';
FLUSH PRIVILEGES;
```

PowerShell에서 MySQL profile로 실행한다.

```powershell
$env:SPRING_PROFILES_ACTIVE = "mysql"
$env:MYSQL_USER = "weekly_report"
$env:MYSQL_PASSWORD = "로컬비밀번호"
$env:JWT_SECRET = "32바이트이상의로컬개발용JWT시크릿값을넣으세요"
.\mvnw.cmd spring-boot:run
```

IntelliJ IDEA에서는 Run Configuration의 Environment variables에 다음 값을 추가한다.

```text
SPRING_PROFILES_ACTIVE=mysql;MYSQL_USER=weekly_report;MYSQL_PASSWORD=로컬비밀번호;JWT_SECRET=32바이트이상의로컬개발용JWT시크릿값
```

## 4. H2에서 MySQL로 옮길 때 주의점

MVP 단계에서는 Flyway/Liquibase 마이그레이션을 아직 사용하지 않는다. 따라서 MySQL 첫 전환 시에는 다음 순서를 권장한다.

1. MySQL DB를 빈 상태로 만든다.
2. `SPRING_PROFILES_ACTIVE=mysql`로 앱을 한 번 실행해 JPA가 테이블을 생성하게 한다.
3. 회원가입, 로그인, 업무 항목 저장, 팀장 조회, 병합 저장을 수동 테스트한다.
4. 실사용 전에는 `JPA_DDL_AUTO=validate` 또는 명시적 SQL 마이그레이션 도입을 검토한다.

H2의 기존 데이터를 MySQL로 자동 이관하는 스크립트는 아직 없다. 실제 운영 데이터를 옮겨야 할 때 별도 export/import 절차를 만든다.

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
- URL: `jdbc:h2:file:./data/weekly_report;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE`
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

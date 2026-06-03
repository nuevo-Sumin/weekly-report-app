# Oracle Cloud 배포 가이드

이 문서는 Oracle Cloud Always Free VM에 주간업무보고 앱을 배포하는 절차를 정리한다. 현재 운영 방향은 Oracle VM에서 웹앱과 MySQL을 상시 실행하고, 추후 로컬 게임용 데스크탑의 Ollama는 필요할 때만 별도 내부 API로 붙이는 하이브리드 구조다.

## 1. 권장 구조

```text
사용자
  -> Oracle Cloud VM
  -> Spring Boot 단일 서버
  -> MySQL

수요일 업무시간 필요 시
  -> Oracle Cloud VM
  -> 로컬 PC Ollama API
```

초기 배포에서는 Ollama 연동을 넣지 않는다. 웹앱과 DB 운영을 먼저 안정화한다.

## 2. Oracle VM 기준

권장 기준:

- OS: Ubuntu 22.04 LTS 또는 24.04 LTS
- Shape: Always Free 범위의 Ampere A1 또는 소형 VM
- 포트:
  - 22: SSH
  - 8080: 임시 앱 확인용
  - 운영 도메인을 붙일 때는 80/443과 Nginx 사용을 검토
- DB: VM 내부 MySQL

Oracle 콘솔에서 유료 리소스를 만들지 않도록 Always Free 범위와 예산 알림을 확인한다.

## 3. 서버 패키지 설치

```bash
sudo apt update
sudo apt install -y openjdk-17-jdk mysql-server git curl
java -version
mysql --version
```

Node.js는 서버에서 프론트 빌드를 직접 할 때만 필요하다. 보통은 로컬에서 `npm run build:spring` 후 커밋된 정적 산출물을 배포한다.

## 4. 운영 사용자와 디렉터리

```bash
sudo useradd --system --create-home --shell /bin/bash weeklyreport
sudo mkdir -p /opt/weekly-report-app
sudo chown -R weeklyreport:weeklyreport /opt/weekly-report-app
```

## 5. 소스 배포

```bash
sudo -u weeklyreport git clone https://github.com/nuevo-Sumin/weekly-report-app.git /opt/weekly-report-app
cd /opt/weekly-report-app
git checkout dev
```

운영 브랜치가 확정되면 `dev` 대신 운영 브랜치를 사용한다.

## 6. MySQL 준비

MySQL root 접속:

```bash
sudo mysql
```

DB와 사용자 생성:

```sql
CREATE DATABASE weekly_report
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

CREATE USER 'weekly_report'@'localhost' IDENTIFIED BY '운영비밀번호';
GRANT ALL PRIVILEGES ON weekly_report.* TO 'weekly_report'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

기존 H2 데이터는 이관하지 않는다. 운영 데이터는 MySQL에서 새로 시작한다.

## 7. 운영 환경변수 파일

```bash
sudo mkdir -p /etc/weekly-report
sudo cp /opt/weekly-report-app/backend/config/weekly-report.env.example /etc/weekly-report/weekly-report.env
sudo nano /etc/weekly-report/weekly-report.env
sudo chmod 600 /etc/weekly-report/weekly-report.env
sudo chown root:root /etc/weekly-report/weekly-report.env
```

필수 수정:

```text
MYSQL_PASSWORD=운영비밀번호
JWT_SECRET=32바이트이상의운영용랜덤문자열
```

초기 운영은 `JPA_DDL_AUTO=update`로 테이블을 생성한다. 테이블 생성과 기본 흐름 확인이 끝난 뒤에는 `validate` 전환을 검토한다.

## 8. 빌드

```bash
cd /opt/weekly-report-app/backend
./mvnw test
./mvnw clean package
```

테스트가 너무 오래 걸리는 긴급 배포에서는 다음 명령을 사용할 수 있지만, 일반 배포에서는 테스트를 먼저 수행한다.

```bash
./mvnw clean package -DskipTests
```

## 9. systemd 서비스 등록

```bash
sudo cp /opt/weekly-report-app/deploy/weekly-report.service /etc/systemd/system/weekly-report.service
sudo systemctl daemon-reload
sudo systemctl enable weekly-report
sudo systemctl start weekly-report
```

상태와 로그 확인:

```bash
sudo systemctl status weekly-report
sudo journalctl -u weekly-report -f
```

앱 확인:

```bash
curl http://localhost:8080
```

Oracle 보안 목록 또는 방화벽에서 8080을 임시로 열었다면 외부 브라우저에서도 확인한다. 운영에서는 Nginx와 HTTPS를 붙인 뒤 8080 직접 공개는 닫는 것을 권장한다.

## 10. 백업 설정

수동 백업:

```bash
cd /opt/weekly-report-app
sudo -u weeklyreport bash backend/scripts/backup-mysql.sh
```

cron으로 매일 18시에 백업:

```bash
sudo crontab -u weeklyreport -e
```

다음 줄 추가:

```text
0 18 * * * APP_DIR=/opt/weekly-report-app ENV_FILE=/etc/weekly-report/weekly-report.env /bin/bash /opt/weekly-report-app/backend/scripts/backup-mysql.sh >> /opt/weekly-report-app/backups/backup.log 2>&1
```

백업 파일은 `/opt/weekly-report-app/backups`에 생성된다. 이 폴더는 Git에 커밋하지 않는다.

복구 절차는 `docs/MYSQL_AND_ADMIN_OPERATIONS.md`의 MySQL 복구 절차를 따른다.

## 11. 배포 업데이트

```bash
cd /opt/weekly-report-app
sudo -u weeklyreport git pull
cd backend
sudo -u weeklyreport ./mvnw clean package
sudo systemctl restart weekly-report
sudo systemctl status weekly-report
```

프론트 변경이 있으면 로컬에서 `npm run build:spring`을 수행하고 정적 산출물을 커밋한 뒤 서버에서 pull한다.

## 12. 운영 확인 체크리스트

1. 회원가입 가능
2. 로그인 가능
3. 개발자 업무 항목 저장 가능
4. 제출 가능
5. PL 계정 수동 승인 가능
6. PL 취합 조회 가능
7. 병합 결과 저장 가능
8. `backend/scripts/backup-mysql.sh` 백업 성공
9. 서버 재부팅 후 systemd 자동 시작 확인

## 13. 추후 Ollama 하이브리드

Ollama 연동은 웹앱 배포 안정화 후 진행한다.

예상 설정:

```text
AI_REPHRASE_ENABLED=true
OLLAMA_BASE_URL=http://내부연결주소:11434
OLLAMA_MODEL=llama3.1:8b
```

원칙:

- Ollama API를 공개 인터넷에 직접 노출하지 않는다.
- Cloudflare Tunnel, Tailscale, WireGuard 중 하나로 내부 연결한다.
- 로컬 PC가 꺼져 있으면 AI 기능만 실패 처리하고, 보고서 기본 기능은 계속 동작하게 한다.

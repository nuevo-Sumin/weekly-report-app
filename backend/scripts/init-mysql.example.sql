CREATE DATABASE IF NOT EXISTS weekly_report
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'weekly_report'@'localhost' IDENTIFIED BY 'replace-with-local-password';
GRANT ALL PRIVILEGES ON weekly_report.* TO 'weekly_report'@'localhost';
FLUSH PRIVILEGES;

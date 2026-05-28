# DB 설계안

## 1. 설계 목적

주간업무보고 앱은 로그인, role 기반 권한, 임시저장, 저장, 수정, 제출, 관리자 취합 기능을 제공해야 한다. 따라서 업로드 파일을 즉시 변환해 텍스트만 만드는 현재 단일 HTML 구조를 넘어, 사용자와 업무 항목, 제출 내역, 병합 결과를 지속적으로 저장할 DB가 필요하다.

이 문서는 DB 구조의 설계안만 다룬다. 아직 SQL은 작성하지 않는다.

## 2. 현재 코드 기준 관찰

현재 `index.html`은 다음 기능을 클라이언트에서만 처리한다.

- CSV 파일 선택
- `FileReader`를 이용한 로컬 파일 읽기
- CSV 파싱
- 업무 항목 배열 생성
- 상태/기간 기준 필터링
- 단위업무 또는 상위 일감 기준 그룹화
- 텍스트 보고서 출력
- 클립보드 복사

현재 코드에는 다음 DB 관련 기능이 없다.

- 로그인/회원가입
- 사용자 role 저장
- 임시저장
- 저장/수정/조회
- 제출 상태 관리
- 관리자 취합
- 업로드 이력 관리
- 병합 결과 저장

따라서 DB 설계는 기존 코드의 `tasks` 배열과 보고서 생성 로직을 서버/DB 기반으로 확장하는 방향으로 잡는다.

## 3. DB 필요성 판단

DB는 필요하다.

이유:

- 사용자가 로그인 후 본인의 업무 항목을 조회해야 한다.
- 회원가입 시 선택한 role을 유지해야 한다.
- 일반사용자는 본인 데이터만 접근해야 한다.
- 관리자는 팀원이 제출한 데이터를 조회하고 병합해야 한다.
- 임시저장 데이터는 브라우저 종료 후에도 유지되어야 한다.
- 저장/수정/제출 상태가 이력과 함께 관리되어야 한다.
- CSV 업로드 결과를 사용자가 검토하고 나중에 다시 수정할 수 있어야 한다.
- 금주/차주 구분과 단위업무별 병합 결과를 지속적으로 관리해야 한다.

DB 없이 가능한 범위는 단일 사용자용 일회성 변환 도구까지다. 현재 요구사항의 앱은 협업형 업무보고 시스템에 가까우므로 DB를 포함하는 설계가 적합하다.

## 4. 핵심 엔터티

MVP 기준 핵심 엔터티는 다음과 같다.

- User
- UnitTask
- WeeklyReportItem
- ReportSubmission
- MergedReport
- UploadedFile
- UploadedFileRow

초기 구현을 더 작게 가져가려면 `UploadedFileRow`는 생략할 수 있다. 다만 CSV 업로드 오류 추적과 재검토 기능을 생각하면 업로드 row 이력을 별도로 두는 편이 좋다.

## 5. 엔터티 상세

### 5.1 User

회원가입 및 로그인 사용자를 저장한다.

주요 필드:

- `id`: 사용자 고유 ID
- `login_id`: 로그인 ID 또는 이메일
- `password_hash`: 비밀번호 해시
- `name`: 사용자 이름
- `role`: 사용자 역할
- `is_active`: 사용 가능 여부
- `created_at`: 생성일시
- `updated_at`: 수정일시

role 값:

- `MEMBER`: 일반사용자
- `ADMIN`: 관리자

설계 메모:

- 비밀번호는 평문 저장 금지
- role은 회원가입 시 선택하되, 운영 환경에서는 관리자 role 승인 절차를 추가하는 것이 안전함
- 탈퇴 또는 비활성화 대응을 위해 실제 삭제보다 `is_active` 사용 권장

### 5.2 UnitTask

단위업무 분류를 저장한다.

주요 필드:

- `id`: 단위업무 고유 ID
- `name`: 단위업무명
- `description`: 설명
- `sort_order`: 정렬 순서
- `is_active`: 사용 여부
- `created_at`: 생성일시
- `updated_at`: 수정일시

설계 메모:

- 요구사항상 업무 항목은 단위업무 기준으로 분류되므로 별도 테이블로 관리하는 편이 좋다.
- 초기 MVP에서는 문자열 필드로만 시작할 수도 있지만, 관리자 취합/필터/정렬 품질을 위해 테이블 분리를 권장한다.

### 5.3 WeeklyReportItem

팀원이 직접 입력하거나 CSV 업로드로 생성한 업무 항목을 저장한다.

주요 필드:

- `id`: 업무 항목 고유 ID
- `author_id`: 작성자 User ID
- `unit_task_id`: 단위업무 ID
- `report_start_date`: 보고 기간 시작일
- `report_end_date`: 보고 기간 종료일
- `week_type`: 주차 구분
- `title`: 업무 제목
- `detail_content`: 업무 상세 내용
- `progress_content`: 진행 내용 또는 예정 내용
- `status`: 진행 상태
- `progress_rate`: 진행률
- `source_type`: 생성 방식
- `uploaded_file_id`: 업로드 파일 ID
- `source_row_no`: 업로드 원본 row 번호
- `save_status`: 저장 상태
- `submitted_at`: 제출일시
- `created_at`: 생성일시
- `updated_at`: 수정일시

week_type 값:

- `THIS_WEEK`: 금주
- `NEXT_WEEK`: 차주

status 값:

- `NEW`: 신규
- `IN_PROGRESS`: 진행중
- `DONE`: 완료
- `HOLD`: 보류

source_type 값:

- `MANUAL`: 직접 입력
- `CSV`: CSV 업로드

save_status 값:

- `DRAFT`: 임시저장
- `SAVED`: 저장
- `SUBMITTED`: 제출

설계 메모:

- 체크박스로 제출할 항목을 선택하면 선택된 항목만 `SUBMITTED` 상태로 전환하는 방식이 단순하다.
- 관리자는 `SUBMITTED` 상태의 항목을 조회해 병합한다.
- 금주/차주는 같은 보고 기간 안에서도 구분되어야 하므로 `week_type`을 별도 필드로 둔다.

### 5.4 ReportSubmission

일반사용자가 특정 보고 기간에 제출한 묶음을 저장한다.

주요 필드:

- `id`: 제출 고유 ID
- `user_id`: 제출자 User ID
- `report_start_date`: 보고 기간 시작일
- `report_end_date`: 보고 기간 종료일
- `status`: 제출 상태
- `submitted_at`: 제출일시
- `created_at`: 생성일시
- `updated_at`: 수정일시

status 값:

- `DRAFT`: 작성중
- `SUBMITTED`: 제출됨
- `RETURNED`: 반려됨
- `CONFIRMED`: 관리자 확인됨

설계 메모:

- `WeeklyReportItem`의 `save_status`만으로도 MVP는 가능하다.
- 다만 한 사용자가 한 주차에 제출한 항목 묶음을 관리하려면 `ReportSubmission`을 두는 편이 좋다.
- 제출 취소, 반려, 관리자 확인 같은 워크플로우가 생기면 반드시 필요해진다.

### 5.5 ReportSubmissionItem

제출 묶음과 제출된 업무 항목의 연결 정보를 저장한다.

주요 필드:

- `id`: 연결 고유 ID
- `submission_id`: ReportSubmission ID
- `report_item_id`: WeeklyReportItem ID
- `created_at`: 생성일시

설계 메모:

- 체크박스로 선택한 항목 목록을 안정적으로 보존하기 위한 연결 테이블이다.
- 항목 자체가 이후 수정될 수 있으므로, 제출 당시 내용 스냅샷이 필요하면 별도 snapshot 필드를 추가한다.
- MVP에서는 `WeeklyReportItem.submitted_at`만으로 단순화할 수 있다.

### 5.6 MergedReport

일반사용자 또는 관리자가 생성한 병합 결과를 저장한다.

주요 필드:

- `id`: 병합 보고서 고유 ID
- `created_by`: 생성자 User ID
- `merge_type`: 병합 유형
- `report_start_date`: 보고 기간 시작일
- `report_end_date`: 보고 기간 종료일
- `target_user_id`: 특정 팀원 대상 병합인 경우 User ID
- `merged_text`: 최종 병합 텍스트
- `status`: 병합 보고서 상태
- `copied_at`: 마지막 복사일시
- `created_at`: 생성일시
- `updated_at`: 수정일시

merge_type 값:

- `MEMBER`: 일반사용자 본인 병합
- `ADMIN`: 관리자 전체 또는 팀원별 병합

status 값:

- `DRAFT`: 편집중
- `SAVED`: 저장됨
- `FINAL`: 최종본

설계 메모:

- 관리자는 제출 항목을 불러와 병합 후 직접 수정할 수 있으므로 최종 텍스트를 별도로 저장해야 한다.
- 병합 텍스트는 복사 가능한 결과물이며, 재생성 결과와 관리자가 수정한 결과가 다를 수 있다.

### 5.7 MergedReportItem

병합 보고서에 포함된 업무 항목을 연결한다.

주요 필드:

- `id`: 연결 고유 ID
- `merged_report_id`: MergedReport ID
- `report_item_id`: WeeklyReportItem ID
- `created_at`: 생성일시

설계 메모:

- 최종 병합 결과가 어떤 원본 항목으로 만들어졌는지 추적하기 위한 테이블이다.
- 관리자 수정 후에도 원본과 최종 텍스트를 비교할 수 있다.

### 5.8 UploadedFile

CSV 업로드 파일의 메타데이터를 저장한다.

주요 필드:

- `id`: 업로드 파일 고유 ID
- `uploaded_by`: 업로드 사용자 ID
- `original_file_name`: 원본 파일명
- `file_type`: 파일 유형
- `storage_path`: 파일 저장 경로
- `row_count`: 전체 row 수
- `success_count`: 변환 성공 row 수
- `error_count`: 변환 실패 row 수
- `uploaded_at`: 업로드일시

file_type 값:

- `CSV`

설계 메모:

- 원본 파일을 반드시 저장할 필요는 없지만, 업로드 이력과 오류 추적을 위해 메타데이터는 저장하는 편이 좋다.
- 원본 파일 보관이 필요하면 DB가 아니라 파일 스토리지에 저장하고 DB에는 경로만 둔다.

### 5.9 UploadedFileRow

CSV 업로드 row별 변환 결과와 오류를 저장한다.

주요 필드:

- `id`: 업로드 row 고유 ID
- `uploaded_file_id`: UploadedFile ID
- `row_no`: row 번호
- `raw_data`: 원본 row 데이터
- `parsed_report_item_id`: 생성된 WeeklyReportItem ID
- `parse_status`: 파싱 상태
- `error_message`: 오류 메시지
- `created_at`: 생성일시

parse_status 값:

- `SUCCESS`
- `FAILED`
- `SKIPPED`

설계 메모:

- `raw_data`는 JSON 형태 저장을 권장하지만 DB 제품 선택 후 타입을 결정한다.

## 6. 관계 설계

주요 관계:

- User 1:N WeeklyReportItem
- User 1:N ReportSubmission
- User 1:N MergedReport
- UnitTask 1:N WeeklyReportItem
- UploadedFile 1:N UploadedFileRow
- UploadedFile 1:N WeeklyReportItem
- ReportSubmission N:M WeeklyReportItem
- MergedReport N:M WeeklyReportItem

관계 설명:

- 한 사용자는 여러 업무 항목을 작성한다.
- 한 업무 항목은 하나의 단위업무에 속한다.
- 한 업로드 파일은 여러 업무 항목을 생성할 수 있다.
- 한 제출 묶음은 여러 업무 항목을 포함한다.
- 한 병합 보고서는 여러 업무 항목을 기반으로 생성된다.

## 7. 권한 설계

일반사용자:

- 본인 User 정보 조회
- 본인 WeeklyReportItem 생성/수정/조회
- 본인 ReportSubmission 생성/조회
- 본인 MergedReport 생성/수정/조회
- 본인 UploadedFile 조회

관리자:

- 모든 사용자의 제출된 WeeklyReportItem 조회
- 모든 ReportSubmission 조회
- 관리자용 MergedReport 생성/수정/조회
- UnitTask 관리

권한 제한:

- 일반사용자는 다른 사용자의 업무 항목을 조회할 수 없다.
- 일반사용자는 다른 사용자의 제출 묶음과 병합 결과를 조회할 수 없다.
- 관리자는 팀원이 제출하지 않은 임시저장 항목은 기본적으로 조회하지 않는다.

## 8. 주요 조회 패턴

일반사용자 화면:

- 로그인 사용자 기준 보고 기간별 업무 항목 조회
- 임시저장 항목 조회
- 저장된 항목 조회
- 제출 가능한 항목 조회
- 금주/차주, 단위업무별 그룹 조회
- 본인 병합 보고서 조회

관리자 화면:

- 보고 기간별 제출 항목 조회
- 팀원별 제출 항목 조회
- 단위업무별 제출 항목 조회
- 금주/차주별 제출 항목 조회
- 제출 묶음별 상태 조회
- 관리자 병합 보고서 조회

업로드 화면:

- 업로드 파일 이력 조회
- 업로드 row별 성공/실패 결과 조회
- 업로드로 생성된 업무 항목 조회

## 9. 인덱스 후보

아직 SQL을 작성하지 않으므로 개념 수준의 인덱스 후보만 정리한다.

권장 인덱스:

- User: `login_id`
- WeeklyReportItem: `author_id`, `report_start_date`, `report_end_date`
- WeeklyReportItem: `unit_task_id`, `week_type`, `save_status`
- WeeklyReportItem: `uploaded_file_id`
- ReportSubmission: `user_id`, `report_start_date`, `report_end_date`, `status`
- MergedReport: `created_by`, `merge_type`, `report_start_date`, `report_end_date`
- UploadedFile: `uploaded_by`, `uploaded_at`

설계 메모:

- 관리자 화면은 기간/팀원/단위업무 필터가 중요하므로 해당 조합 조회를 빠르게 해야 한다.
- 일반사용자 화면은 본인 데이터와 보고 기간 기준 조회가 많다.

## 10. 데이터 보존 및 수정 정책

업무 항목:

- 사용자는 제출 전까지 자유롭게 수정할 수 있다.
- 제출 후 수정 허용 여부는 정책 결정이 필요하다.
- 제출 후 수정 가능하게 할 경우 관리자 병합 결과와 차이가 생길 수 있어 수정 이력을 남기는 것이 좋다.

병합 보고서:

- 자동 병합 결과와 사용자가 직접 수정한 최종 텍스트는 구분해야 한다.
- 최종 텍스트는 `MergedReport.merged_text`에 저장한다.
- 원본 항목 연결은 `MergedReportItem`에 보존한다.

업로드 파일:

- 원본 파일 보관은 선택 사항이다.
- 업로드 결과와 오류 추적은 DB에 남기는 것이 좋다.

## 11. MVP 범위 제안

최소 구현에 필요한 테이블:

- User
- UnitTask
- WeeklyReportItem
- MergedReport

MVP에서 생략 가능하지만 곧 필요해질 테이블:

- ReportSubmission
- ReportSubmissionItem
- MergedReportItem
- UploadedFile
- UploadedFileRow

권장 MVP 접근:

1. User, UnitTask, WeeklyReportItem으로 로그인 후 작성/저장/수정/조회 구현
2. MergedReport로 병합 텍스트 저장 구현
3. 관리자 조회 화면이 시작될 때 ReportSubmission 추가
4. CSV 업로드 오류 추적이 필요해질 때 UploadedFile, UploadedFileRow 추가

## 12. 미결정 사항

다음 항목은 구현 전 결정이 필요하다.

- 관리자 role을 회원가입 즉시 허용할지, 승인제로 운영할지
- 제출 후 일반사용자의 수정 가능 여부
- 단위업무를 관리자가 사전 등록할지, 사용자가 자유 입력할지
- CSV 원본 파일을 보관할지, 파싱된 항목만 저장할지
- CSV 업로드 후 금주/차주/모두 선택 이력을 별도로 남길지
- 병합 결과의 버전 이력을 남길지
- 팀 또는 부서 개념이 필요한지

## 13. 결론

요구사항 기준으로 DB는 필수이며, 핵심은 `User`, `UnitTask`, `WeeklyReportItem`, `MergedReport`다. 협업과 관리자 취합을 안정적으로 지원하려면 제출 묶음과 업로드 이력도 별도 엔터티로 분리하는 것이 좋다.

현재는 SQL을 작성하지 않고, 위 설계를 기준으로 구현 기술과 DB 제품을 결정한 뒤 실제 스키마를 작성하는 순서가 적절하다.

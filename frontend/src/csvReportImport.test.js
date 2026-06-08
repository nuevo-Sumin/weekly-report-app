import assert from 'node:assert/strict';
import {
  filterCsvRowsForReportPeriod,
  parseReportCsv,
  parseReportCsvBufferWithErrors,
  parseReportCsvWithErrors,
} from './csvReportImport.js';

function encodeCsv(text) {
  return new TextEncoder().encode(text).buffer;
}

const validCsv = [
  '#,제목,상태,범주,진척도,완료기한,완료일',
  '1,정상 업무,진행중,공통,50,2026-05-29',
].join('\n');

const mixedCsv = [
  '#,제목,상태,범주,진척도,완료기한',
  '1,정상 업무,진행중,공통,50,2026-05-29',
  '2,,진행중,공통,20,',
  '3,상태 오류,알수없음,공통,10,',
  '4,진척도 오류,진행중,공통,150,',
  '5,날짜 오류,진행중,공통,10,2026년 5월 29일',
].join('\n');

{
  const result = parseReportCsvWithErrors(mixedCsv);

  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].title, '정상 업무');
  assert.equal(result.rows[0].category, 'EXECUTION');
  assert.equal(result.rows[0].detailContent, '정상 업무');
  assert.equal(result.rows[0].dueDate, '2026-05-29');
  assert.deepEqual(result.errors.map((error) => error.lineNumber), [3, 4, 5, 6]);
}

{
  const result = parseReportCsvBufferWithErrors(encodeCsv(mixedCsv));

  assert.equal(result.rows.length, 1);
  assert.equal(result.errors.length, 4);
}

{
  const allInvalidCsv = [
    '#,제목,상태,진척도',
    '1,,진행중,10',
    '2,상태 오류,기타,10',
  ].join('\n');
  const result = parseReportCsvWithErrors(allInvalidCsv);

  assert.equal(result.rows.length, 0);
  assert.equal(result.errors.length, 2);
}

{
  assert.throws(
    () => parseReportCsvWithErrors('제목,상태\n정상 업무,진행중'),
    /CSV 헤더에 #\/제목\/상태 컬럼이 필요합니다\./
  );
}

{
  const rows = parseReportCsv(validCsv);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, 'IN_PROGRESS');
}

{
  const dueRequestCsv = [
    '#,제목,상태,범주,진척도,완료기한,완료요청일',
    '1,완료기한 우선,진행중,공통,50,2026-06-05,2026-06-10',
    '2,요청일 대체,진행중,공통,50,,2026-06-11',
  ].join('\n');
  const rows = parseReportCsv(dueRequestCsv);

  assert.deepEqual(rows.map((row) => row.dueDate), ['2026-06-05', '2026-06-11']);
}

{
  const dueRequestOnlyCsv = [
    '#,제목,상태,범주,진척도,완료요청일',
    '1,요청일만 있음,진행중,공통,50,2026-06-12',
  ].join('\n');
  const rows = parseReportCsv(dueRequestOnlyCsv);

  assert.equal(rows[0].dueDate, '2026-06-12');
}

{
  assert.throws(
    () => parseReportCsv(mixedCsv),
    /3행의 제목이 비어 있습니다\./
  );
}

{
  const completedCsv = [
    '#,제목,상태,범주,진척도,완료기한,완료일',
    '1,기간 안 완료,완료,공통,100,2026-06-03,2026-05-27',
    '2,기간 밖 완료,완료,공통,100,2026-05-27,2026-06-03',
    '3,완료일 없음,완료,공통,100,2026-05-27,',
    '4,진행중 업무,진행중,공통,50,2026-06-03,',
  ].join('\n');

  const parsed = parseReportCsvWithErrors(completedCsv);
  const result = filterCsvRowsForReportPeriod(parsed.rows, {
    startDate: '2026-05-26',
    endDate: '2026-05-30',
  });

  assert.deepEqual(result.rows.map((row) => row.title), ['기간 안 완료', '진행중 업무']);
  assert.deepEqual(result.skipped.map((row) => row.lineNumber), [3, 4]);
  assert.equal(parsed.rows[0].completedDate, '2026-05-27');
}

{
  const skippedOrderCsv = [
    '#,제목,상태,범주,진척도,완료기한,완료일',
    '1,오래된 완료,완료,공통,100,2026-05-20,2026-05-20',
    '2,최신 완료,완료,공통,100,2026-06-03,2026-06-03',
    '3,중간 완료,완료,공통,100,2026-05-27,2026-05-27',
  ].join('\n');

  const parsed = parseReportCsvWithErrors(skippedOrderCsv);
  const result = filterCsvRowsForReportPeriod(parsed.rows, {
    startDate: '2026-05-28',
    endDate: '2026-05-30',
  });

  assert.deepEqual(result.skipped.map((row) => row.title), ['최신 완료', '중간 완료', '오래된 완료']);
}

{
  const excludedStatusCsv = [
    '#,제목,상태,범주,진척도,완료기한,완료일',
    '1,반려 업무,반려,공통,100,2026-06-03,2026-06-03',
    '2,폐기 업무,폐기,공통,50,2026-06-04,',
    '3,정상 업무,진행중,공통,50,2026-06-05,',
  ].join('\n');

  const parsed = parseReportCsvWithErrors(excludedStatusCsv);
  const result = filterCsvRowsForReportPeriod(parsed.rows, {
    startDate: '2026-06-01',
    endDate: '2026-06-05',
  });

  assert.equal(parsed.errors.length, 0);
  assert.deepEqual(result.rows.map((row) => row.title), ['정상 업무']);
  assert.deepEqual(result.skipped.map((row) => row.reason), ['STATUS_EXCLUDED', 'STATUS_EXCLUDED']);
  assert.deepEqual(result.skipped.map((row) => row.status), ['REJECTED', 'DISCARDED']);
}

{
  const invalidCompletedDateCsv = [
    '#,제목,상태,범주,진척도,완료일',
    '1,완료일 오류,완료,공통,100,2026년 5월 27일',
  ].join('\n');
  const result = parseReportCsvWithErrors(invalidCompletedDateCsv);

  assert.equal(result.rows.length, 0);
  assert.match(result.errors[0].message, /완료일은 YYYY-MM-DD 형식이어야 합니다/);
}

{
  const unitTaskMappedCsv = [
    '#,제목,상태,범주,진척도',
    '1,개인정보 업무,진행중,개인정보보호,10',
    '2,연계 업무,진행중,연계,10',
    '3,상담 업무,진행중,청상복,10',
    '4,학교밖 업무,진행중,학교밖,10',
    '5,가정밖 업무,진행중,쉼터,10',
    '6,보호치료 업무,진행중,디딤센터,10',
  ].join('\n');
  const result = parseReportCsvWithErrors(unitTaskMappedCsv);

  assert.deepEqual(result.rows.map((row) => row.unitTask), [
    '공통',
    '공통',
    '청소년상담복지센터(디지털과의존대응부)',
    '학교밖청소년지원센터',
    '가정밖청소년지원부(쉼터/자립/회복)',
    '청소년보호치료센터',
  ]);
}

{
  const unorderedCsv = [
    '#,제목,상태,범주,진척도,완료기한',
    '1,보호치료 업무,진행중,청소년보호치료센터,10,2026-06-05',
    '2,공통 업무,진행중,개인정보,50,2026-06-02',
    '3,학교밖 업무,진행중,학교밖,10,2026-06-03',
    '4,상담 업무,진행중,청소년상담복지센터,10,2026-06-01',
    '5,가정밖 업무,진행중,가정밖,10,2026-06-04',
  ].join('\n');

  const parsed = parseReportCsvWithErrors(unorderedCsv);
  const result = filterCsvRowsForReportPeriod(parsed.rows, {
    startDate: '2026-06-01',
    endDate: '2026-06-05',
  });

  assert.deepEqual(result.rows.map((row) => row.unitTask), [
    '공통',
    '청소년상담복지센터(디지털과의존대응부)',
    '학교밖청소년지원센터',
    '가정밖청소년지원부(쉼터/자립/회복)',
    '청소년보호치료센터',
  ]);
}

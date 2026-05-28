import assert from 'node:assert/strict';
import {
  parseReportCsv,
  parseReportCsvBufferWithErrors,
  parseReportCsvWithErrors,
} from './csvReportImport.js';

function encodeCsv(text) {
  return new TextEncoder().encode(text).buffer;
}

const validCsv = [
  '#,제목,상태,범주,진척도,완료기한',
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
  assert.throws(
    () => parseReportCsv(mixedCsv),
    /3행의 제목이 비어 있습니다\./
  );
}

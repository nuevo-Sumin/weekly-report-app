import assert from 'node:assert/strict';
import { extractWeekSection } from './reportPreview.js';

const mergedText = [
  '[금주]',
  '',
  '1. 사업관리',
  '- 금주 업무',
  '',
  '-------------------------------------------------------------------',
  '',
  '[차주]',
  '',
  '1. 사업관리',
  '- 차주 업무',
].join('\n');

{
  const result = extractWeekSection(mergedText, 'THIS_WEEK');

  assert.equal(result.found, true);
  assert.match(result.text, /금주 업무/);
  assert.doesNotMatch(result.text, /차주 업무/);
  assert.doesNotMatch(result.text, /---/);
}

{
  const result = extractWeekSection(mergedText, 'NEXT_WEEK');

  assert.equal(result.found, true);
  assert.match(result.text, /차주 업무/);
  assert.doesNotMatch(result.text, /금주 업무/);
}

{
  const result = extractWeekSection('사용자가 직접 수정한 텍스트', 'NEXT_WEEK');

  assert.equal(result.found, false);
  assert.equal(result.text, '사용자가 직접 수정한 텍스트');
}

{
  const editedHeaderText = [
    '[금주]',
    '- 금주 업무',
    '',
    '-------------------------------------------------------------------',
    '',
    '[ 차주 ]:',
    '- 차주 업무',
  ].join('\n');
  const result = extractWeekSection(editedHeaderText, 'THIS_WEEK');

  assert.equal(result.found, true);
  assert.match(result.text, /금주 업무/);
  assert.doesNotMatch(result.text, /차주 업무/);
}

{
  const editedHeaderText = [
    '## [차주]',
    '- 차주 업무',
  ].join('\n');
  const result = extractWeekSection(editedHeaderText, 'NEXT_WEEK');

  assert.equal(result.found, true);
  assert.equal(result.text, '- 차주 업무');
}

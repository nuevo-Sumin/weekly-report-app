import assert from 'node:assert/strict';
import { getPreviousWeekRange, getWeekRange, toDateInputValue } from './dateUtils.js';

{
  const localDate = new Date(2026, 5, 1, 0, 30, 0);

  assert.equal(toDateInputValue(localDate), '2026-06-01');
}

{
  assert.deepEqual(getWeekRange('2026-06-01'), {
    startDate: '2026-06-01',
    endDate: '2026-06-05',
  });
}

{
  assert.deepEqual(getWeekRange('2026-06-07'), {
    startDate: '2026-06-01',
    endDate: '2026-06-05',
  });
}

{
  assert.deepEqual(getPreviousWeekRange('2026-06-09'), {
    startDate: '2026-06-01',
    endDate: '2026-06-05',
  });
}

{
  assert.deepEqual(getPreviousWeekRange('2026-06-01'), {
    startDate: '2026-05-25',
    endDate: '2026-05-29',
  });
}

import { compareUnitTasks, normalizeUnitTaskName } from './constants.js';

const headerAliases = {
  sourceKey: ['#', 'ID', '아이디'],
  unitTask: ['범주', '단위업무'],
  title: ['제목', '세부사항'],
  progressContent: ['진행내용'],
  status: ['상태'],
  progressRate: ['진척도', '진행률'],
  dueDate: ['완료기한'],
  completedDate: ['완료일'],
  completed: ['완료여부'],
};

function normalizeHeader(value) {
  return String(value ?? '').trim();
}

function findHeaderIndex(headers, aliases) {
  return aliases
    .map((alias) => headers.findIndex((header) => header === alias))
    .find((index) => index >= 0) ?? -1;
}

function parseCsv(text) {
  const rows = [];
  let rowStartLine = 1;
  let lineNumber = 1;
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const current = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (current === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (current === '"') {
        inQuotes = false;
      } else {
        field += current;
        if (current === '\n') {
          lineNumber += 1;
        }
      }
      continue;
    }

    if (current === '"') {
      inQuotes = true;
    } else if (current === ',') {
      row.push(field.trim());
      field = '';
    } else if (current === '\n' || current === '\r') {
      if (field || row.length > 0) {
        row.push(field.trim());
        rows.push({ values: row, lineNumber: rowStartLine });
        row = [];
        field = '';
      }
      if (current === '\r' && next === '\n') {
        index += 1;
      }
      lineNumber += 1;
      rowStartLine = lineNumber;
    } else {
      field += current;
    }
  }

  if (inQuotes) {
    throw new Error('CSV 따옴표가 닫히지 않았습니다.');
  }

  if (field || row.length > 0) {
    row.push(field.trim());
    rows.push({ values: row, lineNumber: rowStartLine });
  }

  return rows.filter((candidate) => candidate.values.some((value) => value !== ''));
}

function parseStatus(rawStatus, progressRate, rowNumber) {
  const status = String(rawStatus ?? '').trim().toUpperCase();
  if (progressRate >= 100) {
    return 'DONE';
  }
  if (['신규', 'NEW'].includes(status)) {
    return 'NEW';
  }
  if (['진행중', '진행 중', '진행', 'IN_PROGRESS'].includes(status)) {
    return 'IN_PROGRESS';
  }
  if (['완료', 'DONE'].includes(status)) {
    return 'DONE';
  }
  if (['보류', 'HOLD'].includes(status)) {
    return 'HOLD';
  }
  throw new Error(`${rowNumber}행의 상태 값이 올바르지 않습니다.`);
}

function parseProgressRate(rawProgressRate, rowNumber) {
  const normalized = String(rawProgressRate ?? '').replace('%', '').trim();
  if (!normalized) {
    return 0;
  }

  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${rowNumber}행의 진척도는 0부터 100 사이여야 합니다.`);
  }

  const progressRate = Number.parseInt(normalized, 10);
  if (Number.isNaN(progressRate) || progressRate < 0 || progressRate > 100) {
    throw new Error(`${rowNumber}행의 진척도는 0부터 100 사이여야 합니다.`);
  }
  return progressRate;
}

function parseCompleted(rawCompleted, status, progressRate) {
  const completed = String(rawCompleted ?? '').trim().toLowerCase();
  if (!completed) {
    return status === 'DONE' || progressRate >= 100;
  }
  return ['y', 'yes', 'true', '1', '완료', '예'].includes(completed);
}

function normalizeCsvUnitTask(rawUnitTask) {
  return normalizeUnitTaskName(rawUnitTask);
}

function parseDateField(rawDate, rowNumber, fieldLabel) {
  const value = String(rawDate ?? '').trim();
  if (!value) {
    return '';
  }

  const match = value.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (!match) {
    throw new Error(`${rowNumber}행의 ${fieldLabel}은 YYYY-MM-DD 형식이어야 합니다.`);
  }

  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function parseDueDate(rawDueDate, rowNumber) {
  return parseDateField(rawDueDate, rowNumber, '완료기한');
}

function parseCompletedDate(rawCompletedDate, rowNumber) {
  return parseDateField(rawCompletedDate, rowNumber, '완료일');
}

export function parseReportCsv(text) {
  const { rows, errors } = parseReportCsvWithErrors(text);
  if (errors.length > 0) {
    throw new Error(errors[0].message);
  }
  return rows;
}

export function parseReportCsvWithErrors(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    throw new Error('CSV에 가져올 데이터가 없습니다.');
  }

  const headers = rows[0].values.map(normalizeHeader);
  const indexes = Object.fromEntries(
    Object.entries(headerAliases).map(([field, aliases]) => [field, findHeaderIndex(headers, aliases)])
  );

  if (indexes.sourceKey === -1 || indexes.title === -1 || indexes.status === -1) {
    throw new Error('CSV 헤더에 #/제목/상태 컬럼이 필요합니다.');
  }

  return rows.slice(1).reduce((acc, { values: row, lineNumber }) => {
    const rowNumber = lineNumber;
    try {
      const title = row[indexes.title]?.trim();
      if (!title) {
        throw new Error(`${rowNumber}행의 제목이 비어 있습니다.`);
      }

      const progressRate = parseProgressRate(row[indexes.progressRate], rowNumber);
      const status = parseStatus(row[indexes.status], progressRate, rowNumber);
      const csvId = row[indexes.sourceKey]?.trim();
      if (!csvId) {
        throw new Error(`${rowNumber}행의 # 값이 비어 있습니다.`);
      }

      acc.rows.push({
        tempId: `csv-${rowNumber}-${title}`,
        selected: true,
        weekSelection: 'THIS_WEEK',
        sourceKey: csvId,
        sourceRowNumber: rowNumber,
        category: 'EXECUTION',
        unitTask: indexes.unitTask >= 0 ? normalizeCsvUnitTask(row[indexes.unitTask]) : '미분류',
        title,
        detailContent: title,
        progressContent: indexes.progressContent >= 0 ? (row[indexes.progressContent]?.trim() || title) : title,
        status,
        progressRate,
        dueDate: indexes.dueDate >= 0 ? parseDueDate(row[indexes.dueDate], rowNumber) : '',
        completedDate: indexes.completedDate >= 0 ? parseCompletedDate(row[indexes.completedDate], rowNumber) : '',
        completed: parseCompleted(row[indexes.completed], status, progressRate),
      });
    } catch (error) {
      acc.errors.push({
        lineNumber: rowNumber,
        message: error.message,
      });
    }
    return acc;
  }, { rows: [], errors: [] });
}

export function parseReportCsvBuffer(buffer) {
  return parseReportCsv(decodeCsvBuffer(buffer));
}

export function parseReportCsvBufferWithErrors(buffer) {
  return parseReportCsvWithErrors(decodeCsvBuffer(buffer));
}

export function filterCsvRowsForReportPeriod(rows, weekRange) {
  const filtered = rows.reduce((acc, row) => {
    if (!row.completed && row.status !== 'DONE') {
      acc.rows.push(row);
      return acc;
    }

    if (row.completedDate && row.completedDate >= weekRange.startDate && row.completedDate <= weekRange.endDate) {
      acc.rows.push(row);
      return acc;
    }

    acc.skipped.push({
      lineNumber: row.sourceRowNumber,
      sourceKey: row.sourceKey,
      title: row.title,
      completedDate: row.completedDate,
      message: row.completedDate
        ? `${row.sourceRowNumber}행의 완료 항목은 보고기간 밖 완료일이라 제외했습니다.`
        : `${row.sourceRowNumber}행의 완료 항목은 완료일이 없어 제외했습니다.`,
    });
    return acc;
  }, { rows: [], skipped: [] });

  const statusOrder = {
    DONE: 0,
    IN_PROGRESS: 1,
    HOLD: 2,
    NEW: 3,
  };
  filtered.rows.sort((first, second) => (
    compareUnitTasks(first.unitTask, second.unitTask)
    || (statusOrder[first.status] ?? 99) - (statusOrder[second.status] ?? 99)
    || String(first.dueDate || '9999-12-31').localeCompare(String(second.dueDate || '9999-12-31'))
    || first.sourceRowNumber - second.sourceRowNumber
  ));
  filtered.skipped.sort((first, second) => (
    String(second.completedDate || '0000-00-00').localeCompare(String(first.completedDate || '0000-00-00'))
    || first.lineNumber - second.lineNumber
  ));

  return filtered;
}

function decodeCsvBuffer(buffer) {
  let text;

  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch (error) {
    text = new TextDecoder('euc-kr').decode(buffer);
  }

  return text.replace(/^\uFEFF/, '');
}

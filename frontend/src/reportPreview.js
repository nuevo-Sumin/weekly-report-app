import { compareUnitTasks, statusLabels, weekTypeLabels, normalizeUnitTaskName } from './constants.js';

const weekOrder = ['THIS_WEEK', 'NEXT_WEEK'];

function formatShortDate(dateValue) {
  if (!dateValue) {
    return '';
  }
  const [, month, day] = dateValue.split('-');
  return `${Number(month)}/${Number(day)}`;
}

export function formatReportItemDueLabel(item) {
  if (item.completed || item.status === 'DONE' || Number(item.progressRate) >= 90) {
    return '완료';
  }
  if (item.dueDate) {
    return `~${formatShortDate(item.dueDate)}`;
  }
  return statusLabels[item.status] ?? '';
}

function buildTitleLine(item) {
  const suffix = formatReportItemDueLabel(item);
  return suffix ? `- ${item.title}(${suffix})` : `- ${item.title}`;
}

function normalizeUnitTask(unitTask) {
  return normalizeUnitTaskName(unitTask);
}

function normalizeContentLine(line) {
  return line
    .trim()
    .replace(/^[-•․]\s*/, '')
    .trim();
}

function splitContentLines(value) {
  return String(value ?? '')
    .split(/\r?\n/)
    .map(normalizeContentLine)
    .filter(Boolean);
}

function buildItemBlock(item) {
  const detailLines = splitContentLines(item.detailContent);
  const progressLines = splitContentLines(item.progressContent);
  const title = normalizeContentLine(item.title);
  const contentLines = [];

  [...detailLines, ...progressLines].forEach((line) => {
    if (line !== title && !contentLines.includes(line)) {
      contentLines.push(line);
    }
  });

  if (contentLines.length === 0) {
    return [buildTitleLine(item)];
  }

  return [
    buildTitleLine(item),
    ...contentLines.map((line) => ` ․ ${line}`),
  ];
}

function groupByUnitTask(items) {
  return items.reduce((acc, item) => {
    const unitTask = normalizeUnitTask(item.unitTask);
    acc[unitTask] = [...(acc[unitTask] ?? []), item];
    return acc;
  }, {});
}

export function buildPreview(items, selectedIds) {
  const selectedItems = items.filter((item) => selectedIds.includes(item.id));

  if (selectedItems.length === 0) {
    return '선택된 항목이 없습니다.';
  }

  return buildWeeklyReportText(selectedItems);
}

export function buildAdminPreview(items, selectedIds) {
  const selectedItems = items.filter((item) => selectedIds.includes(item.id));

  if (selectedItems.length === 0) {
    return '선택된 항목이 없습니다.';
  }

  return buildWeeklyReportText(selectedItems);
}

export function extractWeekSection(text, weekType) {
  const rawText = String(text ?? '').trim();
  if (!rawText) {
    return { text: '', found: false };
  }

  const label = weekTypeLabels[weekType];
  if (!label) {
    return { text: rawText, found: false };
  }

  const lines = rawText.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => getWeekHeaderType(line) === weekType);
  if (startIndex === -1) {
    return { text: rawText, found: false };
  }

  const endIndex = lines.findIndex((line, index) => (
    index > startIndex && getWeekHeaderType(line)
  ));
  const sectionLines = trimSectionBoundaryLines(lines.slice(startIndex + 1, endIndex === -1 ? undefined : endIndex));

  return {
    text: sectionLines.join('\n').trim(),
    found: true,
  };
}

function getWeekHeaderType(line) {
  const normalized = String(line ?? '')
    .trim()
    .replace(/^#+\s*/, '')
    .replace(/[：:]\s*$/, '')
    .trim();

  const bracketMatch = normalized.match(/^\[\s*(금주|차주)\s*\]$/);
  const label = bracketMatch?.[1] ?? normalized.match(/^(금주|차주)$/)?.[1];

  return Object.entries(weekTypeLabels)
    .find(([, candidateLabel]) => candidateLabel === label)?.[0] ?? null;
}

function trimSectionBoundaryLines(lines) {
  let startIndex = 0;
  let endIndex = lines.length;

  while (startIndex < endIndex && isSectionBoundaryLine(lines[startIndex])) {
    startIndex += 1;
  }
  while (endIndex > startIndex && isSectionBoundaryLine(lines[endIndex - 1])) {
    endIndex -= 1;
  }

  return lines.slice(startIndex, endIndex);
}

function isSectionBoundaryLine(line) {
  const trimmed = line.trim();
  return !trimmed || /^-{5,}$/.test(trimmed);
}

function appendItemBlocks(lines, items) {
  items.forEach((item) => lines.push(...buildItemBlock(item)));
}

function buildWeekSection(weekType, items) {
  const weeklyItems = items.filter((item) => item.weekType === weekType);
  const businessItems = weeklyItems.filter((item) => item.category === 'BUSINESS_MANAGEMENT');
  const executionItems = weeklyItems.filter((item) => item.category !== 'BUSINESS_MANAGEMENT');
  const executionGroups = Object.entries(groupByUnitTask(executionItems))
    .sort(([firstUnitTask], [secondUnitTask]) => compareUnitTasks(firstUnitTask, secondUnitTask));
  const lines = [
    `[${weekTypeLabels[weekType]}]`,
    '',
    '1. 사업관리',
  ];

  appendItemBlocks(lines, businessItems);

  lines.push('', '', '2. 수행');

  executionGroups.forEach(([unitTask, groupItems], index) => {
    if (index > 0) {
      lines.push('');
    }
    lines.push(`(${index + 1})${unitTask}`);
    appendItemBlocks(lines, groupItems);
  });

  return lines.join('\n').trimEnd();
}

function buildWeeklyReportText(items) {
  const sections = weekOrder.map((weekType) => buildWeekSection(weekType, items));

  return [
    sections[0],
    '',
    '-------------------------------------------------------------------',
    '',
    sections[1],
  ].join('\n');
}

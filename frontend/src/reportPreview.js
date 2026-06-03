import { statusLabels, weekTypeLabels } from './constants';

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
  const normalized = String(unitTask || '미분류').trim();
  return ['개인정보보호', '연계'].includes(normalized) ? '공통' : normalized;
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

function appendItemBlocks(lines, items) {
  items.forEach((item) => lines.push(...buildItemBlock(item)));
}

function buildWeekSection(weekType, items) {
  const weeklyItems = items.filter((item) => item.weekType === weekType);
  const businessItems = weeklyItems.filter((item) => item.category === 'BUSINESS_MANAGEMENT');
  const executionItems = weeklyItems.filter((item) => item.category !== 'BUSINESS_MANAGEMENT');
  const executionGroups = Object.entries(groupByUnitTask(executionItems));
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

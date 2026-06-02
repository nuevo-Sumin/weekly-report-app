import { formatDate } from './dateUtils';
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

function groupByUnitTask(items) {
  return items.reduce((acc, item) => {
    const unitTask = item.unitTask || '미분류';
    acc[unitTask] = [...(acc[unitTask] ?? []), item];
    return acc;
  }, {});
}

export function buildPreview(items, selectedIds) {
  const selectedItems = items.filter((item) => selectedIds.includes(item.id));

  if (selectedItems.length === 0) {
    return '선택된 항목이 없습니다.';
  }

  const sections = weekOrder.map((weekType) => {
    const weeklyItems = selectedItems.filter((item) => item.weekType === weekType);
    const grouped = groupByUnitTask(weeklyItems);

    const lines = Object.entries(grouped).flatMap(([unitTask, groupItems]) => [
      `[${unitTask}]`,
      ...groupItems.map(buildTitleLine),
    ]);

    return [`### ${weekTypeLabels[weekType]}`, ...(lines.length ? lines : ['선택된 항목 없음'])].join('\n');
  });

  return [
    `## 주간업무보고 (${formatDate(selectedItems[0].reportStartDate)} ~ ${formatDate(selectedItems[0].reportEndDate)})`,
    '',
    ...sections,
  ].join('\n\n');
}

export function buildAdminPreview(items, selectedIds) {
  const selectedItems = items.filter((item) => selectedIds.includes(item.id));

  if (selectedItems.length === 0) {
    return '선택된 항목이 없습니다.';
  }

  const sections = weekOrder.map((weekType) => {
    const weeklyItems = selectedItems.filter((item) => item.weekType === weekType);
    const businessItems = weeklyItems.filter((item) => item.category === 'BUSINESS_MANAGEMENT');
    const executionItems = weeklyItems.filter((item) => item.category !== 'BUSINESS_MANAGEMENT');
    const executionGroups = Object.entries(groupByUnitTask(executionItems));
    const executionLines = executionGroups.flatMap(([unitTask, groupItems], index) => [
      `(${index + 1}) ${unitTask}`,
      ...groupItems.map(buildTitleLine),
      '',
    ]);

    return [
      `[${weekTypeLabels[weekType]}]`,
      '1. 사업관리',
      ...(businessItems.length ? businessItems.map(buildTitleLine) : []),
      '',
      '2. 수행',
      ...(executionLines.length ? executionLines.slice(0, -1) : []),
    ].join('\n').trimEnd();
  });

  return [
    sections[0],
    '',
    '-------------------------------------------------------------------',
    '',
    sections[1],
  ].join('\n');
}

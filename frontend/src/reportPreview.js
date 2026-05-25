import { formatDate } from './dateUtils';
import { weekTypeLabels } from './constants';

export function buildPreview(items, selectedIds) {
  const selectedItems = items.filter((item) => selectedIds.includes(item.id));

  if (selectedItems.length === 0) {
    return '선택된 항목이 없습니다.';
  }

  const [firstItem] = selectedItems;
  const sections = ['THIS_WEEK', 'NEXT_WEEK'].map((weekType) => {
    const weeklyItems = selectedItems.filter((item) => item.weekType === weekType);
    const grouped = weeklyItems.reduce((acc, item) => {
      acc[item.unitTask] = [...(acc[item.unitTask] ?? []), item];
      return acc;
    }, {});

    const lines = Object.entries(grouped).flatMap(([unitTask, groupItems]) => [
      `[${unitTask}]`,
      ...groupItems.map((item) => `- ${item.title}: ${item.progressContent}`),
    ]);

    return [`### ${weekTypeLabels[weekType]}`, ...(lines.length ? lines : ['선택된 항목 없음'])].join('\n');
  });

  return [
    `## 주간업무보고 (${formatDate(firstItem.reportStartDate)} ~ ${formatDate(firstItem.reportEndDate)})`,
    '',
    ...sections,
  ].join('\n\n');
}


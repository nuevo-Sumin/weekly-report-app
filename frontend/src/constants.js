export const initialLoginForm = {
  loginId: '',
  password: '',
  autoLogin: false,
};

export const initialSignupForm = {
  loginId: '',
  password: '',
  passwordConfirm: '',
  emailLocal: '',
  emailDomain: 'metabuild.co.kr',
  name: '',
  requestedRole: 'USER',
};

export const initialFindForm = {
  email: '',
};

export const initialReportForm = {
  id: null,
  weekType: 'THIS_WEEK',
  category: 'BUSINESS_MANAGEMENT',
  unitTask: '',
  title: '',
  detailContent: '',
  progressContent: '',
  status: 'IN_PROGRESS',
  progressRate: 0,
  dueDate: '',
  completed: false,
};

export const statusLabels = {
  NEW: '신규',
  IN_PROGRESS: '진행중',
  DONE: '완료',
  HOLD: '보류',
};

export const weekTypeLabels = {
  THIS_WEEK: '금주',
  NEXT_WEEK: '차주',
};

export const csvWeekSelectionLabels = {
  THIS_WEEK: '금주',
  NEXT_WEEK: '차주',
  ALL: '모두',
};

export const categoryLabels = {
  BUSINESS_MANAGEMENT: '사업관리',
  EXECUTION: '수행',
};

export const unitTaskOrder = [
  '공통',
  '청소년상담복지센터(디지털과의존대응부)',
  '학교밖청소년지원센터',
  '가정밖청소년지원부(쉼터/자립/회복)',
  '청소년보호치료센터',
];

const unitTaskAliasRules = [
  {
    label: '공통',
    keywords: ['공통', '개인정보보호', '개인정보', '범정부연계', '연계'],
  },
  {
    label: '청소년상담복지센터(디지털과의존대응부)',
    keywords: ['청소년상담복지센터', '상담복지센터', '디지털과의존대응부', '디지털과의존', '청상복'],
  },
  {
    label: '학교밖청소년지원센터',
    keywords: ['학교밖청소년지원센터', '학교밖청소년', '학교밖'],
  },
  {
    label: '가정밖청소년지원부(쉼터/자립/회복)',
    keywords: ['가정밖청소년지원부', '가정밖청소년', '가정밖', '쉼터', '자립', '회복'],
  },
  {
    label: '청소년보호치료센터',
    keywords: ['청소년보호치료센터', '보호치료센터', '보호치료', '디딤센터'],
  },
];

function compactUnitTask(value) {
  return String(value ?? '')
    .trim()
    .replace(/[\s()[\]{}（）/·ㆍ.,_-]/g, '')
    .toLowerCase();
}

export function normalizeUnitTaskName(unitTask) {
  const trimmed = String(unitTask ?? '').trim();
  if (!trimmed) {
    return '미분류';
  }

  const compacted = compactUnitTask(trimmed);
  const rule = unitTaskAliasRules.find((candidate) => (
    candidate.keywords.some((keyword) => compacted.includes(compactUnitTask(keyword)))
  ));

  return rule?.label ?? trimmed;
}

export function getUnitTaskOrder(unitTask) {
  const normalized = normalizeUnitTaskName(unitTask);
  const index = unitTaskOrder.indexOf(normalized);
  return index === -1 ? unitTaskOrder.length : index;
}

export function compareUnitTasks(first, second) {
  const firstUnitTask = normalizeUnitTaskName(first);
  const secondUnitTask = normalizeUnitTaskName(second);
  const orderDiff = getUnitTaskOrder(firstUnitTask) - getUnitTaskOrder(secondUnitTask);
  return orderDiff || firstUnitTask.localeCompare(secondUnitTask, 'ko');
}

const weekTypeSortOrder = {
  THIS_WEEK: 0,
  NEXT_WEEK: 1,
};

const reportItemStatusSortOrder = {
  DONE: 0,
  IN_PROGRESS: 1,
  HOLD: 2,
  NEW: 3,
};

export function normalizeReportItemUnitTask(item) {
  return {
    ...item,
    unitTask: item.category === 'BUSINESS_MANAGEMENT' ? '사업관리' : normalizeUnitTaskName(item.unitTask),
  };
}

export function compareReportItemsByUnitTask(first, second) {
  const firstCategoryOrder = first.category === 'BUSINESS_MANAGEMENT' ? 0 : 1;
  const secondCategoryOrder = second.category === 'BUSINESS_MANAGEMENT' ? 0 : 1;

  return firstCategoryOrder - secondCategoryOrder
    || compareUnitTasks(first.unitTask, second.unitTask)
    || (weekTypeSortOrder[first.weekType] ?? 99) - (weekTypeSortOrder[second.weekType] ?? 99)
    || (reportItemStatusSortOrder[first.status] ?? 99) - (reportItemStatusSortOrder[second.status] ?? 99)
    || String(first.dueDate || '9999-12-31').localeCompare(String(second.dueDate || '9999-12-31'))
    || String(first.id ?? first.sourceRowNumber ?? '').localeCompare(String(second.id ?? second.sourceRowNumber ?? ''), 'ko');
}

export const issueBaseUrl = import.meta.env?.VITE_ISSUE_BASE_URL || 'https://support.kyci.or.kr/redmine';

export function buildIssueUrl(sourceKey) {
  return `${issueBaseUrl.replace(/\/$/, '')}/${encodeURIComponent(String(sourceKey).replace(/^#/, ''))}`;
}

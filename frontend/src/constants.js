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
  category: 'EXECUTION',
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

export const issueBaseUrl = import.meta.env.VITE_ISSUE_BASE_URL || 'https://support.kyci.or.kr/redmine';

export function buildIssueUrl(sourceKey) {
  return `${issueBaseUrl.replace(/\/$/, '')}/${encodeURIComponent(String(sourceKey).replace(/^#/, ''))}`;
}

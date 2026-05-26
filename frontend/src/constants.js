export const initialLoginForm = {
  loginId: '',
  password: '',
  rememberId: false,
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

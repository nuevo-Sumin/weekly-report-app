import { useEffect, useMemo, useState } from 'react';

const initialLoginForm = {
  loginId: '',
  password: '',
  rememberId: false,
};

const initialSignupForm = {
  loginId: '',
  password: '',
  email: '',
  name: '',
  requestedRole: 'USER',
};

const initialFindForm = {
  email: '',
};

const initialReportForm = {
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

const statusLabels = {
  NEW: '신규',
  IN_PROGRESS: '진행중',
  DONE: '완료',
  HOLD: '보류',
};

const weekTypeLabels = {
  THIS_WEEK: '금주',
  NEXT_WEEK: '차주',
};

function toDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

function getWeekRange(dateValue) {
  const date = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    startDate: toDateInputValue(monday),
    endDate: toDateInputValue(sunday),
  };
}

function formatDate(dateValue) {
  return dateValue.replaceAll('-', '.');
}

function buildPreview(items, selectedIds) {
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

function App() {
  const rememberedId = useMemo(() => localStorage.getItem('weekly-report-login-id') ?? '', []);
  const savedToken = useMemo(() => localStorage.getItem('weekly-report-access-token') ?? '', []);
  const savedUserName = useMemo(() => localStorage.getItem('weekly-report-user-name') ?? '', []);
  const savedUserRole = useMemo(() => localStorage.getItem('weekly-report-user-role') ?? 'USER', []);
  const savedRequestedRole = useMemo(() => localStorage.getItem('weekly-report-requested-role') ?? 'USER', []);
  const savedRoleApprovalStatus = useMemo(() => localStorage.getItem('weekly-report-role-approval-status') ?? 'APPROVED', []);
  const today = useMemo(() => toDateInputValue(new Date()), []);
  const [mode, setMode] = useState(savedToken && savedUserRole === 'MANAGER' ? 'manager' : savedToken ? 'report' : 'login');
  const [token, setToken] = useState(savedToken);
  const [loginForm, setLoginForm] = useState({
    ...initialLoginForm,
    loginId: rememberedId,
    rememberId: Boolean(rememberedId),
  });
  const [signupForm, setSignupForm] = useState(initialSignupForm);
  const [findForm, setFindForm] = useState(initialFindForm);
  const [currentUserName, setCurrentUserName] = useState(savedUserName);
  const [currentUserRole, setCurrentUserRole] = useState(savedUserRole);
  const [requestedRole, setRequestedRole] = useState(savedRequestedRole);
  const [roleApprovalStatus, setRoleApprovalStatus] = useState(savedRoleApprovalStatus);
  const [message, setMessage] = useState(savedToken ? '로그인 상태입니다.' : '');
  const [isLoading, setIsLoading] = useState(false);
  const [baseDate, setBaseDate] = useState(today);
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [reportForm, setReportForm] = useState(initialReportForm);
  const [pendingSaveStatus, setPendingSaveStatus] = useState('SAVED');

  const isLogin = mode === 'login';
  const isSignup = mode === 'signup';
  const isFindAccount = mode === 'findAccount';
  const isReport = mode === 'report';
  const isManager = mode === 'manager';
  const isAuthenticated = isReport || isManager;
  const isPendingManager = requestedRole === 'MANAGER' && roleApprovalStatus === 'PENDING';
  const weekRange = useMemo(() => getWeekRange(baseDate), [baseDate]);
  const previewText = useMemo(() => buildPreview(items, selectedIds), [items, selectedIds]);

  useEffect(() => {
    if (isReport && token) {
      loadReportItems();
    }
  }, [isReport, token, weekRange.startDate, weekRange.endDate]);

  function updateLoginForm(field, value) {
    setLoginForm((current) => ({ ...current, [field]: value }));
  }

  function updateSignupForm(field, value) {
    setSignupForm((current) => ({ ...current, [field]: value }));
  }

  function updateFindForm(field, value) {
    setFindForm((current) => ({ ...current, [field]: value }));
  }

  function updateReportForm(field, value) {
    setReportForm((current) => ({ ...current, [field]: value }));
  }

  function openMode(nextMode) {
    setMode(nextMode);
    setMessage('');
  }

  async function requestApi(path, { method = 'POST', body, auth = false } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth && token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await response.json();

    if (!response.ok || !payload.success) {
      throw new Error(payload.message || '요청을 처리하지 못했습니다.');
    }

    return payload.data;
  }

  async function handleLogin(event) {
    event.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const data = await requestApi('/api/auth/login', {
        body: {
          loginId: loginForm.loginId,
          password: loginForm.password,
        },
      });

      if (loginForm.rememberId) {
        localStorage.setItem('weekly-report-login-id', loginForm.loginId);
      } else {
        localStorage.removeItem('weekly-report-login-id');
      }

      localStorage.setItem('weekly-report-access-token', data.accessToken);
      localStorage.setItem('weekly-report-user-name', data.name);
      localStorage.setItem('weekly-report-user-role', data.role);
      localStorage.setItem('weekly-report-requested-role', data.requestedRole);
      localStorage.setItem('weekly-report-role-approval-status', data.roleApprovalStatus);
      setToken(data.accessToken);
      setCurrentUserName(data.name);
      setCurrentUserRole(data.role);
      setRequestedRole(data.requestedRole);
      setRoleApprovalStatus(data.roleApprovalStatus);
      setLoginForm((current) => ({ ...current, password: '' }));
      setMode(data.role === 'MANAGER' ? 'manager' : 'report');
      const pendingNotice = data.requestedRole === 'MANAGER' && data.roleApprovalStatus === 'PENDING'
        ? ' PL 권한은 승인 대기 중입니다.'
        : '';
      setMessage(`${data.name}님, 로그인되었습니다.${pendingNotice}`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignup(event) {
    event.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const data = await requestApi('/api/auth/signup', { body: signupForm });
      const managerNotice = data.roleApprovalStatus === 'PENDING'
        ? ' PL 권한은 관리자 승인 후 적용됩니다.'
        : '';
      setMessage(`회원가입이 완료되었습니다.${managerNotice} 로그인해 주세요.`);
      setLoginForm((current) => ({ ...current, loginId: signupForm.loginId, password: '' }));
      setSignupForm(initialSignupForm);
      setMode('login');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleFindAccount(event) {
    event.preventDefault();
    setMessage(`${findForm.email} 주소로 아이디 안내와 패스워드 재설정 링크를 보내는 화면입니다.`);
  }

  function handleLogout() {
    localStorage.removeItem('weekly-report-access-token');
    localStorage.removeItem('weekly-report-user-name');
    localStorage.removeItem('weekly-report-user-role');
    localStorage.removeItem('weekly-report-requested-role');
    localStorage.removeItem('weekly-report-role-approval-status');
    setToken('');
    setCurrentUserName('');
    setCurrentUserRole('USER');
    setRequestedRole('USER');
    setRoleApprovalStatus('APPROVED');
    setItems([]);
    setSelectedIds([]);
    setReportForm(initialReportForm);
    setMode('login');
    setMessage('로그아웃되었습니다.');
  }

  function handleReportSubmit(event) {
    event.preventDefault();
    saveReportItem(pendingSaveStatus);
  }

  async function loadReportItems() {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        reportStartDate: weekRange.startDate,
        reportEndDate: weekRange.endDate,
      });
      const data = await requestApi(`/api/report-items?${query.toString()}`, {
        method: 'GET',
        auth: true,
      });
      setItems(data);
      setSelectedIds((current) => current.filter((id) => data.some((item) => item.id === id && item.saveStatus === 'SAVED')));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveReportItem(saveStatus) {
    setIsLoading(true);
    setMessage('');

    try {
      const body = {
        reportStartDate: weekRange.startDate,
        reportEndDate: weekRange.endDate,
        weekType: reportForm.weekType,
        unitTask: reportForm.unitTask,
        title: reportForm.title,
        detailContent: reportForm.detailContent,
        progressContent: reportForm.progressContent,
        status: reportForm.completed ? 'DONE' : reportForm.status,
        progressRate: Number(reportForm.progressRate),
        dueDate: reportForm.dueDate || null,
        completed: reportForm.completed,
        saveStatus,
      };
      const path = reportForm.id ? `/api/report-items/${reportForm.id}` : '/api/report-items';
      const method = reportForm.id ? 'PUT' : 'POST';
      await requestApi(path, { method, body, auth: true });
      setReportForm(initialReportForm);
      setMessage(saveStatus === 'DRAFT' ? '임시저장되었습니다.' : '저장되었습니다.');
      await loadReportItems();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function submitSelectedItems() {
    if (selectedIds.length === 0) {
      setMessage('제출할 항목을 선택해 주세요.');
      return;
    }
    if (items.some((item) => selectedIds.includes(item.id) && item.saveStatus !== 'SAVED')) {
      setMessage('저장 상태의 항목만 제출할 수 있습니다.');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      await requestApi('/api/report-items/submit', {
        body: { itemIds: selectedIds },
        auth: true,
      });
      setMessage('선택한 항목을 제출했습니다.');
      await loadReportItems();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  function editReportItem(item) {
    setReportForm({
      id: item.id,
      weekType: item.weekType,
      unitTask: item.unitTask,
      title: item.title,
      detailContent: item.detailContent,
      progressContent: item.progressContent,
      status: item.status,
      progressRate: item.progressRate,
      dueDate: item.dueDate ?? '',
      completed: item.completed,
    });
    setMessage('선택한 항목을 수정 모드로 불러왔습니다.');
  }

  function toggleSelected(id) {
    const item = items.find((candidate) => candidate.id === id);
    if (!item || item.saveStatus !== 'SAVED') {
      setMessage('저장 상태의 항목만 제출 대상으로 선택할 수 있습니다.');
      return;
    }
    setSelectedIds((current) => (
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]
    ));
  }

  async function copyPreview() {
    try {
      await navigator.clipboard.writeText(previewText);
      setMessage('미리보기 텍스트를 복사했습니다.');
    } catch (error) {
      setMessage('브라우저에서 클립보드 복사를 허용하지 않았습니다.');
    }
  }

  return (
    <main className={isAuthenticated ? 'app-shell' : 'page-shell'}>
      <section className={isAuthenticated ? 'workspace' : 'auth-panel'} aria-labelledby="page-title">
        <div className="topbar">
          <div className="brand-block">
            <p className="eyebrow">Metabuild PMS</p>
            <h1 id="page-title">주간업무보고</h1>
            <p className="brand-copy">팀원의 주간 업무를 입력하고 단위업무별 보고 텍스트로 정리합니다.</p>
          </div>

          {isAuthenticated && (
            <div className="user-tools">
              <span>{currentUserName || '사용자'}님 · {currentUserRole === 'MANAGER' ? 'PL' : '팀원'}</span>
              <button className="secondary-button" type="button" onClick={handleLogout}>
                로그아웃
              </button>
            </div>
          )}
        </div>

        {!isAuthenticated && (
          <div className="auth-tabs" aria-label="인증 화면 선택">
            <button
              className={isLogin ? 'active' : ''}
              type="button"
              aria-pressed={isLogin}
              onClick={() => openMode('login')}
            >
              로그인
            </button>
            <button
              className={isSignup ? 'active' : ''}
              type="button"
              aria-pressed={isSignup}
              onClick={() => openMode('signup')}
            >
              회원가입
            </button>
          </div>
        )}

        {isLogin && (
          <form className="auth-form" onSubmit={handleLogin}>
            <label>
              아이디
              <input
                autoComplete="username"
                value={loginForm.loginId}
                onChange={(event) => updateLoginForm('loginId', event.target.value)}
                placeholder="아이디 입력"
                required
              />
            </label>

            <label>
              패스워드
              <input
                autoComplete="current-password"
                type="password"
                value={loginForm.password}
                onChange={(event) => updateLoginForm('password', event.target.value)}
                placeholder="패스워드 입력"
                required
              />
            </label>

            <div className="form-row">
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={loginForm.rememberId}
                  onChange={(event) => updateLoginForm('rememberId', event.target.checked)}
                />
                아이디 기억하기
              </label>
              <button className="link-button" type="button" onClick={() => openMode('findAccount')}>
                아이디/패스워드 찾기
              </button>
            </div>

            <button className="primary-button" disabled={isLoading} type="submit">
              {isLoading ? '로그인 중' : '로그인'}
            </button>
          </form>
        )}

        {isSignup && (
          <form className="auth-form" onSubmit={handleSignup}>
            <label>
              아이디
              <input
                autoComplete="username"
                value={signupForm.loginId}
                onChange={(event) => updateSignupForm('loginId', event.target.value)}
                placeholder="영문, 숫자 4자 이상"
                required
              />
            </label>

            <label>
              패스워드
              <input
                autoComplete="new-password"
                type="password"
                value={signupForm.password}
                onChange={(event) => updateSignupForm('password', event.target.value)}
                placeholder="문자와 숫자 포함 8자 이상"
                required
              />
            </label>

            <label>
              이메일
              <input
                autoComplete="email"
                type="email"
                value={signupForm.email}
                onChange={(event) => updateSignupForm('email', event.target.value)}
                placeholder="name@example.com"
                required
              />
            </label>

            <label>
              이름
              <input
                autoComplete="name"
                value={signupForm.name}
                onChange={(event) => updateSignupForm('name', event.target.value)}
                placeholder="사용자 이름"
                required
              />
            </label>

            <label>
              직급
              <select
                value={signupForm.requestedRole}
                onChange={(event) => updateSignupForm('requestedRole', event.target.value)}
              >
                <option value="USER">개발자(팀원)</option>
                <option value="MANAGER">PL(팀장) 승인 요청</option>
              </select>
            </label>

            <button className="primary-button" disabled={isLoading} type="submit">
              {isLoading ? '가입 중' : '회원가입'}
            </button>
          </form>
        )}

        {isFindAccount && (
          <form className="auth-form" onSubmit={handleFindAccount}>
            <div className="mock-panel">
              <p className="panel-label">아이디/패스워드 찾기</p>
              <p>가입 이메일을 입력하면 아이디 안내와 패스워드 재설정 메일을 보내는 화면입니다.</p>
            </div>

            <label>
              이메일
              <input
                autoComplete="email"
                type="email"
                value={findForm.email}
                onChange={(event) => updateFindForm('email', event.target.value)}
                placeholder="name@example.com"
                required
              />
            </label>

            <div className="button-row">
              <button className="secondary-button" type="button" onClick={() => openMode('login')}>
                로그인으로 돌아가기
              </button>
              <button className="primary-button compact" type="submit">
                안내 메일 보내기
              </button>
            </div>
          </form>
        )}

        {isManager && (
          <div className="tool-panel manager-panel">
            <p className="panel-label">팀장 취합 화면</p>
            <h2>관리자 취합 기능 준비 중</h2>
            <p>PL 승인 계정입니다. 다음 단계에서 팀원 제출 항목 조회, 단위업무별 병합, 최종 텍스트 복사 기능을 연결합니다.</p>
          </div>
        )}

        {isReport && (
          <div className="report-layout">
            {isPendingManager && (
              <div className="tool-panel pending-panel">
                <p className="panel-label">PL 권한 승인 대기</p>
                <p>현재는 팀원 권한으로 이용할 수 있습니다. 관리자 승인 후 팀장 취합 화면이 열립니다.</p>
              </div>
            )}

            <section className="tool-panel">
              <div className="section-header">
                <div>
                  <p className="panel-label">팀원 제출 화면</p>
                  <h2>업무 항목 입력</h2>
                </div>
                <button className="secondary-button" type="button" onClick={loadReportItems}>
                  새로고침
                </button>
              </div>

              <div className="period-grid">
                <label>
                  기준 일자
                  <input
                    type="date"
                    value={baseDate}
                    onChange={(event) => setBaseDate(event.target.value)}
                  />
                </label>
                <div className="readonly-box">
                  <span>보고 기간</span>
                  <strong>{formatDate(weekRange.startDate)} ~ {formatDate(weekRange.endDate)}</strong>
                </div>
              </div>

              <form className="report-form" onSubmit={handleReportSubmit}>
                <label>
                  주차 구분
                  <select
                    value={reportForm.weekType}
                    onChange={(event) => updateReportForm('weekType', event.target.value)}
                  >
                    <option value="THIS_WEEK">금주</option>
                    <option value="NEXT_WEEK">차주</option>
                  </select>
                </label>
                <label>
                  단위업무
                  <input
                    value={reportForm.unitTask}
                    onChange={(event) => updateReportForm('unitTask', event.target.value)}
                    placeholder="예: 주간보고"
                    required
                  />
                </label>
                <label>
                  세부사항
                  <input
                    value={reportForm.title}
                    onChange={(event) => updateReportForm('title', event.target.value)}
                    placeholder="업무 제목"
                    required
                  />
                </label>
                <label className="wide-field">
                  업무 상세
                  <textarea
                    value={reportForm.detailContent}
                    onChange={(event) => updateReportForm('detailContent', event.target.value)}
                    placeholder="업무 상세 내용을 입력하세요."
                    required
                  />
                </label>
                <label className="wide-field">
                  진행내용
                  <textarea
                    value={reportForm.progressContent}
                    onChange={(event) => updateReportForm('progressContent', event.target.value)}
                    placeholder="금주 진행 또는 차주 예정 내용을 입력하세요."
                    required
                  />
                </label>
                <label>
                  상태
                  <select
                    value={reportForm.status}
                    onChange={(event) => updateReportForm('status', event.target.value)}
                  >
                    <option value="NEW">신규</option>
                    <option value="IN_PROGRESS">진행중</option>
                    <option value="DONE">완료</option>
                    <option value="HOLD">보류</option>
                  </select>
                </label>
                <label>
                  진행률
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={reportForm.progressRate}
                    onChange={(event) => updateReportForm('progressRate', event.target.value)}
                  />
                </label>
                <label>
                  완료기한
                  <input
                    type="date"
                    value={reportForm.dueDate}
                    onChange={(event) => updateReportForm('dueDate', event.target.value)}
                  />
                </label>
                <label className="check-label align-end">
                  <input
                    type="checkbox"
                    checked={reportForm.completed}
                    onChange={(event) => updateReportForm('completed', event.target.checked)}
                  />
                  완료여부
                </label>

                <div className="button-row wide-field">
                  <button className="secondary-button" type="submit" onClick={() => setPendingSaveStatus('DRAFT')} disabled={isLoading}>
                    임시저장
                  </button>
                  <button className="primary-button compact" type="submit" onClick={() => setPendingSaveStatus('SAVED')} disabled={isLoading}>
                    {reportForm.id ? '수정 저장' : '저장'}
                  </button>
                </div>
              </form>
            </section>

            <section className="tool-panel">
              <div className="section-header">
                <div>
                  <p className="panel-label">저장된 항목</p>
                  <h2>제출 항목 선택</h2>
                </div>
                <button className="primary-button compact" type="button" onClick={submitSelectedItems} disabled={isLoading}>
                  제출
                </button>
              </div>

              <div className="items-table" role="table" aria-label="주간업무 항목 목록">
                <div className="items-row header" role="row">
                  <span>선택</span>
                  <span>구분</span>
                  <span>단위업무</span>
                  <span>세부사항</span>
                  <span>상태</span>
                  <span>저장</span>
                  <span>수정</span>
                </div>
                {items.length === 0 ? (
                  <p className="empty-state">아직 저장된 항목이 없습니다.</p>
                ) : items.map((item) => (
                  <div className="items-row" role="row" key={item.id}>
                    <label className="check-label table-check">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        disabled={item.saveStatus !== 'SAVED'}
                        onChange={() => toggleSelected(item.id)}
                      />
                      <span className="sr-only">선택</span>
                    </label>
                    <span>{weekTypeLabels[item.weekType]}</span>
                    <span>{item.unitTask}</span>
                    <span>{item.title}</span>
                    <span>{statusLabels[item.status]}</span>
                    <span>{item.saveStatus}</span>
                    <button className="link-button" type="button" onClick={() => editReportItem(item)}>
                      수정
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="tool-panel preview-panel">
              <div className="section-header">
                <div>
                  <p className="panel-label">미리보기</p>
                  <h2>단위업무별 병합 결과</h2>
                </div>
                <button className="secondary-button" type="button" onClick={copyPreview}>
                  복사
                </button>
              </div>
              <pre>{previewText}</pre>
            </section>
          </div>
        )}

        {message && (
          <p className="status-message" role="status" aria-live="polite">
            {message}
          </p>
        )}
      </section>
    </main>
  );
}

export default App;

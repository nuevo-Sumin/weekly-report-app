import { useMemo, useState } from 'react';

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
};

const initialFindForm = {
  email: '',
};

function App() {
  const rememberedId = useMemo(() => localStorage.getItem('weekly-report-login-id') ?? '', []);
  const savedToken = useMemo(() => localStorage.getItem('weekly-report-access-token') ?? '', []);
  const savedUserName = useMemo(() => localStorage.getItem('weekly-report-user-name') ?? '', []);
  const [mode, setMode] = useState(savedToken ? 'signedIn' : 'login');
  const [loginForm, setLoginForm] = useState({
    ...initialLoginForm,
    loginId: rememberedId,
    rememberId: Boolean(rememberedId),
  });
  const [signupForm, setSignupForm] = useState(initialSignupForm);
  const [findForm, setFindForm] = useState(initialFindForm);
  const [currentUserName, setCurrentUserName] = useState(savedUserName);
  const [message, setMessage] = useState(savedToken ? '로그인 상태입니다.' : '');
  const [isLoading, setIsLoading] = useState(false);

  const isLogin = mode === 'login';
  const isSignup = mode === 'signup';
  const isFindAccount = mode === 'findAccount';
  const isSignedIn = mode === 'signedIn';

  function updateLoginForm(field, value) {
    setLoginForm((current) => ({ ...current, [field]: value }));
  }

  function updateSignupForm(field, value) {
    setSignupForm((current) => ({ ...current, [field]: value }));
  }

  function updateFindForm(field, value) {
    setFindForm((current) => ({ ...current, [field]: value }));
  }

  function openMode(nextMode) {
    setMode(nextMode);
    setMessage('');
  }

  async function requestApi(path, body) {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
        loginId: loginForm.loginId,
        password: loginForm.password,
      });

      if (loginForm.rememberId) {
        localStorage.setItem('weekly-report-login-id', loginForm.loginId);
      } else {
        localStorage.removeItem('weekly-report-login-id');
      }

      localStorage.setItem('weekly-report-access-token', data.accessToken);
      localStorage.setItem('weekly-report-user-name', data.name);
      setCurrentUserName(data.name);
      setLoginForm((current) => ({ ...current, password: '' }));
      setMode('signedIn');
      setMessage(`${data.name}님, 로그인되었습니다.`);
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
      await requestApi('/api/auth/signup', signupForm);
      setMessage('회원가입이 완료되었습니다. 로그인해 주세요.');
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
    setCurrentUserName('');
    setMode('login');
    setMessage('로그아웃되었습니다.');
  }

  return (
    <main className="page-shell">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="brand-block">
          <p className="eyebrow">Metabuild PMS</p>
          <h1 id="auth-title">주간업무보고</h1>
          <p className="brand-copy">팀원의 주간 업무를 입력하고 단위업무별 보고 텍스트로 정리합니다.</p>
        </div>

        {!isSignedIn && (
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

        {isSignedIn && (
          <div className="signed-in-panel">
            <div>
              <p className="panel-label">로그인 사용자</p>
              <strong>{currentUserName || '사용자'}님</strong>
            </div>
            <button className="secondary-button" type="button" onClick={handleLogout}>
              로그아웃
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

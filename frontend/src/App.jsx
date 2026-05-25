import { useEffect, useMemo, useState } from 'react';
import { initialFindForm, initialLoginForm, initialSignupForm } from './constants';
import { requestApi } from './api';
import {
  clearLoginId,
  clearSession,
  readSession,
  saveLoginId,
  saveSession,
} from './sessionStorage';
import AppHeader from './components/AppHeader';
import AuthPanel from './components/AuthPanel';
import ManagerReportScreen from './components/ManagerReportScreen';
import MemberReportScreen from './components/MemberReportScreen';

function getInitialMode(session) {
  if (!session.token) {
    return 'login';
  }
  return session.role === 'MANAGER' ? 'manager' : 'report';
}

function toUserState(data) {
  return {
    name: data.name,
    role: data.role,
    requestedRole: data.requestedRole,
    roleApprovalStatus: data.roleApprovalStatus,
  };
}

function App() {
  const session = useMemo(() => readSession(), []);
  const [mode, setMode] = useState(getInitialMode(session));
  const [token, setToken] = useState(session.token);
  const [user, setUser] = useState({
    name: session.name,
    role: session.role,
    requestedRole: session.requestedRole,
    roleApprovalStatus: session.roleApprovalStatus,
  });
  const [loginForm, setLoginForm] = useState({
    ...initialLoginForm,
    loginId: session.rememberedId,
    rememberId: Boolean(session.rememberedId),
  });
  const [signupForm, setSignupForm] = useState(initialSignupForm);
  const [findForm, setFindForm] = useState(initialFindForm);
  const [message, setMessage] = useState(session.token ? '로그인 상태입니다.' : '');
  const [isLoading, setIsLoading] = useState(false);

  const isAuthenticated = mode === 'report' || mode === 'manager';

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    let isCurrent = true;

    async function validateSession() {
      try {
        const data = await requestApi('/api/me', { method: 'GET', token });
        if (!isCurrent) {
          return;
        }

        const nextUser = toUserState(data);
        saveSession({ ...nextUser, accessToken: token });
        setUser(nextUser);
        setMode(nextUser.role === 'MANAGER' ? 'manager' : 'report');
      } catch (error) {
        if (!isCurrent) {
          return;
        }

        clearSession();
        setToken('');
        setUser({
          name: '',
          role: 'USER',
          requestedRole: 'USER',
          roleApprovalStatus: 'APPROVED',
        });
        setMode('login');
        setMessage('로그인이 만료되었습니다. 다시 로그인해 주세요.');
      }
    }

    validateSession();

    return () => {
      isCurrent = false;
    };
  }, [token]);

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
        saveLoginId(loginForm.loginId);
      } else {
        clearLoginId();
      }

      saveSession(data);
      setToken(data.accessToken);
      setUser(toUserState(data));
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
    clearSession();
    setToken('');
    setUser({
      name: '',
      role: 'USER',
      requestedRole: 'USER',
      roleApprovalStatus: 'APPROVED',
    });
    setMode('login');
    setMessage('로그아웃되었습니다.');
  }

  return (
    <main className={isAuthenticated ? 'app-shell' : 'page-shell'}>
      <section className={isAuthenticated ? 'workspace' : 'auth-panel'} aria-labelledby="page-title">
        <AppHeader isAuthenticated={isAuthenticated} user={user} onLogout={handleLogout} />

        {!isAuthenticated && (
          <AuthPanel
            mode={mode}
            loginForm={loginForm}
            signupForm={signupForm}
            findForm={findForm}
            isLoading={isLoading}
            onModeChange={openMode}
            onLoginChange={updateLoginForm}
            onSignupChange={updateSignupForm}
            onFindChange={updateFindForm}
            onLogin={handleLogin}
            onSignup={handleSignup}
            onFindAccount={handleFindAccount}
          />
        )}

        {mode === 'manager' && (
          <ManagerReportScreen
            token={token}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            setMessage={setMessage}
          />
        )}

        {mode === 'report' && (
          <MemberReportScreen
            token={token}
            user={user}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            setMessage={setMessage}
          />
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

function AuthPanel({
  mode,
  loginForm,
  signupForm,
  findForm,
  isLoading,
  onModeChange,
  onLoginChange,
  onSignupChange,
  onFindChange,
  onLogin,
  onSignup,
  onFindAccount,
}) {
  const isLogin = mode === 'login';
  const isSignup = mode === 'signup';
  const isFindAccount = mode === 'findAccount';

  return (
    <>
      <div className="auth-tabs" aria-label="인증 화면 선택">
        <button
          className={isLogin ? 'active' : ''}
          type="button"
          aria-pressed={isLogin}
          onClick={() => onModeChange('login')}
        >
          로그인
        </button>
        <button
          className={isSignup ? 'active' : ''}
          type="button"
          aria-pressed={isSignup}
          onClick={() => onModeChange('signup')}
        >
          회원가입
        </button>
      </div>

      {isLogin && (
        <form className="auth-form" onSubmit={onLogin}>
          <label>
            아이디
            <input
              autoComplete="username"
              value={loginForm.loginId}
              onChange={(event) => onLoginChange('loginId', event.target.value)}
              placeholder="아이디 입력"
              required
            />
          </label>

          <label>
            비밀번호
            <input
              autoComplete="current-password"
              type="password"
              value={loginForm.password}
              onChange={(event) => onLoginChange('password', event.target.value)}
              placeholder="숫자 4자리 비밀번호 입력"
              required
            />
          </label>

          <div className="form-row">
            <label className="check-label">
              <input
                type="checkbox"
                checked={loginForm.rememberId}
                onChange={(event) => onLoginChange('rememberId', event.target.checked)}
              />
              아이디 기억하기
            </label>
            <button className="link-button" type="button" onClick={() => onModeChange('findAccount')}>
              아이디/패스워드 찾기
            </button>
          </div>

          <button className="primary-button" disabled={isLoading} type="submit">
            {isLoading ? '로그인 중' : '로그인'}
          </button>
        </form>
      )}

      {isSignup && (
        <form className="auth-form" onSubmit={onSignup}>
          <label>
            아이디
            <input
              autoComplete="username"
              value={signupForm.loginId}
              onChange={(event) => onSignupChange('loginId', event.target.value)}
              placeholder="영문, 숫자 4자 이상"
              minLength={4}
              maxLength={80}
              pattern="[A-Za-z0-9._\\-]+"
              title="영문, 숫자, 점, 밑줄, 하이픈만 사용할 수 있습니다."
              required
            />
          </label>

          <label>
            비밀번호
            <input
              autoComplete="new-password"
              type="password"
              value={signupForm.password}
              onChange={(event) => onSignupChange('password', event.target.value)}
              placeholder="4자리 숫자"
              minLength={4}
              maxLength={4}
              pattern="[0-9]{4}"
              title="숫자 4자리 입력하세요."
              required
            />
          </label>

          <label>
            비밀번호 확인
            <input
              autoComplete="new-password"
              type="password"
              value={signupForm.passwordConfirm}
              onChange={(event) => onSignupChange('passwordConfirm', event.target.value)}
              placeholder="비밀번호 다시 입력"
              minLength={4}
              maxLength={4}
              pattern="[0-9]{4}"
              title="숫자 4자리 입력하세요."
              required
            />
          </label>

          <label>
            이메일
            <div className="email-field-row">
              <input
                autoComplete="email"
                value={signupForm.emailLocal}
                onChange={(event) => onSignupChange('emailLocal', event.target.value)}
                placeholder="아이디"
                maxLength={80}
                pattern="[A-Za-z0-9._\\-]+"
                title="영문, 숫자, 점, 밑줄, 하이픈만 사용할 수 있습니다."
                required
              />
              <span>@</span>
              <select
                value={signupForm.emailDomain}
                onChange={(event) => onSignupChange('emailDomain', event.target.value)}
                aria-label="이메일 도메인"
              >
                <option value="metabuild.co.kr">metabuild.co.kr</option>
                <option value="1388.kr">1388.kr</option>
              </select>
            </div>
          </label>

          <label>
            이름
            <input
              autoComplete="name"
              value={signupForm.name}
              onChange={(event) => onSignupChange('name', event.target.value)}
              placeholder="사용자 이름(실명)"
              maxLength={5}
              required
            />
          </label>

          <label>
            직급
            <select
              value={signupForm.requestedRole}
              onChange={(event) => onSignupChange('requestedRole', event.target.value)}
            >
              <option value="USER">개발자</option>
              <option value="MANAGER">PL</option>
            </select>
          </label>

          <button className="primary-button" disabled={isLoading} type="submit">
            {isLoading ? '가입 중' : '회원가입'}
          </button>
        </form>
      )}

      {isFindAccount && (
        <form className="auth-form" onSubmit={onFindAccount}>
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
              onChange={(event) => onFindChange('email', event.target.value)}
              placeholder="name@example.com"
              required
            />
          </label>

          <div className="button-row">
            <button className="secondary-button" type="button" onClick={() => onModeChange('login')}>
              로그인으로 돌아가기
            </button>
            <button className="primary-button compact" type="submit">
              안내 메일 보내기
            </button>
          </div>
        </form>
      )}
    </>
  );
}

export default AuthPanel;

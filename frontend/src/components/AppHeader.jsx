function AppHeader({ isAuthenticated, user, onLogout }) {
  return (
    <div className="topbar">
      <div className="brand-block">
        <p className="eyebrow">청소년안전망시스템 YouthSafety</p>
        <h1 id="page-title">주간업무보고</h1>
        <p className="brand-copy">개발자 주간보고 제출 및 PL 취합</p>
      </div>

      {isAuthenticated && (
        <div className="user-tools">
          <span>{user.name || '사용자'}님 · {user.role === 'MANAGER' ? 'PL' : '팀원'}</span>
          <button className="secondary-button" type="button" onClick={onLogout}>
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}

export default AppHeader;


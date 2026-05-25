function AppHeader({ isAuthenticated, user, onLogout }) {
  return (
    <div className="topbar">
      <div className="brand-block">
        <p className="eyebrow">Metabuild PMS</p>
        <h1 id="page-title">주간업무보고</h1>
        <p className="brand-copy">팀원의 주간 업무를 입력하고 단위업무별 보고 텍스트로 정리합니다.</p>
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


const keys = {
  loginId: 'weekly-report-login-id',
  token: 'weekly-report-access-token',
  name: 'weekly-report-user-name',
  role: 'weekly-report-user-role',
  requestedRole: 'weekly-report-requested-role',
  roleApprovalStatus: 'weekly-report-role-approval-status',
};

export function readSession() {
  return {
    rememberedId: localStorage.getItem(keys.loginId) ?? '',
    token: localStorage.getItem(keys.token) ?? '',
    name: localStorage.getItem(keys.name) ?? '',
    role: localStorage.getItem(keys.role) ?? 'USER',
    requestedRole: localStorage.getItem(keys.requestedRole) ?? 'USER',
    roleApprovalStatus: localStorage.getItem(keys.roleApprovalStatus) ?? 'APPROVED',
  };
}

export function saveLoginId(loginId) {
  localStorage.setItem(keys.loginId, loginId);
}

export function clearLoginId() {
  localStorage.removeItem(keys.loginId);
}

export function saveSession(user) {
  localStorage.setItem(keys.token, user.accessToken);
  localStorage.setItem(keys.name, user.name);
  localStorage.setItem(keys.role, user.role);
  localStorage.setItem(keys.requestedRole, user.requestedRole);
  localStorage.setItem(keys.roleApprovalStatus, user.roleApprovalStatus);
}

export function clearSession() {
  localStorage.removeItem(keys.token);
  localStorage.removeItem(keys.name);
  localStorage.removeItem(keys.role);
  localStorage.removeItem(keys.requestedRole);
  localStorage.removeItem(keys.roleApprovalStatus);
}


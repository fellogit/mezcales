let currentUser = null;

async function login(username, password) {
  const hashedInput = await hashPassword(password);
  const user = await db.users.where({ username }).first();
  if (user && user.password === hashedInput && user.active) {
    currentUser = { id: user.id, username: user.username, role: user.role };
    sessionStorage.setItem('user', JSON.stringify(currentUser));
    return true;
  }
  return false;
}

function logout() {
  currentUser = null;
  sessionStorage.removeItem('user');
  location.reload();
}

function checkAuth() {
  const stored = sessionStorage.getItem('user');
  if (stored) {
    currentUser = JSON.parse(stored);
    return true;
  }
  return false;
}

function requireAdmin() {
  return currentUser && currentUser.role === 'admin';
}

// Exportar a window para uso global
window.auth = { login, logout, checkAuth, currentUser, requireAdmin };
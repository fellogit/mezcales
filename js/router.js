function navigateTo(route) {
  const modules = document.querySelectorAll('.module');
  modules.forEach(mod => mod.classList.remove('active-module'));
  const target = document.getElementById(route);
  if (target) target.classList.add('active-module');
  
  // Marcar sidebar activo
  document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
  const activeLink = document.querySelector(`.nav-links li[data-route="${route}"]`);
  if (activeLink) activeLink.classList.add('active');
  
  // Disparar eventos de carga específicos
  if (route === 'reports-module' && window.renderReports) window.renderReports();
  if (route === 'inventory-module' && window.loadInventory) window.loadInventory();
  if (route === 'cashregister-module' && window.loadCashRegister) window.loadCashRegister();
  if (route === 'settings-module' && window.loadSettings) window.loadSettings();
  if (route === 'pos-module' && window.refreshProductGrid) window.refreshProductGrid();
}

function initRouter() {
  window.addEventListener('hashchange', () => {
    const hash = location.hash.slice(1) || 'pos';
    navigateTo(`${hash}-module`);
  });
  if (!location.hash || location.hash === '#') location.hash = 'pos';
  else navigateTo(`${location.hash.slice(1)}-module`);
}

// Control de acceso por rol
function protectRoutes() {
  const adminOnlyModules = ['inventory-module', 'reports-module', 'cashregister-module', 'settings-module'];
  const check = () => {
    const active = document.querySelector('.module.active-module');
    if (active && adminOnlyModules.includes(active.id) && !window.auth.requireAdmin()) {
      alert('Acceso denegado. Se requiere rol Administrador.');
      location.hash = 'pos';
    }
  };
  window.addEventListener('hashchange', check);
  check();
}
async function loadSettings() {
  await loadBusinessSettings();
  await loadUsersTable();
  await loadPrinterStatus();
}

async function loadBusinessSettings() {
  const name = (await db.settings.get('business_name'))?.value || '';
  const address = (await db.settings.get('business_address'))?.value || '';
  const phone = (await db.settings.get('business_phone'))?.value || '';
  const thankyou = (await db.settings.get('thankyou_message'))?.value || '';
  document.getElementById('business-name').value = name;
  document.getElementById('business-address').value = address;
  document.getElementById('business-phone').value = phone;
  document.getElementById('thankyou-message').value = thankyou;
}

async function saveBusinessSettings() {
  await db.settings.put({ key: 'business_name', value: document.getElementById('business-name').value });
  await db.settings.put({ key: 'business_address', value: document.getElementById('business-address').value });
  await db.settings.put({ key: 'business_phone', value: document.getElementById('business-phone').value });
  await db.settings.put({ key: 'thankyou_message', value: document.getElementById('thankyou-message').value });
  alert('Datos guardados');
}

async function loadUsersTable() {
  const users = await db.users.toArray();
  const tbody = document.getElementById('users-tbody');
  tbody.innerHTML = users.map(u => `
    <tr>
      <td>${u.username}</td>
      <td>${u.role}</td>
      <td>${u.active ? 'Activo' : 'Inactivo'}</td>
      <td>
        <button onclick="editUser(${u.id})">Editar</button>
        <button onclick="toggleUserActive(${u.id}, ${!u.active})">${u.active ? 'Desactivar' : 'Activar'}</button>
      </td>
    </tr>
  `).join('');
}

async function editUser(id) {
  const user = await db.users.get(id);
  document.getElementById('user-id').value = user.id;
  document.getElementById('user-username').value = user.username;
  document.getElementById('user-role').value = user.role;
  document.getElementById('user-password').value = '';
  document.getElementById('user-modal-title').innerText = 'Editar Usuario';
  document.getElementById('user-modal').classList.add('active');
}

async function saveUser() {
  const id = document.getElementById('user-id').value;
  const username = document.getElementById('user-username').value.trim();
  const role = document.getElementById('user-role').value;
  const password = document.getElementById('user-password').value;
  if (!username) return alert('Usuario requerido');
  if (!id && !password) return alert('Contraseña requerida para nuevo usuario');
  let userData = { username, role, active: true };
  if (password) userData.password = await window.hashPassword(password);
  if (id) {
    userData.id = parseInt(id);
    const existing = await db.users.get(parseInt(id));
    if (!password) userData.password = existing.password;
    await db.users.put(userData);
  } else {
    await db.users.add(userData);
  }
  closeUserModal();
  loadUsersTable();
}

function toggleUserActive(id, active) {
  db.users.update(id, { active: active });
  loadUsersTable();
}

function showUserModal() {
  document.getElementById('user-id').value = '';
  document.getElementById('user-username').value = '';
  document.getElementById('user-role').value = 'cajero';
  document.getElementById('user-password').value = '';
  document.getElementById('user-modal-title').innerText = 'Nuevo Usuario';
  document.getElementById('user-modal').classList.add('active');
}

function closeUserModal() {
  document.getElementById('user-modal').classList.remove('active');
}

// Impresora Bluetooth (stub)
let bluetoothDevice = null;
async function connectBluetoothPrinter() {
  if (!navigator.bluetooth) {
    alert('Web Bluetooth no es compatible en este navegador.');
    return;
  }
  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'] // servicio de impresión común
    });
    bluetoothDevice = device;
    await db.settings.put({ key: 'printer_device_id', value: device.id });
    document.getElementById('printer-status').innerText = `Conectado a: ${device.name || 'Desconocido'}`;
    document.getElementById('printer-status').style.color = 'green';
  } catch (error) {
    console.error(error);
    alert('No se pudo conectar la impresora');
  }
}

async function loadPrinterStatus() {
  const deviceId = (await db.settings.get('printer_device_id'))?.value;
  if (deviceId) {
    document.getElementById('printer-status').innerText = `Dispositivo guardado: ${deviceId}`;
  } else {
    document.getElementById('printer-status').innerText = 'No hay impresora conectada';
  }
}

// Backup / Restore
async function exportBackup() {
  const tables = ['users', 'products', 'sales', 'saleItems', 'cashCuts', 'sessions', 'settings'];
  const backup = {};
  for (let table of tables) {
    backup[table] = await db[table].toArray();
  }
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mis-mezcales-backup-${new Date().toISOString()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importBackup(fileInput) {
  const file = fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const backup = JSON.parse(e.target.result);
      // Limpiar DB y restaurar
      await db.delete();
      await db.open();
      await seedDatabase(); // Recrea estructura
      for (let table of Object.keys(backup)) {
        if (backup[table].length) {
          await db[table].bulkAdd(backup[table]);
        }
      }
      alert('Backup restaurado correctamente. La página se recargará.');
      location.reload();
    } catch (err) {
      alert('Error al restaurar backup: ' + err.message);
    }
  };
  reader.readAsText(file);
}

window.loadSettings = loadSettings;
window.saveBusinessSettings = saveBusinessSettings;
window.loadUsersTable = loadUsersTable;
window.editUser = editUser;
window.saveUser = saveUser;
window.toggleUserActive = toggleUserActive;
window.showUserModal = showUserModal;
window.closeUserModal = closeUserModal;
window.connectBluetoothPrinter = connectBluetoothPrinter;
window.exportBackup = exportBackup;
window.importBackup = importBackup;
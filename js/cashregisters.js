let currentSession = null;

async function loadCashRegister() {
  // Obtener sesión activa (turno abierto)
  currentSession = await db.sessions.where('closedAt').equals(null).first();
  if (!currentSession) {
    // Si no hay sesión, mostrar botón para abrir turno
    document.getElementById('cut-controls').innerHTML = `
      <button onclick="openShift()">Abrir Turno</button>
    `;
    document.getElementById('cut-summary').innerHTML = '<p>No hay turno abierto.</p>';
    return;
  }
  // Mostrar fondo inicial y opciones de corte
  document.getElementById('cut-controls').innerHTML = `
    <p>Fondo inicial: $${currentSession.initialCash}</p>
    <button onclick="showCutModal('shift')">Corte de turno</button>
    <button onclick="showCutModal('day')">Corte del día</button>
    <button onclick="closeShift()">Cerrar turno</button>
  `;
  // Mostrar ventas del turno actual
  const sales = await db.sales.where('date').above(currentSession.openedAt).toArray();
  const total = sales.reduce((a,b) => a + b.total, 0);
  const cashSales = sales.filter(s => s.paymentMethod === 'cash').reduce((a,b) => a + b.total, 0);
  document.getElementById('cut-summary').innerHTML = `
    <div>Ventas del turno: $${total.toFixed(2)}</div>
    <div>Ventas en efectivo: $${cashSales.toFixed(2)}</div>
    <div>Efectivo esperado: $${(currentSession.initialCash + cashSales).toFixed(2)}</div>
  `;
}

async function openShift() {
  const initialCash = parseFloat(prompt('Monto de fondo inicial en caja:', '500'));
  if (isNaN(initialCash)) return;
  const user = window.auth.getCurrentUser();
  await db.sessions.add({
    userId: user.id,
    openedAt: new Date(),
    closedAt: null,
    initialCash: initialCash
  });
  loadCashRegister();
}

async function closeShift() {
  if (!confirm('Cerrar turno actual? No se podrán añadir más ventas a este turno.')) return;
  const sales = await db.sales.where('date').above(currentSession.openedAt).toArray();
  const totalSales = sales.reduce((a,b) => a + b.total, 0);
  const paymentBreakdown = {
    cash: sales.filter(s => s.paymentMethod === 'cash').reduce((a,b) => a + b.total, 0),
    card: sales.filter(s => s.paymentMethod === 'card').reduce((a,b) => a + b.total, 0)
  };
  const expectedCash = currentSession.initialCash + paymentBreakdown.cash;
  const declaredCash = parseFloat(prompt('Declare el efectivo actual en caja:', expectedCash));
  const difference = declaredCash - expectedCash;
  await db.cashCuts.add({
    type: 'shift',
    date: new Date(),
    userId: currentSession.userId,
    totalSales: totalSales,
    transactions: sales.length,
    paymentBreakdown: paymentBreakdown,
    initialCash: currentSession.initialCash,
    expectedCash: expectedCash,
    difference: difference,
    details: sales.map(s => s.id),
    closedAt: new Date()
  });
  currentSession.closedAt = new Date();
  await db.sessions.put(currentSession);
  loadCashRegister();
}

async function showCutModal(type) {
  let sales = [];
  if (type === 'shift') {
    sales = await db.sales.where('date').above(currentSession.openedAt).toArray();
  } else {
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
    sales = await db.sales.where('date').between(todayStart, todayEnd).toArray();
  }
  const total = sales.reduce((a,b) => a + b.total, 0);
  const cashTotal = sales.filter(s => s.paymentMethod === 'cash').reduce((a,b) => a + b.total, 0);
  const cardTotal = total - cashTotal;
  const expectedCash = (type === 'shift' ? currentSession.initialCash : 0) + cashTotal;
  const html = `
    <h3>Corte de ${type === 'shift' ? 'Turno' : 'Día'}</h3>
    <p>Total ventas: $${total.toFixed(2)}</p>
    <p>Transacciones: ${sales.length}</p>
    <p>Efectivo: $${cashTotal.toFixed(2)} | Tarjeta: $${cardTotal.toFixed(2)}</p>
    <p>Efectivo esperado: $${expectedCash.toFixed(2)}</p>
    <label>Efectivo declarado: <input type="number" id="declared-cash" value="${expectedCash}"></label>
    <button onclick="printCut('${type}', ${total}, ${sales.length}, ${cashTotal}, ${cardTotal}, ${expectedCash})">Imprimir corte</button>
    <button onclick="closeModal()">Cerrar</button>
  `;
  document.getElementById('cut-modal-content').innerHTML = html;
  document.getElementById('cut-modal').classList.add('active');
}

function printCut(type, total, transactions, cashTotal, cardTotal, expectedCash) {
  const declared = parseFloat(document.getElementById('declared-cash').value) || expectedCash;
  const diff = declared - expectedCash;
  const printContent = `
    <div id="ticket-print" style="width:58mm; font-family:monospace;">
      <center><h3>Mis Mezcales</h3></center>
      <center>Corte de ${type === 'shift' ? 'Turno' : 'Día'}</center>
      <hr/>
      Fecha: ${new Date().toLocaleString()}<br/>
      Total ventas: $${total.toFixed(2)}<br/>
      Transacciones: ${transactions}<br/>
      Efectivo: $${cashTotal.toFixed(2)}<br/>
      Tarjeta: $${cardTotal.toFixed(2)}<br/>
      Efectivo esperado: $${expectedCash.toFixed(2)}<br/>
      Declarado: $${declared.toFixed(2)}<br/>
      Diferencia: $${diff.toFixed(2)}<br/>
      <hr/>
      <center>¡Gracias por su trabajo!</center>
    </div>
  `;
  const printWindow = window.open('', '_blank');
  printWindow.document.write(printContent);
  printWindow.print();
}

window.loadCashRegister = loadCashRegister;
window.openShift = openShift;
window.closeShift = closeShift;
window.showCutModal = showCutModal;
window.printCut = printCut;
let salesChart = null, paymentChart = null, trendChart = null, topProductsChart = null;
let currentSalesPage = 1;
const salesPerPage = 10;
let currentSalesFilter = { startDate: null, endDate: null, method: 'all', userId: 'all' };

async function renderReports() {
  await updateKPIs();
  await renderDailySalesChart();
  await renderPaymentMethodChart();
  await renderMonthlyTrendChart();
  await renderTopProductsChart();
  await renderSalesHistory();
}

async function updateKPIs() {
  const today = new Date();
  today.setHours(0,0,0,0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const salesToday = await db.sales.where('date').between(today, tomorrow).toArray();
  const totalToday = salesToday.reduce((a,b) => a + b.total, 0);
  const transactionsToday = salesToday.length;
  
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const salesWeek = await db.sales.where('date').above(weekAgo).toArray();
  const totalWeek = salesWeek.reduce((a,b) => a + b.total, 0);
  
  const products = await db.products.toArray();
  const lowStockCount = products.filter(p => p.active && p.stock <= p.minStock).length;
  
  document.getElementById('sales-today').innerText = `$${totalToday.toFixed(2)}`;
  document.getElementById('transactions-today').innerText = transactionsToday;
  document.getElementById('sales-week').innerText = `$${totalWeek.toFixed(2)}`;
  document.getElementById('low-stock-count').innerText = lowStockCount;
}

async function renderDailySalesChart() {
  const last7 = [];
  const values = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    day.setHours(0,0,0,0);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    const sales = await db.sales.where('date').between(day, nextDay).toArray();
    const total = sales.reduce((a,b) => a + b.total, 0);
    last7.push(day.toLocaleDateString('es-MX', { weekday:'short' }));
    values.push(total);
  }
  const ctx = document.getElementById('daily-sales-chart').getContext('2d');
  if (salesChart) salesChart.destroy();
  salesChart = new Chart(ctx, {
    type: 'bar',
    data: { labels: last7, datasets: [{ label: 'Ventas ($)', data: values, backgroundColor: '#7D1935' }] }
  });
}

async function renderPaymentMethodChart() {
  const sales = await db.sales.toArray();
  const cashTotal = sales.filter(s => s.paymentMethod === 'cash').reduce((a,b) => a + b.total, 0);
  const cardTotal = sales.filter(s => s.paymentMethod === 'card').reduce((a,b) => a + b.total, 0);
  const ctx = document.getElementById('payment-method-chart').getContext('2d');
  if (paymentChart) paymentChart.destroy();
  paymentChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels: ['Efectivo', 'Tarjeta'], datasets: [{ data: [cashTotal, cardTotal], backgroundColor: ['#2D6A4F', '#C8962E'] }] }
  });
}

async function renderMonthlyTrendChart() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const labels = [];
  const data = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const start = new Date(year, month, d);
    const end = new Date(year, month, d+1);
    const sales = await db.sales.where('date').between(start, end).toArray();
    const total = sales.reduce((a,b) => a + b.total, 0);
    labels.push(d);
    data.push(total);
  }
  const ctx = document.getElementById('trend-chart').getContext('2d');
  if (trendChart) trendChart.destroy();
  trendChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: 'Ventas diarias', data, borderColor: '#8B4513', fill: false }] }
  });
}

async function renderTopProductsChart() {
  const saleItems = await db.saleItems.toArray();
  const productQty = {};
  for (let item of saleItems) {
    if (!productQty[item.productId]) productQty[item.productId] = 0;
    productQty[item.productId] += item.quantity;
  }
  const sorted = Object.entries(productQty).sort((a,b) => b[1] - a[1]).slice(0,5);
  const productNames = [];
  const quantities = [];
  for (let [pid, qty] of sorted) {
    const prod = await db.products.get(parseInt(pid));
    if (prod) productNames.push(prod.name);
    quantities.push(qty);
  }
  const ctx = document.getElementById('top-products-chart').getContext('2d');
  if (topProductsChart) topProductsChart.destroy();
  topProductsChart = new Chart(ctx, {
    type: 'bar',
    data: { labels: productNames, datasets: [{ label: 'Cantidad vendida', data: quantities, backgroundColor: '#C8962E' }] },
    options: { indexAxis: 'y' }
  });
}

async function renderSalesHistory() {
  let sales = await db.sales.toArray();
  // Aplicar filtros
  if (currentSalesFilter.startDate) {
    const start = new Date(currentSalesFilter.startDate);
    start.setHours(0,0,0,0);
    sales = sales.filter(s => new Date(s.date) >= start);
  }
  if (currentSalesFilter.endDate) {
    const end = new Date(currentSalesFilter.endDate);
    end.setHours(23,59,59,999);
    sales = sales.filter(s => new Date(s.date) <= end);
  }
  if (currentSalesFilter.method !== 'all') {
    sales = sales.filter(s => s.paymentMethod === currentSalesFilter.method);
  }
  if (currentSalesFilter.userId !== 'all') {
    sales = sales.filter(s => s.userId === parseInt(currentSalesFilter.userId));
  }
  sales.sort((a,b) => b.date - a.date);
  const totalPages = Math.ceil(sales.length / salesPerPage);
  const startIdx = (currentSalesPage - 1) * salesPerPage;
  const pageSales = sales.slice(startIdx, startIdx + salesPerPage);
  const tbody = document.getElementById('sales-history-tbody');
  tbody.innerHTML = pageSales.map(s => `
    <tr onclick="showSaleDetail(${s.id})" style="cursor:pointer">
      <td>${s.folio}</td>
      <td>${new Date(s.date).toLocaleString()}</td>
      <td>$${s.total.toFixed(2)}</td>
      <td>${s.paymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta'}</td>
      <td>${s.userId}</td>
    </tr>
  `).join('');
  document.getElementById('sales-pagination').innerHTML = `
    <button onclick="changeSalesPage(-1)" ${currentSalesPage === 1 ? 'disabled' : ''}>Anterior</button>
    Página ${currentSalesPage} de ${totalPages}
    <button onclick="changeSalesPage(1)" ${currentSalesPage === totalPages ? 'disabled' : ''}>Siguiente</button>
  `;
}

function changeSalesPage(delta) {
  currentSalesPage += delta;
  renderSalesHistory();
}

async function showSaleDetail(saleId) {
  const sale = await db.sales.get(saleId);
  const items = await db.saleItems.where('saleId').equals(saleId).toArray();
  const itemsWithNames = await Promise.all(items.map(async item => {
    const prod = await db.products.get(item.productId);
    return { ...item, productName: prod ? prod.name : 'Producto' };
  }));
  const detailHtml = `
    <h3>Venta Folio ${sale.folio}</h3>
    <p>Fecha: ${new Date(sale.date).toLocaleString()}</p>
    <p>Total: $${sale.total.toFixed(2)}</p>
    <p>Método: ${sale.paymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta'}</p>
    <hr/>
    <table width="100%"><tr><th>Producto</th><th>Cant</th><th>Precio</th></tr>
    ${itemsWithNames.map(i => `<tr><td>${i.productName}</td><td>${i.quantity}</td><td>$${i.price}</td></tr>`).join('')}
    </table>
    <button onclick="reprintTicket(${sale.id})">Reimprimir ticket</button>
    <button onclick="closeModal()">Cerrar</button>
  `;
  document.getElementById('sale-detail-content').innerHTML = detailHtml;
  document.getElementById('sale-detail-modal').classList.add('active');
}

async function reprintTicket(saleId) {
  const sale = await db.sales.get(saleId);
  const items = await db.saleItems.where('saleId').equals(saleId).toArray();
  const itemsWithNames = await Promise.all(items.map(async item => {
    const prod = await db.products.get(item.productId);
    return { name: prod.name, quantity: item.quantity, price: item.price };
  }));
  const subtotal = itemsWithNames.reduce((a,b) => a + (b.price * b.quantity), 0);
  printTicket({
    folio: sale.folio,
    date: sale.date,
    items: itemsWithNames,
    subtotal: subtotal,
    discount: sale.discount || 0,
    total: sale.total,
    method: sale.paymentMethod,
    received: sale.received,
    change: sale.change
  });
}

function exportSalesToCSV() {
  // Implementar exportación según filtros actuales (similar a renderSalesHistory pero sin paginación)
  alert('Función de exportación CSV implementada (se puede generar en cliente). Por simplicidad, se omite aquí, pero añade el código para recorrer sales filtradas y crear blob.');
}

function applySalesFilters() {
  currentSalesFilter.startDate = document.getElementById('filter-start-date').value;
  currentSalesFilter.endDate = document.getElementById('filter-end-date').value;
  currentSalesFilter.method = document.getElementById('filter-payment-method').value;
  currentSalesFilter.userId = document.getElementById('filter-user').value;
  currentSalesPage = 1;
  renderSalesHistory();
}
//agregado
async function exportSalesToCSV() {
  let sales = await db.sales.toArray();
  // Aplicar los mismos filtros que en renderSalesHistory
  if (currentSalesFilter.startDate) {
    const start = new Date(currentSalesFilter.startDate);
    start.setHours(0,0,0,0);
    sales = sales.filter(s => new Date(s.date) >= start);
  }
  if (currentSalesFilter.endDate) {
    const end = new Date(currentSalesFilter.endDate);
    end.setHours(23,59,59,999);
    sales = sales.filter(s => new Date(s.date) <= end);
  }
  if (currentSalesFilter.method !== 'all') {
    sales = sales.filter(s => s.paymentMethod === currentSalesFilter.method);
  }
  if (currentSalesFilter.userId !== 'all') {
    sales = sales.filter(s => s.userId === parseInt(currentSalesFilter.userId));
  }
  
  const csvRows = [['Folio','Fecha','Total','Método','Usuario']];
  for (const sale of sales) {
    csvRows.push([
      sale.folio,
      new Date(sale.date).toLocaleString(),
      sale.total,
      sale.paymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta',
      sale.userId
    ]);
  }
  const csvContent = csvRows.map(row => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.setAttribute('download', `ventas_${new Date().toISOString()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}//agregado

window.renderReports = renderReports;
window.changeSalesPage = changeSalesPage;
window.showSaleDetail = showSaleDetail;
window.reprintTicket = reprintTicket;
window.exportSalesToCSV = exportSalesToCSV;
window.applySalesFilters = applySalesFilters;
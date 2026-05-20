function printTicket(sale) {
  // Crear elemento oculto para impresión
  let printDiv = document.getElementById('print-ticket-container');
  if (!printDiv) {
    printDiv = document.createElement('div');
    printDiv.id = 'print-ticket-container';
    printDiv.style.position = 'absolute';
    printDiv.style.left = '-9999px';
    document.body.appendChild(printDiv);
  }
  const thankMsg = "¡Gracias por su visita! Que disfrute su mezcal 🌵";
  const itemsHtml = sale.items.map(i => `
    <tr><td>${i.name}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">$${i.price.toFixed(2)}</td></tr>
  `).join('');
  const subtotal = sale.subtotal || sale.items.reduce((a,b) => a + (b.price * b.quantity), 0);
  const discountAmount = subtotal * (sale.discount / 100);
  const total = sale.total || (subtotal - discountAmount);
  const html = `
    <div style="width:58mm; font-family:'Courier New', monospace; font-size:10px; padding:4px;">
      <center><h3>Mis Mezcales</h3></center>
      <center>Mercado Porfirio Díaz Local 114</center>
      <center>Huajuapan de León, Oaxaca</center>
      <hr/>
      Folio: ${sale.folio}<br/>
      Fecha: ${new Date(sale.date).toLocaleString()}<br/>
      <hr/>
      <table width="100%"><tr><th>Producto</th><th>Cant</th><th>Precio</th></tr>${itemsHtml}</table>
      <hr/>
      Subtotal: $${subtotal.toFixed(2)}<br/>
      Descuento: ${sale.discount}% -$${discountAmount.toFixed(2)}<br/>
      TOTAL: $${total.toFixed(2)}<br/>
      Pago: ${sale.method === 'cash' ? 'Efectivo' : 'Tarjeta'}<br/>
      Recibido: $${(sale.received || total).toFixed(2)}<br/>
      Cambio: $${(sale.change || 0).toFixed(2)}<br/>
      <hr/>
      <center>${thankMsg}</center>
    </div>
  `;
  printDiv.innerHTML = html;
  // Imprimir
  window.print();
  // Limpiar después de imprimir (opcional)
  setTimeout(() => { printDiv.innerHTML = ''; }, 100);
}

// Sobrescribir comportamiento de impresión para ocultar el resto de la UI
const originalPrint = window.print;
window.print = function() {
  const originalTitle = document.title;
  document.title = 'Imprimir Ticket';
  const printContainer = document.getElementById('print-ticket-container');
  if (printContainer && printContainer.innerHTML.trim() !== '') {
    const originalBody = document.body.innerHTML;
    document.body.innerHTML = printContainer.innerHTML;
    originalPrint.call(window);
    document.body.innerHTML = originalBody;
    document.title = originalTitle;
    location.reload(); // Recargar para restaurar eventos, o usar un método más elegante
  } else {
    originalPrint.call(window);
  }
};

window.printTicket = printTicket;
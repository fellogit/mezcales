let cart = []; // { productId, name, price, quantity, discountPercent }
let currentDiscountGlobal = 0;

async function refreshProductGrid() {
  const searchTerm = document.getElementById('product-search')?.value.toLowerCase() || '';
  const activeCat = document.querySelector('.category-filter.active')?.dataset.cat || 'all';
  let products = await db.products.where('active').equals(1).toArray();
  products = products.filter(p => p.name.toLowerCase().includes(searchTerm));
  if (activeCat !== 'all') products = products.filter(p => p.category === activeCat);
  const grid = document.getElementById('products-grid');
  grid.innerHTML = products.map(p => `
    <div class="product-card" onclick="addToCart(${p.id}, '${p.name.replace(/'/g, "\\'")}', ${p.price})">
      <div>${p.name}</div>
      <div><strong>$${p.price}</strong></div>
      <div class="badge ${p.stock <= p.minStock ? 'badge-lowstock' : ''}">Stock: ${p.stock}</div>
    </div>
  `).join('');
}

function addToCart(id, name, price) {
  const existing = cart.find(i => i.productId === id);
  if (existing) existing.quantity++;
  else cart.push({ productId: id, name, price, quantity: 1, discountPercent: 0 });
  renderCart();
}

function renderCart() {
  const tbody = document.getElementById('cart-items');
  let subtotal = 0;
  tbody.innerHTML = cart.map((item, idx) => {
    const itemTotal = item.price * item.quantity * (1 - item.discountPercent/100);
    subtotal += itemTotal;
    return `
      <tr>
        <td>${item.name}</td>
        <td><button onclick="changeQty(${idx}, -1)">-</button> ${item.quantity} <button onclick="changeQty(${idx}, 1)">+</button></td>
        <td>$${item.price}</td>
        <td><input type="number" step="5" value="${item.discountPercent}" onchange="updateItemDiscount(${idx}, this.value)" style="width:50px"></td>
        <td>$${itemTotal.toFixed(2)}</td>
        <td><button onclick="removeItem(${idx})">🗑️</button></td>
      </tr>
    `;
  }).join('');
  const discountAmount = subtotal * (currentDiscountGlobal/100);
  const total = subtotal - discountAmount;
  document.getElementById('subtotal').innerText = subtotal.toFixed(2);
  document.getElementById('discount-global').value = currentDiscountGlobal;
  document.getElementById('total-amount').innerText = total.toFixed(2);
  document.getElementById('global-discount-amount').innerText = discountAmount.toFixed(2);
}

function changeQty(idx, delta) {
  const newQty = cart[idx].quantity + delta;
  if (newQty > 0) cart[idx].quantity = newQty;
  else cart.splice(idx,1);
  renderCart();
}
function updateItemDiscount(idx, val) { cart[idx].discountPercent = parseFloat(val)||0; renderCart(); }
function removeItem(idx) { cart.splice(idx,1); renderCart(); }
function updateGlobalDiscount() {
  currentDiscountGlobal = parseFloat(document.getElementById('discount-global').value)||0;
  renderCart();
}

async function checkout() {
  if (cart.length === 0) return alert('Carrito vacío');
  const modal = document.getElementById('payment-modal');
  modal.classList.add('active');
  document.getElementById('payment-method').value = 'cash';
  document.getElementById('cash-fields').style.display = 'block';
  calculateChange();
}
function calculateChange() {
  const total = parseFloat(document.getElementById('total-amount').innerText);
  const received = parseFloat(document.getElementById('received-amount').value)||0;
  const change = received - total;
  document.getElementById('change-amount').innerText = change >=0 ? change.toFixed(2) : 0;
}
async function confirmSale() {
  const method = document.getElementById('payment-method').value;
  const received = method === 'cash' ? parseFloat(document.getElementById('received-amount').value)||0 : total;
  const total = parseFloat(document.getElementById('total-amount').innerText);
  const change = method === 'cash' ? received - total : 0;
  if (method === 'cash' && received < total) return alert('Monto insuficiente');
  
  // Generar folio
  const lastSale = await db.sales.orderBy('id').last();
  const folio = lastSale ? lastSale.id+1 : 1;
  const saleId = await db.sales.add({
    folio, date: new Date(), userId: window.auth.currentUser.id,
    paymentMethod: method, total, discount: currentDiscountGlobal,
    received, change: change>0?change:0
  });
  for (const item of cart) {
    await db.saleItems.add({ saleId, productId: item.productId, quantity: item.quantity, price: item.price, discountPercent: item.discountPercent });
    // Actualizar stock
    const product = await db.products.get(item.productId);
    product.stock -= item.quantity;
    await db.products.put(product);
  }
  // Imprimir ticket
  printTicket({ folio, date: new Date(), items: cart, subtotal: parseFloat(document.getElementById('subtotal').innerText), discount: currentDiscountGlobal, total, method, received, change });
  cart = [];
  currentDiscountGlobal = 0;
  renderCart();
  document.getElementById('payment-modal').classList.remove('active');
  refreshProductGrid();
}
window.addToCart = addToCart;
window.changeQty = changeQty;
window.updateItemDiscount = updateItemDiscount;
window.removeItem = removeItem;
window.updateGlobalDiscount = updateGlobalDiscount;
window.checkout = checkout;
window.calculateChange = calculateChange;
window.confirmSale = confirmSale;
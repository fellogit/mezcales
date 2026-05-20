let currentInventoryFilter = 'all';
let currentInventorySort = { field: 'name', asc: true };

async function loadInventory() {
  let products = await db.products.toArray();
  // Filtro por categoría
  if (currentInventoryFilter !== 'all') {
    products = products.filter(p => p.category === currentInventoryFilter);
  }
  // Ordenamiento
  products.sort((a, b) => {
    let valA = a[currentInventorySort.field];
    let valB = b[currentInventorySort.field];
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return currentInventorySort.asc ? -1 : 1;
    if (valA > valB) return currentInventorySort.asc ? 1 : -1;
    return 0;
  });
  const tbody = document.getElementById('inventory-tbody');
  tbody.innerHTML = products.map(p => `
    <tr data-id="${p.id}">
      <td>${p.name}</td>
      <td>${p.category}</td>
      <td>$${p.price}</td>
      <td>$${p.cost || 0}</td>
      <td class="${p.stock <= p.minStock ? 'badge-lowstock' : ''}">${p.stock} / min:${p.minStock}</td>
      <td>
        <button class="btn-small" onclick="editProduct(${p.id})">✏️</button>
        <button class="btn-small" onclick="deleteProduct(${p.id})">🗑️</button>
      </td>
    </tr>
  `).join('');
  // Alertas stock bajo
  const lowStockProducts = products.filter(p => p.active && p.stock <= p.minStock);
  const alertDiv = document.getElementById('stock-alerts');
  if (lowStockProducts.length) {
    alertDiv.innerHTML = `<div class="alert alert-danger"><strong>⚠️ Stock bajo en:</strong> ${lowStockProducts.map(p => p.name).join(', ')}</div>`;
  } else {
    alertDiv.innerHTML = '';
  }
}

function filterInventory(category) {
  currentInventoryFilter = category;
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  if (category === 'all') document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');
  else document.querySelector(`.filter-btn[data-filter="${category}"]`).classList.add('active');
  loadInventory();
}

function sortInventory(field) {
  if (currentInventorySort.field === field) {
    currentInventorySort.asc = !currentInventorySort.asc;
  } else {
    currentInventorySort.field = field;
    currentInventorySort.asc = true;
  }
  loadInventory();
}

async function editProduct(id) {
  const product = await db.products.get(id);
  if (!product) return;
  document.getElementById('product-id').value = product.id;
  document.getElementById('product-name').value = product.name;
  document.getElementById('product-sku').value = product.sku;
  document.getElementById('product-category').value = product.category;
  document.getElementById('product-price').value = product.price;
  document.getElementById('product-cost').value = product.cost || '';
  document.getElementById('product-stock').value = product.stock;
  document.getElementById('product-minstock').value = product.minStock;
  document.getElementById('product-active').checked = product.active;
  document.getElementById('product-modal-title').innerText = 'Editar Producto';
  document.getElementById('product-modal').classList.add('active');
}

async function deleteProduct(id) {
  if (!confirm('¿Desactivar producto? (soft delete)')) return;
  const product = await db.products.get(id);
  product.active = false;
  await db.products.put(product);
  loadInventory();
}

async function saveProduct() {
  const id = document.getElementById('product-id').value;
  const name = document.getElementById('product-name').value.trim();
  if (!name) return alert('Nombre requerido');
  const sku = document.getElementById('product-sku').value.trim() || `SKU-${Date.now()}`;
  const category = document.getElementById('product-category').value;
  const price = parseFloat(document.getElementById('product-price').value);
  if (isNaN(price)) return alert('Precio inválido');
  const cost = parseFloat(document.getElementById('product-cost').value) || 0;
  const stock = parseInt(document.getElementById('product-stock').value) || 0;
  const minStock = parseInt(document.getElementById('product-minstock').value) || 0;
  const active = document.getElementById('product-active').checked;
  const productData = { name, sku, category, price, cost, stock, minStock, active };
  if (id) {
    productData.id = parseInt(id);
    await db.products.put(productData);
  } else {
    await db.products.add(productData);
  }
  closeProductModal();
  loadInventory();
}

function showProductModal() {
  document.getElementById('product-id').value = '';
  document.getElementById('product-name').value = '';
  document.getElementById('product-sku').value = '';
  document.getElementById('product-category').value = 'Mezcal';
  document.getElementById('product-price').value = '';
  document.getElementById('product-cost').value = '';
  document.getElementById('product-stock').value = '0';
  document.getElementById('product-minstock').value = '0';
  document.getElementById('product-active').checked = true;
  document.getElementById('product-modal-title').innerText = 'Nuevo Producto';
  document.getElementById('product-modal').classList.add('active');
}

function closeProductModal() {
  document.getElementById('product-modal').classList.remove('active');
}

window.loadInventory = loadInventory;
window.filterInventory = filterInventory;
window.sortInventory = sortInventory;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.saveProduct = saveProduct;
window.showProductModal = showProductModal;
window.closeProductModal = closeProductModal;
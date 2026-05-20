const db = new Dexie('MisMezcalesDB');

db.version(1).stores({
  users: '++id, username, role, active',
  products: '++id, sku, name, category, active, stock',
  sales: '++id, folio, date, userId, paymentMethod, total, discount, received, change',
  saleItems: '++id, saleId, productId, quantity, price, discountPercent',
  cashCuts: '++id, type, date, userId, totalSales, transactions, paymentBreakdown, initialCash, expectedCash, difference, details, closedAt',
  sessions: '++id, userId, openedAt, closedAt, initialCash',
  settings: 'key'
});

// Función hash (usada también en auth)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function seedDatabase() {
  const userCount = await db.users.count();
  if (userCount === 0) {
    const hashAdmin = await hashPassword('mezcal2024');
    const hashCajero = await hashPassword('cajero123');
    await db.users.bulkAdd([
      { username: 'admin', password: hashAdmin, role: 'admin', active: true },
      { username: 'cajero1', password: hashCajero, role: 'cajero', active: true }
    ]);
  }
  const prodCount = await db.products.count();
  if (prodCount === 0) {
    const sampleProducts = [
      { sku: 'MEZ-001', name: 'Mezcal Artesanal Espadín', category: 'Mezcal', price: 380, cost: 200, stock: 25, minStock: 5, active: true },
      { sku: 'MEZ-002', name: 'Mezcal Tobalá', category: 'Mezcal', price: 650, cost: 350, stock: 12, minStock: 3, active: true },
      { sku: 'TEX-001', name: 'Servilleta Bordada', category: 'Textiles', price: 120, cost: 60, stock: 40, minStock: 10, active: true },
      { sku: 'CER-001', name: 'Copa de Barro', category: 'Cerámica', price: 90, cost: 35, stock: 30, minStock: 8, active: true },
      { sku: 'COM-001', name: 'Dulce de Tamarindo', category: 'Comestibles', price: 25, cost: 8, stock: 200, minStock: 20, active: true },
      { sku: 'ART-001', name: 'Alebrije Pequeño', category: 'Artesanías', price: 280, cost: 120, stock: 8, minStock: 2, active: true },
      { sku: 'MEZ-003', name: 'Mezcal Cuish', category: 'Mezcal', price: 520, cost: 260, stock: 9, minStock: 2, active: true },
      { sku: 'TEX-002', name: 'Morral de Lana', category: 'Textiles', price: 350, cost: 180, stock: 15, minStock: 4, active: true },
      { sku: 'COM-002', name: 'Chocolate Artesanal', category: 'Comestibles', price: 45, cost: 18, stock: 55, minStock: 10, active: true },
      { sku: 'CER-002', name: 'Plato Decorativo', category: 'Cerámica', price: 160, cost: 70, stock: 20, minStock: 5, active: true },
      { sku: 'ART-002', name: 'Máscara de Madera', category: 'Artesanías', price: 420, cost: 200, stock: 6, minStock: 2, active: true },
      { sku: 'MEZ-004', name: 'Mezcal Pechuga', category: 'Mezcal', price: 890, cost: 450, stock: 5, minStock: 1, active: true }
    ];
    await db.products.bulkAdd(sampleProducts);
  }
  const salesCount = await db.sales.count();
  if (salesCount === 0) {
    // Generar ventas demo de los últimos 7 días
    const products = await db.products.toArray();
    const adminUser = await db.users.where('username').equals('admin').first();
    const userId = adminUser.id;
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 7));
      const total = Math.floor(Math.random() * 1500) + 200;
      const paymentMethod = Math.random() > 0.6 ? 'cash' : 'card';
      const saleId = await db.sales.add({
        folio: i + 1,
        date: date,
        userId: userId,
        paymentMethod: paymentMethod,
        total: total,
        discount: Math.random() > 0.8 ? 10 : 0,
        received: paymentMethod === 'cash' ? total + Math.random() * 100 : total,
        change: paymentMethod === 'cash' ? (Math.random() * 100) : 0
      });
      // Agregar 1-3 items aleatorios
      const numItems = Math.floor(Math.random() * 3) + 1;
      for (let j = 0; j < numItems; j++) {
        const prod = products[Math.floor(Math.random() * products.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        await db.saleItems.add({
          saleId: saleId,
          productId: prod.id,
          quantity: qty,
          price: prod.price,
          discountPercent: 0
        });
      }
    }
  }
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.bulkAdd([
      { key: 'business_name', value: 'Mis Mezcales' },
      { key: 'business_address', value: 'Mercado Porfirio Díaz Local 114, Huajuapan de León, Oaxaca' },
      { key: 'business_phone', value: '953 123 4567' },
      { key: 'thankyou_message', value: '¡Gracias por su visita! Que disfrute su mezcal 🌵' },
      { key: 'printer_device_id', value: null }
    ]);
  }
  // Verificar si hay sesión activa (para corte)
  const activeSession = await db.sessions.where('closedAt').equals(null).first();
  if (!activeSession && (await db.users.count()) > 0) {
    // Crear sesión inicial para el admin (turno abierto)
    await db.sessions.add({
      userId: adminUser.id,
      openedAt: new Date(),
      closedAt: null,
      initialCash: 500
    });
  }
}

seedDatabase();
window.db = db;
window.hashPassword = hashPassword;
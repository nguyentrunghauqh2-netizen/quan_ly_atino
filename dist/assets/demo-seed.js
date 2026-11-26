/*
 * Optional, small classroom dataset for the Atino management demonstration.
 * Product names and public retail-price references come from AtinoCatalog.
 * ALL quantities, purchase prices, people, contacts, shifts and transactions
 * below are fictional examples, not Atino business data. This function never
 * changes account credentials or replaces records already stored by a user.
 * Each additive migration anchors its dates once, then leaves them fixed.
 */
(() => {
  'use strict';
  const VERSION = 2;
  const TAG = 'atino-static-v1';
  const DAY = 86400000;
  const checkedFields = ['jobTitle', 'baseSalary', 'hourlyRate', 'payType', 'startDate', 'defaultShift', 'phone'];
  const codes = Object.freeze({
    'atino-balo-19339': 'DEMO-TB001',
    'atino-tui-cheo-19351': 'DEMO-TB002',
    'atino-dep-da-19801': 'DEMO-GD001',
    'atino-giay-19816': 'DEMO-GD002',
    'atino-mu-m204': 'DEMO-MU001',
    'atino-day-lung-9902': 'DEMO-DL001',
    'atino-tat-59600': 'DEMO-TA001',
    'atino-quan-lot-xl51900': 'DEMO-QL001'
  });

  function businessDay(when) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(when).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }
  const missing = value => value === undefined || value === null || value === '';
  const tagged = fields => ({...fields, demoSeed: TAG});

  function applyV1(shop) {
    if (!shop || typeof shop !== 'object' || Number(shop.staticDemoVersion) >= 1) return false;
    const catalog = window.AtinoCatalog;
    if (!catalog || !Array.isArray(catalog.references) || !catalog.references.length) return false;
    for (const key of ['products', 'movements', 'customers', 'suppliers', 'staff', 'shifts', 'vouchers', 'returns', 'audit']) {
      if (!Array.isArray(shop[key])) shop[key] = [];
    }
    if (!shop.stockNotes || typeof shop.stockNotes !== 'object') shop.stockNotes = {};
    const now = Date.now();
    const anchor = businessDay(now);
    const midnight = Date.parse(anchor + 'T00:00:00+07:00');
    const dateAt = offset => businessDay(midnight + offset * DAY);
    const timeAt = (offset, hour = 10, minute = 0) => Date.parse(`${dateAt(offset)}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+07:00`);
    const put = (list, row, key = 'id') => {
      const found = list.find(existing => existing[key] === row[key]);
      if (!found) { list.push(row); return row; }
      return found.demoSeed === TAG ? found : null;
    };

    let supplier = shop.suppliers.find(row => row.id === 'NCC001');
    if (!supplier) {
      supplier = {id: 'NCC001', name: 'Kho tổng Atino', active: true, note: 'Đầu mối kho tổng; thông tin liên hệ dưới đây là dữ liệu mẫu.'};
      shop.suppliers.push(supplier);
    }
    const contactExample = {
      contact: 'Đầu mối tiếp hàng (mẫu)', phone: '0000 000 001',
      email: 'khotong@example.invalid', address: 'Địa chỉ kho tổng — dữ liệu minh họa'
    };
    const addedContactFields = [];
    for (const [key, value] of Object.entries(contactExample)) {
      if (missing(supplier[key])) { supplier[key] = value; addedContactFields.push(key); }
    }
    if (addedContactFields.length) supplier.demoContactFields = [...new Set([...(supplier.demoContactFields || []), ...addedContactFields])];

    const staffExamples = {
      NV001: {jobTitle: 'Quản lý cửa hàng', baseSalary: 12000000, hourlyRate: 0, payType: 'monthly', startDate: dateAt(-240), defaultShift: '08:00 – 16:00', phone: '0000 000 101'},
      NV002: {jobTitle: 'Nhân viên cửa hàng', baseSalary: 6500000, hourlyRate: 30000, payType: 'hourly', startDate: dateAt(-120), defaultShift: '08:00 – 14:00', phone: '0000 000 102'}
    };
    for (const person of shop.staff) {
      const example = staffExamples[person.code];
      if (!example) continue;
      const added = [];
      for (const key of checkedFields) {
        if (missing(person[key])) { person[key] = example[key]; added.push(key); }
      }
      if (added.length) person.demoProfileFields = [...new Set([...(person.demoProfileFields || []), ...added])];
    }
    const employee = shop.staff.find(person => person.code === 'NV002' && person.active !== false)
      || shop.staff.find(person => person.role === 'employee' && person.active !== false)
      || shop.staff.find(person => person.active !== false);
    const manager = shop.staff.find(person => person.role === 'manager' && person.active !== false) || employee;
    const actor = employee ? {employeeId: employee.code, employeeName: employee.name} : {employeeId: 'DEMO-SYSTEM', employeeName: 'Dữ liệu mẫu'};

    const seededProducts = new Map();
    for (const reference of catalog.references) {
      const code = codes[reference.id];
      if (!code) continue;
      const product = put(shop.products, tagged({
        code, name: reference.name, category: reference.category,
        price: Number.isSafeInteger(reference.price) && reference.price > 0 ? reference.price : 199000,
        sizes: reference.sizes.slice(), unit: catalog.unitFor(reference.category),
        image: '', active: true, source: reference.source, checkedOn: reference.checkedOn,
        description: 'Dữ liệu mẫu: tên và giá bán tham khảo từ Atino; số lượng, giá nhập và giao dịch là giả lập.'
      }), 'code');
      if (product) seededProducts.set(code, product);
    }

    const customerExamples = [
      {id: 'DEMO-KH001', name: 'Nguyễn Minh Anh', birthday: '2000-' + anchor.slice(5), phone: '0000 000 201', email: 'minhanh@example.invalid', address: 'Hà Nội — dữ liệu mẫu'},
      {id: 'DEMO-KH002', name: 'Trần Hoàng Phúc', birthday: '1998-04-12', phone: '0000 000 202', email: 'hoangphuc@example.invalid', address: 'Hà Nội — dữ liệu mẫu'},
      {id: 'DEMO-KH003', name: 'Lê Thảo Vy', birthday: '1997-08-21', phone: '0000 000 203', email: 'thaovy@example.invalid', address: 'Hà Nội — dữ liệu mẫu'},
      {id: 'DEMO-KH004', name: 'Phạm Gia Bảo', birthday: '2001-12-05', phone: '0000 000 204', email: 'giabao@example.invalid', address: 'Hà Nội — dữ liệu mẫu'}
    ];
    const seededCustomers = new Map();
    for (const example of customerExamples) {
      const customer = put(shop.customers, tagged({...example, active: true, note: 'Hồ sơ khách hàng minh họa; không phải thông tin khách hàng thực tế.', createdAt: timeAt(-40)}));
      if (customer) seededCustomers.set(customer.id, customer);
    }

    // Opening quantities and purchase prices are intentionally fictional.
    const opening = [
      ['DEMO-TB001', 220000, {'Một cỡ': 12}],
      ['DEMO-TB002', 145000, {'Một cỡ': 10}],
      ['DEMO-GD001', 120000, {'39': 4, '40': 6, '41': 6, '42': 4}],
      ['DEMO-GD002', 240000, {'39': 3, '40': 4, '41': 4, '42': 4, '43': 3, '44': 2}],
      ['DEMO-MU001', 65000, {'Một cỡ': 15}],
      ['DEMO-DL001', 105000, {'Một cỡ': 10}],
      ['DEMO-TA001', 9000, {'Một cỡ': 24}],
      ['DEMO-QL001', 35000, {'M': 6, 'L': 6, 'XL': 6, '2XL': 4}]
    ];
    const receiptItems = opening.flatMap(([code, cost, quantities]) => {
      const product = seededProducts.get(code);
      if (!product) return [];
      return Object.entries(quantities).filter(([size]) => product.sizes.includes(size)).map(([size, qty]) => ({
        code, name: product.name, size, qty, unitPrice: cost, sellingPrice: product.price, lineTotal: qty * cost
      }));
    });
    const receipt = receiptItems.length ? put(shop.movements, tagged({
      id: 'DEMO-PN001', type: 'receipt', when: timeAt(-18, 9), ...actor,
      note: 'Phiếu nhập mẫu — số lượng và giá nhập giả lập để minh họa nghiệp vụ.',
      supplierId: supplier.id, supplierName: supplier.name, items: receiptItems,
      total: receiptItems.reduce((sum, item) => sum + item.lineTotal, 0), costStatus: 'complete'
    })) : null;

    // Read available store-wide units, including existing movements, before
    // adding an example transaction. This prevents negative stock even if
    // some sample ids already exist or the user's store has been edited.
    function availableStock(code, size) {
      const stock = {warehouse: 0, counter: 0};
      for (const movement of shop.movements) {
        if (movement.type === 'exchange' && movement.condition !== 'damaged') {
          for (const item of movement.returnedItems || []) if (item.code === code && item.size === size) stock.warehouse += item.qty;
        }
        for (const item of movement.items || []) {
          if (item.code !== code || item.size !== size) continue;
          if (movement.type === 'receipt') stock[item.size ? 'warehouse' : 'counter'] += item.qty;
          else if (movement.type === 'restock') stock.warehouse += item.qty;
          else if (movement.type === 'transfer') {
            const qty = movement.direction === 'toWarehouse' ? -item.qty : item.qty;
            stock.warehouse -= qty; stock.counter += qty;
          } else if (['sale', 'dispatch', 'exchange'].includes(movement.type)) {
            if (Number.isFinite(item.warehouseQty) || Number.isFinite(item.counterQty)) {
              stock.warehouse -= item.warehouseQty || 0; stock.counter -= item.counterQty || 0;
            } else stock.counter -= item.qty;
          }
        }
      }
      return stock;
    }
    function available(code, size) {
      const stock = availableStock(code, size);
      return stock.warehouse >= 0 && stock.counter >= 0 ? stock.warehouse + stock.counter : 0;
    }
    function allocation(code, size, qty) {
      const stock = availableStock(code, size);
      const counterQty = Math.min(qty, Math.max(0, stock.counter));
      return {warehouseQty: qty - counterQty, counterQty};
    }
    function sale(id, customerId, when, rows, method) {
      if (!receipt || shop.movements.some(doc => doc.id === id)) return;
      const customer = seededCustomers.get(customerId);
      if (!customer || rows.some(([code, size, qty]) => !seededProducts.has(code) || available(code, size) < qty)) return;
      const items = rows.map(([code, size, qty]) => {
        const product = seededProducts.get(code), lineTotal = qty * product.price;
        return {code, name: product.name, size, qty, unitPrice: product.price, lineTotal, discount: 0, paidTotal: lineTotal, ...allocation(code, size, qty)};
      });
      const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
      const cashReceived = Math.ceil(total / 50000) * 50000;
      put(shop.movements, tagged({
        id, type: 'sale', when, ...actor, items, gross: total, discount: 0, total,
        customerId: customer.id, customerName: customer.name, method, paymentStatus: 'confirmed',
        promotion: 'none', promotionLabel: 'Không có ưu đãi', voucherId: '',
        note: 'Hóa đơn mẫu — giao dịch giả lập.',
        ...(method === 'Tiền mặt' ? {cashReceived, change: cashReceived - total} : {transferConfirmed: true})
      }));
    }
    sale('DEMO-HD001', 'DEMO-KH002', timeAt(-8, 10, 15), [['DEMO-TB001', 'Một cỡ', 5], ['DEMO-MU001', 'Một cỡ', 1]], 'Chuyển khoản');
    sale('DEMO-HD002', 'DEMO-KH003', timeAt(-3, 15, 20), [
      ...['39', '40', '41', '42', '43', '44'].map(size => ['DEMO-GD002', size, 1]),
      ['DEMO-DL001', 'Một cỡ', 1], ['DEMO-TB002', 'Một cỡ', 2]
    ], 'Chuyển khoản');
    const todaySaleTime = Math.max(midnight, Math.min(now - 1000, timeAt(0, 15, 30)));
    sale('DEMO-HD003', 'DEMO-KH004', todaySaleTime, [['DEMO-GD001', '40', 1], ['DEMO-TA001', 'Một cỡ', 2]], 'Tiền mặt');

    const dispatchProduct = seededProducts.get('DEMO-MU001');
    if (receipt && dispatchProduct && available(dispatchProduct.code, 'Một cỡ') >= 2) {
      put(shop.movements, tagged({
        id: 'DEMO-XK001', type: 'dispatch', when: timeAt(-2, 11), ...actor,
        destination: supplier.name, reason: 'Trả hàng về kho tổng — tình huống mẫu',
        note: 'Phiếu xuất mẫu: trả 2 mũ về kho tổng; hàng rời khỏi cửa hàng.',
        items: [{code: dispatchProduct.code, name: dispatchProduct.name, size: 'Một cỡ', qty: 2, unitPrice: 0, lineTotal: 0, ...allocation(dispatchProduct.code, 'Một cỡ', 2)}], total: 0
      }));
    }
    if (seededProducts.has('DEMO-QL001') && !shop.stockNotes['DEMO-QL001']) {
      shop.stockNotes['DEMO-QL001'] = tagged({
        reason: 'Bán chậm', note: 'Đánh giá mẫu: chưa phát sinh bán hàng trong kỳ minh họa.',
        action: 'Theo dõi nhu cầu kích cỡ trước khi tiếp hàng.', threshold: 5,
        updatedAt: timeAt(-1, 16), updatedBy: manager?.name || 'Dữ liệu mẫu'
      });
    }

    const promoExamples = [
      {id: 'DEMO-UD001', code: 'DEMO_UDAI_01', name: 'Ưu đãi giữa tuần (mẫu)', value: 5, maxDiscount: 50000, minOrder: 500000, startDate: dateAt(-2), endDate: dateAt(5)},
      {id: 'DEMO-UD002', code: 'DEMO_UDAI_02', name: 'Ưu đãi đợt tới (mẫu)', value: 5, maxDiscount: 30000, minOrder: 300000, startDate: dateAt(7), endDate: dateAt(14)},
      {id: 'DEMO-UD003', code: 'DEMO_UDAI_03', name: 'Chăm sóc thành viên (mẫu)', value: 3, maxDiscount: 30000, minOrder: 500000, startDate: dateAt(-18), endDate: dateAt(-12)}
    ];
    for (const example of promoExamples) {
      if (!shop.vouchers.some(row => row.code === example.code && row.id !== example.id)) {
        put(shop.vouchers, tagged({...example, type: 'percent', active: true, tier: 'all', limit: 100, used: 0}));
      }
    }

    const shiftExamples = [
      {id: 'DEMO-CA001', person: employee, date: dateAt(-2), start: '08:00', end: '14:00', status: 'completed'},
      {id: 'DEMO-CA002', person: manager, date: dateAt(-1), start: '08:00', end: '16:00', status: 'completed'},
      {id: 'DEMO-CA003', person: employee, date: anchor, start: '14:00', end: '20:00', status: 'planned'},
      {id: 'DEMO-CA004', person: employee, date: dateAt(1), start: '08:00', end: '14:00', status: 'planned'}
    ];
    for (const {person, ...example} of shiftExamples) {
      if (!person || shop.shifts.some(row => row.employeeId === person.code && row.date === example.date && row.id !== example.id && row.start < example.end && row.end > example.start)) continue;
      put(shop.shifts, tagged({...example, employeeId: person.code, note: 'Ca làm minh họa; không phải chấm công thực tế.'}));
    }
    shop.staticDemoVersion = 1;
    shop.staticDemoSeededOn = anchor;
    return true;
  }

  function applyV2(shop) {
    if (Number(shop.staticDemoVersion) >= VERSION) return false;
    const catalog = window.AtinoCatalog;
    if (!catalog || Number(shop.staticDemoVersion) < 1) return false;
    for (const key of ['products', 'movements', 'customers', 'suppliers', 'staff', 'shifts', 'vouchers', 'returns', 'audit']) {
      if (!Array.isArray(shop[key])) shop[key] = [];
    }
    shop.stockNotes ||= {};
    const tag = 'atino-static-v2';
    const mark = fields => ({...fields, demoSeed: tag});
    const now = Date.now(), anchor = businessDay(now);
    const midnight = Date.parse(anchor + 'T00:00:00+07:00');
    const [year, month] = anchor.split('-').map(Number);
    const dateAt = offset => businessDay(midnight + offset * DAY);
    const timeAt = (offset, hour = 10, minute = 0) => Date.parse(`${dateAt(offset)}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+07:00`);
    const monthTime = (monthOffset, day, hour = 10) => {
      const date = new Date(Date.UTC(year, month - 1 + monthOffset, day, hour - 7));
      return date.getTime();
    };
    const annualTime = (monthNumber, day) => Date.parse(`${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}T10:00:00+07:00`);
    const todayTime = fraction => midnight + Math.floor(Math.max(0, now - midnight - 1000) * fraction);
    const counts = {customers: 0, suppliers: 0, staff: 0, receipts: 0, sales: 0, dispatches: 0, exchanges: 0, shifts: 0, promotions: 0, stockNotes: 0};
    const insert = (array, row, key = 'id') => {
      if (array.some(existing => existing[key] === row[key])) return false;
      array.push(row); return true;
    };

    // Public-looking contact values remain explicitly fictional/reserved.
    const supplierExamples = [
      {id: 'DEMO2-NCC002', name: 'Đầu mối tiếp hàng A (mẫu)', contact: 'Mai Anh (mẫu)', phone: '0000 000 302', email: 'tiephang-a@example.invalid', address: 'Địa chỉ minh họa 02, Hà Nội'},
      {id: 'DEMO2-NCC003', name: 'Đầu mối tiếp hàng B (mẫu)', contact: 'Quốc Bảo (mẫu)', phone: '0000 000 303', email: 'tiephang-b@example.invalid', address: 'Địa chỉ minh họa 03, Hà Nội'}
    ];
    for (const example of supplierExamples) if (insert(shop.suppliers, mark({...example, active: true, note: 'Nhà cung cấp và thông tin liên hệ giả lập để minh họa; không xác nhận đây là đối tác thực tế của Atino.'}))) counts.suppliers++;

    const newCustomers = [
      ['DEMO2-KH005', 'Phạm Hải Đăng', '1999-06-07', 'haidang'],
      ['DEMO2-KH006', 'Đỗ Ngọc Linh', '2000-02-18', 'ngoclinh'],
      ['DEMO2-KH007', 'Bùi Đức Anh', '1996-10-09', 'ducanh'],
      ['DEMO2-KH008', 'Vũ Khánh Chi', '2002-05-23', 'khanhchi'],
      ['DEMO2-KH009', 'Hoàng Tuấn Kiệt', '1995-09-14', 'tuankiet'],
      ['DEMO2-KH010', 'Trần Hà My', '2001-11-03', 'hamy']
    ];
    for (const [id, name, birthday, emailName] of newCustomers) {
      const suffix = id.slice(-3);
      if (insert(shop.customers, mark({id, name, birthday, phone: '0000 000 4' + suffix.slice(-2), email: emailName + '@example.invalid', address: 'Hà Nội — địa chỉ mẫu', note: 'Khách hàng giả lập. Hạng thành viên được tính từ các hóa đơn minh họa.', active: true, createdAt: annualTime(1, 1)}))) counts.customers++;
    }

    // NV003 is an existing legacy profile. Fill missing descriptive fields;
    // never touch identity, role, active state, username or password material.
    const legacyProfile = shop.staff.find(person => person.code === 'NV003');
    if (legacyProfile) {
      const extras = {jobTitle: 'Nhân viên cửa hàng', phone: '0000 000 103', payType: 'monthly', baseSalary: 6800000, hourlyRate: 0, startDate: dateAt(-90), defaultShift: '14:00 – 20:00'};
      const filled = [];
      for (const [key, value] of Object.entries(extras)) if (missing(legacyProfile[key])) {legacyProfile[key] = value; filled.push(key);}
      if (filled.length) legacyProfile.demoProfileFields = [...new Set([...(legacyProfile.demoProfileFields || []), ...filled])];
    }
    if (shop.staff.length < 4 && !shop.staff.some(person => person.username === 'demo.thanhmai')) {
      if (insert(shop.staff, mark({
        code: 'DEMO2-NV004', name: 'Thanh Mai (mẫu)', username: 'demo.thanhmai', role: 'employee', active: false, revision: 1,
        jobTitle: 'Nhân viên hỗ trợ (hồ sơ mẫu)', phone: '0000 000 104', payType: 'hourly', baseSalary: 0, hourlyRate: 28000,
        startDate: dateAt(-30), defaultShift: '14:00 – 20:00'
      }), 'code')) counts.staff++;
    }
    const workers = ['NV002', 'NV003', 'NV001'].map(code => shop.staff.find(person => person.code === code && person.active !== false)).filter(Boolean);
    const employee = workers[0] || shop.staff.find(person => person.active !== false);
    const manager = shop.staff.find(person => person.role === 'manager' && person.active !== false) || employee;
    const actorFor = index => {
      const person = workers[index % (workers.length || 1)] || employee;
      return person ? {employeeId: person.code, employeeName: person.name} : {employeeId: 'DEMO-SYSTEM', employeeName: 'Dữ liệu mẫu'};
    };
    const products = new Map(shop.products.filter(product => product.active !== false && Number.isSafeInteger(product.price) && product.price > 0).map(product => [product.code, product]));
    const lineFor = (code, preferredSize, qty) => {
      const product = products.get(code); if (!product) return null;
      const sizes = catalog.sizesFor(product), size = sizes.includes(preferredSize) ? preferredSize : sizes[0];
      return size ? {code, name: product.name, size, qty, unitPrice: product.price, lineTotal: qty * product.price} : null;
    };

    const promoExamples = [
      {id: 'DEMO2-UD004', code: 'DEMO2_UDAI_04', name: 'Chăm sóc khách hàng 3% (mẫu)', value: 3, maxDiscount: 20000, minOrder: 300000, startDate: dateAt(-4), endDate: dateAt(7), tier: 'all'},
      {id: 'DEMO2-UD005', code: 'DEMO2_UDAI_05', name: 'Tri ân thành viên Vàng (mẫu)', value: 5, maxDiscount: 50000, minOrder: 1000000, startDate: dateAt(15), endDate: dateAt(21), tier: 'Vàng'},
      {id: 'DEMO2-UD006', code: 'DEMO2_UDAI_06', name: 'Ưu đãi mùa trước (mẫu)', value: 3, maxDiscount: 30000, minOrder: 300000, startDate: businessDay(annualTime(1, 1)), endDate: dateAt(-5), tier: 'all'}
    ];
    const addedPromoIds = new Set();
    for (const example of promoExamples) {
      if (example.endDate < example.startDate || shop.vouchers.some(row => row.code === example.code && row.id !== example.id)) continue;
      if (insert(shop.vouchers, mark({...example, type: 'percent', active: true, limit: 200, used: 0}))) {counts.promotions++; addedPromoIds.add(example.id);}
    }
    const discountFor = (gross, when, preferredId) => {
      const day = businessDay(when), promo = shop.vouchers.find(row => row.id === preferredId && row.demoSeed === tag);
      if (!promo || !promo.active || day < promo.startDate || day > promo.endDate || gross < promo.minOrder) return {discount: 0, promotion: 'none', promotionLabel: 'Không có ưu đãi', voucherId: ''};
      return {discount: Math.min(gross, promo.maxDiscount || gross, Math.floor(gross * promo.value / 100)), promotion: 'automatic', promotionLabel: promo.name, voucherId: promo.id};
    };
    const saleSpecs = [
      ['DEMO2-HD004', annualTime(1, 15), 'early', 'DEMO2-KH005', [['AP001', 'M', 5], ['QA001', 'L', 2]]],
      ['DEMO2-HD005', annualTime(3, 15), 'early', 'DEMO-KH002', [['AK001', 'L', 2], ['QJ001', 'M', 2]]],
      ['DEMO2-HD006', annualTime(6, 15), 'early', 'DEMO-KH003', [['DEMO-TB001', 'Một cỡ', 2], ['DEMO-DL001', 'Một cỡ', 2]]],
      ['DEMO2-HD007', annualTime(9, 15), 'early', 'DEMO2-KH006', [['DEMO-GD002', '41', 2], ['DEMO-GD001', '40', 2]]],
      ['DEMO2-HD008', monthTime(-1, 10), 'mid', 'DEMO-KH002', [['AP001', 'L', 4], ['QA001', 'M', 2]]],
      ['DEMO2-HD009', monthTime(-1, 24), 'mid', 'DEMO2-KH007', [['AT001', 'M', 2], ['QJ001', 'L', 1]]],
      ['DEMO2-HD010', monthTime(0, 3), 'mid', 'DEMO-KH003', [['AK001', 'XL', 2], ['DEMO-TB002', 'Một cỡ', 2]]],
      ['DEMO2-HD011', monthTime(0, 10), 'mid', 'DEMO2-KH008', [['DEMO-MU001', 'Một cỡ', 2], ['DEMO-TA001', 'Một cỡ', 4]]],
      ['DEMO2-HD012', monthTime(0, 17), 'mid', 'DEMO2-KH009', [['QJ001', 'XL', 2], ['QA001', 'L', 2]]],
      ['DEMO2-HD013', timeAt(-3, 10, 45), 'recent', 'DEMO2-KH005', [['AT001', 'M', 1]]],
      ['DEMO2-HD014', timeAt(-2, 14, 15), 'recent', 'DEMO2-KH007', [['AP001', 'L', 1]]],
      ['DEMO2-HD015', timeAt(-1, 9), 'recent', 'DEMO-KH004', [['DEMO-MU001', 'Một cỡ', 1], ['DEMO-TA001', 'Một cỡ', 5]]],
      ['DEMO2-HD016', timeAt(-1, 13), 'recent', 'DEMO2-KH010', [['AT001', 'L', 2], ['DEMO-TA001', 'Một cỡ', 2]]],
      ['DEMO2-HD017', timeAt(-1, 18), 'recent', 'DEMO2-KH006', [['DEMO-GD001', '41', 1], ['DEMO-TB002', 'Một cỡ', 1]]],
      ['DEMO2-HD018', todayTime(.2), 'recent', 'DEMO-KH004', [['AT001', 'M', 1], ['DEMO-TA001', 'Một cỡ', 2]]],
      ['DEMO2-HD019', todayTime(.55), 'recent', 'DEMO2-KH008', [['DEMO-GD001', '40', 1], ['DEMO-MU001', 'Một cỡ', 1]]],
      ['DEMO2-HD020', todayTime(.85), 'recent', 'DEMO2-KH010', [['AK001', 'L', 1]]]
    ];
    const plannedSales = saleSpecs.flatMap(([id, when, batch, customerId, specs], index) => {
      const customer = shop.customers.find(row => row.id === customerId && row.active !== false);
      if (!customer || ![TAG, tag].includes(customer.demoSeed) || when > now || shop.movements.some(row => row.id === id)) return [];
      const items = specs.map(spec => lineFor(...spec));
      if (items.some(item => !item)) return [];
      return [{id, when, batch, customer, items, actor: actorFor(index), method: index % 2 ? 'Chuyển khoản' : 'Tiền mặt'}];
    });
    const dispatchSpecs = [
      ['DEMO2-XK002', timeAt(-9, 11), 'mid', [['DEMO-GD001', '42', 2], ['DEMO-MU001', 'Một cỡ', 3]], 'Điều chuyển về kho tổng (mẫu)'],
      ['DEMO2-XK003', timeAt(-4, 11), 'recent', [['QJ001', 'XXL', 2], ['AK001', 'XXL', 1]], 'Trả hàng chưa phù hợp mùa (mẫu)'],
      ['DEMO2-XK004', timeAt(-1, 11), 'recent', [['DEMO-DL001', 'Một cỡ', 2], ['DEMO-TB002', 'Một cỡ', 1]], 'Điều chuyển theo yêu cầu (mẫu)']
    ];
    const plannedDispatches = dispatchSpecs.flatMap(([id, when, batch, specs, reason], index) => {
      if (shop.movements.some(row => row.id === id)) return [];
      const items = specs.map(spec => lineFor(...spec));
      return items.some(item => !item) ? [] : [{id, when, batch, items, reason, actor: actorFor(index)}];
    });
    const plannedExchanges = [
      {id: 'DEMO2-DT001', invoiceId: 'DEMO2-HD013', when: timeAt(-1, 16), condition: 'resellable', replacement: ['AP001', 'L', 1], reason: 'Tình huống mẫu: đổi áo phông còn nguyên tem sang áo polo; hàng nhận lại đủ điều kiện bán.'},
      {id: 'DEMO2-DT002', invoiceId: 'DEMO2-HD014', when: timeAt(-1, 17), condition: 'resellable', replacement: ['AP001', 'XL', 1], reason: 'Tình huống mẫu: đổi kích cỡ áo polo, hàng còn đủ điều kiện bán lại.'}
    ].flatMap(example => {
      if (shop.movements.some(row => row.id === example.id) || shop.returns.some(row => row.id === example.id)) return [];
      const invoice = plannedSales.find(row => row.id === example.invoiceId);
      const replacement = lineFor(...example.replacement);
      if (!invoice || !replacement || invoice.items.length !== 1) return [];
      const original = invoice.items[0];
      const qty = Math.max(1, Math.ceil(original.lineTotal / replacement.unitPrice));
      if (qty > 10) return [];
      replacement.qty = qty; replacement.lineTotal = qty * replacement.unitPrice;
      return [{...example, batch: 'recent', items: [replacement], actor: actorFor(2)}];
    });

    // Every new outgoing line is covered by its own v2 receipt batch. Existing
    // quantities are not assumed available, and backdated samples do not draw
    // from later legacy receipts or alter pre-existing transactions.
    const batches = [
      {key: 'early', id: 'DEMO2-PN002', supplierId: 'NCC001'},
      {key: 'mid', id: 'DEMO2-PN003', supplierId: 'DEMO2-NCC002'},
      {key: 'recent', id: 'DEMO2-PN004', supplierId: 'DEMO2-NCC003'}
    ];
    const funded = new Set();
    const addAudit = (doc, action) => insert(shop.audit, mark({id: 'DEMO2-AUD-' + doc.id, when: doc.when, employeeId: doc.employeeId, employeeName: doc.employeeName, action: action + ' (mẫu)', reference: doc.id}));
    for (const [index, batch] of batches.entries()) {
      const outgoing = [...plannedSales, ...plannedDispatches, ...plannedExchanges].filter(row => row.batch === batch.key);
      if (!outgoing.length || shop.movements.some(row => row.id === batch.id)) continue;
      const supplierRow = shop.suppliers.find(row => row.id === batch.supplierId);
      if (!supplierRow || (batch.supplierId !== 'NCC001' && supplierRow.demoSeed !== tag)) continue;
      const totals = new Map();
      for (const doc of outgoing) for (const item of doc.items) {
        const key = item.code + '|' + item.size;
        if (!totals.has(key)) totals.set(key, {...item, qty: 0});
        totals.get(key).qty += item.qty;
      }
      // A few additional sellable units per supplied variant make the stock
      // screens useful without creating an excessive fictional warehouse.
      const items = [...totals.values()].map(item => {
        const qty = item.qty + 3, unitPrice = Math.max(1, Math.floor(item.unitPrice * .58 / 1000) * 1000);
        return {code: item.code, name: item.name, size: item.size, qty, unitPrice, lineTotal: qty * unitPrice, sellingPrice: item.unitPrice};
      });
      const doc = mark({id: batch.id, type: 'receipt', when: Math.min(...outgoing.map(row => row.when)) - DAY, ...actorFor(index), supplierId: supplierRow.id, supplierName: supplierRow.name, items, total: items.reduce((sum, item) => sum + item.lineTotal, 0), costStatus: 'complete', note: 'Phiếu nhập bổ sung mẫu; số lượng và giá nhập hoàn toàn giả lập.'});
      if (insert(shop.movements, doc)) {funded.add(batch.key); counts.receipts++; addAudit(doc, 'Nhập hàng');}
    }
    const allocateDiscount = (items, discount) => {
      const gross = items.reduce((sum, item) => sum + item.lineTotal, 0);
      let remaining = discount;
      const result = items.map(item => {const share = Math.floor(discount * item.lineTotal / gross); remaining -= share; return {...item, discount: share, paidTotal: item.lineTotal - share, warehouseQty: item.qty, counterQty: 0};});
      for (let index = 0; remaining > 0; index = (index + 1) % result.length) if (result[index].paidTotal > 0) {result[index].discount++; result[index].paidTotal--; remaining--;}
      return result;
    };
    for (const plan of plannedSales.sort((a, b) => a.when - b.when)) {
      if (!funded.has(plan.batch)) continue;
      const gross = plan.items.reduce((sum, item) => sum + item.lineTotal, 0);
      const promo = discountFor(gross, plan.when, plan.batch === 'recent' ? 'DEMO2-UD004' : 'DEMO2-UD006');
      const items = allocateDiscount(plan.items, promo.discount), total = gross - promo.discount;
      const cashReceived = Math.ceil(total / 50000) * 50000;
      const doc = mark({id: plan.id, type: 'sale', when: plan.when, ...plan.actor, items, gross, total, ...promo, customerId: plan.customer.id, customerName: plan.customer.name, method: plan.method, paymentStatus: 'confirmed', note: 'Hóa đơn mẫu bổ sung; không phải giao dịch thực tế.', ...(plan.method === 'Tiền mặt' ? {cashReceived, change: cashReceived - total} : {transferConfirmed: true})});
      if (insert(shop.movements, doc)) {
        counts.sales++; addAudit(doc, 'Bán hàng');
        if (addedPromoIds.has(promo.voucherId)) shop.vouchers.find(row => row.id === promo.voucherId).used++;
      }
    }
    for (const plan of plannedDispatches) {
      if (!funded.has(plan.batch)) continue;
      const destination = shop.suppliers.find(row => row.id === 'NCC001')?.name || 'Kho tổng (mẫu)';
      const doc = mark({id: plan.id, type: 'dispatch', when: plan.when, ...plan.actor, destination, reason: plan.reason, note: 'Phiếu xuất mẫu; hàng rời khỏi cửa hàng.', total: 0, items: plan.items.map(item => ({code: item.code, name: item.name, size: item.size, qty: item.qty, unitPrice: 0, lineTotal: 0, warehouseQty: item.qty, counterQty: 0}))});
      if (insert(shop.movements, doc)) {counts.dispatches++; addAudit(doc, 'Xuất hàng');}
    }
    for (const plan of plannedExchanges) {
      if (!funded.has(plan.batch)) continue;
      const invoice = shop.movements.find(row => row.id === plan.invoiceId && row.demoSeed === tag && row.type === 'sale');
      if (!invoice || shop.returns.some(row => row.invoiceId === invoice.id)) continue;
      const original = invoice.items[0];
      const returnedItems = [{code: original.code, name: original.name, size: original.size, qty: original.qty, unitPrice: original.unitPrice, paidTotal: original.paidTotal}];
      const replacements = plan.items.map(item => ({...item, warehouseQty: item.qty, counterQty: 0}));
      const credit = original.paidTotal, replacementTotal = replacements.reduce((sum, item) => sum + item.lineTotal, 0), extraPaid = replacementTotal - credit;
      if (extraPaid < 0 || businessDay(plan.when) < businessDay(invoice.when) || plan.when - invoice.when > 30 * DAY) continue;
      const doc = mark({id: plan.id, type: 'exchange', when: plan.when, ...plan.actor, exchangeOf: invoice.id, customerId: invoice.customerId, customerName: invoice.customerName, condition: plan.condition, reason: plan.reason, note: plan.reason, items: replacements, returnedItems, credit, gross: replacementTotal, discount: 0, total: extraPaid, extraPaid, method: 'Tiền mặt', paymentStatus: 'confirmed', cashReceived: extraPaid, change: 0});
      const returned = mark({id: plan.id, invoiceId: invoice.id, when: plan.when, ...plan.actor, condition: plan.condition, reason: plan.reason, items: returnedItems.map(item => ({...item})), replacements: replacements.map(item => ({...item})), credit, replacementTotal, extraPaid, method: 'Tiền mặt'});
      // Both objects are appended together only when both identifiers are free.
      if (!shop.movements.some(row => row.id === doc.id) && !shop.returns.some(row => row.id === returned.id)) {shop.movements.push(doc); shop.returns.push(returned); counts.exchanges++; addAudit(doc, 'Đổi hàng');}
    }

    for (const code of ['NV001', 'NV002', 'NV003']) {
      const person = shop.staff.find(row => row.code === code && row.active !== false);
      if (!person) continue;
      for (let offset = -3; offset <= 3; offset++) {
        const date = dateAt(offset);
        if (shop.shifts.some(shift => shift.employeeId === code && shift.date === date)) continue;
        const start = code === 'NV003' ? '14:00' : '08:00', end = code === 'NV003' ? '20:00' : code === 'NV001' ? '16:00' : '14:00';
        if (insert(shop.shifts, mark({id: 'DEMO2-CA-' + code + '-' + date, employeeId: code, date, start, end, status: offset < 0 ? 'completed' : 'planned', note: 'Ca làm mẫu trong lịch 7 ngày; không phải dữ liệu chấm công thực tế.'}))) counts.shifts++;
      }
    }
    for (const [code, reason, note, action] of [
      ['AK001', 'Hết mùa', 'Đánh giá mẫu: một số kích cỡ áo khoác cần theo dõi theo mùa.', 'Kiểm tra nhu cầu trước đợt tiếp hàng sau.'],
      ['QJ001', 'Lệch size / màu', 'Đánh giá mẫu: đối chiếu số lượng từng kích cỡ trước khi đặt thêm.', 'Ưu tiên bổ sung kích cỡ khách hỏi nhiều.']
    ]) {
      if (!products.has(code) || shop.stockNotes[code]) continue;
      shop.stockNotes[code] = mark({reason, note, action, threshold: 5, updatedAt: timeAt(-1, 16), updatedBy: manager?.name || 'Dữ liệu mẫu'}); counts.stockNotes++;
    }
    shop.staticDemoVersion = VERSION;
    shop.staticDemoExpandedOn = anchor;
    shop.staticDemoV2Added = counts;
    return true;
  }

  function apply(shop) {
    if (!shop || typeof shop !== 'object' || Number(shop.staticDemoVersion) >= VERSION) return false;
    const first = applyV1(shop);
    const second = applyV2(shop);
    return first || second;
  }

  window.AtinoDemoSeed = Object.freeze({apply});
})();

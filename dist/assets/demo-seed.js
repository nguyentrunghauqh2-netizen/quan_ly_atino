/*
 * Optional, small classroom dataset for the Atino management demonstration.
 * Product names and public retail-price references come from AtinoCatalog.
 * Quantities, prices, contacts, shifts and transactions are classroom examples.
 * Demo staff use the requested display names. Custom profiles and credentials
 * are kept when the sample store is upgraded.
 * Each additive migration anchors its dates once, then leaves them fixed.
 */
(() => {
  'use strict';
  const VERSION = 10;
  const TAG = 'atino-static-v1';
  const DAY = 86400000;
  const staffNames = Object.freeze({NV001: 'Nguyễn Văn Hiếu', NV002: 'Hồ Đình Nam', NV003: 'Dương Thiết Hải'});
  const oldStaffNames = {NV001: 'Quản lý mẫu', NV002: 'Nhân viên mẫu 1', NV003: 'Nhân viên mẫu 2'};
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
    for (const key of ['products', 'movements', 'customers', 'suppliers', 'staff', 'shifts', 'returns', 'audit']) {
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
      supplier = {id: 'NCC001', name: 'Nguồn hàng Atino', active: true, note: 'Đầu mối cung cấp hàng.'};
      shop.suppliers.push(supplier);
    }
    const contactExample = {
      contact: 'Đầu mối tiếp hàng', phone: '0359638789',
      email: 'khotong.minham@gmail.com', address: ''
    };
    const addedContactFields = [];
    for (const [key, value] of Object.entries(contactExample)) {
      if (missing(supplier[key])) { supplier[key] = value; addedContactFields.push(key); }
    }
    if (addedContactFields.length) supplier.demoContactFields = [...new Set([...(supplier.demoContactFields || []), ...addedContactFields])];

    const staffExamples = {
      NV001: {jobTitle: 'Quản lý cửa hàng', baseSalary: 12000000, hourlyRate: 0, payType: 'monthly', startDate: dateAt(-240), defaultShift: '08:00 – 16:00', phone: '0905481236'},
      NV002: {jobTitle: 'Nhân viên cửa hàng', baseSalary: 6500000, hourlyRate: 30000, payType: 'hourly', startDate: dateAt(-120), defaultShift: '08:00 – 14:00', phone: '0912736548'}
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
    const actor = employee ? {employeeId: employee.code, employeeName: employee.name} : {employeeId: 'HE-THONG', employeeName: 'Hệ thống'};

    const seededProducts = new Map();
    for (const reference of catalog.references) {
      const code = codes[reference.id];
      if (!code) continue;
      const product = put(shop.products, tagged({
        code, name: reference.name, category: reference.category,
        price: Number.isSafeInteger(reference.price) && reference.price > 0 ? reference.price : 199000,
        sizes: reference.sizes.slice(), unit: catalog.unitFor(reference.category),
        image: '', active: true, source: reference.source, checkedOn: reference.checkedOn,
        description: ''
      }), 'code');
      if (product) seededProducts.set(code, product);
    }

    const customerExamples = [
      {id: 'DEMO-KH001', name: 'Nguyễn Minh Anh', birthday: '2000-' + anchor.slice(5), phone: '0934827156', email: 'nguyenminhanh.2000@gmail.com', address: 'Hà Nội'},
      {id: 'DEMO-KH002', name: 'Trần Hoàng Phúc', birthday: '1998-04-12', phone: '0378645291', email: 'tranhoangphuc98@gmail.com', address: 'Hà Nội'},
      {id: 'DEMO-KH003', name: 'Lê Thảo Vy', birthday: '1997-08-21', phone: '0703928416', email: 'lethaovy97@gmail.com', address: 'Hà Nội'},
      {id: 'DEMO-KH004', name: 'Phạm Gia Bảo', birthday: '2001-12-05', phone: '0825671934', email: 'phamgiabao.hn@gmail.com', address: 'Hà Nội'}
    ];
    const seededCustomers = new Map();
    for (const example of customerExamples) {
      const customer = put(shop.customers, tagged({...example, createdAt: timeAt(-40)}));
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
      note: 'Nhập hàng đầu kỳ.',
      supplierId: supplier.id, supplierName: supplier.name, items: receiptItems,
      total: receiptItems.reduce((sum, item) => sum + item.lineTotal, 0), costStatus: 'complete'
    })) : null;

    // Read available store-wide units, including existing movements, before
    // adding an example transaction. This prevents negative stock even if
    // some sample ids already exist or the user's store has been edited.
    function available(code, size) {
      return window.AtinoERP.inventory(shop).get(code)?.get(size)?.total || 0;
    }
    function sale(id, customerId, when, rows, method) {
      if (!receipt || shop.movements.some(doc => doc.id === id)) return;
      const customer = seededCustomers.get(customerId);
      if (!customer || rows.some(([code, size, qty]) => !seededProducts.has(code) || available(code, size) < qty)) return;
      const items = rows.map(([code, size, qty]) => {
        const product = seededProducts.get(code), lineTotal = qty * product.price;
        return {code, name: product.name, size, qty, unitPrice: product.price, lineTotal, paidTotal: lineTotal};
      });
      const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
      const cashReceived = Math.ceil(total / 50000) * 50000;
      put(shop.movements, tagged({
        id, type: 'sale', when, ...actor, items, total,
        customerId: customer.id, customerName: customer.name, method, paymentStatus: 'confirmed',
        note: 'Bán lẻ tại quầy.',
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
        destination: supplier.name, reason: 'Trả hàng cho nhà cung cấp',
        note: 'Trả 2 mũ cho nhà cung cấp.',
        items: [{code: dispatchProduct.code, name: dispatchProduct.name, size: 'Một cỡ', qty: 2, unitPrice: 0, lineTotal: 0}], total: 0
      }));
    }
    if (seededProducts.has('DEMO-QL001') && !shop.stockNotes['DEMO-QL001']) {
      shop.stockNotes['DEMO-QL001'] = tagged({
        reason: 'Bán chậm', note: 'Chưa phát sinh bán hàng trong kỳ.',
        action: 'Theo dõi nhu cầu kích cỡ trước khi tiếp hàng.', threshold: 5,
        updatedAt: timeAt(-1, 16), updatedBy: manager?.name || 'Dữ liệu tĩnh'
      });
    }

    const shiftExamples = [
      {id: 'DEMO-CA001', person: employee, date: dateAt(-2), start: '08:00', end: '14:00', status: 'completed'},
      {id: 'DEMO-CA002', person: manager, date: dateAt(-1), start: '08:00', end: '16:00', status: 'completed'},
      {id: 'DEMO-CA003', person: employee, date: anchor, start: '14:00', end: '20:00', status: 'planned'},
      {id: 'DEMO-CA004', person: employee, date: dateAt(1), start: '08:00', end: '14:00', status: 'planned'}
    ];
    for (const {person, ...example} of shiftExamples) {
      if (!person || shop.shifts.some(row => row.employeeId === person.code && row.date === example.date && row.id !== example.id && row.start < example.end && row.end > example.start)) continue;
      put(shop.shifts, tagged({...example, employeeId: person.code, note: 'Ca làm theo lịch phân công.'}));
    }
    shop.staticDemoVersion = 1;
    shop.staticDemoSeededOn = anchor;
    return true;
  }

  function applyV2(shop) {
    if (Number(shop.staticDemoVersion) >= 2) return false;
    const catalog = window.AtinoCatalog;
    if (!catalog || Number(shop.staticDemoVersion) < 1) return false;
    for (const key of ['products', 'movements', 'customers', 'suppliers', 'staff', 'shifts', 'returns', 'audit']) {
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
    const counts = {customers: 0, suppliers: 0, staff: 0, receipts: 0, sales: 0, dispatches: 0, exchanges: 0, shifts: 0, stockNotes: 0};
    const insert = (array, row, key = 'id') => {
      if (array.some(existing => existing[key] === row[key])) return false;
      array.push(row); return true;
    };

    // Public-looking contact values remain explicitly fictional/reserved.
    const supplierExamples = [
      {id: 'DEMO2-NCC002', name: 'Đầu mối tiếp hàng A', contact: 'Mai Anh', phone: '0944182736', email: 'maianh.tiephang@gmail.com', address: 'Hà Nội'},
      {id: 'DEMO2-NCC003', name: 'Đầu mối tiếp hàng B', contact: 'Quốc Bảo', phone: '0393857421', email: 'quocbao.tiephang@gmail.com', address: 'Hà Nội'}
    ];
    for (const example of supplierExamples) if (insert(shop.suppliers, mark({...example, active: true, note: 'Nhà cung cấp hàng may mặc.'}))) counts.suppliers++;

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
      if (insert(shop.customers, mark({id, name, birthday, phone: ({'05':'0385127649','06':'0968304215','07':'0775839162','08':'0847261530','09':'0923746185','10':'0356918427'})[suffix.slice(-2)], email: emailName + '.' + birthday.slice(0, 4) + '@gmail.com', address: 'Hà Nội', createdAt: annualTime(1, 1)}))) counts.customers++;
    }

    // NV003 is an existing legacy profile. Fill missing descriptive fields;
    // never touch identity, role, active state, username or password material.
    const legacyProfile = shop.staff.find(person => person.code === 'NV003');
    if (legacyProfile) {
      const extras = {jobTitle: 'Nhân viên cửa hàng', phone: '0978215643', payType: 'monthly', baseSalary: 6800000, hourlyRate: 0, startDate: dateAt(-90), defaultShift: '14:00 – 20:00'};
      const filled = [];
      for (const [key, value] of Object.entries(extras)) if (missing(legacyProfile[key])) {legacyProfile[key] = value; filled.push(key);}
      if (filled.length) legacyProfile.demoProfileFields = [...new Set([...(legacyProfile.demoProfileFields || []), ...filled])];
    }
    if (shop.staff.length < 4 && !shop.staff.some(person => person.username === 'thanhmai')) {
      if (insert(shop.staff, mark({
        code: 'NV004', name: 'Thanh Mai', username: 'thanhmai', role: 'employee', active: false, revision: 1,
        jobTitle: 'Nhân viên hỗ trợ', phone: '0869347215', payType: 'hourly', baseSalary: 0, hourlyRate: 28000,
        startDate: dateAt(-30), defaultShift: '14:00 – 20:00'
      }), 'code')) counts.staff++;
    }
    const workers = ['NV002', 'NV003', 'NV001'].map(code => shop.staff.find(person => person.code === code && person.active !== false)).filter(Boolean);
    const employee = workers[0] || shop.staff.find(person => person.active !== false);
    const manager = shop.staff.find(person => person.role === 'manager' && person.active !== false) || employee;
    const actorFor = index => {
      const person = workers[index % (workers.length || 1)] || employee;
      return person ? {employeeId: person.code, employeeName: person.name} : {employeeId: 'HE-THONG', employeeName: 'Hệ thống'};
    };
    const products = new Map(shop.products.filter(product => product.active !== false && Number.isSafeInteger(product.price) && product.price > 0).map(product => [product.code, product]));
    const lineFor = (code, preferredSize, qty) => {
      const product = products.get(code); if (!product) return null;
      const sizes = catalog.sizesFor(product), size = sizes.includes(preferredSize) ? preferredSize : sizes[0];
      return size ? {code, name: product.name, size, qty, unitPrice: product.price, lineTotal: qty * product.price} : null;
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
      const customer = shop.customers.find(row => row.id === customerId);
      if (!customer || ![TAG, tag].includes(customer.demoSeed) || when > now || shop.movements.some(row => row.id === id)) return [];
      const items = specs.map(spec => lineFor(...spec));
      if (items.some(item => !item)) return [];
      return [{id, when, batch, customer, items, actor: actorFor(index), method: index % 2 ? 'Chuyển khoản' : 'Tiền mặt'}];
    });
    const dispatchSpecs = [
      ['DEMO2-XK002', timeAt(-9, 11), 'mid', [['DEMO-GD001', '42', 2], ['DEMO-MU001', 'Một cỡ', 3]], 'Trả hàng cho nhà cung cấp'],
      ['DEMO2-XK003', timeAt(-4, 11), 'recent', [['QJ001', 'XXL', 2], ['AK001', 'XXL', 1]], 'Trả hàng chưa phù hợp mùa'],
      ['DEMO2-XK004', timeAt(-1, 11), 'recent', [['DEMO-DL001', 'Một cỡ', 2], ['DEMO-TB002', 'Một cỡ', 1]], 'Điều chuyển theo yêu cầu']
    ];
    const plannedDispatches = dispatchSpecs.flatMap(([id, when, batch, specs, reason], index) => {
      if (shop.movements.some(row => row.id === id)) return [];
      const items = specs.map(spec => lineFor(...spec));
      return items.some(item => !item) ? [] : [{id, when, batch, items, reason, actor: actorFor(index)}];
    });
    const plannedExchanges = [
      {id: 'DEMO2-DT001', invoiceId: 'DEMO2-HD013', when: timeAt(-1, 16), condition: 'resellable', replacement: ['AP001', 'L', 1], reason: 'Đổi áo phông còn nguyên tem sang áo polo. Hàng nhận lại đủ điều kiện bán.'},
      {id: 'DEMO2-DT002', invoiceId: 'DEMO2-HD014', when: timeAt(-1, 17), condition: 'resellable', replacement: ['AP001', 'XL', 1], reason: 'Đổi kích cỡ áo polo. Hàng còn đủ điều kiện bán lại.'}
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
    const addAudit = (doc, action) => insert(shop.audit, mark({id: 'DEMO2-AUD-' + doc.id, when: doc.when, employeeId: doc.employeeId, employeeName: doc.employeeName, action, reference: doc.id}));
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
      const doc = mark({id: batch.id, type: 'receipt', when: Math.min(...outgoing.map(row => row.when)) - DAY, ...actorFor(index), supplierId: supplierRow.id, supplierName: supplierRow.name, items, total: items.reduce((sum, item) => sum + item.lineTotal, 0), costStatus: 'complete', note: 'Nhập bổ sung hàng.'});
      if (insert(shop.movements, doc)) {funded.add(batch.key); counts.receipts++; addAudit(doc, 'Nhập hàng');}
    }
    for (const plan of plannedSales.sort((a, b) => a.when - b.when)) {
      if (!funded.has(plan.batch)) continue;
      const items = plan.items.map(item => ({...item, paidTotal: item.lineTotal}));
      const total = items.reduce((sum, item) => sum + item.lineTotal, 0);
      const cashReceived = Math.ceil(total / 50000) * 50000;
      const doc = mark({id: plan.id, type: 'sale', when: plan.when, ...plan.actor, items, total, customerId: plan.customer.id, customerName: plan.customer.name, method: plan.method, paymentStatus: 'confirmed', note: 'Bán lẻ tại quầy.', ...(plan.method === 'Tiền mặt' ? {cashReceived, change: cashReceived - total} : {transferConfirmed: true})});
      if (insert(shop.movements, doc)) {counts.sales++; addAudit(doc, 'Bán hàng');}
    }
    for (const plan of plannedDispatches) {
      if (!funded.has(plan.batch)) continue;
      const destination = shop.suppliers.find(row => row.id === 'NCC001')?.name || 'Nhà cung cấp';
      const doc = mark({id: plan.id, type: 'dispatch', when: plan.when, ...plan.actor, destination, reason: plan.reason, note: 'Xuất hàng khỏi cửa hàng.', total: 0, items: plan.items.map(item => ({code: item.code, name: item.name, size: item.size, qty: item.qty, unitPrice: 0, lineTotal: 0}))});
      if (insert(shop.movements, doc)) {counts.dispatches++; addAudit(doc, 'Xuất hàng');}
    }
    for (const plan of plannedExchanges) {
      if (!funded.has(plan.batch)) continue;
      const invoice = shop.movements.find(row => row.id === plan.invoiceId && row.demoSeed === tag && row.type === 'sale');
      if (!invoice || shop.returns.some(row => row.invoiceId === invoice.id)) continue;
      const original = invoice.items[0];
      const returnedItems = [{code: original.code, name: original.name, size: original.size, qty: original.qty, unitPrice: original.unitPrice, paidTotal: original.paidTotal}];
      const replacements = plan.items;
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
        if (insert(shop.shifts, mark({id: 'DEMO2-CA-' + code + '-' + date, employeeId: code, date, start, end, status: offset < 0 ? 'completed' : 'planned', note: 'Ca dự kiến trong lịch 7 ngày.'}))) counts.shifts++;
      }
    }
    for (const [code, reason, note, action] of [
      ['AK001', 'Hết mùa', 'Một số kích cỡ áo khoác cần theo dõi theo mùa.', 'Kiểm tra nhu cầu trước đợt tiếp hàng sau.'],
      ['QJ001', 'Lệch size / màu', 'Đối chiếu số lượng từng kích cỡ trước khi đặt thêm.', 'Ưu tiên bổ sung kích cỡ khách hỏi nhiều.']
    ]) {
      if (!products.has(code) || shop.stockNotes[code]) continue;
      shop.stockNotes[code] = mark({reason, note, action, threshold: 5, updatedAt: timeAt(-1, 16), updatedBy: manager?.name || 'Dữ liệu tĩnh'}); counts.stockNotes++;
    }
    shop.staticDemoVersion = 2;
    shop.staticDemoExpandedOn = anchor;
    shop.staticDemoV2Added = counts;
    return true;
  }

  function applyV3(shop) {
    if (Number(shop.staticDemoVersion) < 2 || Number(shop.staticDemoVersion) >= 3) return false;
    const workers = ['NV001', 'NV002', 'NV003'].map(code => shop.staff.find(person => person.code === code && person.active !== false)).filter(Boolean);
    if (!workers.length) return false;
    // Không ghi đè dữ liệu đã có hoặc dùng tồn kho của sản phẩm người dùng tạo.
    for (const records of [shop.products, shop.movements, shop.customers, shop.suppliers, shop.returns, shop.audit]) {
      if (records.some(row => row.demoSeed === 'atino-static-v3' || String(row.code || row.id || '').startsWith('DEMO3-'))) return false;
    }
    const mark = fields => ({...fields, demoSeed:'atino-static-v3'});
    const now = Date.now(), anchor = businessDay(now);
    const midnight = Date.parse(anchor + 'T00:00:00+07:00');
    const todayTime = fraction => midnight + Math.floor(Math.max(0, now - midnight - 1000) * fraction);
    const actor = person => ({employeeId:person.code, employeeName:person.name});
    const manager = workers.find(person => person.role === 'manager') || workers[0];
    const definitions = [
      ['AT001','Áo phông basic','Áo phông',159000,['S','M','L','XL'],[0,1,8,2]],
      ['AP001','Áo polo phối cổ','Áo polo',249000,['S','M','L','XL'],[1,2,6,2]],
      ['SM001','Áo sơ mi Oxford','Áo sơ mi',329000,['S','M','L','XL'],[5,8,6,4]],
      ['AK001','Áo khoác kaki','Áo khoác',449000,['S','M','L','XL'],[3,4,4,3]],
      ['QS001','Quần short kaki','Quần short',229000,['28','29','30','31'],[2,1,7,0]],
      ['TB001','Túi đeo chéo mini','Túi / Balo',359000,['Một cỡ'],[0]],
      ['DL001','Dây lưng bản nhỏ','Dây lưng',199000,['Một cỡ'],[1]]
    ];
    const products = definitions.map(([suffix,name,category,price,sizes]) => mark({
      code:'DEMO3-'+suffix,name,category,price,sizes,active:true,image:'',
      unit:'sản phẩm',description:''
    }));
    const productMap = new Map(products.map(product => [product.code,product]));
    const line = (suffix,size,qty) => {
      const product = productMap.get('DEMO3-'+suffix);
      return {code:product.code,name:product.name,size,qty,unitPrice:product.price,lineTotal:qty*product.price,paidTotal:qty*product.price};
    };
    const customers = ['Lê Minh Tuấn','Trần Ngọc Linh','Phạm Thu Hà'].map((name,index) => mark({
      id:'DEMO3-KH00'+(index+1),name,phone:['0332857416','0987120365','0769403821'][index],
      address:'Hà Nội',email:['leminhtuan.hn@gmail.com','tranngoclinh.hn@gmail.com','phamthuha.hn@gmail.com'][index],birthday:'1998-06-15'
    }));
    const supplier = mark({id:'DEMO3-NCC001',name:'Xưởng may An Phú',contact:'Đầu mối tiếp hàng',phone:'0913865027',
      address:'Hà Nội',email:'xuongmayanphu@gmail.com',active:true,note:'Nhà cung cấp hàng may mặc.'});
    const movements = [], returns = [], audit = [];
    const add = (doc, action) => {
      movements.push(mark(doc));
      audit.push(mark({id:'DEMO3-AUD-'+doc.id,when:doc.when,...actor({code:doc.employeeId,name:doc.employeeName}),action,reference:doc.id}));
    };
    for (let personIndex = 0; personIndex < workers.length; personIndex++) {
      const person = workers[personIndex], customer = customers[personIndex];
      for (let index = 0; index < 6; index++) {
        const saleLines = [
          [line('AT001','S',2),line('AP001','M',1)], [line('AP001','M',2)],
          [line('QS001','30',2),line('TB001','Một cỡ',1)], [line('DL001','Một cỡ',1)],
          [line('AT001','S',1)], [line('AP001','S',1)]
        ][index];
        const when = index < 4 ? midnight - (6-index)*DAY + (10+personIndex)*3600000 : todayTime(.1+personIndex*.1+(index-4)*.03);
        const id = 'DEMO3-HD'+String(personIndex*6+index+1).padStart(3,'0');
        const total = saleLines.reduce((sum,item) => sum+item.lineTotal,0);
        const method = (personIndex+index)%2 ? 'Chuyển khoản' : 'Tiền mặt';
        const cashReceived = Math.ceil(total/50000)*50000;
        const payment = method === 'Tiền mặt' ? {cashReceived,change:cashReceived-total} : {transferConfirmed:true};
        add({id,type:'sale',when,...actor(person),customerId:customer.id,customerName:customer.name,items:saleLines,total,method,paymentStatus:'confirmed',...payment,note:'Bán lẻ tại quầy.'},'Bán hàng');
        if (index < 4) continue;
        const replacement = index === 4 ? line('AT001','M',1) : line('SM001','M',1);
        const original = saleLines[0], credit = original.paidTotal;
        const replacementTotal = replacement.lineTotal, extraPaid = replacementTotal-credit;
        const exchangeId = 'DEMO3-DT'+String(personIndex*2+index-3).padStart(3,'0');
        const exchangeTime = todayTime(.65+personIndex*.08+(index-4)*.03);
        const reason = index === 4 ? 'Đổi kích cỡ' : 'Đổi sang sản phẩm giá cao hơn';
        const exchangePayment = method === 'Tiền mặt' ? {cashReceived:extraPaid,change:0} : {transferConfirmed:true};
        add({id:exchangeId,type:'exchange',when:exchangeTime,...actor(person),exchangeOf:id,customerId:customer.id,customerName:customer.name,
          condition:'resellable',reason,note:reason,items:[replacement],returnedItems:[{...original}],credit,replacementTotal,
          gross:replacementTotal,total:extraPaid,extraPaid,method,paymentStatus:'confirmed',...exchangePayment},'Đổi hàng');
        returns.push(mark({id:exchangeId,invoiceId:id,when:exchangeTime,...actor(person),condition:'resellable',reason,
          items:[{...original}],replacements:[{...replacement}],credit,replacementTotal,extraPaid,method}));
      }
      const item = line('QS001','31',1);
      add({id:'DEMO3-PX00'+(personIndex+1),type:'dispatch',when:todayTime(.45+personIndex*.04),...actor(person),
        items:[{...item,unitPrice:0,lineTotal:0,paidTotal:0}],total:0,destination:supplier.name,
        reason:'Trả hàng nhà cung cấp',note:'Xuất trả hàng về kho tổng.'},'Xuất hàng');
    }
    // Nhập đủ cho mọi lần xuất trước khi cộng hàng khách đổi trả, tránh âm tồn giữa các giao dịch.
    const outgoingQty = new Map();
    const adjust = (item,qty) => {
      const key = item.code+'|'+item.size;
      outgoingQty.set(key,(outgoingQty.get(key)||0)+qty);
    };
    for (const doc of movements) {
      for (const item of doc.items) adjust(item,item.qty);
    }
    const recentItems = [], agingItems = [];
    for (const [suffix,,,price,sizes,remaining] of definitions) {
      for (let index = 0; index < sizes.length; index++) {
        const qty = (outgoingQty.get('DEMO3-'+suffix+'|'+sizes[index])||0)+remaining[index];
        if (qty <= 0) continue;
        const item = line(suffix,sizes[index],qty);
        item.sellingPrice = price; item.unitPrice = Math.floor(price*.6/1000)*1000;
        item.lineTotal = qty*item.unitPrice; delete item.paidTotal;
        (suffix === 'AK001' ? agingItems : recentItems).push(item);
      }
    }
    for (const [index,items] of [recentItems,agingItems].entries()) {
      add({id:'DEMO3-PN00'+(index+1),type:'receipt',when:midnight-(index===0?9:55)*DAY,...actor(manager),
        supplierId:supplier.id,supplierName:supplier.name,items,total:items.reduce((sum,item)=>sum+item.lineTotal,0),costStatus:'complete',
        note:index===0?'Nhập hàng đầu kỳ.':'Lô hàng đã 55 ngày chưa bán.'},'Nhập hàng');
    }
    shop.products.push(...products); shop.customers.push(...customers); shop.suppliers.push(supplier);
    shop.movements.push(...movements.sort((a,b)=>a.when-b.when)); shop.returns.push(...returns);
    shop.audit.unshift(...audit.sort((a,b)=>b.when-a.when));
    shop.stockNotes['DEMO3-AK001'] = mark({reason:'Bán chậm',note:'Lô hàng chưa bán sau 55 ngày.',action:'Kiểm tra nhu cầu khách hàng.',threshold:2,updatedAt:now,updatedBy:manager.name});
    for (const person of workers) {
      if (person.name === staffNames[person.code] && missing(person.profile?.address)) {
        person.profile = {...person.profile,address:'Hà Nội'};
        person.demoProfileFields = [...new Set([...(person.demoProfileFields||[]),'address'])];
      }
    }
    shop.staticDemoVersion = 3; shop.staticDemoOverviewSeededOn = anchor;
    shop.staticDemoV3Added = {products:products.length,customers:customers.length,suppliers:1,sales:workers.length*6,exchanges:returns.length,receipts:2,dispatches:workers.length};
    return true;
  }

  function applyV4(shop) {
    if (Number(shop.staticDemoVersion) !== 3) return false;
    // Chỉ điền thông tin minh họa cho chứng từ do bộ dữ liệu mẫu tạo.
    const tags = [TAG, 'atino-static-v2', 'atino-static-v3'];
    const sampleStaff = shop.staff.filter(person => Object.hasOwn(staffNames, person.code));
    for (const doc of shop.movements) {
      if (!tags.includes(doc.demoSeed) || !['sale','exchange'].includes(doc.type)) continue;
      const issuer = sampleStaff.find(person => person.code === doc.employeeId);
      if (!issuer) continue;
      if (!doc.cashierId && !doc.cashierName) {
        doc.cashierId = issuer.code;
        doc.cashierName = doc.employeeName || issuer.name;
      }
      if (doc.type === 'sale' && !doc.sellerId && !doc.sellerName) {
        doc.sellerId = issuer.code;
        doc.sellerName = doc.employeeName || issuer.name;
      }
    }
    shop.staticDemoVersion = 4;
    return true;
  }

  const oldDisplayText = new Map([
    ['Đầu mối cung cấp hàng và thông tin liên hệ mẫu.', 'Đầu mối cung cấp hàng.'],
    ['Địa chỉ nhà cung cấp mẫu', ''],
    ['Dữ liệu mẫu', 'Dữ liệu tĩnh'],
    ['Dữ liệu mẫu: tên và giá bán tham khảo từ Atino; số lượng, giá nhập và giao dịch là giả lập.', ''],
    ['Sản phẩm minh họa. Giá, số lượng trong cửa hàng và chứng từ đều là dữ liệu mẫu.', ''],
    ['Mẫu minh họa.', ''],
    ['Hà Nội — dữ liệu mẫu', 'Hà Nội'],
    ['Hà Nội — địa chỉ mẫu', 'Hà Nội'],
    ['Phiếu nhập mẫu — số lượng và giá nhập giả lập để minh họa nghiệp vụ.', 'Nhập hàng đầu kỳ.'],
    ['Hóa đơn mẫu — giao dịch giả lập.', 'Bán lẻ tại quầy.'],
    ['Phiếu xuất mẫu trả 2 mũ cho nhà cung cấp.', 'Trả 2 mũ cho nhà cung cấp.'],
    ['Đánh giá mẫu: chưa phát sinh bán hàng trong kỳ minh họa.', 'Chưa phát sinh bán hàng trong kỳ.'],
    ['Nhân viên hỗ trợ (hồ sơ mẫu)', 'Nhân viên hỗ trợ'],
    ['Tình huống mẫu: đổi áo phông còn nguyên tem sang áo polo; hàng nhận lại đủ điều kiện bán.', 'Đổi áo phông còn nguyên tem sang áo polo. Hàng nhận lại đủ điều kiện bán.'],
    ['Tình huống mẫu: đổi kích cỡ áo polo, hàng còn đủ điều kiện bán lại.', 'Đổi kích cỡ áo polo. Hàng còn đủ điều kiện bán lại.'],
    ['Phiếu nhập bổ sung mẫu; số lượng và giá nhập hoàn toàn giả lập.', 'Nhập bổ sung hàng.'],
    ['Hóa đơn mẫu bổ sung; không phải giao dịch thực tế.', 'Bán lẻ tại quầy.'],
    ['Phiếu xuất mẫu; hàng rời khỏi cửa hàng.', 'Xuất hàng khỏi cửa hàng.'],
    ['Ca làm mẫu trong lịch 7 ngày; không phải dữ liệu chấm công thực tế.', 'Ca dự kiến trong lịch 7 ngày.'],
    ['Đánh giá mẫu: một số kích cỡ áo khoác cần theo dõi theo mùa.', 'Một số kích cỡ áo khoác cần theo dõi theo mùa.'],
    ['Đánh giá mẫu: đối chiếu số lượng từng kích cỡ trước khi đặt thêm.', 'Đối chiếu số lượng từng kích cỡ trước khi đặt thêm.'],
    ['Lô hàng mẫu đã 55 ngày chưa bán.', 'Lô hàng đã 55 ngày chưa bán.'],
    ['Lô hàng mẫu chưa bán sau 55 ngày.', 'Lô hàng chưa bán sau 55 ngày.'],
    ['Đổi mẫu / màu', 'Đổi kiểu dáng / màu']
  ]);

  function applyV5(shop) {
    if (shop.staticDemoVersion !== 4) return false;
    const clean = (record, fields) => {
      if (!record) return;
      for (const field of fields) {
        const text = record[field];
        if (typeof text !== 'string') continue;
        if (oldDisplayText.has(text)) record[field] = oldDisplayText.get(text);
        else if (text.endsWith(' (mẫu)')) record[field] = text.slice(0, -6);
      }
    };
    for (const product of shop.products || []) clean(product, ['name','description']);
    for (const person of [...(shop.staff || []), ...(shop.customers || []), ...(shop.suppliers || [])]) {
      clean(person, ['name','address','contact','jobTitle','note']);
      clean(person.profile, ['address']);
    }
    for (const doc of [...(shop.movements || []), ...(shop.returns || [])]) {
      if (doc.id === 'PN0001' && doc.note === 'Dữ liệu mẫu') doc.note = 'Số lượng đầu kỳ';
      clean(doc, ['customerName','supplierName','employeeName','sellerName','cashierName','destination','reason','note']);
      for (const lines of [doc.items, doc.returnedItems, doc.replacements]) {
        for (const line of lines || []) clean(line, ['name']);
      }
    }
    for (const row of [...(shop.audit || []), ...(shop.shifts || []), ...Object.values(shop.stockNotes || {})]) {
      clean(row, ['action','detail','employeeName','note','updatedBy']);
    }
    shop.staticDemoVersion = 5;
    return true;
  }

  function upgradeProductCodes(shop) {
    // Gom cả dòng chứng từ để giữ riêng từng mã kể cả khi sản phẩm đã rời danh mục.
    const rows = [...(shop.products || []), ...(shop.balances || [])];
    const documents = [...(shop.movements || []), ...(shop.returns || [])];
    for (const doc of documents) {
      for (const lines of [doc.items, doc.returnedItems, doc.replacements]) {
        for (const line of lines || []) rows.push(line);
      }
    }
    const notes = shop.stockNotes || {};
    const categories = new Map((shop.products || []).map(p => [p.code, p.category]));
    const allCodes = new Set([...rows.map(row => row.code), ...Object.keys(notes)]);
    const productAudit = (shop.audit || []).filter(row =>
      ['Cập nhật sản phẩm','Đánh giá hàng hóa','Cập nhật giá bán khi nhập hàng'].includes(row.action));
    for (const entry of productAudit) allCodes.add(entry.reference);

    const used = new Set(), legacy = [];
    for (const code of allCodes) {
      if (typeof code !== 'string' || !code) continue;
      if (/demo/i.test(code)) legacy.push(code);
      else used.add(code.toUpperCase());
    }
    if (!legacy.length) return false;

    const mapping = new Map(), pending = new Map();
    for (const oldCode of legacy.sort()) {
      const bare = oldCode.toUpperCase().replace(/DEMO\d*[-_]?/g, '');
      const match = /^([A-Z]+)(\d+)$/.exec(bare);
      const prefix = window.AtinoCatalog?.prefixes[categories.get(oldCode)] || match?.[1] || 'SP';
      const preferred = match && prefix + match[2].padStart(3, '0');
      if (preferred && !used.has(preferred)) {
        mapping.set(oldCode, preferred);
        used.add(preferred);
      } else pending.set(oldCode, prefix);
    }
    const sequence = new Map();
    for (const [oldCode, prefix] of pending) {
      let n = sequence.get(prefix) || 1;
      let code = prefix + String(n).padStart(3, '0');
      while (used.has(code)) code = prefix + String(++n).padStart(3, '0');
      sequence.set(prefix, n + 1);
      mapping.set(oldCode, code);
      used.add(code);
    }

    for (const row of rows) if (mapping.has(row.code)) row.code = mapping.get(row.code);
    for (const [oldCode, code] of mapping) {
      if (Object.hasOwn(notes, oldCode)) {
        notes[code] = notes[oldCode];
        delete notes[oldCode];
      }
    }
    for (const entry of productAudit) {
      if (mapping.has(entry.reference)) entry.reference = mapping.get(entry.reference);
    }
    // Cho phép gửi lại cùng một lần lưu từ cả trang cũ và trang đã tải mã mới.
    for (const doc of shop.movements || []) {
      if (!doc.signature) continue;
      let request;
      try { request = JSON.parse(doc.signature); } catch { continue; }
      let changed = false;
      for (const key of ['lines','items','replacements','newProducts']) {
        if (!Array.isArray(request?.[key])) continue;
        for (const line of request[key]) {
          if (!mapping.has(line?.code)) continue;
          line.code = mapping.get(line.code);
          changed = true;
        }
      }
      if (changed) doc.currentCodeSignature = JSON.stringify(request);
    }
    return true;
  }

  function normalizeRecordCodes(shop) {
    const records = ['movements','returns','customers','staff','shifts','audit','products'].flatMap(k=>shop[k]||[]);
    const used = new Set(records.flatMap(r=>[r.id,r.code]).filter(Boolean));
    const mapping = new Map();
    for(const row of records) for(const old of [row.id,row.code]) {
      if(!/^DEMO\d*-/i.test(old||'') || mapping.has(old)) continue;
      const stripped=old.replace(/DEMO\d*-/gi,'');
      const prefix=(stripped.match(/^[A-Z]+/)||['CT'])[0];
      const digits=stripped.match(/(\d+)$/);
      let seq=digits?Number(digits[1]):1;
      let code;
      do {code=prefix+String(seq++).padStart(prefix==='NV'?3:4,'0');} while(used.has(code));
      mapping.set(old,code);used.add(code);
    }
    function update(record) {
      if(!record || typeof record!=='object')return;
      for(const [key,value] of Object.entries(record)){
        if(typeof value==='object')update(value);
        else if(typeof value==='string'){
          if(mapping.has(value)) record[key]=mapping.get(value);
          else if(['note','detail','description','name','address','contact','jobTitle','employeeName','customerName','sellerName','cashierName','reference'].includes(key)){
            let clean=value.replace(/DEMO\d*-[A-Z0-9-]+/gi,id=>mapping.get(id)||id.replace(/DEMO\d*-/gi,''));
            record[key]=clean.replace(/\s*\((?:mẫu|demo)\)/gi,'').replace(/(^|\s)(?:mẫu|demo)(?=\s|$)/gi,'$1').trim();
          }
        }
      }
    }
    for(const row of records)update(row);
    for(const row of shop.staff||[])if(row.username==='thanhmai' && !shop.staff.some(s=>s.username==='thanhmai'))row.username='thanhmai';
  }

  function normalizePrimarySupplier(shop) {
    const suppliers = shop.suppliers || (shop.suppliers = []);
    const source = suppliers.find(row => row.id === 'NCC001') || suppliers[0];
    const supplier = source || {id:'NCC001'};
    if (!source) suppliers.push(supplier);
    let changed = false;
    for (const doc of shop.movements || []) {
      if(doc.type==='dispatch' && (doc.demoSeed || ['Xưởng may An Phú','Kho tổng Atino','Nguồn hàng Atino'].includes(doc.destination))) {
        const destination='Kho tổng — Công ty TNHH Thời Trang Minh AM';
        if(doc.destination!==destination){doc.destination=destination;changed=true;}
      }
      if (doc.type !== 'receipt') continue;
      if (doc.supplierId !== 'NCC001' || doc.supplierName !== 'Kho tổng — Công ty TNHH Thời Trang Minh AM') changed = true;
      doc.supplierId = 'NCC001';
      doc.supplierName = 'Kho tổng — Công ty TNHH Thời Trang Minh AM';
    }
    if (suppliers.length !== 1 || supplier.id !== 'NCC001' || supplier.name !== 'Kho tổng — Công ty TNHH Thời Trang Minh AM') {
      changed = true;
      suppliers.splice(0,suppliers.length,supplier);
    }
    const defaults = {
      id:'NCC001',name:'Kho tổng — Công ty TNHH Thời Trang Minh AM',contact:'Kho tổng',
      phone:'0359638789',email:'',address:'Thôn Hạnh Đàn, Xã Ô Diên, Thành phố Hà Nội, Việt Nam',
      note:'Đầu mối nhập hàng duy nhất của cửa hàng.',active:true
    };
    for (const [key,value] of Object.entries(defaults)) {
      const outdatedPhone = key === 'phone' && String(supplier[key] || '').startsWith('0000 000 ');
      const outdatedEmail = key === 'email' && String(supplier[key] || '').endsWith('.example.invalid');
      const outdatedContact = key === 'contact' && String(supplier[key] || '').includes('(mẫu)');
      const outdatedNote = key === 'note' && /giả lập|minh họa/i.test(String(supplier[key] || ''));
      const next = ['id','name','active'].includes(key) || !supplier[key] || outdatedPhone || outdatedEmail || outdatedContact || outdatedNote ? value : supplier[key];
      if (supplier[key] !== next) {supplier[key] = next; changed = true;}
    }
    return changed;
  }

  // Làm sạch dữ liệu đã lưu: số điện thoại 10 số Việt Nam, email @gmail.com, ghi chú thực tế.
  const realPhones = {
    '0000 000 001': '0359638789', '0000 000 101': '0905481236', '0000 000 102': '0912736548', '0000 000 103': '0978215643',
    '0000 000 104': '0869347215', '0000 000 201': '0934827156', '0000 000 202': '0378645291', '0000 000 203': '0703928416',
    '0000 000 204': '0825671934', '0000 000 302': '0944182736', '0000 000 303': '0393857421', '0000 000 405': '0385127649',
    '0000 000 406': '0968304215', '0000 000 407': '0775839162', '0000 000 408': '0847261530', '0000 000 409': '0923746185',
    '0000 000 410': '0356918427', '0000 000 501': '0332857416', '0000 000 502': '0987120365', '0000 000 503': '0769403821',
    '0000 000 601': '0913865027'
  };
  const realEmails = {
    'khotong@example.invalid': 'khotong.minham@gmail.com', 'minhanh@example.invalid': 'nguyenminhanh.2000@gmail.com',
    'hoangphuc@example.invalid': 'tranhoangphuc98@gmail.com', 'thaovy@example.invalid': 'lethaovy97@gmail.com',
    'giabao@example.invalid': 'phamgiabao.hn@gmail.com', 'haidang@example.invalid': 'haidang.1999@gmail.com',
    'ngoclinh@example.invalid': 'ngoclinh.2000@gmail.com', 'ducanh@example.invalid': 'ducanh.1996@gmail.com',
    'khanhchi@example.invalid': 'khanhchi.2002@gmail.com', 'tuankiet@example.invalid': 'tuankiet.1995@gmail.com',
    'hamy@example.invalid': 'hamy.2001@gmail.com', 'khach-mau-1@example.invalid': 'leminhtuan.hn@gmail.com',
    'khach-mau-2@example.invalid': 'tranngoclinh.hn@gmail.com', 'khach-mau-3@example.invalid': 'phamthuha.hn@gmail.com'
  };
  const realTexts = new Map([
    ['Ca làm minh họa; không phải chấm công thực tế.', 'Ca làm theo lịch phân công.'],
    ['Hóa đơn minh họa; không phải giao dịch thực tế.', 'Bán lẻ tại quầy.'],
    ['Giao dịch từ bộ dữ liệu tĩnh.', 'Bán lẻ tại quầy.'],
    ['Phiếu xuất minh họa; hàng rời khỏi cửa hàng.', 'Xuất trả hàng về kho tổng.'],
    ['Phiếu nhập cấp đủ hàng cho các chứng từ minh họa.', 'Nhập hàng đầu kỳ.'],
    ['Đầu mối minh họa', 'Đầu mối tiếp hàng'],
    ['Nhà cung cấp giả lập để xem thử nghiệp vụ.', 'Nhà cung cấp hàng may mặc.'],
    ['DEMO-SYSTEM', 'HE-THONG'],
    ['Dữ liệu tĩnh', 'Hệ thống'],
    ['demo.thanhmai', 'thanhmai']
  ]);
  const staffEmails = {
    NV001: 'nguyenvanhieu.atino@gmail.com', NV002: 'hodinhnam.atino@gmail.com',
    NV003: 'duongthiethai.atino@gmail.com', NV004: 'thanhmai.atino@gmail.com', NV0004: 'thanhmai.atino@gmail.com'
  };

  function cleanRealData(shop) {
    if (!shop || typeof shop !== 'object' || Number(shop.realDataVersion) >= 1) return false;
    let changed = false;
    const fix = text => {
      if (realPhones[text]) return realPhones[text];
      if (realEmails[text]) return realEmails[text];
      if (realTexts.has(text)) return realTexts.get(text);
      if (/^0000 000 \d+$/.test(text)) return '097' + text.replace(/\D/g, '').slice(-7).padStart(7, '1');
      if (/@example\.invalid$/.test(text)) return text.replace(/@example\.invalid$/, '@gmail.com');
      return text;
    };
    const walk = node => {
      for (const key of Object.keys(node)) {
        const value = node[key];
        if (typeof value === 'string') {
          if (key === 'signature') continue;
          const next = fix(value);
          if (next !== value) { node[key] = next; changed = true; }
        } else if (value && typeof value === 'object') walk(value);
      }
    };
    walk(shop);
    for (const person of shop.staff || []) {
      const email = staffEmails[person.code];
      if (!email) continue;
      person.profile = person.profile || {};
      if (!person.profile.email) { person.profile.email = email; changed = true; }
    }
    shop.realDataVersion = 1;
    return true;
  }

  function nextStaffCode(staff) {
    let highest = 0;
    for (const person of staff) {
      if (/^NV\d+$/.test(person.code)) highest = Math.max(highest, Number(person.code.slice(2)));
    }
    return 'NV' + String(highest + 1).padStart(3, '0');
  }

  function migrateStaffCodes(shop) {
    const renamed = new Map();
    for (const person of shop.staff || []) {
      if (!/^NV0\d{3,}$/.test(person.code)) continue;
      const preferred = 'NV' + String(Number(person.code.slice(2))).padStart(3, '0');
      const code = shop.staff.some(row => row.code === preferred) ? nextStaffCode(shop.staff) : preferred;
      renamed.set(person.code, code);
      person.code = code;
    }
    if (!renamed.size) return false;
    for (const records of [shop.movements, shop.returns, shop.shifts, shop.audit]) {
      for (const row of records || []) {
        for (const key of ['employeeId','sellerId','cashierId','costedBy','reference']) {
          if (renamed.has(row[key])) row[key] = renamed.get(row[key]);
        }
      }
    }
    for (const entry of shop.sessions || []) if (renamed.has(entry.code)) entry.code = renamed.get(entry.code);
    return true;
  }

  function apply(shop) {
    const seeded = applySeed(shop);
    const cleaned = cleanRealData(shop);
    const migrated = migrateStaffCodes(shop);
    return seeded || cleaned || migrated;
  }

  function applySeed(shop) {
    if (!shop || typeof shop !== 'object') return false;
    const legacySupplier = shop.suppliers?.find(row => row.id === 'NCC001' && row.name === 'Kho tổng Atino');
    if (legacySupplier) legacySupplier.name = 'Nguồn hàng Atino';
    let renamed = false;
    if (!shop.demoNamesUpdated) {
      const people = new Map((shop.staff || []).map(person => [person.code, person]));
      for (const [code, oldName] of Object.entries(oldStaffNames)) {
        const person = people.get(code);
        if (person?.name === oldName) person.name = staffNames[code];
      }
      for (const records of [shop.movements || [], shop.returns || [], shop.audit || []]) {
        for (const doc of records) {
          const oldName = oldStaffNames[doc.employeeId];
          if (oldName && doc.employeeName === oldName) {
            doc.employeeName = people.get(doc.employeeId)?.name || staffNames[doc.employeeId];
          }
        }
      }
      shop.demoNamesUpdated = true;
      renamed = true;
    }
    if (Number(shop.staticDemoVersion) >= VERSION) return renamed || normalizePrimarySupplier(shop) || Boolean(legacySupplier);
    const first = applyV1(shop);
    const second = applyV2(shop);
    const third = applyV3(shop);
    const fourth = applyV4(shop);
    const fifth = applyV5(shop);
    const codesChanged = upgradeProductCodes(shop);
    const supplierChanged = normalizePrimarySupplier(shop);
    normalizeRecordCodes(shop);
    const finished = Number(shop.staticDemoVersion) < VERSION;
    if (finished) shop.staticDemoVersion = VERSION;
    return renamed || first || second || third || fourth || fifth || finished || codesChanged || supplierChanged || Boolean(legacySupplier);
  }

  window.AtinoDemoSeed = Object.freeze({apply, staffNames, nextStaffCode});
})();

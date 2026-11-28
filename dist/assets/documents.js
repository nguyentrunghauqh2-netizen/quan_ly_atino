/*
 * documents.js — Dựng nội dung chứng từ theo mẫu của cửa hàng.
 *  - Hóa đơn Nhập / Hóa đơn Xuất (chuyển kho): thông tin chung + bảng chi tiết dòng hàng.
 *  - Hóa đơn bán hàng: bản in nhiệt khổ hẹp (có QR, chính sách đổi hàng 30 ngày).
 * Chỉ nhận dữ liệu và trả về chuỗi HTML, không tự ghi dữ liệu.
 */
(() => {
  'use strict';

  // Thông tin cửa hàng in trên chứng từ.
  const STORE = Object.freeze({
    name: 'ATINO',
    address: '42 Bến Nghé, Huế',
    branchCode: 'MT_CH16',
    hotline: '096.728.4444',
    warehouse: 'Kho tổng — Công ty TNHH Thời Trang Minh AM',
    storeWarehouse: 'KHO CỬA HÀNG'
  });

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const number = new Intl.NumberFormat('vi-VN');
  const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const money = value => number.format(Math.round(num(value)));
  const two = value => String(value).padStart(2, '0');

  // Đầu vào: mili giây. Đầu ra: "dd/mm/yyyy hh:mm" (thêm giây nếu withSeconds = true).
  function dateTime(when, withSeconds = false) {
    const d = new Date(num(when));
    if (!Number.isFinite(d.getTime()) || !when) return '—';
    const day = `${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()}`;
    const time = `${two(d.getHours())}:${two(d.getMinutes())}` + (withSeconds ? `:${two(d.getSeconds())}` : '');
    return `${day} ${time}`;
  }

  // "Mã - Tên" của một người; ưu tiên tên đã lưu trên chứng từ.
  function person(code, savedName, staff = []) {
    const name = savedName || staff.find(row => row.code === code)?.name || '';
    return [code, name].filter(Boolean).join(' - ') || 'Chưa ghi nhận';
  }

  function productOf(code, ctx) {
    return (ctx.products || []).find(row => row.code === code);
  }

  // Mã vạch của một dòng hàng = mã sản phẩm + kích cỡ.
  function barcodeOf(item) {
    return [item.code, item.size && item.size !== 'Chưa phân size' ? item.size : ''].filter(Boolean).join('-');
  }

  // Phiếu nhập: nguồn là Kho tổng, đích là cửa hàng. Phiếu xuất: ngược lại.
  function warehouses(doc) {
    const store = `${STORE.address}, ${STORE.branchCode}`;
    if (doc.type === 'receipt') return {from: doc.supplierName || STORE.warehouse, to: store};
    return {from: store, to: doc.destination || STORE.warehouse};
  }

  // "Từ phiếu nhập": phiếu nhập gần nhất trước đó có cùng mặt hàng (nếu chứng từ chưa ghi sẵn).
  function sourceReceipt(doc, ctx) {
    if (doc.fromReceiptId) return doc.fromReceiptId;
    if (doc.type !== 'dispatch') return '—';
    const codes = new Set((doc.items || []).map(item => item.code));
    const found = (ctx.movements || [])
      .filter(row => row.type === 'receipt' && row.when <= doc.when && (row.items || []).some(item => codes.has(item.code)))
      .sort((a, b) => b.when - a.when)[0];
    return found ? found.id : '—';
  }

  const lineRetailPrice = (item, ctx) => num(productOf(item.code, ctx)?.price) || num(item.unitPrice);

  // Tính các thuộc tính chung của Hóa đơn Nhập / Xuất.
  function stockSummary(doc, ctx) {
    const items = doc.items || [];
    const rows = items.map((item, index) => {
      const product = productOf(item.code, ctx);
      const retail = lineRetailPrice(item, ctx);
      const cost = num(item.unitPrice);
      return {
        index: index + 1,
        name: item.name || product?.name || 'Sản phẩm',
        size: item.size && item.size !== 'Chưa phân size' ? item.size : '',
        barcode: barcodeOf(item),
        code: item.code,
        qty: num(item.qty),
        cost: ctx.showCost && doc.type === 'receipt' && cost > 0 ? cost : null,
        retail,
        vat: '',
        unit: product?.unit && product.unit !== 'sản phẩm' ? product.unit : 'Cái',
        total: num(item.qty) * retail,
        note: doc.note || ''
      };
    });
    const place = warehouses(doc);
    const retailTotal = rows.reduce((sum, row) => sum + row.total, 0);
    const costTotal = items.reduce((sum, item) => sum + num(item.qty) * num(item.unitPrice), 0);
    return {
      title: doc.type === 'receipt' ? 'Hóa đơn Nhập [C] Chuyển kho' : 'Hóa đơn Xuất [C] Chuyển kho',
      rows, retailTotal, costTotal, qty: rows.reduce((sum, row) => sum + row.qty, 0),
      pairs: [
        ['Kho xuất', place.from],
        ['Kho nhập', place.to],
        ['Từ phiếu nhập', sourceReceipt(doc, ctx)],
        ['Người tạo', person(doc.employeeId, doc.employeeName, ctx.staff)],
        ['Ngày tạo', dateTime(doc.when)],
        ['Ghi chú', doc.note || '—']
      ]
    };
  }

  const STOCK_STYLE = `<style>
    .dv-stock{color:inherit}.dv-stock h3{margin:0 0 .75rem;font-size:1.05rem}
    .dv-meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:.5rem 1.5rem;margin:0 0 1rem;font-size:.9rem}
    .dv-meta div{display:flex;gap:.4rem}.dv-meta dt{font-weight:600;white-space:nowrap}.dv-meta dt::after{content:':'}.dv-meta dd{margin:0}
    .dv-wrap{overflow-x:auto}.dv-table{width:100%;border-collapse:collapse;font-size:.85rem}
    .dv-table th,.dv-table td{border:1px solid #d7dde5;padding:.4rem .5rem;text-align:left;vertical-align:top}
    .dv-table th{background:#f3f5f8;color:#17212b}.dv-table .dv-r{text-align:right;white-space:nowrap}
    .dv-table small{display:block;color:#66717f}.dv-table tfoot td{font-weight:700}
    .dv-traced{background:#fff7d6}
  </style>`;

  // Hóa đơn Nhập / Xuất dạng bảng. ctx: {staff, products, movements, showCost, highlightCode}
  function stockHtml(doc, ctx = {}) {
    const sum = stockSummary(doc, ctx);
    const pairs = [['Mã phiếu', doc.id], ...sum.pairs.slice(0, 5)];
    pairs.push(['Tổng tiền', money(sum.retailTotal)]);
    if (ctx.showCost && doc.type === 'receipt') {
      pairs.push(['Tổng giá nhập', sum.costTotal > 0 ? money(sum.costTotal) : 'Chờ bổ sung giá nhập']);
    }
    pairs.push(sum.pairs[5]);
    const meta = pairs.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('');
    const body = sum.rows.map(row => `<tr${ctx.highlightCode && row.code === ctx.highlightCode ? ' class="dv-traced"' : ''}>
      <td>${row.index}</td>
      <td>${esc(row.name)}${row.size ? ' - ' + esc(row.size) : ''}<small>${esc(row.barcode)}</small></td>
      <td>${esc(row.code)}</td>
      <td class="dv-r">${number.format(row.qty)}</td>
      <td class="dv-r">${row.cost == null ? '' : money(row.cost)}</td>
      <td class="dv-r">${money(row.retail)}</td>
      <td>${esc(row.vat)}</td>
      <td>${esc(row.unit)}</td>
      <td class="dv-r">${money(row.total)}</td>
      <td>${esc(row.note)}</td></tr>`).join('');
    return `${STOCK_STYLE}<section class="dv-stock"><h3>${esc(sum.title)}: ${esc(doc.id)}</h3>
      <dl class="dv-meta">${meta}</dl>
      <div class="dv-wrap"><table class="dv-table"><thead><tr><th>#</th><th>Sản phẩm</th><th>Mã</th><th class="dv-r">SL</th><th class="dv-r">Giá</th><th class="dv-r">Giá bán</th><th>VAT</th><th>ĐVT</th><th class="dv-r">Tổng</th><th>Ghi chú</th></tr></thead>
      <tbody>${body || '<tr><td colspan="10">Phiếu chưa có mặt hàng.</td></tr>'}</tbody>
      <tfoot><tr><td colspan="3">Tổng</td><td class="dv-r">${number.format(sum.qty)}</td><td></td><td></td><td></td><td></td><td class="dv-r">${money(sum.retailTotal)}</td><td></td></tr></tfoot></table></div></section>`;
  }

  // Cặp (nhãn, giá trị) bổ sung cho các màn hình đã có sẵn bố cục riêng (màn nhân viên).
  function stockPairs(doc, ctx = {}) {
    return stockSummary(doc, ctx).pairs.filter(([label]) => label !== 'Người tạo' && label !== 'Ngày tạo');
  }

  // ---------- Hóa đơn bán hàng ----------

  // Vẽ QR thành SVG từ ma trận của AtinoLabels / createLabelQr; trả '' nếu chưa có thư viện.
  function qrSvg(text) {
    if (typeof window.createLabelQr !== 'function') return '';
    let matrix;
    try { matrix = window.createLabelQr(text); } catch { return ''; }
    if (!Array.isArray(matrix)) return '';
    const quiet = 2, size = matrix.length + quiet * 2;
    let cells = '';
    matrix.forEach((row, y) => row.forEach((on, x) => { if (on) cells += `<rect x="${x + quiet}" y="${y + quiet}" width="1" height="1"/>`; }));
    return `<svg viewBox="0 0 ${size} ${size}" width="150" height="150" role="img" aria-label="Mã QR hóa đơn" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><g fill="#000">${cells}</g></svg>`;
  }

  const POLICY = [
    'Chính sách đổi hàng được áp dụng trong thời gian 30 ngày kể từ ngày mua hàng.',
    'Quý khách vui lòng mang theo hóa đơn bán lẻ.',
    'Sản phẩm phải còn nguyên tem nhãn mác.',
    'Sản phẩm còn mới như ban đầu (chưa giặt, chưa qua sử dụng, chưa qua sửa chữa, không bị rách hoặc hư hại).',
    'Vì lý do sức khỏe, đồ lót, phụ kiện, mũ, túi xách và quà tặng không được đổi hàng.',
    'Quý khách được đổi hàng tại tất cả các cửa hàng trên toàn hệ thống.',
    'Sản phẩm sau khi đổi sẽ áp dụng giá bán tại thời điểm đổi hàng.',
    'Hóa đơn sau khi đổi phải có giá trị bằng hoặc cao hơn tổng giá trị sản phẩm trước khi đổi.'
  ];

  const RECEIPT_STYLE = `<style>
    .dv-receipt{width:302px;max-width:100%;margin:0 auto;padding:8px;font:13px/1.45 Arial,sans-serif;color:#000;background:#fff}
    .dv-receipt h1{margin:0;text-align:center;font:700 26px Georgia,serif;letter-spacing:2px}
    .dv-receipt h2{margin:10px 0 0;text-align:center;font-size:15px}
    .dv-receipt p{margin:2px 0}.dv-receipt .c{text-align:center}.dv-receipt .small{font-size:11px}
    .dv-receipt hr{border:0;border-top:1px dashed #000;margin:6px 0}
    .dv-receipt table{width:100%;border-collapse:collapse;font-size:12px}
    .dv-receipt th{text-align:left;font-weight:700;padding:3px 2px}.dv-receipt td{padding:3px 2px;vertical-align:top}
    .dv-receipt .r{text-align:right}.dv-receipt .sum{display:flex;justify-content:space-between;gap:8px}
    .dv-receipt .big{font-size:16px;font-weight:700}.dv-receipt svg{display:block;margin:6px auto}
    .dv-receipt ul{margin:2px 0 0;padding-left:14px;font-size:11px}
  </style>`;

  // Dựng bản in hóa đơn bán hàng. ctx: {staff, customers}
  function saleReceiptHtml(doc, ctx = {}) {
    const items = doc.items || [];
    const customer = (ctx.customers || []).find(row => row.id === doc.customerId);
    const customerName = customer?.name || doc.customerName || 'Khách lẻ';
    const customerPhone = customer?.phone || doc.customerPhone || '';
    const cashierCode = doc.cashierId || doc.employeeId;
    const cashier = person(cashierCode, doc.cashierName || (doc.cashierId ? '' : doc.employeeName), ctx.staff);
    const seller = doc.sellerId ? person(doc.sellerId, doc.sellerName, ctx.staff) : '';
    const gross = items.reduce((sum, item) => sum + num(item.qty) * num(item.unitPrice), 0);
    const paid = doc.total != null ? num(doc.total) : items.reduce((sum, item) => sum + num(item.paidTotal ?? item.qty * item.unitPrice), 0);
    const discount = Math.max(0, gross - paid);
    const method = doc.method || (/chuyển khoản/i.test(doc.note || '') ? 'Chuyển khoản' : 'Tiền mặt');
    const methodLabel = method === 'Chuyển khoản' ? 'chuyển khoản' : 'tiền mặt';
    const rows = items.map(item => {
      const line = num(item.paidTotal ?? item.qty * item.unitPrice);
      const off = Math.max(0, num(item.qty) * num(item.unitPrice) - line);
      const size = item.size && item.size !== 'Chưa phân size' ? ' - ' + item.size : '';
      return `<tr><td>${esc(item.name)}${esc(size)}<br>${money(item.unitPrice)}</td><td class="r">${number.format(num(item.qty))}</td><td class="r">${off ? money(off) : ''}</td><td class="r">${money(line)}</td></tr>`;
    }).join('');
    const qrText = [STORE.branchCode, doc.id, paid].join('|');
    return `${RECEIPT_STYLE}<div class="dv-receipt">
      <h1>${esc(STORE.name)}</h1>
      <p>Cửa hàng: ${esc(STORE.address)}, ${esc(STORE.branchCode)}</p>
      <p>Hotline: <strong>${esc(STORE.hotline)}</strong></p>
      <p>Thời gian mua hàng: <strong>${esc(dateTime(doc.when, true))}</strong></p>
      <h2>HOÁ ĐƠN BÁN HÀNG</h2><p class="c">ID: <strong>${esc(doc.id)}</strong></p>
      <p>Khách hàng: <strong>${esc([customerName, customerPhone].filter(Boolean).join(' - '))}</strong></p>
      <p><em>Nhân viên thu ngân: ${esc(cashier)}</em></p>
      ${seller && seller !== cashier ? `<p><em>Nhân viên bán hàng: ${esc(seller)}</em></p>` : ''}
      <hr><table><thead><tr><th>Sản phẩm</th><th class="r">Số lượng</th><th class="r">Chiết khấu</th><th class="r">Thành tiền</th></tr></thead><tbody>${rows}</tbody></table><hr>
      <p class="sum"><strong>Tổng SL sản phẩm</strong><strong>${number.format(items.reduce((sum, item) => sum + num(item.qty), 0))}</strong></p>
      <p class="sum"><span>Chiết khấu:</span><span>${discount ? money(discount) : ''}</span></p>
      <p class="sum big"><span>Tổng tiền SCK:</span><span>${money(paid)}</span></p>
      <p class="sum"><strong>Đã thanh toán:</strong><span class="small">(+ ${methodLabel}: ${money(paid)})</span></p>
      ${doc.cashReceived != null ? `<p class="sum small"><span>Tiền khách đưa: ${money(doc.cashReceived)}</span><span>Tiền trả lại: ${money(Math.max(0, num(doc.cashReceived) - paid))}</span></p>` : ''}
      <p class="c">Vui lòng quét mã QR để xuất hóa đơn điện tử</p>${qrSvg(qrText)}
      <p class="c small">Phiếu tính tiền chỉ có giá trị xuất hóa đơn trong vòng 120 phút và trước 22h trong ngày mua hàng.</p>
      <p class="c"><em>Cảm ơn Quý khách đã tin tưởng và lựa chọn sản phẩm <strong>${esc(STORE.name)}</strong>!</em></p>
      <p class="small">Để đảm bảo quyền lợi đổi hàng cũng như số tiền thanh toán, Quý khách vui lòng kiểm tra kỹ thông tin trên hóa đơn gồm: thời gian mua hàng, thông tin sản phẩm, số lượng sản phẩm, tổng tiền và thông tin cá nhân.</p>
      <hr><p><strong><u>CHÍNH SÁCH 30 NGÀY ĐỔI HÀNG:</u></strong></p>
      <ul>${POLICY.map(line => `<li>${esc(line)}</li>`).join('')}</ul></div>`;
  }

  // Mở cửa sổ in hóa đơn bán hàng. Trả về false nếu trình duyệt chặn cửa sổ.
  function printSale(doc, ctx = {}) {
    const popup = window.open('', '_blank', 'width=420,height=800');
    if (!popup) return false;
    popup.document.open();
    popup.document.write(`<!doctype html><html lang="vi"><head><meta charset="UTF-8"><title>${esc(doc.id)} · ATINO</title><style>body{margin:0;background:#fff}@media print{body{margin:0}}</style></head><body>${saleReceiptHtml(doc, ctx)}</body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
    return true;
  }

  window.AtinoDocuments = Object.freeze({STORE, stockHtml, stockPairs, saleReceiptHtml, printSale, dateTime, person});
})();

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
    complaintHotline: '0979.81.8888',
    warehouse: 'Kho tổng — Công ty TNHH Thời Trang Minh AM',
    storeWarehouse: 'KHO CỬA HÀNG'
  });

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const number = new Intl.NumberFormat('vi-VN');
  const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const money = value => number.format(Math.round(num(value)));
  const vietnamTime = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  });

  // Đầu vào: mili giây. Đầu ra: "dd/mm/yyyy hh:mm" (thêm giây nếu withSeconds = true).
  function dateTime(when, withSeconds = false) {
    const d = new Date(Number(when));
    if (!Number.isFinite(d.getTime()) || !when) return '—';
    const parts = Object.fromEntries(vietnamTime.formatToParts(d).map(part => [part.type, part.value]));
    const {day, month, year, hour, minute, second} = parts;
    return `${day}/${month}/${year} ${hour}:${minute}` + (withSeconds ? `:${second}` : '');
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

  // Mã dài của một dòng hàng, ghép từ thông tin tem nhãn: mã SP . nơi SX . năm . chất liệu - màu - size.
  function longCodeOf(item, product) {
    const info = product?.labelInfo || {};
    const size = item.size && item.size !== 'Chưa phân size' ? item.size : '';
    const head = [item.code, info.origin, info.year, info.material].filter(Boolean).join('.');
    const tail = [info.color, size].filter(Boolean).join('-');
    return [head, tail].filter(Boolean).join('-') || item.code;
  }

  // Phiếu nhập: nguồn là Kho tổng, đích là cửa hàng. Phiếu xuất: ngược lại.
  function warehouses(doc) {
    const store = `${STORE.address}, ${STORE.branchCode}`;
    if (doc.type === 'receipt') return {from: doc.supplierName || STORE.warehouse, to: store};
    return {from: store, to: doc.destination || STORE.warehouse};
  }

  const lineRetailPrice = (item, ctx) => num(item.sellingPrice) || num(productOf(item.code, ctx)?.price) || num(item.unitPrice);

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
        longCode: longCodeOf(item, product),
        image: product?.image || '',
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
        ['Từ phiếu nhập', doc.fromReceiptId || '—'],
        ['Người tạo', person(doc.employeeId, doc.employeeName, ctx.staff)],
        ['Ngày tạo', dateTime(doc.when)],
        ['Ghi chú', doc.note || '—']
      ]
    };
  }

  const STOCK_STYLE = `<style>
    .dv-stock{color:inherit;font-size:.9rem}
    .dv-head{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin:0 0 .9rem}
    .dv-head h3{margin:0;font-size:1.1rem}
    .dv-menu{position:relative}.dv-menu summary{list-style:none;cursor:pointer;border:1px solid #d7dde5;border-radius:6px;padding:.35rem .8rem;background:#fff;font-size:.85rem}
    .dv-menu summary::-webkit-details-marker{display:none}.dv-menu summary::after{content:' ▾'}
    .dv-menu-list{position:absolute;right:0;top:calc(100% + 4px);z-index:5;min-width:11rem;border:1px solid #d7dde5;border-radius:6px;background:#fff;box-shadow:0 6px 18px rgba(0,0,0,.12);padding:.25rem}
    .dv-menu-list button{display:block;width:100%;text-align:left;border:0;background:none;padding:.45rem .6rem;border-radius:4px;cursor:pointer;font:inherit;color:#17212b}
    .dv-menu-list button:hover{background:#f3f5f8}
    .dv-meta{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) minmax(0,.8fr);gap:1rem 2rem;margin:0 0 1rem}
    .dv-meta dl{margin:0;display:grid;gap:.5rem;align-content:start}.dv-meta dl>div{display:flex;gap:.4rem;flex-wrap:wrap}
    .dv-meta dt{font-weight:600;white-space:nowrap}.dv-meta dt::after{content:':'}.dv-meta dd{margin:0;overflow-wrap:anywhere}
    .dv-link{color:#1a5fd0;background:none;border:0;padding:0;font:inherit;cursor:pointer;text-align:left}
    span.dv-link{cursor:default}.dv-link:hover{text-decoration:underline}
    .dv-wrap{overflow-x:auto}.dv-table{width:100%;border-collapse:collapse;font-size:.85rem}
    .dv-table th,.dv-table td{border:1px solid #d7dde5;padding:.4rem .5rem;text-align:left;vertical-align:top}
    .dv-table th{background:#f3f5f8;color:#17212b;white-space:nowrap}.dv-table .dv-r{text-align:right;white-space:nowrap}
    .dv-table .dv-code{min-width:14rem;overflow-wrap:anywhere}.dv-table .dv-prod{min-width:11rem}
    .dv-table small{display:block;color:#66717f}.dv-table tfoot td{font-weight:700}
    .dv-thumb{width:34px;height:34px;object-fit:cover;border-radius:4px;display:block;background:#eef1f5}
    .dv-thumb-empty{width:34px;height:34px;border-radius:4px;background:#eef1f5;display:block}
    .dv-down{color:#d93025}
    .dv-traced{background:#fff7d6}
    .dv-attach{margin-top:1rem;border-top:1px solid #d7dde5;padding-top:.7rem}
    .dv-attach h4{margin:0 0 .4rem;font-size:.95rem}.dv-attach ul{margin:0;padding-left:1.1rem}.dv-attach p{margin:0;color:#66717f}
    @media(max-width:720px){.dv-meta{grid-template-columns:1fr}}
    @media print{.dv-menu{display:none}}
  </style>`;

  const stockRegistry = new Map();

  // Hóa đơn Nhập / Xuất dạng bảng, bố cục theo mẫu chuyển kho của cửa hàng.
  // ctx: {staff, products, movements, showCost, highlightCode}
  function stockHtml(doc, ctx = {}) {
    const sum = stockSummary(doc, ctx);
    const pair = label => sum.pairs.find(item => item[0] === label)?.[1] ?? '—';
    const source = pair('Từ phiếu nhập');
    const canOpen = (ctx.movements || []).some(row => row.type === 'receipt' && row.id === doc.fromReceiptId);
    const left = [
      ['Kho xuất', esc(pair('Kho xuất'))],
      ['Kho nhập', esc(pair('Kho nhập'))],
      ['Từ phiếu nhập', canOpen ? `<button type="button" class="dv-link" data-dv-open="${esc(source)}">${esc(source)}</button>` : esc(source)],
      ['Ghi chú', esc(pair('Ghi chú'))]
    ];
    const middle = [
      ['Mã phiếu', esc(doc.id)],
      ['Người tạo', `<span class="dv-link">${esc(pair('Người tạo'))}</span>`],
      ['Ngày tạo', esc(pair('Ngày tạo'))]
    ];
    const right = [['Tổng tiền', esc(money(sum.retailTotal))]];
    if (ctx.showCost && doc.type === 'receipt') {
      right.push(['Tổng giá nhập', esc(sum.costTotal > 0 ? money(sum.costTotal) : 'Chờ bổ sung giá nhập')]);
    }
    const column = rows => `<dl>${rows.map(([label, html]) => `<div><dt>${esc(label)}</dt><dd>${html}</dd></div>`).join('')}</dl>`;
    const body = sum.rows.map(row => `<tr${ctx.highlightCode && row.code === ctx.highlightCode ? ' class="dv-traced"' : ''}>
      <td>${row.index}</td>
      <td>${row.image ? `<img class="dv-thumb" src="${esc(row.image)}" alt="">` : '<span class="dv-thumb-empty"></span>'}</td>
      <td class="dv-prod"><span class="dv-link">${esc(row.name)}${row.size ? ' - ' + esc(row.size) : ''}</span><small>${esc(row.barcode)}</small></td>
      <td class="dv-code">${esc(row.longCode)}</td>
      <td class="dv-r">${number.format(row.qty)}</td>
      <td class="dv-r">${row.cost == null ? '' : money(row.cost)}</td>
      <td class="dv-r">${money(row.retail)}</td>
      <td>${esc(row.vat)}</td>
      <td>${esc(row.unit)}</td>
      <td></td>
      <td class="dv-r">${money(row.total)}</td>
      <td>${esc(row.note)}</td></tr>`).join('');
    const files = Array.isArray(doc.attachments) ? doc.attachments : [];
    const attach = files.length
      ? `<ul>${files.map(file => `<li>${esc(file.name || file)}</li>`).join('')}</ul>`
      : '<p>Chưa có file đính kèm.</p>';
    stockRegistry.set(String(doc.id), {doc, ctx});
    return `${STOCK_STYLE}<section class="dv-stock" data-dv-doc="${esc(doc.id)}">
      <div class="dv-head"><h3>${esc(sum.title)}: ${esc(doc.id)}</h3>
        <details class="dv-menu"><summary>Thao tác</summary><div class="dv-menu-list">
          <button type="button" data-dv-print="${esc(doc.id)}">In phiếu</button>
          <button type="button" data-dv-copy="${esc(doc.id)}">Sao chép mã phiếu</button></div></details></div>
      <div class="dv-meta">${column(left)}${column(middle)}${column(right)}</div>
      <div class="dv-wrap"><table class="dv-table"><thead><tr><th>#</th><th></th><th>Sản phẩm</th><th>Mã</th><th class="dv-r">SL</th><th class="dv-r">Giá</th><th class="dv-r">Giá bán</th><th>VAT</th><th>ĐVT</th><th class="dv-down" title="Chiết khấu">↓</th><th class="dv-r">Tổng</th><th>Ghi chú</th></tr></thead>
      <tbody>${body || '<tr><td colspan="12">Phiếu chưa có mặt hàng.</td></tr>'}</tbody>
      <tfoot><tr><td colspan="4">Tổng</td><td class="dv-r">${number.format(sum.qty)}</td><td></td><td class="dv-r">${money(sum.retailTotal)}</td><td></td><td></td><td></td><td class="dv-r">${money(sum.retailTotal)}</td><td></td></tr></tfoot></table></div>
      <div class="dv-attach"><h4>File đính kèm</h4>${attach}</div></section>`;
  }

  // Mở cửa sổ in phiếu nhập / xuất kho.
  function printStock(doc, ctx = {}) {
    const popup = window.open('', '_blank', 'width=1000,height=800');
    if (!popup) return false;
    popup.document.open();
    popup.document.write(`<!doctype html><html lang="vi"><head><meta charset="UTF-8"><title>${esc(doc.id)} · ATINO</title><style>body{margin:16px;font-family:Arial,sans-serif;color:#17212b;background:#fff}</style></head><body><header style="color:#36538a;font-weight:bold;margin-bottom:8px">ATINO</header>${stockHtml(doc, ctx)}<style>@page{size:A4 landscape;margin:10mm}.dv-menu{display:none}.dv-meta{background:#eff4fc;padding:12px}.dv-table th{background:#233655;color:white}.dv-table tr:nth-child(even){background:#f4f7fb}.dv-wrap{overflow:visible}.dv-table .dv-code,.dv-table .dv-prod{min-width:0}.dv-table{font-size:10px}.dv-table th{white-space:normal}tr{break-inside:avoid}</style></body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
    return true;
  }

  // Một lần gắn sự kiện chung cho menu "Thao tác" và liên kết "Từ phiếu nhập".
  document.addEventListener('click', event => {
    const print = event.target.closest('[data-dv-print]');
    const copy = event.target.closest('[data-dv-copy]');
    const open = event.target.closest('[data-dv-open]');
    if (print) {
      const entry = stockRegistry.get(print.dataset.dvPrint);
      if (entry) printStock(entry.doc, entry.ctx);
      print.closest('details')?.removeAttribute('open');
    } else if (copy) {
      navigator.clipboard?.writeText(copy.dataset.dvCopy).catch(() => {});
      copy.closest('details')?.removeAttribute('open');
    } else if (open) {
      const viewer = window.AtinoManager?.showDocument;
      if (typeof viewer === 'function') viewer(open.dataset.dvOpen);
    }
  });

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
    const customerName = doc.customerName || customer?.name || 'Khách lẻ';
    const customerPhone = doc.customerPhone || customer?.phone || '';
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
    const voided = doc.paymentStatus === 'voided';
    const qr = voided ? '' : qrSvg([STORE.branchCode, doc.id, paid].join('|'));
    const removed = (doc.removedItems || []).map(item => {
      const reason = ctx.showRemovalReasons && item.reason ? `<br><small>Lý do: ${esc(item.reason)}</small>` : '';
      return `<tr style="color:#a32130"><td><del>${esc(item.name || item.code)}${item.size ? ' · ' + esc(item.size) : ''}</del>${reason}</td><td class="r">${number.format(num(item.qty))}</td><td></td><td class="r">Đã xóa</td></tr>`;
    }).join('');
    return `${RECEIPT_STYLE}<div class="dv-receipt">
      <h1>${esc(STORE.name)}</h1>
      <p>Cửa hàng: ${esc(STORE.address)}, ${esc(STORE.branchCode)}</p>
      <p>Hotline: <strong>${esc(STORE.hotline)}</strong></p>
      <p>Thời gian mua hàng: <strong>${esc(dateTime(doc.when, true))}</strong></p>
      <h2>${voided ? 'HÓA ĐƠN ĐÃ HỦY' : 'HOÁ ĐƠN BÁN HÀNG'}</h2><p class="c">ID: <strong>${esc(doc.id)}</strong></p>
      <p>Khách hàng: <strong>${esc([customerName, customerPhone].filter(Boolean).join(' - '))}</strong></p>
      <p><em>Nhân viên thu ngân: ${esc(cashier)}</em></p>
      ${seller && seller !== cashier ? `<p><em>Nhân viên bán hàng: ${esc(seller)}</em></p>` : ''}
      <hr><table><thead><tr><th>Sản phẩm</th><th class="r">Số lượng</th><th class="r">Chiết khấu</th><th class="r">Thành tiền</th></tr></thead><tbody>${rows}${removed}</tbody></table><hr>
      <p class="sum"><strong>Tổng SL sản phẩm</strong><strong>${number.format(items.reduce((sum, item) => sum + num(item.qty), 0))}</strong></p>
      <p class="sum"><span>Chiết khấu:</span><span>${discount ? money(discount) : ''}</span></p>
      <p class="sum big"><span>Tổng tiền SCK:</span><span>${money(paid)}</span></p>
      ${voided ? '' : `<p class="sum"><strong>Đã thanh toán:</strong><span class="small">(+ ${methodLabel}: ${money(paid)})</span></p>`}
      ${doc.cashReceived != null ? `<p class="sum small"><span>Tiền khách đưa: ${money(doc.cashReceived)}</span><span>Tiền trả lại: ${money(Math.max(0, num(doc.cashReceived) - paid))}</span></p>` : ''}
      ${qr ? `<p class="c">Mã QR tham chiếu nội bộ</p>${qr}` : ''}
      <p class="c"><em>Cảm ơn Quý khách đã tin tưởng và lựa chọn sản phẩm <strong>${esc(STORE.name)}</strong>!</em></p>
      <p class="small">Để đảm bảo quyền lợi đổi hàng cũng như số tiền thanh toán, Quý khách vui lòng kiểm tra kỹ thông tin trên hóa đơn gồm: thời gian mua hàng, thông tin sản phẩm, số lượng sản phẩm, tổng tiền và thông tin cá nhân.</p>
      <p class="small">Nếu thông tin trên hóa đơn cần điều chỉnh, Quý khách vui lòng liên hệ hotline ${esc(STORE.complaintHotline)}.</p>
      <hr><p><strong><u>CHÍNH SÁCH 30 NGÀY ĐỔI HÀNG:</u></strong></p>
      <ul>${POLICY.map(line => `<li>${esc(line)}</li>`).join('')}</ul></div>`;
  }

  // Mở cửa sổ in hóa đơn bán hàng. Trả về false nếu trình duyệt chặn cửa sổ.
  function printSale(doc, ctx = {}) {
    const popup = window.open('', '_blank', 'width=420,height=800');
    if (!popup) return false;
    popup.document.open();
    popup.document.write(`<!doctype html><html lang="vi"><head><meta charset="UTF-8"><title>${esc(doc.id)} · ATINO</title><style>body{margin:0;background:#fff}@media print{body{margin:0}}</style></head><body>${saleReceiptHtml(doc, ctx)}<style>.dv-receipt h1,.dv-receipt h2{color:#203657}.dv-receipt th{background:#233655;color:white;padding:6px 3px}.dv-receipt tr:nth-child(even),.dv-receipt .big{background:#edf3fc}.dv-receipt td{border-bottom:1px solid #d4deed}.dv-receipt .big{padding:6px 3px}@media print{thead{display:table-header-group}tr{break-inside:avoid}}</style></body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
    return true;
  }

  window.AtinoDocuments = Object.freeze({STORE, stockSummary, stockHtml, printStock, stockPairs, saleReceiptHtml, printSale, dateTime, person});
})();

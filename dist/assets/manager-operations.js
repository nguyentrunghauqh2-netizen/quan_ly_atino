(function () {
  'use strict';
  const M = window.AtinoManager;
  const ERP = window.AtinoERP;
  const Search = window.AtinoSearch;
  if (!M || !ERP) return;

  const stockStates = {
    receipt: { search: '', from: '', to: '' },
    dispatch: { search: '', from: '', to: '' }
  };
  const salesState = { period: 'month', value: ERP.today().slice(0, 7), search: '', from: '', to: '' };
  const returnState = { search: '' };
  const standardSizes = ['S', 'M', 'L', 'XL', 'XXL'];
  const unitFor = code => window.AtinoCatalog?.unitFor(product(code)) || 'sản phẩm';
  const pendingCost = doc => doc.type === 'receipt' && (doc.costStatus === 'pending' || (doc.items || []).some(row => !Number.isFinite(row.unitPrice) || row.unitPrice <= 0));
  const E = value => M.esc(value == null ? '' : String(value));
  const num = value => Number(value) || 0;
  const sum = (rows, fn) => rows.reduce((total, row) => total + num(fn(row)), 0);
  const uid = prefix => prefix + '-' + (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2));
  const product = code => (M.data.products || []).find(row => row.code === code);
  const customer = id => (M.data.customers || []).find(row => row.id === id);
  const supplier = id => (M.data.suppliers || []).find(row => row.id === id);
  const dateText = value => value ? M.date(value) : 'Chưa ghi nhận ngày';
  const productName = row => row.name || (product(row.code) || {}).name || row.code;
  const itemSearchText = items => (items || []).flatMap(row => [row.code, productName(row), (product(row.code) || {}).category]);
  const itemNames = items => [...new Set((items || []).map(productName).filter(Boolean))].join(', ');
  const quantity = doc => sum(doc.items || [], row => row.qty);
  const rawTotal = doc => sum(doc.items || [], row => row.lineTotal == null ? num(row.qty) * num(row.unitPrice) : row.lineTotal);
  const paidTotal = doc => ERP.documentPaidTotal(doc);
  const paidItems = doc => doc.type === 'sale' ? ERP.salePaidItems(doc) : doc.items;
  const newest = list => [...list].sort((a, b) => (new Date(b.when || 0).getTime() || 0) - (new Date(a.when || 0).getTime() || 0));
  const activeProducts = (kind = 'sale') => (M.data.products || []).filter(row => row.active !== false || kind === 'dispatch' && (M.data.balances || []).some(balance => balance.code === row.code && num(balance.total) > 0));
  const invoiceCustomer = doc => doc.customerName || customer(doc.customerId)?.name || 'Khách lẻ';
  const option = (value, label, selected) => '<option value="' + E(value) + '"' + (String(value) === String(selected) ? ' selected' : '') + '>' + E(label) + '</option>';
  const key = row => row.code + '\u0001' + (row.size || 'Chưa phân size');
  function day(value) {
    if (!value) return '';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
    return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type).value).join('-');
  }
  function available(code, size) {
    return M.data.stock.byProduct.get(code)?.sizes.find(row => row.size === size)?.total ?? 0;
  }
  function sizesFor(code) {
    return [...new Set([...(ERP.sizesFor?.(product(code)) || standardSizes), ...(M.data.balances || []).filter(row => row.code === code).map(row => row.size || 'Chưa phân size')])];
  }
  function status(doc) {
    if (doc.type === 'receipt') return M.badge('Nhập kho', 'green');
    if (doc.type === 'dispatch') return M.badge('Xuất kho', 'amber');
    return M.badge(ERP.transactionStatus(doc), doc.type === 'exchange' ? 'blue' : 'green');
  }
  function stat(label, value, note, receiptView) {
    const opening = receiptView ? '<button type="button" class="am-stat am-overview-card" data-figure-view="'+E(receiptView)+'" aria-haspopup="dialog">' : '<div class="am-stat">';
    return opening + '<div class="am-stat-top"><span>' + E(label) + '</span></div><strong>' + E(value) + '</strong>' + (note ? '<p>' + E(note) + '</p>' : '') + (receiptView ? '</button>' : '</div>');
  }
  function field(label, body, full) {
    return '<label class="am-field' + (full ? ' am-span-2' : '') + '"><span>' + E(label) + '</span>' + body + '</label>';
  }
  const otherChoice = '__other__';
  function destinationChoices() {
    return [...new Set([...(M.data.suppliers || []).filter(row => row.active !== false).map(row => row.name), ...(M.data.movements || []).filter(row => row.type === 'dispatch').map(row => row.destination)].map(value => String(value || '').trim()).filter(value => value && value !== otherChoice && !ERP.isInternalDestination(value)))];
  }
  function choiceField(label, name, values, detailLabel, maximum, full) {
    return '<div class="am-stack' + (full ? ' am-span-2' : '') + '">' + field(label, '<select name="' + name + '" required><option value="">Chọn ' + E(label.replace(/\s*\*$/, '').toLocaleLowerCase('vi')) + '</option>' + values.map(value => option(value, value)).join('') + option(otherChoice, 'Khác — ghi rõ') + '</select>') +
      '<label class="am-field" data-choice-other="' + name + '" hidden><span>' + E(detailLabel) + '</span><input name="' + name + 'Other" maxlength="' + maximum + '" disabled placeholder="Nhập nội dung cụ thể"></label></div>';
  }
  function bindChoice(form, name) {
    const select = form.elements[name], detail = form.elements[name + 'Other'];
    const label = form.querySelector('[data-choice-other="' + name + '"]');
    const update = () => { const other = select.value === otherChoice;label.hidden = !other;detail.disabled = !other;detail.required = other; };
    select.addEventListener('change', update);update();
  }
  function choiceValue(form, name, label) {
    const value = String(form.elements[name]?.value || '').trim();
    if (!value) throw new Error('Hãy chọn ' + label + '.');
    if (value !== otherChoice) return value;
    const detail = String(form.elements[name + 'Other']?.value || '').trim();
    if (!detail) throw new Error('Hãy ghi rõ ' + label + ' khi chọn Khác.');
    return detail;
  }
  function kv(label, value) {
    return '<div class="am-kv"><span class="am-muted">' + E(label) + '</span><strong>' + E(value || '—') + '</strong></div>';
  }
  const styles = '<style>' +
    '#manager-app .op-policy-tags{margin:0 0 18px;gap:8px}' +
    '#manager-app .op-policy-bar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:0 24px 20px}' +
    '#manager-app .op-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem;margin-bottom:1.25rem}' +
    '@media(min-width:1100px){#manager-app [data-op-sales-totals]{grid-template-columns:repeat(4,minmax(0,1fr))}}' +
    '#manager-app .op-doc-title{display:flex;flex-direction:column;gap:.25rem}' +
    '#manager-app .op-line-table{min-width:760px}' +
    '#manager-app .op-line-table select,#manager-app .op-line-table input{font:inherit;font-size:1rem;border:1px solid var(--am-border,#d8dfeb);border-radius:.5rem;padding:.55rem .65rem;max-width:100%;min-height:2.5rem;background:#fff;color:#182230}' +
    '#manager-app .op-line-table .op-product-select{width:100%;min-width:180px}' +
    '#manager-app .op-line-table .op-product-search{display:block;width:100%;min-width:180px;margin-bottom:.5rem}' +
    '#manager-app .op-line-table input[type=number]{width:90px}' +
    '#manager-app .op-line-table input.op-unit-price{width:125px}' +
    '#manager-app .op-line-table td{vertical-align:middle}' +
    '#manager-app .op-line-stock{display:block;margin-top:.3rem;font-size:.8125rem}' +
    '#manager-app .op-line-total{white-space:nowrap}' +
    '#manager-app .op-editor-footer{display:flex;gap:1rem;justify-content:space-between;align-items:center;flex-wrap:wrap;margin:.75rem 0}' +
    '#manager-app .op-order-total{font-size:1.15rem;font-weight:700}' +
    '#manager-app .op-review{padding:1.15rem;border:1px solid #bbd4ca;background:#f1f9f5;border-radius:.8rem;margin-top:1rem}' +
    '#manager-app .op-review h3{margin:0 0 1rem;font-size:1rem}' +
    '#manager-app .op-review .am-kv{display:flex;align-items:baseline;justify-content:space-between;gap:1rem;padding:.4rem 0}' +
    '#manager-app .op-review .op-grand-total{border-top:1px solid #cdded5;margin-top:.5rem;padding-top:.8rem;font-size:1.2rem}' +
    '#manager-app .op-payment{margin-top:1rem;padding-top:1rem;border-top:1px solid #d4dfd9}' +
    '#manager-app .op-payment-check{display:flex;gap:.65rem;align-items:flex-start;font-weight:500;font-size:1rem;line-height:1.5}' +
    '#manager-app .op-payment-check input{width:1.15rem;height:1.15rem;margin-top:.15rem;flex:none}' +
    '#manager-app .op-payment-note{margin:.5rem 0 0;font-size:.875rem;color:#4a596b}' +
    '#manager-app .op-return-qty{max-width:95px}' +
    '#manager-app .op-return-item{display:flex;align-items:center;gap:.75rem}' +
    '#manager-app .op-return-item input{width:1.1rem;height:1.1rem;flex:none}' +
    '#manager-app .op-exchange-impact{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:18px 0}' +
    '#manager-app .op-exchange-impact>div{min-width:0;padding:14px;border:1px solid #d7e4dd;border-radius:8px;background:#fff}' +
    '#manager-app .op-exchange-impact span,#manager-app .op-exchange-impact small{display:block;color:#526173;font-size:.875rem;line-height:1.6}' +
    '#manager-app .op-exchange-impact strong{display:block;font-size:1.125rem;line-height:1.5;color:#224735;margin:6px 0;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}' +
    '#manager-app .op-exchange-items small{display:block;color:#526173;font-size:.875rem;margin-top:4px}' +
    '#manager-app .op-help{font-size:.875rem;line-height:1.6;color:#526173}' +
    '#manager-app .op-result-count{font-size:.875rem;color:#5b687a;margin:.3rem 1.5rem 1rem}' +
    '#manager-app .op-print-btn{margin-top:1rem}' +
    '#manager-app [hidden]{display:none!important}' +
    '@media(max-width:700px){#manager-app .op-summary,#manager-app .op-exchange-impact{grid-template-columns:1fr}#manager-app .op-summary .am-stat{padding:1rem}#manager-app .op-editor-footer{align-items:flex-start}}' +
    '</style>';

  function lineEditorHtml(id, kind, title) {
    return '<section class="am-stack" data-line-editor="' + E(id) + '"><div class="am-panel-head"><h3>' + E(title || 'Sản phẩm') + '</h3></div>' +
      '<div class="am-table-wrap"><table class="am-table op-line-table"><thead><tr><th>Sản phẩm</th><th>Size</th><th>Số lượng</th><th>' + (kind === 'receipt' ? 'Giá nhập' : kind === 'dispatch' ? 'Số lượng trong cửa hàng' : 'Giá bán') + '</th><th>' + (kind === 'dispatch' ? 'Còn lại sau xuất' : 'Thành tiền') + '</th><th></th></tr></thead><tbody data-line-body></tbody></table></div>' +
      '<div class="op-editor-footer"><button class="am-btn secondary small" type="button" data-line-add>+ Thêm sản phẩm</button><span class="op-order-total" data-line-summary></span></div></section>';
  }
  function setupLines(form, id, kind, changed, invoice) {
    const host = form.querySelector('[data-line-editor="' + id + '"]');
    const body = host.querySelector('[data-line-body]');
    const products = activeProducts(kind);
    const oldPrices=new Map((invoice?.items||[]).map(item=>[item.code,item.unitPrice]));
    let sequence = 0;
    function read() {
      return [...body.querySelectorAll('[data-line-row]')].map(row => {
        const line = { code: row.querySelector('[data-line-code]').value, size: row.querySelector('[data-line-size]').value, qty: num(row.querySelector('[data-line-qty]').value) };
        if (kind === 'receipt') line.unitPrice = num(row.querySelector('[data-line-price]').value);
        return line;
      });
    }
    function update() {
      let count = 0;
      let total = 0;
      for (const row of body.querySelectorAll('[data-line-row]')) {
        const code = row.querySelector('[data-line-code]').value;
        const size = row.querySelector('[data-line-size]').value;
        const qty = num(row.querySelector('[data-line-qty]').value);
        const p = product(code) || {};
        const price = kind === 'receipt' ? num(row.querySelector('[data-line-price]').value) : num(oldPrices.get(code) ?? p.price);
        row.querySelector('[data-line-stock]').textContent = code ? 'Số lượng trong cửa hàng: ' + available(code, size) + ' ' + unitFor(code) : '';
        if (kind !== 'receipt') row.querySelector('[data-line-price-text]').textContent = code ? (kind === 'dispatch' ? available(code, size) + ' ' + unitFor(code) : M.money(price)) : '—';
        row.querySelector('[data-line-total]').textContent = code ? (kind === 'dispatch' ? qty > available(code, size) ? 'Vượt số lượng trong cửa hàng' : (available(code, size) - qty) + ' ' + unitFor(code) : M.money(qty * price)) : '—';
        if (code) { count += qty; total += qty * price; }
      }
      host.querySelector('[data-line-summary]').textContent = count + ' sản phẩm' + (kind === 'dispatch' ? '' : ' · ' + M.money(total));
    }
    function add(initial) {
      const p = products.find(row => row.code === (initial || {}).code);
      const code = p ? p.code : '';
      const options = code ? sizesFor(code) : [];
      const selectedSize = initial && initial.size ? initial.size : (kind === 'receipt' ? options[0] : options.find(size => available(code, size) > 0) || options[0]);
      const row = document.createElement('tr');
      row.dataset.lineRow = String(++sequence);
      row.innerHTML = '<td><input class="op-product-search" type="search" data-line-product-search aria-label="Tìm để chọn sản phẩm" placeholder="Tìm áo, balo, dép, mũ…"><select class="op-product-select" required data-line-code aria-label="Sản phẩm">' + option('', products.length ? 'Chọn sản phẩm' : 'Chưa có sản phẩm', code) + products.map(p => option(p.code, p.code + ' · ' + p.name + (p.active === false ? ' · Ngừng bán' : ''), code)).join('') + '</select><span class="am-muted op-line-stock" data-line-stock></span></td>' +
        '<td><select required data-line-size aria-label="Size"' + (code ? '' : ' disabled') + '>' + (options.length ? options.map(size => option(size, size, selectedSize)).join('') : option('', 'Chọn size', '')) + '</select></td>' +
        '<td><input data-line-qty type="number" min="1" step="1" max="100000" required value="' + E(initial && initial.qty || '') + '" aria-label="Số lượng"></td>' +
        '<td>' + (kind === 'receipt' ? '<input data-line-price class="op-unit-price" type="number" min="1" step="1" required placeholder="Nhập giá" value="' + E(initial && initial.unitPrice || '') + '" aria-label="Giá nhập một đơn vị">' : '<span data-line-price-text></span>') + '</td>' +
        '<td class="op-line-total" data-line-total></td><td><button type="button" class="am-btn ghost small" data-line-remove aria-label="Xóa dòng sản phẩm" title="Xóa dòng">×</button></td>';
      body.appendChild(row);
      Search.attach(row.querySelector('[data-line-product-search]'), {
        items: () => products.map(p => ({value: p.name, label: p.name, detail: [p.code, p.category, p.active === false ? 'Ngừng bán' : ''].filter(Boolean).join(' · '), searchText: [p.name, p.code, p.category], code: p.code})),
        onSelect(item) {
          const select = row.querySelector('[data-line-code]');
          select.value = item.code;
          select.dispatchEvent(new Event('change', {bubbles: true}));
        }
      });
      update();
      if (changed) changed();
    }
    host.querySelector('[data-line-add]').addEventListener('click', () => add());
    body.addEventListener('click', event => {
      const button = event.target.closest('[data-line-remove]');
      if (!button) return;
      if (body.children.length === 1) { M.toast('Phiếu cần ít nhất một dòng sản phẩm.'); return; }
      button.closest('[data-line-row]').remove();
      update();
      if (changed) changed();
    });
    body.addEventListener('change', event => {
      if (event.target.matches('[data-line-product-search]')) return;
      if (event.target.matches('[data-line-code]')) {
        const row = event.target.closest('[data-line-row]');
        const code = event.target.value;
        row.querySelector('[data-line-product-search]').value = (product(code) || {}).name || '';
        const options = code ? sizesFor(code) : [];
        const selected = kind === 'receipt' ? options[0] : options.find(size => available(code, size) > 0) || options[0];
        row.querySelector('[data-line-size]').innerHTML = options.length ? options.map(size => option(size, size, selected)).join('') : option('', 'Chọn size', '');
        row.querySelector('[data-line-size]').disabled = !code;
        if (kind === 'receipt') row.querySelector('[data-line-price]').value = '';
      }
      update();
      if (changed) changed();
    });
    body.addEventListener('input', event => {
      if (event.target.matches('[data-line-product-search]')) {
        const row = event.target.closest('[data-line-row]');
        row.querySelector('[data-line-code]').value = '';
        const size = row.querySelector('[data-line-size]');
        size.innerHTML = option('', 'Chọn size', ''); size.disabled = true;
        if (kind === 'receipt') row.querySelector('[data-line-price]').value = '';
      }
      update(); if (changed) changed();
    });
    if(invoice) invoice.items.forEach(add); else add();
    return { read };
  }

  function documentItems(items, paid, highlightCode = '') {
    return '<div class="am-table-wrap"><table class="am-table"><thead><tr><th>Sản phẩm</th><th>Kích cỡ</th><th class="am-right">Số lượng</th><th class="am-right">Đơn giá</th><th class="am-right">' + (paid ? 'Giá trị thực trả' : 'Thành tiền') + '</th></tr></thead><tbody>' +
      (items || []).map(row => {
        const knownPrice = Number.isFinite(row.unitPrice) && row.unitPrice > 0;
        const total = paid && row.paidTotal != null ? row.paidTotal : row.lineTotal == null ? num(row.qty) * num(row.unitPrice) : row.lineTotal;
        const traced = highlightCode && row.code === highlightCode;
        const rowTag = traced ? '<tr class="am-traced-product">' : '<tr>';
        const marker = traced ? '<small class="am-trace-label">Sản phẩm đang tra cứu</small>' : '';
        return rowTag + '<td><strong>' + E(productName(row)) + '</strong><br><span class="am-muted">' + E(row.code) + '</span>' + marker + '</td><td>' + E(row.size || 'Chưa phân size') + '</td><td class="am-right">' + E(row.qty) + '<small class="am-unit">' + E(unitFor(row.code)) + '</small></td><td class="am-right">' + (knownPrice ? M.money(row.unitPrice) : '<span class="am-muted">Chưa có giá</span>') + '</td><td class="am-right">' + (knownPrice ? M.money(total) : '—') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function receiptDocumentItems(items, highlightCode = '', outgoing=false) {
    const groups=new Map();
    for(const row of items||[]){
      const key=row.code||row.name||'unknown';
      if(!groups.has(key))groups.set(key,{code:row.code||'',name:productName(row),items:[]});
      groups.get(key).items.push(row);
    }
    const cards = [...groups.values()].map((group,index) => {
      const qty = sum(group.items,row=>row.qty);
      const traced = highlightCode && group.code === highlightCode;
      return '<button type="button" aria-haspopup="dialog" class="am-btn secondary am-receipt-product-card'+(traced?' am-traced-product':'')+'" data-receipt-item="'+index+'"><span class="am-receipt-product-name"><strong>'+E(group.name)+'</strong><small>'+E(group.code)+'</small></span><span>Số lượng '+(outgoing?'xuất':'nhập')+': '+E(qty)+'</span></button>';
    });
    return '<div class="am-receipt-product-list">'+(cards.join('')||M.empty('Phiếu nhập chưa có mặt hàng'))+'</div>';
  }
  function bindReceiptCards(container, items, receiptId, outgoing=false) {
    const groups = [...new Set(items.map(row=>row.code||row.name||'unknown'))];
    container.querySelectorAll('[data-receipt-item]').forEach(button=>{
      button.addEventListener('click',()=>{
        const key = groups[Number(button.dataset.receiptItem)];
        const lines = items.filter(row=>(row.code||row.name||'unknown')===key);
        if (!lines.length) return;
        const first = lines[0];
        if(outgoing){
          const sizes=lines.map(i=>'<tr><td>'+E(i.size||'Chưa phân size')+'</td><td class="am-right">'+E(i.qty)+'</td></tr>').join('');
          M.dialog({title:productName(first),body:kv('Phiếu xuất',receiptId)+kv('Mã hàng',first.code)+'<table class="am-table"><thead><tr><th>Kích cỡ</th><th class="am-right">Số lượng xuất</th></tr></thead><tbody>'+sizes+'</tbody></table>'+(product(first.code)?'<button type="button" class="am-btn secondary" data-open-goods>Xem thẻ hàng hóa</button>':''),onOpen(form){form.querySelector('[data-open-goods]')?.addEventListener('click',()=>M.showProduct(first.code));}});
          return;
        }
        const priced = lines.every(row=>Number.isFinite(row.unitPrice)&&row.unitPrice>0);
        const rows = lines.map(row=>'<tr><td>'+E(row.size||'Chưa phân size')+'</td><td class="am-right">'+E(row.qty)+'</td><td class="am-right">'+(row.unitPrice>0?M.money(row.unitPrice):'Chờ bổ sung')+'</td><td class="am-right">'+(row.unitPrice>0?M.money(row.lineTotal??row.qty*row.unitPrice):'—')+'</td></tr>').join('');
        M.dialog({title:productName(first),body:'<div class="am-detail">'+kv('Mã hàng',first.code)+kv('Phiếu nhập',receiptId)+kv('Tổng lượng nhập',String(sum(lines,row=>row.qty)))+kv('Giá trị nhập',priced?M.money(rawTotal({items:lines})):'Chờ bổ sung giá nhập')+'</div><div class="am-table-wrap"><table class="am-table"><thead><tr><th>Kích cỡ</th><th>Số lượng</th><th>Giá nhập</th><th>Thành tiền</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
          (product(first.code)?'<button type="button" class="am-btn secondary" data-open-goods>Xem thẻ hàng hóa</button>':''),
          onOpen(form){form.querySelector('[data-open-goods]')?.addEventListener('click',()=>M.showProduct(first.code));}});
      });
    });
  }
  function completeReceiptCost(id) {
    const doc = (M.data.movements || []).find(row => row.id === id && row.type === 'receipt');
    if (!doc || !pendingCost(doc)) return M.toast('Phiếu này đã có giá nhập hoặc không còn trong danh sách.');
    M.dialog({title: 'Bổ sung giá nhập · ' + doc.id, wide: true, submitLabel: 'Lưu giá nhập', body:
      '<div class="am-table-wrap"><table class="am-table op-cost-table"><thead><tr><th>Sản phẩm</th><th>Kích cỡ</th><th class="am-right">Số lượng đã nhận</th><th class="am-right">Giá nhập (đ)</th></tr></thead><tbody>' +
      (doc.items || []).map((row, index) => '<tr><td><strong>' + E(productName(row)) + '</strong><br><span class="am-muted">' + E(row.code) + '</span></td><td>' + E(row.size) + '</td><td class="am-right">' + E(row.qty) + ' ' + E(unitFor(row.code)) + '</td><td><input type="number" class="op-unit-price" data-cost-index="' + index + '" min="1" max="1000000000" step="1" required value="' + (Number.isFinite(row.unitPrice) && row.unitPrice > 0 ? row.unitPrice : '') + '" aria-label="Giá nhập ' + E(productName(row)) + ', ' + E(row.size) + '" placeholder="Nhập giá"></td></tr>').join('') +
      '</tbody></table></div>',
      async onSubmit(form) {
        const lines = (doc.items || []).map((row, index) => ({code: row.code, size: row.size, unitPrice: Number(form.querySelector('[data-cost-index="' + index + '"]').value)}));
        await ERP.completeReceiptCost({id, lines});
        await M.refresh();
        M.toast('Đã bổ sung giá nhập cho phiếu ' + id + '.');
      }
    });
  }
  function documentPeopleHtml(doc) {
    return ERP.documentPeople(doc, M.data.staff).map(([label, name]) => kv(label, name)).join('');
  }
  const stockTypes = {receipt:'Nhập kho', dispatch:'Xuất kho', transfer:'Điều chuyển cũ', restock:'Nhập lại hàng'};
  M.showDocument = function(id, highlightCode = '') {
    const doc = M.data.movements.find(row => row.id === id);
    if (!doc) return M.toast('Không tìm thấy chứng từ này.');
    if (doc.type === 'sale' || doc.type === 'exchange') return showInvoice(id, highlightCode);
    showStockDetails(id, highlightCode);
  };
  function showStockDetails(id, highlightCode = '') {
    const doc = (M.data.movements || []).find(row => row.id === id);
    if (!doc) return M.toast('Không tìm thấy phiếu này.');
    const source = supplier(doc.supplierId), pending = pendingCost(doc);
    const itemDetails=['dispatch','receipt'].includes(doc.type)?receiptDocumentItems(doc.items,highlightCode,doc.type==='dispatch'):documentItems(doc.items,false,highlightCode);
    const dialog = M.dialog({ title: 'Chi tiết phiếu ' + doc.id, wide: true, body:
      '<div class="am-form-grid am-detail">' + kv('Loại phiếu', stockTypes[doc.type] || doc.type) + kv('Ngày lập', dateText(doc.when)) + documentPeopleHtml(doc) + kv('Tổng số lượng', quantity(doc) + ' sản phẩm') +
      (doc.type === 'receipt' ? kv('Nhà cung cấp', source ? source.name : doc.supplierName || 'Chưa ghi nhận') : kv('Nơi nhận', doc.destination || 'Chưa ghi nhận')) + '</div>' +
      itemDetails + (doc.type === 'receipt' ? pending ? '<div class="op-pending-cost">' + M.badge('Chờ bổ sung giá nhập', 'amber') + '<button type="button" class="am-btn secondary" data-op-complete-cost>Bổ sung giá nhập</button></div>' : '<p class="op-order-total">Giá trị nhập: ' + M.money(doc.gross == null ? rawTotal(doc) : doc.gross) + '</p>' : '') +
      (doc.note ? '<div class="am-note">' + E(doc.note) + '</div>' : '') +
      (doc.type === 'receipt' && doc.items.some(item => item.size && item.size !== 'Chưa phân size') ? '<button type="button" class="am-btn secondary" data-op-labels>In tem QR phiếu nhập</button>' : ''),
      onOpen(form) {
        if(['dispatch','receipt'].includes(doc.type)) bindReceiptCards(form, doc.items, doc.id,doc.type==='dispatch');
        form.querySelector('[data-op-labels]')?.addEventListener('click', () => showLabels(doc.items));
        form.querySelector('[data-op-complete-cost]')?.addEventListener('click', () => {dialog.close();completeReceiptCost(id);});
      }
    });
  }
  function openStock(type) {
    if (!activeProducts(type).length) {
      if (type === 'receipt') M.manageReceiptProducts();
      else M.toast('Chưa có sản phẩm phù hợp để xuất hàng.');
      return;
    }
    const suppliers = (M.data.suppliers || []).filter(row => row.active !== false);
    if (type === 'receipt' && !suppliers.length) { M.toast('Hãy thêm nhà cung cấp trước khi nhập hàng.'); M.go('suppliers'); return; }
    const isReceipt = type === 'receipt';
    const requestId = uid(type);
    let editor, reviewedPayload;
    M.dialog({ title: isReceipt ? 'Lập phiếu nhập kho' : 'Lập phiếu xuất kho', wide: true, submitLabel: isReceipt ? 'Xem lại phiếu nhập' : 'Xác nhận xuất kho', body:
      '<p class="am-muted">Ngày lập: ' + E(dateText(ERP.today())) + ' · Người thực hiện: ' + E(M.data.user.name) + '</p><div class="am-form-grid">' +
      (isReceipt ? field('Nhập hàng từ *', '<select name="supplierId" required>' + suppliers.map((row,index) => option(row.id, row.name, index === 0 ? row.id : '')).join('') + '</select>', true) :
        field('Nơi nhận hàng', '<input name="destination" readonly value="'+E(suppliers[0]?.name||'')+'">')) +
      field('Ghi chú chứng từ', '<textarea name="note" rows="2" maxlength="1000" placeholder="Số chứng từ, nội dung bàn giao hoặc ghi chú khác"></textarea>', true) + '</div>' +
      lineEditorHtml('stock', type, 'Hàng ' + (isReceipt ? 'nhập' : 'xuất')) +
      (isReceipt ? '<section class="op-review" data-op-receipt-review hidden aria-live="polite"></section>' : ''),
      onOpen(form) {
        
        const clearReview = () => {
          if (!reviewedPayload) return;
          reviewedPayload = undefined;
          form.querySelector('[data-op-receipt-review]').hidden = true;
          setSubmit(form, 'Xem lại phiếu nhập');
        };
        editor = setupLines(form, 'stock', type, clearReview);
        if (isReceipt) form.addEventListener('input', clearReview);
      },
      async onSubmit(form) {
        const data = new FormData(form);
        const payload = { requestId, type, supplierId: data.get('supplierId') || undefined, destination: isReceipt ? undefined : data.get('destination'), note: data.get('note') || '', lines: editor.read() };
        const fingerprint = JSON.stringify(payload);
        if (isReceipt && reviewedPayload !== fingerprint) {
          const preview = await ERP.previewReceipt(payload);
          const review = form.querySelector('[data-op-receipt-review]');
          review.innerHTML = '<h3>Đối chiếu số lượng trong phiếu</h3>' + kv('Nhà cung cấp', preview.supplierName) +
            receiptDocumentItems(preview.items) + kv('Tổng số lượng cộng vào kho', quantity(preview)) +
            kv('Tổng giá nhập', M.money(preview.total));
          bindReceiptCards(review, preview.items, 'Đang lập');
          review.hidden = false;
          reviewedPayload = fingerprint;
          setSubmit(form, 'Xác nhận nhập kho');
          review.scrollIntoView({block:'nearest'});
          return false;
        }
        const result = await ERP.saveStockDocument(payload);
        await M.refresh();
        M.toast((isReceipt ? 'Đã nhập kho' : 'Đã xuất kho') + (result && (result.id || result.documentId) ? ' · ' + (result.id || result.documentId) : '') + '.');
      }
    });
  }
  function stockSearchText(doc) {
    const s = supplier(doc.supplierId);
    return [doc.id, doc.supplierId, doc.employeeId, doc.employeeName, doc.note, doc.destination, doc.reason, s && s.name, doc.supplierName, ...itemSearchText(doc.items)];
  }
  const stockDatesInvalid = kind => Boolean(stockStates[kind].from && stockStates[kind].to && stockStates[kind].from > stockStates[kind].to);
  const stockHeading = kind => kind === 'receipt' ? 'Sổ nhập kho' : 'Sổ xuất kho';
  const stockSearchLabel = kind => kind === 'receipt' ? 'Tìm phiếu nhập kho' : 'Tìm phiếu xuất kho';
  function stockDocs(kind) {
    const state = stockStates[kind];
    return newest((M.data.movements || []).filter(doc => {
      if (doc.type !== kind) return false;
      const d = day(doc.when);
      if (state.from && (!d || d < state.from)) return false;
      if (state.to && (!d || d > state.to)) return false;
      return Search.match(stockSearchText(doc), state.search);
    }));
  }
  function stockTotals(kind) {
    if (stockDatesInvalid(kind)) return '';
    const docs = stockDocs(kind);
    const availableNow = stat('Số lượng trong cửa hàng', M.data.stock.total + ' sản phẩm', '', 'stock');
    if (kind === 'receipt') return stat('Hàng đã nhập', sum(docs, quantity) + ' sản phẩm', docs.length + ' phiếu nhập trong bộ lọc','items') + stat('Giá trị nhập đã ghi nhận', M.money(sum(docs.filter(doc => !pendingCost(doc)), doc => doc.gross == null ? rawTotal(doc) : doc.gross)), docs.some(pendingCost) ? docs.filter(pendingCost).length + ' phiếu chờ bổ sung giá nhập' : '', 'value') + availableNow;
    return stat('Hàng đã xuất', sum(docs, quantity) + ' sản phẩm', '', 'items') + stat('Phiếu xuất kho', docs.length, 'Đã xác nhận', 'docs') + availableNow;
  }
  function receiptBreakdown(title, docs, code, kind='receipt') {
    const rows = docs.map(doc=>{
      const qty = code ? sum(doc.items.filter(i=>i.code===code),i=>i.qty) : quantity(doc);
      const amount = pendingCost(doc) ? 'Chờ bổ sung giá nhập' : M.money(doc.gross??rawTotal(doc));
      return '<tr><td><button type="button" class="am-text-btn" data-open-receipt="'+E(doc.id)+'">'+E(doc.id)+'</button></td><td>'+E(dateText(doc.when))+'</td><td class="am-right">'+qty+'</td>'+(code||kind==='dispatch'?'':'<td class="am-right">'+E(amount)+'</td>')+'</tr>';
    });
    M.dialog({title,wide:true,body:rows.length?'<div class="am-table-wrap"><table class="am-table"><thead><tr><th>Mã phiếu</th><th>Ngày lập</th><th class="am-right">Số lượng</th>'+(code||kind==='dispatch'?'':'<th class="am-right">Giá trị phiếu</th>')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>':M.empty('Chưa có phiếu nhập phù hợp'),onOpen(form){
      form.querySelectorAll('[data-open-receipt]').forEach(b=>b.onclick=()=>showStockDetails(b.dataset.openReceipt,code));
    }});
  }
  function openReceiptFigure(view,kind) {
    if(view==='stock') return M.showStoreQuantities();
    const docs=stockDocs(kind);
    const direction=kind==='receipt'?'nhập':'xuất';
    if(view==='docs') return receiptBreakdown('Phiếu xuất kho',docs,'',kind);
    if(view==='value') return receiptBreakdown('Giá trị nhập đã ghi nhận',docs.filter(doc=>!pendingCost(doc)));
    const products=new Map();
    for(const doc of docs) for(const line of doc.items||[]) {
      if(!products.has(line.code)) products.set(line.code,{name:productName(line),qty:0});
      products.get(line.code).qty+=num(line.qty);
    }
    M.dialog({title:'Hàng đã '+direction,body:products.size?'<label class="am-search"><input type="search" placeholder="Tìm tên hoặc mã hàng" aria-label="Tìm sản phẩm"></label><div class="am-table-wrap"><table class="am-table"><thead><tr><th>Sản phẩm</th><th class="am-right">Tổng lượng '+direction+'</th></tr></thead><tbody></tbody></table></div>':M.empty('Chưa có hàng '+direction+' trong bộ lọc'),onOpen(form){
      const input=form.querySelector('input'); if(!input)return;
      function draw(){
        const rows=[...products].filter(([code,p])=>Search.match([code,p.name],input.value));
        form.querySelector('tbody').innerHTML=rows.map(([code,p])=>'<tr><td><button class="am-text-btn" type="button" data-import-code="'+E(code)+'">'+E(p.name)+'<small>'+E(code)+'</small></button></td><td class="am-right">'+p.qty+'</td></tr>').join('')||'<tr><td colspan="2">Không tìm thấy sản phẩm.</td></tr>';
      }
      input.oninput=draw;draw();
      form.addEventListener('click',event=>{
        const button=event.target.closest('[data-import-code]');if(!button)return;
        const code=button.dataset.importCode;
        receiptBreakdown(products.get(code).name,docs.filter(doc=>doc.items.some(i=>i.code===code)),code,kind);
      });
    }});
  }
  function stockTable(kind) {
    if (stockDatesInvalid(kind)) return '<p class="am-error" role="alert">Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.</p>';
    const docs = stockDocs(kind);
    const receipt = kind === 'receipt';
    if (!docs.length) return M.empty(receipt ? 'Chưa có phiếu nhập kho phù hợp' : 'Chưa có phiếu xuất kho phù hợp', '');
    const headers = receipt ? ['Phiếu nhập', 'Nhà cung cấp', 'Số lượng nhập', 'Giá trị nhập', 'Người nhập'] : ['Phiếu xuất', 'Nơi nhận', 'Số lượng xuất', 'Người xuất'];
    return '<p class="op-result-count">' + docs.length + ' phiếu phù hợp</p><div class="am-table-wrap"><table class="am-table"><thead><tr>' + headers.map((label, index) => '<th' + (index === 2 || receipt && index === 3 ? ' class="am-right"' : '') + '>' + E(label) + '</th>').join('') + '<th></th></tr></thead><tbody>' + docs.map(doc => {
      const s = supplier(doc.supplierId);
      const partner = receipt ? s ? s.name : doc.supplierName || 'Chưa ghi nhận' : doc.destination || '—';
      const detail = receipt ? pendingCost(doc) ? M.badge('Chờ bổ sung giá nhập', 'amber') : '<strong>' + M.money(doc.gross == null ? rawTotal(doc) : doc.gross) + '</strong>' : '';
      return '<tr><td><div class="op-doc-title">' + ('<button type="button" class="am-text-btn" data-op-stock-detail="'+E(doc.id)+'">'+E(doc.id)+'</button>') + '<span class="am-muted">' + E(dateText(doc.when)) + '</span></div></td><td>' + E(partner) + '</td><td class="am-right">' + quantity(doc) + ' sản phẩm</td>' + (receipt ? '<td class="am-right">' + detail + '</td>' : '') + '<td>' + E(doc.employeeName || '—') + '</td><td><button type="button" class="am-btn secondary small" data-op-stock-detail="' + E(doc.id) + '">Chi tiết</button></td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  function exportStock(kind, button) {
    if (stockDatesInvalid(kind)) return M.toast('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.');
    const receipt = kind === 'receipt';
    const name = receipt ? 'atino-nhap-kho-' : 'atino-xuat-kho-';
    const headers = receipt ? ['Mã phiếu nhập', 'Ngày nhập', 'Mã sản phẩm', 'Sản phẩm', 'Size', 'Số lượng nhập', 'Giá nhập', 'Thành tiền', 'Trạng thái giá nhập', 'Nhà cung cấp', 'Ghi chú', 'Người nhập'] : ['Mã phiếu xuất', 'Ngày xuất', 'Mã sản phẩm', 'Sản phẩm', 'Size', 'Số lượng xuất', 'Nơi nhận', 'Ghi chú', 'Người xuất'];
    const rows = stockDocs(kind).flatMap(doc => (doc.items || []).map(row => {
      const common = [doc.id, window.AtinoReports.localTime(doc.when), row.code, productName(row), row.size, row.qty];
      if (receipt) return [...common, row.unitPrice == null ? '' : row.unitPrice, row.unitPrice == null ? '' : row.lineTotal == null ? num(row.qty) * num(row.unitPrice) : row.lineTotal, pendingCost(doc) ? 'Chờ bổ sung giá nhập' : 'Đã có giá nhập', (supplier(doc.supplierId) || {}).name || doc.supplierName || '', doc.note || '', doc.employeeName || ''];
      return [...common, doc.destination || '', doc.note || '', doc.employeeName || ''];
    }));
    const formats = receipt ? {1:'datetime',6:'money',7:'money'} : {1:'datetime'};
    M.downloadTable(name + ERP.today(), stockHeading(kind), [headers, ...rows], button, formats);
  }
  function registerStockPage(kind) {
    const receipt = kind === 'receipt';
    const state = stockStates[kind];
    M.register(receipt ? 'receipts' : 'dispatches', {
      title: receipt ? 'Nhập kho' : 'Xuất kho', kicker: receipt ? 'TIẾP NHẬN HÀNG HÓA' : 'XUẤT HÀNG KHỎI CỬA HÀNG',
      render() {
        return styles + '<div class="op-summary" data-op-stock-totals>' + stockTotals(kind) + '</div>' +
          '<section class="am-panel"><div class="am-panel-head"><div><h2 data-op-stock-heading>' + stockHeading(kind) + '</h2></div><div class="am-actions">' +
          (receipt ? '<button type="button" class="am-btn secondary" data-op-models>Sản phẩm</button>' : '') + '<button type="button" class="am-btn" data-op-stock-new="' + kind + '">+ ' + (receipt ? 'Nhập kho' : 'Xuất kho') + '</button></div></div>' +
          '<div class="am-toolbar am-filterbar"><label class="am-search">' + M.icon('search') + '<input type="search" aria-label="' + stockSearchLabel(kind) + '" data-op-stock-search placeholder="' + (receipt ? 'Tìm phiếu, sản phẩm, nhà cung cấp…' : 'Tìm phiếu, sản phẩm, nơi nhận…') + '" value="' + E(state.search) + '"></label>' +
          field('Từ ngày', '<input type="date" data-op-stock-from aria-label="Từ ngày" value="' + E(state.from) + '">') + field('Đến ngày', '<input type="date" data-op-stock-to aria-label="Đến ngày" value="' + E(state.to) + '">') +
          '<button type="button" class="am-btn ghost small" data-op-stock-excel' + (stockDatesInvalid(kind) ? ' disabled' : '') + '>Xuất Excel</button></div><div data-op-stock-table>' + stockTable(kind) + '</div></section>';
      },
      bind(root) {
        const redraw = () => {
          root.querySelector('[data-op-stock-table]').innerHTML = stockTable(kind);
          root.querySelector('[data-op-stock-totals]').innerHTML = stockTotals(kind);
          root.querySelector('[data-op-stock-excel]').disabled = stockDatesInvalid(kind);
        };
        for (const [selector, prop, eventName] of [['search', 'search', 'input'], ['from', 'from', 'change'], ['to', 'to', 'change']]) {
          const input = root.querySelector('[data-op-stock-' + selector + ']');
          if (input) input.addEventListener(eventName, event => { state[prop] = event.target.value; redraw(); });
        }
        Search.attach(root.querySelector('[data-op-stock-search]'), {items: () => stockDocs(kind).map(doc => ({
          value: doc.id, label: doc.id,
          detail: [doc.type === 'receipt' ? 'Nhập kho' : 'Xuất kho', (supplier(doc.supplierId) || {}).name || doc.supplierName || doc.destination, itemNames(doc.items)].filter(Boolean).join(' · '),
          searchText: stockSearchText(doc)
        }))});
        root.addEventListener('click', event => {
          const figure=event.target.closest('[data-figure-view]');
          if(figure) return openReceiptFigure(figure.dataset.figureView,kind);
          const details = event.target.closest('[data-op-stock-detail]');
          if (receipt && event.target.closest('[data-op-models]')) M.manageReceiptProducts();
          if (event.target.closest('[data-op-stock-new]')) openStock(kind);
          if (details) showStockDetails(details.dataset.opStockDetail);
          const exportButton = event.target.closest('[data-op-stock-excel]');
          if (exportButton) exportStock(kind, exportButton);
        });
      }
    });
  }
  registerStockPage('receipt');
  registerStockPage('dispatch');

  function setSubmit(form, label) {
    const button = form.querySelector('button[type="submit"]') || (form.parentElement && form.parentElement.querySelector('button[type="submit"]'));
    if (button) button.textContent = label;
  }
  function paymentHtml(total, method) {
    if (total <= 0) return '<div class="op-payment"><strong>Không thu thêm</strong></div>';
    if (method === 'Chuyển khoản') return '<div class="op-payment"><label class="op-payment-check"><input type="checkbox" name="transferConfirmed" required data-payment-input><span>Đã kiểm tra và nhận đủ ' + M.money(total) + '.</span></label></div>';
    return '<div class="op-payment"><div class="am-form-grid">' + field('Tiền khách đưa *', '<input type="number" name="cashReceived" required min="' + num(total) + '" step="1" placeholder="Nhập số tiền đã nhận" data-payment-input>') + '<div class="am-field"><span>Tiền trả lại khách</span><strong class="op-order-total" data-cash-change>—</strong></div></div></div>';
  }
  function bindPayment(form, total) {
    const input = form.querySelector('[name="cashReceived"]');
    if (input) input.addEventListener('input', () => {
      const change = form.querySelector('[data-cash-change]');
      change.textContent = !input.value ? '—' : num(input.value) < total ? 'Còn thiếu ' + M.money(total - num(input.value)) : M.money(num(input.value) - total);
    });
  }
  function readPayment(form, total, method) {
    if (total <= 0) return { cashReceived: 0, transferConfirmed: true };
    if (method === 'Chuyển khoản') {
      const confirmed = !!form.querySelector('[name="transferConfirmed"]')?.checked;
      if (!confirmed) throw new Error('Hãy kiểm tra tài khoản và xác nhận đã nhận đủ tiền chuyển khoản.');
      return { transferConfirmed: true };
    }
    const received = num(form.querySelector('[name="cashReceived"]')?.value);
    if (received < total) throw new Error('Tiền khách đưa chưa đủ để thanh toán.');
    return { cashReceived: received, transferConfirmed: false };
  }
  function saleInputs(form, editor) {
    return { lines: editor.read(), sellerId:form.elements.sellerId.value, ...window.AtinoCheckout.readBuyer(form), method: form.elements.method.value };
  }
  function openSale() {
    if (!activeProducts().length) { M.toast('Hãy thêm sản phẩm trước khi tạo hóa đơn.'); M.go('inventory'); return; }
    const customers = M.data.customers || [];
    const requestId = uid('sale');
    let editor;
    let quote = null;
    let quotedInput = '';
    let currentForm;
    function invalidate() {
      quote = null;
      quotedInput = '';
      if (!currentForm) return;
      const review = currentForm.querySelector('[data-sale-review]');
      review.hidden = true;
      review.innerHTML = '';
      setSubmit(currentForm, 'Kiểm tra đơn hàng');
    }
    M.dialog({ title: 'Tạo hóa đơn bán hàng', wide: true, submitLabel: 'Kiểm tra đơn hàng', body:
      '<div class="am-form-grid">' +
      field('Người bán', '<select name="sellerId" required>' + M.data.staff.filter(person=>person.active!==false).map(person=>option(person.code, person.name, M.data.user.code)).join('') + '</select>') +
      kv('Thu ngân', M.data.user.name) +
      window.AtinoCheckout.buyerFields +
      field('Phương thức thanh toán', '<select name="method">' + option('Tiền mặt', 'Tiền mặt') + option('Chuyển khoản', 'Chuyển khoản') + '</select>') + '</div>' +
      lineEditorHtml('sale', 'sale', 'Sản phẩm bán') + '<section class="op-review" data-sale-review hidden aria-live="polite"></section>',
      onOpen(form) {
        currentForm = form;
        window.AtinoCheckout.bindBuyer(form,()=>customers);
        editor = setupLines(form, 'sale', 'sale', invalidate);
        form.addEventListener('change', event => {
          if (event.target.matches('[data-payment-input], [data-line-product-search]')) return;
          invalidate();
        });
      },
      async onSubmit(form) {
        const input = saleInputs(form, editor);
        const fingerprint = JSON.stringify(input);
        if (!quote || fingerprint !== quotedInput) {
          const result = await ERP.quoteSale(input);
          quote = result;
          quotedInput = fingerprint;
          const review = form.querySelector('[data-sale-review]');
          review.hidden = false;
          review.innerHTML = '<h3>Kiểm tra trước khi thanh toán</h3>' + documentItems(result.items, false) + '<div class="am-kv op-grand-total"><span>Khách cần thanh toán</span><strong>' + M.money(result.total) + '</strong></div>' +
            paymentHtml(num(result.total), input.method);
          bindPayment(form, num(result.total));
          setSubmit(form, 'Xác nhận thanh toán');
          review.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          return false;
        }
        const payment = readPayment(form, num(quote.total), input.method);
        const result = await ERP.saveSale({ ...input, ...payment, requestId, expectedTotal: num(quote.total) });
        await M.refresh();
        M.toast('Đã thanh toán hóa đơn ' + result.id + ' · ' + M.money(result.total) + '.');
      }
    });
  }
  const methodText = ERP.paymentMethod;
  function printInvoice(doc) {
    const popup = window.open('', '_blank', 'width=900,height=760');
    if (!popup) { M.toast('Trình duyệt đang chặn cửa sổ in. Hãy cho phép mở cửa sổ rồi thử lại.'); return; }
    const title = doc.type === 'exchange' ? 'PHIẾU ĐỔI HÀNG' : 'HÓA ĐƠN BÁN HÀNG';
    const content = '<!doctype html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + E(doc.id) + ' · ATINO</title><style>body{font-family:Arial,sans-serif;max-width:820px;margin:36px auto;color:#17212b;font-size:15px;padding:0 20px}h1{font-size:28px;letter-spacing:4px;margin-bottom:8px}h2{font-size:20px;margin:22px 0}p{line-height:1.6}table{border-collapse:collapse;width:100%;margin:24px 0}th,td{padding:10px 6px;border-bottom:1px solid #ddd;text-align:left}th{font-size:13px}.am-muted{color:#66717f}.am-kv{display:flex;justify-content:space-between;gap:30px;margin:12px 0}.total{font-size:22px;font-weight:bold;border-top:2px solid #17212b;padding-top:14px}.note{margin-top:30px;color:#66717f;font-size:13px;line-height:1.6}@media print{body{margin:0 auto;padding:0}button{display:none}table{break-inside:auto}tr{break-inside:avoid}}</style></head><body><h1>ATINO</h1><p>Quản lý cửa hàng thời trang</p><h2>' + title + '</h2><div class="am-kv"><span>Mã chứng từ</span><strong>' + E(doc.id) + '</strong></div><div class="am-kv"><span>Ngày</span><span>' + E(dateText(doc.when)) + '</span></div><div class="am-kv"><span>Khách hàng</span><span>' + E(invoiceCustomer(doc)) + '</span></div>' + documentPeopleHtml(doc) +
      (doc.exchangeOf ? '<div class="am-kv"><span>Hóa đơn được đổi</span><span>' + E(doc.exchangeOf) + '</span></div>' : '') + (doc.type === 'exchange' ? '<h3>Hàng khách trả</h3>' + documentItems(doc.returnedItems || [], true) + '<h3>Hàng giao khách</h3>' : '') + documentItems(paidItems(doc), true) +
      (doc.type === 'exchange' ? '<div class="am-kv"><span>Giá trị hàng mới</span><span>' + M.money(doc.replacementTotal == null ? rawTotal(doc) : doc.replacementTotal) + '</span></div><div class="am-kv"><span>Giá trị hàng đổi</span><span>' + M.money(doc.credit) + '</span></div>' : '') +
      '<div class="am-kv total"><span>' + (doc.type === 'exchange' ? 'Chênh lệch đã thu' : 'Đã thanh toán') + '</span><span>' + M.money(paidTotal(doc)) + '</span></div><div class="am-kv"><span>Phương thức</span><span>' + E(methodText(doc)) + '</span></div><p class="note">Phiếu bán hàng · Không phải hóa đơn GTGT.<br>Đổi hàng: 30 ngày · Ngang giá hoặc cao hơn · Không hoàn tiền.</p><button type="button" onclick="window.print()">In phiếu</button></body></html>';
    popup.document.open();
    popup.document.write(content);
    popup.document.close();
    popup.focus();
    popup.print();
  }
  function editInvoice(doc) {
    let editor;
    const optionList=(rows,idKey,current)=>rows.filter(r=>r.active!==false).map(r=>option(r[idKey],r.name,current)).join('');
    const discount=Math.max(0,rawTotal(doc)-paidTotal(doc));
    const prices=new Map(doc.items.map(i=>[i.code,i.unitPrice]));
    const total=()=>editor.read().reduce((sum,i)=>sum+i.qty*(prices.get(i.code)??product(i.code)?.price??0),0)-discount;
    M.dialog({title:'Sửa hóa đơn '+doc.id,wide:true,submitLabel:'Lưu hóa đơn',body:
      '<div class="am-form-grid">'+field('Khách hàng','<select name="customerId">'+option('','Khách lẻ',doc.customerId)+optionList(M.data.customers,'id',doc.customerId)+'</select>')+
      field('Người bán','<select name="sellerId">'+optionList(M.data.staff,'code',doc.sellerId||doc.employeeId)+'</select>')+
      field('Thanh toán','<select name="method">'+['Tiền mặt','Chuyển khoản'].map(m=>option(m,m,ERP.paymentMethod(doc))).join('')+'</select>')+
      '<label data-cash>Tiền khách đưa (đ)<input name="cash" type="number" min="0" value="'+E(doc.cashReceived??paidTotal(doc))+'"></label><label data-bank><input type="checkbox" name="confirmed"> Đã nhận đủ chuyển khoản</label></div>'+
      lineEditorHtml('edit-sale','sale','Hàng đã bán')+'<p data-edit-total></p>',
      onOpen(form){
        function refresh(){if(editor)form.querySelector('[data-edit-total]').textContent='Thực thu sau chỉnh sửa: '+M.money(total());}
        editor=setupLines(form,'edit-sale','sale',refresh,doc);
        function sync(){const cash=form.elements.method.value==='Tiền mặt';form.querySelector('[data-cash]').hidden=!cash;form.querySelector('[data-bank]').hidden=cash;}
        form.elements.method.onchange=sync;sync();refresh();
      },
      async onSubmit(form){
        await ERP.editSale({id:doc.id,revision:doc.editRevision||0,lines:editor.read(),expectedTotal:total(),customerId:form.elements.customerId.value,sellerId:form.elements.sellerId.value,method:form.elements.method.value,cashReceived:form.elements.cash.value,transferConfirmed:form.elements.confirmed.checked});
        await M.refresh();M.toast('Đã cập nhật hóa đơn '+doc.id);showInvoice(doc.id);
      }
    });
  }
  function showInvoice(id, highlightCode = '') {
    const doc = (M.data.movements || []).find(row => String(row.id) === String(id) && ['sale', 'exchange'].includes(row.type));
    if (!doc) return M.dialog({title:'Tra cứu hóa đơn',body:M.empty('Không tìm thấy hóa đơn '+id)});
    M.dialog({ title: (doc.type === 'exchange' ? 'Phiếu đổi hàng ' : 'Hóa đơn ') + doc.id, wide: true, body:
      styles + '<div class="am-form-grid am-detail">' + kv('Ngày lập', dateText(doc.when)) + kv('Khách hàng', [invoiceCustomer(doc),doc.customerId].filter(Boolean).join(' · ')) + documentPeopleHtml(doc) + kv('Thanh toán', methodText(doc)) + (doc.exchangeOf ? sourceInvoice(doc.exchangeOf) : '') + '</div>' + (doc.type === 'exchange' ? '<h3>Hàng khách trả</h3>' + documentItems(doc.returnedItems || [], true, highlightCode) + '<h3>Hàng giao khách</h3>' : '') + documentItems(paidItems(doc), true, highlightCode) +
      '<div class="op-review">' + (doc.type === 'exchange' ? kv('Giá trị hàng mới', M.money(doc.replacementTotal == null ? rawTotal(doc) : doc.replacementTotal)) + kv('Giá trị hàng đổi', M.money(doc.credit)) : '') + '<div class="am-kv op-grand-total"><span>' + (doc.type === 'exchange' ? 'Chênh lệch đã thu' : 'Đã thanh toán') + '</span><strong>' + M.money(paidTotal(doc)) + '</strong></div></div>' +
      (doc.cashReceived != null ? '<p class="op-help">Tiền khách đưa: ' + M.money(doc.cashReceived) + ' · Tiền trả lại: ' + M.money(Math.max(0, num(doc.cashReceived) - paidTotal(doc))) + '</p>' : '') +
      (doc.type==='sale'?(M.data.returns.some(r=>r.invoiceId===doc.id)?'<p>Hóa đơn đã có phiếu đổi nên được khóa.</p>':'<button type="button" class="am-btn" data-edit-sale>Sửa hóa đơn</button>'):'') + '<button type="button" class="am-btn secondary op-print-btn" data-op-print-invoice>' + (doc.type === 'exchange' ? 'In phiếu đổi hàng' : 'In hóa đơn') + '</button>',
      onOpen(form) { form.querySelector('[data-edit-sale]')?.addEventListener('click',()=>{form.closest('dialog').close();editInvoice(doc);}); form.querySelector('[data-op-print-invoice]').addEventListener('click', () => printInvoice(doc)); }
    });
  }
  M.showInvoice = showInvoice;

  function salesSearchText(doc) {
    const c = customer(doc.customerId);
    return [doc.id, doc.customerId, doc.sellerId, doc.cashierId, doc.sellerName, doc.cashierName, doc.employeeName, invoiceCustomer(doc), c?.name, c?.phone, ...itemSearchText(doc.items)];
  }
  const salesDatesInvalid = () => salesState.period === 'custom' && salesState.from && salesState.to && salesState.from > salesState.to;
  function salesDocs() {
    return newest((M.data.movements || []).filter(doc => {
      if (!['sale', 'exchange'].includes(doc.type)) return false;
      const d = day(doc.when);
      if (salesState.period === 'day' && d !== salesState.value) return false;
      if (salesState.period === 'month' && (!d || d.slice(0, 7) !== salesState.value)) return false;
      if (salesState.period === 'year' && (!d || d.slice(0, 4) !== String(salesState.value))) return false;
      if (salesState.period === 'custom' && ((salesState.from && (!d || d < salesState.from)) || (salesState.to && (!d || d > salesState.to)))) return false;
      return Search.match(salesSearchText(doc), salesState.search);
    }));
  }
  function saleCosts(movements) {
 const balances=new Map(),sold=new Map(),costs=new Map();
 const key=item=>JSON.stringify([item.code,item.size||'Chưa phân size']);
 function balance(item){
  const id=key(item);
  if(!balances.has(id))balances.set(id,{qty:0,value:0});
  return balances.get(id);
 }
 function receive(item,value){
  const row=balance(item);
  row.value=row.qty<0||value==null||row.value==null?null:row.value+value;
  row.qty+=item.qty;
  if(row.qty===0)row.value=0;
 }
 function take(item){
  const row=balance(item);
  const value=row.qty>=item.qty&&row.value!=null?Math.round(row.value*item.qty/row.qty):null;
  row.qty-=item.qty;
  row.value=row.qty===0?0:value==null?null:row.value-value;
  return value;
 }
 for(const doc of [...movements].sort((a,b)=>new Date(a.when||0)-new Date(b.when||0))){
  if(doc.type==='receipt'||doc.type==='restock'){
   for(const item of doc.items||[])receive(item,doc.costStatus!=='pending'&&item.unitPrice>0?item.unitPrice*item.qty:null);
   continue;
  }
  if(!['dispatch','sale','exchange'].includes(doc.type))continue;
  let net=0,known=true;
  const original=sold.get(doc.exchangeOf);
  for(const item of doc.type==='exchange'&&doc.condition!=='damaged'?doc.returnedItems||[]:[]){
   const line=original?.get(key(item));
   const value=line&&line.value!=null&&line.qty>=item.qty?Math.round(line.value*item.qty/line.qty):null;
   if(line){line.qty-=item.qty;line.value=value==null?null:line.value-value;}
   receive(item,value);
   if(value==null)known=false;else net-=value;
  }
  const lines=new Map();
  for(const item of doc.items||[]){
   if(!item.qty)continue;
   const value=take(item);
   if(value==null)known=false;else net+=value;
   if(doc.type==='sale'){
    const id=key(item),line=lines.get(id)||{qty:0,value:0};
    line.qty+=item.qty;line.value=value==null||line.value==null?null:line.value+value;lines.set(id,line);
   }
  }
  if(doc.type==='sale')sold.set(doc.id,lines);
  if(doc.type!=='dispatch')costs.set(doc.id,known?net:null);
 }
 return costs;
}
  function profitRows(){
 const costs=saleCosts(M.data.movements);
 return salesDocs().map(doc=>{
  const revenue=paidTotal(doc),cost=costs.get(doc.id);
  return {doc,revenue,cost,profit:cost==null?null:revenue-cost};
 });
}
  function showProfit(){
 const rows=profitRows();
 const body=rows.length?'<div class="am-table-wrap"><table class="am-table"><thead><tr><th>Chứng từ</th><th>Doanh thu</th><th>Giá vốn</th><th>Lợi nhuận gộp</th></tr></thead><tbody>'+rows.map(r=>`<tr><td>${M.invoiceLink(r.doc.id)}</td><td>${M.money(r.revenue)}</td><td>${r.cost==null?'Chưa đủ giá vốn':M.money(r.cost)}</td><td>${r.profit==null?'—':M.money(r.profit)}</td></tr>`).join('')+'</tbody></table></div>':M.empty('Chưa có giao dịch phù hợp');
 M.dialog({title:'Lợi nhuận gộp theo chứng từ',wide:true,body});
}
  function salesTotals() {
    const docs = salesDocs();
    const rows=profitRows(),missing=rows.filter(row=>row.profit==null).length;
    const profit=stat('Lợi nhuận gộp',missing?'Chưa đủ giá vốn':M.money(sum(rows,row=>row.profit)),missing?missing+' chứng từ thiếu giá vốn':'Doanh thu trừ giá vốn','profit');
    return stat('Doanh thu trong bộ lọc', M.money(sum(docs, paidTotal)), '', 'all') + profit + stat('Hóa đơn bán hàng', docs.filter(doc => doc.type === 'sale').length, 'Đã thanh toán','sale') + stat('Giao dịch đổi hàng', docs.filter(doc => doc.type === 'exchange').length, '', 'exchange');
  }
  function salesTable() {
    const docs = salesDocs();
    if (!docs.length) return M.empty('Chưa có hóa đơn trong kỳ này');
    return '<p class="op-result-count">' + docs.length + ' giao dịch phù hợp</p><div class="am-table-wrap"><table class="am-table"><thead><tr><th>Hóa đơn</th><th>Tình trạng</th><th>Khách hàng</th><th>Thực thu</th><th>Thanh toán</th><th></th></tr></thead><tbody>' + docs.map(doc => {
      return '<tr><td><div class="op-doc-title">' + M.invoiceLink(doc.id) + '<span class="am-muted">' + E(dateText(doc.when)) + '</span></div></td><td>' + status(doc) + '</td><td>' + E(invoiceCustomer(doc)) + '</td><td><strong>' + M.money(paidTotal(doc)) + '</strong></td><td>' + E(methodText(doc)) + '</td><td><button type="button" class="am-btn secondary small" data-op-sale-detail="' + E(doc.id) + '">Xem hóa đơn</button></td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  function salesPeriodControl() {
    if (salesState.period === 'all') return '';
    if (salesState.period === 'custom') return field('Từ ngày', '<input type="date" data-op-sales-from value="' + E(salesState.from) + '">') + field('Đến ngày', '<input type="date" data-op-sales-to value="' + E(salesState.to) + '">');
    return field(salesState.period === 'day' ? 'Ngày' : salesState.period === 'month' ? 'Tháng' : 'Năm', '<input data-op-sales-value type="' + (salesState.period === 'year' ? 'number' : salesState.period === 'month' ? 'month' : 'date') + '"' + (salesState.period === 'year' ? ' min="2000" max="2200" step="1"' : '') + ' value="' + E(salesState.value) + '">');
  }
  function filteredSalesSheet() {
    const {period, value, from, to} = salesState;
    let label = 'Toàn bộ thời gian';
    if (period === 'custom') label = 'Từ ' + (from ? M.date(from) : 'đầu kỳ') + ' đến ' + (to ? M.date(to) : 'hiện tại');
    else if (period !== 'all') label = window.AtinoReports.periodLabel(period, value || ERP.today());
    return window.AtinoReports.transactionsSheet(M.data, salesDocs(), label + ' · Giờ Việt Nam');
  }
  M.register('sales', {
    title: 'Hóa đơn & doanh thu', kicker: 'GIAO DỊCH BÁN HÀNG',
    render() {
      return styles + '<div class="op-summary" data-op-sales-totals>' + salesTotals() + '</div><section class="am-panel"><div class="am-panel-head"><div><h2>Hóa đơn và khoản thu</h2></div><button type="button" class="am-btn" data-op-sale-new>+ Tạo hóa đơn</button></div>' +
        '<div class="am-toolbar am-filterbar">' + field('Khoảng thời gian', '<select data-op-sales-period>' + [['day', 'Theo ngày'], ['month', 'Theo tháng'], ['year', 'Theo năm'], ['custom', 'Khoảng ngày'], ['all', 'Toàn bộ']].map(row => option(row[0], row[1], salesState.period)).join('') + '</select>') + salesPeriodControl() +
        '<label class="am-search">' + M.icon('search') + '<input type="search" aria-label="Tìm hóa đơn" data-op-sales-search value="' + E(salesState.search) + '" placeholder="Tìm hóa đơn, khách hàng, sản phẩm…"></label><div class="am-actions"> <button type="button" class="am-btn secondary small" data-op-sales-excel>Xuất Excel</button></div></div><div data-op-sales-table>' + salesTable() + '</div></section>';
    },
    bind(root) {
      const redraw = () => {
        const invalid = salesDatesInvalid();
        root.querySelector('[data-op-sales-table]').innerHTML = invalid ? '<p class="am-error">Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.</p>' : salesTable();
        root.querySelector('[data-op-sales-totals]').innerHTML = invalid ? '' : salesTotals();
        root.querySelector('[data-op-sales-excel]').disabled = !!invalid;
      };
      root.querySelector('[data-op-sales-period]').addEventListener('change', event => {
        salesState.period = event.target.value;
        salesState.value = salesState.period === 'year' ? ERP.today().slice(0, 4) : salesState.period === 'month' ? ERP.today().slice(0, 7) : ERP.today();
        M.go('sales');
      });
      root.querySelector('[data-op-sales-search]').addEventListener('input', event => { salesState.search = event.target.value; redraw(); });
      for (const prop of ['value', 'from', 'to']) {
        const input = root.querySelector('[data-op-sales-' + prop + ']');
        if (input) input.addEventListener('change', event => { salesState[prop] = event.target.value; redraw(); });
      }
      Search.attach(root.querySelector('[data-op-sales-search]'), {items: () => salesDocs().map(doc => ({
        value: doc.id, label: doc.id,
        detail: [invoiceCustomer(doc), itemNames(doc.items), M.money(paidTotal(doc))].filter(Boolean).join(' · '),
        searchText: salesSearchText(doc)
      })), onSelect: item => showInvoice(item.value)});
      root.addEventListener('click', event => {
        const figure=event.target.closest('[data-figure-view]');
        if(figure){
          const type=figure.dataset.figureView;
          if(type==='profit')return showProfit();
          M.showInvoiceList(figure.querySelector('.am-stat-top').textContent,salesDocs().filter(d=>type==='all'||d.type===type),'Chưa có giao dịch phù hợp');
        }
        if (event.target.closest('[data-op-sale-new]')) openSale();
        const detail = event.target.closest('[data-op-sale-detail]');
        if (detail) showInvoice(detail.dataset.opSaleDetail);
        const exportExcel = event.target.closest('[data-op-sales-excel]');
        if (exportExcel) {
          if (salesDatesInvalid()) { M.toast('Chọn ngày kết thúc bằng hoặc sau ngày bắt đầu trước khi xuất báo cáo.'); return; }
          const sheet = filteredSalesSheet();
          const filename = 'Atino-giao-dich-' + ERP.today();
          M.downloadWorkbook(filename + '.xlsx', [sheet], exportExcel);
        }
      });
      redraw();
    }
  });

  function invoiceRemainder(invoice) {
    const bought = new Map();
    for (const item of ERP.salePaidItems(invoice)) {
      const id = key(item);
      const previous = bought.get(id) || { code: item.code, name: productName(item), size: item.size || 'Chưa phân size', qty: 0, paid: 0, returned: 0 };
      previous.qty += num(item.qty);
      previous.paid += num(item.paidTotal == null ? item.lineTotal == null ? num(item.unitPrice) * num(item.qty) : item.lineTotal : item.paidTotal);
      bought.set(id, previous);
    }
    for (const returned of (M.data.returns || []).filter(row => row.invoiceId === invoice.id)) for (const item of returned.items || []) {
      const match = bought.get(key(item));
      if (match) match.returned += num(item.qty);
    }
    return [...bought.values()].map(item => ({ ...item, remaining: Math.max(0, item.qty - item.returned), paidUnit: item.qty ? item.paid / item.qty : 0 }));
  }
  function eligibleInvoices() {
    const now = Date.parse(ERP.today() + 'T00:00:00+07:00');
    return newest((M.data.movements || []).filter(doc => {
      if (doc.type !== 'sale' || !day(doc.when)) return false;
      const age = (now - Date.parse(day(doc.when) + 'T00:00:00+07:00')) / 86400000;
      return age >= 0 && age <= 30 && invoiceRemainder(doc).some(row => row.remaining > 0);
    }));
  }
  function returnSelectionHtml(invoice) {
    if (!invoice) return '';
    const rows = invoiceRemainder(invoice);
    return '<p class="op-help">' + E(invoiceCustomer(invoice)) + ' · Mua ngày ' + E(dateText(invoice.when)) + ' · Đã thanh toán ' + M.money(paidTotal(invoice)) + '</p>' +
      '<div class="am-table-wrap"><table class="am-table"><thead><tr><th>Sản phẩm trả lại</th><th>Đã mua</th><th>Đã đổi</th><th>Còn được đổi</th><th>Số lượng đổi</th></tr></thead><tbody>' + rows.map((row, index) =>
        '<tr data-return-row data-code="' + E(row.code) + '" data-size="' + E(row.size) + '"><td><label class="op-return-item"><input type="checkbox" data-return-choose' + (row.remaining <= 0 ? ' disabled' : '') + ' aria-label="Chọn đổi ' + E(row.name + ' size ' + row.size) + '"><span><strong>' + E(row.name) + '</strong><br><span class="am-muted">' + E(row.code) + ' · Size ' + E(row.size) + '</span></span></label></td><td>' + row.qty + '</td><td>' + row.returned + '</td><td>' + row.remaining + '</td><td><label class="am-field"><input class="op-return-qty" type="number" data-return-qty min="1" max="' + row.remaining + '" step="1" value="1" disabled aria-label="Số lượng đổi ' + E(row.name + ' size ' + row.size) + '"></label></td></tr>'
      ).join('') + '</tbody></table></div><p class="op-help">Giá trị đổi: theo số tiền thực trả.</p>';
  }
  function exchangeInputs(form, editor) {
    return { invoiceId: form.elements.invoiceId.value, items: [...form.querySelectorAll('[data-return-row]')].filter(row => row.querySelector('[data-return-choose]').checked).map(row => ({ code: row.dataset.code, size: row.dataset.size, qty: num(row.querySelector('[data-return-qty]').value) })), replacements: editor.read(), condition: form.elements.condition.checked ? 'resellable' : '', reason: '', method: form.elements.method.value };
  }
  function exchangeImpact(doc, saved) {
    const returned = sum(doc.items || [], row => row.qty);
    const given = sum(doc.replacements || [], row => row.qty);
    const extra = num(doc.extraPaid);
    return '<div class="op-exchange-impact" aria-label="' + (saved ? 'Cập nhật đã ghi nhận' : 'Cập nhật khi xác nhận phiếu') + '"><div><span>Hàng nhận lại</span><strong>+' + returned + ' sản phẩm</strong><small>' + (doc.condition === 'damaged' ? 'Phiếu cũ · Không cộng vào số lượng trong cửa hàng' : 'Cộng vào số lượng trong cửa hàng') + '</small></div><div><span>Hàng giao khách</span><strong>−' + given + ' sản phẩm</strong><small>Trừ số lượng hàng</small></div><div><span>Doanh thu tăng</span><strong>' + (extra > 0 ? '+' : '') + M.money(extra) + '</strong><small>' + (extra > 0 ? (saved ? 'Đã ghi nhận' : 'Chờ xác nhận') : 'Không thu thêm') + '</small></div></div>';
  }
  function openExchange() {
    const invoices = eligibleInvoices();
    if (!invoices.length) {
      M.dialog({ title: 'Chưa có hóa đơn đủ điều kiện đổi', body: '<p>Không có hóa đơn trong 30 ngày còn sản phẩm được đổi.</p>' });
      return;
    }
    if (!activeProducts().length) { M.toast('Chưa có sản phẩm đang kinh doanh để đổi hàng.'); return; }
    const requestId = uid('exchange');
    let editor;
    let quote = null;
    let quotedInput = '';
    let currentForm;
    function invalidate() {
      quote = null;
      quotedInput = '';
      if (!currentForm) return;
      const review = currentForm.querySelector('[data-exchange-review]');
      review.hidden = true;
      review.innerHTML = '';
      setSubmit(currentForm, 'Kiểm tra đổi hàng');
    }
    M.dialog({ title: 'Lập phiếu đổi hàng', wide: true, submitLabel: 'Kiểm tra đổi hàng', body:
      '<div class="am-actions op-policy-tags">' + M.badge('Trong 30 ngày', 'blue') + M.badge('Ngang giá hoặc cao hơn') + M.badge('Không hoàn tiền') + '</div>' +
      field('Hóa đơn gốc *', '<select name="invoiceId" required><option value="">Chọn hóa đơn cần đổi</option>' + invoices.map(doc => option(doc.id, doc.id + ' · ' + dateText(doc.when) + ' · ' + invoiceCustomer(doc) + ' · ' + M.money(paidTotal(doc)))).join('') + '</select>', true) +
      '<section data-return-selection>' + returnSelectionHtml(null) + '</section>' +
      '<div class="am-form-grid">' + '<label class="op-payment-check am-span-2"><input type="checkbox" name="condition" required> Hàng còn nguyên vẹn và đủ điều kiện bán lại</label><p class="op-help am-span-2">Không nhận đổi hàng lỗi.</p>' + field('Thu tiền chênh lệch bằng', '<select name="method">' + option('Tiền mặt', 'Tiền mặt') + option('Chuyển khoản', 'Chuyển khoản') + '</select>') + '</div>' +
      lineEditorHtml('exchange', 'sale', 'Sản phẩm giao thay thế') + '<section class="op-review" data-exchange-review hidden aria-live="polite"></section>',
      onOpen(form) {
        currentForm = form;
        editor = setupLines(form, 'exchange', 'sale', invalidate);
        form.elements.invoiceId.addEventListener('change', () => {
          const invoice = invoices.find(row => row.id === form.elements.invoiceId.value);
          form.querySelector('[data-return-selection]').innerHTML = returnSelectionHtml(invoice);
          invalidate();
        });
        form.addEventListener('change', event => {
          if (event.target.matches('[data-payment-input], [data-line-product-search]')) return;
          if (event.target.matches('[data-return-choose]')) {
            const input = event.target.closest('[data-return-row]').querySelector('[data-return-qty]');
            input.disabled = !event.target.checked;
            input.required = event.target.checked;
          }
          invalidate();
        });
        form.addEventListener('input', event => { if (!event.target.matches('[data-payment-input], [data-line-product-search]')) invalidate(); });
      },
      async onSubmit(form) {
        const input = exchangeInputs(form, editor);
        if (!input.items.length) throw new Error('Chọn ít nhất một sản phẩm từ hóa đơn gốc để đổi.');
        const fingerprint = JSON.stringify(input);
        if (!quote || fingerprint !== quotedInput) {
          const result = await ERP.quoteExchange(input);
          quote = result;
          quotedInput = fingerprint;
          const review = form.querySelector('[data-exchange-review]');
          review.hidden = false;
          review.innerHTML = '<h3>Đối chiếu phiếu đổi hàng</h3>' + kv('Giá trị thực trả của hàng nhận lại', M.money(result.credit)) + kv('Giá trị hàng giao khách', M.money(result.replacementTotal)) + '<div class="am-kv op-grand-total"><span>Khách cần trả thêm</span><strong>' + M.money(result.extraPaid) + '</strong></div>' + exchangeImpact(result, false) +
            paymentHtml(num(result.extraPaid), input.method);
          bindPayment(form, num(result.extraPaid));
          setSubmit(form, 'Xác nhận đổi hàng');
          review.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          return false;
        }
        const payment = readPayment(form, num(quote.extraPaid), input.method);
        const result = await ERP.saveExchange({ ...input, ...payment, requestId, expectedExtraPaid: num(quote.extraPaid) });
        await M.refresh();
        M.toast('Đã lưu phiếu ' + result.id + ' và cập nhật số lượng hàng. ' + (num(result.extraPaid) > 0 ? 'Doanh thu tăng ' + M.money(result.extraPaid) : 'Đổi ngang giá, không tăng doanh thu') + '.');
      }
    });
  }
  function returnSearchText(doc) {
    return [doc.id, doc.invoiceId, doc.reason, doc.employeeName, ...itemSearchText(doc.items), ...itemSearchText(doc.replacements)];
  }
  function returnDocs() {
    return newest((M.data.returns || []).filter(doc => Search.match(returnSearchText(doc), returnState.search)));
  }
  function returnTable(docs = returnDocs()) {
    if (!docs.length) return M.empty('Chưa có phiếu đổi hàng phù hợp');
    return '<p class="op-result-count">' + docs.length + ' phiếu đổi hàng</p><div class="am-table-wrap"><table class="am-table"><thead><tr><th>Phiếu đổi</th><th>Hóa đơn gốc</th><th>Hàng nhận / giao</th><th class="am-right">Doanh thu tăng</th><th>Hàng nhận lại</th><th></th></tr></thead><tbody>' + docs.map(doc => '<tr><td><div class="op-doc-title"><strong>' + E(doc.id) + '</strong><span class="am-muted">' + E(dateText(doc.when)) + '</span></div></td><td>' + M.invoiceLink(doc.invoiceId) + '</td><td class="op-exchange-items"><strong>+' + quantity(doc) + ' sản phẩm nhận lại</strong><small>−' + sum(doc.replacements || [], row => row.qty) + ' sản phẩm giao khách</small></td><td class="am-right"><strong>' + M.money(doc.extraPaid) + '</strong><small class="am-unit">' + (num(doc.extraPaid) > 0 ? 'Đã ghi nhận' : 'Đổi ngang giá') + '</small></td><td>' + M.badge(doc.condition === 'damaged' ? 'Phiếu cũ' : 'Đã nhập vào kho', doc.condition === 'damaged' ? 'neutral' : 'green') + '</td><td><button type="button" class="am-btn secondary small" data-op-return-detail="' + E(doc.id) + '">Chi tiết</button></td></tr>').join('') + '</tbody></table></div>';
  }
  function sourceInvoice(id) {
    return '<div class="am-kv"><span class="am-muted">Hóa đơn gốc</span>' + M.invoiceLink(id) + '</div>';
  }
  function showReturn(id) {
    const doc = (M.data.returns || []).find(row => row.id === id);
    if (!doc) return M.toast('Không tìm thấy phiếu đổi hàng này.');
    const movement = (M.data.movements || []).find(row => row.id === id && row.type === 'exchange');
    M.dialog({ title: 'Phiếu đổi hàng ' + doc.id, wide: true, body:
      '<div class="am-form-grid am-detail">' + sourceInvoice(doc.invoiceId) + kv('Ngày đổi', dateText(doc.when)) + documentPeopleHtml(movement || {...doc, type:'exchange'}) + kv('Tình trạng hàng trả', doc.condition === 'damaged' ? 'Hàng lỗi · phiếu cũ' : 'Đủ điều kiện bán lại') + '</div>' +
      '<h3>Hàng khách trả</h3>' + documentItems(doc.items, true) + '<h3>Sản phẩm giao thay thế</h3>' + documentItems(doc.replacements, false) +
      '<div class="op-review">' + kv('Giá trị thực trả của hàng nhận lại', M.money(doc.credit)) + kv('Giá trị hàng giao khách', M.money(doc.replacementTotal)) + '<div class="am-kv op-grand-total"><span>Chênh lệch đã thu</span><strong>' + M.money(doc.extraPaid) + '</strong></div>' + exchangeImpact(doc, true) + '</div>' +
      (movement ? '<button type="button" class="am-btn secondary op-print-btn" data-op-print-return>In phiếu đổi hàng</button>' : ''),
      onOpen(form) { form.querySelector('[data-op-print-return]')?.addEventListener('click', () => printInvoice(movement)); }
    });
  }
  M.showReturn = showReturn;
  M.showReturnList = function(title, docs) {
    M.dialog({title,wide:true,body:returnTable(docs),onOpen(form){
      form.querySelectorAll('[data-op-return-detail]').forEach(b=>b.onclick=()=>showReturn(b.dataset.opReturnDetail));
    }});
  };
  M.register('returns', {
    title: 'Đổi hàng', kicker: 'CHĂM SÓC SAU BÁN HÀNG',
    render() {
      const docs = M.data.returns || [];
      return styles + '<div class="op-summary">' + stat('Phiếu đổi đã xử lý', docs.length, '', 'returns') + stat('Doanh thu từ đổi hàng', M.money(sum(docs, row => row.extraPaid)), '', 'paid') + stat('Hàng đã nhận lại', sum(docs, quantity) + ' sản phẩm', '', 'items') + '</div>' +
        '<section class="am-panel"><div class="am-panel-head"><div><h2>Sổ đổi hàng</h2></div><button type="button" class="am-btn" data-op-return-new>+ Lập phiếu đổi hàng</button></div>' +
        '<div class="op-policy-bar"><div class="am-actions">' + M.badge('Trong 30 ngày', 'blue') + M.badge('Ngang giá hoặc cao hơn') + M.badge('Không hoàn tiền') + '</div></div>' +
        '<div class="am-toolbar am-filterbar"><label class="am-search">' + M.icon('search') + '<input type="search" data-op-return-search aria-label="Tìm phiếu đổi hàng" placeholder="Tìm phiếu đổi, hóa đơn, sản phẩm…" value="' + E(returnState.search) + '"></label></div><div data-op-return-table>' + returnTable() + '</div></section>';
    },
    bind(root) {
      root.querySelector('[data-op-return-search]').addEventListener('input', event => { returnState.search = event.target.value; root.querySelector('[data-op-return-table]').innerHTML = returnTable(); });
      Search.attach(root.querySelector('[data-op-return-search]'), {items: () => returnDocs().map(doc => ({
        value: doc.id, label: doc.id,
        detail: [doc.invoiceId, itemNames(doc.items), doc.replacements && doc.replacements.length ? 'Đổi sang ' + itemNames(doc.replacements) : ''].filter(Boolean).join(' · '),
        searchText: returnSearchText(doc)
      }))});
      root.addEventListener('click', event => {
        const figure=event.target.closest('[data-figure-view]');
        if(figure){
          const docs=newest(M.data.returns || []).filter(d=>figure.dataset.figureView!=='paid'||d.extraPaid>0);
          M.showReturnList(figure.querySelector('.am-stat-top').textContent,docs);
        }
        if (event.target.closest('[data-op-return-new]')) openExchange();
        const detail = event.target.closest('[data-op-return-detail]');
        if (detail) showReturn(detail.dataset.opReturnDetail);
      });
    }
  });
})();

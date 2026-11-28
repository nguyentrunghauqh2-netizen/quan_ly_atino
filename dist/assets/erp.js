/* Atino management domain. Uses the existing atomic, browser-local store. */
(() => {
  'use strict';
  const DAY = 86400000;
  function isInternalDestination(value) {
    const name = String(value ?? '').trim().normalize('NFC').toLocaleLowerCase('vi');
    return ['kho cửa hàng', 'kho hàng', 'trong kho', 'ngoài quầy', 'kho tổng', 'quầy bán', 'kho tổng atino'].includes(name);
  }
  const RETURN_CONDITIONS = 'Trong 30 ngày từ ngày mua, có hóa đơn và hàng còn đủ điều kiện bán lại. Đổi ngang giá hoặc cao hơn giá trị thực trả. Khách thanh toán phần chênh lệch. Không hoàn tiền và không nhận đổi hàng lỗi.';
  const STOCK_AGE_DAYS = 30;
  const CATEGORIES = window.AtinoCatalog?.prefixes || {'Áo phông':'AT','Áo polo':'AP','Quần âu':'QA','Quần jean':'QJ','Áo khoác':'AK'};
  const sizesFor = product => window.AtinoCatalog?.sizesFor(product) || ['S','M','L','XL','XXL'];
  const unitFor = product => window.AtinoCatalog?.unitFor(product) || 'sản phẩm';
  const fmt = new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'});
  const dateFmt = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'});
  const nowDay = (when=Date.now()) => {const p=Object.fromEntries(dateFmt.formatToParts(when).map(v=>[v.type,v.value]));return `${p.year}-${p.month}-${p.day}`;};
  const clean = (v,max=300) => String(v??'').trim().slice(0,max);
  const fail = message => {throw new Error(message);};
  const clone = x => structuredClone(x);
  function int(v,label,min=0,max=1e12) { const n=Number(v); if(!Number.isSafeInteger(n)||n<min||n>max) fail(`${label} phải là số nguyên từ ${min.toLocaleString('vi-VN')} đến ${max.toLocaleString('vi-VN')}.`);return n; }
  function dayValid(v) {if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;}
  function optionalDay(v,label) {const x=clean(v,10);if(x&&!dayValid(x))fail(`${label} không hợp lệ.`);return x;}
  function required(v,label,max=200) {const s=clean(v,max);if(!s)fail(`Vui lòng nhập ${label.toLowerCase()}.`);return s;}
  function nextId(rows,prefix,pad=3) {return prefix+String(Math.max(0,...rows.map(r=>{const m=String(r.id||r.code||'').match(new RegExp('^'+prefix+'(\\d+)$'));return m?Number(m[1]):0;}))+1).padStart(pad,'0');}
  const grossTotal = doc => (doc.items||[]).reduce((sum,l)=>sum+l.qty*l.unitPrice,0);
  const paidTotal = doc => doc.type==='exchange'
    ? Number.isSafeInteger(doc.extraPaid)&&doc.extraPaid>=0?doc.extraPaid:Number.isSafeInteger(doc.total)&&doc.total>=0?doc.total:0
    : Number.isSafeInteger(doc.total)?doc.total:Math.max(0,grossTotal(doc)-(doc.discount||0));
  function paymentMethod(doc) {
    if (doc.type === 'exchange' && paidTotal(doc) === 0) return 'Không thu thêm';
    return doc.method || (['Tiền mặt', 'Chuyển khoản'].includes(doc.note) ? doc.note : 'Chưa ghi nhận');
  }
  function transactionStatus(doc) {
    if (doc.type === 'exchange') return paidTotal(doc) > 0 ? 'Đổi bù tiền' : 'Đổi ngang giá';
    return 'Đã thanh toán';
  }
  function ensure(shop) {
    shop.customers ||= []; shop.suppliers ||= [{id:'NCC001',name:'Kho tổng — Công ty TNHH Thời Trang Minh AM',contact:'Kho tổng',phone:'',email:'',address:'Thôn Hạnh Đàn, Xã Ô Diên, Thành phố Hà Nội, Việt Nam',note:'Đầu mối nhập hàng duy nhất của cửa hàng.',active:true}];
    shop.returns ||= []; shop.stockNotes ||= {}; shop.shifts ||= []; shop.audit ||= [];
    shop.settings = {...shop.settings,returnDays:30};
    if (!shop.settings.returnConditions || shop.settings.returnConditions.includes('hàng lỗi chuyển chờ xử lý')) shop.settings.returnConditions = RETURN_CONDITIONS;
    for (const key of ['tierSilver','tierGold','tierDiamond']) delete shop.settings[key];
    for (const customer of shop.customers) {
      delete customer.tier;
      delete customer.note;
      delete customer.active;
    }
    shop.managerSchemaVersion=1;
    window.AtinoDemoSeed?.apply(shop);
  }
  function audit(shop,user,action,reference) {shop.audit.unshift({id:crypto.randomUUID(),when:Date.now(),employeeId:user.code,employeeName:user.name,action,reference});}
  async function access(change,fn,roles=['manager']) {
    if(!window.AtinoDemo?.transact) fail('Chưa mở được dữ liệu cửa hàng. Hãy đăng nhập lại.');
    return window.AtinoDemo.transact(change,(shop,user)=>{ensure(shop);return fn(shop,user);},roles);
  }
  function stockMap(shop) {
    const stock = new Map((shop.products || []).map(product => [
      product.code, new Map(sizesFor(product).map(size => [size, {total: 0}]))
    ]));
    function adjust(item, quantity) {
      if (!stock.has(item.code)) stock.set(item.code, new Map());
      const sizes = stock.get(item.code);
      const size = item.size || 'Chưa phân size';
      if (!sizes.has(size)) sizes.set(size, {total: 0});
      sizes.get(size).total += quantity;
    }
    for (const document of shop.movements || []) {
      const incoming = document.type === 'receipt' || document.type === 'restock';
      const outgoing = ['sale', 'dispatch', 'exchange'].includes(document.type);
      // Phiếu điều chuyển cũ không làm đổi tổng tồn của cửa hàng.
      if (!incoming && !outgoing) continue;
      if (document.type === 'exchange' && document.condition !== 'damaged') {
        for (const item of document.returnedItems || []) adjust(item, item.qty);
      }
      for (const item of document.items || []) {
        if (incoming) {
          adjust(item, item.qty);
          continue;
        }
        // Đọc các cột phân bổ trên chứng từ cũ để giữ đúng số tồn trước khi gộp.
        const wasSplit = Number.isFinite(item.warehouseQty) || Number.isFinite(item.counterQty);
        const removed = wasSplit ? (item.warehouseQty || 0) + (item.counterQty || 0) : item.qty;
        adjust(item, -removed);
      }
    }
    return stock;
  }
  function balances(shop) {return [...stockMap(shop)].flatMap(([code,group])=>[...group].map(([size,row])=>({code,size,total:row.total})));}
  function summarizeStock(rows) {
    const totals = {total: 0, byProduct: new Map()};
    for (const {code, size, total} of rows) {
      const product = totals.byProduct.get(code) ?? {total: 0, sizes: []};
      product.sizes.push({size, total});
      product.total += total;
      totals.byProduct.set(code, product);
      totals.total += total;
    }
    return totals;
  }
  const stockThreshold = (data, code) => data.stockNotes?.[code]?.threshold ?? 2;
  function lowStockSizes(data, product, balance) {
    if (product.active === false) return [];
    return balance.sizes.filter(size => size.size !== 'Chưa phân size' && size.total <= stockThreshold(data, product.code));
  }
  function monthlyUnitsSold(movements, now = Date.now()) {
    const monthStart = Date.parse(nowDay(now).slice(0, 7) + '-01T00:00:00+07:00');
    const totals = new Map();
    for (const doc of movements) {
      if (doc.type !== 'sale' || !Number.isFinite(doc.when) || doc.when < monthStart || doc.when > now) continue;
      for (const item of doc.items || []) {
        const qty = Number(item.qty);
        if (qty > 0 && Number.isFinite(qty)) totals.set(item.code, (totals.get(item.code) || 0) + qty);
      }
    }
    return totals;
  }
  function stockAttention(data, now = Date.now()) {
    const stock = data.stock ?? summarizeStock(data.balances);
    const dates = new Map();
    const track = (items, field, when) => {
      for (const item of items) {
        if (item.qty <= 0) continue;
        const history = dates.get(item.code) || {};
        history[field] = Math.max(history[field] ?? 0, when);
        dates.set(item.code, history);
      }
    };
    for (const doc of data.movements) {
      if (!Number.isFinite(doc.when) || doc.when > now) continue;
      if (['receipt', 'restock'].includes(doc.type)) track(doc.items || [], 'lastReceived', doc.when);
      if (doc.type === 'sale') track(doc.items || [], 'lastSold', doc.when);
      if (doc.type === 'exchange' && doc.condition !== 'damaged') track(doc.returnedItems || [], 'lastReceived', doc.when);
    }
    const warnings = [], aging = [];
    const midnight = when => Date.parse(nowDay(when) + 'T00:00:00+07:00');
    const asOf = midnight(now);
    for (const product of data.products) {
      const balance = stock.byProduct.get(product.code) || {total: 0, sizes: []};
      const threshold = stockThreshold(data, product.code);
      const lowSizes = lowStockSizes(data, product, balance);
      // Mỗi sản phẩm chỉ có một cảnh báo, ưu tiên hết hàng rồi đến hết size.
      if (product.active !== false && (lowSizes.length || balance.total <= threshold)) {
        let status = 'Sắp hết size';
        if (balance.total <= 0) status = 'Hết hàng';
        else if (lowSizes.some(size => size.total <= 0)) status = 'Hết size';
        else if (balance.total <= threshold) status = 'Sắp hết hàng';
        warnings.push({product, qty: balance.total, sizes: lowSizes, status});
      }
      const history = dates.get(product.code);
      if (balance.total <= 0 || history?.lastReceived == null) continue;
      const lastActivity = Math.max(history.lastReceived, history.lastSold ?? 0);
      const days = (asOf - midnight(lastActivity)) / DAY;
      if (days >= STOCK_AGE_DAYS) aging.push({product, qty: balance.total, ...history, days});
    }
    aging.sort((a, b) => b.days - a.days);
    const priority = {'Hết hàng': 0, 'Hết size': 1, 'Sắp hết hàng': 2, 'Sắp hết size': 3};
    warnings.sort((a, b) => priority[a.status] - priority[b.status] || a.qty - b.qty || a.product.code.localeCompare(b.product.code));
    return {warnings, aging, agingDays: STOCK_AGE_DAYS};
  }
  function spendFor(shop,id) {const docs=shop.movements.filter(d=>d.customerId===id&&['sale','exchange'].includes(d.type)),sales=docs.filter(d=>d.type==='sale');return {spend:docs.reduce((s,d)=>s+paidTotal(d),0),orderCount:sales.length,lastPurchase:Math.max(0,...sales.map(d=>d.when||0))||null};}
  function customerView(shop,c) {const facts=spendFor(shop,c.id);return {...c,...facts};}
  function publicStaff(person) {const {code,name,username,role,active,phone='',jobTitle='',baseSalary=0,payType='monthly',hourlyRate=0,startDate='',defaultShift=''}=person;return {code,name,username,role,active,phone,address:person.profile?.address||'',jobTitle,baseSalary,payType,hourlyRate,startDate,defaultShift};}
  function snap(shop,user) {return clone({user,products:shop.products.map(p=>({...p,active:p.active!==false})),balances:balances(shop),movements:shop.movements,staff:shop.staff.map(publicStaff),customers:shop.customers.map(c=>customerView(shop,c)),suppliers:shop.suppliers,returns:shop.returns,stockNotes:shop.stockNotes,shifts:shop.shifts,settings:shop.settings,audit:shop.audit});}
  const snapshot=()=>access(true,(shop,user)=>snap(shop,user));
  function retailProduct(p) {return {code:p.code,name:p.name,category:p.category,price:p.price,image:p.image||'',description:p.description||'',active:p.active!==false,sizes:sizesFor(p),labelInfo:p.labelInfo,unit:unitFor(p)};}
  const checkoutData=()=>access(true,(shop,user)=>({user,sellers:shop.staff.filter(person=>person.active!==false).map(({code,name})=>({code,name})),products:shop.products.filter(p=>p.active!==false).map(retailProduct),balances:balances(shop),customers:shop.customers.map(c=>({id:c.id,name:c.name,phone:c.phone})),suppliers:shop.suppliers.filter(s=>s.active!==false).map(s=>({id:s.id,name:s.name})),shifts:shop.shifts.filter(shift=>shift.employeeId===user.code).map(({id,date,start,end,status,fullDay})=>({id,date,start,end,status,fullDay}))}),['manager','employee']);
  function saleStaff(staff, sellerId, cashier) {
    const seller = sellerId ? staff.find(person => person.code === sellerId && person.active !== false) : cashier;
    if (!seller) fail('Nhân viên bán hàng không còn hoạt động. Hãy chọn lại.');
    return {sellerId:seller.code, sellerName:seller.name, cashierId:cashier.code, cashierName:cashier.name};
  }
  function documentPeople(doc, staff = []) {
    const name = (saved, code) => saved || staff.find(person => person.code === code)?.name || code || 'Chưa ghi nhận';
    const creator = name(doc.employeeName, doc.employeeId);
    if (doc.type !== 'sale' && doc.type !== 'exchange') return [['Người lập phiếu', creator]];
    const people = [];
    if (doc.type === 'exchange') people.push(['Người lập phiếu đổi', creator]);
    else {
      people.push(['Người bán', name(doc.sellerName, doc.sellerId)]);
      if (!doc.cashierId || doc.employeeId !== doc.cashierId) people.push(['Người lập hóa đơn', creator]);
    }
    const cashier = doc.type === 'exchange' && paidTotal(doc) === 0 ? 'Không thu thêm' : name(doc.cashierName, doc.cashierId);
    people.push(['Thu ngân', cashier]);
    return people;
  }
  function revenueEmployee(doc) {
    if (doc.type === 'sale' && doc.sellerId) return {code:doc.sellerId, name:doc.sellerName};
    return {code:doc.employeeId || '', name:doc.employeeName};
  }
  function selectCustomer(shop,id) {if(!id)return null;const c=shop.customers.find(c=>c.id===id);if(!c)fail('Không tìm thấy khách hàng.');return customerView(shop,c);}
  function uniqueRequest(shop,input,kind,user) {
    required(input.requestId,'Mã lần lưu',100);
    const old=shop.movements.find(doc=>doc.requestId===input.requestId);
    if(!old)return null;
    const signature=JSON.stringify(input);
    if(old.employeeId!==user.code || old.requestKind!==kind || (old.signature!==signature && old.currentCodeSignature!==signature)) {
      fail('Lần lưu này đã được dùng. Mở lại phiếu rồi thử lại.');
    }
    return old;
  }
  function stampDocument(doc,input,user,kind) {Object.assign(doc,{when:Date.now(),employeeId:user.code,employeeName:user.name,requestId:input.requestId,requestKind:kind,signature:JSON.stringify(input)});return doc;}
  function itemsFor(shop,lines,kind,stock=stockMap(shop)) {
    if(!Array.isArray(lines)||!lines.length||lines.length>100)fail('Thêm từ 1 đến 100 dòng sản phẩm.');
    const used=new Set();
    return lines.map(line=>{
      const p=shop.products.find(p=>p.code===line.code&&(kind==='dispatch'||p.active!==false));if(!p)fail('Sản phẩm không tồn tại hoặc đã ngừng kinh doanh.');
      const size=clean(line.size,40);const row=stock.get(p.code)?.get(size);if(!row)fail(`Chọn size hợp lệ cho ${p.name}.`);
      const key=p.code+'|'+size;if(used.has(key))fail(`${p.name} size ${size} bị trùng. Gộp số lượng vào một dòng.`);used.add(key);
      const receipt=kind==='receipt'||kind==='receiptRetail';
      if(kind==='receiptRetail'&&Object.hasOwn(line,'unitPrice'))fail('Tài khoản nhân viên chỉ nhập giá bán.');
      const qty=int(line.qty,'Số lượng',1,100000),unitPrice=kind==='receiptRetail'?null:kind==='receipt'?int(line.unitPrice,'Giá nhập',1,1e9):kind==='sale'?int(p.price,'Giá bán',1,1e9):0;
      const out={code:p.code,name:p.name,size,qty,unitPrice,lineTotal:unitPrice===null?null:qty*unitPrice};
      if(receipt)out.sellingPrice=kind==='receiptRetail'?int(line.sellingPrice,'Giá bán',1,1e9):p.price;
      if(!receipt){
        if(qty>row.total)fail(`${p.name} size ${size} chỉ còn ${row.total} ${unitFor(p)} trong cửa hàng.`);
        row.total-=qty;
      }
      return out;
    });
  }
  function allocateDiscount(items,discount) {
    const gross=items.reduce((s,i)=>s+i.lineTotal,0);let left=discount;
    const result=items.map(i=>{const part=Number(BigInt(discount)*BigInt(i.lineTotal)/BigInt(gross));left-=part;return {...i,discount:part,paidTotal:i.lineTotal-part};});
    for(let i=0;left>0;i=(i+1)%result.length){if(result[i].paidTotal>0){result[i].paidTotal--;result[i].discount++;left--;}}
    return result;
  }
  function salePaidItems(invoice) {
    const sourceItems=(invoice.items||[]).map(item=>({...item,size:item.size||'Chưa phân size',qty:int(item.qty,'Số lượng trên hóa đơn',1,100000),lineTotal:int(item.qty*item.unitPrice,'Giá trị dòng hóa đơn',0,1e14)}));
    if(!sourceItems.length)return [];
    const invoiceGross=int(sourceItems.reduce((sum,item)=>sum+item.lineTotal,0),'Giá trị hóa đơn gốc',1,1e14),invoicePaid=int(paidTotal(invoice),'Số tiền thực trả của hóa đơn',0,invoiceGross);
    const storedAllocation=sourceItems.every(item=>Number.isSafeInteger(item.paidTotal)&&item.paidTotal>=0&&item.paidTotal<=item.lineTotal)&&sourceItems.reduce((sum,item)=>sum+item.paidTotal,0)===invoicePaid;
    return storedAllocation?sourceItems:allocateDiscount(sourceItems,invoiceGross-invoicePaid);
  }
  function saleCustomer(shop,input){
    if(input.customerId)return selectCustomer(shop,input.customerId);
    const name=clean(input.buyerName,100),number=phone(input.buyerPhone);
    if(!name&&!number)return null;
    if(!name||!number)fail('Nhập đủ tên và số điện thoại của khách, hoặc để trống cả hai ô cho khách lẻ.');
    const digits=number.replace(/\D/g,'');
    const existing=shop.customers.find(c=>c.phone?.replace(/\D/g,'')===digits);
    if(existing&&existing.name.trim().normalize('NFC').toLocaleLowerCase('vi')!==name.normalize('NFC').toLocaleLowerCase('vi'))fail('Số điện thoại đã có hồ sơ với tên khác. Chọn đúng khách từ gợi ý.');
    return existing||{name,phone:number};
  }
  function birthdayReduction(movements,customer,gross,day,excludedId) {
    if (!customer?.id || customer.birthday?.slice(5)!==day.slice(5)) return 0;
    let used=0;
    for (const doc of movements) {
      if (doc.birthdayPricing && doc.type==='sale' && doc.customerId===customer.id &&
          doc.id!==excludedId && nowDay(doc.when)===day) used+=doc.discount||0;
    }
    return Math.min(Math.round(gross/10),Math.max(0,200000-used));
  }
  function quote(shop,input) {
    const items = itemsFor(shop, input.lines, 'sale').map(item => ({...item, paidTotal: item.lineTotal}));
    const total = int(items.reduce((sum, item) => sum + item.lineTotal, 0), 'Tổng tiền', 0, 1e14);
    const customer = saleCustomer(shop,input);
    const discount=birthdayReduction(shop.movements,customer,total,nowDay());
    return {items:discount?allocateDiscount(items,discount):items, gross:total,total:total-discount,discount,birthdayPricing:true, customerId: customer?.id || '', customerName: customer?.name || 'Khách lẻ'};
  }
  const quoteSale=input=>access(false,shop=>clone(quote(shop,input)),['manager','employee']);
  function payment(input,total) {
    const method=input.method;if(!['Tiền mặt','Chuyển khoản'].includes(method))fail('Chọn phương thức thanh toán.');
    const data={method,paymentStatus:'confirmed'};
    if(method==='Tiền mặt'){
      if(input.cashReceived==null||input.cashReceived==='')fail('Nhập số tiền khách đưa.');
      data.cashReceived=int(input.cashReceived,'Tiền khách đưa',0,1e14);
      if(data.cashReceived<total)fail('Tiền khách đưa chưa đủ thanh toán.');
      data.change=data.cashReceived-total;
    }
    if(method==='Chuyển khoản'&&total>0&&input.transferConfirmed!==true)fail('Xác nhận đã nhận chuyển khoản trước khi lưu.');
    return data;
  }
  const saveSale=input=>access(true,(shop,user)=>{
    const old=uniqueRequest(shop,input,'sale',user);if(old)return {id:old.id,total:paidTotal(old)};
    const q=quote(shop,input);if(q.total!==input.expectedTotal)fail('Tổng tiền vừa thay đổi. Hãy tính lại đơn.');
    const pay=payment(input,q.total),doc=stampDocument({id:nextId(shop.movements,'HD',4),type:'sale',note:pay.method,...q,...pay,...saleStaff(shop.staff,input.sellerId,user)},input,user,'sale');
    if(!doc.customerId && input.buyerName?.trim()){
      const row={id:nextId(shop.customers,'KH'),name:q.customerName,phone:phone(input.buyerPhone),createdAt:Date.now()};
      shop.customers.push(row);
      doc.customerId=row.id;
    }
    shop.movements.push(doc);
    audit(shop,user,'Lập hóa đơn',doc.id);return {id:doc.id,total:q.total};
  },['manager','employee']);
  function linkedExchangeIds(data, invoiceId) {
    const ids = new Set();
    for (const row of data.returns) if (row.invoiceId === invoiceId) ids.add(row.id);
    for (const row of data.movements) if (row.exchangeOf === invoiceId) ids.add(row.id);
    return [...ids];
  }
  const lineSize = item => item.size || 'Chưa phân size';
  const sameLine = (a,b) => a.code === b.code && lineSize(a) === lineSize(b);
  const paidShare = (amount,part,total) => Number(BigInt(amount)*BigInt(part)/BigInt(total));
  function previouslyReturned(shop, invoiceId) {
    const recorded = new Map();
    for (const row of shop.returns) {
      if (row.invoiceId === invoiceId) recorded.set(row.id, row.items || []);
    }
    for (const doc of shop.movements) {
      if (doc.exchangeOf === invoiceId && !recorded.get(doc.id)?.length) {
        recorded.set(doc.id, doc.returnedItems || []);
      }
    }
    return [...recorded.values()].flat();
  }
  function returnedCredit(rows,item,qty) {
    return rows.every(row => Number.isSafeInteger(row.paidTotal) && row.paidTotal >= 0)
      ? rows.reduce((sum,row) => sum + row.paidTotal,0)
      : paidShare(item.paidTotal,qty,item.qty);
  }
  function checkEditedReturns(previous,original,items) {
    const groups = new Map();
    for (const item of previous) {
      const key = JSON.stringify([item.code,lineSize(item)]);
      if (!groups.has(key)) groups.set(key,[]);
      groups.get(key).push(item);
    }
    for (const returned of groups.values()) {
      const item = returned[0];
      const updated = items.find(row => sameLine(row,item));
      const qty = returned.reduce((sum,row) => sum + row.qty,0);
      const label = item.code + ' · ' + lineSize(item);
      if (!updated || updated.qty < qty) fail(label + ' đã đổi ' + qty + ' sản phẩm. Số lượng trên hóa đơn phải từ ' + qty + ' trở lên.');
      const old = original.find(row => sameLine(row,item));
      const credited = returnedCredit(returned,old || updated,qty);
      if (paidShare(updated.paidTotal,qty,updated.qty) < credited) {
        fail(label + ' có giá trị thực trả thấp hơn số tiền đã dùng để đổi hàng.');
      }
    }
  }
  const editSale = input => access(true, (shop,user) => {
    const doc = shop.movements.find(row => row.type === 'sale' && row.id === input.id);
    if (!doc) fail('Không tìm thấy hóa đơn bán.');
    if ((doc.editRevision || 0) !== input.revision) fail('Hóa đơn vừa thay đổi. Mở lại để sửa.');
    const stock = stockMap({...shop,movements:shop.movements.filter(row => row !== doc)});
    const oldPrices = new Map(doc.items.map(row => [row.code,row.unitPrice]));
    const items = itemsFor(shop,input.lines,'sale',stock);
    for (const item of items) {
      const oldLine = doc.items.find(row => sameLine(row,item));
      item.unitPrice = oldLine?.unitPrice ?? oldPrices.get(item.code) ?? item.unitPrice;
      item.lineTotal = item.qty * item.unitPrice;
    }
    const gross = int(items.reduce((sum,item)=>sum+item.lineTotal,0),'Tổng tiền',1,1e14);
    const customer = selectCustomer(shop,input.customerId);
    const discount = doc.birthdayPricing ? birthdayReduction(shop.movements,customer,gross,nowDay(doc.when),doc.id) : Math.max(0,grossTotal(doc)-paidTotal(doc));
    if (discount > gross) fail('Giá trị mới thấp hơn khoản giảm đã ghi trên hóa đơn cũ.');
    const total = gross - discount;
    if(total !== input.expectedTotal) fail('Giá đã thay đổi. Mở lại hóa đơn để kiểm tra.');
    const original = salePaidItems(doc);
    const unchanged = total === paidTotal(doc) && items.length === original.length &&
      items.every(item => original.some(row => sameLine(row,item) && row.qty === item.qty && row.unitPrice === item.unitPrice));
    const paidItems = unchanged ? original : allocateDiscount(items,discount);
    checkEditedReturns(previouslyReturned(shop,doc.id),original,paidItems);
    const pay = payment(input,total);
    const seller = saleStaff(shop.staff,input.sellerId,user);
    const describe = d => [d.customerName,d.sellerName||d.employeeName,d.method,d.total,d.cashReceived,d.items.map(i=>i.code+' '+i.size+' × '+i.qty).join(', ')].join(' · ');
    const before = describe(doc);
    delete doc.cashReceived;
    delete doc.change;
    Object.assign(doc,pay,{items:paidItems,gross,total,discount,note:pay.method,
      customerId:customer?.id||'',customerName:customer?.name||'Khách lẻ',
      sellerId:seller.sellerId,sellerName:seller.sellerName,editRevision:input.revision+1});
    audit(shop,user,'Sửa hóa đơn bán',doc.id);
    shop.audit[0].detail = before+' → '+describe(doc);
    return {id:doc.id,total};
  });
  const saveProduct=input=>access(true,(shop,user)=>{
    const name=required(input.name,'Tên sản phẩm',120),category=required(input.category,'Loại sản phẩm',60),price=int(input.price,'Giá bán',1,1e9);
    if(!CATEGORIES[category])fail('Chọn loại sản phẩm trong danh mục.');let p;
    if(input.code){p=shop.products.find(p=>p.code===input.code);if(!p)fail('Không tìm thấy sản phẩm.');}
    else {p={code:nextId(shop.products,CATEGORIES[category])};shop.products.push(p);}
    const chosenSizes=input.sizes===undefined?(p.sizes||sizesFor(input.code?p:category)):input.sizes;
    if(!Array.isArray(chosenSizes)||!chosenSizes.length||chosenSizes.length>30)fail('Nhập từ 1 đến 30 kích cỡ cho sản phẩm.');
    const validatedSizes=[...new Set(chosenSizes.map(s=>required(s,'Kích cỡ',40)))];
    if (Object.hasOwn(input, 'image')) {
      if (input.image !== '' && (!window.AtinoImages.isDataImage(input.image) || input.image.length > 360000)) {
        fail('Ảnh sản phẩm chưa hợp lệ hoặc vượt quá dung lượng cho phép.');
      }
      p.image = input.image;
    }
    if (input.labelInfo) {
      const info = {};
      for (const [key,,limit] of window.AtinoLabels.fields) {
        const value = clean(input.labelInfo[key],limit);
        if (value) info[key] = value;
      }
      if (info.year && !/^\d{4}$/.test(info.year)) fail('Năm sản xuất phải có bốn chữ số.');
      p.labelInfo = info;
    }
    Object.assign(p,{name,category,price,sizes:validatedSizes,unit:unitFor({category,unit:input.unit||p.unit}),description:clean(input.description,1000),active:input.active!==false});
    const source=input.source||input.sourceUrl;if(source){try{const url=new URL(source);if(url.protocol!=='https:')fail('Nguồn tham khảo phải dùng HTTPS.');p.source=url.href;p.checkedOn=optionalDay(input.checkedOn||input.sourceCheckedAt||'','Ngày đối chiếu');}catch{fail('Đường dẫn nguồn tham khảo chưa hợp lệ.');}}
    audit(shop,user,'Cập nhật sản phẩm',p.code);return p.code;
  });
  const saveStockNote=(code,input)=>access(true,(shop,user)=>{
    if(!shop.products.some(p=>p.code===code))fail('Không tìm thấy sản phẩm.');shop.stockNotes[code]={reason:clean(input.reason,150),note:clean(input.note,1000),action:clean(input.action,300),threshold:int(input.threshold??2,'Ngưỡng sắp hết',0,100000),updatedAt:Date.now(),updatedBy:user.name};audit(shop,user,'Đánh giá hàng hóa',code);return {code};
  });
  function phone(v) {const p=clean(v,30).replace(/[\s.-]/g,'');if(p&&!/^0\d{9}$/.test(p))fail('Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.');return p;}
  function email(v) {const e=clean(v,150);if(e&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))fail('Địa chỉ email chưa hợp lệ.');return e;}
  const saveSupplier=input=>access(true,(shop,user)=>{
    if(input.id!=='NCC001')fail('Cửa hàng chỉ quản lý nhà cung cấp kho tổng.');
    const row=shop.suppliers.find(entry=>entry.id==='NCC001');
    if(!row)fail('Chưa có thông tin kho tổng.');
    Object.assign(row,{name:'Kho tổng — Công ty TNHH Thời Trang Minh AM',phone:phone(input.phone),email:email(input.email),active:true});
    audit(shop,user,'Cập nhật thông tin kho tổng',row.id);
    return {id:row.id};
  });
  const saveCustomer=input=>access(true,(shop,user)=>{
    let row=input.id?shop.customers.find(r=>r.id===input.id):null;if(input.id&&!row)fail('Không tìm thấy khách hàng.');
    const b=optionalDay(input.birthday,'Ngày sinh');if(b&&(b>nowDay()||b<'1900-01-01'))fail('Ngày sinh cần từ năm 1900 đến hôm nay.');const p=phone(input.phone),normalized=p.replace(/\D/g,'');
    if(normalized&&shop.customers.some(c=>c.id!==input.id&&c.phone?.replace(/\D/g,'')===normalized))fail('Số điện thoại đã thuộc một khách hàng khác.');
    const fields={name:required(input.name,'Họ tên',100),phone:p,birthday:b,email:email(input.email),address:clean(input.address,300)};
    if(!row){row={id:nextId(shop.customers,'KH'),createdAt:Date.now()};shop.customers.push(row);}Object.assign(row,fields);audit(shop,user,'Cập nhật khách hàng',row.id);return {id:row.id};
  });
  function employeeFields(input, person = {}) {
    const fields = {phone:phone(input.phone),jobTitle:clean(input.jobTitle,100),baseSalary:int(input.baseSalary||0,'Lương cơ bản',0,1e9),payType:['monthly','hourly'].includes(input.payType)?input.payType:'monthly',hourlyRate:int(input.hourlyRate||0,'Lương theo giờ',0,1e7),startDate:optionalDay(input.startDate,'Ngày vào làm'),defaultShift:clean(input.defaultShift,120)};
    // Dùng chung địa chỉ với hồ sơ tài khoản, giữ lại các thông tin khác đã lưu.
    if (Object.hasOwn(input, 'address')) fields.profile = {...person.profile, address:clean(input.address,300)};
    return fields;
  }
  async function saveEmployee(input) {
    const fields=employeeFields(input);const path=input.code?'staff/'+input.code:'staff';
    const result=await window.AtinoDemo.api(path,{method:input.code?'PATCH':'POST',body:JSON.stringify({...input,...fields})});return {code:result.code};
  }
  const workSlots=[
    {key:'morning',name:'Ca sáng',start:'08:00',end:'14:00'},
    {key:'afternoon',name:'Ca chiều',start:'14:00',end:'20:00'}
  ];
  function matchesSlot(shift,slot){
    return shift.fullDay || (shift.start<'14:00' ? 'morning':'afternoon')===slot.key;
  }
  const updateWorkDay=input=>access(true,(shop,user)=>{
    const date=optionalDay(input.date,'Ngày làm việc');
    if(!date)fail('Chọn ngày làm việc.');
    for(const change of input.changes){
      const person=shop.staff.find(p=>p.code===change.code);
      if(!person || (change.working && person.active===false))fail('Kiểm tra lại nhân viên đã chọn.');
      const matches=s=>s.date===date && s.employeeId===person.code;
      const slot=workSlots.find(s=>s.key===change.slot);
      if(!slot)fail('Chọn ca sáng hoặc ca chiều.');
      for(const row of shop.shifts.filter(s=>matches(s)&&s.fullDay)){
        Object.assign(row,{fullDay:false,start:workSlots[0].start,end:workSlots[0].end});
        shop.shifts.push({...row,id:nextId(shop.shifts,'CA',4),start:workSlots[1].start,end:workSlots[1].end});
      }
      const inSlot=s=>matches(s)&&matchesSlot(s,slot);
      if(change.working && !shop.shifts.some(inSlot)){
        shop.shifts.push({id:nextId(shop.shifts,'CA',4),employeeId:person.code,date,status:'planned',start:slot.start,end:slot.end});
      }else if(!change.working){
        shop.shifts=shop.shifts.filter(s=>!inSlot(s));
      }
    }
    audit(shop,user,'Cập nhật ngày làm việc',date);
  });
  const saveShift=input=>access(true,(shop,user)=>{
    const existing=input.id?shop.shifts.find(s=>s.id===input.id):null;const staff=shop.staff.find(p=>p.code===input.employeeId&&(p.active||existing?.employeeId===p.code));if(!staff)fail('Chọn nhân viên đang hoạt động.');
    const day=optionalDay(input.date,'Ngày làm việc');if(!day)fail('Chọn ngày làm việc.');
    const start=clean(input.start,5),end=clean(input.end,5);if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(end)||end<=start)fail('Giờ kết thúc phải sau giờ bắt đầu trong cùng ngày.');
    const status=input.status==='completed'?'completed':'planned';if(status==='completed'&&day>nowDay())fail('Không thể xác nhận ca làm ở ngày tương lai.');
    if(shop.shifts.some(s=>s.id!==input.id&&s.employeeId===staff.code&&s.date===day&&s.start<end&&s.end>start))fail('Ca làm bị trùng thời gian với ca khác của nhân viên này.');
    let row=input.id?shop.shifts.find(s=>s.id===input.id):null;if(input.id&&!row)fail('Ca làm không tồn tại.');if(!row){row={id:nextId(shop.shifts,'CA',4)};shop.shifts.push(row);}
    Object.assign(row,{employeeId:staff.code,date:day,start,end,status,note:clean(input.note,500)});audit(shop,user,'Cập nhật ca làm',row.id);return {id:row.id};
  });
  const deleteShift=id=>access(true,(shop,user)=>{const i=shop.shifts.findIndex(s=>s.id===id);if(i<0)fail('Không tìm thấy ca làm.');shop.shifts.splice(i,1);audit(shop,user,'Xóa ca làm',id);return {id};});
  const saveSettings=input=>access(true,(shop,user)=>{
    shop.settings={...shop.settings,returnDays:30,returnConditions:required(input.returnConditions??shop.settings.returnConditions,'Điều kiện đổi hàng',2000)};audit(shop,user,'Cập nhật chính sách','POLICY');return clone(shop.settings);
  });
  function receiptSupplier(shop, id) {
    const supplier = shop.suppliers.find(row => row.id === id && row.active);
    if (!supplier) fail('Chọn nhà cung cấp đang hoạt động.');
    return supplier;
  }
  const previewReceipt = input => access(false, shop => {
    const supplier = receiptSupplier(shop, input.supplierId);
    const items = itemsFor(shop, input.lines, 'receipt');
    return {supplierName: supplier.name, items, total: items.reduce((sum, row) => sum + row.lineTotal, 0)};
  });
  function dispatchDestination(shop) {
    const destination=receiptSupplier(shop,'NCC001').name;
    if (isInternalDestination(destination)) fail('Chọn nơi nhận hàng xuất khác với kho cửa hàng.');
    return destination;
  }
  const previewDispatch = input => access(false, shop => {
    const destination=dispatchDestination(shop);
    const items=itemsFor(shop,input.lines,'dispatch');
    return {destination,items};
  },['manager','employee']);
  const saveStockDocument=input=>access(true,(shop,user)=>{
    if(!['receipt','dispatch'].includes(input.type))fail('Chọn phiếu nhập hoặc phiếu xuất kho.');
    const old=uniqueRequest(shop,input,'stock',user);if(old)return {id:old.id};
    const supplier=input.type==='receipt'?receiptSupplier(shop,input.supplierId):null;
    const destination=input.type==='dispatch'?dispatchDestination(shop):'',reason='';
    const receipt=input.type==='receipt',employeeReceipt=receipt&&user.role==='employee';
    const items=itemsFor(shop,input.lines,receipt?(employeeReceipt?'receiptRetail':'receipt'):'dispatch');
    if(employeeReceipt){
      const prices=new Map();for(const item of items){if(prices.has(item.code)&&prices.get(item.code)!==item.sellingPrice)fail('Các size của cùng một sản phẩm cần có cùng giá bán.');prices.set(item.code,item.sellingPrice);}
      for(const [code,price] of prices){const p=shop.products.find(row=>row.code===code);if(p.price!==price){p.price=price;audit(shop,user,'Cập nhật giá bán khi nhập hàng',code);}}
    }
    const doc=stampDocument({id:nextId(shop.movements,receipt?'PN':'XK',4),type:input.type,note:clean(input.note,1000)||supplier?.name||'',items,supplierId:supplier?.id||'',supplierName:supplier?.name||'',destination,reason,total:employeeReceipt?null:receipt?int(items.reduce((s,i)=>s+i.qty*i.unitPrice,0),'Giá trị phiếu nhập',0,1e14):0,...(receipt?{costStatus:employeeReceipt?'pending':'complete'}:{})},input,user,'stock');
    shop.movements.push(doc);audit(shop,user,input.type==='receipt'?'Nhập kho':'Xuất kho',doc.id);return {id:doc.id};
  },['manager','employee']);
  const hasReceiptCost = item => Number.isSafeInteger(item.unitPrice)&&item.unitPrice>0;
  const completeReceiptCost=input=>access(true,(shop,user)=>{
    const doc=shop.movements.find(row=>row.id===input.id&&row.type==='receipt');if(!doc)fail('Không tìm thấy phiếu nhập.');
    if(!Array.isArray(input.lines)||input.lines.length!==doc.items.length)fail('Bổ sung giá nhập cho đủ các dòng trong phiếu.');
    const values=new Map();for(const line of input.lines){const key=String(line.code)+'|'+String(line.size||'');if(values.has(key))fail('Dòng giá nhập bị trùng.');values.set(key,int(line.unitPrice,'Giá nhập',1,1e9));}
    const prices=doc.items.map(item=>{const value=values.get(item.code+'|'+String(item.size||''));if(value===undefined)fail('Sản phẩm hoặc kích cỡ không khớp phiếu nhập.');return value;});
    if(doc.costStatus!=='pending'&&doc.items.every(hasReceiptCost)){
      if(doc.items.every((item,i)=>item.unitPrice===prices[i]))return {id:doc.id};
      fail('Phiếu đã có giá nhập. Không ghi đè giá nhập đã xác nhận.');
    }
    const total=int(doc.items.reduce((sum,item,i)=>sum+item.qty*prices[i],0),'Giá trị phiếu nhập',0,1e14);
    doc.items.forEach((item,i)=>{item.unitPrice=prices[i];item.lineTotal=item.qty*prices[i];});
    Object.assign(doc,{total,costStatus:'complete',costedAt:Date.now(),costedBy:user.code,costedByName:user.name});
    audit(shop,user,'Bổ sung giá nhập',doc.id);return {id:doc.id};
  });
  function exchangeQuote(shop,input) {
    if(input.condition!=='resellable'||input.condition_ok===false)fail('Chỉ nhận đổi hàng còn nguyên vẹn và đủ điều kiện bán lại.');
    const invoice=shop.movements.find(d=>d.id===input.invoiceId&&d.type==='sale');if(!invoice)fail('Chọn hóa đơn gốc hợp lệ.');
    if(!Number.isFinite(invoice.when))fail('Hóa đơn đã quá thời hạn đổi 30 ngày hoặc chưa có ngày mua hợp lệ.');
    const age=(Date.parse(nowDay()+'T00:00:00Z')-Date.parse(nowDay(invoice.when)+'T00:00:00Z'))/DAY;if(age<0||age>30)fail('Hóa đơn đã quá thời hạn đổi 30 ngày hoặc chưa có ngày mua hợp lệ.');
    const condition=input.condition;
    if(!Array.isArray(input.items)||!input.items.length||input.items.length>100)fail('Chọn từ 1 đến 100 dòng sản phẩm khách muốn đổi.');
    if(!Array.isArray(invoice.items)||!invoice.items.length)fail('Hóa đơn gốc chưa có chi tiết hàng hợp lệ.');
    const original=salePaidItems(invoice), previousItems=previouslyReturned(shop,invoice.id);
    const stock=stockMap(shop),usedKeys=new Set();
    // Cumulative integer shares keep a split return's total exactly equal to
    // what was paid, including the final dong of a discounted invoice line.
    let credit=0;
    const returned=input.items.map(line=>{
      const size=clean(line.size,40),key=line.code+'|'+size;if(usedKeys.has(key))fail('Sản phẩm nhận lại bị trùng dòng.');usedKeys.add(key);
      const item=original.find(i=>i.code===line.code&&i.size===size);if(!item)fail('Sản phẩm nhận lại không thuộc hóa đơn gốc.');
      const previous=previousItems.filter(i=>sameLine(i,item));
      const used=previous.reduce((sum,row)=>sum+row.qty,0);
      const qty=int(line.qty,'Số lượng đổi',1,100000);if(qty>item.qty-used)fail(`${item.name} size ${item.size} chỉ còn ${item.qty-used} sản phẩm được đổi.`);
      const credited=returnedCredit(previous,item,used);
      if(credited>item.paidTotal)fail('Giá trị đã đổi vượt số tiền thực trả của dòng hóa đơn. Cần kiểm tra lại chứng từ cũ.');
      const amount=Math.max(0,paidShare(item.paidTotal,used+qty,item.qty)-credited);credit+=amount;
      stock.get(item.code).get(item.size).total+=qty;
      return {code:item.code,name:item.name,size:item.size,qty,unitPrice:item.unitPrice,paidTotal:amount};
    });
    const replacements=itemsFor(shop,input.replacements,'sale',stock),replacementTotal=replacements.reduce((s,i)=>s+i.lineTotal,0);
    if(replacementTotal<credit)fail(`Hàng đổi mới phải có giá trị ít nhất ${fmt.format(credit)}. Chính sách không hoàn tiền.`);
    return {invoiceId:invoice.id,customerId:invoice.customerId||'',customerName:invoice.customerName||'Khách lẻ',credit,replacementTotal,extraPaid:replacementTotal-credit,items:returned,replacements,condition,reason:''};
  }
  const quoteExchange=input=>access(false,shop=>clone(exchangeQuote(shop,input)));
  const saveExchange=input=>access(true,(shop,user)=>{
    const old=uniqueRequest(shop,input,'exchange',user);if(old)return {id:old.id,extraPaid:paidTotal(old)};
    const q=exchangeQuote(shop,input);if(q.extraPaid!==input.expectedExtraPaid)fail('Chênh lệch đã thay đổi. Tính lại phiếu đổi hàng.');
    const pay=payment(input,q.extraPaid),id=nextId([...shop.returns,...shop.movements.filter(doc=>doc.type==='exchange')],'DT',4),when=Date.now();
    const doc=stampDocument({id,type:'exchange',exchangeOf:q.invoiceId,cashierId:user.code,cashierName:user.name,items:q.replacements,returnedItems:q.items,credit:q.credit,gross:q.replacementTotal,discount:0,total:q.extraPaid,extraPaid:q.extraPaid,note:q.reason,reason:q.reason,condition:q.condition,customerId:q.customerId,customerName:q.customerName,...pay},input,user,'exchange');
    shop.movements.push(doc);shop.returns.push({id,invoiceId:q.invoiceId,when,reason:q.reason,condition:q.condition,items:q.items,replacements:q.replacements,credit:q.credit,replacementTotal:q.replacementTotal,extraPaid:q.extraPaid,employeeId:user.code,employeeName:user.name,method:pay.method});audit(shop,user,'Xử lý đổi hàng',id);return {id,extraPaid:q.extraPaid};
  });
  function metrics(data,period='month',value=nowDay().slice(0,7)) {
    const length=period==='day'?10:period==='month'?7:4,key=String(value||nowDay()).slice(0,length);
    const docs=data.movements.filter(d=>Number.isFinite(d.when)&&nowDay(d.when).startsWith(key));
    const transactions=docs.filter(d=>['sale','exchange'].includes(d.type)).sort((a,b)=>b.when-a.when),sales=transactions.filter(d=>d.type==='sale');
    let buckets=[];if(period==='day')buckets=Array.from({length:24},(_,i)=>({label:String(i).padStart(2,'0')+'h',value:0}));
    else if(period==='year')buckets=Array.from({length:12},(_,i)=>({label:'T'+(i+1),value:0}));
    else {const [y,m]=key.split('-').map(Number),n=new Date(Date.UTC(y||2026,m||1,0)).getUTCDate();buckets=Array.from({length:n},(_,i)=>({label:String(i+1),value:0}));}
    const top = new Map(), employees = new Map();
    const staffNames = new Map((data.staff || []).map(person => [person.code, person.name]));
    const soldItems = [], exchanges = [];
    let unitsSold = 0, exchangePaid = 0, cash = 0, bank = 0;
    for(const d of transactions) {
      const paid = paidTotal(d), method = paymentMethod(d);
      if (method === 'Tiền mặt') cash += paid;
      if (method === 'Chuyển khoản') bank += paid;
      const dt=nowDay(d.when);const n=period==='year'?Number(dt.slice(5,7))-1:period==='month'?Number(dt.slice(8,10))-1:Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',hourCycle:'h23'}).format(d.when));if(buckets[n])buckets[n].value+=paid;
      const owner = revenueEmployee(d);
      const employeeId = owner.code;
      const employeeKey = employeeId || owner.name || '';
      const employee = employees.get(employeeKey) || {
        code: employeeId, name: staffNames.get(employeeId) || owner.name || 'Chưa ghi nhận',
        sales: 0, exchanges: 0, revenue: 0
      };
      employee.revenue += paid;
      employees.set(employeeKey, employee);
      if (d.type === 'exchange') {
        employee.exchanges++;
        exchanges.push(d);
        exchangePaid += paid;
        continue;
      }
      employee.sales++;
      for(const item of salePaidItems(d)) {
        const product=top.get(item.code)||{code:item.code,name:item.name,qty:0,revenue:0};
        product.qty+=item.qty;
        product.revenue+=item.paidTotal;
        unitsSold+=item.qty;
        top.set(item.code,product);
        soldItems.push({invoiceId: d.id, when: d.when, code: item.code, name: item.name, size: item.size, qty: item.qty, paidTotal: item.paidTotal});
      }
    }
    const productTotals=new Map(data.products.map(p=>[p.code,0]));for(const r of data.balances)productTotals.set(r.code,(productTotals.get(r.code)||0)+r.total);
    const cost=new Map(),unknownCost=new Set();let pendingReceiptCount=0,uncostedReceiptUnits=0;
    for(const d of data.movements.filter(d=>d.type==='receipt')){
      let incomplete=d.costStatus==='pending';
      for(const i of d.items){if(!hasReceiptCost(i)){unknownCost.add(i.code);uncostedReceiptUnits+=i.qty;incomplete=true;continue;}const c=cost.get(i.code)||{q:0,v:0};c.q+=i.qty;c.v+=i.qty*i.unitPrice;cost.set(i.code,c);}
      if(incomplete)pendingReceiptCount++;
    }
    const unknownCostUnits=[...productTotals].reduce((sum,[code,qty])=>sum+(qty>0&&(unknownCost.has(code)||!cost.has(code))?qty:0),0);
    const stockValue=unknownCostUnits?null:Math.round([...productTotals].reduce((sum,[code,qty])=>sum+qty*(cost.get(code)?.v||0)/(cost.get(code)?.q||1),0));
    const activeCodes=new Set(data.products.filter(p=>p.active!==false).map(p=>p.code));
    const sumType=t=>docs.filter(d=>d.type===t).flatMap(d=>d.items).reduce((s,i)=>s+i.qty,0);
    return {
      revenue: transactions.reduce((sum, doc) => sum + paidTotal(doc), 0),
      orderCount: sales.length, exchangeCount: exchanges.length, exchangePaid, unitsSold,
      totalStock: data.balances.reduce((sum, row) => sum + row.total, 0),
      productCount: activeCodes.size,
      lowCount: data.balances.filter(row => activeCodes.has(row.code) && row.size !== 'Chưa phân size' && row.total <= stockThreshold(data, row.code)).length,
      cash, bank, buckets, transactions, soldItems, exchanges,
      topProducts: [...top.values()].sort((a, b) => b.qty - a.qty),
      employeeRevenue: [...employees.values()].sort((a, b) => b.revenue - a.revenue),
      totalReceived: sumType('receipt'), totalDispatched: sumType('dispatch'),
      stockValue, unknownCostUnits, pendingReceiptCount, uncostedReceiptUnits
    };
  }
  window.AtinoERP={workSlots,matchesSlot,updateWorkDay,birthdayReduction,linkedExchangeIds,editSale,documentPeople,saleStaff,revenueEmployee,snapshot,checkoutData,categories:window.AtinoCatalog?.categories||Object.keys(CATEGORIES),sizesFor,unitFor,references:window.AtinoCatalog?.references||[],today:nowDay,money:n=>fmt.format(n||0),inventory:stockMap,summarizeStock,monthlyUnitsSold,stockThreshold,lowStockSizes,stockAttention,isInternalDestination,metrics,documentPaidTotal:paidTotal,paymentMethod,transactionStatus,salePaidItems,saveProduct,saveStockNote,saveSupplier,saveCustomer,saveEmployee,saveShift,deleteShift,saveSettings,saveStockDocument,previewReceipt,previewDispatch,completeReceiptCost,quoteSale,saveSale,quoteExchange,saveExchange,employeeFields};
})();

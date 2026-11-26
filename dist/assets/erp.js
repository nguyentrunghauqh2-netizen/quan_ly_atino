/* Atino management domain. Uses the existing atomic, browser-local store. */
(() => {
  'use strict';
  const DAY = 86400000;
  const TIERS = ['Đồng','Bạc','Vàng','Kim cương'];
  const FIXED_CUSTOMER_POLICY = Object.freeze({tierSilver:2000000,tierGold:5000000,tierDiamond:10000000,birthdayEnabled:true,birthdayPercent:10,birthdayMax:100000,birthdayMin:0});
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
  function ensure(shop) {
    shop.customers ||= []; shop.suppliers ||= [{id:'NCC001',name:'Kho tổng Atino',contact:'',phone:'',email:'',address:'',note:'Đầu mối kho tổng theo khảo sát cửa hàng.',active:true}];
    shop.vouchers ||= []; shop.returns ||= []; shop.stockNotes ||= {}; shop.shifts ||= []; shop.audit ||= [];
    shop.settings = {returnConditions:'Trong 30 ngày từ ngày mua; có hóa đơn; kiểm tra tình trạng sản phẩm. Chỉ đổi ngang hoặc cao hơn giá trị thực trả, khách thanh toán phần chênh lệch. Không hoàn tiền. Hàng đạt kiểm tra được nhập lại; hàng lỗi chuyển chờ xử lý.',...shop.settings,...FIXED_CUSTOMER_POLICY,returnDays:30};
    shop.managerSchemaVersion=1;
    window.AtinoDemoSeed?.apply(shop);
  }
  function audit(shop,user,action,reference) {shop.audit.unshift({id:crypto.randomUUID(),when:Date.now(),employeeId:user.code,employeeName:user.name,action,reference});}
  async function access(change,fn,roles=['manager']) {
    if(!window.AtinoDemo?.transact) fail('Chưa mở được dữ liệu cửa hàng. Hãy đăng nhập lại.');
    return window.AtinoDemo.transact(change,(shop,user)=>{ensure(shop);return fn(shop,user);},roles);
  }
  function stockMap(shop) {
    const stock=new Map((shop.products||[]).map(p=>[p.code,new Map(sizesFor(p).map(s=>[s,{warehouse:0,counter:0,held:0}]))]));
    const rowFor=(item)=>{if(!stock.has(item.code))stock.set(item.code,new Map());const group=stock.get(item.code),s=item.size||'Chưa phân size';if(!group.has(s))group.set(s,{warehouse:0,counter:0,held:0});return group.get(s);};
    for(const doc of shop.movements||[]) {
      if(doc.type==='exchange') for(const item of doc.returnedItems||[]) {const r=rowFor(item);if(doc.condition==='damaged')r.held+=item.qty;else r.warehouse+=item.qty;}
      for(const item of doc.items||[]) {
        const row=rowFor(item);
        if(doc.type==='receipt') row[item.size?'warehouse':'counter']+=item.qty;
        else if(doc.type==='transfer') {const q=doc.direction==='toWarehouse'?-item.qty:item.qty;row.warehouse-=q;row.counter+=q;}
        else if(doc.type==='sale'||doc.type==='dispatch'||doc.type==='exchange') {
          if(Number.isFinite(item.warehouseQty)||Number.isFinite(item.counterQty)){row.warehouse-=item.warehouseQty||0;row.counter-=item.counterQty||0;}
          else row.counter-=item.qty;
        }
        else if(doc.type==='restock')row.warehouse+=item.qty;
      }
    }
    return stock;
  }
  function balances(shop) {return [...stockMap(shop)].flatMap(([code,group])=>[...group].map(([size,r])=>({code,size,...r,total:r.warehouse+r.counter})));}
  function spendFor(shop,id) {const docs=shop.movements.filter(d=>d.customerId===id&&['sale','exchange'].includes(d.type));return {spend:docs.reduce((s,d)=>s+paidTotal(d),0),orderCount:docs.filter(d=>d.type==='sale').length,lastPurchase:Math.max(0,...docs.map(d=>d.when||0))||null};}
  function tierFor(spend,settings) {return spend>=settings.tierDiamond?'Kim cương':spend>=settings.tierGold?'Vàng':spend>=settings.tierSilver?'Bạc':'Đồng';}
  function customerView(shop,c) {const facts=spendFor(shop,c.id);return {...c,...facts,tier:tierFor(facts.spend,shop.settings)};}
  function voucherStatus(v,day=nowDay()) {if(!v.active)return 'Đã tắt';if(day<v.startDate)return 'Sắp diễn ra';if(day>v.endDate)return 'Hết hạn';if(v.limit>0&&(v.used||0)>=v.limit)return 'Hết lượt';return 'Đang áp dụng';}
  function publicStaff(person) {const {code,name,username,role,active,phone='',jobTitle='',baseSalary=0,payType='monthly',hourlyRate=0,startDate='',defaultShift=''}=person;return {code,name,username,role,active,phone,jobTitle,baseSalary,payType,hourlyRate,startDate,defaultShift};}
  function snap(shop,user) {return clone({user,products:shop.products.map(p=>({...p,active:p.active!==false})),balances:balances(shop),movements:shop.movements,staff:shop.staff.map(publicStaff),customers:shop.customers.map(c=>customerView(shop,c)),suppliers:shop.suppliers,vouchers:shop.vouchers.map(v=>({...v,status:voucherStatus(v)})),returns:shop.returns,stockNotes:shop.stockNotes,shifts:shop.shifts,settings:shop.settings,audit:shop.audit});}
  const snapshot=()=>access(true,(shop,user)=>snap(shop,user));
  function retailProduct(p) {return {code:p.code,name:p.name,category:p.category,price:p.price,image:p.image||'',description:p.description||'',active:p.active!==false,sizes:sizesFor(p),unit:unitFor(p)};}
  const checkoutData=()=>access(true,(shop,user)=>({user,products:shop.products.filter(p=>p.active!==false).map(retailProduct),balances:balances(shop).map(row=>user.role==='manager'?row:{code:row.code,size:row.size,total:row.total,warehouse:row.total,counter:0,held:row.held}),customers:shop.customers.filter(c=>c.active!==false).map(c=>({id:c.id,name:c.name,phone:c.phone,birthday:c.birthday,tier:customerView(shop,c).tier})),suppliers:shop.suppliers.filter(s=>s.active!==false).map(s=>({id:s.id,name:s.name})),shifts:shop.shifts.filter(shift=>shift.employeeId===user.code).map(({id,date,start,end,status})=>({id,date,start,end,status})),settings:{birthdayEnabled:shop.settings.birthdayEnabled}}),['manager','employee']);
  function selectCustomer(shop,id) {if(!id)return null;const c=shop.customers.find(c=>c.id===id&&c.active!==false);if(!c)fail('Không tìm thấy khách hàng đang hoạt động.');return customerView(shop,c);}
  function uniqueRequest(shop,input,kind) {required(input.requestId,'Mã lần lưu',100);const old=shop.movements.find(d=>d.requestId===input.requestId);if(!old)return null;if(old.requestKind!==kind||old.signature!==JSON.stringify(input))fail('Lần lưu này đã được dùng. Mở lại biểu mẫu rồi thử lại.');return old;}
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
      const qty=int(line.qty,'Số lượng',1,100000),unitPrice=kind==='receiptRetail'?null:kind==='receipt'?int(line.unitPrice,'Giá nhập',1,1e9):int(p.price,'Giá bán',1,1e9);
      const out={code:p.code,name:p.name,size,qty,unitPrice,lineTotal:unitPrice===null?null:qty*unitPrice};
      if(receipt)out.sellingPrice=kind==='receiptRetail'?int(line.sellingPrice,'Giá bán',1,1e9):p.price;
      if(!receipt){
        const available=row.warehouse+row.counter;if(qty>available)fail(`${p.name} size ${size} chỉ còn ${available} ${unitFor(p)} có thể xuất.`);
        out.counterQty=Math.min(qty,Math.max(0,row.counter));out.warehouseQty=qty-out.counterQty;
        row.counter-=out.counterQty;row.warehouse-=out.warehouseQty;
      }
      return out;
    });
  }
  function allocateDiscount(items,discount) {
    const gross=items.reduce((s,i)=>s+i.lineTotal,0);let left=discount;
    const result=items.map(i=>{const part=Math.floor(discount*i.lineTotal/gross);left-=part;return {...i,discount:part,paidTotal:i.lineTotal-part};});
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
  function birthdayInfo(shop,customer,day) {
    if(!customer)return {eligible:false,message:'Chọn khách hàng để kiểm tra ưu đãi sinh nhật.'};
    if(!shop.settings.birthdayEnabled)return {eligible:false,message:'Ưu đãi sinh nhật đang tắt.'};
    if(!customer.birthday)return {eligible:false,message:'Khách hàng chưa có ngày sinh.'};
    if(customer.birthday.slice(5)!==day.slice(5))return {eligible:false,message:'Hôm nay không trùng ngày sinh của khách hàng.'};
    if(shop.movements.some(d=>d.type==='sale'&&d.customerId===customer.id&&d.promotion==='birthday'&&nowDay(d.when).slice(0,4)===day.slice(0,4)))return {eligible:false,message:'Khách hàng đã dùng ưu đãi sinh nhật trong năm nay.'};
    return {eligible:true,message:`Sinh nhật hôm nay · được giảm ${shop.settings.birthdayPercent}%${shop.settings.birthdayMax?' (tối đa '+fmt.format(shop.settings.birthdayMax)+')':''}, 1 lần/năm.`};
  }
  function quote(shop,input) {
    const items=itemsFor(shop,input.lines,'sale'),gross=items.reduce((s,i)=>s+i.lineTotal,0);
    const customer=selectCustomer(shop,input.customerId),day=nowDay(),birthday=birthdayInfo(shop,customer,day);
    let discount=0,selected=null,promotion='none',promotionLabel='Không có ưu đãi';
    const candidates=shop.vouchers.filter(v=>voucherStatus(v,day)==='Đang áp dụng'&&gross>=v.minOrder&&(v.tier==='all'||(customer&&TIERS.indexOf(customer.tier)>=TIERS.indexOf(v.tier))));
    for(const v of candidates){let amount=v.type==='percent'?Math.floor(gross*v.value/100):v.value;if(v.maxDiscount>0)amount=Math.min(amount,v.maxDiscount);amount=Math.min(gross,amount);if(amount>discount){discount=amount;selected=v;promotion='automatic';promotionLabel=v.name;}}
    if(birthday.eligible&&gross>=shop.settings.birthdayMin){let amount=Math.floor(gross*shop.settings.birthdayPercent/100);if(shop.settings.birthdayMax>0)amount=Math.min(amount,shop.settings.birthdayMax);amount=Math.min(gross,amount);if(amount>discount){discount=amount;selected=null;promotion='birthday';promotionLabel='Ưu đãi sinh nhật';}}
    if(birthday.eligible&&gross<shop.settings.birthdayMin)birthday.message+=' Đơn tối thiểu '+fmt.format(shop.settings.birthdayMin)+'.';
    const total=gross-discount;int(total,'Tổng tiền',0,1e14);
    return {items:allocateDiscount(items,discount),gross,discount,total,birthdayEligible:birthday.eligible&&gross>=shop.settings.birthdayMin,birthdayMessage:birthday.message,promotion,promotionLabel,voucherId:selected?.id||'',customerId:customer?.id||'',customerName:customer?.name||'Khách lẻ'};
  }
  const quoteSale=input=>access(false,shop=>clone(quote(shop,input)),['manager','employee']);
  function payment(input,total) {
    const method=input.method;if(!['Tiền mặt','Chuyển khoản'].includes(method))fail('Chọn phương thức thanh toán.');
    const data={method,paymentStatus:'confirmed'};
    if(method==='Tiền mặt'&&input.cashReceived!==undefined&&input.cashReceived!=='') {data.cashReceived=int(input.cashReceived,'Tiền khách đưa',0,1e14);if(data.cashReceived<total)fail('Tiền khách đưa chưa đủ thanh toán.');data.change=data.cashReceived-total;}
    if(method==='Chuyển khoản'&&total>0&&input.transferConfirmed!==true)fail('Xác nhận đã nhận chuyển khoản trước khi lưu.');
    return data;
  }
  const saveSale=input=>access(true,(shop,user)=>{
    const old=uniqueRequest(shop,input,'sale');if(old)return {id:old.id,total:paidTotal(old)};
    const q=quote(shop,input);if(q.total!==input.expectedTotal)fail('Tổng tiền hoặc ưu đãi vừa thay đổi. Hãy tính lại đơn.');
    const pay=payment(input,q.total),doc=stampDocument({id:nextId(shop.movements,'HD',4),type:'sale',note:pay.method,...q,...pay},input,user,'sale');
    shop.movements.push(doc);if(q.voucherId){const v=shop.vouchers.find(v=>v.id===q.voucherId);v.used=(v.used||0)+1;}
    audit(shop,user,'Lập hóa đơn',doc.id);return {id:doc.id,total:q.total};
  },['manager','employee']);
  const saveProduct=input=>access(true,(shop,user)=>{
    const name=required(input.name,'Tên sản phẩm',120),category=required(input.category,'Loại sản phẩm',60),price=int(input.price,'Giá bán',1,1e9);
    if(!CATEGORIES[category])fail('Chọn loại sản phẩm trong danh mục.');let p;
    if(input.code){p=shop.products.find(p=>p.code===input.code);if(!p)fail('Không tìm thấy sản phẩm.');}
    else {p={code:nextId(shop.products,CATEGORIES[category])};shop.products.push(p);}
    const chosenSizes=input.sizes===undefined?(p.sizes||sizesFor(input.code?p:category)):input.sizes;
    if(!Array.isArray(chosenSizes)||!chosenSizes.length||chosenSizes.length>30)fail('Nhập từ 1 đến 30 kích cỡ cho sản phẩm.');
    const validatedSizes=[...new Set(chosenSizes.map(s=>required(s,'Kích cỡ',40)))];
    Object.assign(p,{name,category,price,sizes:validatedSizes,unit:unitFor({category,unit:input.unit||p.unit}),description:clean(input.description,1000),active:input.active!==false});
    const source=input.source||input.sourceUrl;if(source){try{const url=new URL(source);if(url.protocol!=='https:')fail('Nguồn tham khảo phải dùng HTTPS.');p.source=url.href;p.checkedOn=optionalDay(input.checkedOn||input.sourceCheckedAt||'','Ngày đối chiếu');}catch{fail('Đường dẫn nguồn tham khảo chưa hợp lệ.');}}
    audit(shop,user,'Cập nhật sản phẩm',p.code);return p.code;
  });
  const saveStockNote=(code,input)=>access(true,(shop,user)=>{
    if(!shop.products.some(p=>p.code===code))fail('Không tìm thấy sản phẩm.');shop.stockNotes[code]={reason:clean(input.reason,150),note:clean(input.note,1000),action:clean(input.action,300),threshold:int(input.threshold??5,'Ngưỡng sắp hết',0,100000),updatedAt:Date.now(),updatedBy:user.name};audit(shop,user,'Đánh giá hàng tồn',code);return {code};
  });
  function phone(v) {const p=clean(v,30);if(p&&(!/^[+\d\s().-]{6,25}$/.test(p)||p.replace(/\D/g,'').length<6||p.replace(/\D/g,'').length>15))fail('Số điện thoại chưa hợp lệ.');return p;}
  function email(v) {const e=clean(v,150);if(e&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))fail('Địa chỉ email chưa hợp lệ.');return e;}
  const saveSupplier=input=>access(true,(shop,user)=>{
    let row=input.id?shop.suppliers.find(r=>r.id===input.id):null;if(input.id&&!row)fail('Không tìm thấy nhà cung cấp.');
    const fields={name:required(input.name,'Tên nhà cung cấp',150),contact:clean(input.contact,100),phone:phone(input.phone),email:email(input.email),address:clean(input.address,300),note:clean(input.note,1000),active:input.active!==false};
    if(!row){row={id:nextId(shop.suppliers,'NCC')};shop.suppliers.push(row);}Object.assign(row,fields);audit(shop,user,'Cập nhật nhà cung cấp',row.id);return {id:row.id};
  });
  const saveCustomer=input=>access(true,(shop,user)=>{
    let row=input.id?shop.customers.find(r=>r.id===input.id):null;if(input.id&&!row)fail('Không tìm thấy khách hàng.');
    const b=optionalDay(input.birthday,'Ngày sinh');if(b&&(b>nowDay()||b<'1900-01-01'))fail('Ngày sinh cần từ năm 1900 đến hôm nay.');const p=phone(input.phone),normalized=p.replace(/\D/g,'');
    if(normalized&&shop.customers.some(c=>c.id!==input.id&&c.phone?.replace(/\D/g,'')===normalized))fail('Số điện thoại đã thuộc một khách hàng khác.');
    const fields={name:required(input.name,'Họ tên',100),phone:p,birthday:b,email:email(input.email),address:clean(input.address,300),note:clean(input.note,1000),active:input.active!==false};
    if(!row){row={id:nextId(shop.customers,'KH'),createdAt:Date.now()};shop.customers.push(row);}Object.assign(row,fields);audit(shop,user,'Cập nhật khách hàng',row.id);return {id:row.id};
  });
  const saveVoucher=input=>access(true,(shop,user)=>{
    let row=input.id?shop.vouchers.find(r=>r.id===input.id):null;if(input.id&&!row)fail('Không tìm thấy voucher.');
    const code=clean(input.code||row?.code||nextId(shop.vouchers.map(v=>({code:v.code})),'UD'),32).toUpperCase();if(!/^[A-Z0-9_-]{3,32}$/.test(code))fail('Mã ưu đãi gồm 3–32 chữ không dấu, chữ số, gạch ngang hoặc gạch dưới.');
    if(row?.used>0&&row.code!==code)fail('Chương trình đã được sử dụng; giữ định danh để bảo toàn lịch sử.');
    if(shop.vouchers.some(v=>v.code===code&&v.id!==input.id))fail('Mã ưu đãi đã tồn tại.');
    const startDate=optionalDay(input.startDate,'Ngày bắt đầu'),endDate=optionalDay(input.endDate,'Ngày kết thúc');if(!startDate||!endDate||endDate<startDate)fail('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.');
    const type=input.type;if(!['percent','fixed'].includes(type))fail('Chọn hình thức giảm giá.');const tier=input.tier||'all';if(!['all',...TIERS].includes(tier))fail('Hạng khách hàng chưa hợp lệ.');
    const limit=int(input.limit||0,'Giới hạn lượt dùng',0,1e7);if(limit>0&&limit<(row?.used||0))fail('Giới hạn lượt dùng không được nhỏ hơn số lượt đã dùng.');
    const fields={code,name:required(input.name,'Tên chương trình',150),type,value:int(input.value,'Mức giảm',1,type==='percent'?100:1e9),maxDiscount:int(input.maxDiscount||0,'Giảm tối đa',0,1e9),minOrder:int(input.minOrder||0,'Đơn tối thiểu',0,1e12),startDate,endDate,limit,tier,active:input.active!==false};
    if(!row){row={id:nextId(shop.vouchers,'VC'),used:0};shop.vouchers.push(row);}Object.assign(row,fields);audit(shop,user,'Cập nhật ưu đãi',row.name);return {id:row.id};
  });
  function employeeFields(input) {return {phone:phone(input.phone),jobTitle:clean(input.jobTitle,100),baseSalary:int(input.baseSalary||0,'Lương cơ bản',0,1e9),payType:['monthly','hourly'].includes(input.payType)?input.payType:'monthly',hourlyRate:int(input.hourlyRate||0,'Lương theo giờ',0,1e7),startDate:optionalDay(input.startDate,'Ngày vào làm'),defaultShift:clean(input.defaultShift,120)};}
  async function saveEmployee(input) {
    const fields=employeeFields(input);const path=input.code?'staff/'+input.code:'staff';
    const result=await window.AtinoDemo.api(path,{method:input.code?'PATCH':'POST',body:JSON.stringify({...input,...fields})});return {code:result.code};
  }
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
    if(Object.entries(FIXED_CUSTOMER_POLICY).some(([key,value])=>Object.hasOwn(input,key)&&input[key]!==value))fail('Hạng thành viên và ưu đãi sinh nhật đã được cố định.');
    shop.settings={...shop.settings,...FIXED_CUSTOMER_POLICY,returnDays:30,returnConditions:required(input.returnConditions??shop.settings.returnConditions,'Điều kiện đổi hàng',2000)};audit(shop,user,'Cập nhật chính sách','POLICY');return clone(shop.settings);
  });
  const saveStockDocument=input=>access(true,(shop,user)=>{
    if(!['receipt','dispatch'].includes(input.type))fail('Loại phiếu kho không hợp lệ.');const old=uniqueRequest(shop,input,'stock');if(old)return {id:old.id};
    let supplier=null;if(input.type==='receipt'){supplier=shop.suppliers.find(s=>s.id===input.supplierId&&s.active);if(!supplier)fail('Chọn nhà cung cấp đang hoạt động.');}
    const destination=input.type==='dispatch'?required(input.destination,'Nơi nhận hàng',200):'',reason=input.type==='dispatch'?required(input.reason,'Lý do xuất kho',300):'';
    const receipt=input.type==='receipt',employeeReceipt=receipt&&user.role==='employee';
    const items=itemsFor(shop,input.lines,receipt?(employeeReceipt?'receiptRetail':'receipt'):'dispatch');
    if(employeeReceipt){
      const prices=new Map();for(const item of items){if(prices.has(item.code)&&prices.get(item.code)!==item.sellingPrice)fail('Các size của cùng một sản phẩm cần có cùng giá bán.');prices.set(item.code,item.sellingPrice);}
      for(const [code,price] of prices){const p=shop.products.find(row=>row.code===code);if(p.price!==price){p.price=price;audit(shop,user,'Cập nhật giá bán khi nhập hàng',code);}}
    }
    if(input.type==='dispatch')for(const item of items){item.unitPrice=0;item.lineTotal=0;}
    const doc=stampDocument({id:nextId(shop.movements,receipt?'PN':'XK',4),type:input.type,note:clean(input.note,1000)||supplier?.name||reason,items,supplierId:supplier?.id||'',supplierName:supplier?.name||'',destination,reason,total:employeeReceipt?null:receipt?int(items.reduce((s,i)=>s+i.qty*i.unitPrice,0),'Giá trị phiếu nhập',0,1e14):0,...(receipt?{costStatus:employeeReceipt?'pending':'complete'}:{})},input,user,'stock');
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
    const invoice=shop.movements.find(d=>d.id===input.invoiceId&&d.type==='sale');if(!invoice)fail('Chọn hóa đơn gốc hợp lệ.');
    if(!Number.isFinite(invoice.when))fail('Hóa đơn đã quá thời hạn đổi 30 ngày hoặc chưa có ngày mua hợp lệ.');
    const age=(Date.parse(nowDay()+'T00:00:00Z')-Date.parse(nowDay(invoice.when)+'T00:00:00Z'))/DAY;if(age<0||age>30)fail('Hóa đơn đã quá thời hạn đổi 30 ngày hoặc chưa có ngày mua hợp lệ.');
    const condition=input.condition;if(!['resellable','damaged'].includes(condition))fail('Chọn tình trạng hàng nhận lại.');required(input.reason,'Lý do đổi hàng',1000);
    if(!Array.isArray(input.items)||!input.items.length||input.items.length>100)fail('Chọn từ 1 đến 100 dòng sản phẩm khách muốn đổi.');
    if(!Array.isArray(invoice.items)||!invoice.items.length)fail('Hóa đơn gốc chưa có chi tiết hàng hợp lệ.');
    const original=salePaidItems(invoice);
    const stock=stockMap(shop),usedKeys=new Set();
    // Cumulative integer shares keep a split return's total exactly equal to
    // what was paid, including the final dong of a discounted invoice line.
    const share=(amount,part,total)=>Number(BigInt(amount)*BigInt(part)/BigInt(total));
    let credit=0;
    const returned=input.items.map(line=>{
      const size=clean(line.size,40),key=line.code+'|'+size;if(usedKeys.has(key))fail('Sản phẩm nhận lại bị trùng dòng.');usedKeys.add(key);
      const item=original.find(i=>i.code===line.code&&i.size===size);if(!item)fail('Sản phẩm nhận lại không thuộc hóa đơn gốc.');
      const previous=shop.returns.filter(r=>r.invoiceId===invoice.id).flatMap(r=>r.items||[]).filter(i=>i.code===line.code&&(i.size||'Chưa phân size')===size);
      const used=previous.reduce((sum,row)=>sum+row.qty,0);
      const qty=int(line.qty,'Số lượng đổi',1,100000);if(qty>item.qty-used)fail(`${item.name} size ${item.size} chỉ còn ${item.qty-used} sản phẩm được đổi.`);
      const credited=previous.every(row=>Number.isSafeInteger(row.paidTotal)&&row.paidTotal>=0)?previous.reduce((sum,row)=>sum+row.paidTotal,0):share(item.paidTotal,used,item.qty);
      if(credited>item.paidTotal)fail('Giá trị đã đổi vượt số tiền thực trả của dòng hóa đơn. Cần kiểm tra lại chứng từ cũ.');
      const amount=Math.max(0,share(item.paidTotal,used+qty,item.qty)-credited);credit+=amount;
      if(condition==='resellable')stock.get(item.code).get(item.size).warehouse+=qty;
      return {code:item.code,name:item.name,size:item.size,qty,unitPrice:item.unitPrice,paidTotal:amount};
    });
    const replacements=itemsFor(shop,input.replacements,'sale',stock),replacementTotal=replacements.reduce((s,i)=>s+i.lineTotal,0);
    if(replacementTotal<credit)fail(`Hàng đổi mới phải có giá trị ít nhất ${fmt.format(credit)}. Chính sách không hoàn tiền.`);
    return {invoiceId:invoice.id,customerId:invoice.customerId||'',customerName:invoice.customerName||'Khách lẻ',credit,replacementTotal,extraPaid:replacementTotal-credit,items:returned,replacements,condition,reason:clean(input.reason,1000)};
  }
  const quoteExchange=input=>access(false,shop=>clone(exchangeQuote(shop,input)));
  const saveExchange=input=>access(true,(shop,user)=>{
    const old=uniqueRequest(shop,input,'exchange');if(old)return {id:old.id,extraPaid:paidTotal(old)};
    const q=exchangeQuote(shop,input);if(q.extraPaid!==input.expectedExtraPaid)fail('Chênh lệch đã thay đổi. Tính lại phiếu đổi hàng.');
    if(q.extraPaid>0&&input.method==='Tiền mặt'&&(input.cashReceived===undefined||input.cashReceived===''))fail('Nhập số tiền khách đưa để xác nhận khoản thu thêm.');
    const pay=payment(input,q.extraPaid),id=nextId([...shop.returns,...shop.movements.filter(doc=>doc.type==='exchange')],'DT',4),when=Date.now();
    const doc=stampDocument({id,type:'exchange',exchangeOf:q.invoiceId,items:q.replacements,returnedItems:q.items,credit:q.credit,gross:q.replacementTotal,discount:0,total:q.extraPaid,extraPaid:q.extraPaid,note:q.reason,reason:q.reason,condition:q.condition,customerId:q.customerId,customerName:q.customerName,...pay},input,user,'exchange');
    shop.movements.push(doc);shop.returns.push({id,invoiceId:q.invoiceId,when,reason:q.reason,condition:q.condition,items:q.items,replacements:q.replacements,credit:q.credit,replacementTotal:q.replacementTotal,extraPaid:q.extraPaid,employeeId:user.code,employeeName:user.name,method:pay.method});audit(shop,user,'Xử lý đổi hàng',id);return {id,extraPaid:q.extraPaid};
  });
  function metrics(data,period='month',value=nowDay().slice(0,7)) {
    const length=period==='day'?10:period==='month'?7:4,key=String(value||nowDay()).slice(0,length);
    const docs=data.movements.filter(d=>Number.isFinite(d.when)&&nowDay(d.when).startsWith(key));
    const transactions=docs.filter(d=>['sale','exchange'].includes(d.type)).sort((a,b)=>b.when-a.when),sales=transactions.filter(d=>d.type==='sale');
    let buckets=[];if(period==='day')buckets=Array.from({length:24},(_,i)=>({label:String(i).padStart(2,'0')+'h',value:0}));
    else if(period==='year')buckets=Array.from({length:12},(_,i)=>({label:'T'+(i+1),value:0}));
    else {const [y,m]=key.split('-').map(Number),n=new Date(Date.UTC(y||2026,m||1,0)).getUTCDate();buckets=Array.from({length:n},(_,i)=>({label:String(i+1),value:0}));}
    const top=new Map();
    for(const d of transactions) {
      const dt=nowDay(d.when);const n=period==='year'?Number(dt.slice(5,7))-1:period==='month'?Number(dt.slice(8,10))-1:Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',hourCycle:'h23'}).format(d.when));if(buckets[n])buckets[n].value+=paidTotal(d);
      for(const item of d.type==='sale'?salePaidItems(d):d.items) {const r=top.get(item.code)||{code:item.code,name:item.name,qty:0,revenue:0};r.qty+=item.qty;r.revenue+=Number.isFinite(item.paidTotal)?item.paidTotal:item.qty*item.unitPrice;top.set(item.code,r);}
      if(d.type==='exchange') for(const item of d.returnedItems||[]){const r=top.get(item.code)||{code:item.code,name:item.name,qty:0,revenue:0};r.qty-=item.qty;r.revenue-=item.paidTotal||0;top.set(item.code,r);}
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
    const sumType=t=>docs.filter(d=>d.type===t).flatMap(d=>d.items).reduce((s,i)=>s+i.qty,0);
    return {revenue:transactions.reduce((s,d)=>s+paidTotal(d),0),gross:transactions.reduce((s,d)=>s+(d.gross??grossTotal(d))-(d.credit||0),0),discount:transactions.reduce((s,d)=>s+(d.discount||0),0),orderCount:sales.length,exchangeCount:transactions.length-sales.length,unitsSold:[...top.values()].reduce((s,p)=>s+p.qty,0),totalStock:data.balances.reduce((s,b)=>s+b.total,0),heldStock:data.balances.reduce((s,b)=>s+(b.held||0),0),productCount:data.products.filter(p=>p.active!==false).length,lowCount:data.products.filter(p=>p.active!==false&&(productTotals.get(p.code)||0)<=(data.stockNotes[p.code]?.threshold??5)).length,cash:transactions.filter(d=>(d.method||d.note)==='Tiền mặt').reduce((s,d)=>s+paidTotal(d),0),bank:transactions.filter(d=>(d.method||d.note)==='Chuyển khoản').reduce((s,d)=>s+paidTotal(d),0),buckets,topProducts:[...top.values()].sort((a,b)=>b.qty-a.qty),transactions,totalReceived:sumType('receipt'),totalDispatched:sumType('dispatch'),stockValue,unknownCostUnits,pendingReceiptCount,uncostedReceiptUnits};
  }
  window.AtinoERP={snapshot,checkoutData,categories:window.AtinoCatalog?.categories||Object.keys(CATEGORIES),sizesFor,unitFor,references:window.AtinoCatalog?.references||[],today:nowDay,money:n=>fmt.format(n||0),inventory:stockMap,metrics,documentPaidTotal:paidTotal,salePaidItems,saveProduct,saveStockNote,saveSupplier,saveCustomer,saveVoucher,saveEmployee,saveShift,deleteShift,saveSettings,saveStockDocument,completeReceiptCost,quoteSale,saveSale,quoteExchange,saveExchange,employeeFields};
})();

(() => {
  'use strict';
  const M = window.AtinoManager;
  const E = window.AtinoERP;
  const Search = window.AtinoSearch;
  const ui = {customerQuery:'', staffQuery:'', staffStatus:'all', staffTab:'profiles', staffMonth:''};
  const esc = value => M.esc(value == null ? '' : value);
  const cash = value => M.money(Number(value) || 0);
  const arr = (data,key) => Array.isArray(data[key]) ? data[key] : [];
  function payrollAmount(form, key, fallback) {
    const input = form.elements[key];
    if (!input.value) return 0;
    const amount = AtinoMoney.read(input);
    return amount >= 0 && amount <= Number(input.getAttribute('max')) ? amount : fallback || 0;
  }
  const val = (form,key) => String(form.elements[key]?.value || '').trim();
  const selected = (a,b) => a === b ? ' selected' : '';
  const checked = value => value ? ' checked' : '';
  const dateOnly = value => {
    if (!value) return 'Chưa cập nhật';
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : M.date(value);
  };
  const figureHints = {
  "working": "Xem nhân viên trong ca hiện tại",
  "employees": "Xem danh sách nhân viên",
  "salary": "Xem dự toán từng nhân viên",
  "customers": "Xem hồ sơ khách hàng",
  "repeat": "Xem khách đã mua từ hai lần",
  "spend": "Xem giao dịch của khách hàng",
  "purchases": "Xem lịch sử mua hàng",
  "customerReturns": "Xem phiếu đổi của khách"
};
  const stat = (key,label,value,note='') => `<button type="button" class="am-stat am-overview-card" data-figure="${key}" aria-haspopup="dialog"><div class="am-stat-top"><span>${esc(label)}</span></div><strong>${esc(value)}</strong>${note?`<p>${esc(note)}</p>`:''}<span class="am-overview-card-foot"><span>${esc(figureHints[key])}</span>${M.icon('chevron')}</span></button>`;
  const isBirthday = person => Boolean(person.birthday && person.birthday.slice(5) === M.today().slice(5));
  const field = (label,name,value='',attrs='',type='text') => `<label class="am-field">${esc(label)}<input name="${esc(name)}" type="${type}" value="${esc(value)}" ${attrs}></label>`;
  const area = (label,name,value='',attrs='') => `<label class="am-field am-span-2">${esc(label)}<textarea name="${esc(name)}" rows="3" ${attrs}>${esc(value)}</textarea></label>`;
  const selectField = (label,name,options,value,attrs='') => `<label class="am-field">${esc(label)}<select name="${esc(name)}" ${attrs}>${options.map(([v,t])=>`<option value="${esc(v)}"${selected(value,v)}>${esc(t)}</option>`).join('')}</select></label>`;
  const activeField = (active=true,disabled=false) => `<label class="amp-check am-span-2"><input name="active" type="checkbox"${checked(active)}${disabled?' disabled':''}><span>Đang hoạt động</span></label>`;
  const panelHead = (title,desc='',actions='') => `<div class="am-panel-head"><div><h2>${esc(title)}</h2>${desc?`<p class="am-muted">${esc(desc)}</p>`:''}</div>${actions?`<div class="am-actions">${actions}</div>`:''}</div>`;
  const formError = (form,message) => { let el=form.querySelector('[data-local-error]'); if(!el){el=document.createElement('p');el.className='am-error';el.dataset.localError='';el.setAttribute('role','alert');form.append(el);} const text=String(message||'');el.textContent=text;el.hidden=!text.trim(); };
  const numberFormat = n => new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(n || 0);
  const refreshSaved = async message => { await M.refresh(); M.toast(message); };
  const style = document.createElement('style');
  style.textContent = `
    #manager-app .amp-person{display:flex;gap:.75rem;align-items:center}#manager-app .amp-avatar{flex:none;width:2.6rem;height:2.6rem;border-radius:.8rem;background:#eef2ff;color:#3730a3;display:grid;place-items:center;font-weight:750;font-size:.9rem}#manager-app .amp-person strong{display:block}#manager-app .amp-person small{display:block;color:#64748b;margin-top:.2rem;font-size:.82rem}#manager-app .amp-row-sub{display:block;color:#64748b;font-size:.86rem;margin-top:.25rem}#manager-app .amp-birthday{color:#a16207;font-size:.85rem;display:block;margin-top:.3rem}#manager-app .amp-tabs{display:flex;gap:.35rem;flex-wrap:wrap;padding:.35rem;background:#e9eef5;border-radius:.8rem;width:fit-content;margin-bottom:1.25rem}#manager-app .amp-tabs button{border:0;background:transparent;color:#526176;font:inherit;font-size:.9rem;font-weight:600;padding:.65rem 1rem;border-radius:.6rem;cursor:pointer}#manager-app .amp-tabs button[aria-selected=true]{background:#fff;color:#312e81;box-shadow:0 1px 5px #1e293b12}#manager-app .amp-keyline{padding:1rem 0;border-bottom:1px solid #edf0f5}#manager-app .amp-keyline:last-child{border-bottom:0}#manager-app .amp-policy-tag{display:inline-flex;align-items:center;border-radius:.5rem;background:#eef2ff;color:#4338ca;padding:.35rem .6rem;font-size:.84rem;font-weight:600;margin-bottom:.8rem}#manager-app .amp-policy-numbers{display:flex;align-items:baseline;gap:.5rem;margin:.5rem 0 1rem}#manager-app .amp-policy-numbers strong{font-size:2.3rem;letter-spacing:-.05em;color:#172554}#manager-app .amp-policy-numbers span{color:#64748b}#manager-app .amp-note-lines p{margin:.4rem 0}#manager-app .amp-voucher-code{font-family:ui-monospace,SFMono-Regular,monospace;font-weight:750;color:#3730a3;background:#eef2ff;padding:.3rem .5rem;border:1px dashed #a5b4fc;border-radius:.35rem;display:inline-block;letter-spacing:.03em}#manager-app .amp-section-note{display:flex;gap:.75rem;align-items:flex-start;padding:1rem 1.2rem;border-radius:.8rem;background:#f0f4ff;border:1px solid #dce5ff;color:#334155;font-size:.94rem;line-height:1.6;margin:0 0 1.2rem}#manager-app .amp-settings-form{display:grid;gap:1rem}#manager-app .amp-settings-form .am-form-grid{margin:0}#manager-app .amp-check{display:flex!important;align-items:center;gap:.6rem;font-size:.95rem;line-height:1.5}#manager-app .amp-check input[type=checkbox]{width:1.1rem!important;height:1.1rem!important;margin:0!important;accent-color:#4f46e5}#manager-app .amp-full{grid-column:1/-1}#manager-app .amp-contact{white-space:normal;min-width:9rem}#manager-app .amp-min{min-width:8rem}#manager-app .amp-policy-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.3rem}#manager-app .amp-policy-grid>.am-panel{margin:0}#manager-app .amp-salary-note{font-size:.875rem;color:#64748b;line-height:1.6;margin-top:1rem}#manager-app .amp-count{white-space:nowrap;color:#64748b;font-size:.875rem}@media(max-width:850px){#manager-app .amp-policy-grid{grid-template-columns:1fr}#manager-app .amp-full{grid-column:auto}}`;
  document.head.append(style);

  // Customers -------------------------------------------------------------
  const customerSearchText = c => [c.id, c.name, c.phone];
  function customersFiltered() {
    return arr(M.data,'customers').filter(c => Search.match(customerSearchText(c), ui.customerQuery));
  }
  function customerRows() {
    const rows=customersFiltered();
    if(!rows.length) return `<tr><td colspan="5">${M.empty('Chưa có khách hàng phù hợp')}</td></tr>`;
    return rows.map(c=>`<tr><td><div class="amp-person"><span class="amp-avatar">${esc((c.name||'KH').split(/\s+/).slice(-2).map(x=>x[0]).join('').toUpperCase())}</span><div><button type="button" class="am-text-btn" data-customer-detail="${esc(c.id)}">${esc(c.name)}</button><button type="button" class="am-text-btn amp-row-sub" data-customer-orders="${esc(c.id)}" aria-haspopup="dialog">${esc(c.id)}</button></div></div></td><td class="amp-contact">${esc(c.phone||'—')}</td><td><strong>${cash(c.spend)}</strong><button type="button" class="am-text-btn amp-row-sub" data-customer-orders="${esc(c.id)}" aria-haspopup="dialog">${Number(c.orderCount)||0} đơn đã mua</button></td><td>${c.lastPurchase?esc(dateOnly(c.lastPurchase)):'—'}</td><td><div class="am-actions"><button type="button" class="am-btn ghost small" data-customer-edit="${esc(c.id)}" aria-label="Sửa ${esc(c.name)}">Sửa</button></div></td></tr>`).join('');
  }
  function customerForm(customer=null) {
    const c=customer||{};
    M.dialog({title:c.id?'Sửa hồ sơ khách hàng':'Thêm khách hàng',wide:true,submitLabel:c.id?'Lưu hồ sơ':'Thêm khách hàng',body:`<div class="am-form-grid">${field('Họ và tên *','name',c.name,'required maxlength="100" autocomplete="name"')}${field('Số điện thoại *','phone',c.phone,'required minlength="8" maxlength="25" autocomplete="tel"','tel')}${field('Ngày sinh','birthday',c.birthday,`max="${M.today()}"`,'date')}${field('Email','email',c.email,'maxlength="150" autocomplete="email"','email')}${field('Địa chỉ','address',c.address,'maxlength="300" autocomplete="street-address"')}</div>`,onSubmit:async form=>{
      await E.saveCustomer({id:c.id,name:val(form,'name'),phone:val(form,'phone'),birthday:val(form,'birthday'),email:val(form,'email'),address:val(form,'address')});
      await refreshSaved(c.id?'Đã cập nhật hồ sơ khách hàng.':'Đã thêm khách hàng.');
    }});
  }
  function customerOrders(id) {
    const c=arr(M.data,'customers').find(person=>person.id===id);
    if(!c)return;
    const docs=arr(M.data,'movements').filter(doc=>doc.type==='sale' && doc.customerId===id).sort((a,b)=>b.when-a.when);
    M.showInvoiceList('Hóa đơn đã mua · '+c.id+' · '+c.name,docs,'Khách hàng chưa có hóa đơn bán');
  }
  function customerDetail(c) {
    const purchases=arr(M.data,'movements').filter(d=>d.customerId===c.id&&(d.type==='sale'||d.type==='exchange')).sort((a,b)=>(b.when||0)-(a.when||0));
    const purchaseIds=new Set(purchases.map(d=>d.id));
    const returns=arr(M.data,'returns').filter(r=>purchaseIds.has(r.invoiceId));
    const detailLine=(name,value)=>`<div><dt class="am-muted">${esc(name)}</dt><dd>${esc(value||'Chưa cập nhật')}</dd></div>`;
    M.dialog({title:c.name,wide:true,submitLabel:'Đóng',body:`<div class="am-toolbar"><button type="button" class="am-text-btn" data-customer-orders="${esc(c.id)}">${esc(c.id)}</button>${isBirthday(c)?M.badge('Sinh nhật hôm nay','amber'):''}</div><div class="am-stat-grid">${stat('purchases','Tổng chi tiêu',cash(c.spend))}<button type="button" class="am-stat am-overview-card" data-customer-orders="${esc(c.id)}" aria-haspopup="dialog"><span class="am-stat-top">Đơn hàng</span><strong>${Number(c.orderCount)||0}</strong><span class="am-overview-card-foot">Xem hóa đơn ${M.icon('chevron')}</span></button>${stat('customerReturns','Lần đổi hàng',String(returns.length))}</div><dl class="am-form-grid amp-keyline">${detailLine('Số điện thoại',c.phone)}${detailLine('Ngày sinh',c.birthday?dateOnly(c.birthday):'')}${detailLine('Email',c.email)}${detailLine('Địa chỉ',c.address)}${detailLine('Thời điểm tạo hồ sơ',c.createdAt?new Intl.DateTimeFormat('vi-VN',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(c.createdAt)):'')}</dl><h3>Lịch sử giao dịch</h3><div class="am-table-wrap"><table class="am-table"><thead><tr><th>Chứng từ</th><th>Ngày</th><th>Nội dung</th><th>Thực thu</th></tr></thead><tbody>${purchases.length?purchases.map(d=>`<tr><td>${M.invoiceLink(d.id)}</td><td>${esc(M.date(d.when))}</td><td>${d.type==='exchange'?'Thu chênh lệch đổi hàng':'Mua hàng'}</td><td>${cash(d.total??d.extraPaid??(d.items||[]).reduce((n,l)=>n+l.qty*l.unitPrice,0))}</td></tr>`).join(''):`<tr><td colspan="4">${M.empty('Chưa có giao dịch')}</td></tr>`}</tbody></table></div>`,onOpen(form){
      form.querySelector('[data-figure="purchases"]').onclick=()=>M.showInvoiceList('Chi tiêu · '+c.name,purchases,'Chưa có giao dịch');
      form.querySelector('[data-figure="customerReturns"]').onclick=()=>M.showReturnList('Phiếu đổi · '+c.name,returns);
      form.querySelectorAll('[data-customer-orders]').forEach(b=>b.onclick=()=>customerOrders(c.id));
    }});
  }
  M.register('customers',{title:'Khách hàng',kicker:'Hồ sơ và giao dịch',render(){
    const customers=arr(M.data,'customers');
    const repeatCustomers=customers.filter(c=>c.orderCount>=2);
    return `<div class="am-stat-grid">${stat('customers','Khách hàng',String(customers.length))}${stat('repeat','Khách quay lại',String(repeatCustomers.length))}${stat('spend','Chi tiêu đã ghi nhận',cash(customers.reduce((n,c)=>n+(Number(c.spend)||0),0)))}</div><div class="am-panel">${panelHead('Danh sách khách hàng','',`<button type="button" class="am-btn secondary" data-customers-export>Xuất Excel</button><button type="button" class="am-btn" data-customer-add>Thêm khách hàng</button>`)}<div class="am-toolbar"><input class="am-search" type="search" data-customer-query placeholder="Tìm tên, mã, số điện thoại…" aria-label="Tìm khách hàng" value="${esc(ui.customerQuery)}"><span class="amp-count" data-customer-count>${customersFiltered().length} khách hàng</span></div><div class="am-table-wrap"><table class="am-table"><thead><tr><th>Khách hàng</th><th>Số điện thoại</th><th>Chi tiêu</th><th>Mua gần nhất</th><th>Thao tác</th></tr></thead><tbody data-customer-rows>${customerRows()}</tbody></table></div></div>`;
  },bind(root){
    const update=()=>{root.querySelector('[data-customer-rows]').innerHTML=customerRows();root.querySelector('[data-customer-count]').textContent=customersFiltered().length+' khách hàng';};
    root.querySelector('[data-customer-query]').addEventListener('input',e=>{ui.customerQuery=e.target.value;update();});
    Search.attach(root.querySelector('[data-customer-query]'), {items: () => customersFiltered().map(c => ({value: c.id, label: c.name, detail: [c.id, c.phone].filter(Boolean).join(' · '), searchText: customerSearchText(c)})), onSelect:item=>{const c=arr(M.data,'customers').find(row=>row.id===item.value);if(c)customerDetail(c);}});
    root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.figure)peopleFigure(b);if(b.dataset.customerOrders)customerOrders(b.dataset.customerOrders);if(b.hasAttribute('data-customer-add'))customerForm();if(b.dataset.customerEdit){const c=arr(M.data,'customers').find(x=>x.id===b.dataset.customerEdit);if(c)customerForm(c);}if(b.dataset.customerDetail){const c=arr(M.data,'customers').find(x=>x.id===b.dataset.customerDetail);if(c)customerDetail(c);}if(b.hasAttribute('data-customers-export'))M.downloadTable('Atino_khach_hang','Danh sách khách hàng',[['Mã khách hàng','Họ tên','Điện thoại','Ngày sinh','Chi tiêu','Số đơn','Email','Địa chỉ'],...customersFiltered().map(c=>[c.id,c.name,c.phone,c.birthday,c.spend,c.orderCount,c.email,c.address])],b,{4:'money'});});
  }});

  // Employees, schedule and salary estimates -------------------------------
  const staffSearchText = s => [s.code, s.name, s.username, s.phone, s.jobTitle];
  const staffFiltered = () => arr(M.data,'staff').filter(s=>Search.match(staffSearchText(s),ui.staffQuery)&&(ui.staffStatus==='all'||(ui.staffStatus==='active'?s.active!==false:s.active===false)));
  M.showEmployeeProfile = function(code, fallbackName = '') {
    const person = arr(M.data,'staff').find(row=>row.code===code);
    const details = person || {code,name:fallbackName};
    const dialog = M.dialog({title:'Thông tin nhân viên',body:
      '<dl class="am-kv">' +
      [['Mã nhân viên',details.code],['Họ tên',details.name],['Ca làm ngày '+dateOnly(ui.workDate||M.today()),scheduleText(code,ui.workDate||M.today()).join(' · ')||'Chưa có lịch trong ngày'],['Số điện thoại',details.phone],['Địa chỉ',details.address]].map(([label,value])=>
        '<div><dt>'+esc(label)+'</dt><dd>'+esc(value||'Chưa cập nhật')+'</dd></div>'
      ).join('') + '</dl>' +
      (person?'<div class="am-actions amp-keyline"><button type="button" class="am-btn secondary" data-profile-edit>Sửa thông tin</button></div>':''),
      onOpen(form){
        form.querySelector('[data-profile-edit]')?.addEventListener('click',()=>{dialog.close();employeeForm(person);});
      }
    });
  };
  function employeeForm(person=null){
    const p=person||{};const isSelf=p.code===M.data.user?.code;
    const profileOptions=(key,presets,emptyLabel)=>[['',emptyLabel],...[...new Set([...presets,...arr(M.data,'staff').map(row=>row[key]),p[key]])].filter(value=>typeof value==='string'&&value.trim()).map(value=>[value,value])];
    const jobOptions=profileOptions('jobTitle',['Quản lý cửa hàng','Ca trưởng','Nhân viên cửa hàng','Nhân viên bán hàng','Thu ngân'],'Chưa chọn chức vụ');
    M.dialog({title:p.code?'Sửa nhân viên · '+p.code:'Thêm nhân viên',wide:true,submitLabel:p.code?'Lưu thông tin':'Tạo nhân viên',body:`<div class="am-form-grid">${field('Họ và tên *','name',p.name,'required maxlength="100"')}${field('Số điện thoại','phone',p.phone,'maxlength="25"','tel')}${field('Địa chỉ','address',p.address,'maxlength="300"')}${selectField('Chức vụ / công việc','jobTitle',jobOptions,p.jobTitle||'')}${field('Ngày vào làm','startDate',p.startDate,'','date')}${selectField('Cách tính lương','payType',[['monthly','Lương theo tháng'],['hourly','Lương theo giờ']],p.payType||'monthly')}${field('Lương tháng (đ)','baseSalary',AtinoMoney.format(p.baseSalary||0),'data-money inputmode="numeric" min="0" max="1000000000"')}${field('Lương giờ (đ/giờ)','hourlyRate',AtinoMoney.format(p.hourlyRate||0),'data-money inputmode="numeric" min="0" max="10000000"')}</div><h3 class="amp-keyline">Tài khoản đăng nhập</h3><div class="am-form-grid">${field('Tên đăng nhập *','username',p.username,`${p.code?'readonly':'minlength="3"'} required maxlength="50" autocomplete="off"`)}${selectField('Quyền tài khoản','role',[['employee','Nhân viên'],['manager','Quản lý']],p.role||'employee',isSelf?'disabled':'')}${field(p.code?'Mật khẩu mới (bỏ trống để giữ)':'Mật khẩu (từ 8 ký tự) *','password','',`${p.code?'':'required'} minlength="8" maxlength="256" autocomplete="new-password"`,'password')}${activeField(p.active!==false,isSelf)}</div>`,onOpen(form){const update=()=>{const hourly=form.elements.payType.value==='hourly';form.elements.baseSalary.closest('label').hidden=hourly;form.elements.baseSalary.disabled=hourly;form.elements.hourlyRate.closest('label').hidden=!hourly;form.elements.hourlyRate.disabled=!hourly;};form.elements.payType.addEventListener('change',update);update();},onSubmit:async form=>{
      await E.saveEmployee({code:p.code,name:val(form,'name'),phone:val(form,'phone'),address:val(form,'address'),jobTitle:val(form,'jobTitle'),startDate:val(form,'startDate'),payType:val(form,'payType'),defaultShift:p.defaultShift||'',baseSalary:payrollAmount(form,'baseSalary',p.baseSalary),hourlyRate:payrollAmount(form,'hourlyRate',p.hourlyRate),username:val(form,'username'),password:form.elements.password.value,role:form.elements.role.value,active:form.elements.active.checked});
      await refreshSaved(p.code?'Đã cập nhật nhân viên.':'Đã tạo hồ sơ và tài khoản nhân viên.');
    }});
  }
  function scheduleText(code,date){
    const shifts=arr(M.data,'shifts').filter(s=>s.employeeId===code && s.date===date);
    return E.workSlots.filter(slot=>shifts.some(s=>E.matchesSlot(s,slot)))
      .map(slot=>slot.name+' · '+slot.start+'–'+slot.end);
  }
  function employeeTable(){const people=staffFiltered();return `<div class="am-table-wrap"><table class="am-table"><thead><tr><th>Nhân viên</th><th>Chức vụ</th><th>Lương cấu hình</th><th>Thời gian làm việc</th><th>Tài khoản</th><th>Thao tác</th></tr></thead><tbody>${people.length?people.map(p=>`<tr><td><div class="amp-person"><span class="amp-avatar">${esc((p.name||'NV').split(/\s+/).slice(-2).map(x=>x[0]).join('').toUpperCase())}</span><div><button type="button" class="am-text-btn" data-profile="${esc(p.code)}">${esc(p.name)}</button><small>${esc(p.code)}${p.phone?' · '+esc(p.phone):''}</small></div></div></td><td>${esc(p.jobTitle||'Chưa cập nhật')}<small class="amp-row-sub">${p.role==='manager'?'Quyền Quản lý':'Quyền Nhân viên'}</small></td><td>${p.payType==='hourly'?(p.hourlyRate?cash(p.hourlyRate)+' / giờ':'Chưa cấu hình'):(p.baseSalary?cash(p.baseSalary)+' / tháng':'Chưa cấu hình')}</td><td>${scheduleText(p.code,ui.workDate).map(text=>'<div>'+esc(text)+'</div>').join('')||'Chưa có lịch trong ngày'}<small class="amp-row-sub">Vào làm: ${esc(p.startDate?dateOnly(p.startDate):'Chưa cập nhật')}</small></td><td>${M.badge(p.active===false?'Đã khóa':'Đang hoạt động',p.active===false?'neutral':'green')}<small class="amp-row-sub">${esc(p.username)}</small></td><td><button type="button" class="am-btn secondary small" data-employee-edit="${esc(p.code)}">Xem / sửa</button></td></tr>`).join(''):`<tr><td colspan="6">${M.empty('Không tìm thấy nhân viên')}</td></tr>`}</tbody></table></div>`;}
  function salaryEstimate(month){
    const shifts=arr(M.data,'shifts').filter(s=>s.date?.startsWith(month));
    return M.data.staff.map(person=>{
      const hourly=person.payType==='hourly';
      let hours=0;
      let missingHours=false;
      for(const shift of shifts.filter(s=>s.employeeId===person.code)){
        if(shift.fullDay){missingHours=true;continue;}
        if(shift.status!=='completed')continue;
        const minutes=t=>Number(t.slice(0,2))*60+Number(t.slice(3,5));
        hours+=Math.max(0,minutes(shift.end)-minutes(shift.start))/60;
      }
      let amount=hourly?Math.round(hours*(person.hourlyRate||0)):(person.baseSalary||0);
      if(person.startDate?.slice(0,7)>month)amount=0;
      return {person,amount,hours,missingHours,basis:hourly?numberFormat(hours)+' giờ đã ghi nhận'+(missingHours?' · Chưa tính ngày làm thiếu số giờ':''):'Lương tháng'};
    });
  }
  function workingNow(now=new Date()){
    const time=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
    const slot=E.workSlots.find(s=>s.start<=time && time<s.end);
    if(!slot)return [];
    const day=E.today(now);
    const ids=new Set(M.data.shifts.filter(s=>s.date===day && E.matchesSlot(s,slot)).map(s=>s.employeeId));
    return M.data.staff.filter(p=>p.active!==false && ids.has(p.code));
  }
  function dayStaff(slot){
    const ids=new Set(arr(M.data,'shifts').filter(s=>s.date===ui.workDate && (!slot || E.matchesSlot(s,slot))).map(s=>s.employeeId));
    return M.data.staff.filter(p=>ids.has(p.code));
  }
  function editRoster(){
    const date=ui.workDate;
    const assigned=new Set(dayStaff().map(p=>p.code));
    const people=M.data.staff.filter(p=>p.active!==false || assigned.has(p.code));
    M.dialog({title:'Lịch làm việc · '+dateOnly(date),submitLabel:'Lưu lịch',body:E.workSlots.map(slot=>{
      const roster=new Set(dayStaff(slot).map(p=>p.code));
      return '<fieldset><legend>'+slot.name+' · '+slot.start+'–'+slot.end+'</legend>'+people.map(p=>
      '<label class="amp-check"><input type="checkbox" name="working" data-slot="'+slot.key+'" value="'+esc(p.code)+'" '+(roster.has(p.code)?'checked':'')+'>'+esc(p.name)+' · '+esc(p.code)+'</label>').join('')+'</fieldset>';}).join(''),
      onSubmit:async form=>{
        const changes=Array.from(form.querySelectorAll('[name="working"]')).filter(b=>b.checked!==b.defaultChecked).map(b=>({code:b.value,slot:b.dataset.slot,working:b.checked}));
        if(changes.length)await E.updateWorkDay({date,changes});
        await refreshSaved('Đã lưu lịch làm việc.');
      }});
  }
  function peopleFigure(button) {
    const key = button.dataset.figure;
    const title = button.querySelector('.am-stat-top').textContent;
    const customers = arr(M.data,'customers');
    if(key==='salary'){
      const month=ui.workDate.slice(0,7);
      const rows=salaryEstimate(month);
      M.dialog({title:'Dự toán lương tháng '+dateOnly(ui.workDate).slice(3),wide:true,body:'<div class="am-table-wrap"><table class="am-table"><thead><tr><th>Nhân viên</th><th>Cách tính</th><th>Dự toán</th></tr></thead><tbody>'+rows.map(r=>'<tr><td><button class="am-text-btn" type="button" data-person="'+esc(r.person.code)+'">'+esc(r.person.name)+'</button></td><td>'+esc(r.basis)+'</td><td>'+cash(r.amount)+'</td></tr>').join('')+'</tbody></table></div><button type="button" class="am-btn secondary" data-salary-export>Xuất Excel</button>',onOpen(form){
        form.querySelectorAll('[data-person]').forEach(b=>b.onclick=()=>M.showEmployeeProfile(b.dataset.person));
        form.querySelector('[data-salary-export]').onclick=event=>{
          const sheet=window.AtinoReports.salarySheet(month,rows);
          M.downloadWorkbook('Atino-du-toan-luong-'+month+'.xlsx',[sheet],event.currentTarget);
        };
      }});
      return;
    }
    if (key === 'spend') {
      const ids = new Set(customers.map(c => c.id));
      const docs = arr(M.data,'movements').filter(d => ids.has(d.customerId) && ['sale','exchange'].includes(d.type));
      return M.showInvoiceList(title, docs.sort((a,b)=>b.when-a.when), 'Chưa có giao dịch');
    }
    let rows, open;
    if (key === 'customers' || key === 'repeat') {
      rows = customers.filter(c => (key === 'customers' || c.orderCount >= 2))
        .map(c => [c.id,c.name,c.phone]);
      open = id => customerDetail(customers.find(c=>c.id===id));
    } else {
      const people=key==='working'?workingNow():M.data.staff;
      rows=people.map(p=>[p.code,p.name,p.code]);
      open=M.showEmployeeProfile;
    }
    M.dialog({title,body:rows.length ? '<div class="am-table-wrap"><table class="am-table"><tbody>'+rows.map(([id,name,value])=>
      '<tr><td><button type="button" class="am-text-btn" data-record="'+esc(id)+'">'+esc(name)+'</button></td><td>'+esc(value)+'</td></tr>').join('')+'</tbody></table></div>' : M.empty('Chưa có dữ liệu'),
      onOpen(form){form.querySelectorAll('[data-record]').forEach(b=>b.onclick=()=>open(b.dataset.record));}});
  }
  M.register('employees',{title:'Nhân viên',kicker:'Nhân sự cửa hàng',render(){
    ui.workDate ||= M.today();
    return '<div class="am-stat-grid">'+stat('working','Nhân viên đang làm',String(workingNow().length),'Theo lịch ca hiện tại')+stat('employees','Tổng số nhân viên',String(M.data.staff.length))+stat('salary','Tiền lương dự kiến',cash(salaryEstimate(ui.workDate.slice(0,7)).reduce((n,r)=>n+r.amount,0)),'Tháng '+dateOnly(ui.workDate).slice(3))+'</div>'+
      '<div class="am-panel">'+panelHead('Hồ sơ nhân viên','','<button class="am-btn secondary" data-roster>Cập nhật lịch làm</button><button class="am-btn" data-employee-add>Thêm nhân viên</button>')+
      '<div class="am-toolbar"><label>Ngày làm việc <input type="date" data-work-date value="'+esc(ui.workDate)+'"></label><input type="search" class="am-search" data-staff-query aria-label="Tìm nhân viên" placeholder="Tìm tên, mã, chức vụ…" value="'+esc(ui.staffQuery)+'"><select data-status aria-label="Trạng thái">'+[['all','Tất cả trạng thái'],['active','Đang hoạt động'],['inactive','Đã khóa']].map(([v,t])=>'<option value="'+v+'"'+selected(ui.staffStatus,v)+'>'+t+'</option>').join('')+'</select></div><div data-list>'+employeeTable()+'</div></div>';
  },bind(root){
    const update=()=>root.querySelector('[data-list]').innerHTML=employeeTable();
    root.querySelector('[data-work-date]').onchange=e=>{ui.workDate=e.target.value||M.today();M.go('employees');};
    root.querySelector('[data-status]').onchange=e=>{ui.staffStatus=e.target.value;update();};
    root.querySelector('[data-staff-query]').oninput=e=>{ui.staffQuery=e.target.value;update();};
    Search.attach(root.querySelector('[data-staff-query]'), {items: () => staffFiltered().map(s => ({value: s.code, label: s.name, detail: [s.code, s.jobTitle, s.phone].filter(Boolean).join(' · '), searchText: staffSearchText(s)})),onSelect:item=>M.showEmployeeProfile(item.value,item.label)});
    root.onclick=e=>{
      const b=e.target.closest('button');if(!b)return;
      if(b.dataset.figure)peopleFigure(b);
      if(b.dataset.profile)M.showEmployeeProfile(b.dataset.profile);
      if(b.hasAttribute('data-roster'))editRoster();
      if(b.hasAttribute('data-employee-add'))employeeForm();
      if(b.dataset.employeeEdit)employeeForm(M.data.staff.find(p=>p.code===b.dataset.employeeEdit));
    };
  }});
})();

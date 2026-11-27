(() => {
'use strict';
const ERP = window.AtinoERP;
const Search = window.AtinoSearch;
const Reports = window.AtinoReports;
const screens = new Map();
const number = new Intl.NumberFormat('vi-VN');
const currency = new Intl.NumberFormat('vi-VN', {style:'currency', currency:'VND', maximumFractionDigits:0});
const dayFormat = new Intl.DateTimeFormat('vi-VN', {dateStyle:'medium', timeZone:'Asia/Ho_Chi_Minh'});
const e = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const n = value => Number(value) || 0;
const paths = {
 overview:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 inventory:'<path d="m3 7 9-5 9 5v10l-9 5-9-5zM3 7l9 5 9-5M12 12v10M7.5 4.5l9 5"/>',
 stock:'<path d="M4 8V5h16v3M6 8v13h12V8M3 8h18M9 14h6M12 11v6"/>',
 receipts:'<path d="M4 14v7h16v-7M3 14h5l2 3h4l2-3h5M12 2v10m-4-4 4 4 4-4"/>',
 dispatches:'<path d="M4 14v7h16v-7M3 14h5l2 3h4l2-3h5M12 12V2m-4 4 4-4 4 4"/>',
 suppliers:'<path d="M2 4h13v13H2zM15 9h4l3 4v4h-7"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
 customers:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5"/>',
 employees:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M9 5V3h6v2M13 12h5M13 16h5"/><circle cx="8" cy="12" r="2"/><path d="M5 18a3 3 0 0 1 6 0"/>',
 returns:'<path d="M3 9h12a6 6 0 0 1 0 12h-3M3 9l4-4M3 9l4 4M12 3h8v8"/>',
 sales:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3"/>',
 settings:'<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M10 2h4l1 3 3 1 3 1v4l-2 2 1 3-2 3-3-1-2 2H9l-1-3-3-1-2-3 2-2V8l2-3 3 1z"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 download:'<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
 refresh:'<path d="M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 13 3M5 15a8 8 0 0 0 13 3"/>',
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 logout:'<path d="M10 4H4v16h6M9 12h12m-4-4 4 4-4 4"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 11h18M7 15h3M14 15h3"/>',
 chevron:'<path d="m9 5 7 7-7 7"/>',
 chevronDown:'<path d="m6 9 6 6 6-6"/>',
 wallet:'<path d="M20 7H4V4h15v3M4 7v14h17V7zM16 12h5v5h-5z"/>',
 shopping:'<path d="M5 7h14l2 14H3zM8 8V6a4 4 0 0 1 8 0v2"/>',
 alert:'<path d="m12 3 10 18H2zM12 9v5M12 17h.01"/>',
 edit:'<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14z"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
 tag:'<path d="M3 3h8l10 10-8 8L3 11z"/><circle cx="7" cy="7" r="1"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 backpack:'<path d="M8 5V4a4 4 0 0 1 8 0v1M6 5h12l2 4v12H4V9zM8 12h8v6H8zM4 11H2v7h2M20 11h2v7h-2"/>',
 cap:'<path d="M4 15v-3a8 8 0 0 1 16 0v3M4 15h16l2 3H9l-5-3zM12 4v10"/>',
 shoe:'<path d="M3 13V6l5 2 4 5 7 2a3 3 0 0 1 2 3v2H3v-7zM3 16h7M10 10l-2 2M12 12l-2 2"/>',
 belt:'<rect x="2" y="8" width="7" height="8" rx="2"/><path d="M9 10h13v4H9M5 12h6M16 12h.01M19 12h.01"/>',
 pants:'<path d="M6 3h12l2 18h-7l-1-11-1 11H4zM6 7h12M12 3v7"/>',
 shirt:'<path d="m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4M8 3q4 5 8 0"/>',
 bank:'<path d="m2 8 10-6 10 6H2M3 21h18M5 10v8M10 10v8M15 10v8M20 10v8"/>',
 gift:'<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13M12 8C5 8 5 2 8 3c3 0 4 5 4 5s1-5 4-5c3-1 3 5-4 5"/>'
};
const nav = [
 ['overview','Tổng quan','ĐIỀU HÀNH'],['inventory','Hàng hóa'],['receipts','Nhập kho'],['dispatches','Xuất kho'],['suppliers','Nhà cung cấp'],
 ['customers','Khách hàng','QUẢN LÝ'],['employees','Nhân viên & ca làm'],['returns','Đổi hàng'],['sales','Hóa đơn & doanh thu'],['audit','Nhật ký thao tác']
];
let app, view, renderToken = 0, toastTimer;
let inventoryFilters = {search:'',category:''};
const sizeThreshold = product => ERP.stockThreshold(M.data, product.code);
let supplierFilters = {search:'',status:'all'};
const M = window.AtinoManager = {
 data:null, route:'overview', period:'month', periodValue:ERP.today().slice(0,7), ERP,
 esc:e, money:value=>currency.format(n(value)), today:()=>ERP.today(),
 date:value=>{
  if (value === null || value === undefined || value === '') return '—';
  const parsed = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value+'T12:00:00+07:00') : new Date(value);
  return Number.isFinite(parsed.getTime()) ? dayFormat.format(parsed) : '—';
 },
 icon:name=>`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.overview}</svg>`,
 badge:(text,tone='neutral')=>`<span class="am-badge ${['green','amber','red','blue'].includes(tone)?tone:'neutral'}">${e(text)}</span>`,
 empty:(title,description='')=>`<div class="am-empty"><span class="am-empty-icon">${M.icon('inventory')}</span><strong>${e(title)}</strong>${description?`<p>${e(description)}</p>`:''}</div>`,
 invoiceLink:transactionCode,
 showInvoiceList(title,docs,empty,productCode=''){
  M.dialog({title,wide:true,body:transactionTable(docs,empty,false,productCode)});
 },
 register:(route,screen)=>screens.set(route,screen),
 async open(){
  buildShell();
  app.hidden=false;
  document.body.classList.add('manager-active');
  await M.refresh();
 },
 close(){
  ++renderToken;
  Search.close();
  document.body.classList.remove('manager-active');
  if(app){app.hidden=true;app.classList.remove('am-nav-open');app.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());}
  M.data=null;
 },
 async refresh(){
  const token=++renderToken;
  const refresh=app?.querySelector('[data-am-refresh]');
  if(refresh)refresh.disabled=true;
  try{
   const data=await ERP.snapshot();
   if(token!==renderToken)return;
   M.data={...data,stock:ERP.summarizeStock(data.balances)};
   render();
  }catch(error){
   if(!M.data&&view)view.innerHTML=M.empty('Chưa tải được dữ liệu',error.message);
   throw error;
  }finally{if(refresh)refresh.disabled=false;}
 },
 go(route){
  if(!screens.has(route)){M.toast('Mục này chưa tải xong. Vui lòng thử lại.');return;}
  M.route=route;
  if(app){app.classList.remove('am-nav-open');app.querySelector('[data-am-nav-toggle]')?.setAttribute('aria-expanded','false');}
  render();
  window.scrollTo({top:0,behavior:'instant'});
 },
 toast(message){
  buildShell();
  const box=app.querySelector('.am-toast');
  box.textContent=message;box.hidden=false;
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>{box.hidden=true;},4500);
 },
 dialog({title,body,submitLabel='Lưu',onSubmit,wide=false,onOpen}){
  buildShell();
  Search.close();
  const dialog=document.createElement('dialog');
  dialog.className='am-dialog'+(wide?' am-dialog-wide':'');
  const headingId='am-dialog-title-'+Math.random().toString(36).slice(2);
  dialog.setAttribute('aria-labelledby',headingId);
  dialog.innerHTML=`<form><header class="am-dialog-head"><h2 id="${headingId}">${e(title)}</h2><button type="button" class="am-icon-btn" data-am-cancel aria-label="Đóng">${M.icon('close')}</button></header><div class="am-dialog-body">${body}</div><div class="am-error" role="alert" hidden></div><footer class="am-dialog-foot"><button type="button" class="am-btn secondary" data-am-cancel>Đóng</button>${onSubmit?`<button type="submit" class="am-btn">${e(submitLabel)}</button>`:''}</footer></form>`;
  app.append(dialog);
  const previousFocus=document.activeElement;
  const form=dialog.querySelector('form');
  let busy=false;
  dialog.querySelectorAll('[data-am-cancel]').forEach(button=>button.addEventListener('click',()=>{if(!busy)dialog.close();}));
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  dialog.addEventListener('close',()=>{Search.close();dialog.remove();if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});},{once:true});
  form.addEventListener('submit',async event=>{
   event.preventDefault();if(busy||!onSubmit)return;
   const button=form.querySelector('button[type=submit]');
   const errorBox=dialog.querySelector('.am-error');
   errorBox.hidden=true;busy=true;
   const oldLabel=button?.textContent;
   if(button){button.disabled=true;button.textContent='Đang lưu…';}
   dialog.querySelectorAll('[data-am-cancel]').forEach(b=>b.disabled=true);
   try{const result=await onSubmit(form);if(result!==false&&dialog.open)dialog.close();}
   catch(error){errorBox.textContent=error.message||'Chưa thể lưu. Vui lòng thử lại.';errorBox.hidden=false;errorBox.scrollIntoView({block:'nearest'});}
   finally{busy=false;if(button){button.disabled=false;if(button.textContent==='Đang lưu…')button.textContent=oldLabel;}dialog.querySelectorAll('[data-am-cancel]').forEach(b=>b.disabled=false);}
  });
  dialog.showModal();
  if(onOpen)onOpen(form);
  return dialog;
 },
 downloadFile(filename, file){
  const url=URL.createObjectURL(file);
  const link=document.createElement('a');
  link.href=url;link.download=filename;
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
 },
 downloadTable(filename,title,rows,button,formats){
  return M.downloadWorkbook(filename+'.xlsx',[Reports.listSheet(title,rows,{formats})],button);
 },
 async downloadWorkbook(filename,sheets,button){
  button.disabled=true;
  try{
   M.downloadFile(filename,await window.AtinoWorkbook.create(sheets));
  }catch(error){
   M.toast('Chưa thể xuất Excel. '+error.message);
  }finally{
   button.disabled=false;
  }
 }
};
function buildShell(){
 if(app)return;
 app=document.createElement('div');app.id='manager-app';app.className='am';app.hidden=true;
 app.innerHTML=`<button type="button" class="am-nav-scrim" data-am-nav-close aria-label="Đóng menu"></button><aside class="am-sidebar"><div class="am-brand"><span class="am-brand-symbol">A</span><div><strong>ATINO</strong><span>Quản lý</span></div></div><nav class="am-navigation" aria-label="Quản lý cửa hàng">${nav.map(([route,title,group])=>`${group?`<div class="am-nav-group">${group}</div>`:''}<button type="button" data-am-route="${route}">${M.icon(route)}<span>${e(title)}</span></button>`).join('')}</nav><div class="am-sidebar-bottom"><span class="am-local-label">${M.icon('info')} Dữ liệu minh họa</span><button class="am-logout" type="button" data-am-logout>${M.icon('logout')}<span>Đăng xuất</span></button></div></aside><div class="am-workspace"><header class="am-topbar"><div class="am-topbar-left"><button type="button" class="am-icon-btn am-mobile-menu" data-am-nav-toggle aria-label="Mở menu" aria-expanded="false">${M.icon('menu')}</button><div class="am-breadcrumb"><span>Quản lý cửa hàng</span>${M.icon('chevron')}<strong data-am-breadcrumb>Tổng quan</strong></div></div><div class="am-topbar-right"><span class="am-top-date">${M.icon('calendar')}<span>${e(M.date(M.today()))}</span></span><button type="button" class="am-icon-btn" data-am-refresh title="Cập nhật số liệu" aria-label="Cập nhật số liệu">${M.icon('refresh')}</button><div class="am-user"><button type="button" class="am-avatar atino-avatar-button" data-am-avatar aria-label="Tài khoản" title="Tài khoản">QL</button><div><strong data-am-user>Quản lý</strong><span>Quản lý cửa hàng</span></div></div></div></header><main class="am-main"><div class="am-page-heading"><div><h1 data-am-title>Tổng quan cửa hàng</h1></div></div><div id="am-content" aria-live="polite"></div><footer class="am-footer"><span>ATINO · Hệ thống quản lý cửa hàng</span><span>Giờ Việt Nam · GMT+7</span></footer></main></div><div class="am-toast" role="status" hidden></div>`;
 document.body.append(app);view=app.querySelector('#am-content');
 app.addEventListener('click',event=>{
  const link=event.target.closest('[data-invoice-id]');
  if(link) M.showInvoice(link.dataset.invoiceId,link.dataset.invoiceProduct||'');
 });
 app.querySelectorAll('[data-am-route]').forEach(button=>button.addEventListener('click',()=>M.go(button.dataset.amRoute)));
 app.querySelector('[data-am-avatar]').addEventListener('click',()=>window.AtinoAccount.open());
 app.querySelector('[data-am-logout]').addEventListener('click',()=>document.getElementById('logout')?.click());
 app.querySelector('[data-am-refresh]').addEventListener('click',async()=>{try{await M.refresh();M.toast('Đã cập nhật số liệu.');}catch(error){M.toast(error.message);}});
 const toggle=app.querySelector('[data-am-nav-toggle]');
 toggle.addEventListener('click',()=>{const open=app.classList.toggle('am-nav-open');toggle.setAttribute('aria-expanded',String(open));});
 app.querySelector('[data-am-nav-close]').addEventListener('click',()=>{app.classList.remove('am-nav-open');toggle.setAttribute('aria-expanded','false');});
 app.addEventListener('keydown',event=>{if(event.key==='Escape'){app.classList.remove('am-nav-open');toggle.setAttribute('aria-expanded','false');}});
}
function render(){
 if(!app||!M.data)return;
 Search.close();
 const screen=screens.get(M.route)||screens.get('overview');
 app.querySelector('[data-am-title]').textContent=screen.title;
 app.querySelector('[data-am-breadcrumb]').textContent=nav.find(row=>row[0]===M.route)?.[1]||screen.title;
 app.querySelector('[data-am-user]').textContent=M.data.user?.name||'Quản lý';
 window.AtinoAccount?.paintAvatar(app.querySelector('[data-am-avatar]'),M.data.user);
 app.querySelectorAll('[data-am-route]').forEach(button=>{const active=button.dataset.amRoute===M.route;button.classList.toggle('active',active);if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
 const fresh=view.cloneNode(false);view.replaceWith(fresh);view=fresh;
 view.innerHTML=screen.render(M);
 if(screen.bind)screen.bind(view,M);
 view.querySelectorAll('[data-go]').forEach(button=>button.addEventListener('click',()=>M.go(button.dataset.go)));
 view.querySelectorAll('[data-am-create]').forEach(button=>button.addEventListener('click',()=>{
  const actions={receipt:['receipts','[data-op-stock-new="receipt"]'],dispatch:['dispatches','[data-op-stock-new="dispatch"]'],sale:['sales','[data-op-sale-new]']};
  const action=actions[button.dataset.amCreate];if(!action)return;
  M.go(action[0]);
  const target=view.querySelector(action[1]);
  if(target)target.click();else M.toast('Chưa mở được phiếu. Vui lòng chọn lại mục nghiệp vụ.');
 }));
}
function stat(label,value,iconName,description,accent=''){
 return `<article class="am-stat ${accent}"><div class="am-stat-top"><span>${e(label)}</span><span class="am-stat-icon">${M.icon(iconName)}</span></div><strong>${value}</strong>${description?`<p>${description}</p>`:''}</article>`;
}
function employeeRevenueTable(rows) {
 const headings=['Nhân viên','Hóa đơn bán','Phiếu đổi đã lập','Thực thu'];
 return `<section class="am-panel"><div class="am-panel-head"><h2>Doanh thu theo nhân viên</h2></div>${rows.length?`<div class="am-table-wrap"><table class="am-table"><thead><tr>${headings.map(value=>`<th>${value}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr><td><button type="button" class="am-text-btn" data-overview-employee="${e(row.code)}" data-employee-name="${e(row.name)}" aria-haspopup="dialog"><strong>${e(row.name)}</strong></button></td><td><button type="button" class="am-text-btn am-code" data-employee-sales="${e(row.code)}" data-employee-name="${e(row.name)}" aria-label="${e(row.sales)} hóa đơn bán của ${e(row.name)}" aria-haspopup="dialog">${number.format(row.sales)}</button></td><td><button type="button" class="am-text-btn am-code" data-employee-exchanges="${e(row.code)}" data-employee-name="${e(row.name)}" aria-label="${e(row.exchanges)} phiếu đổi của ${e(row.name)}" aria-haspopup="dialog">${number.format(row.exchanges)}</button></td><td>${M.money(row.revenue)}</td></tr>`).join('')}</tbody></table></div>`:M.empty('Chưa có giao dịch trong kỳ')}</section>`;
}
function currentMetrics(){return ERP.metrics(M.data,M.period,M.periodValue);}
function compactMoney(value){const num=n(value);return num>=1e9?number.format(Math.round(num/1e8)/10)+' tỷ':num>=1e6?number.format(Math.round(num/1e5)/10)+' tr':num>=1e3?number.format(Math.round(num/1e3))+'k':number.format(num);}
function revenueChart(buckets){
 const values=buckets||[];const width=780,height=260,top=24,left=78,right=20,bottom=44,plotH=height-top-bottom;
 const highest=Math.max(...values.map(bucket=>n(bucket.value)),0);
 const max=highest>0?highest*1.15:1000000;
 let markup='';
 for(let tick=0;tick<=4;tick++){const y=top+(plotH*tick/4);markup+=`<line x1="${left}" y1="${y}" x2="${width-right}" y2="${y}" stroke="#e9edf5" stroke-dasharray="3 4"/><text x="${left-12}" y="${y+4}" text-anchor="end" fill="#596a80" font-size="16">${e(compactMoney(max*(4-tick)/4))}</text>`;}
 const stride=(width-left-right)/Math.max(values.length,1);const barWidth=Math.max(4,Math.min(34,stride*.48));
 const labelStep=values.length>16?Math.ceil(values.length/10):1;
 values.forEach((bucket,i)=>{
  const value=n(bucket.value),barH=value/max*plotH,x=left+stride*i+stride/2-barWidth/2,y=top+plotH-barH;
  markup+=`<rect x="${x}" y="${value?y:top+plotH-2}" width="${barWidth}" height="${value?Math.max(barH,2):2}" rx="3" fill="${value?'url(#am-chart-fill)':'#e7eaf3'}"><title>${e(bucket.label)}: ${e(M.money(value))}</title></rect>`;
  if(i%labelStep===0||i===values.length-1){let label=String(bucket.label);if(/^\d{4}-\d{2}-\d{2}$/.test(label))label=label.slice(-2);else if(/^\d{4}-\d{2}$/.test(label))label='T'+Number(label.slice(-2));markup+=`<text x="${x+barWidth/2}" y="${height-12}" text-anchor="middle" fill="#596a80" font-size="16">${e(label)}</text>`;}
 });
 return `<div class="am-chart"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Biểu đồ doanh thu ${e(M.periodValue)}; tổng ${e(M.money(values.reduce((s,b)=>s+n(b.value),0)))}"><defs><linearGradient id="am-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5363e6"/><stop offset="1" stop-color="#8794f1"/></linearGradient></defs>${markup}</svg>${!highest?'<span class="am-chart-empty">Chưa có doanh thu trong kỳ này</span>':''}</div>`;
}
function overviewToolbar() {
 const inputType = M.period === 'month' ? 'month' : M.period === 'year' ? 'number' : 'date';
 const periods = [['day','Ngày'],['month','Tháng'],['year','Năm']];
 return `<div class="am-overview-toolbar">
  <div class="am-period-control">
   <div class="am-segment" role="group" aria-label="Kỳ thống kê">
    ${periods.map(([key,label])=>`<button type="button" data-period="${key}" class="${M.period===key?'selected':''}" aria-pressed="${M.period===key}">${label}</button>`).join('')}
   </div>
   <label class="am-period-input">${M.icon('calendar')}<input type="${inputType}" id="am-period-value" aria-label="Chọn kỳ thống kê" value="${e(M.periodValue)}" ${M.period==='year'?'min="2000" max="2100" step="1"':''}></label>
  </div>
  <button type="button" class="am-btn" id="am-export-report">${M.icon('download')} Xuất báo cáo Excel</button>
 </div>`;
}
function overviewCard(label, value, icon, key, summary, featured = false) {
 return `<button type="button" class="am-stat am-overview-card ${featured?'featured':''}" data-overview-view="${key}" aria-haspopup="dialog">
  <span class="am-stat-top"><span>${label}</span><span class="am-stat-icon">${M.icon(icon)}</span></span>
  <strong>${value}</strong>
  <span class="am-overview-card-foot"><span>${summary}</span>${M.icon('chevron')}</span>
 </button>`;
}
function transactionCode(id,productCode='') {
 if(!id)return '—';
 return `<button type="button" class="am-text-btn am-code" data-invoice-id="${e(id)}" ${productCode?'data-invoice-product="'+e(productCode)+'"':''} aria-haspopup="dialog">${e(id)}</button>`;
}
function overviewTable(headers, rows, empty) {
 if (!rows.length) return M.empty(empty);
 return `<div class="am-table-wrap"><table class="am-table am-overview-table">
  <thead><tr>${headers.map(header=>`<th scope="col">${header}</th>`).join('')}</tr></thead>
  <tbody>${rows.join('')}</tbody>
 </table></div>`;
}
const transactionTime = new Intl.DateTimeFormat('vi-VN', {dateStyle:'short', timeStyle:'short', timeZone:'Asia/Ho_Chi_Minh'});
function transactionMoment(when) {
 if(when==null || when==='')return 'Chưa ghi nhận';
 const time=new Date(when);
 return Number.isFinite(time.getTime())?transactionTime.format(time):'Chưa ghi nhận';
}
function transactionTable(docs, empty, showSeller = false, productCode = '') {
 return overviewTable(['Mã giao dịch','Ngày giờ lập',showSeller?'Người bán':'Người thực hiện','Thanh toán','Thực thu','Tình trạng'], docs.map(doc=>`<tr>
  <td>${transactionCode(doc.id,productCode)}</td>
  <td class="am-nowrap">${e(transactionMoment(doc.when))}</td>
  <td>${e((showSeller?doc.sellerName:doc.employeeName) || 'Chưa ghi nhận')}</td>
  <td>${e(ERP.paymentMethod(doc))}</td>
  <td class="am-right am-nowrap"><strong>${M.money(ERP.documentPaidTotal(doc))}</strong></td>
  <td>${M.badge(ERP.transactionStatus(doc),doc.type==='exchange'?'blue':'green')}</td>
 </tr>`), empty);
}
function showEmployeeSales(code, name, type = 'sale') {
 const isExchange = type === 'exchange';
 const label = isExchange ? 'Phiếu đổi hàng' : 'Hóa đơn bán';
 const unit = isExchange ? 'phiếu đổi' : 'hóa đơn';
 const invoices = currentMetrics().transactions.filter(doc=>{
  if (doc.type !== type) return false;
  const owner = ERP.revenueEmployee(doc);
  if (code) return owner.code === code;
  return !owner.code && (owner.name || 'Chưa ghi nhận') === name;
 });
 const total = invoices.reduce((sum,doc)=>sum+ERP.documentPaidTotal(doc),0);
 const period = Reports.periodLabel(M.period,M.periodValue);
 M.dialog({title:label+' · '+name,wide:true,
  body:`<div class="am-figure-summary"><span>${e(period)}</span><strong>${number.format(invoices.length)} ${unit} · ${isExchange?'Thu chênh lệch ':''}${M.money(total)}</strong></div>${transactionTable(invoices,'Nhân viên chưa có '+label.toLocaleLowerCase('vi')+' trong kỳ này',!isExchange)}`
 });
}
function showOverviewTransactions(key) {
 const metrics = currentMetrics();
 const period = Reports.periodLabel(M.period,M.periodValue);
 let title, summary, table;
 if (key === 'sold') {
  title = 'Sản phẩm đã bán';
  summary = number.format(metrics.unitsSold) + ' sản phẩm trên ' + number.format(metrics.orderCount) + ' hóa đơn';
  table = overviewTable(['Hóa đơn','Ngày giờ lập','Sản phẩm','Kích cỡ','Số lượng','Thực trả'], metrics.soldItems.map(item=>`<tr>
   <td>${transactionCode(item.invoiceId,item.code)}</td><td class="am-nowrap">${e(transactionMoment(item.when))}</td>
   <td><strong>${e(item.name || item.code)}</strong><small class="am-unit">${e(item.code)}</small></td><td>${e(item.size)}</td>
   <td class="am-right">${number.format(item.qty)}</td><td class="am-right am-nowrap">${M.money(item.paidTotal)}</td>
  </tr>`), 'Chưa có sản phẩm bán trong kỳ');
 } else if (key === 'exchange') {
  title = 'Giao dịch đổi hàng';
  summary = number.format(metrics.exchangeCount) + ' phiếu · Thu chênh lệch ' + M.money(metrics.exchangePaid);
  table = transactionTable(metrics.exchanges,'Chưa có giao dịch đổi hàng trong kỳ');
 } else {
  title = 'Chi tiết doanh thu thực thu';
  summary = M.money(metrics.revenue) + ' · ' + number.format(metrics.orderCount) + ' hóa đơn bán · ' + number.format(metrics.exchangeCount) + ' phiếu đổi';
  table = transactionTable(metrics.transactions,'Chưa có giao dịch trong kỳ');
 }
 M.dialog({title,wide:true,
  body:`<div class="am-figure-summary"><span>${e(period)}</span><strong>${e(summary)}</strong></div>${table}`
 });
}
function renderAttention(issues) {
 const emptyCount=issues.warnings.filter(row=>row.status==='Hết hàng').length;
 const missingCount=issues.warnings.filter(row=>row.status==='Hết size').length;
 const lowCount=issues.warnings.length-emptyCount-missingCount;
 const breakdown=[emptyCount+' hết hàng',missingCount+' thiếu size',lowCount+' sắp hết'].join(' · ');
 const entries=[
  ['warnings','Danh mục sản phẩm cảnh báo',issues.warnings.length,'mặt hàng','inventory','amber'],
  ['aging','Hàng lâu chưa bán',issues.aging.length,'mặt hàng','clock','pink']
 ];
 return `<section class="am-panel am-task-panel">
  <div class="am-panel-head"><h2>Việc cần chú ý</h2><span class="am-panel-icon">${M.icon('alert')}</span></div>
  ${entries.map(([key,label,count,unit,icon,tone])=>`<button type="button" class="am-attention" data-stock-issue="${key}" aria-haspopup="dialog">
   <span class="am-attention-icon ${tone}">${M.icon(icon)}</span>
   <span><strong>${label}</strong><small>${number.format(count)} ${unit}${key==='aging'?' · Từ '+issues.agingDays+' ngày':' · '+breakdown}</small></span>
   ${M.icon('chevron')}
  </button>`).join('')}
  <div class="am-quick-actions">
   <button class="am-btn" type="button" data-am-create="receipt">${M.icon('receipts')} Nhập kho</button>
   <button class="am-btn secondary" type="button" data-am-create="dispatch">${M.icon('dispatches')} Xuất kho</button>
   <button class="am-btn secondary" type="button" data-am-create="sale">${M.icon('sales')} Tạo hóa đơn</button>
  </div>
 </section>`;
}
const warningGroups = [
 {key:'empty', title:'Hết hàng'},
 {key:'missing', title:'Đã hết một số size'},
 {key:'low', title:'Sắp hết'}
];
function warningGroup(row) {
 if (row.status === 'Hết hàng') return 'empty';
 if (row.status === 'Hết size') return 'missing';
 return 'low';
}
function warningSizeLines(row) {
 if (row.qty <= 0) return '';
 const empty = row.sizes.filter(size=>size.total <= 0);
 const low = row.sizes.filter(size=>size.total > 0).sort((a,b)=>a.total-b.total);
 let details = '';
 if (empty.length) details += '<p class="am-size-out"><strong>Hết size</strong> '+empty.map(size=>e(size.size)).join(', ')+'</p>';
 if (low.length) {
  const quantities = low.map(size=>e(size.size)+' còn <b>'+number.format(size.total)+'</b>');
  details += '<p class="am-size-low-line"><strong>Size sắp hết</strong> '+quantities.join(' · ')+'</p>';
 }
 return details;
}
function warningDirectory(warnings, productLink) {
 if (!warnings.length) return M.empty('Không có sản phẩm sắp hết hoặc hết hàng');
 const filters = ['<button type="button" data-warning-filter="all" aria-pressed="true">Tất cả ('+number.format(warnings.length)+')</button>'];
 const sections = [];
 for (const group of warningGroups) {
  const rows = warnings.filter(row=>warningGroup(row) === group.key);
  if (!rows.length) continue;
  filters.push(`<button type="button" data-warning-filter="${group.key}" aria-pressed="false">${group.title} (${number.format(rows.length)})</button>`);
  const products = rows.map(row=>`<li><div>${productLink(row.product)}${warningSizeLines(row)}</div>
   <div class="am-warning-qty"><small>Số lượng trong cửa hàng</small><strong>${number.format(row.qty)} ${e(productUnit(row.product))}</strong></div></li>`);
  sections.push(`<section class="am-warning-group" data-warning-group="${group.key}"><header><h3>${group.title}</h3><span>${number.format(rows.length)} mặt hàng</span></header><ul>${products.join('')}</ul></section>`);
 }
 return `<div class="am-warning-filters" role="group" aria-label="Lọc cảnh báo">${filters.join('')}</div>${sections.join('')}`;
}
function showStockIssue(key) {
 const {warnings, aging, agingDays} = ERP.stockAttention(M.data);
 const productLink = product=>`<button type="button" class="am-text-btn" data-stock-product="${e(product.code)}"><strong>${e(product.name)}</strong><small>${e(product.code)}</small></button>`;
 let title, table, rule = '';
 if (key === 'warnings') {
  title = 'Danh mục sản phẩm cảnh báo';
  table = warningDirectory(warnings,productLink);
 } else {
  title = 'Hàng lâu chưa bán';
  rule = `<p class="am-note">Hàng còn trong cửa hàng và đã qua ít nhất ${agingDays} ngày kể từ lần nhập hoặc lần bán gần nhất.</p>`;
  const rows = aging.map(({product,qty,lastReceived,lastSold,days})=>`<tr>
   <td>${productLink(product)}</td><td class="am-right">${number.format(qty)} ${e(productUnit(product))}</td>
   <td>${e(M.date(lastReceived))}</td><td>${lastSold == null?'Chưa bán':e(M.date(lastSold))}</td>
   <td class="am-right">${number.format(days)} ngày</td>
  </tr>`);
  table = overviewTable(['Sản phẩm','Số lượng trong cửa hàng','Nhập gần nhất','Bán gần nhất','Số ngày chưa bán'],rows,'Chưa có mặt hàng lâu chưa bán');
 }
 M.dialog({title,wide:true,body:rule+table,onOpen(form){
  const filters = form.querySelectorAll('[data-warning-filter]');
  filters.forEach(button=>button.addEventListener('click',()=>{
   for (const filter of filters) filter.setAttribute('aria-pressed',String(filter===button));
   for (const section of form.querySelectorAll('[data-warning-group]')) {
    section.hidden = button.dataset.warningFilter !== 'all' && button.dataset.warningFilter !== section.dataset.warningGroup;
   }
  }));
  form.querySelectorAll('[data-stock-product]').forEach(button=>button.addEventListener('click',()=>showProduct(button.dataset.stockProduct)));
 }});
}
function topProductsPanel(products) {
 return `<section class="am-panel">
  <div class="am-panel-head"><div><h2>Sản phẩm bán tốt</h2></div><button class="am-btn ghost small" type="button" data-top-products aria-haspopup="dialog">Xem chi tiết</button></div>
  ${products.length?`<div class="am-top-products">${products.slice(0,5).map((product,i)=>`<div class="am-top-product"><span class="am-product-rank">${String(i+1).padStart(2,'0')}</span>${productArt(product)}<div><strong>${e(product.name)}</strong><small>${e(product.code)}</small></div><span><strong>${number.format(n(product.qty))} sản phẩm</strong><small>${M.money(product.revenue)}</small></span></div>`).join('')}</div>`:M.empty('Chưa có sản phẩm bán trong kỳ')}
 </section>`;
}
function showTopProducts() {
 const metrics = currentMetrics();
 const products = metrics.topProducts.map((product,index)=>({...product,rank:index+1}));
 const period = Reports.periodLabel(M.period,M.periodValue);
 M.dialog({title:'Chi tiết sản phẩm bán tốt',wide:true,
  body:`<div class="am-bestsellers-toolbar">
   <p class="am-note">${e(period)} · Xếp theo số lượng bán giảm dần</p>
   <label class="am-search">${M.icon('search')}<input type="search" data-top-search aria-label="Tìm sản phẩm bán tốt" placeholder="Tìm mã hoặc tên sản phẩm…"></label>
   <p class="am-note" data-top-count role="status" aria-live="polite"></p>
  </div><div class="am-bestsellers-results" data-top-results role="region" aria-label="Danh sách sản phẩm bán tốt" tabindex="0"></div>`,
  onOpen(form){
   form.closest('dialog').classList.add('am-bestsellers-dialog');
   const query = form.querySelector('[data-top-search]');
   const results = form.querySelector('[data-top-results]');
   const count = form.querySelector('[data-top-count]');
   const draw = ()=>{
    const filtered = products.filter(product=>Search.match([product.code,product.name],query.value));
    count.textContent = `${number.format(filtered.length)} / ${number.format(products.length)} mặt hàng`;
    results.innerHTML = overviewTable(['Hạng','Sản phẩm','Số lượng bán','Doanh thu'],filtered.map(product=>`<tr>
     <td>${number.format(product.rank)}</td>
     <td><button type="button" class="am-text-btn" data-product-sales="${e(product.code)}" aria-haspopup="dialog"><strong>${e(product.name)}</strong><small>${e(product.code)}</small></button></td>
     <td class="am-right">${number.format(product.qty)}</td>
     <td class="am-right am-nowrap">${M.money(product.revenue)}</td>
    </tr>`),products.length?'Không tìm thấy sản phẩm phù hợp':'Chưa có sản phẩm bán trong kỳ');
    results.scrollTop = 0;
   };
   const openSales=code=>{
    const product=products.find(row=>row.code===code);
    if(!product)return;
    const invoices=metrics.transactions.filter(doc=>doc.type==='sale' && (doc.items||[]).some(line=>line.code===code));
    M.showInvoiceList('Hóa đơn bán · '+product.name,invoices,'Chưa có hóa đơn bán trong kỳ',code);
   };
   results.addEventListener('click',event=>{
    const link=event.target.closest('[data-product-sales]');
    if(link)openSales(link.dataset.productSales);
   });
   query.addEventListener('input',draw);
   Search.attach(query,{items:()=>products.map(product=>({
    value:product.code,label:product.name,
    detail:`${product.code} · Đã bán ${number.format(product.qty)} sản phẩm`,
    searchText:[product.code,product.name]
   })),onSelect:item=>openSales(item.value)});
   draw();
  }
 });
}
function paymentPanel(cash, bank) {
 const total = cash + bank, cashPercent = total ? cash / total * 100 : 0;
 return `<section class="am-panel">
  <div class="am-panel-head"><div><h2>Phương thức thanh toán</h2></div>${M.icon('bank')}</div>
  <div class="am-payment-total"><span>Tổng đã thu</span><strong>${M.money(total)}</strong></div>
  <div class="am-payment-bar" role="img" aria-label="Tiền mặt ${e(M.money(cash))}, chuyển khoản ${e(M.money(bank))}"><i style="width:${cashPercent}%"></i><i style="width:${total?100-cashPercent:0}%"></i></div>
  <div class="am-payment-row"><span><i class="cash"></i>Tiền mặt</span><strong>${M.money(cash)}</strong></div>
  <div class="am-payment-row"><span><i class="bank"></i>Chuyển khoản</span><strong>${M.money(bank)}</strong></div>
 </section>`;
}
M.register('overview',{
 title:'Tổng quan cửa hàng',
 render(){
  const s=currentMetrics(), stock=M.data.stock.total;
  const issues=ERP.stockAttention(M.data);
  return `${overviewToolbar()}
   <div class="am-stat-grid am-overview-cards">
    ${overviewCard('Doanh thu thực thu',M.money(s.revenue),'wallet','revenue',number.format(s.orderCount)+' hóa đơn bán',true)}
    ${overviewCard('Sản phẩm đã bán',number.format(s.unitsSold)+' <small>sản phẩm</small>','shopping','sold','Xem từng dòng hóa đơn')}
    ${overviewCard('Số lượng trong cửa hàng',number.format(stock)+' <small>sản phẩm</small>','inventory','stock','Xem số lượng theo sản phẩm')}
   </div>
   <div class="am-dashboard-main">
    <section class="am-panel am-revenue-panel">
     <div class="am-panel-head"><h2>Biểu đồ doanh thu</h2></div>
     ${revenueChart(s.buckets)}
     <button type="button" class="am-attention am-exchange-overview" data-overview-view="exchange" aria-haspopup="dialog">
      <span class="am-attention-icon blue">${M.icon('returns')}</span>
      <span><strong>Giao dịch đổi hàng</strong><small>${number.format(s.exchangeCount)} phiếu · Thu chênh lệch ${M.money(s.exchangePaid)}</small></span>
      ${M.icon('chevron')}
     </button>
    </section>
    ${renderAttention(issues)}
   </div>
   <div class="am-grid am-dashboard-lower">${topProductsPanel(s.topProducts)}${paymentPanel(s.cash,s.bank)}</div>
   ${employeeRevenueTable(s.employeeRevenue)}
   <section class="am-panel">
    <div class="am-panel-head"><h2>Giao dịch gần đây</h2><button class="am-btn ghost small" type="button" data-go="sales">Xem hóa đơn</button></div>
    ${transactionTable(s.transactions.slice(0,5),'Chưa có giao dịch trong kỳ')}
   </section>`;
 },
 bind(root){
  root.querySelectorAll('[data-overview-view]').forEach(button=>button.addEventListener('click',()=>{
   const key=button.dataset.overviewView;
   if(key==='stock') showStoreQuantities();
   else showOverviewTransactions(key);
  }));
  root.querySelectorAll('[data-stock-issue]').forEach(button=>button.addEventListener('click',()=>showStockIssue(button.dataset.stockIssue)));
  root.querySelector('[data-top-products]').addEventListener('click',showTopProducts);
  root.querySelectorAll('[data-overview-employee]').forEach(button=>button.addEventListener('click',()=>M.showEmployeeProfile(button.dataset.overviewEmployee,button.dataset.employeeName)));
  root.querySelectorAll('[data-employee-sales]').forEach(button=>button.addEventListener('click',()=>showEmployeeSales(button.dataset.employeeSales,button.dataset.employeeName)));
  root.querySelectorAll('[data-employee-exchanges]').forEach(button=>button.addEventListener('click',()=>showEmployeeSales(button.dataset.employeeExchanges,button.dataset.employeeName,'exchange')));
  root.querySelectorAll('[data-period]').forEach(button=>button.addEventListener('click',()=>{
   M.period=button.dataset.period;M.periodValue=M.today().slice(0,M.period==='year'?4:M.period==='month'?7:10);render();
  }));
  root.querySelector('#am-period-value').addEventListener('change',event=>{if(!event.target.value||!event.target.checkValidity())return;M.periodValue=event.target.value;render();});
  root.querySelector('#am-export-report').addEventListener('click',event=>{
   const sheets=Reports.overviewSheets(M.data,currentMetrics(),M.period,M.periodValue);
   M.downloadWorkbook('Atino-bao-cao-'+M.periodValue+'.xlsx',sheets,event.currentTarget);
  });
 }
});
function productUnit(product){return window.AtinoCatalog?.unitFor(product)||'sản phẩm';}
function productIcon(product){
 const category=String(product?.category||M.data?.products?.find(row=>row.code===product?.code)?.category||'').toLocaleLowerCase('vi');
 if(/balo|túi/.test(category))return 'backpack';
 if(/giày|dép|tất/.test(category))return 'shoe';
 if(/mũ/.test(category))return 'cap';
 if(/dây lưng/.test(category))return 'belt';
 if(/quần/.test(category))return 'pants';
 return 'shirt';
}
function productArt(product, large = false){
 const photo = imageUrl(product.image);
 const content = photo ? `<img src="${e(photo)}" alt="" loading="lazy">` : M.icon(productIcon(product));
 return `<span class="am-product-art${large ? ' large' : ''}">${content}</span>`;
}
const emptyStock = {total:0,sizes:[]};
function productStock(product){return M.data.stock.byProduct.get(product.code) ?? emptyStock;}
function productQuantity(product){return productStock(product).total;}
function sizeNeedsReplenishment(product){
 return ERP.lowStockSizes(M.data, product, productStock(product));
}
function pendingReceipt(doc){return doc.type==='receipt'&&(doc.costStatus==='pending'||doc.items?.some(item=>!Number.isFinite(item.unitPrice)||item.unitPrice<=0));}
function receiptValue(doc){return pendingReceipt(doc)?null:doc.items.reduce((sum,item)=>sum+n(item.qty)*n(item.unitPrice),0);}
function filteredProducts(){
 const {search,category}=inventoryFilters;
 return M.data.products.filter(product=>(!category || product.category===category) && Search.match([product.name,product.code,product.category],search));
}
function goodsProductLink(product){
 return `<button type="button" class="am-product-link" data-product-view="${e(product.code)}" aria-haspopup="dialog">${productArt(product)}<span><strong>${e(product.name)}</strong><small>${e(product.code)}</small></span></button>`;
}
function monthlySalesBadge(qty){
 if(qty>30) return M.badge('Bán chạy','green');
 if(qty<5) return M.badge('Bán chậm','amber');
 return M.badge('Bán ổn định','blue');
}
function inventoryRows(){
 const products=filteredProducts();
 if(!products.length) return M.empty('Không tìm thấy sản phẩm');
 const sold=ERP.monthlyUnitsSold(M.data.movements);
 const rows=products.map(product=>{
  const qty=sold.get(product.code)||0;
  return `<tr><td>${goodsProductLink(product)}</td><td>${e(product.category)}</td>
   <td class="am-right am-stock-qty"><strong>${number.format(productQuantity(product))}</strong></td>
   <td class="am-right am-nowrap">${M.money(product.price)}</td>
   <td>${monthlySalesBadge(qty)}<small class="am-sales-quantity">Đã bán ${number.format(qty)} ${e(productUnit(product))}</small></td></tr>`;
 });
 return `<table class="am-table am-inventory-table"><thead><tr><th>Sản phẩm</th><th>Danh mục</th><th class="am-right">Số lượng trong cửa hàng</th><th class="am-right">Giá bán</th><th>Sức bán trong tháng</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}
function inventoryFigures(){
 const products=M.data.products;
 const lowSizes=[], empty=[];
 for(const product of products){
  if(product.active===false) continue;
  if(productQuantity(product)<=0) empty.push(product);
  else for(const size of sizeNeedsReplenishment(product)) lowSizes.push({product,size});
 }
 lowSizes.sort((a,b)=>a.size.total-b.size.total || a.product.code.localeCompare(b.product.code));
 return {products,lowSizes,empty};
}
function showStoreQuantities(){
 const products=M.data.products.filter(product=>productQuantity(product)!==0);
 const rows=products.map(product=>`<tr><td><button type="button" class="am-text-btn am-quantity-link" data-quantity-code="${e(product.code)}" aria-haspopup="dialog">${e(product.name)}</button></td><td>${number.format(productQuantity(product))}</td></tr>`);
 M.dialog({title:'Số lượng trong cửa hàng',body:'<div class="am-quantity-list">'+overviewTable(['Tên sản phẩm','Tổng số lượng'],rows,'Cửa hàng chưa có hàng')+'</div>',onOpen(form){
  form.querySelectorAll('[data-quantity-code]').forEach(button=>button.addEventListener('click',()=>{
   const product=products.find(row=>row.code===button.dataset.quantityCode);
   const stock=productStock(product);
   const sizes=stock.sizes.map(size=>`<tr><td>${e(size.size)}</td><td>${number.format(size.total)}</td></tr>`);
   M.dialog({title:product.name,body:`<div class="am-quantity-detail"><div class="am-quantity-summary"><span>${e(product.code)}</span><strong>Tổng số lượng&nbsp; ${number.format(stock.total)}</strong></div>${overviewTable(['Kích cỡ','Số lượng'],sizes,'Chưa có kích cỡ')}</div>`});
  }));
 }});
}
function showInventoryFigure(key,figures){
 if(key==='available') return showStoreQuantities();
 const {products,lowSizes,empty}=figures;
 let headers,rows,title,emptyMessage;
 if(key==='low-sizes'){
  title='Kích cỡ cần bổ sung';
  headers=['Sản phẩm','Kích cỡ','Số lượng còn','Tình trạng kích cỡ'];
  rows=lowSizes.map(({product,size})=>`<tr><td>${goodsProductLink(product)}</td><td>${e(size.size)}</td><td>${number.format(size.total)}</td>
   <td>${size.total<=0?M.badge('Hết size','red'):M.badge('Sắp hết size','amber')}</td></tr>`);
  emptyMessage='Chưa có kích cỡ cần bổ sung';
 }else{
  const soldOut=key==='sold-out';
  title=soldOut?'Sản phẩm hết hàng':'Sản phẩm';
  headers=['Sản phẩm','Danh mục','Số lượng trong cửa hàng'];
  rows=(soldOut?empty:products).map(product=>`<tr><td>${goodsProductLink(product)}</td>
   <td>${e(product.category)}</td><td>${number.format(productQuantity(product))}</td></tr>`);
  emptyMessage=soldOut?'Không có sản phẩm hết hàng':'Chưa có sản phẩm';
 }
 M.dialog({title,wide:true,body:overviewTable(headers,rows,emptyMessage),onOpen:bindInventoryRows});
}
function bindInventoryRows(root){
 root.querySelectorAll('[data-product-view]').forEach(button=>button.addEventListener('click',()=>showProduct(button.dataset.productView)));
}
function updateInventoryRows(root){
 const results=root.querySelector('#am-inventory-results');
 results.innerHTML=inventoryRows();
 root.querySelector('#am-inventory-count').textContent=number.format(filteredProducts().length)+' sản phẩm';
 bindInventoryRows(results);
}
function editProduct(code){
 const product=M.data.products.find(row=>row.code===code)||{};
 const cats=[...new Set([...(ERP.categories||window.AtinoCatalog?.categories||['Áo phông','Áo polo','Quần âu','Quần jean','Áo khoác','Túi / Balo','Giày / Dép','Mũ']),...M.data.products.map(row=>row.category)])];
 const chosenCategory=product.category||cats[0];
 const unique=values=>[...new Set(values.map(value=>String(value||'').trim()).filter(Boolean))];
 const categorySizes=category=>unique(ERP.sizesFor?.(category)||['Một cỡ']);
 const declared=unique(product.sizes||ERP.sizesFor?.(code?product:chosenCategory)||categorySizes(chosenCategory));
 const historical=code?unique([...(M.data.balances||[]).filter(row=>row.code===code).map(row=>row.size),...(M.data.movements||[]).flatMap(doc=>[...(doc.items||[]),...(doc.returnedItems||[])]).filter(row=>row.code===code).map(row=>row.size)]).filter(size=>size!=='Chưa phân size'||declared.includes(size)):[];
 const existingSizes=unique([...declared,...historical]);
 let selectedSizes=new Set(existingSizes),currentCategory=chosenCategory;
 const categorySelections=new Map([[chosenCategory,new Set(selectedSizes)]]);
 const choicesFor=category=>unique([...categorySizes(category),...(code?existingSizes:[]),...selectedSizes]);
 const choicesHtml=category=>choicesFor(category).map(size=>`<label class="am-size-choice"><input type="checkbox" name="sizes" value="${e(size)}" data-size-choice ${selectedSizes.has(size)?'checked':''}><span>${e(size)}</span></label>`).join('');
 const labelFields=window.AtinoLabels.fields.map(([key,label,limit])=>{
  const value=e(product.labelInfo?.[key]||'');
  const control=key==='care'?`<textarea name="tag-${key}" maxlength="${limit}" rows="3">${value}</textarea>`:`<input name="tag-${key}" maxlength="${limit}" value="${value}" ${key==='year'?'inputmode="numeric" pattern="[0-9]{4}"':''}>`;
  return `<label class="am-field">${label}${control}</label>`;
 }).join('');
 const selectedValues=form=>[...form.querySelectorAll('[data-size-choice]:checked')].map(input=>input.value);
 M.dialog({title:code?'Chỉnh sửa sản phẩm · '+code:'Thêm sản phẩm',wide:true,body:`<div class="am-form-grid"><label class="am-field am-span-2">Tên sản phẩm<input name="name" required maxlength="120" value="${e(product.name)}" placeholder="Tên sản phẩm"></label><label class="am-field">Danh mục<select name="category">${cats.map(cat=>`<option ${cat===chosenCategory?'selected':''}>${e(cat)}</option>`).join('')}</select></label><label class="am-field">Giá bán (đ)<input type="number" name="price" min="1" max="1000000000" step="1" required value="${product.price||''}"></label><fieldset class="am-size-picker am-span-2"><legend>Kích cỡ</legend><div class="am-size-options" data-size-options>${choicesHtml(chosenCategory)}</div><label class="am-check am-size-other-toggle"><input type="checkbox" name="customSizesEnabled"> Kích cỡ khác</label><label class="am-field" data-custom-sizes-field hidden>Tên kích cỡ<input name="customSizes" maxlength="1200" disabled placeholder="XS, XXXL, 45"></label></fieldset><label class="am-field am-span-2">Ảnh sản phẩm<input type="file" name="productImage" accept="image/jpeg,image/png,image/webp"></label>${product.image?'<label class="am-check am-span-2"><input type="checkbox" name="removeImage"> Xóa ảnh sản phẩm</label>':''}<label class="am-field am-span-2">Mô tả<textarea name="description" rows="3" maxlength="1000">${e(product.description)}</textarea></label><details class="am-span-2"><summary>Thông tin trên tem</summary><div class="am-form-grid">${labelFields}</div></details><label class="am-check am-span-2"><input type="checkbox" name="active" ${product.active!==false?'checked':''}> Đang kinh doanh</label></div>`,onOpen:form=>{
  const host=form.querySelector('[data-size-options]'),custom=form.elements.customSizes,customToggle=form.elements.customSizesEnabled;
  host.addEventListener('change',()=>{selectedSizes=new Set(selectedValues(form));categorySelections.set(currentCategory,new Set(selectedSizes));});
  form.elements.category.addEventListener('change',()=>{
   selectedSizes=new Set(selectedValues(form));categorySelections.set(currentCategory,new Set(selectedSizes));
   currentCategory=form.elements.category.value;
   if(!code)selectedSizes=new Set(categorySelections.get(currentCategory)||categorySizes(currentCategory));
   host.innerHTML=choicesHtml(currentCategory);
  });
  const updateCustom=()=>{const enabled=customToggle.checked;form.querySelector('[data-custom-sizes-field]').hidden=!enabled;custom.disabled=!enabled;custom.required=enabled;};
  customToggle.addEventListener('change',updateCustom);updateCustom();
 },onSubmit:async form=>{
  const selected=selectedValues(form),customEnabled=form.elements.customSizesEnabled.checked;
  const customText=customEnabled?form.elements.customSizes.value.trim():'';
  if(customEnabled&&!customText)throw new Error('Nhập kích cỡ khác.');
  const custom=customEnabled?unique(customText.split(/[,;\n]/)):[];
  if(customEnabled&&!custom.length)throw new Error('Nhập kích cỡ khác hợp lệ.');
  if(custom.some(size=>size.length>40))throw new Error('Mỗi kích cỡ tối đa 40 ký tự.');
  const known=new Map(choicesFor(form.elements.category.value).map(size=>[size.toLocaleLowerCase('vi'),size]));
  const sizes=unique([...selected,...custom.map(size=>known.get(size.toLocaleLowerCase('vi'))||size)]);
  if(!sizes.length)throw new Error('Chọn ít nhất một kích cỡ.');
  if(sizes.length>30)throw new Error('Chỉ chọn tối đa 30 kích cỡ.');
  const fields={code,name:form.elements.name.value,category:form.elements.category.value,price:Number(form.elements.price.value),sizes,description:form.elements.description.value,active:form.elements.active.checked};
  fields.labelInfo=Object.fromEntries(window.AtinoLabels.fields.map(([key])=>[key,form.elements['tag-'+key].value.trim()]));
  const image=form.elements.productImage.files[0];
  if(image) fields.image=await window.AtinoImages.thumbnail(image,640);
  else if(form.elements.removeImage?.checked) fields.image='';
  await ERP.saveProduct(fields);
  await M.refresh();M.toast(code?'Đã cập nhật sản phẩm.':'Đã thêm sản phẩm.');
 }});
}
function manageReceiptProducts(){
 const products=M.data.products;
 if(!products.length){editProduct();return;}
 const picker=M.dialog({title:'Sản phẩm',body:`<button type="button" class="am-btn secondary" data-new-model>${M.icon('plus')} Thêm sản phẩm</button>
  <label class="am-field am-subheading">Chỉnh sửa sản phẩm hiện có<select name="code" required><option value="">Chọn sản phẩm</option>${products.map(product=>`<option value="${e(product.code)}">${e(product.code)} · ${e(product.name)}</option>`).join('')}</select></label>`,
  submitLabel:'Mở sản phẩm đã chọn',
  onOpen(form){form.querySelector('[data-new-model]').addEventListener('click',()=>{picker.close();editProduct();});},
  onSubmit(form){const code=form.elements.code.value;picker.close();editProduct(code);}
 });
}
M.manageReceiptProducts=manageReceiptProducts;
function productDocumentTable(docs,code){
 const types={receipt:'Nhập kho',dispatch:'Xuất kho',transfer:'Điều chuyển cũ',restock:'Nhập lại hàng',sale:'Bán hàng',exchange:'Đổi hàng'};
 const units=items=>(items||[]).reduce((sum,item)=>sum+(item.code===code?n(item.qty):0),0);
 const rows=docs.map(doc=>{
  const qty=units(doc.items);
  let movement=number.format(qty);
  if(doc.type==='exchange'){
   const returned=units(doc.returnedItems);
   movement=(returned?`<span class="am-flow-in">+${number.format(returned)} nhận lại</span>`:'')+(qty?`<span class="am-flow-out">−${number.format(qty)} giao khách</span>`:'');
  }
  return `<tr><td><button type="button" class="am-text-btn am-code" data-product-document="${e(doc.id)}" aria-haspopup="dialog">${e(doc.id)}</button></td>
   <td>${M.date(doc.when)}</td><td>${e(types[doc.type]||doc.type)}</td><td class="am-right">${movement}</td></tr>`;
 });
 return overviewTable(['Mã chứng từ','Ngày lập','Nghiệp vụ','Số lượng sản phẩm'],rows,'Chưa có chứng từ phù hợp');
}
function showProduct(code){
 const product=M.data.products.find(row=>row.code===code);
 if(!product) return;
 const stock=productStock(product), unit=productUnit(product);
 const sold=ERP.monthlyUnitsSold(M.data.movements).get(code)||0;
 const docs=M.data.movements.filter(doc=>
  (doc.items||[]).some(item=>item.code===code) || (doc.returnedItems||[]).some(item=>item.code===code)
 ).sort((a,b)=>n(b.when)-n(a.when));
 const variants=stock.sizes.filter(row=>row.size!=='Chưa phân size'||row.total);
 const cards=variants.map(row=>{
  const hasSize=row.size!=='Chưa phân size';
  const low=hasSize&&product.active!==false&&row.total<=sizeThreshold(product);
  const label=row.total<=0?'Hết hàng':low?'Sắp hết':'Còn hàng';
  return `<div class="${low?(row.total<=0?'am-size-missing':'am-size-low'):''}"><span>${e(row.size)}</span><strong>${number.format(row.total)}</strong>
   <small>${e(unit)}</small><span class="am-size-status">${label}</span>${hasSize?`<button type="button" class="am-btn ghost small" data-label-code="${e(code)}" data-label-size="${e(row.size)}">In tem QR</button>`:''}</div>`;
 }).join('');
 M.dialog({title:product.name,wide:true,body:`<div class="am-product-detail-head">${productArt(product,true)}<div><strong>${e(code)}</strong>
  <p>${e(product.category)} · ${M.money(product.price)}</p></div></div>
  ${product.description?`<p>${e(product.description)}</p>`:''}
  <div class="am-detail-stats"><div><span>Số lượng trong cửa hàng</span><strong>${number.format(stock.total)} ${e(unit)}</strong></div>
  <div><span>Đã bán trong tháng</span><strong>${number.format(sold)} ${e(unit)}</strong>${monthlySalesBadge(sold)}</div></div>
  <h3 class="am-subheading">Số lượng theo kích cỡ</h3><div class="am-size-grid">${cards}</div>
  <div class="am-product-doc-head"><h3 class="am-subheading">Chứng từ gần nhất</h3>
  <select aria-label="Loại chứng từ của sản phẩm" data-doc-type><option value="all">Tất cả chứng từ</option><option value="sale">Hóa đơn bán</option></select></div>
  <div class="am-product-docs" data-doc-table>${productDocumentTable(docs,code)}</div>`,
  onOpen(form){
   const table=form.querySelector('[data-doc-table]');
   form.querySelector('[data-doc-type]').addEventListener('change',event=>{
    const visible=event.target.value==='sale'?docs.filter(doc=>doc.type==='sale'):docs;
    table.innerHTML=productDocumentTable(visible,code);
    table.scrollTop=0;
   });
   table.addEventListener('click',event=>{
    const link=event.target.closest('[data-product-document]');
    if(link) M.showDocument(link.dataset.productDocument,code);
   });
  }
 });
}
M.showStoreQuantities = showStoreQuantities;
M.showProduct = showProduct;
M.register('inventory',{
 title:'Hàng hóa',
 render(){
 const figures=inventoryFigures();
 const total=M.data.stock.total;
 const cats=[...new Set(M.data.products.map(row=>row.category))];
 return `<div class="am-stat-grid am-inventory-stats">
  ${overviewCard('Sản phẩm',number.format(figures.products.length),'inventory','models','Xem tất cả sản phẩm')}
  ${overviewCard('Số lượng trong cửa hàng',number.format(total),'stock','available','Xem số lượng theo sản phẩm')}
  ${overviewCard('Kích cỡ cần bổ sung',number.format(figures.lowSizes.length),'alert','low-sizes','Xem các kích cỡ còn ít hoặc đã hết')}
  ${overviewCard('Sản phẩm hết hàng',number.format(figures.empty.length),'inventory','sold-out','Xem sản phẩm đã hết mọi kích cỡ')}</div>
  <section class="am-panel"><div class="am-panel-head"><div><h2>Danh sách hàng hóa</h2><p id="am-inventory-count">${number.format(filteredProducts().length)} sản phẩm</p></div>
  <button type="button" class="am-btn secondary" id="am-stock-export">${M.icon('download')} Xuất danh sách hàng hóa</button></div>
  <div class="am-toolbar am-filterbar"><label class="am-search">${M.icon('search')}<input type="search" id="am-stock-search" value="${e(inventoryFilters.search)}" placeholder="Tìm mã hoặc tên sản phẩm…" aria-label="Tìm sản phẩm"></label>
  <select id="am-stock-category" aria-label="Danh mục sản phẩm"><option value="">Tất cả danh mục</option>${cats.map(cat=>`<option value="${e(cat)}" ${inventoryFilters.category===cat?'selected':''}>${e(cat)}</option>`).join('')}</select></div>
  <div class="am-table-wrap" id="am-inventory-results">${inventoryRows()}</div></section>`;
},
 bind(root){
 root.querySelectorAll('[data-overview-view]').forEach(button=>button.addEventListener('click',()=>showInventoryFigure(button.dataset.overviewView,inventoryFigures())));
 const input=root.querySelector('#am-stock-search');
 input.addEventListener('input',()=>{inventoryFilters.search=input.value;updateInventoryRows(root);});
 Search.attach(input,{items:()=>filteredProducts().map(product=>({value:product.name,label:product.name,detail:`${product.code} · ${product.category}`,searchText:[product.name,product.code,product.category]}))});
 root.querySelector('#am-stock-category').addEventListener('change',event=>{inventoryFilters.category=event.target.value;updateInventoryRows(root);});
 root.querySelector('#am-stock-export').addEventListener('click',event=>{
  const sheets=Reports.inventorySheets(M.data,filteredProducts());
  M.downloadWorkbook('Atino-hang-hoa-'+M.today()+'.xlsx',sheets,event.currentTarget);
 });
 bindInventoryRows(root);
}
});
function supplierDocuments(id){return M.data.movements.filter(doc=>doc.type==='receipt'&&doc.supplierId===id);}
function supplierRows(){
 const supplier=M.data.suppliers.find(row=>row.id==='NCC001')||M.data.suppliers[0];
 if(!supplier)return M.empty('Chưa có thông tin nhà cung cấp');
 const docs=supplierDocuments(supplier.id);
 const complete=docs.filter(doc=>!pendingReceipt(doc));
 return `<table class="am-table"><thead><tr><th>Nhà cung cấp duy nhất</th><th>Liên hệ</th><th class="am-right">Phiếu nhập</th><th class="am-right">Giá trị nhập đã ghi nhận</th><th></th></tr></thead>
 <tbody><tr><td><button class="am-text-btn" type="button" data-supplier-view="${e(supplier.id)}"><strong>${e(supplier.name)}</strong><small>${e(supplier.id)}</small></button></td>
 <td>${e(supplier.phone||'0359638789')}<small class="am-unit">${e(supplier.email||'Chưa cập nhật email')}</small></td>
 <td class="am-right">${number.format(docs.length)}</td><td class="am-right am-nowrap"><strong>${M.money(complete.reduce((sum,doc)=>sum+receiptValue(doc),0))}</strong>${docs.some(pendingReceipt)?`<small class="am-quantity-note">${number.format(docs.filter(pendingReceipt).length)} phiếu chờ giá nhập</small>`:''}</td>
 <td><button type="button" class="am-btn secondary small" data-supplier-edit="${e(supplier.id)}">Cập nhật liên hệ</button></td></tr></tbody></table>`;
}
function bindSupplierRows(root){root.querySelectorAll('[data-supplier-edit]').forEach(button=>button.addEventListener('click',()=>editSupplier(button.dataset.supplierEdit)));root.querySelectorAll('[data-supplier-view]').forEach(button=>button.addEventListener('click',()=>showSupplier(button.dataset.supplierView)));}
function editSupplier(id){
 const row=M.data.suppliers.find(s=>s.id===id);
 if(!row)return;
 M.dialog({title:'Thông tin liên hệ · Kho tổng',wide:true,body:`<div class="am-form-grid"><label class="am-field am-span-2">Nhà cung cấp<input value="${e(row.name)}" readonly></label><label class="am-field">Số điện thoại<input name="phone" type="tel" maxlength="20" value="${e(row.phone)}"></label><label class="am-field">Email<input name="email" type="email" maxlength="150" value="${e(row.email)}"></label></div>`,onSubmit:async form=>{const values=Object.fromEntries(new FormData(form));await ERP.saveSupplier({...values,id,active:true});await M.refresh();M.toast('Đã cập nhật số điện thoại và email kho tổng.');}});
}
function showSupplier(id){
 const row=M.data.suppliers.find(s=>s.id===id);if(!row)return;
 const docs=supplierDocuments(id).sort((a,b)=>n(b.when)-n(a.when));
 M.dialog({title:row.name,wide:true,body:`<dl class="am-kv"><div><dt>Số điện thoại</dt><dd>${e(row.phone||'—')}</dd></div><div><dt>Email</dt><dd>${e(row.email||'—')}</dd></div></dl><h3 class="am-subheading">Lịch sử nhập hàng</h3>${docs.length?`<div class="am-table-wrap"><table class="am-table"><thead><tr><th>Phiếu nhập</th><th>Ngày</th><th class="am-right">Số lượng</th><th class="am-right">Giá trị</th><th>Người lập</th></tr></thead><tbody>${docs.map(doc=>`<tr><td class="am-code">${e(doc.id)}</td><td>${M.date(doc.when)}</td><td class="am-right">${doc.items.reduce((sum,item)=>sum+n(item.qty),0)}</td><td class="am-right">${pendingReceipt(doc)?M.badge('Chờ bổ sung giá nhập','amber'):M.money(receiptValue(doc))}</td><td>${e(doc.employeeName||'—')}</td></tr>`).join('')}</tbody></table></div>`:M.empty('Chưa có phiếu nhập')}`});
}
function showSupplierReceipt(id){
 const doc=M.data.movements.find(row=>row.id===id&&row.type==='receipt');if(!doc)return;
 const supplier=M.data.suppliers.find(row=>row.id==='NCC001');
 const items=doc.items||[];
 const groups=new Map();
 for(const item of items){
  const key=item.code||item.name||'unknown';
  if(!groups.has(key)){
   const product=M.data.products.find(row=>row.code===item.code);
   groups.set(key,{code:item.code||'',name:item.name||product?.name||'Sản phẩm',items:[]});
  }
  groups.get(key).items.push(item);
 }
 const productCards=[...groups.values()].map(group=>{
  const qty=group.items.reduce((sum,item)=>sum+n(item.qty),0);
  const variants=group.items.map(item=>{
   const unitPrice=Number(item.unitPrice);
   return `<tr><td>${e(item.size||'—')}</td><td class="am-right">${number.format(n(item.qty))}</td><td class="am-right">${unitPrice>0?M.money(unitPrice):'—'}</td><td class="am-right">${unitPrice>0?M.money(unitPrice*n(item.qty)):'—'}</td></tr>`;
  }).join('');
  const sizeCount=new Set(group.items.map(item=>item.size||'Chưa phân size')).size;
  return `<details class="am-receipt-product-card"><summary><span class="am-receipt-product-name"><strong>${e(group.name)}</strong><small>${e(group.code)}</small></span><span class="am-receipt-product-count">${number.format(sizeCount)} kích cỡ · ${number.format(qty)} sản phẩm</span><span class="am-receipt-product-toggle" aria-hidden="true">⌄</span></summary><div class="am-table-wrap"><table class="am-table"><thead><tr><th>Kích cỡ</th><th class="am-right">Số lượng</th><th class="am-right">Giá nhập</th><th class="am-right">Thành tiền</th></tr></thead><tbody>${variants}</tbody></table></div></details>`;
 }).join('');
 M.dialog({title:'Chi tiết phiếu nhập · '+doc.id,wide:true,body:`<dl class="am-kv"><div><dt>Nhà cung cấp</dt><dd>${e(supplier?.name||'Kho tổng — Công ty TNHH Thời Trang Minh AM')}</dd></div><div><dt>Điện thoại liên hệ</dt><dd>${e(supplier?.phone||'0359638789')}</dd></div><div><dt>Ngày nhận</dt><dd>${M.date(doc.when)}</dd></div><div><dt>Nhân viên xác nhận</dt><dd>${e(doc.employeeName||'Chưa ghi nhận')}</dd></div><div><dt>Tổng số lượng</dt><dd>${number.format(items.reduce((sum,item)=>sum+n(item.qty),0))}</dd></div><div><dt>Tổng giá trị nhập</dt><dd><strong>${pendingReceipt(doc)?'Chờ bổ sung giá nhập':M.money(receiptValue(doc))}</strong></dd></div></dl><h3 class="am-subheading">Mặt hàng trong phiếu</h3><div class="am-receipt-product-list">${productCards||M.empty('Phiếu nhập chưa có mặt hàng')}</div>${doc.note?`<p class="am-note">${e(doc.note)}</p>`:''}`});
}
M.register('suppliers',{
 title:'Nhà cung cấp',kicker:'KHO TỔNG · MINH AM',
 render(){
  const supplier=M.data.suppliers.find(row=>row.id==='NCC001')||M.data.suppliers[0];
  const docs=supplier?supplierDocuments(supplier.id):[];
  return `<div class="am-mini-summary"><span>${M.icon('suppliers')}<strong>1</strong> nhà cung cấp</span><span><i class="am-status-dot"></i><strong>Kho tổng</strong> · Công ty TNHH Thời Trang Minh AM</span></div>
   <section class="am-panel"><div class="am-panel-head"><div><h2>Kho tổng</h2><p>Đầu mối nhập hàng duy nhất của cửa hàng</p></div><div class="am-actions"><button type="button" class="am-btn secondary" id="am-supplier-export">${M.icon('download')} Xuất Excel</button><button type="button" class="am-btn" data-supplier-view="${e(supplier?.id||'NCC001')}">Thông tin kho tổng</button></div></div>
   <div id="am-supplier-results" class="am-table-wrap">${supplierRows()}</div></section>
   <section class="am-panel"><div class="am-panel-head"><div><h2>Lịch sử phiếu nhập</h2><p>${number.format(docs.length)} phiếu nhập</p></div></div>
   ${docs.length?`<div class="am-table-wrap"><table class="am-table"><thead><tr><th>Mã phiếu nhập</th><th>Ngày</th><th class="am-right">Số lượng</th><th>Nhân viên xác nhận</th><th class="am-right">Tổng giá trị</th><th></th></tr></thead><tbody>${docs.slice().sort((a,b)=>n(b.when)-n(a.when)).map(doc=>`<tr><td class="am-code">${e(doc.id)}</td><td>${M.date(doc.when)}</td><td class="am-right">${number.format(doc.items.reduce((sum,item)=>sum+n(item.qty),0))}</td><td>${e(doc.employeeName||'Chưa ghi nhận')}</td><td class="am-right">${pendingReceipt(doc)?M.badge('Chờ bổ sung giá nhập','amber'):M.money(receiptValue(doc))}</td><td><button class="am-btn secondary small" type="button" data-receipt-detail="${e(doc.id)}">Xem mặt hàng</button></td></tr>`).join('')}</tbody></table></div>`:M.empty('Chưa có phiếu nhập từ kho tổng')}</section>`;
 },
 bind(root){
  root.querySelector('#am-supplier-export').addEventListener('click',event=>M.downloadTable('Atino-kho-tong-'+M.today(),'Thông tin kho tổng',[
   ['Mã nhà cung cấp','Nhà cung cấp','Điện thoại','Email','Phiếu nhập','Giá trị nhập'],
   ...M.data.suppliers.filter(row=>row.id==='NCC001').map(row=>{const docs=supplierDocuments(row.id);return[row.id,row.name,row.phone,row.email,docs.length,docs.filter(doc=>!pendingReceipt(doc)).reduce((sum,doc)=>sum+n(receiptValue(doc)),0)];})
  ],event.currentTarget));
  root.querySelectorAll('[data-supplier-view]').forEach(button=>button.addEventListener('click',()=>showSupplier(button.dataset.supplierView)));
  root.querySelectorAll('[data-receipt-detail]').forEach(button=>button.addEventListener('click',()=>showSupplierReceipt(button.dataset.receiptDetail)));
  bindSupplierRows(root);
 }
});
const auditTime = new Intl.DateTimeFormat('vi-VN', {dateStyle:'short',timeStyle:'short',timeZone:'Asia/Ho_Chi_Minh'});
const auditKinds = {
 'Đăng nhập':['Đăng nhập'],
 'Nhập kho':['Nhập kho','Nhập hàng','Bổ sung giá nhập','Cập nhật giá bán khi nhập hàng'],
 'Xuất kho':['Xuất kho','Xuất hàng'],
 'Bán hàng':['Bán hàng','Lập hóa đơn','Sửa hóa đơn bán'],
 'Đổi hàng':['Đổi hàng','Xử lý đổi hàng']
};
M.register('audit',{
 title:'Nhật ký thao tác',kicker:'QUẢN LÝ',
 render(){
  return `<section class="am-panel"><div class="am-toolbar am-filterbar"><label class="am-search">${M.icon('search')}<input type="search" aria-label="Tìm nhật ký" placeholder="Tìm người thực hiện, thao tác hoặc mã chứng từ" data-audit-search></label><label class="am-field">Loại thao tác<select data-audit-kind><option value="">Tất cả thao tác</option>${Object.keys(auditKinds).map(k=>`<option>${e(k)}</option>`).join('')}</select></label><label class="am-field">Ngày thực hiện<input type="date" data-audit-day></label></div><div data-audit-results></div></section>`;
 },
 bind(root){
  const query=root.querySelector('[data-audit-search]'),day=root.querySelector('[data-audit-day]');
  const results=root.querySelector('[data-audit-results]');
  const kind=root.querySelector('[data-audit-kind]');
  const documents=new Set(M.data.movements.map(doc=>doc.id));
  const returnIds=new Set((M.data.returns || []).map(doc=>doc.id));
  results.addEventListener('click',event=>{
   const ref=event.target.closest('[data-audit-document]');
   if(ref){
    const id=ref.dataset.auditDocument;
    if(returnIds.has(id)) M.showReturn(id);
    else M.showDocument(id);
   }
   const person=event.target.closest('[data-audit-person]');
   if(person) M.showEmployeeProfile(person.dataset.auditPerson,person.textContent);
  });
  const draw=()=>{
   const rows=(M.data.audit||[]).filter(row=>(!kind.value||auditKinds[kind.value].includes(row.action))&&(!day.value||ERP.today(row.when)===day.value)&&Search.match([row.employeeId,row.employeeName,row.action,row.reference,row.detail],query.value));
   results.innerHTML=rows.length?`<div class="am-table-wrap"><table class="am-table"><thead><tr><th>Thời điểm</th><th>Người thực hiện</th><th>Thao tác</th><th>Mã tham chiếu</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${e(auditTime.format(row.when))}</td><td><button class="am-text-btn" type="button" data-audit-person="${e(row.employeeId)}">${e(row.employeeName)}</button><small class="am-unit">${e(row.employeeId)}</small></td><td>${e(row.action)}${row.detail?`<small class="am-unit">${e(row.detail)}</small>`:''}</td><td>${(documents.has(row.reference)||returnIds.has(row.reference))?`<button class="am-text-btn" type="button" data-audit-document="${e(row.reference)}">${e(row.reference)}</button>`:e(row.reference)}</td></tr>`).join('')}</tbody></table></div>`:M.empty('Chưa có thao tác phù hợp');
  };
  query.addEventListener('input',draw);
  day.addEventListener('change',draw);
  kind.addEventListener('change',draw);
  draw();
 }
});
})();

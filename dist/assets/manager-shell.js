(() => {
'use strict';
const ERP = window.AtinoERP;
const Search = window.AtinoSearch;
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
 vouchers:'<path d="M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4zM14 6v2m0 3v2m0 3v2M7 10h3M7 14h3"/>',
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
 ['customers','Khách hàng','QUẢN LÝ'],['employees','Nhân viên & ca làm'],['vouchers','Ưu đãi'],['returns','Đổi hàng'],['sales','Hóa đơn & doanh thu'],['settings','Chính sách'],['scope','Ghi chú khảo sát']
];
let app, view, renderToken = 0, toastTimer;
let inventoryFilters = {search:'',category:'',stock:'all'};
const SIZE_REPLENISHMENT_THRESHOLD = 2;
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
   M.data=data;
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
 downloadCSV(filename,rows){
  const cell=value=>{
   let valueText=String(value??'');
   if(/^[\s]*[=+@-]/.test(valueText))valueText="'"+valueText;
   return '"'+valueText.replace(/"/g,'""')+'"';
  };
  const csv='\ufeff'+rows.map(row=>row.map(cell).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
  const link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
 }
};
function buildShell(){
 if(app)return;
 app=document.createElement('div');app.id='manager-app';app.className='am';app.hidden=true;
 app.innerHTML=`<button type="button" class="am-nav-scrim" data-am-nav-close aria-label="Đóng menu"></button><aside class="am-sidebar"><div class="am-brand"><span class="am-brand-symbol">A</span><div><strong>ATINO</strong><span>Quản lý</span></div></div><nav class="am-navigation" aria-label="Quản lý cửa hàng">${nav.map(([route,title,group])=>`${group?`<div class="am-nav-group">${group}</div>`:''}<button type="button" data-am-route="${route}">${M.icon(route)}<span>${e(title)}</span></button>`).join('')}</nav><div class="am-sidebar-bottom"><span class="am-local-label">${M.icon('info')} Dữ liệu minh họa</span><button class="am-logout" type="button" data-am-logout>${M.icon('logout')}<span>Đăng xuất</span></button></div></aside><div class="am-workspace"><header class="am-topbar"><div class="am-topbar-left"><button type="button" class="am-icon-btn am-mobile-menu" data-am-nav-toggle aria-label="Mở menu" aria-expanded="false">${M.icon('menu')}</button><div class="am-breadcrumb"><span>Quản lý cửa hàng</span>${M.icon('chevron')}<strong data-am-breadcrumb>Tổng quan</strong></div></div><div class="am-topbar-right"><span class="am-top-date">${M.icon('calendar')}<span>${e(M.date(M.today()))}</span></span><button type="button" class="am-icon-btn" data-am-refresh title="Cập nhật số liệu" aria-label="Cập nhật số liệu">${M.icon('refresh')}</button><div class="am-user"><span class="am-avatar" data-am-avatar>QL</span><div><strong data-am-user>Quản lý</strong><span>Quản lý cửa hàng</span></div></div></div></header><main class="am-main"><div class="am-page-heading"><div><h1 data-am-title>Tổng quan cửa hàng</h1></div></div><div id="am-content" aria-live="polite"></div><footer class="am-footer"><span>ATINO · Hệ thống quản lý cửa hàng</span><span>Giờ Việt Nam · GMT+7</span></footer></main></div><div class="am-toast" role="status" hidden></div>`;
 document.body.append(app);view=app.querySelector('#am-content');
 app.querySelectorAll('[data-am-route]').forEach(button=>button.addEventListener('click',()=>M.go(button.dataset.amRoute)));
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
 app.querySelector('[data-am-avatar]').textContent=(M.data.user?.name||'Quản lý').trim().split(/\s+/).slice(-2).map(word=>word[0]).join('').toUpperCase();
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
  if(target)target.click();else M.toast('Chưa mở được biểu mẫu. Vui lòng chọn lại mục nghiệp vụ.');
 }));
}
function stat(label,value,iconName,description,accent=''){
 return `<article class="am-stat ${accent}"><div class="am-stat-top"><span>${e(label)}</span><span class="am-stat-icon">${M.icon(iconName)}</span></div><strong>${value}</strong>${description?`<p>${description}</p>`:''}</article>`;
}
function currentMetrics(){return ERP.metrics(M.data,M.period,M.periodValue);}
function documentPaidTotal(doc){
 return ERP.documentPaidTotal(doc);
}
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
M.register('overview',{
 title:'Tổng quan cửa hàng',kicker:'NẮM BẮT HOẠT ĐỘNG MỖI NGÀY',
 render(){
  const d=M.data,s=currentMetrics(),totalPayment=n(s.cash)+n(s.bank),cashPercent=totalPayment?n(s.cash)/totalPayment*100:0;
  const available=d.balances.reduce((sum,row)=>sum+rowAvailable(row),0),held=d.balances.reduce((sum,row)=>sum+n(row.held),0),stock=available+held;
  const flagged=d.products.filter(product=>{const notes=d.stockNotes?.[product.code]||{};return totalProductQuantity(product)>0&&notes.reason&&notes.reason!=='Chưa đánh giá';});
  const low=d.products.filter(product=>product.active!==false&&d.balances.filter(row=>row.code===product.code).reduce((sum,row)=>sum+n(row.total??n(row.warehouse)+n(row.counter)),0)<=n(d.stockNotes?.[product.code]?.threshold??5));
  const sizeAlerts=d.products.map(product=>({product,sizes:sizeNeedsReplenishment(product)})).filter(row=>row.sizes.length);
  const affectedSizeCount=sizeAlerts.reduce((sum,row)=>sum+row.sizes.length,0);
  const attentionProducts=new Set([...flagged,...low,...sizeAlerts.map(row=>row.product)].map(product=>product.code));
  const slow=flagged.filter(product=>d.stockNotes?.[product.code]?.reason==='Bán chậm');
  const birthday=d.customers.filter(customer=>customer.active!==false&&customer.birthday?.slice(5)===M.today().slice(5));
  const periodType=M.period==='month'?'month':M.period==='year'?'number':'date';
  const recent=[...(s.transactions||[])].sort((a,b)=>n(b.when)-n(a.when)).slice(0,5);
  return `<div class="am-overview-toolbar"><div class="am-period-control"><div class="am-segment" role="group" aria-label="Kỳ thống kê">${[['day','Ngày'],['month','Tháng'],['year','Năm']].map(([key,label])=>`<button type="button" data-period="${key}" class="${M.period===key?'selected':''}" aria-pressed="${M.period===key}">${label}</button>`).join('')}</div><label class="am-period-input">${M.icon('calendar')}<input type="${periodType}" id="am-period-value" aria-label="Chọn kỳ thống kê" value="${e(M.periodValue)}" ${M.period==='year'?'min="2000" max="2100" step="1"':''}></label><button type="button" class="am-btn ghost small" id="am-current-period">Kỳ hiện tại</button></div><button type="button" class="am-btn secondary" id="am-export-report">${M.icon('download')} Xuất báo cáo</button></div><div class="am-stat-grid">${stat('Doanh thu thực thu',M.money(s.revenue),'wallet',`<span class="am-positive">${number.format(n(s.orderCount))} hóa đơn</span>`,'featured')}${stat('Sản phẩm đã bán',number.format(n(s.unitsSold))+'<small> sản phẩm</small>','shopping','')}${stat('Tổng số lượng hàng',number.format(stock)+'<small> sản phẩm</small>','inventory',`${number.format(available)} sẵn có · ${number.format(held)} chờ xử lý`)}${stat('Hàng cần chú ý',number.format(attentionProducts.size)+'<small> mẫu</small>','alert',`${number.format(sizeAlerts.length)} cần bổ sung theo cỡ · ${number.format(slow.length)} bán chậm`,'warning')}</div><div class="am-dashboard-main"><section class="am-panel am-revenue-panel"><div class="am-panel-head"><div><h2>Biểu đồ doanh thu</h2></div><span class="am-chart-legend"><i></i> Doanh thu</span></div>${revenueChart(s.buckets)}<div class="am-chart-summary"><div><span>Giá trị bán trước ưu đãi</span><strong>${M.money(s.gross)}</strong></div><div><span>Ưu đãi đã áp dụng</span><strong>${M.money(s.discount)}</strong></div><div><span>Giao dịch đổi hàng</span><strong>${number.format(n(s.exchangeCount))}<small> phiếu</small></strong></div></div></section><section class="am-panel am-task-panel"><div class="am-panel-head"><div><h2>Việc cần chú ý</h2></div><span class="am-panel-icon">${M.icon('alert')}</span></div><button type="button" class="am-attention" data-am-size-alert><span class="am-attention-icon amber">${M.icon('inventory')}</span><span><strong>${affectedSizeCount?`${number.format(affectedSizeCount)} kích cỡ cần bổ sung`:'Kiểm tra kích cỡ hàng hóa'}</strong><small>${affectedSizeCount?`${number.format(sizeAlerts.length)} mặt hàng · còn từ 0 đến ${SIZE_REPLENISHMENT_THRESHOLD} để bán`:`Không có kích cỡ nào còn từ 0 đến ${SIZE_REPLENISHMENT_THRESHOLD} để bán`}</small></span>${M.icon('chevron')}</button><button type="button" class="am-attention" data-go="customers"><span class="am-attention-icon pink">${M.icon('gift')}</span><span><strong>${birthday.length?`${birthday.length} khách sinh nhật hôm nay`:'Ưu đãi sinh nhật khách hàng'}</strong><small>${birthday.length?'Ưu đãi sinh nhật':'Khách hàng'}</small></span>${M.icon('chevron')}</button><button type="button" class="am-attention" data-go="vouchers"><span class="am-attention-icon blue">${M.icon('vouchers')}</span><span><strong>Chương trình ưu đãi</strong><small>${d.vouchers.length} chương trình đã tạo</small></span>${M.icon('chevron')}</button><div class="am-quick-actions"><button class="am-btn" type="button" data-am-create="receipt">${M.icon('receipts')} Nhập kho</button><button class="am-btn secondary" type="button" data-am-create="dispatch">${M.icon('dispatches')} Xuất kho</button><button class="am-btn secondary" type="button" data-am-create="sale">${M.icon('sales')} Tạo hóa đơn</button></div></section></div><div class="am-grid am-dashboard-lower"><section class="am-panel"><div class="am-panel-head"><div><h2>Sản phẩm bán tốt</h2></div><button class="am-btn ghost small" type="button" data-go="inventory">Xem hàng hóa</button></div>${s.topProducts?.length?`<div class="am-top-products">${s.topProducts.slice(0,5).map((product,i)=>`<div class="am-top-product"><span class="am-product-rank">${String(i+1).padStart(2,'0')}</span><span class="am-product-art">${M.icon(productIcon(product))}</span><div><strong>${e(product.name)}</strong><small>${e(product.code)}</small></div><span><strong>${number.format(n(product.qty))} sản phẩm</strong><small>${M.money(product.revenue)}</small></span></div>`).join('')}</div>`:M.empty('Chưa có sản phẩm bán trong kỳ')}</section><section class="am-panel"><div class="am-panel-head"><div><h2>Phương thức thanh toán</h2></div>${M.icon('bank')}</div><div class="am-payment-total"><span>Tổng đã thu</span><strong>${M.money(totalPayment)}</strong></div><div class="am-payment-bar" role="img" aria-label="Tiền mặt ${e(M.money(s.cash))}, chuyển khoản ${e(M.money(s.bank))}"><i style="width:${cashPercent}%"></i><i style="width:${100-cashPercent}%"></i></div><div class="am-payment-row"><span><i class="cash"></i>Tiền mặt</span><strong>${M.money(s.cash)}</strong></div><div class="am-payment-row"><span><i class="bank"></i>Chuyển khoản</span><strong>${M.money(s.bank)}</strong></div></section></div><section class="am-panel"><div class="am-panel-head"><div><h2>Giao dịch gần đây</h2></div><button class="am-btn ghost small" type="button" data-go="sales">Xem hóa đơn</button></div>${recent.length?`<div class="am-table-wrap"><table class="am-table"><thead><tr><th>Mã giao dịch</th><th>Ngày lập</th><th>Người thực hiện</th><th>Thanh toán</th><th class="am-right">Thực thu</th><th>Loại</th></tr></thead><tbody>${recent.map(doc=>`<tr><td><strong class="am-code">${e(doc.id)}</strong>${doc.promotionLabel?`<small class="am-muted" style="display:block">${e(doc.promotionLabel)}</small>`:''}</td><td>${e(M.date(doc.when))}</td><td>${e(doc.employeeName||'—')}</td><td>${e(doc.method||doc.note||'—')}</td><td class="am-right"><strong>${M.money(documentPaidTotal(doc))}</strong></td><td>${M.badge(doc.type==='exchange'?'Đổi hàng':'Đã thanh toán',doc.type==='exchange'?'blue':'green')}</td></tr>`).join('')}</tbody></table></div>`:M.empty('Chưa có giao dịch trong kỳ')}</section>`;
 },
 bind(root){
  root.querySelector('[data-am-size-alert]').addEventListener('click',()=>{inventoryFilters={search:'',category:'',stock:'size-low'};M.go('inventory');});
  root.querySelectorAll('[data-period]').forEach(button=>button.addEventListener('click',()=>{
   M.period=button.dataset.period;M.periodValue=M.today().slice(0,M.period==='year'?4:M.period==='month'?7:10);render();
  }));
  root.querySelector('#am-period-value').addEventListener('change',event=>{if(!event.target.value||!event.target.checkValidity())return;M.periodValue=event.target.value;render();});
  root.querySelector('#am-current-period').addEventListener('click',()=>{M.periodValue=M.today().slice(0,M.period==='year'?4:M.period==='month'?7:10);render();});
  root.querySelector('#am-export-report').addEventListener('click',()=>{
   const s=currentMetrics();M.downloadCSV('Atino-doanh-thu-'+M.periodValue+'.csv',[['Báo cáo doanh thu Atino',M.periodValue],['Doanh thu thực thu',n(s.revenue)],['Hóa đơn',n(s.orderCount)],['Sản phẩm đã bán',n(s.unitsSold)],['Tiền mặt',n(s.cash)],['Chuyển khoản',n(s.bank)],[],['Mã giao dịch','Ngày','Loại','Nhân viên','Thanh toán','Thực thu'],...(s.transactions||[]).map(doc=>[doc.id,M.date(doc.when),doc.type==='exchange'?'Đổi hàng':'Bán hàng',doc.employeeName,doc.method||doc.note,documentPaidTotal(doc)])]);
  });
 }
});
function rowAvailable(row){return n(row.total??n(row.warehouse)+n(row.counter));}
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
function productQuantity(product){return M.data.balances.filter(row=>row.code===product.code).reduce((sum,row)=>sum+rowAvailable(row),0);}
function heldQuantity(product){return M.data.balances.filter(row=>row.code===product.code).reduce((sum,row)=>sum+n(row.held),0);}
function totalProductQuantity(product){return productQuantity(product)+heldQuantity(product);}
function productVariants(product){
 const declared=[...new Set((Array.isArray(product.sizes)&&product.sizes.length?product.sizes:ERP.sizesFor?.(product)||[]).map(size=>String(size).trim()).filter(Boolean))];
 const groups=new Map(declared.map(size=>[size,{size,available:0,held:0}]));
 for(const balance of M.data.balances.filter(row=>row.code===product.code)){
  const size=String(balance.size||'Chưa phân size').trim();
  if(size==='Chưa phân size'&&!declared.includes(size))continue;
  const row=groups.get(size)||{size,available:0,held:0};
  row.available+=rowAvailable(balance);row.held+=n(balance.held);groups.set(size,row);
 }
 return [...groups.values()].map(row=>({...row,total:row.available+row.held}));
}
function sizeNeedsReplenishment(product){
 return product.active===false?[]:productVariants(product).filter(row=>row.available<=SIZE_REPLENISHMENT_THRESHOLD);
}
function sizeAlertMarkup(product){
 const needs=sizeNeedsReplenishment(product);if(!needs.length)return '';
 const unit=productUnit(product);
 return `<div class="am-variant-alert">${M.badge(needs.length+' kích cỡ cần bổ sung','amber')}<small>${needs.map(row=>`${e(row.size)}: ${row.available===0?'hết hàng':number.format(row.available)+' '+e(unit)}`).join(' · ')}</small></div>`;
}
function inventoryCountText(){
 const products=filteredProducts();
 return number.format(products.length)+' mẫu sản phẩm'+(inventoryFilters.stock==='size-low'?' · '+number.format(products.reduce((sum,product)=>sum+sizeNeedsReplenishment(product).length,0))+' kích cỡ cần bổ sung':'');
}
function pendingReceipt(doc){return doc.type==='receipt'&&(doc.costStatus==='pending'||doc.items?.some(item=>!Number.isFinite(item.unitPrice)||item.unitPrice<=0));}
function receiptValue(doc){return pendingReceipt(doc)?null:doc.items.reduce((sum,item)=>sum+n(item.qty)*n(item.unitPrice),0);}
function filteredProducts(){
 const search=inventoryFilters.search;
 return M.data.products.filter(product=>{
  const qty=productQuantity(product),note=M.data.stockNotes?.[product.code]||{},threshold=note.threshold===undefined?5:n(note.threshold);
  return Search.match([product.name,product.code,product.category],search)&&(!inventoryFilters.category||product.category===inventoryFilters.category)&&(inventoryFilters.stock==='all'||inventoryFilters.stock==='size-low'&&sizeNeedsReplenishment(product).length>0||inventoryFilters.stock==='low'&&qty>0&&qty<=threshold||inventoryFilters.stock==='empty'&&qty===0||inventoryFilters.stock==='reason'&&Boolean(note.reason)&&note.reason!=='Chưa đánh giá'||inventoryFilters.stock==='slow'&&note.reason==='Bán chậm'&&totalProductQuantity(product)>0||inventoryFilters.stock==='inactive'&&product.active===false);
 });
}
function productStatus(product){const qty=productQuantity(product),threshold=M.data.stockNotes?.[product.code]?.threshold??5;return product.active===false?M.badge('Ngừng bán'):qty===0?M.badge(heldQuantity(product)>0?'Chờ xử lý':'Hết hàng',heldQuantity(product)>0?'amber':'red'):qty<=threshold?M.badge('Sắp hết','amber'):M.badge('Còn hàng','green');}
function inventoryRows(){
 const rows=filteredProducts();
 return rows.length?`<table class="am-table am-inventory-table"><thead><tr><th>Sản phẩm</th><th>Danh mục</th><th class="am-right">Giá bán</th><th class="am-right">Số lượng hàng</th><th>Đánh giá / xử lý</th><th>Trạng thái bán</th><th></th></tr></thead><tbody>${rows.map(product=>{const note=M.data.stockNotes?.[product.code]||{},held=heldQuantity(product);return `<tr><td><button type="button" class="am-product-link" data-product-view="${e(product.code)}"><span class="am-product-art">${M.icon(productIcon(product))}</span><span><strong>${e(product.name)}</strong><small>${e(product.code)}</small></span></button></td><td>${e(product.category)}</td><td class="am-right am-nowrap">${M.money(product.price)}</td><td class="am-right"><strong>${number.format(totalProductQuantity(product))}</strong><small class="am-unit">${e(productUnit(product))}</small>${held?`<small class="am-quantity-note">${number.format(productQuantity(product))} có thể bán · ${number.format(held)} chờ xử lý</small>`:''}</td><td class="am-stock-reason">${note.reason&&note.reason!=='Chưa đánh giá'?`<span>${e(note.reason)}</span><small>${e(note.action||note.note||'')}</small>`:'<span class="am-muted">Chưa ghi nhận vấn đề</span>'}</td><td>${productStatus(product)}${sizeAlertMarkup(product)}</td><td><button type="button" class="am-icon-btn" data-product-edit="${e(product.code)}" aria-label="Sửa ${e(product.name)}" title="Sửa sản phẩm">${M.icon('edit')}</button></td></tr>`;}).join('')}</tbody></table>`:M.empty('Không tìm thấy sản phẩm');
}
function bindInventoryRows(root){
 root.querySelectorAll('[data-product-view]').forEach(button=>button.addEventListener('click',()=>showProduct(button.dataset.productView)));
 root.querySelectorAll('[data-product-edit]').forEach(button=>button.addEventListener('click',()=>editProduct(button.dataset.productEdit)));
}
function updateInventoryRows(root){root.querySelector('#am-inventory-results').innerHTML=inventoryRows();root.querySelector('#am-inventory-count').textContent=inventoryCountText();bindInventoryRows(root);}
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
 const selectedValues=form=>[...form.querySelectorAll('[data-size-choice]:checked')].map(input=>input.value);
 M.dialog({title:code?'Chỉnh sửa sản phẩm · '+code:'Thêm mẫu sản phẩm',wide:true,body:`<div class="am-form-grid"><label class="am-field am-span-2">Tên sản phẩm<input name="name" required maxlength="120" value="${e(product.name)}" placeholder="Tên sản phẩm"></label><label class="am-field">Danh mục<select name="category">${cats.map(cat=>`<option ${cat===chosenCategory?'selected':''}>${e(cat)}</option>`).join('')}</select></label><label class="am-field">Giá bán (đ)<input type="number" name="price" min="1" max="1000000000" step="1" required value="${product.price||''}"></label><fieldset class="am-size-picker am-span-2"><legend>Kích cỡ</legend><div class="am-size-options" data-size-options>${choicesHtml(chosenCategory)}</div><label class="am-check am-size-other-toggle"><input type="checkbox" name="customSizesEnabled"> Kích cỡ khác</label><label class="am-field" data-custom-sizes-field hidden>Tên kích cỡ<input name="customSizes" maxlength="1200" disabled placeholder="XS, XXXL, 45"></label></fieldset><label class="am-field am-span-2">Mô tả<textarea name="description" rows="3" maxlength="1000">${e(product.description)}</textarea></label><label class="am-check am-span-2"><input type="checkbox" name="active" ${product.active!==false?'checked':''}> Đang kinh doanh</label></div>`,onOpen:form=>{
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
  await ERP.saveProduct({code,name:form.elements.name.value,category:form.elements.category.value,price:Number(form.elements.price.value),sizes,description:form.elements.description.value,active:form.elements.active.checked});
  await M.refresh();M.toast(code?'Đã cập nhật sản phẩm.':'Đã thêm mẫu sản phẩm.');
 }});
}
function stockNoteForm(code){
 const product=M.data.products.find(row=>row.code===code),note=M.data.stockNotes?.[code]||{};
 const reasons=['','Bán chậm','Hết mùa','Lệch size / màu','Giá chưa phù hợp','Hàng lỗi / chờ xử lý','Nhu cầu thấp','Khác'];
 if(note.reason&&!reasons.includes(note.reason))reasons.push(note.reason);
 const actions=['Theo dõi thêm','Bổ sung kích cỡ','Điều chỉnh trưng bày','Xem xét ưu đãi','Trả hàng nhà cung cấp'];
 const currentAction=String(note.action||'').trim();
 if(currentAction&&!actions.includes(currentAction))actions.push(currentAction);
 const otherAction='__other_action__';
 M.dialog({title:'Đánh giá hàng hóa · '+product.name,body:`<div class="am-form-grid"><label class="am-field">Tình trạng cần theo dõi<select name="reason">${reasons.map(reason=>`<option value="${e(reason)}" ${reason===(note.reason||'')?'selected':''}>${e(reason||'Chưa đánh giá')}</option>`).join('')}</select></label><label class="am-field">Ngưỡng sắp hết (sản phẩm / mẫu)<input name="threshold" type="number" min="0" max="100000" step="1" required value="${note.threshold??5}"></label><label class="am-field am-span-2">Hướng xử lý<select name="action"><option value="">Chưa chọn</option>${actions.map(action=>`<option value="${e(action)}" ${action===currentAction?'selected':''}>${e(action)}</option>`).join('')}<option value="${otherAction}">Khác — ghi rõ</option></select></label><label class="am-field am-span-2" data-action-other hidden>Hướng xử lý khác<input name="actionOther" maxlength="300" disabled></label><label class="am-field am-span-2">Ghi chú đánh giá<textarea name="note" rows="3" maxlength="1000">${e(note.note)}</textarea></label></div>`,onOpen:form=>{
  const update=()=>{const other=form.elements.action.value===otherAction;form.querySelector('[data-action-other]').hidden=!other;form.elements.actionOther.disabled=!other;form.elements.actionOther.required=other;};
  form.elements.action.addEventListener('change',update);update();
 },onSubmit:async form=>{
  const other=form.elements.action.value===otherAction;
  const action=(other?form.elements.actionOther.value:form.elements.action.value).trim();
  if(other&&!action)throw new Error('Nhập hướng xử lý khác.');
  await ERP.saveStockNote(code,{reason:form.elements.reason.value,threshold:Number(form.elements.threshold.value),action,note:form.elements.note.value});await M.refresh();M.toast('Đã lưu đánh giá hàng hóa.');
 }});
}
function showProduct(code){
 const product=M.data.products.find(row=>row.code===code);if(!product)return;
 const notes=M.data.stockNotes?.[code]||{},variants=productVariants(product),unit=productUnit(product),needs=sizeNeedsReplenishment(product);
 const docs=M.data.movements.filter(doc=>[...(doc.items||[]),...(doc.returnedItems||[])].some(item=>item.code===code)).sort((a,b)=>n(b.when)-n(a.when)).slice(0,6);
 const movementQuantity=doc=>{
  const outgoing=(doc.items||[]).filter(item=>item.code===code).reduce((sum,item)=>sum+n(item.qty),0);
  if(doc.type!=='exchange')return number.format(outgoing);
  const incoming=(doc.returnedItems||[]).filter(item=>item.code===code).reduce((sum,item)=>sum+n(item.qty),0);
  return (incoming?`<span class="am-flow-in">+${number.format(incoming)} nhận lại</span>`:'')+(outgoing?`<span class="am-flow-out">−${number.format(outgoing)} giao khách</span>`:'');
 };
 const cards=variants.map(row=>{
  const low=product.active!==false&&row.available<=SIZE_REPLENISHMENT_THRESHOLD;
  const label=low?(row.available===0?'Hết hàng có thể bán':`Cần bổ sung: còn ${number.format(row.available)} ${unit}`):(product.active===false?'Có thể xuất: ':'Có thể bán: ')+number.format(row.available)+' '+unit;
  return `<div class="${low?(row.available===0?'am-size-missing':'am-size-low'):row.total===0?'empty':''}"><span>${e(row.size)}</span><strong>${number.format(row.total)}</strong><small>${e(unit)}</small><span class="am-size-status">${e(label)}</span>${row.held>0?`<small class="am-held-note">${number.format(row.held)} chờ xử lý</small>`:''}</div>`;
 }).join('');
 const dialog=M.dialog({title:product.name,wide:true,body:`<div class="am-product-detail-head"><span class="am-product-art large">${M.icon(productIcon(product))}</span><div><strong>${e(product.code)}</strong><p>${e(product.category)} · ${M.money(product.price)}</p></div>${productStatus(product)}</div><div class="am-detail-stats"><div><span>Tổng số lượng hàng</span><strong>${number.format(totalProductQuantity(product))} ${e(unit)}</strong></div><div><span>Có thể bán / xuất</span><strong>${number.format(productQuantity(product))} ${e(unit)}</strong></div><div><span>Đánh giá của quản lý</span><strong>${e(notes.reason||'Chưa ghi nhận vấn đề')}</strong></div>${heldQuantity(product)>0?`<div><span>Hàng lỗi / chờ xử lý</span><strong>${number.format(heldQuantity(product))} ${e(unit)}</strong></div>`:''}</div><h3 class="am-subheading">Số lượng theo kích cỡ</h3><div class="am-size-grid">${cards}</div>${notes.action||notes.note?`<div class="am-note"><strong>${e(notes.action||'Ghi chú đánh giá')}</strong>${notes.note?`<p>${e(notes.note)}</p>`:''}</div>`:''}<div class="am-actions"><button class="am-btn secondary" type="button" data-product-note>${M.icon('edit')} Đánh giá hàng hóa</button><button class="am-btn secondary" type="button" data-product-change>Sửa sản phẩm</button></div><h3 class="am-subheading">Chứng từ gần nhất</h3>${docs.length?`<div class="am-table-wrap"><table class="am-table"><thead><tr><th>Chứng từ</th><th>Ngày</th><th>Loại</th><th class="am-right">Biến động liên quan</th></tr></thead><tbody>${docs.map(doc=>`<tr><td>${e(doc.id)}</td><td>${M.date(doc.when)}</td><td>${e(({receipt:'Nhập kho',dispatch:'Xuất kho',transfer:'Luân chuyển nội bộ cũ',sale:'Bán hàng',exchange:'Đổi hàng'})[doc.type]||doc.type)}</td><td class="am-right">${movementQuantity(doc)}</td></tr>`).join('')}</tbody></table></div>`:M.empty('Chưa có chứng từ')}`,onOpen:form=>{
  form.querySelector('[data-product-note]').addEventListener('click',()=>{dialog.close();stockNoteForm(code);});
  form.querySelector('[data-product-change]').addEventListener('click',()=>{dialog.close();editProduct(code);});
 }});
}
M.register('inventory',{
 title:'Hàng hóa',kicker:'MỘT CỬA HÀNG · MỘT NGUỒN HÀNG CHUNG',
 render(){
  const d=M.data,available=d.balances.reduce((sum,row)=>sum+rowAvailable(row),0),held=d.balances.reduce((sum,row)=>sum+n(row.held),0),total=available+held,empty=d.products.filter(p=>p.active===false||productQuantity(p)===0).length;
  const cats=[...new Set(d.products.map(row=>row.category))];
  return `<div class="am-stat-grid am-inventory-stats">${stat('Mẫu sản phẩm',number.format(d.products.length),'inventory','')}${stat('Tổng số lượng hàng',number.format(total)+'<small> sản phẩm</small>','inventory',`${number.format(available)} sẵn có · ${number.format(held)} chờ xử lý`)}${stat('Mẫu chưa thể bán',number.format(empty),'alert','')}${stat('Được đánh dấu bán chậm',number.format(d.products.filter(p=>d.stockNotes?.[p.code]?.reason==='Bán chậm'&&totalProductQuantity(p)>0).length),'edit','')}</div><section class="am-panel"><div class="am-panel-head"><div><h2>Danh sách hàng hóa</h2><p id="am-inventory-count">${e(inventoryCountText())}</p></div><div class="am-actions"><button type="button" class="am-btn secondary" id="am-stock-export">${M.icon('download')} Xuất danh sách hàng</button><button type="button" class="am-btn" id="am-product-new">${M.icon('plus')} Thêm sản phẩm</button></div></div><div class="am-toolbar am-filterbar"><label class="am-search">${M.icon('search')}<input type="search" id="am-stock-search" value="${e(inventoryFilters.search)}" placeholder="Tìm mã hoặc tên sản phẩm…" aria-label="Tìm sản phẩm"></label><select id="am-stock-category" aria-label="Danh mục sản phẩm"><option value="">Tất cả danh mục</option>${cats.map(cat=>`<option value="${e(cat)}" ${inventoryFilters.category===cat?'selected':''}>${e(cat)}</option>`).join('')}</select><select id="am-stock-state" aria-label="Lọc trạng thái hàng hóa">${[['all','Tất cả hàng hóa'],['size-low','Kích cỡ cần bổ sung'],['low','Sắp hết hàng'],['empty','Chưa có hàng để bán'],['slow','Đánh dấu bán chậm'],['reason','Có đánh giá / xử lý'],['inactive','Ngừng kinh doanh']].map(([value,label])=>`<option value="${value}" ${inventoryFilters.stock===value?'selected':''}>${label}</option>`).join('')}</select></div><div class="am-table-wrap" id="am-inventory-results">${inventoryRows()}</div></section>`;
 },
 bind(root){
  root.querySelector('#am-stock-search').addEventListener('input',event=>{inventoryFilters.search=event.target.value;updateInventoryRows(root);});
  Search.attach(root.querySelector('#am-stock-search'),{items:()=>filteredProducts().map(product=>({value:product.name,label:product.name,detail:`${product.code} · ${product.category} · ${number.format(totalProductQuantity(product))} ${e(productUnit(product))}`,searchText:[product.name,product.code,product.category]}))});
  root.querySelector('#am-stock-category').addEventListener('change',event=>{inventoryFilters.category=event.target.value;updateInventoryRows(root);});
  root.querySelector('#am-stock-state').addEventListener('change',event=>{inventoryFilters.stock=event.target.value;updateInventoryRows(root);});
  root.querySelector('#am-product-new').addEventListener('click',()=>editProduct());
  root.querySelector('#am-stock-export').addEventListener('click',()=>M.downloadCSV('Atino-hang-hoa-'+M.today()+'.csv',[['Mã','Tên sản phẩm','Danh mục','Kích cỡ','Tổng số lượng hàng','Có thể bán / xuất','Chờ xử lý','Đơn vị','Giá bán','Cảnh báo kích cỡ','Đánh giá của quản lý','Hướng xử lý'],...filteredProducts().flatMap(product=>M.data.balances.filter(row=>row.code===product.code).map(row=>[product.code,product.name,product.category,row.size,rowAvailable(row)+n(row.held),rowAvailable(row),n(row.held),productUnit(product),product.price,sizeNeedsReplenishment(product).some(size=>size.size===row.size)?'Cần bổ sung':'',M.data.stockNotes?.[product.code]?.reason||'',M.data.stockNotes?.[product.code]?.action||'']))]));
  bindInventoryRows(root);
 }
});
function supplierDocuments(id){return M.data.movements.filter(doc=>doc.supplierId===id&&doc.type==='receipt');}
function filteredSuppliers(){return M.data.suppliers.filter(row=>Search.match([row.id,row.name,row.contact,row.phone],supplierFilters.search)&&(supplierFilters.status==='all'||supplierFilters.status==='active'&&row.active!==false||supplierFilters.status==='inactive'&&row.active===false));}
function supplierRows(){const rows=filteredSuppliers();return rows.length?`<table class="am-table"><thead><tr><th>Nhà cung cấp</th><th>Người liên hệ</th><th>Điện thoại</th><th class="am-right">Phiếu nhập</th><th class="am-right">Giá trị nhập đã ghi nhận</th><th>Trạng thái</th><th></th></tr></thead><tbody>${rows.map(row=>{const docs=supplierDocuments(row.id);return `<tr><td><button class="am-text-btn" type="button" data-supplier-view="${e(row.id)}"><strong>${e(row.name)}</strong><small>${e(row.id)}</small></button></td><td>${e(row.contact||'—')}</td><td>${e(row.phone||'—')}</td><td class="am-right">${docs.length}</td><td class="am-right am-nowrap">${M.money(docs.reduce((sum,doc)=>sum+n(receiptValue(doc)),0))}${docs.some(pendingReceipt)?`<small class="am-quantity-note">${docs.filter(pendingReceipt).length} phiếu chờ giá nhập</small>`:''}</td><td>${M.badge(row.active!==false?'Đang hợp tác':'Ngừng hợp tác',row.active!==false?'green':'neutral')}</td><td><button type="button" class="am-icon-btn" data-supplier-edit="${e(row.id)}" aria-label="Sửa ${e(row.name)}">${M.icon('edit')}</button></td></tr>`;}).join('')}</tbody></table>`:M.empty('Chưa có nhà cung cấp phù hợp');}
function bindSupplierRows(root){root.querySelectorAll('[data-supplier-edit]').forEach(button=>button.addEventListener('click',()=>editSupplier(button.dataset.supplierEdit)));root.querySelectorAll('[data-supplier-view]').forEach(button=>button.addEventListener('click',()=>showSupplier(button.dataset.supplierView)));}
function editSupplier(id){
 const row=M.data.suppliers.find(s=>s.id===id)||{};
 M.dialog({title:id?'Chỉnh sửa nhà cung cấp':'Thêm nhà cung cấp',wide:true,body:`<div class="am-form-grid"><label class="am-field am-span-2">Tên nhà cung cấp<input name="name" required maxlength="150" value="${e(row.name)}" placeholder="Tên công ty hoặc kho cung cấp"></label><label class="am-field">Người liên hệ<input name="contact" maxlength="100" value="${e(row.contact)}"></label><label class="am-field">Số điện thoại<input name="phone" type="tel" maxlength="20" value="${e(row.phone)}"></label><label class="am-field am-span-2">Email<input name="email" type="email" maxlength="150" value="${e(row.email)}"></label><label class="am-field am-span-2">Địa chỉ<input name="address" maxlength="300" value="${e(row.address)}"></label><label class="am-field am-span-2">Ghi chú<textarea name="note" rows="3" maxlength="1000">${e(row.note)}</textarea></label><label class="am-check am-span-2"><input type="checkbox" name="active" ${row.active!==false?'checked':''}> Đang hợp tác</label></div>`,onSubmit:async form=>{const values=Object.fromEntries(new FormData(form));await ERP.saveSupplier({...values,id,active:form.elements.active.checked});await M.refresh();M.toast('Đã lưu nhà cung cấp.');}});
}
function showSupplier(id){
 const row=M.data.suppliers.find(s=>s.id===id);if(!row)return;
 const docs=supplierDocuments(id).sort((a,b)=>n(b.when)-n(a.when));
 M.dialog({title:row.name,wide:true,body:`<dl class="am-kv"><div><dt>Mã nhà cung cấp</dt><dd>${e(row.id)}</dd></div><div><dt>Trạng thái</dt><dd>${M.badge(row.active!==false?'Đang hợp tác':'Ngừng hợp tác',row.active!==false?'green':'neutral')}</dd></div><div><dt>Người liên hệ</dt><dd>${e(row.contact||'—')}</dd></div><div><dt>Điện thoại</dt><dd>${e(row.phone||'—')}</dd></div><div><dt>Email</dt><dd>${e(row.email||'—')}</dd></div><div><dt>Địa chỉ</dt><dd>${e(row.address||'—')}</dd></div></dl>${row.note?`<p class="am-note">${e(row.note)}</p>`:''}<h3 class="am-subheading">Lịch sử nhập hàng</h3>${docs.length?`<div class="am-table-wrap"><table class="am-table"><thead><tr><th>Phiếu nhập</th><th>Ngày</th><th class="am-right">Số lượng</th><th class="am-right">Giá trị</th><th>Người lập</th></tr></thead><tbody>${docs.map(doc=>`<tr><td class="am-code">${e(doc.id)}</td><td>${M.date(doc.when)}</td><td class="am-right">${doc.items.reduce((sum,item)=>sum+n(item.qty),0)}</td><td class="am-right">${pendingReceipt(doc)?M.badge('Chờ bổ sung giá nhập','amber'):M.money(receiptValue(doc))}</td><td>${e(doc.employeeName||'—')}</td></tr>`).join('')}</tbody></table></div>`:M.empty('Chưa có phiếu nhập liên kết')}`});
}
M.register('suppliers',{
 title:'Nhà cung cấp',kicker:'QUẢN LÝ NGUỒN HÀNG & ĐỐI TÁC',
 render(){const rows=M.data.suppliers;return `<div class="am-mini-summary"><span>${M.icon('suppliers')}<strong>${rows.length}</strong> nhà cung cấp</span><span><i class="am-status-dot"></i><strong>${rows.filter(row=>row.active!==false).length}</strong> đang hợp tác</span></div><section class="am-panel"><div class="am-panel-head"><div><h2>Danh sách nhà cung cấp</h2></div><button type="button" class="am-btn" id="am-supplier-new">${M.icon('plus')} Thêm nhà cung cấp</button></div><div class="am-toolbar am-filterbar"><label class="am-search">${M.icon('search')}<input type="search" id="am-supplier-search" value="${e(supplierFilters.search)}" placeholder="Tìm nhà cung cấp, mã, số điện thoại…" aria-label="Tìm nhà cung cấp"></label><select id="am-supplier-state" aria-label="Trạng thái nhà cung cấp">${[['all','Tất cả trạng thái'],['active','Đang hợp tác'],['inactive','Ngừng hợp tác']].map(([value,label])=>`<option value="${value}" ${supplierFilters.status===value?'selected':''}>${label}</option>`).join('')}</select></div><div id="am-supplier-results" class="am-table-wrap">${supplierRows()}</div></section>`;},
 bind(root){root.querySelector('#am-supplier-new').addEventListener('click',()=>editSupplier());const update=()=>{root.querySelector('#am-supplier-results').innerHTML=supplierRows();bindSupplierRows(root);};root.querySelector('#am-supplier-search').addEventListener('input',event=>{supplierFilters.search=event.target.value;update();});Search.attach(root.querySelector('#am-supplier-search'),{items:()=>filteredSuppliers().map(row=>({value:row.name,label:row.name,detail:[row.id,row.contact,row.phone].filter(Boolean).join(' · '),searchText:[row.id,row.name,row.contact,row.phone]}))});root.querySelector('#am-supplier-state').addEventListener('change',event=>{supplierFilters.status=event.target.value;update();});bindSupplierRows(root);}
});
})();

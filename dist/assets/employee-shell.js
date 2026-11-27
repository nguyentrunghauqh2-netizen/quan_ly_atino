/* Employee workspace: the same Atino visual language, three daily workflows. */
(() => {
  'use strict';
  const Search = window.AtinoSearch;
  const ERP = window.AtinoERP;
  const icon = name => window.AtinoManager.icon(name);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const num = value => new Intl.NumberFormat('vi-VN').format(Number(value) || 0);
  const cash = value => Number.isFinite(value) ? ERP.money(value) : '—';
  const dateTime = value => Number.isFinite(value) ? new Intl.DateTimeFormat('vi-VN',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Ho_Chi_Minh'}).format(value) : '—';
  const routes = {
    receipt:{title:'Nhập kho',icon:'receipts',create:'Lập phiếu nhập',history:'Phiếu nhập đã lập',type:'receipt',quantity:'Sản phẩm đã nhập',party:'Nhà cung cấp'},
    transfer:{title:'Xuất kho',icon:'dispatches',create:'Lập phiếu xuất',history:'Phiếu xuất đã lập',type:'dispatch',quantity:'Sản phẩm đã xuất',party:'Nơi nhận'},
    sale:{title:'Bán hàng',icon:'sales',create:'Tạo hóa đơn',history:'Hóa đơn đã lập',type:'sale',quantity:'Sản phẩm đã bán',party:'Khách hàng'}
  };
  const filters = Object.fromEntries(Object.keys(routes).map(key=>[key,{query:'',from:'',to:''}]));
  let app, route='sale', mode='create', searchControl, shiftRequest=0, shiftState='loading';
  let ownShifts=[];
  const editor = document.getElementById('transaction');
  const notice = document.getElementById('notice');
  const editorHome = document.createComment('Atino transaction home');
  const noticeHome = document.createComment('Atino notice home');
  editor.before(editorHome); notice.before(noticeHome);
  const ownDocs = () => (state.movements||[]).filter(doc=>doc.employeeId===currentUser?.code&&doc.type===routes[route].type).sort((a,b)=>(b.when||0)-(a.when||0));
  const textFor = doc => [doc.id,doc.customerId,doc.employeeId,doc.sellerId,doc.cashierId,doc.supplierId,doc.supplierName,doc.destination,doc.customerName,doc.reason,doc.note,...(doc.items||[]).flatMap(item=>[item.name,item.code,item.size])];
  const quantity = doc => (doc.items||[]).reduce((sum,item)=>sum+(Number(item.qty)||0),0);
  function allowedEmployee(){return currentUser?.role==='employee';}
  function build(){
    if(app)return;
    app=document.createElement('div');app.id='employee-app';app.hidden=true;
    app.innerHTML=`<button class="ae-scrim" type="button" data-ae-close-nav aria-label="Đóng menu"></button><aside class="ae-sidebar"><div class="ae-brand"><span class="ae-mark">A</span><div><strong>ATINO</strong><span>Nhân viên</span></div></div><p class="ae-nav-label">Công việc của bạn</p><nav aria-label="Công việc nhân viên">${Object.entries(routes).map(([key,value])=>`<button type="button" data-ae-route="${key}">${icon(value.icon)}<span>${value.title}</span></button>`).join('')}</nav><div class="ae-sidebar-footer"><p>Dữ liệu minh họa</p><button type="button" data-ae-logout>${icon('logout')} Đăng xuất</button></div></aside><div class="ae-workspace"><header class="ae-topbar"><div class="ae-topbar-left"><button type="button" class="ae-icon-btn ae-menu" data-ae-menu aria-label="Mở menu" aria-expanded="false">${icon('menu')}</button><span>Nhân viên</span>${icon('chevron')}<strong data-ae-breadcrumb></strong></div><div class="ae-account"><button type="button" class="ae-icon-btn" data-ae-refresh aria-label="Cập nhật dữ liệu" title="Cập nhật dữ liệu">${icon('refresh')}</button><button type="button" class="ae-avatar atino-avatar-button" data-ae-avatar aria-label="Tài khoản" title="Tài khoản"></button><div><strong data-ae-name></strong><small>Nhân viên cửa hàng</small></div></div></header><main class="ae-main"><div class="ae-heading"><div><h1 data-ae-title></h1></div><div class="ae-date">${icon('calendar')}<span>${esc(new Intl.DateTimeFormat('vi-VN',{dateStyle:'medium',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date()))}</span></div></div><div class="ae-notice-slot"></div><div class="ae-summary" data-ae-summary></div><section class="ae-panel"><div class="ae-tabs"><button type="button" data-ae-mode="create"></button><button type="button" data-ae-mode="history"></button></div><div class="ae-editor"></div><div class="ae-history" hidden></div></section><footer class="ae-footer"><span>ATINO · Hệ thống quản lý cửa hàng</span></footer></main></div>`;
    document.body.append(app);
    app.querySelector('[data-ae-summary]').addEventListener('click',event=>{
      const button=event.target.closest('[data-summary]');
      if(button) openSummary(button.dataset.summary);
    });
    app.querySelectorAll('[data-ae-route]').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.aeRoute)));
    app.querySelectorAll('[data-ae-mode]').forEach(button=>button.addEventListener('click',()=>{mode=button.dataset.aeMode;renderMode();}));
    app.querySelector('[data-ae-avatar]').addEventListener('click',()=>window.AtinoAccount.open());
    app.querySelector('[data-ae-logout]').addEventListener('click',()=>document.getElementById('logout').click());
    app.querySelector('[data-ae-refresh]').addEventListener('click',async event=>{const button=event.currentTarget;button.disabled=true;try{await refreshStore();await window.AtinoCheckout?.reloadChoices?.();if(mode==='create')refreshEditorOptions();await loadOwnShifts();notify('Đã cập nhật dữ liệu.');}catch(error){notify(error.message);}finally{button.disabled=false;}});
    const menu=app.querySelector('[data-ae-menu]');
    menu.addEventListener('click',()=>{const open=app.classList.toggle('ae-nav-open');menu.setAttribute('aria-expanded',String(open));});
    const closeNav=()=>{app.classList.remove('ae-nav-open');menu.setAttribute('aria-expanded','false');};
    app.querySelector('[data-ae-close-nav]').addEventListener('click',closeNav);
    app.addEventListener('keydown',event=>{if(event.key==='Escape')closeNav();});
  }
  function open(type){
    if(!allowedEmployee()||!routes[type])return;
    build();route=type;mode='create';
    app.querySelector('.ae-editor').append(editor);app.querySelector('.ae-notice-slot').append(notice);
    app.hidden=false;document.body.classList.add('employee-active');app.classList.remove('ae-nav-open');
    app.querySelector('[data-ae-menu]').setAttribute('aria-expanded','false');
    const config=routes[route];
    app.querySelector('[data-ae-title]').textContent=config.title;
    app.querySelector('[data-ae-breadcrumb]').textContent=config.title;
    refreshAccount();
    app.querySelector('[data-ae-mode="create"]').textContent=config.create;
    app.querySelector('[data-ae-mode="history"]').textContent=config.history;
    app.querySelectorAll('[data-ae-route]').forEach(button=>{const active=button.dataset.aeRoute===route;button.classList.toggle('active',active);if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
    renderSummary();renderMode();loadOwnShifts();
  }
  function close(){
    Search.close();searchControl?.destroy();searchControl=null;shiftRequest++;ownShifts=[];shiftState='loading';
    Object.values(filters).forEach(filter=>{filter.query='';filter.from='';filter.to='';});
    document.body.classList.remove('employee-active');
    if(app){app.hidden=true;app.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());}
    editorHome.after(editor);noticeHome.after(notice);
  }
  function refreshAccount(){
    if (!app||!allowedEmployee()) return;
    app.querySelector('[data-ae-name]').textContent=currentUser.name;
    window.AtinoAccount?.paintAvatar(app.querySelector('[data-ae-avatar]'),currentUser);
  }
  function renderSummary(){
    if(!app||!allowedEmployee())return;
    const docs=ownDocs().filter(doc=>Number.isFinite(doc.when)&&ERP.today(doc.when)===ERP.today());
    const config=routes[route];
    const todayShifts=ownShifts.filter(shift=>shift.date===ERP.today()).sort((a,b)=>a.start.localeCompare(b.start));
    const shiftText=todayShifts.length?todayShifts.map(shift=>`${shift.start} – ${shift.end}`).join(' · '):shiftState==='loading'?'Đang tải…':shiftState==='error'?'Chưa tải được ca làm':'Chưa được phân ca';
    app.querySelector('[data-ae-summary]').innerHTML=`<div><button type="button" data-summary="documents" aria-haspopup="dialog"><span>${route==='sale'?'Hóa đơn':'Phiếu'} bạn lập hôm nay</span><strong>${num(docs.length)}</strong></button></div><div><button type="button" data-summary="items" aria-haspopup="dialog"><span>${esc(config.quantity)} hôm nay</span><strong>${num(docs.reduce((sum,doc)=>sum+quantity(doc),0))}</strong></button></div><div class="ae-shift-summary"><span>${icon('clock')} Ca làm hôm nay</span><strong>${esc(shiftText)}</strong><small>${todayShifts.length?(todayShifts.every(shift=>shift.status==='completed')?'Đã hoàn thành':'Đã phân ca'):''}</small></div>`;
  }
  async function loadOwnShifts(){
    const token=++shiftRequest,code=currentUser?.code;
    try{const data=await ERP.checkoutData();if(token!==shiftRequest||!allowedEmployee()||currentUser.code!==code)return;ownShifts=data.shifts||[];shiftState='ready';renderSummary();}
    catch{if(token===shiftRequest&&allowedEmployee()){shiftState='error';renderSummary();}}
  }
  function refreshEditorOptions(){
    for(const line of document.querySelectorAll('#transaction-lines .movement')){
      const select=line.querySelector('[name="item"]'),previous=select.value,sizeSelect=line.querySelector('[name="size"]'),size=sizeSelect.value;
      select.innerHTML='<option value="">Chọn sản phẩm</option>'+selectableProducts().map(product=>`<option value="${esc(product.code)}">${esc(product.code)} · ${esc(product.name)}${product.active===false?' · Ngừng bán':''}</option>`).join('');
      select.value=previous;fillSizes(line);sizeSelect.value=size;
      if(movementType==='receipt' && !select.value) fillReceiptPrice(line);
      const quick=line.querySelector('[data-product-query]');if(quick)quick.value=selectableProducts().find(product=>product.code===select.value)?.name||'';
    }
    updateTotal();
  }
  function renderMode(){
    Search.close();
    app.querySelectorAll('[data-ae-mode]').forEach(button=>{const selected=button.dataset.aeMode===mode;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));});
    app.querySelector('.ae-editor').hidden=mode!=='create';app.querySelector('.ae-history').hidden=mode!=='history';
    if(mode==='history')renderHistory();
  }
  function datedDocs(){
    const f=filters[route];
    return ownDocs().filter(doc=>{const day=Number.isFinite(doc.when)?ERP.today(doc.when):'';return (!f.from||day>=f.from)&&(!f.to||day<=f.to);});
  }
  function filteredDocs(){return datedDocs().filter(doc=>Search.match(textFor(doc),filters[route].query));}
  function invalidRange(){const f=filters[route];return !!(f.from&&f.to&&f.to<f.from);}
  function renderHistory(){
    searchControl?.destroy();
    const panel=app.querySelector('.ae-history'),config=routes[route],f=filters[route];
    panel.innerHTML=`<div class="ae-history-toolbar"><label class="ae-query">Tìm ${route==='sale'?'hóa đơn':'phiếu'}<input type="search" data-ae-query value="${esc(f.query)}" placeholder="Gõ mã phiếu, tên hàng, ví dụ: áo, balo…"></label><label>Từ ngày<input type="date" data-ae-from value="${esc(f.from)}"></label><label>Đến ngày<input type="date" data-ae-to value="${esc(f.to)}"></label><button type="button" class="ae-btn secondary" data-ae-export>${icon('download')} Tải Excel</button></div><p class="ae-filter-error" data-ae-filter-error role="alert" hidden>Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.</p><p class="ae-results" data-ae-results></p><div class="ae-table-wrap"><table class="ae-table"><thead><tr><th>${route==='sale'?'Hóa đơn':'Mã phiếu'}</th><th>Thời gian</th><th>${esc(config.party)}</th><th class="ae-numeric">Số lượng</th>${route==='sale'?'<th class="ae-numeric">Thực thu</th>':''}<th><span class="ae-sr-only">Thao tác</span></th></tr></thead><tbody data-ae-rows></tbody></table></div>`;
    const query=panel.querySelector('[data-ae-query]');
    searchControl=Search.attach(query,{items:()=>datedDocs().map(doc=>({value:doc.id,label:doc.id,detail:(doc.items||[]).map(item=>item.name).join(', '),searchText:textFor(doc)})),onSelect:item=>showDetail(item.value)});
    query.addEventListener('input',()=>{f.query=query.value;renderRows();});
    for(const key of ['from','to'])panel.querySelector('[data-ae-'+key+']').addEventListener('change',event=>{f[key]=event.target.value;Search.close();renderRows();});
    panel.querySelector('[data-ae-export]').addEventListener('click',exportHistory);
    panel.onclick=event=>{const button=event.target.closest('[data-ae-detail]');if(button)showDetail(button.dataset.aeDetail);};
    renderRows();
  }
  function party(doc){return route==='receipt'?(doc.supplierName||doc.note||'—'):route==='transfer'?(doc.destination||'—'):(doc.customerName||'Khách lẻ');}
  function renderRows(){
    const panel=app.querySelector('.ae-history'),invalid=invalidRange(),docs=invalid?[]:filteredDocs();
    panel.querySelector('[data-ae-filter-error]').hidden=!invalid;panel.querySelector('[data-ae-export]').disabled=invalid||!docs.length;
    panel.querySelector('[data-ae-results]').textContent=invalid?'':`${num(docs.length)} ${route==='sale'?'hóa đơn':'phiếu'} · ${num(docs.reduce((sum,doc)=>sum+quantity(doc),0))} sản phẩm`;
    panel.querySelector('[data-ae-rows]').innerHTML=docs.length?docs.map(doc=>`<tr><td><button type="button" class="ae-code ae-invoice-link" data-ae-detail="${esc(doc.id)}" aria-haspopup="dialog">${esc(doc.id)}</button><small>${esc((doc.items||[]).slice(0,2).map(item=>item.name).join(', '))}${(doc.items||[]).length>2?'…':''}</small></td><td>${esc(dateTime(doc.when))}</td><td>${esc(party(doc))}</td><td class="ae-numeric">${num(quantity(doc))}</td>${route==='sale'?`<td class="ae-numeric"><strong>${cash(doc.total)}</strong></td>`:''}<td class="ae-actions"><button type="button" class="ae-btn secondary small" data-ae-detail="${esc(doc.id)}">Chi tiết</button></td></tr>`).join(''):`<tr><td colspan="${route==='sale'?6:5}"><div class="ae-empty">${icon('sales')}<strong>${invalid?'Kiểm tra khoảng ngày':'Chưa có '+(route==='sale'?'hóa đơn':'phiếu')+' phù hợp'}</strong></div></td></tr>`;
  }
  function renderProductGroups(doc, highlight){
 const groups=new Map();
 for(const item of doc.items||[]){
  if(!groups.has(item.code))groups.set(item.code,{name:item.name,qty:0,items:[]});
  const group=groups.get(item.code);group.qty+=Number(item.qty)||0;group.items.push(item);
 }
 return [...groups].map(([code,group])=>`<details class="ae-product-group" ${highlight===code?'open':''}><summary><strong>${esc(group.name)} · ${esc(code)}</strong><span>${num(group.qty)} sản phẩm</span></summary><table class="ae-table"><thead><tr><th>Kích cỡ</th><th>Số lượng</th>${doc.type==='dispatch'?'':'<th>Giá bán</th>'}</tr></thead><tbody>${group.items.map(i=>`<tr><td>${esc(i.size||'Chưa phân size')}</td><td>${num(i.qty)}</td>${doc.type==='dispatch'?'':`<td>${cash(doc.type==='receipt'?i.sellingPrice:i.unitPrice)}</td>`}</tr>`).join('')}</tbody></table></details>`).join('');
}
  function openSummary(kind,code){
 const docs=ownDocs().filter(d=>Number.isFinite(d.when)&&ERP.today(d.when)===ERP.today());
 let title,body;
 if(kind==='items'&&!code){
  title=routes[route].quantity+' hôm nay';
  const groups=new Map();
  for(const doc of docs)for(const item of doc.items||[]){
   const row=groups.get(item.code)||{name:item.name,qty:0};row.qty+=Number(item.qty)||0;groups.set(item.code,row);
  }
  body=[...groups].map(([id,row])=>`<tr><td><button type="button" class="ae-invoice-link" data-summary-item="${esc(id)}">${esc(row.name)} · ${esc(id)}</button></td><td>${num(row.qty)}</td></tr>`).join('');
 }else{
  title=code?'Chứng từ hôm nay · '+code:routes[route].history+' hôm nay';
  body=docs.filter(d=>!code||d.items.some(i=>i.code===code)).map(d=>`<tr><td><button type="button" class="ae-invoice-link" data-summary-doc="${esc(d.id)}">${esc(d.id)}</button></td><td>${esc(party(d))}</td><td>${num(code?d.items.filter(i=>i.code===code).reduce((sum,i)=>sum+i.qty,0):quantity(d))}</td></tr>`).join('');
 }
 const heads=kind==='items'&&!code?['Sản phẩm','Số lượng']:['Chứng từ',routes[route].party,'Số lượng'];
 const dialog=document.createElement('dialog');dialog.className='ae-dialog';dialog.setAttribute('aria-label',title);
 dialog.innerHTML=`<header><h2>${esc(title)}</h2></header><div class="ae-dialog-body">${body?`<table class="ae-table"><thead><tr>${heads.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`:'<p>Hôm nay chưa có chứng từ.</p>'}</div><footer><button class="ae-btn secondary" type="button" data-summary-close>Đóng</button></footer>`;
 app.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});
 dialog.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.summaryItem) openSummary('items',button.dataset.summaryItem);
  if(button.dataset.summaryDoc) showDetail(button.dataset.summaryDoc,code);
  if(button.hasAttribute('data-summary-close'))dialog.close();
 });dialog.showModal();
}
  function showDetail(id,highlight=''){
    const doc=ownDocs().find(row=>row.id===id);if(!doc)return;
    const sale=doc.type==='sale';
    const dialog=document.createElement('dialog');dialog.className='ae-dialog';dialog.setAttribute('aria-labelledby','ae-detail-title');
    dialog.innerHTML=`<header><div><p>${routes[route].history}</p><h2 id="ae-detail-title">${esc(doc.id)}</h2></div><button type="button" class="ae-icon-btn" data-ae-dismiss aria-label="Đóng">${icon('close')}</button></header><div class="ae-dialog-body"><dl class="ae-detail-meta"><div><dt>Thời gian</dt><dd>${esc(dateTime(doc.when))}</dd></div><div><dt>${esc(routes[route].party)}</dt><dd>${esc(party(doc))}${doc.customerId||doc.supplierId?' · '+esc(doc.customerId||doc.supplierId):''}</dd></div>${ERP.documentPeople(doc).map(([label,name])=>`<div><dt>${esc(label)}</dt><dd>${esc(name)}</dd></div>`).join('')}</dl>${renderProductGroups(doc,highlight)}${sale?`<div class="ae-sale-totals"><p><span>Tạm tính</span><strong>${cash(doc.gross??(doc.items||[]).reduce((sum,item)=>sum+item.qty*item.unitPrice,0))}</strong></p><p class="ae-grand-total"><span>Thực thu</span><strong>${cash(doc.total)}</strong></p><p><span>Thanh toán</span><span>${esc(doc.method||doc.note||'—')}</span></p>${doc.cashReceived!=null?`<p><span>Tiền khách đưa</span><strong>${cash(doc.cashReceived)}</strong></p><p><span>Tiền trả lại</span><strong>${cash(doc.change||0)}</strong></p>`:''}</div>`:''}</div><footer><button type="button" class="ae-btn secondary" data-ae-dismiss>Đóng</button>${sale?`<button type="button" class="ae-btn" data-ae-print data-print-invoice="${esc(doc.id)}">In hóa đơn</button>`:''}</footer>`;
    app.append(dialog);const previousFocus=document.activeElement;
    dialog.querySelectorAll('[data-ae-dismiss]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
    const print=dialog.querySelector('[data-ae-print]');if(print)print.addEventListener('click',()=>printInvoice(print));
    dialog.addEventListener('close',()=>{dialog.remove();if(previousFocus?.isConnected)previousFocus.focus();},{once:true});
    dialog.showModal();
  }
  function exportHistory(event){
    if(invalidRange())return;
    const sale=route==='sale';
    const rows=[['Mã phiếu','Thời gian','Người lập',routes[route].party,'Số lượng',...(sale?['Thực thu','Phương thức']:[])],...filteredDocs().map(doc=>[doc.id,window.AtinoReports.localTime(doc.when),doc.employeeName||currentUser.name,party(doc),quantity(doc),...(sale?[doc.total,doc.method||doc.note||'']:[])])];
    const formats = sale ? {1:'datetime',5:'money'} : {1:'datetime'};
    window.AtinoManager.downloadTable(`Atino_${route}_${currentUser.code}`,routes[route].history,rows,event.currentTarget,formats);
  }
  window.AtinoEmployee={open,close,refresh(){if(app&&!app.hidden&&allowedEmployee()){refreshAccount();renderSummary();if(mode==='history')renderHistory();loadOwnShifts();}}};
  const previousStart=startMovement;
  startMovement=function(type){previousStart(type);if(allowedEmployee())open(type);};
  const previousSignOut=signOutView;
  signOutView=function(message=''){close();previousSignOut(message);};
  const previousRefresh=refreshStore;
  refreshStore=async function(){await previousRefresh();window.AtinoEmployee.refresh();};
  if(allowedEmployee()&&page==='transaction')open(movementType);
})();

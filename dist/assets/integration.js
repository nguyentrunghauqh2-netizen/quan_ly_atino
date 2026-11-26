/* Keep existing login and employee workflows connected to the management data. */
(() => {
'use strict';
const ERP=window.AtinoERP;
const Search=window.AtinoSearch;
Search.attach(byId('search'),{items:()=>currentUser?catalogProducts().map(product=>({value:product.name,label:product.name,detail:`${product.code} · ${product.category}`,searchText:[product.name,product.code,product.category]})):[]});
byId('search').placeholder='Gõ tên hoặc mã, ví dụ: áo / ao…';
const baseAddLine=addLine;
addLine=function(){
 const line=baseAddLine();
 const select=line.querySelector('select[name="item"]');
 const label=select.closest('label');
 const picker=document.createElement('div');picker.className='space-y-2';
 const quickLabel=document.createElement('label');quickLabel.textContent='Tìm nhanh sản phẩm';
 const query=document.createElement('input');query.type='search';query.className='field';query.dataset.productQuery='';query.placeholder='Gõ tên hoặc mã, ví dụ: áo / ao…';
 quickLabel.append(query);label.replaceWith(picker);picker.append(quickLabel,label);
 Search.attach(query,{items:()=>Array.from(select.options).filter(option=>option.value&&!option.disabled).map(option=>{const product=selectableProducts().find(row=>row.code===option.value);return {value:product?.name||option.textContent,label:product?.name||option.textContent,detail:[option.value,product?.category,product?.active===false?'Ngừng bán':''].filter(Boolean).join(' · '),searchText:[option.textContent,product?.category],code:option.value};}),onSelect:item=>{
  select.value=item.code;select.dispatchEvent(new Event('input',{bubbles:true}));
 }});
 query.addEventListener('input',()=>{
  if(movementType==='receipt')rememberReceiptSize(line);
  select.value='';fillSizes(line);
  if(movementType==='receipt')restoreReceiptSize(line);
  updateTotal();
 });
 select.addEventListener('input',()=>{const product=selectableProducts().find(row=>row.code===select.value);query.value=product?.name||'';Search.close();});
 return line;
};
const customerPanel=document.createElement('section');
customerPanel.id='checkout-customer';customerPanel.hidden=true;customerPanel.className='rounded-xl bg-slate-50 border border-slate-200 p-4';
customerPanel.innerHTML=`<h3 class="font-semibold text-blue-900 mb-3">Khách hàng</h3><label>Chọn khách hàng<select id="checkout-customer-id" class="field"><option value="">Khách lẻ</option></select></label><p id="checkout-birthday-note" class="text-sm text-slate-600 mt-3" hidden></p>`;
byId('sale-total').before(customerPanel);
const paymentExtra=document.createElement('div');paymentExtra.id='checkout-payment-extra';paymentExtra.className='space-y-3 my-3';byId('payment-total').after(paymentExtra);
let customers=[],supplierRows=[],loadSequence=0;
const otherChoice='__other__';
const dispatchReasons=['Hàng bán chậm, chuyển về kho tổng','Trả hàng nhà cung cấp','Hàng lỗi, trả kho tổng'];
const stockFields=document.createElement('section');stockFields.className='grid sm:grid-cols-2 gap-3';stockFields.hidden=true;
stockFields.innerHTML='<div class="space-y-2"><label>Nơi nhận hàng<select id="employee-export-destination" class="field"><option value="">Chọn nơi nhận hàng</option><option>Kho tổng Atino</option><option value="__other__">Khác — ghi rõ</option></select></label><label data-employee-other="destination" hidden>Nơi nhận khác<input id="employee-export-destination-other" class="field" maxlength="200" disabled placeholder="Nhập nơi nhận cụ thể"></label></div><div class="space-y-2"><label>Lý do xuất<select id="employee-export-reason" class="field"><option value="">Chọn lý do</option>'+dispatchReasons.map(reason=>'<option>'+escapeHtml(reason)+'</option>').join('')+'<option value="__other__">Khác — ghi rõ</option></select></label><label data-employee-other="reason" hidden>Lý do xuất khác<input id="employee-export-reason-other" class="field" maxlength="300" disabled placeholder="Nhập lý do cụ thể"></label></div>';
byId('supplier-field').after(stockFields);
const supplierSelect=document.createElement('select');supplierSelect.name='supplier';supplierSelect.className='field';supplierSelect.innerHTML='<option value="">Chọn nhà cung cấp</option>';transactionForm.elements.supplier.replaceWith(supplierSelect);
function updateExportChoices(){
 const exporting=movementType==='transfer';
 for(const name of ['destination','reason']){
  const select=byId('employee-export-'+name),detail=byId('employee-export-'+name+'-other');
  const other=exporting&&select.value===otherChoice;
  select.required=exporting;detail.required=other;detail.disabled=!other;
  stockFields.querySelector('[data-employee-other="'+name+'"]').hidden=!other;
 }
}
for(const name of ['destination','reason'])byId('employee-export-'+name).addEventListener('change',updateExportChoices);
function populateDestinationChoices(){
 const select=byId('employee-export-destination'),selected=select.value;
 const names=[...new Set(['Kho tổng Atino',...supplierRows.map(row=>row.name),...(state.movements||[]).filter(doc=>doc.type==='dispatch').map(doc=>doc.destination),selected!==otherChoice?selected:''].map(value=>String(value||'').trim()).filter(value=>value&&value!==otherChoice))];
 select.innerHTML='<option value="">Chọn nơi nhận hàng</option>'+names.map(name=>'<option value="'+escapeHtml(name)+'">'+escapeHtml(name)+'</option>').join('')+'<option value="__other__">Khác — ghi rõ</option>';
 select.value=selected;updateExportChoices();
}
function exportChoiceValue(name,label){
 const value=byId('employee-export-'+name).value.trim();
 if(!value)throw new Error('Hãy chọn '+label+'.');
 if(value!==otherChoice)return value;
 const detail=byId('employee-export-'+name+'-other').value.trim();
 if(!detail)throw new Error('Hãy ghi rõ '+label+' khi chọn Khác.');
 return detail;
}
const baseStart=startMovement;
startMovement=function(type){Search.close();baseStart(type);customerPanel.hidden=type!=='sale';stockFields.hidden=type!=='transfer';updateExportChoices();paymentExtra.replaceChildren();loadCustomers();};
async function loadCustomers({throwOnError=false}={}){
 const stamp=++loadSequence;
 try{
  const data=await ERP.checkoutData();if(stamp!==loadSequence||!currentUser)return false;
  const sel=byId('checkout-customer-id'),selectedCustomer=sel.value,selectedSupplierId=supplierSelect.value;
  customers=data.customers||[];supplierRows=data.suppliers||[];
  supplierSelect.innerHTML='<option value="">Chọn nhà cung cấp</option>'+supplierRows.map(s=>`<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)} · ${escapeHtml(s.id)}</option>`).join('');
  supplierSelect.value=supplierRows.some(row=>row.id===selectedSupplierId)?selectedSupplierId:'';
  sel.innerHTML='<option value="">Khách lẻ</option>'+customers.map(c=>`<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}${c.phone?' · '+escapeHtml(c.phone):''} · ${escapeHtml(c.tier)}</option>`).join('');
  sel.value=customers.some(row=>row.id===selectedCustomer)?selectedCustomer:'';
  populateDestinationChoices();updateCustomer();return true;
 }catch(error){byId('checkout-birthday-note').textContent=error.message;byId('checkout-birthday-note').hidden=false;if(throwOnError)throw error;return false;}
}
function updateCustomer(){const c=customers.find(c=>c.id===byId('checkout-customer-id').value),note=byId('checkout-birthday-note');const birthday=c?.birthday?.slice(5)===ERP.today().slice(5);note.textContent=birthday?'Sinh nhật hôm nay':'';note.hidden=!birthday;}
byId('checkout-customer-id').addEventListener('change',updateCustomer);
openPayment=async function(method,lines){
 const input={lines,method,customerId:byId('checkout-customer-id').value,promotion:'auto'};
 const q=await ERP.quoteSale(input);pendingSale={lines,method,total:q.total,erpInput:input,requestId:requestId()};
 byId('payment-title').textContent='Thanh toán '+method.toLowerCase();
 byId('payment-items').innerHTML=q.items.map(i=>`<li>${escapeHtml(i.name)} · ${escapeHtml(i.size)} · ${i.qty} × ${money.format(i.unitPrice)}</li>`).join('');
 byId('payment-total').textContent='Cần thu: '+money.format(q.total);
 paymentExtra.innerHTML=`<p>Khách hàng: <strong>${escapeHtml(q.customerName)}</strong></p><p>Tạm tính: ${money.format(q.gross)} · Giảm giá: ${money.format(q.discount)} · ${escapeHtml(q.promotionLabel)}</p>${method==='Tiền mặt'?`<label class="block">Khách đưa (đ)<input id="checkout-cash" class="field" type="number" min="${q.total}" step="1" value="${q.total}"></label><p id="checkout-change">Tiền trả lại: 0 ₫</p>`:`<label class="block"><input id="checkout-transfer-confirmed" type="checkbox"> Tôi đã kiểm tra và nhận đủ tiền chuyển khoản</label>`}`;
 const cash=byId('checkout-cash');if(cash)cash.addEventListener('input',()=>{byId('checkout-change').textContent='Tiền trả lại: '+money.format(Math.max(0,Number(cash.value)-q.total));});
 byId('payment-error').textContent='';byId('confirm-sale').textContent='Xác nhận · Lưu hóa đơn';byId('confirm-sale').disabled=false;
 const showTransferQr=method==='Chuyển khoản'&&q.total>0&&Boolean(transferAccount);
 byId('transfer-qr-panel').hidden=!showTransferQr;byId('payment-qr').hidden=true;
 if(showTransferQr){byId('payment-account').textContent=transferAccount.number+' '+transferAccount.bank;try{drawQr(byId('payment-qr'),transferPayload(q.total));byId('payment-qr').hidden=false;}catch(error){byId('payment-error').textContent='Chưa tạo được QR. Kiểm tra thông tin chuyển khoản và xác nhận thủ công.';}}
 paymentDialog.showModal();byId('payment-title').focus();
};
window.AtinoCheckout={reloadChoices:()=>loadCustomers({throwOnError:true}),supplierSelection:id=>{const row=supplierRows.find(s=>s.id===id);return row?{id:row.id,name:row.name}:null;},async save(draft){
 const cash=byId('checkout-cash');if(cash&&(cash.value===''||!cash.checkValidity()))throw new Error('Nhập đủ số tiền khách đưa.');
 const payload={...draft.erpInput,requestId:draft.requestId,expectedTotal:draft.total};if(cash)payload.cashReceived=Number(cash.value);else payload.transferConfirmed=!!byId('checkout-transfer-confirmed')?.checked;
 const result=await ERP.saveSale(payload);await refreshStore();return state.movements.find(d=>d.id===result.id);
}};
const originalPersist=persistDocument;
persistDocument=async function(type,lines,extra={}){
 if(currentUser?.role!=='employee'||!['receipt','transfer'].includes(type))return originalPersist(type,lines,extra);
 const payload={type:type==='receipt'?'receipt':'dispatch',lines:lines.map(l=>({code:l.code,size:l.size,qty:l.qty,...(type==='receipt'?{sellingPrice:l.unitPrice}:{})})),note:extra.note||''};
 if(type==='receipt'){const supplier=supplierRows.find(s=>s.id===extra.supplierId);if(!supplier)throw new Error('Chọn nhà cung cấp đã được quản lý khai báo.');payload.supplierId=supplier.id;payload.note=supplier.name;}
 else {payload.destination=exportChoiceValue('destination','nơi nhận hàng');payload.reason=exportChoiceValue('reason','lý do xuất hàng');}
 const signature=JSON.stringify(payload);if(saveAttempt?.signature!==signature)saveAttempt={signature,key:requestId()};
 const result=await ERP.saveStockDocument({...payload,requestId:saveAttempt.key});await refreshStore();saveAttempt=null;return state.movements.find(d=>d.id===result.id);
};
const previousSignOut=signOutView;
signOutView=function(message=''){Search.close();loadSequence++;customers=[];supplierRows=[];customerPanel.hidden=true;byId('checkout-customer-id').innerHTML='<option value="">Khách lẻ</option>';previousSignOut(message);};
const oldShow=show;
show=function(id){Search.close();if(currentUser?.role==='manager'&&['home','staff'].includes(id)&&window.AtinoManager){window.AtinoManager.open().then(()=>window.AtinoManager.go(id==='staff'?'employees':'overview')).catch(error=>notify(error.message));return;}oldShow(id);};
})();

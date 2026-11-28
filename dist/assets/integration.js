/* Keep existing login and employee workflows connected to the management data. */
(() => {
'use strict';
const ERP=window.AtinoERP;
byId('search').placeholder='Gõ tên hoặc mã, ví dụ: áo / ao…';
const buyerFields='<label class="am-field">Khách hàng đã có hồ sơ<select name="existingCustomer" class="field"><option value="">Khách lẻ hoặc nhập khách mới</option></select></label><label class="am-field">Tên khách hàng<input class="field" name="buyerName" maxlength="100" autocomplete="off" placeholder="Nhập tên khách hàng"></label><label class="am-field">Số điện thoại<input class="field" name="buyerPhone" type="tel" maxlength="25" autocomplete="off" placeholder="Nhập số điện thoại"></label>';
function bindBuyer(root, rows) {
 const select = root.querySelector('[name="existingCustomer"]');
 const selected = select.value;
 select.replaceChildren(new Option('Khách lẻ hoặc nhập khách mới', ''));
 for (const customer of rows) {
  select.add(new Option([customer.name, customer.phone || customer.id].filter(Boolean).join(' · '), customer.id));
 }
 select.value = rows.some(customer => customer.id === selected) ? selected : '';
 select.onchange = () => {
  for (const field of root.querySelectorAll('[name="buyerName"], [name="buyerPhone"]')) field.disabled = Boolean(select.value);
 };
 select.onchange();
}
function readBuyer(root){
 const name=root.querySelector('[name="buyerName"]');
 const customerId=root.querySelector('[name="existingCustomer"]').value;
 if(customerId)return {customerId};
 return {buyerName:name.value.trim(),buyerPhone:root.querySelector('[name="buyerPhone"]').value.trim()};
}
const customerPanel=document.createElement('section');
customerPanel.id='checkout-customer';customerPanel.hidden=true;customerPanel.className='rounded-xl bg-slate-50 border border-slate-200 p-4';
customerPanel.innerHTML=`<h3 class="font-semibold text-blue-900 mb-3">Khách hàng</h3>${buyerFields}<label>Người bán<select id="checkout-seller-id" class="field"></select></label><p id="checkout-cashier-name"></p><p id="checkout-customer-error" class="text-sm text-red-700 mt-3" role="alert" hidden></p>`;
byId('sale-total').before(customerPanel);
const paymentExtra=document.createElement('div');paymentExtra.id='checkout-payment-extra';paymentExtra.className='space-y-3 my-3';byId('payment-total').after(paymentExtra);
let customers=[],supplierRows=[],loadSequence=0;

const otherChoice='__other__';
const stockFields=document.createElement('section');stockFields.className='grid sm:grid-cols-2 gap-3';stockFields.hidden=true;
stockFields.innerHTML='<div class="space-y-2"><label>Nơi nhận hàng<select id="employee-export-destination" class="field"><option value="">Chọn nơi nhận hàng</option><option value="__other__">Khác — ghi rõ</option></select></label><label data-employee-other="destination" hidden>Nơi nhận khác<input id="employee-export-destination-other" class="field" maxlength="200" disabled placeholder="Nhập nơi nhận cụ thể"></label></div>';
byId('supplier-field').after(stockFields);
const supplierSelect=document.createElement('select');supplierSelect.name='supplier';supplierSelect.className='field';supplierSelect.innerHTML='<option value="">Chọn nhà cung cấp</option>';transactionForm.elements.supplier.replaceWith(supplierSelect);
function updateExportChoices(){
 const exporting=movementType==='transfer';
 for(const name of ['destination']){
  const select=byId('employee-export-'+name),detail=byId('employee-export-'+name+'-other');
  const other=exporting&&select.value===otherChoice;
  select.required=exporting;detail.required=other;detail.disabled=!other;
  stockFields.querySelector('[data-employee-other="'+name+'"]').hidden=!other;
 }
}
byId('employee-export-destination').addEventListener('change',updateExportChoices);
function populateDestinationChoices(){
 const select=byId('employee-export-destination'),selected=select.value;
 const names=supplierRows.filter(row=>row.id==='NCC001').map(row=>row.name);
 select.innerHTML=names.map(name=>'<option value="'+escapeHtml(name)+'">'+escapeHtml(name)+'</option>').join('');
 select.value=names[0]||'';updateExportChoices();
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
startMovement=function(type){baseStart(type);customerPanel.querySelectorAll('input').forEach(el=>{el.value='';});const buyer=customerPanel.querySelector('[name="existingCustomer"]');buyer.value='';buyer.onchange?.();byId('checkout-seller-id').replaceChildren();customerPanel.hidden=type!=='sale';stockFields.hidden=type!=='transfer';updateExportChoices();paymentExtra.replaceChildren();loadCustomers();};
async function loadCustomers({throwOnError=false}={}){
 const stamp=++loadSequence;
 try{
  const data=await ERP.checkoutData();if(stamp!==loadSequence||!currentUser)return false;
  const sellerSelect=byId('checkout-seller-id');
  const sellerId=sellerSelect.value||currentUser.code;
  sellerSelect.innerHTML=(data.sellers||[]).map(person=>'<option value="'+escapeHtml(person.code)+'">'+escapeHtml(person.name)+'</option>').join('');
  sellerSelect.value=(data.sellers||[]).some(person=>person.code===sellerId)?sellerId:currentUser.code;
  byId('checkout-cashier-name').textContent='Thu ngân: '+currentUser.name;
  customers=data.customers||[];supplierRows=data.suppliers||[];bindBuyer(customerPanel,customers);
  supplierSelect.innerHTML='<option value="">Chọn nhà cung cấp</option>'+supplierRows.map(s=>`<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)} · ${escapeHtml(s.id)}</option>`).join('');
  supplierSelect.value=supplierRows.find(row=>row.id==='NCC001')?.id||'';
  populateDestinationChoices();
  byId('checkout-customer-error').hidden=true;
  return true;
 }catch(error){if(stamp===loadSequence){byId('checkout-customer-error').textContent=error.message;byId('checkout-customer-error').hidden=false;}if(throwOnError)throw error;return false;}
}
openPayment=async function(method,lines){
 const input={lines,method,sellerId:byId('checkout-seller-id').value,...readBuyer(customerPanel)};
 const q=await ERP.quoteSale(input);pendingSale={lines,method,total:q.total,erpInput:input,requestId:requestId()};
 byId('payment-title').textContent='Thanh toán '+method.toLowerCase();
 byId('payment-items').innerHTML=q.items.map(i=>`<li>${escapeHtml(i.name)} · ${escapeHtml(i.size)} · ${i.qty} × ${money.format(i.unitPrice)}</li>`).join('');
 byId('payment-total').textContent='Cần thu: '+money.format(q.total);
 paymentExtra.innerHTML=`<p>Khách hàng: <strong>${escapeHtml(q.customerName)}</strong></p>${q.discount?`<p>Giảm sinh nhật: ${money.format(q.discount)}</p>`:''}${method==='Tiền mặt'?`<label class="block">Khách đưa (đ)<input id="checkout-cash" class="field" data-money inputmode="numeric" min="${q.total}" max="100000000000000" value="${AtinoMoney.format(q.total)}"></label><p id="checkout-change">Tiền trả lại: 0 ₫</p>`:`<label class="block"><input id="checkout-transfer-confirmed" type="checkbox"> Tôi đã kiểm tra và nhận đủ tiền chuyển khoản</label>`}`;
 const cash=byId('checkout-cash');if(cash)cash.addEventListener('input',()=>{const received=AtinoMoney.read(cash);byId('checkout-change').textContent='Tiền trả lại: '+(Number.isFinite(received)?money.format(Math.max(0,received-q.total)):'—');});
 byId('payment-error').textContent='';byId('confirm-sale').textContent='Xác nhận · Lưu hóa đơn';byId('confirm-sale').disabled=false;
 const showTransferQr=method==='Chuyển khoản'&&q.total>0&&Boolean(transferAccount);
 byId('transfer-qr-panel').hidden=!showTransferQr;byId('payment-qr').hidden=true;
 if(showTransferQr){byId('payment-account').textContent=transferAccount.number+' '+transferAccount.bank;try{drawQr(byId('payment-qr'),transferPayload(q.total));byId('payment-qr').hidden=false;}catch(error){byId('payment-error').textContent='Chưa tạo được QR. Kiểm tra thông tin chuyển khoản và xác nhận thủ công.';}}
 paymentDialog.showModal();byId('payment-title').focus();
};
window.AtinoCheckout={buyerFields,bindBuyer,readBuyer,reloadChoices:()=>loadCustomers({throwOnError:true}),supplierSelection:id=>{const row=supplierRows.find(s=>s.id===id);return row?{id:row.id,name:row.name}:null;},async save(draft){
 const cash=byId('checkout-cash');if(cash&&(cash.value===''||!cash.checkValidity()))throw new Error('Nhập đủ số tiền khách đưa.');
 const payload={...draft.erpInput,requestId:draft.requestId,expectedTotal:draft.total};if(cash)payload.cashReceived=AtinoMoney.read(cash);else payload.transferConfirmed=!!byId('checkout-transfer-confirmed')?.checked;
 const result=await ERP.saveSale(payload);await refreshStore();return state.movements.find(d=>d.id===result.id);
}};
const originalPersist=persistDocument;
persistDocument=async function(type,lines,extra={}){
 if(!currentUser||(type!=='transfer'&&(type!=='receipt'||currentUser.role!=='employee')))return originalPersist(type,lines,extra);
 const payload={type:type==='receipt'?'receipt':'dispatch',lines:lines.map(l=>({code:l.code,size:l.size,qty:l.qty,...(type==='receipt'?{sellingPrice:l.unitPrice}:{})})),note:extra.note||''};
 if(type==='receipt'){const supplier=supplierRows.find(s=>s.id===extra.supplierId);if(!supplier)throw new Error('Chọn nhà cung cấp đã được quản lý khai báo.');payload.supplierId=supplier.id;payload.note=supplier.name;}
 else {payload.destination=exportChoiceValue('destination','nơi nhận hàng');}
 const signature=JSON.stringify(payload);if(saveAttempt?.signature!==signature)saveAttempt={signature,key:requestId()};
 const result=await ERP.saveStockDocument({...payload,requestId:saveAttempt.key});await refreshStore();saveAttempt=null;return state.movements.find(d=>d.id===result.id);
};
const previousSignOut=signOutView;
signOutView=function(message=''){loadSequence++;customers=[];supplierRows=[];customerPanel.hidden=true;previousSignOut(message);};
const oldShow=show;
show=function(id){if(currentUser?.role==='manager'&&['home','staff'].includes(id)&&window.AtinoManager){window.AtinoManager.open().then(()=>window.AtinoManager.go(id==='staff'?'employees':'overview')).catch(error=>notify(error.message));return;}oldShow(id);};
})();

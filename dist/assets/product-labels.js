(function productLabels(){
 'use strict';
 const fields=[
  ['color','Màu sắc',40],['material','Thành phần chất liệu',100],
  ['manufacturer','Đơn vị chịu trách nhiệm',130],['address','Địa chỉ đơn vị',200],
  ['origin','Nơi sản xuất',70],['year','Năm sản xuất',4],['care','Hướng dẫn bảo quản riêng',400]
 ];
 function careFor(product){
  if(product.labelInfo?.care) return product.labelInfo.care.split(/\r?\n/).filter(Boolean);
  const category=(product.category||'').toLocaleLowerCase('vi');
  if(/giày|dép/.test(category)) return ['Dùng bàn chải mềm làm sạch bụi.','Lau bằng khăn ẩm rồi để khô tự nhiên.','Tránh ngâm nước hoặc hong sát nguồn nhiệt.'];
  if(/túi|balo/.test(category)) return ['Lấy hết đồ bên trong trước khi vệ sinh.','Lau từng vùng bằng khăn mềm hơi ẩm.','Mở khóa và để khô ở nơi thoáng.'];
  if(/dây lưng|thắt lưng/.test(category)) return ['Lau mặt dây và khóa bằng khăn mềm.','Để khô tự nhiên nếu bị ướt.','Treo thẳng hoặc cuộn lỏng khi cất.'];
  if(/mũ|nón/.test(category)) return ['Lau nhẹ vành và dải lót bên trong.','Giữ dáng mũ khi phơi ở nơi thoáng.','Tránh vặn xoắn hoặc ép phẳng vành.'];
  if(/len|cardigan/.test(category)) return ['Giặt nhẹ theo nhãn chăm sóc trên áo.','Ép nhẹ cho ráo nước, tránh vắt xoắn.','Trải phẳng ở nơi thoáng để giữ phom.'];
  if(/quần lót|tất/.test(category)) return ['Giặt cùng đồ có màu tương tự.','Dùng chất giặt dịu nhẹ, tránh thuốc tẩy.','Phơi khô hoàn toàn trước khi cất.'];
  if(/blazer|khoác|măng tô/.test(category)) return ['Làm sạch từng vết bẩn bằng khăn mềm.','Chọn cách giặt theo nhãn bên trong áo.','Treo trên móc vừa vai để giữ phom.'];
  if(/quần|áo|bộ/.test(category)) return ['Lộn trái và giặt cùng đồ tương đồng màu.','Chọn chế độ giặt theo nhãn trên sản phẩm.','Phơi ở nơi thoáng, tránh nắng trực tiếp.'];
  return ['Vệ sinh bằng khăn mềm phù hợp với bề mặt.','Bảo quản ở nơi khô thoáng, tránh nguồn nhiệt.'];
 }
 // Code 128 B: độ rộng luân phiên của các vạch đen và khoảng trắng.
 const patterns=('212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112').split(' ');
 function barcode(text){
  // Với mã dài hoặc có dấu, dùng QR để giữ nguyên nội dung và kích thước điểm in.
  if(!/^[\x20-\x7e]{1,18}$/.test(text)) return '';
  const symbols=[104];
  let sum=104;
  for(const char of text){
   const value=char.charCodeAt(0)-32;
   sum+=value*symbols.length;
   symbols.push(value);
  }
  symbols.push(sum%103,106);
  let x=10, path='';
  for(const symbol of symbols){
   const widths=patterns[symbol];
   for(let i=0;i<widths.length;i++){
    const width=Number(widths[i]);
    if(i%2===0) path+=`M${x} 0h${width}v42h-${width}z`;
    x+=width;
   }
  }
  return `<svg class="tag-barcode" viewBox="0 0 ${x+10} 42" preserveAspectRatio="none" role="img" aria-label="Mã vạch"><path d="${path}"/></svg>`;
 }
 const companyName='Công ty TNHH Thời Trang Minh AM';
 const companyAddress='Thôn Hạnh Đàn, Xã Ô Diên, Thành phố Hà Nội, Việt Nam';
 const vnd=new Intl.NumberFormat('vi-VN');
 function create(product,size){
  const tag=document.createElement('article');
  tag.className='product-label';
  const info=product.labelInfo||{};
  const key=scanCode(product.code,size);
  const bars=barcode(product.code);
  const sizes=[...new Set([...productSizes(product),size])];
  const details=[companyName,companyAddress,info.manufacturer,info.address,info.origin&&'Sản xuất tại '+info.origin,info.year&&'Năm sản xuất '+info.year].filter(Boolean);
  tag.innerHTML=`<header><h3>${escapeHtml(product.name)}</h3>${bars?bars+'<div class="tag-barcode-text">'+escapeHtml(product.code)+'</div>':''}
    <strong class="tag-price">${Number.isFinite(product.price)?vnd.format(product.price)+' VNĐ':'Chưa có giá bán'}</strong></header>
    <div class="tag-variant"><b>${escapeHtml(product.code)}</b><span>${info.color?escapeHtml(info.color)+' · ':''}Size ${escapeHtml(size)}</span></div>
    ${info.material?'<div class="tag-material">'+escapeHtml(info.material)+'</div>':''}
    <p class="tag-sizes">Kích cỡ&nbsp; ${sizes.map(escapeHtml).join(' · ')}</p>
    <section class="tag-care"><h4>Hướng dẫn sử dụng</h4><ul>${careFor(product).map(line=>'<li>'+escapeHtml(line)+'</li>').join('')}</ul></section>
    <footer><div><strong class="tag-brand">ATINO</strong>${details.map(line=>'<p>'+escapeHtml(line)+'</p>').join('')}</div>
    <canvas aria-label="QR theo mã sản phẩm và kích cỡ"></canvas></footer>`;
  drawQr(tag.querySelector('canvas'),key);
  return tag;
 }
 window.AtinoLabels={fields,create};
})();

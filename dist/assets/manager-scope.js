/* Comparison with the store survey supplied by the project owner. */
(() => {
  'use strict';
  const M = window.AtinoManager;
  const esc = value => M.esc(value == null ? '' : value);
  const groups = [
    {
      id:'aligned', title:'Bám nội dung khảo sát', tone:'green', label:'Đã thể hiện',
      description:'Các điểm trong bản web phù hợp với thông tin cửa hàng đã được cung cấp.',
      rows:[
        {
          topic:'Hai vai trò tài khoản',
          survey:'Chỉ có Quản lý và Nhân viên. Một nhân viên có thể làm nhiều nghiệp vụ trong cùng ca.',
          current:'Quản lý điều hành cửa hàng; Nhân viên nhập kho, xuất kho và thanh toán. Chức vụ trong hồ sơ không tạo thêm vai trò đăng nhập.',
          thesis:'Mô tả đây là hai tác nhân sử dụng hệ thống. Khách hàng và nhà cung cấp là hồ sơ quản lý, không có tài khoản đăng nhập.'
        },
        {
          topic:'Số lượng trong cửa hàng',
          survey:'Toàn bộ cửa hàng được coi là một kho; không có kho bên trong tách biệt với quầy.',
          current:'Hiển thị số lượng trong cửa hàng theo từng mã sản phẩm và kích cỡ. Nhập, xuất và bán cùng cập nhật số lượng này.',
          thesis:'Theo dõi số lượng từng kích cỡ trong cửa hàng và sức bán của từng sản phẩm theo tháng.'
        },
        {
          topic:'Giá nhập thuộc quyền quản lý',
          survey:'Người dùng xác nhận chỉ quản lý biết giá nhập; nhân viên thao tác với giá bán.',
          current:'Nhân viên ghi nhận số lượng và giá bán khi nhập hàng. Giá nhập, tổng giá trị mua hàng và thao tác bổ sung giá nhập chỉ có trong phân hệ quản lý.',
          thesis:'Mô tả đúng quyền theo hai vai trò. Việc kiểm soát truy cập ở máy chủ là giới hạn còn lại của bản lưu dữ liệu trên trình duyệt.'
        },
        {
          topic:'Quần áo và phụ kiện',
          survey:'Atino còn kinh doanh balo, dép, mũ và nhiều mặt hàng ngoài quần áo.',
          current:'Danh mục gồm quần áo, túi / balo, giày / dép, mũ, dây lưng, tất và đồ lót. Kích cỡ theo mặt hàng; giày / dép và tất tính theo đôi.',
          thesis:'Tên và giá bán công khai được tham khảo từ website Atino. Số lượng hàng, giá nhập, khách hàng và giao dịch tĩnh chỉ là dữ liệu ban đầu của cửa hàng.'
        },
        {
          topic:'Xuất hàng đến nơi nhận',
          survey:'Hàng bán chậm có thể chuyển về kho tổng hoặc chuyển theo nhu cầu chi nhánh khác.',
          current:'Phiếu xuất ghi nơi nhận hàng. Khi lưu phiếu, số hàng xuất được trừ khỏi số lượng trong cửa hàng.',
          thesis:'Mô tả nghiệp vụ xuất tại chi nhánh. Chưa khẳng định chi nhánh nhận đã được cập nhật số lượng tự động.'
        },
        {
          topic:'Đổi hàng trong 30 ngày',
          survey:'Đổi ngang giá hoặc cao hơn; không hoàn tiền. Kiểm tra tem, tình trạng hàng và nhập lại hàng đạt yêu cầu.',
          current:'Chỉ chấp nhận đổi ngang giá hoặc cao hơn giá trị thực trả. Xác nhận phiếu tự cộng lại hàng khách trả theo đúng sản phẩm / kích cỡ, trừ hàng giao mới và cộng khoản chênh lệch đã thu vào doanh thu ngày đổi. Hàng lỗi bị từ chối đổi. Không cần lập thêm phiếu nhập / xuất cho cùng lần đổi.',
          thesis:'Giữ rõ điều kiện đổi hàng; mô tả kiểm tra thực tế do nhân viên / quản lý xác nhận, không phải hệ thống tự kiểm tra chất lượng.'
        },
        {
          topic:'Hóa đơn và hai phương thức thanh toán',
          survey:'Hóa đơn ghi nhận tiền mặt hoặc chuyển khoản; doanh thu được tổng hợp từ hóa đơn.',
          current:'Lưu phương thức, số tiền thực thu và người lập; tổng hợp doanh thu theo ngày, tháng, năm và theo phương thức.',
          thesis:'Mô tả chức năng lập hóa đơn và báo cáo doanh thu. Phân biệt với quy trình chốt ca còn thiếu ở nhóm bên dưới.'
        }
      ]
    },
    {
      id:'extended', title:'Mở rộng theo yêu cầu', tone:'amber', label:'Chức năng đề xuất',
      description:'Được bổ sung để phục vụ mục tiêu quản lý của bài tiểu luận; chưa coi là phần mềm hoặc chính sách cửa hàng đang áp dụng.',
      rows:[
        {
          topic:'Hồ sơ khách hàng và hạng thành viên',
          survey:'Chưa có thông tin khảo sát xác nhận hệ thống hạng Đồng / Bạc / Vàng / Kim cương.',
          current:'Có hồ sơ liên hệ, ngày sinh, lịch sử mua và hạng theo chi tiêu. Theo yêu cầu của chủ đề, ngưỡng Bạc 2 triệu, Vàng 5 triệu, Kim cương 10 triệu được cố định.',
          thesis:'Đưa vào phần đề xuất hệ thống. Nếu cần mô tả là chính sách thực tế, phải bổ sung xác nhận từ cửa hàng.'
        },
        {
          topic:'Lương, ca làm và dự toán',
          survey:'Nội dung đã cung cấp xác định nhân viên làm nhiều công việc; chưa xác nhận quy tắc tính lương và quản lý ca chi tiết.',
          current:'Có mức lương tháng / giờ, ca được phân công, ca đã hoàn thành và dự toán lương. Dự toán chưa gồm thưởng, phụ cấp, khấu trừ hoặc chia theo ngày.',
          thesis:'Trình bày là chức năng quản lý nhân sự được đề xuất. Không gọi dự toán là bảng lương thực trả đã chốt.'
        },
        {
          topic:'Kho tổng và nhà cung cấp duy nhất',
          survey:'Cửa hàng nhập hàng từ Kho tổng — Công ty TNHH Thời Trang Minh AM.',
          current:'Quản lý một đầu mối nhập hàng duy nhất, lưu thông tin liên hệ và lịch sử các phiếu nhập; mỗi phiếu có thể mở để xem mặt hàng, số lượng, nhân viên xác nhận và giá trị nhập.',
          thesis:'Trình bày đúng một nhà cung cấp của cửa hàng là Công ty TNHH Thời Trang Minh AM; không mô tả chức năng thêm nhiều nhà cung cấp.'
        },
        {
          topic:'Đánh giá bán chậm và cảnh báo',
          survey:'Có tình huống hàng bán chậm cần chuyển về kho tổng.',
          current:'Hệ thống cộng số chiếc trên hóa đơn bán trong tháng. Dưới 5 chiếc là bán chậm, từ 5 đến 30 là bán ổn định và trên 30 là bán chạy.',
          thesis:'Mô tả đây là công cụ hỗ trợ theo dõi; hệ thống chưa tự xác định nguyên nhân hàng bán chậm.'
        },
        {
          topic:'Bổ sung giá nhập sau khi nhận hàng',
          survey:'Chưa xác nhận trình tự quản lý nhập giá và nhân viên xác nhận số lượng trên phần mềm.',
          current:'Phiếu do nhân viên lập ghi nhận hàng ngay và chờ quản lý bổ sung giá nhập. Thao tác bổ sung giá không tăng số lượng thêm lần nữa; phiếu chưa có giá không được coi là mua với giá 0 đồng.',
          thesis:'Đây là cách xử lý đề xuất để đáp ứng quyền riêng về giá nhập; cần ghi là quy trình thiết kế bổ sung.'
        },
        {
          topic:'Cảnh báo thiếu hàng theo kích cỡ',
          survey:'Chưa có xác nhận cửa hàng đang dùng cảnh báo tự động theo từng kích cỡ.',
          current:'Tổng quan và Hàng hóa cảnh báo từng kích cỡ theo ngưỡng quản lý đã đặt, mặc định là 2. Phụ kiện Một cỡ cũng áp dụng ngưỡng này.',
          thesis:'Trình bày là chức năng đề xuất để tránh tổng số lượng còn nhiều nhưng thiếu kích cỡ khách cần. Chức năng chỉ cảnh báo, không tự tạo hay gửi yêu cầu tiếp hàng.'
        },
        {
          topic:'Thông tin hỗ trợ nhân viên trong ca',
          survey:'Nhân viên thực hiện nhập kho, xuất kho và bán hàng; không tách cứng nhân viên kho và thu ngân.',
          current:'Giữ ba mục nghiệp vụ. Nhân viên xem lịch sử chứng từ của mình, tìm kiếm, xem chi tiết, xuất danh sách và xem ca hôm nay được phân công.',
          thesis:'Lịch sử cá nhân và thẻ ca làm là cách trình bày được đề xuất để hỗ trợ thao tác; thẻ ca không thay thế chấm công hoặc chốt ca.'
        },
        {
          topic:'Bộ lọc, bảng tổng quan và xuất Excel',
          survey:'Chưa có mô tả đầy đủ về hình thức báo cáo, biểu đồ hoặc xuất tệp đang dùng tại cửa hàng.',
          current:'Bổ sung bộ lọc theo thời gian, tìm kiếm một phần tên / mã có gợi ý và hỗ trợ tiếng Việt không dấu, biểu đồ doanh thu, số liệu tổng quan và báo cáo Excel.',
          thesis:'Đưa vào thiết kế giao diện và chức năng báo cáo đề xuất, dựa trên dữ liệu giao dịch của bản web.'
        }
      ]
    },
    {
      id:'incomplete', title:'Quy trình chưa đầy đủ', tone:'blue', label:'Chưa triển khai đủ',
      description:'Các bước cần nêu là giới hạn của bản thực hành hoặc hướng phát triển tiếp theo.',
      rows:[
        {
          topic:'Nhận phiếu nhập có sẵn từ kho tổng',
          survey:'Kho tổng chuẩn bị phiếu và danh sách sản phẩm; nhân viên cửa hàng kiểm tra hàng rồi xác nhận.',
          current:'Phiếu được lập trực tiếp tại cửa hàng và xác nhận ngay khi lưu. Chưa có luồng gửi phiếu sẵn từ kho tổng hoặc trạng thái chờ đối chiếu.',
          thesis:'Không mô tả là đã số hóa đầy đủ quy trình kho tổng → kiểm hàng → xác nhận tại chi nhánh.'
        },
        {
          topic:'Xử lý chênh lệch và báo bên cung cấp',
          survey:'Khi số lượng nhận lệch, nhân viên điều chỉnh và báo lại bên cung cấp.',
          current:'Có thể nhập số thực nhận và ghi chú trên phiếu mới, nhưng chưa có phiếu chênh lệch, bước duyệt hoặc chức năng gửi thông báo cho kho tổng / nhà cung cấp.',
          thesis:'Ghi nhận phần xử lý và trao đổi chênh lệch là bước còn thiếu; ghi chú trên phiếu chưa thay thế quy trình thông báo.'
        },
        {
          topic:'Yêu cầu tiếp hàng từ kho tổng',
          survey:'Chi nhánh có thể đề nghị kho tổng bổ sung hàng.',
          current:'Có số lượng hàng và cảnh báo sắp hết; chưa có phiếu yêu cầu tiếp hàng, duyệt yêu cầu hoặc theo dõi giao hàng từ kho tổng.',
          thesis:'Đặt luồng yêu cầu tiếp hàng vào hướng hoàn thiện; không coi cảnh báo số lượng là một yêu cầu đã được gửi.'
        },
        {
          topic:'Chốt ca và đối chiếu tiền',
          survey:'Cuối ca đối chiếu doanh thu tiền mặt và chuyển khoản cho khớp.',
          current:'Báo cáo có tách tiền mặt / chuyển khoản. Chưa có mở ca, kiểm đếm thực nhận, ghi chênh lệch và khóa biên bản chốt ca.',
          thesis:'Phân biệt báo cáo theo phương thức với nghiệp vụ chốt ca hoàn chỉnh.'
        },
        {
          topic:'Lưu trữ và bảo vệ dữ liệu',
          survey:'Vận hành liên quan nhân viên, quản lý, kho tổng và các chi nhánh.',
          current:'Dữ liệu bản thực hành lưu trên trình duyệt đang dùng, chưa đồng bộ giữa các máy. Quyền giá nhập được kiểm soát ở giao diện và luồng thao tác của bản hiện tại; chưa có máy chủ bảo vệ dữ liệu độc lập.',
          thesis:'Ghi rõ đây là bản chạy trên trình duyệt. Khi vận hành thực tế cần lưu trữ tập trung và xác thực quyền truy cập ở máy chủ.'
        }
      ]
    }
  ];
  function matrixRows() {
    return [['Nhóm đối chiếu','Nghiệp vụ','Nội dung khảo sát đã cung cấp','Bản web hiện tại','Cách trình bày trong tiểu luận'],...groups.flatMap(group=>group.rows.map(row=>[group.title,row.topic,row.survey,row.current,row.thesis]))];
  }
  function policySnapshot() {
    const s=M.data.settings||{};
    return `<div class="am-scope-defaults"><div><strong>Hạng thành viên</strong><p>Bạc từ ${M.money(s.tierSilver??2000000)} · Vàng từ ${M.money(s.tierGold??5000000)} · Kim cương từ ${M.money(s.tierDiamond??10000000)}.</p></div></div>`;
  }
  M.register('scope',{
    title:'Ghi chú khảo sát',kicker:'Phạm vi bài tiểu luận',
    render(){
      return `<style>
      #manager-app .am-scope-intro{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:1.5rem;align-items:start;padding:1.5rem 1.6rem;border:1px solid #c7d2fe;background:#eef2ff;border-radius:1rem;margin-bottom:1.5rem;color:#26324b}#manager-app .am-scope-intro h2{font-size:1.2rem;margin:0 0 .6rem;color:#1e1b4b}#manager-app .am-scope-intro p{line-height:1.7;margin:0}#manager-app .am-scope-roles{display:flex;gap:.5rem;flex-wrap:wrap;margin:.9rem 0 0}#manager-app .am-scope-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem;margin:0 0 1.5rem}#manager-app .am-scope-summary article{padding:1.1rem 1.2rem;border:1px solid #e2e8f0;border-radius:.85rem;background:#fff}#manager-app .am-scope-summary strong{font-size:1.6rem;display:block;color:#172554;margin:.6rem 0 .2rem}#manager-app .am-scope-summary p{font-size:.9rem;color:#64748b;margin:0;line-height:1.5}#manager-app .am-scope-panel{margin-bottom:1.4rem}#manager-app .am-scope-panel .am-panel-head h2{font-size:1.15rem}#manager-app .am-scope-panel .am-panel-head p{max-width:60rem;line-height:1.65;margin-top:.45rem}#manager-app .am-scope-table{table-layout:fixed;min-width:1000px}#manager-app .am-scope-table th:first-child{width:15%}#manager-app .am-scope-table th:nth-child(2){width:25%}#manager-app .am-scope-table th:nth-child(3){width:30%}#manager-app .am-scope-table th:nth-child(4){width:30%}#manager-app .am-scope-table td{white-space:normal;vertical-align:top;line-height:1.65;font-size:.925rem}#manager-app .am-scope-table td:first-child{font-weight:650;color:#243047}#manager-app .am-scope-table td:last-child{background:#f8fafc;color:#475569}#manager-app .am-scope-defaults{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.5rem;margin:1rem 1.5rem}#manager-app .am-scope-defaults p{font-size:.95rem;color:#475569;line-height:1.7;margin:.4rem 0 0}#manager-app .am-scope-footnote{font-size:.94rem;line-height:1.75;color:#475569;margin:.5rem 1.5rem 0}#manager-app .am-scope-actions{display:flex;gap:.65rem;flex-wrap:wrap;margin:1.1rem 1.5rem 1.5rem}@media(max-width:900px){#manager-app .am-scope-intro{grid-template-columns:1fr}#manager-app .am-scope-summary{grid-template-columns:1fr}#manager-app .am-scope-defaults{grid-template-columns:1fr;gap:1rem}}
      </style><section class="am-scope-intro"><div><h2>Đối chiếu bản web với khảo sát cửa hàng</h2><p>Bảng này phân biệt nội dung đã bám khảo sát, phần bổ sung theo yêu cầu và quy trình chưa hoàn thiện. Các chức năng mở rộng nên đặt trong <strong>phần đề xuất hệ thống</strong>, không viết thành tính năng hoặc chính sách cửa hàng đang sử dụng.</p><div class="am-scope-roles">${M.badge('Quản lý','blue')}${M.badge('Nhân viên','blue')}<span class="am-muted">Chỉ hai vai trò đăng nhập; không có tài khoản khách hàng hoặc trang mua sắm.</span></div></div><button type="button" class="am-btn secondary" data-scope-download>${M.icon('download')} Tải ghi chú</button></section><div class="am-scope-summary">${groups.map(g=>`<article>${M.badge(g.label,g.tone)}<strong>${g.rows.length} nội dung</strong><p>${esc(g.title)}</p></article>`).join('')}</div>${groups.map(g=>`<section class="am-panel am-scope-panel"><div class="am-panel-head"><div><h2>${esc(g.title)}</h2><p class="am-muted">${esc(g.description)}</p></div>${M.badge(g.label,g.tone)}</div><div class="am-table-wrap"><table class="am-table am-scope-table"><thead><tr><th>Nghiệp vụ</th><th>Khảo sát đã cung cấp</th><th>Bản web hiện tại</th><th>Ghi vào tiểu luận</th></tr></thead><tbody>${g.rows.map(row=>`<tr><td>${esc(row.topic)}</td><td>${esc(row.survey)}</td><td>${esc(row.current)}</td><td>${esc(row.thesis)}</td></tr>`).join('')}</tbody></table></div></section>`).join('')}<section class="am-panel am-scope-panel"><div class="am-panel-head"><div><h2>Dữ liệu và thông số cửa hàng</h2><p class="am-muted">Số lượng, giá nhập và hồ sơ giao dịch được tạo để trình bày bài tiểu luận; không phải dữ liệu vận hành thật của Atino.</p></div>${M.badge('Dữ liệu cửa hàng','blue')}</div>${policySnapshot()}<p class="am-scope-footnote">Danh mục và tên sản phẩm tham khảo từ <a href="https://atino.vn/" target="_blank" rel="noopener noreferrer">website chính thức Atino</a>, đối chiếu ngày 26/11/2026. Giá công khai có thể thay đổi; số lượng và chứng từ tĩnh là dữ liệu ban đầu của cửa hàng. Đối chiếu nghiệp vụ dựa trên nội dung khảo sát bạn đã cung cấp cho dự án. Khi bổ sung chứng cứ hoặc chốt lại quy trình với cửa hàng, cần cập nhật cả phần mô tả nghiệp vụ và chức năng tương ứng.</p><div class="am-scope-actions"><button type="button" class="am-btn secondary" data-scope-settings>Xem chính sách</button><button type="button" class="am-btn ghost" data-scope-download>Tải bảng đối chiếu Excel</button></div></section>`;
    },
    bind(root){
      root.querySelectorAll('[data-scope-download]').forEach(button=>button.addEventListener('click',()=>M.downloadTable('Atino_ghi_chu_doi_chieu_khao_sat','Đối chiếu khảo sát',matrixRows(),button)));
      root.querySelector('[data-scope-settings]').addEventListener('click',()=>M.go('settings'));
    }
  });
})();

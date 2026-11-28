(() => {
  'use strict';
  const ERP = window.AtinoERP;
  const column = (label, width, format, highlight = false) => ({label, width, format, highlight});

  function localTime(timestamp) {
    // Excel stores wall-clock time without a time zone. Vietnam is UTC+07:00.
    return Number.isFinite(timestamp) ? new Date(timestamp + 7 * 3600000) : null;
  }

  function formatDate(value, format) {
    const [date, time] = value.toISOString().split('T');
    const [year, month, day] = date.split('-');
    if (format === 'month') return month + '/' + year;
    const label = day + '/' + month + '/' + year;
    return format === 'datetime' ? label + ' ' + time.slice(0, 5) : label;
  }

  function periodLabel(period, value) {
    if (period === 'year') return 'Năm ' + value;
    const [year, month, day] = value.split('-');
    return period === 'month' ? 'Tháng ' + month + '/' + year : 'Ngày ' + day + '/' + month + '/' + year;
  }

  function summarySheet(metrics, stock, issues, subtitle) {
    const otherPayments = metrics.revenue - metrics.cash - metrics.bank;
    const salesRows = [
      ['Hóa đơn bán', metrics.orderCount, 'integer'],
      ['Phiếu đổi hàng', metrics.exchangeCount, 'integer'],
      ['Thu chênh lệch đổi hàng', metrics.exchangePaid, 'money'],
      ['Thu tiền mặt', metrics.cash, 'money'],
      ['Thu chuyển khoản', metrics.bank, 'money']
    ];
    if (otherPayments) salesRows.push(['Thu chưa rõ phương thức', otherPayments, 'money']);
    return {
      name: 'Tổng quan',
      subtitle,
      tabColor: '263959',
      dashboard: {
        kpis: [
          {label: 'Doanh thu thực thu', value: metrics.revenue, format: 'money', unit: 'Bán hàng và thu chênh lệch đổi'},
          {label: 'Sản phẩm đã bán', value: metrics.unitsSold, unit: 'Số lượng trên hóa đơn trong kỳ'},
          {label: 'Số lượng trong cửa hàng', value: stock.total, unit: 'Tại thời điểm xuất báo cáo'}
        ],
        sections: [
          {title: 'Giao dịch trong kỳ', rows: salesRows},
          {
            title: 'Hàng trong cửa hàng',
            rows: [
              ['Sản phẩm đang bán', metrics.productCount, 'integer'],
              ['Sản phẩm cảnh báo', issues.warnings.length, 'integer'],
              ['Mặt hàng lâu chưa bán', issues.aging.length, 'integer'],
              ['Giá trị hàng trong cửa hàng', metrics.stockValue ?? 'Chưa đủ giá vốn', metrics.stockValue == null ? 'text' : 'money'],
              ['Phiếu chờ giá nhập', metrics.pendingReceiptCount, 'integer']
            ]
          }
        ]
      }
    };
  }

  function revenueSheet(metrics, period, value, subtitle) {
    const [year, month] = value.split('-').map(Number);
    const dateColumn = period === 'day' ? column('Khung giờ', 19) :
      period === 'month' ? column('Ngày', 19, 'date') : column('Tháng', 19, 'month');
    return {
      name: 'Doanh thu',
      title: 'Doanh thu theo kỳ',
      subtitle,
      tabColor: '4E67BD',
      revenueChart: {period, title: 'Thực thu theo ' + (period === 'day' ? 'giờ' : period === 'month' ? 'ngày' : 'tháng')},
      totals: [1],
      columns: [dateColumn, column('Thực thu', 22, 'money', true)],
      rows: metrics.buckets.map((bucket, index) => {
        if (period === 'day') return [bucket.label, bucket.value];
        const date = period === 'month' ? new Date(Date.UTC(year, month - 1, index + 1)) : new Date(Date.UTC(year, index, 1));
        return [date, bucket.value];
      })
    };
  }

  function inventorySheet(data, products = data.products, now = Date.now()) {
    const rows = [];
    for (const product of products) {
      const sizes = data.stock.byProduct.get(product.code)?.sizes || [];
      for (const size of sizes) {
        rows.push([product.code, product.name, product.category, size.size, size.total, product.price]);
      }
    }
    return {
      name: 'Số lượng theo kích cỡ',
      title: 'Danh sách hàng hóa theo kích cỡ',
      subtitle: 'Số lượng trong cửa hàng tại ' + formatDate(localTime(now), 'datetime') + ' · Giờ Việt Nam',
      tabColor: '426479',
      totals: [4],
      columns: [
        column('Mã sản phẩm', 20), column('Tên sản phẩm', 34), column('Danh mục', 20),
        column('Kích cỡ', 15, 'center'), column('Số lượng trong cửa hàng', 26, 'integer', true),
        column('Giá bán', 19, 'money')
      ],
      filterColumnCount: 3,
      rows
    };
  }

  function inventorySheets(data, products = data.products, now = Date.now()) {
    const detail = inventorySheet(data, products, now);
    const summary = {
      name: 'Danh sách hàng hóa', title: 'Số lượng trong cửa hàng',
      subtitle: formatDate(localTime(now), 'datetime') + '  ·  Bấm tên sản phẩm để xem kích cỡ',
      tabColor: '284C66', filterColumnCount: 1, totals: [1],
      columns: [column('Tên sản phẩm', 47), column('Tổng số lượng', 23, 'integer', true)],
      rows: [], rowLinks: []
    };
    detail.name = 'Chi tiết kích cỡ';
    detail.title = 'Chi tiết hàng hóa theo kích cỡ';
    const firstRow = new Map();
    detail.rows.forEach(([code], index) => {
      if (!firstRow.has(code)) firstRow.set(code, index);
    });
    for (const product of products) {
      summary.rows.push([product.name, data.stock.byProduct.get(product.code)?.total ?? 0]);
      const row = firstRow.get(product.code);
      summary.rowLinks.push(row === undefined ? null : {sheet:detail.name, row});
    }
    return [summary, detail];
  }

  function transactionsSheet(data, docs, subtitle) {
    const customers = new Map(data.customers.map(customer => [customer.id, customer.name]));
    return {
      name: 'Giao dịch',
      title: 'Hóa đơn và khoản thu',
      subtitle,
      tabColor: '4E67BD',
      columns: [
        column('Mã chứng từ', 17), column('Ngày giờ lập', 23, 'datetime'),
        column('Khách hàng', 24), column('Người thực hiện', 24),
        column('Thanh toán', 20, 'center'), column('Thực thu', 21, 'money', true),
        column('Tình trạng', 20, 'center')
      ],
      totals: [5],
      rows: docs.map(doc => [
        doc.id, localTime(doc.when),
        doc.customerName || customers.get(doc.customerId) || 'Khách lẻ',
        doc.employeeName, ERP.paymentMethod(doc), ERP.documentPaidTotal(doc), ERP.transactionStatus(doc)
      ])
    };
  }

  function salesSummarySheet(docs, subtitle) {
    let sales = 0, exchanges = 0, sold = 0, extra = 0, cash = 0, bank = 0;
    for (const doc of docs) {
      const paid = ERP.documentPaidTotal(doc);
      if (doc.type === 'sale') { sales++; sold += paid; }
      if (doc.type === 'exchange') { exchanges++; extra += paid; }
      const method = ERP.paymentMethod(doc);
      if (method === 'Tiền mặt') cash += paid;
      if (method === 'Chuyển khoản') bank += paid;
    }
    const total = sold + extra;
    const rows = [['Thực thu từ bán hàng', sold, 'money'], ['Chênh lệch đổi hàng đã thu', extra, 'money']];
    const payments = [['Tiền mặt', cash, 'money'], ['Chuyển khoản', bank, 'money']];
    if (total !== cash + bank) payments.push(['Chưa rõ phương thức', total - cash - bank, 'money']);
    return {name:'Doanh thu',title:'Hóa đơn và doanh thu',subtitle,tabColor:'263959',dashboard:{
      kpis:[{label:'Doanh thu thực thu',value:total,format:'money',unit:'Theo bộ lọc đã chọn'},
        {label:'Hóa đơn bán hàng',value:sales,unit:'Số hóa đơn'},
        {label:'Phiếu đổi hàng',value:exchanges,unit:'Số phiếu'}],
      sections:[{title:'Giao dịch trong kỳ',rows},{title:'Phương thức thanh toán',rows:payments}]
    }};
  }

  function exchangeSheet(exchanges, subtitle) {
    const quantity = items => (items || []).reduce((sum, item) => sum + item.qty, 0);
    return {
      name: 'Đổi hàng',
      title: 'Chi tiết giao dịch đổi hàng',
      subtitle,
      tabColor: '4E67BD',
      columns: [
        column('Mã phiếu đổi', 17), column('Hóa đơn gốc', 17), column('Ngày giờ lập', 23, 'datetime'),
        column('Nhân viên lập phiếu', 24), column('Số lượng nhận lại', 18, 'integer'),
        column('Số lượng giao mới', 18, 'integer'), column('Giá trị hàng nhận', 20, 'money'),
        column('Giá trị hàng giao', 20, 'money'), column('Chênh lệch đã thu', 23, 'money', true),
        column('Thanh toán', 20, 'center'), column('Tình trạng', 20, 'center')
      ],
      totals: [4, 5, 6, 7, 8],
      rows: exchanges.map(doc => [
        doc.id, doc.exchangeOf, localTime(doc.when), doc.employeeName,
        quantity(doc.returnedItems), quantity(doc.items),
        doc.credit ?? null, doc.replacementTotal ?? doc.gross ?? null, ERP.documentPaidTotal(doc),
        ERP.paymentMethod(doc), ERP.transactionStatus(doc)
      ])
    };
  }

  function soldItemsSheet(items, subtitle) {
    return {
      name: 'Hàng đã bán',
      title: 'Sản phẩm đã bán theo hóa đơn',
      subtitle,
      tabColor: '4E67BD',
      columns: [
        column('Hóa đơn', 17), column('Ngày giờ lập', 23, 'datetime'),
        column('Mã sản phẩm', 18), column('Sản phẩm', 36), column('Kích cỡ', 14, 'center'),
        column('Số lượng', 14, 'integer', true), column('Thực trả', 21, 'money')
      ],
      totals: [5, 6],
      rows: items.map(item => [item.invoiceId, localTime(item.when), item.code, item.name, item.size, item.qty, item.paidTotal])
    };
  }

  function overviewSheets(data, metrics, period, value) {
    const now = Date.now();
    const subtitle = periodLabel(period, value);
    const timed = subtitle + ' · Giờ Việt Nam';
    return [
      summarySheet(metrics, data.stock, ERP.stockAttention(data, now), subtitle + '  |  Lập lúc ' + formatDate(localTime(now), 'datetime')),
      revenueSheet(metrics, period, value, subtitle),
      transactionsSheet(data, metrics.transactions, timed),
      exchangeSheet(metrics.exchanges, timed),
      soldItemsSheet(metrics.soldItems, timed),
      {
        name: 'Sản phẩm bán tốt', title: 'Sản phẩm bán tốt', subtitle, tabColor: '4E67BD',
        columns: [column('Mã sản phẩm', 18), column('Sản phẩm', 36), column('Số lượng bán', 18, 'integer'),
          column('Thực thu từ bán hàng', 26, 'money', true)],
        totals: [2, 3],
        rows: metrics.topProducts.map(row => [row.code, row.name, row.qty, row.revenue])
      },
      {
        name: 'Nhân viên', title: 'Doanh thu theo nhân viên', subtitle, tabColor: '426479',
        columns: [column('Mã nhân viên', 18), column('Nhân viên', 32), column('Hóa đơn bán', 18, 'integer'),
          column('Phiếu đổi đã lập', 20, 'integer'), column('Thực thu', 22, 'money', true)],
        totals: [2, 3, 4],
        rows: metrics.employeeRevenue.map(row => [row.code, row.name, row.sales, row.exchanges, row.revenue])
      },
      inventorySheet(data, data.products, now)
    ];
  }

  function listSheet(title, [headers, ...rows], options = {}) {
    const columns = headers.map((label, index) => {
      let width = label.length + 5;
      let format = options.formats?.[index];
      for (const row of rows) {
        const value = row[index];
        if (!format && Number.isFinite(value)) format = 'decimal';
        if (typeof value === 'string') {
          const longestLine = Math.max(...value.split('\n').map(line => line.length));
          width = Math.max(width, longestLine + 3);
        }
      }
      if (format === 'decimal' && rows.every(row => !Number.isFinite(row[index]) || Number.isInteger(row[index]))) format = 'integer';
      if (format === 'datetime' || format === 'money') width = Math.max(width, 22);
      return column(label, Math.min(46, Math.max(14, width)), format);
    });
    return {
      name: title.replace(/[\\/\[\]:*?]/g, ' ').slice(0, 31),
      title,
      subtitle: options.subtitle || 'Atino · Xuất ngày ' + formatDate(localTime(Date.now()), 'date'),
      columns,
      rows
    };
  }

  function salarySheet(month, estimates) {
    const rows = estimates.map(({person, amount, hours, missingHours}) => {
      const hourly = person.payType === 'hourly';
      return [person.code, person.name, hourly ? 'Theo giờ' : 'Theo tháng', hourly ? hours : null,
        hourly ? person.hourlyRate || 0 : null, hourly ? null : person.baseSalary || 0, amount,
        hourly && missingHours ? 'Chưa tính ngày làm thiếu số giờ' : ''];
    });
    const headers = ['Mã nhân viên', 'Họ tên', 'Cách tính', 'Giờ ghi nhận', 'Lương giờ', 'Lương tháng', 'Lương dự kiến', 'Ghi chú'];
    const sheet = listSheet('Dự toán lương', [headers, ...rows], {
      subtitle: periodLabel('month', month) + ' · Chỉ tính các ca có giờ đã hoàn thành đối với lương theo giờ',
      formats: {3:'decimal', 4:'money', 5:'money', 6:'money'}
    });
    sheet.totals = [6];
    sheet.columns[6].highlight = true;
    return sheet;
  }

  window.AtinoReports = {overviewSheets, salesSummarySheet, transactionsSheet, exchangeSheet, inventorySheet, inventorySheets, periodLabel, localTime, listSheet, salarySheet};
})();

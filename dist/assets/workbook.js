(() => {
  'use strict';

  const sheetNs = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const officeRelationships = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const packageRelationships = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const drawingNs = 'http://schemas.openxmlformats.org/drawingml/2006/main';
  const chartNs = 'http://schemas.openxmlformats.org/drawingml/2006/chart';
  const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const xml = body => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + body;
  const escapeXml = value => String(value ?? '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, '')
    .replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'})[char]);

  const numberFormats = {
    integer: '#,##0_0',
    decimal: '#,##0.00',
    money: '#,##0" ₫"_0',
    date: 'dd/mm/yyyy',
    month: 'mm/yyyy',
    datetime: 'dd/mm/yyyy hh:mm'
  };
  const formatIds = new Map(Object.keys(numberFormats).map((name, index) => [name, 164 + index]));
  const styles = new Map();

  function addStyle(name, {font = 0, fill = 0, border = 0, format, align = 'left', wrap = false, indent = 1} = {}) {
    const numberFormat = formatIds.get(format) || 0;
    styles.set(name, {
      id: styles.size,
      xml: `<xf numFmtId="${numberFormat}" fontId="${font}" fillId="${fill}" borderId="${border}" xfId="0"
        applyNumberFormat="${numberFormat ? 1 : 0}" applyFont="${font ? 1 : 0}" applyFill="${fill ? 1 : 0}"
        applyBorder="${border ? 1 : 0}" applyAlignment="1">
        <alignment horizontal="${align}" vertical="center" wrapText="${wrap ? 1 : 0}" indent="${indent}"/>
      </xf>`
    });
  }
  addStyle('default', {indent: 0});
  addStyle('brand', {font: 1, indent: 0});
  addStyle('title', {font: 2, indent: 0});
  addStyle('subtitle', {font: 3, indent: 0});
  addStyle('tableHeader', {font: 4, fill: 2, border: 3, align: 'center', wrap: true, indent: 0});
  addStyle('totalHeader', {font: 4, fill: 6, border: 3, align: 'center', wrap: true, indent: 0});
  addStyle('section', {font: 5, fill: 3});
  addStyle('cardLabel', {font: 5, fill: 4});
  addStyle('cardMoney', {font: 6, fill: 4, format: 'money'});
  addStyle('cardCount', {font: 6, fill: 4, format: 'integer'});
  addStyle('cardUnit', {font: 3, fill: 4});
  addStyle('rule', {border: 2, indent: 0});
  addStyle('empty', {font: 3, fill: 3});
  for (const [tone, fill, font, border] of [['plain', 0, 0, 1], ['stripe', 5, 0, 1], ['highlight', 4, 5, 1], ['footer', 3, 5, 4]]) {
    for (const format of ['text', 'center', ...formatIds.keys()]) {
      const align = format === 'text' ? 'left' : ['center', 'date', 'month', 'datetime'].includes(format) ? 'center' : 'right';
      addStyle(tone + '-' + format, {font, fill, border, format, align, wrap: !formatIds.has(format), indent: align === 'center' ? 0 : 1});
    }
  }

  addStyle('link-plain', {font:7, border:1, wrap:true});
  addStyle('link-stripe', {font:7, fill:5, border:1, wrap:true});

  function stylesXml() {
    const formats = Object.entries(numberFormats).map(([name, code]) =>
      '<numFmt numFmtId="' + formatIds.get(name) + '" formatCode="' + escapeXml(code) + '"/>'
    ).join('');
    const fills = ['FF213052', 'FFEAF0F9', 'FFEEF4FF', 'FFF6F8FC', 'FF3E5C9B'].map(color =>
      '<fill><patternFill patternType="solid"><fgColor rgb="' + color + '"/><bgColor indexed="64"/></patternFill></fill>'
    ).join('');
    return xml(`<styleSheet xmlns="${sheetNs}">
      <numFmts count="${formatIds.size}">${formats}</numFmts>
      <fonts count="8">
        <font><sz val="11"/><color rgb="FF17263F"/><name val="Arial"/></font>
        <font><b/><sz val="11"/><color rgb="FF34518F"/><name val="Arial"/></font>
        <font><b/><sz val="21"/><color rgb="FF182A48"/><name val="Arial"/></font>
        <font><sz val="11"/><color rgb="FF4B607E"/><name val="Arial"/></font>
        <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>
        <font><b/><sz val="11"/><color rgb="FF213A68"/><name val="Arial"/></font>
        <font><b/><sz val="19"/><color rgb="FF182A48"/><name val="Arial"/></font>
        <font><u/><sz val="11"/><color rgb="FF245883"/><name val="Arial"/></font>
      </fonts>
      <fills count="7">
        <fill><patternFill patternType="none"/></fill>
        <fill><patternFill patternType="gray125"/></fill>
        ${fills}
      </fills>
      <borders count="5">
        <border><left/><right/><top/><bottom/><diagonal/></border>
        <border><left/><right style="thin"><color rgb="FFD7E0EC"/></right><top/><bottom style="thin"><color rgb="FFE3EAF4"/></bottom><diagonal/></border>
        <border><left/><right/><top/><bottom style="medium"><color rgb="FF89A3D2"/></bottom><diagonal/></border>
        <border><left/><right style="thin"><color rgb="FF7889AA"/></right><top/><bottom/><diagonal/></border>
        <border><left/><right/><top style="thin"><color rgb="FF91A4C6"/></top><bottom/><diagonal/></border>
      </borders>
      <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
      <cellXfs count="${styles.size}">${[...styles.values()].map(style => style.xml).join('')}</cellXfs>
      <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
    </styleSheet>`);
  }

  function columnName(index) {
    let name = '';
    for (let number = index + 1; number > 0; number = Math.floor((number - 1) / 26)) {
      name = String.fromCharCode(65 + (number - 1) % 26) + name;
    }
    return name;
  }

  const excelDate = value => value.getTime() / 86400000 + 25569;
  function cellXml(value, reference, style, formula) {
    if (value instanceof Date) value = excelDate(value);
    const attributes = ' r="' + reference + '" s="' + styles.get(style).id + '"';
    if (Number.isFinite(value)) return '<c' + attributes + '>' + (formula ? '<f>' + escapeXml(formula) + '</f>' : '') + '<v>' + value + '</v></c>';
    if (value === null || value === undefined || value === '') return '<c' + attributes + '/>';
    return '<c' + attributes + ' t="inlineStr"><is><t xml:space="preserve">' + escapeXml(value) + '</t></is></c>';
  }

  const printSettings = orientation => `<printOptions horizontalCentered="1"/>
    <pageMargins left="0.3" right="0.3" top="0.4" bottom="0.4" header="0.15" footer="0.15"/>
    <pageSetup paperSize="9" orientation="${orientation}" fitToWidth="1" fitToHeight="0"/>
    <headerFooter><oddFooter>&amp;LATINO&amp;RTrang &amp;P / &amp;N</oddFooter></headerFooter>`;
  const sheetProps = sheet => '<sheetPr>' + (sheet.tabColor ? '<tabColor rgb="FF' + sheet.tabColor + '"/>' : '') + '<pageSetUpPr fitToPage="1"/></sheetPr>';
  const tableHeaderRow = sheet => 5 + (sheet.metadata?.length || 0);

  function dashboardXml(sheet) {
    const widths = [3, 16, 13, 14, 6, 16, 13, 14, 6, 16, 13, 14, 3];
    const cols = widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('');
    const merges = [];
    const row = (number, height, cells) => {
      const text = cells.map(([start, end, value, style]) => {
        if (end) merges.push(start + number + ':' + end + number);
        const content = [cellXml(value, start + number, style)];
        if (end) {
          for (let col = start.charCodeAt(0) + 1; col <= end.charCodeAt(0); col++) {
            content.push(cellXml(null, String.fromCharCode(col) + number, style));
          }
        }
        return content.join('');
      }).join('');
      return `<row r="${number}" ht="${height}" customHeight="1">${text}</row>`;
    };
    const cards = [['B', 'D'], ['F', 'H'], ['J', 'L']];
    const {kpis, sections} = sheet.dashboard;
    const rows = [
      row(1, 11, []),
      row(2, 18, [['B', 'L', 'ATINO', 'brand']]),
      row(3, 32, [['B', 'L', sheet.title || 'Báo cáo cửa hàng', 'title']]),
      row(4, 21, [['B', 'L', sheet.subtitle, 'subtitle']]),
      row(5, 9, [['B', 'L', null, 'rule']]),
      row(6, 12, []),
      row(7, 24, kpis.map((item, i) => [...cards[i], item.label, 'cardLabel'])),
      row(8, 34, kpis.map((item, i) => [...cards[i], item.value, item.format === 'money' ? 'cardMoney' : 'cardCount'])),
      row(9, 22, kpis.map((item, i) => [...cards[i], item.unit, 'cardUnit'])),
      row(10, 16, []),
      row(11, 28, [['B', 'F', sections[0].title, 'tableHeader'], ['H', 'L', sections[1].title, 'tableHeader']])
    ];
    const detailRows = Math.max(...sections.map(section => section.rows.length));
    for (let i = 0; i < detailRows; i++) {
      const shade = i % 2 ? 'stripe' : 'plain';
      const cells = [];
      for (const [sectionIndex, group] of sections.entries()) {
        const item = group.rows[i];
        if (!item) continue;
        const [label, value, format] = item;
        const [left, right] = sectionIndex === 0 ? [['B', 'D'], ['E', 'F']] : [['H', 'J'], ['K', 'L']];
        cells.push([...left, label, shade + '-text']);
        cells.push([...right, value, shade + '-' + format]);
      }
      rows.push(row(12 + i, 25, cells));
    }
    return xml(`<worksheet xmlns="${sheetNs}">
      ${sheetProps(sheet)}<dimension ref="A1:M${11 + detailRows}"/>
      <sheetViews><sheetView showGridLines="0" tabSelected="1" workbookViewId="0"><selection activeCell="A1" sqref="A1"/></sheetView></sheetViews>
      <sheetFormatPr defaultRowHeight="20"/><cols>${cols}</cols><sheetData>${rows.join('')}</sheetData>
      <mergeCells count="${merges.length}">${merges.map(range => '<mergeCell ref="' + range + '"/>').join('')}</mergeCells>
      ${printSettings('landscape')}
    </worksheet>`);
  }

  function worksheetXml(sheet, active) {
    if (sheet.dashboard) return dashboardXml(sheet);
    const headerRow = tableHeaderRow(sheet);
    const {columns, rows} = sheet;
    const last = columnName(columns.length - 1);
    const names = columns.map((column, index) => columnName(index));
    const chart = Boolean(sheet.revenueChart && rows.length);
    const chartSpace = chart ? '<col min="3" max="3" width="5" customWidth="1"/><col min="4" max="12" width="12" customWidth="1"/>' : '';
    const widths = columns.map(({width}, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('') + chartSpace;
    const headers = columns.map((column, index) =>
      cellXml(column.label, names[index] + headerRow, column.highlight ? 'totalHeader' : 'tableHeader')
    ).join('');
    const hyperlinks = [];
    const reportRows = rows.map((values, index) => {
      const rowNumber = index + headerRow + 1;
      const cells = columns.map((column, position) => {
        const tone = column.highlight ? 'highlight' : index % 2 ? 'stripe' : 'plain';
        const address = names[position] + rowNumber;
        const link = position === 0 && sheet.rowLinks?.[index];
        if (link) {
          const location = "'" + link.sheet.replaceAll("'", "''") + "'!A" + (headerRow + 1 + link.row);
          hyperlinks.push('<hyperlink ref="' + address + '" location="' + escapeXml(location) + '" tooltip="Xem số lượng theo kích cỡ"/>');
          return cellXml(values[position], address, 'link-' + tone);
        }
        return cellXml(values[position], address, tone + '-' + (column.format || 'text'));
      }).join('');
      const lineCounts = values.map((value, position) => {
        if (typeof value !== 'string') return 1;
        const available = Math.max(1, columns[position].width - 4);
        return value.split('\n').reduce((count, line) => count + Math.max(1, Math.ceil(line.length / available)), 0);
      });
      const lines = Math.max(1, ...lineCounts);
      const height = lines > 1 ? ' ht="' + Math.min(408, 6 + lines * 15) + '" customHeight="1"' : '';
      return '<row r="' + rowNumber + '"' + height + '>' + cells + '</row>';
    }).join('');
    const right = chart ? 'L' : last;
    const merge = right === 'A' ? [] : ['A2:' + right + '2', 'A3:' + right + '3'];
    const metadata=(sheet.metadata||[]).map((groups,i)=>{
      const r=4+i;
      let lines = 1;
      const cells=groups.map((pair,j)=>{
        const start=Math.floor(j*columns.length/groups.length),end=Math.floor((j+1)*columns.length/groups.length)-1;
        if(end>start)merge.push(names[start]+r+':'+names[end]+r);
        const text = pair[0]+': '+(pair[1]??'—');
        const width = columns.slice(start,end+1).reduce((sum,column)=>sum+column.width,0)-4;
        const wrapped = text.split('\n').reduce((count,line)=>count+Math.max(1,Math.ceil(line.length/Math.max(1,width))),0);
        lines = Math.max(lines,wrapped);
        return cellXml(text,names[start]+r,'plain-text');
      }).join('');
      return '<row r="'+r+'" ht="'+Math.min(408,Math.max(24,10+lines*16))+'" customHeight="1">'+cells+'</row>';
    }).join('');
    const end = Math.max(headerRow + 1, rows.length + headerRow);
    if (!rows.length && last !== 'A') merge.push('A'+(headerRow+1)+':' + last + (headerRow+1));
    const hiddenFilters = columns.map((column, index) => index >= (sheet.filterColumnCount ?? columns.length)
      ? '<filterColumn colId="' + index + '" hiddenButton="1" showButton="0"/>' : '').join('');
    const filter = sheet.filter !== false && rows.length
      ? '<autoFilter ref="A' + headerRow + ':' + last + end + '">' + hiddenFilters + '</autoFilter>' : '';
    const footer = sheet.totals?.length && rows.length ? totalRow(sheet, names, end, headerRow) : '';
    const lastRow = Math.max(end + (footer ? 1 : 0), chart ? 20 : 0);
    const pinnedColumn = columns.length > 7;
    const selection = (pinnedColumn ? 'B' : 'A') + (headerRow + 1);
    const pane = pinnedColumn ? 'bottomRight' : 'bottomLeft';

    return xml(`<worksheet xmlns="${sheetNs}" xmlns:r="${officeRelationships}">
      ${sheetProps(sheet)}<dimension ref="A1:${right}${lastRow}"/>
      <sheetViews><sheetView showGridLines="0" tabSelected="${active ? 1 : 0}" zoomScale="${chart || columns.length > 7 ? 85 : 100}" workbookViewId="0">
        <pane ${pinnedColumn ? 'xSplit="1" ' : ''}ySplit="${headerRow}" topLeftCell="${selection}" activePane="${pane}" state="frozen"/>
        <selection pane="${pane}" activeCell="${selection}" sqref="${selection}"/>
      </sheetView></sheetViews>
      <sheetFormatPr defaultRowHeight="21"/>
      <cols>${widths}</cols>
      <sheetData>
        <row r="1" ht="21" customHeight="1">${cellXml("ATINO","A1","brand")}</row>
        <row r="2" ht="32" customHeight="1">${cellXml(sheet.title, 'A2', 'title')}</row>
        <row r="3" ht="21" customHeight="1">${cellXml(sheet.subtitle, 'A3', 'subtitle')}</row>
        ${metadata}<row r="${headerRow-1}" ht="8" customHeight="1"/>
        <row r="${headerRow}" ht="30" customHeight="1">${headers}</row>
        ${reportRows || '<row r="'+(headerRow+1)+'">' + cellXml('Chưa có dữ liệu để hiển thị', 'A'+(headerRow+1), 'empty') + '</row>'}
        ${footer}
      </sheetData>
      ${filter}
      ${merge.length ? '<mergeCells count="' + merge.length + '">' + merge.map(range => '<mergeCell ref="' + range + '"/>').join('') + '</mergeCells>' : ''}
      ${hyperlinks.length ? '<hyperlinks>' + hyperlinks.join('') + '</hyperlinks>' : ''}
      ${printSettings(chart || columns.length > 4 ? 'landscape' : 'portrait')}
      ${chart ? '<drawing r:id="rId1"/>' : ''}
    </worksheet>`);
  }

  function totalRow(sheet, names, end, headerRow) {
    const row = end + 1;
    const cells = sheet.columns.map((column, index) => {
      const address = names[index] + row;
      if (index === 0) return cellXml('Tổng cộng', address, 'footer-text');
      const style = 'footer-' + (column.format || 'text');
      if (!sheet.totals.includes(index)) return cellXml(null, address, style);
      const value = sheet.rows.reduce((sum, fields) => sum + (Number(fields[index]) || 0), 0);
      const range = names[index] + (headerRow + 1) + ':' + names[index] + end;
      return cellXml(value, address, style, 'SUBTOTAL(109,' + range + ')');
    }).join('');
    return '<row r="' + row + '" ht="26" customHeight="1">' + cells + '</row>';
  }

  function revenueChartXml(sheet) {
    const {rows, revenueChart} = sheet;
    const headerRow = tableHeaderRow(sheet);
    const ref = column => escapeXml("'" + sheet.name.replaceAll("'", "''") + "'!$" + column + '$' + (headerRow + 1) + ':$' + column + '$' + (headerRow + rows.length));
    const dates = revenueChart.period !== 'day';
    const dateFormat = revenueChart.period === 'year' ? '"T"m' : 'dd';
    const points = values => '<c:ptCount val="' + values.length + '"/>' + values.map((value, index) =>
      '<c:pt idx="' + index + '"><c:v>' + escapeXml(value) + '</c:v></c:pt>'
    ).join('');
    const categories = dates
      ? '<c:numRef><c:f>' + ref('A') + '</c:f><c:numCache><c:formatCode>' + escapeXml(dateFormat) + '</c:formatCode>' + points(rows.map(([date]) => excelDate(date))) + '</c:numCache></c:numRef>'
      : '<c:strRef><c:f>' + ref('A') + '</c:f><c:strCache>' + points(rows.map(([hour]) => hour)) + '</c:strCache></c:strRef>';
    return xml(`<c:chartSpace xmlns:c="${chartNs}" xmlns:a="${drawingNs}">
      <c:lang val="vi-VN"/>
      <c:chart>
        <c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r>
          <a:rPr lang="vi-VN" sz="1400" b="1"/><a:t>${escapeXml(revenueChart.title)} (₫)</a:t>
        </a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>
        <c:plotArea><c:layout/>
          <c:barChart><c:barDir val="col"/><c:grouping val="clustered"/>
            <c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>Thực thu</c:v></c:tx>
              <c:spPr><a:solidFill><a:srgbClr val="536CC4"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr>
              <c:cat>${categories}</c:cat>
              <c:val><c:numRef><c:f>${ref('B')}</c:f><c:numCache><c:formatCode>#,##0</c:formatCode>
                ${points(rows.map(([, amount]) => amount))}
              </c:numCache></c:numRef></c:val>
            </c:ser>
            <c:gapWidth val="85"/><c:axId val="1"/><c:axId val="2"/>
          </c:barChart>
          <c:catAx><c:axId val="1"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="b"/>
            ${dates ? '<c:numFmt formatCode="' + escapeXml(dateFormat) + '" sourceLinked="0"/>' : ''}
            <c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/>
            <c:crossAx val="2"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/>
            <c:tickLblSkip val="${Math.ceil(rows.length / 14)}"/>
          </c:catAx>
          <c:valAx><c:axId val="2"/><c:scaling><c:orientation val="minMax"/><c:min val="0"/></c:scaling><c:axPos val="l"/>
            <c:majorGridlines><c:spPr><a:ln><a:solidFill><a:srgbClr val="E3EAF4"/></a:solidFill></a:ln></c:spPr></c:majorGridlines>
            <c:numFmt formatCode="#,##0" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/>
            <c:tickLblPos val="nextTo"/><c:crossAx val="1"/><c:crosses val="autoZero"/><c:crossBetween val="between"/>
          </c:valAx>
        </c:plotArea>
        <c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/>
      </c:chart>
      <c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln><a:solidFill><a:srgbClr val="D5DFEF"/></a:solidFill></a:ln></c:spPr>
    </c:chartSpace>`);
  }

  function chartDrawingXml() {
    const xdr = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing';
    return xml(`<xdr:wsDr xmlns:xdr="${xdr}" xmlns:a="${drawingNs}" xmlns:c="${chartNs}" xmlns:r="${officeRelationships}">
      <xdr:twoCellAnchor editAs="oneCell">
        <xdr:from><xdr:col>3</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>4</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
        <xdr:to><xdr:col>12</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>19</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
        <xdr:graphicFrame macro="">
          <xdr:nvGraphicFramePr><xdr:cNvPr id="1" name="Biểu đồ doanh thu"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>
          <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
          <a:graphic><a:graphicData uri="${chartNs}"><c:chart r:id="rId1"/></a:graphicData></a:graphic>
        </xdr:graphicFrame>
        <xdr:clientData/>
      </xdr:twoCellAnchor>
    </xdr:wsDr>`);
  }

  async function create(sheets) {
    if (!window.JSZip) throw new Error('Chưa tải được bộ xuất Excel. Vui lòng tải lại trang.');
    const zip = new window.JSZip();
    const relationships = (id, type, target) =>
      '<Relationship Id="' + id + '" Type="' + officeRelationships + '/' + type + '" Target="' + target + '"/>';
    const relationshipFile = link => xml('<Relationships xmlns="' + packageRelationships + '">' + link + '</Relationships>');
    const sheetLinks = [];
    const sheetEntries = [];
    const sheetContentTypes = [];
    const printTitles = [];
    sheets.forEach((sheet, index) => {
      const headerRow = tableHeaderRow(sheet);
      const id = index + 1;
      const path = 'worksheets/sheet' + id + '.xml';
      zip.file('xl/' + path, worksheetXml(sheet, index === 0));
      sheetLinks.push(relationships('rId' + id, 'worksheet', path));
      sheetEntries.push('<sheet name="' + escapeXml(sheet.name) + '" sheetId="' + id + '" r:id="rId' + id + '"/>');
      sheetContentTypes.push('<Override PartName="/xl/' + path + '" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>');
      if (!sheet.dashboard) printTitles.push(`<definedName name="_xlnm.Print_Titles" localSheetId="${index}">'${escapeXml(sheet.name.replaceAll("'", "''"))}'!$${headerRow}:$${headerRow}</definedName>`);
      if (sheet.revenueChart && sheet.rows.length) {
        const drawing = 'drawing' + id + '.xml', chart = 'chart' + id + '.xml';
        zip.file('xl/worksheets/_rels/sheet' + id + '.xml.rels', relationshipFile(relationships('rId1', 'drawing', '../drawings/' + drawing)));
        zip.file('xl/drawings/' + drawing, chartDrawingXml());
        zip.file('xl/drawings/_rels/' + drawing + '.rels', relationshipFile(relationships('rId1', 'chart', '../charts/' + chart)));
        zip.file('xl/charts/' + chart, revenueChartXml(sheet));
        sheetContentTypes.push('<Override PartName="/xl/drawings/' + drawing + '" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>');
        sheetContentTypes.push('<Override PartName="/xl/charts/' + chart + '" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>');
      }
    });

    zip.file('[Content_Types].xml', xml(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
      <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
      ${sheetContentTypes.join('')}</Types>`));
    zip.file('_rels/.rels', xml(`<Relationships xmlns="${packageRelationships}">${relationships('rId1', 'officeDocument', 'xl/workbook.xml')}</Relationships>`));
    zip.file('xl/_rels/workbook.xml.rels', xml(`<Relationships xmlns="${packageRelationships}">${sheetLinks.join('')}${relationships('rId' + (sheets.length + 1), 'styles', 'styles.xml')}</Relationships>`));
    zip.file('xl/workbook.xml', xml(`<workbook xmlns="${sheetNs}" xmlns:r="${officeRelationships}">
      <bookViews><workbookView activeTab="0"/></bookViews>
      <sheets>${sheetEntries.join('')}</sheets>
      ${printTitles.length ? '<definedNames>' + printTitles.join('') + '</definedNames>' : ''}
    </workbook>`));
    zip.file('xl/styles.xml', stylesXml());
    return zip.generateAsync({type: 'blob', compression: 'DEFLATE', mimeType});
  }

  window.AtinoWorkbook = {create};
})();

/*
 * Atino product taxonomy and optional public-catalog references.
 * Sources reviewed on 2026-11-26 (Asia/Ho_Chi_Minh): https://atino.vn/ and
 * the official product/category URLs attached to each reference below.
 * These are reference names and publicly displayed retail prices only.
 * They do not create store products, stock, purchase costs or transactions.
 * Prices and size specifications must be checked before a reference is saved.
 * "Một cỡ" is an editable option for pages with no size selector; it is not
 * a claim about the physical dimensions or universal fit of a product.
 */
(() => {
  'use strict';

  // Keep the first five names and their order: earlier saved records use indexes.
  const categories = Object.freeze([
    'Áo phông', 'Áo polo', 'Quần âu', 'Quần jean', 'Áo khoác',
    'Áo sơ mi', 'Quần short',
    'Túi / Balo', 'Giày / Dép', 'Dây lưng', 'Mũ', 'Quần lót', 'Tất'
  ]);

  const prefixes = Object.freeze({
    'Áo phông': 'AT', 'Áo polo': 'AP', 'Quần âu': 'QA',
    'Quần jean': 'QJ', 'Áo khoác': 'AK', 'Áo sơ mi': 'SM',
    'Áo nỉ': 'NI', 'Áo len': 'LE', 'Áo hoodie': 'HD',
    'Áo cardigan': 'CD', 'Áo blazer / Măng tô': 'BZ',
    'Áo tank top': 'TT', 'Bộ thể thao': 'BT', 'Quần kaki': 'QK',
    'Quần nỉ': 'QN', 'Quần gió': 'QG', 'Quần short': 'QS',
    'Túi / Balo': 'TB', 'Giày / Dép': 'GD', 'Dây lưng': 'DL',
    'Mũ': 'MU', 'Quần lót': 'QL', 'Tất': 'TA'
  });

  const apparelSizes = Object.freeze(['S', 'M', 'L', 'XL', 'XXL']);
  const trouserSizes = Object.freeze(['28', '29', '30', '31', '32', '33', '34', '35', '36']);
  const footwearSizes = Object.freeze(['39', '40', '41', '42', '43', '44']);
  const singleSizes = Object.freeze(['Một cỡ']);
  const trousers = new Set(['Quần âu', 'Quần jean', 'Quần kaki', 'Quần nỉ', 'Quần gió', 'Quần short']);
  const unsizedAccessories = new Set(['Túi / Balo', 'Dây lưng', 'Mũ', 'Tất']);

  function categoryOf(productOrCategory) {
    const raw = typeof productOrCategory === 'string'
      ? productOrCategory
      : productOrCategory?.category;
    const category = String(raw || '').trim();
    // Accept official-site spelling without changing stored legacy labels.
    const aliases = {
      'Quần Jeans': 'Quần jean', 'Quần jeans': 'Quần jean',
      'Giày Dép': 'Giày / Dép', 'Giày dép': 'Giày / Dép',
      'Dây Lưng': 'Dây lưng', 'Quần Lót': 'Quần lót'
    };
    return aliases[category] || category;
  }

  function sizesFor(productOrCategory) {
    const product = productOrCategory && typeof productOrCategory === 'object'
      ? productOrCategory : null;
    if (Array.isArray(product?.sizes)) {
      const explicit = [...new Set(product.sizes.map(size => String(size).trim()).filter(Boolean))];
      if (explicit.length) return explicit;
    }
    const category = categoryOf(productOrCategory);
    // Existing trouser records had S–XXL stock keys. New products receive an
    // explicit editable size list from sizesFor(category), preserving old data.
    if (product && (category === 'Quần âu' || category === 'Quần jean')) {
      return [...apparelSizes];
    }
    if (trousers.has(category)) return [...trouserSizes];
    if (category === 'Giày / Dép') return [...footwearSizes];
    if (unsizedAccessories.has(category)) return [...singleSizes];
    return [...apparelSizes];
  }

  function unitFor(productOrCategory) {
    const category = categoryOf(productOrCategory);
    return category === 'Giày / Dép' || category === 'Tất' ? 'đôi' : 'sản phẩm';
  }

  const references = Object.freeze([
    {
      id: 'atino-balo-19339', name: 'Balo 1.9339', category: 'Túi / Balo',
      price: 395000, sizes: ['Một cỡ'],
      source: 'https://atino.vn/balo-1.9339-p37636355.html', checkedOn: '2026-11-26'
    },
    {
      id: 'atino-tui-cheo-19351', name: 'Túi Chéo 1.9351', category: 'Túi / Balo',
      price: 249000, sizes: ['Một cỡ'],
      source: 'https://atino.vn/tui-cheo-1.9351-p37895473.html', checkedOn: '2026-11-26'
    },
    {
      id: 'atino-dep-da-19801', name: 'Dép Da 1.9801', category: 'Giày / Dép',
      price: 219000, sizes: ['39', '40', '41', '42'],
      source: 'https://atino.vn/dep-da-1.9801-p37937635.html', checkedOn: '2026-11-26'
    },
    {
      id: 'atino-giay-19816', name: 'Giày Thể Thao 1.9816', category: 'Giày / Dép',
      price: 399000, sizes: ['39', '40', '41', '42', '43', '44'],
      source: 'https://atino.vn/giay-the-thao-1.9816-p37924096.html', checkedOn: '2026-11-26'
    },
    {
      id: 'atino-mu-m204', name: 'M204 Mũ Colorado Since 1977', category: 'Mũ',
      price: 129000, sizes: ['Một cỡ'],
      source: 'https://atino.vn/m204-mu-colorado-since-1977-p37927516.html', checkedOn: '2026-11-26'
    },
    {
      id: 'atino-day-lung-9902', name: 'Dây Lưng Atino Da Bò 9902', category: 'Dây lưng',
      price: 189000, sizes: ['Một cỡ'],
      source: 'https://atino.vn/that-lung-den-1.9902-p37717641.html', checkedOn: '2026-11-26'
    },
    {
      id: 'atino-tat-59600', name: 'Tất ngắn cổ 5.9600', category: 'Tất',
      price: 19000, sizes: ['Một cỡ'],
      source: 'https://atino.vn/tat-pc370137.html', checkedOn: '2026-11-26'
    },
    {
      id: 'atino-quan-lot-xl51900', name: 'Quần Lót cạp to XL.5.1900', category: 'Quần lót',
      price: 69000, sizes: ['M', 'L', 'XL', '2XL'],
      source: 'https://atino.vn/quan-lot-cap-to-xl.5.1900-p37671114.html', checkedOn: '2026-11-26'
    }
  ].map(reference => Object.freeze({...reference, sizes: Object.freeze(reference.sizes)})));

  window.AtinoCatalog = Object.freeze({categories, prefixes, sizesFor, unitFor, references});
})();

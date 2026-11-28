(() => {
  'use strict';

  const integer = new Intl.NumberFormat('vi-VN', {useGrouping: 'always', maximumFractionDigits: 0});
  const format = value => Number.isSafeInteger(value) ? integer.format(value) : '';

  function read(input) {
    const value = input?.value.trim();
    if (!value || !/^\d[\d.]*$/.test(value)) return NaN;
    const amount = Number(value.replaceAll('.', ''));
    return Number.isSafeInteger(amount) ? amount : NaN;
  }

  function set(input, amount) {
    input.value = format(amount);
    validate(input);
  }

  function validate(input) {
    const amount = read(input);
    const min = Number(input.getAttribute('min') ?? 0);
    const max = Number(input.getAttribute('max') ?? Number.MAX_SAFE_INTEGER);
    let error = '';
    if (input.value && !Number.isSafeInteger(amount)) error = 'Nhập số tiền bằng đồng, ví dụ 100.000.';
    else if (amount < min) error = 'Số tiền tối thiểu là ' + format(min) + ' đ.';
    else if (amount > max) error = 'Số tiền tối đa là ' + format(max) + ' đ.';
    input.setCustomValidity(error);
  }

  document.addEventListener('input', event => {
    const input = event.target;
    if (!input.matches?.('[data-money]') || event.isComposing) return;
    const previous = input.value;
    const amount = read(input);
    if (Number.isSafeInteger(amount)) {
      const after = previous.slice(input.selectionStart).replace(/\D/g, '').length;
      input.value = format(amount);
      let caret = input.value.length;
      let remaining = after;
      while (caret > 0 && remaining > 0) {
        caret--;
        if (input.value[caret] !== '.') remaining--;
      }
      input.setSelectionRange(caret, caret);
    }
    validate(input);
  }, true);

  document.addEventListener('reset', event => {
    for (const input of event.target.querySelectorAll('[data-money]')) input.setCustomValidity('');
  });

  window.AtinoMoney = {format, read, set};
})();

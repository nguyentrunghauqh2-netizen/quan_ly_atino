(function (global) {
  'use strict';

  function asText(value) {
    if (Array.isArray(value)) return value.map(asText).join(' ');
    return value == null ? '' : String(value);
  }

  function normalize(value) {
    return asText(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function match(value, query) {
    const needle = normalize(query);
    if (!needle) return true;
    const haystack = normalize(value);
    return needle.split(' ').every(function (token) { return haystack.includes(token); });
  }

  global.AtinoSearch = Object.freeze({normalize, match});
})(window);

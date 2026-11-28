(function (global) {
  'use strict';

  const attached = new WeakMap();
  let active = null;
  let sequence = 0;
  let globalsInstalled = false;

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

  function searchable(item) {
    // Explicit searchText keeps autocomplete and its associated table in sync.
    return item.searchText != null ? item.searchText : [item.label, item.value, item.detail];
  }

  function resultLimit(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
  }

  function rank(items, query, limit) {
    if (!Array.isArray(items)) return [];
    const needle = normalize(query);
    const tokens = needle ? needle.split(' ') : [];
    const maximum = limit == null ? 8 : resultLimit(limit, 8);
    if (!maximum) return [];

    return items.map(function (item, index) {
      if (!item || typeof item !== 'object') return null;
      const full = normalize(searchable(item));
      if (!tokens.every(function (token) { return full.includes(token); })) return null;
      const label = normalize(item.label);
      const value = normalize(item.value);
      const primary = normalize([label, value]);
      const words = primary.split(' ');
      let tier = 6;
      if (!needle || label === needle || value === needle) tier = 0;
      else if (label.startsWith(needle) || value.startsWith(needle)) tier = 1;
      else if (tokens.every(function (token) {
        return words.some(function (word) { return word.startsWith(token); });
      })) tier = 2;
      else if (label.includes(needle) || value.includes(needle)) tier = 3;
      else if (tokens.every(function (token) { return primary.includes(token); })) tier = 4;
      else if (tokens.every(function (token) {
        return full.split(' ').some(function (word) { return word.startsWith(token); });
      })) tier = 5;
      const position = tokens.reduce(function (sum, token) {
        const at = primary.indexOf(token);
        return sum + (at < 0 ? full.length : at);
      }, 0);
      return { item: item, tier: tier, position: position, index: index };
    }).filter(Boolean).sort(function (a, b) {
      return a.tier - b.tier || a.position - b.position || a.index - b.index;
    }).slice(0, maximum).map(function (entry) { return entry.item; });
  }

  function close() {
    if (active) active.close();
  }

  function positionActive() {
    if (active) active.position();
  }

  function installGlobals() {
    if (globalsInstalled) return;
    globalsInstalled = true;
    const doc = global.document;
    doc.addEventListener('pointerdown', function (event) {
      if (!active) return;
      if (!active.input.isConnected ||
          (event.target !== active.input && !active.popup.contains(event.target))) close();
    }, true);
    doc.addEventListener('scroll', positionActive, { capture: true, passive: true });
    global.addEventListener('resize', positionActive, { passive: true });
    if (global.visualViewport) {
      global.visualViewport.addEventListener('resize', positionActive, { passive: true });
      global.visualViewport.addEventListener('scroll', positionActive, { passive: true });
    }
    doc.addEventListener('close', function (event) {
      if (active && event.target.contains(active.input)) close();
    }, true);
    if (global.MutationObserver && doc.documentElement) {
      const observer = new global.MutationObserver(function () {
        if (active && (!active.input.isConnected ||
            (active.dialog && !active.dialog.open))) close();
      });
      observer.observe(doc.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });
    }
  }

  function element(tag, className, text) {
    const node = global.document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = String(text);
    return node;
  }

  function attach(input, options) {
    if (!input || input.tagName !== 'INPUT') return null;
    const existing = attached.get(input);
    if (existing) return existing.update(options);
    installGlobals();

    const doc = input.ownerDocument;
    const listId = 'atino-suggest-list-' + (++sequence);
    const attributes = ['role', 'autocomplete', 'aria-autocomplete', 'aria-haspopup',
      'aria-expanded', 'aria-controls', 'aria-activedescendant'];
    const original = new Map(attributes.map(function (name) { return [name, input.getAttribute(name)]; }));
    let config = Object.assign({ items: function () { return []; }, limit: 8 }, options || {});
    let popup = null;
    let list = null;
    let rows = [];
    let results = [];
    let selected = -1;
    let composing = false;
    let suppressInput = false;
    let destroyed = false;

    input.setAttribute('role', 'combobox');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-haspopup', 'listbox');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', listId);
    input.removeAttribute('aria-activedescendant');

    function hide() {
      if (popup) popup.remove();
      popup = null;
      list = null;
      rows = [];
      results = [];
      selected = -1;
      controller.popup = null;
      controller.dialog = null;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      if (active === controller) active = null;
    }

    function position() {
      if (!popup) return;
      if (!input.isConnected || !input.getClientRects().length ||
          (controller.dialog && !controller.dialog.open)) {
        hide();
        return;
      }
      const rect = input.getBoundingClientRect();
      const viewport = global.visualViewport;
      const leftEdge = viewport ? viewport.offsetLeft : 0;
      const topEdge = viewport ? viewport.offsetTop : 0;
      const viewportWidth = viewport ? viewport.width : doc.documentElement.clientWidth;
      const viewportHeight = viewport ? viewport.height : global.innerHeight;
      const margin = 10;
      const gap = 3;
      const rightEdge = leftEdge + viewportWidth;
      const bottomEdge = topEdge + viewportHeight;
      if (rect.bottom < topEdge || rect.top > bottomEdge ||
          rect.right < leftEdge || rect.left > rightEdge) {
        hide();
        return;
      }
      const width = Math.max(0, Math.min(rect.width, viewportWidth - margin * 2));
      const left = Math.max(leftEdge + margin, Math.min(rect.left, rightEdge - width - margin));
      const below = Math.max(0, bottomEdge - rect.bottom - gap - margin);
      const maxHeight = Math.min(224, below);
      popup.style.width = width + 'px';
      popup.style.left = left + 'px';
      popup.style.maxHeight = maxHeight + 'px';
      popup.style.top = (rect.bottom + gap) + 'px';
    }

    function activate(index) {
      if (!results.length || !popup) return;
      selected = (index + results.length) % results.length;
      rows.forEach(function (row, rowIndex) {
        const isSelected = rowIndex === selected;
        row.setAttribute('aria-selected', String(isSelected));
        row.classList.toggle('atino-suggest-option-active', isSelected);
      });
      const row = rows[selected];
      input.setAttribute('aria-activedescendant', row.id);
      if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop;
      else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight) {
        list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight;
      }
    }

    function choose(item) {
      if (destroyed || !input.isConnected || active !== controller || !results.includes(item)) return;
      input.value = asText(item.value || item.label);
      hide();
      suppressInput = true;
      try {
        input.dispatchEvent(new global.Event('input', { bubbles: true }));
      } finally {
        suppressInput = false;
      }
      if (!destroyed && input.isConnected && typeof config.onSelect === 'function') {
        config.onSelect(item);
      }
    }

    function refresh() {
      if (destroyed || suppressInput || composing) return controller;
      const query = normalize(input.value);
      if (!input.isConnected || doc.activeElement !== input || input.disabled) {
        if (active === controller) hide();
        return controller;
      }
      const dialog = input.closest('dialog');
      if (dialog && !dialog.open) return controller;
      if (active && active !== controller) close();
      hide();
      const source = typeof config.items === 'function' ? config.items() : config.items;
      const items = Array.isArray(source) ? source : [];
      const matches = rank(items, query, items.length);
      const limit = Math.max(1, resultLimit(config.limit, 8));
      results = matches.slice(0, limit);

      popup = element('div', 'atino-suggest-popover');
      popup.setAttribute('data-atino-suggestions', '');
      list = element('div', 'atino-suggest-list');
      list.id = listId;
      list.setAttribute('role', 'listbox');
      list.setAttribute('aria-label', 'Kết quả gợi ý tìm kiếm');
      results.forEach(function (item, index) {
        const row = element('div', 'atino-suggest-option');
        row.id = listId + '-option-' + index;
        row.setAttribute('role', 'option');
        row.setAttribute('aria-selected', 'false');
        const copy = element('span', 'atino-suggest-copy');
        copy.appendChild(element('span', 'atino-suggest-label', item.label || item.value));
        if (item.detail) copy.appendChild(element('span', 'atino-suggest-detail', asText(item.detail)));
        row.appendChild(copy);
        row.addEventListener('pointerdown', function (event) { event.preventDefault(); });
        row.addEventListener('click', function (event) {
          event.preventDefault();
          choose(item);
        });
        row.addEventListener('pointermove', function (event) {
          if (event.pointerType !== 'touch' && selected !== index) activate(index);
        });
        rows.push(row);
        list.appendChild(row);
      });
      popup.appendChild(list);

      if (!results.length) {
        const empty = element('div', 'atino-suggest-empty');
        empty.appendChild(element('strong', '', 'Chưa tìm thấy kết quả'));
        popup.appendChild(empty);
      }
      controller.popup = popup;
      controller.dialog = dialog;
      active = controller;
      (dialog || doc.body).appendChild(popup);
      input.setAttribute('aria-expanded', 'true');
      const viewport = global.visualViewport;
      const bottom = viewport ? viewport.offsetTop + viewport.height : global.innerHeight;
      if (bottom - input.getBoundingClientRect().bottom < 150) {
        input.scrollIntoView({block: 'center', inline: 'nearest', behavior: 'instant'});
      }
      position();
      return controller;
    }

    function onInput(event) {
      if (!event.isComposing) refresh();
    }

    function onFocus() { refresh(); }
    function onBlur() { hide(); }
    function onCompositionStart() { composing = true; hide(); }
    function onCompositionEnd() { composing = false; refresh(); }

    function onKeyDown(event) {
      if (composing || event.isComposing || event.keyCode === 229) return;
      if (event.key === 'Enter') {
        // A search field inside an inventory or sales form must never submit it.
        event.preventDefault();
        event.stopPropagation();
        if (active !== controller && normalize(input.value)) refresh();
        if (active === controller && results.length) choose(results[selected < 0 ? 0 : selected]);
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        if (active !== controller) refresh();
        if (results.length) {
          const next = selected < 0 ? (event.key === 'ArrowDown' ? 0 : results.length - 1)
            : selected + (event.key === 'ArrowDown' ? 1 : -1);
          activate(next);
        }
      } else if (event.key === 'Escape' && active === controller) {
        event.preventDefault();
        event.stopPropagation();
        hide();
      } else if (event.key === 'Tab') {
        hide();
      }
    }

    const listeners = { input: onInput, search: onInput, focus: onFocus, click: () => { if (!popup) refresh(); }, blur: onBlur,
      keydown: onKeyDown, compositionstart: onCompositionStart, compositionend: onCompositionEnd };
    Object.keys(listeners).forEach(function (name) { input.addEventListener(name, listeners[name]); });

    const controller = {
      input: input,
      popup: null,
      dialog: null,
      refresh: refresh,
      close: hide,
      position: position,
      update: function (nextOptions) {
        config = Object.assign({}, config, nextOptions || {});
        if (active === controller) refresh();
        return controller;
      },
      destroy: function () {
        if (destroyed) return;
        hide();
        destroyed = true;
        Object.keys(listeners).forEach(function (name) { input.removeEventListener(name, listeners[name]); });
        original.forEach(function (value, name) {
          if (value == null) input.removeAttribute(name);
          else input.setAttribute(name, value);
        });
        attached.delete(input);
      }
    };
    attached.set(input, controller);
    if (doc.activeElement === input) refresh();
    return controller;
  }

  global.AtinoSearch = Object.freeze({ normalize: normalize, match: match, rank: rank, attach: attach, close: close });
})(window);

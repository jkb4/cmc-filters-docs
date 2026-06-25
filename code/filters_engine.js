// ─── Config ───────────────────────────────────────────────────────────────────
const IS_DESIGNER = document.documentElement.hasAttribute('wf-designer');

// ─── Helper: display name → slug ─────────────────────────────────────────────
function toSlug(str) {
  return str.toLowerCase().replace(/\s+/g, '-');
}

// ─── Level 1: count items ─────────────────────────────────────────────────────
(function updateLevel1Count() {
  const wrap = document.querySelector('[data-filter-dropdown="level-1-filters-wrap"]');
  const countEl = document.querySelector('[data-filters-dropdown="level-1-filters-count"]');
  if (!wrap || !countEl) return;
  const count = wrap.querySelectorAll('[data-filter-dropdown="level-1-filters-item"]').length;
  countEl.textContent = '(' + count + ')';
})();

// ─── Hide levels 2 / 3 / 4 on load ───────────────────────────────────────────
(function initLevelVisibility() {
  if (IS_DESIGNER) return;
  ['level-2', 'level-3', 'level-4'].forEach(function (level) {
    const el = document.querySelector('[data-filters-dropdown="' + level + '"]');
    if (el) el.style.display = 'none';
  });
})();

// ─── Reset levels 2 / 3 / 4 ──────────────────────────────────────────────────
function resetLevels() {
  ['level-2', 'level-3', 'level-4'].forEach(function (level) {
    const el = document.querySelector('[data-filters-dropdown="' + level + '"]');
    if (!el) return;
    el.style.display = 'none';

    // Uncheck checkboxes + remove Webflow visual class
    el.querySelectorAll('input[type="checkbox"]').forEach(function (input) {
      input.checked = false;
      input.classList.remove('w--redirected-checked');
    });

    // Uncheck radios (future levels) + remove Webflow visual classes
    el.querySelectorAll('input[type="radio"]').forEach(function (input) {
      input.checked = false;
      const label = input.closest('.w-radio');
      if (label) label.classList.remove('is-list-active');
      const btn = input.parentElement && input.parentElement.querySelector('.w-radio-input');
      if (btn) btn.classList.remove('w--redirected-checked');
    });
  });
}

// ─── Apply filters to product list ───────────────────────────────────────────
function applyFilters() {
  // Read selected category from Level 1 radio
  const categoryInput = document.querySelector('[n4-list-field="category"][type="radio"]:checked');
  const selectedCategory = categoryInput ? categoryInput.getAttribute('n4-list-value') : null;

  // Read all checked Level 2+ filter values
  const checkedFilters = [];
  document.querySelectorAll('[n4-list-field="filter"][type="checkbox"]:checked').forEach(function (cb) {
    checkedFilters.push(cb.getAttribute('n4-list-value'));
  });

  // Show/hide each product item
  document.querySelectorAll('[n4-filters-item]').forEach(function (item) {
    const categoryEl = item.querySelector('[n4-list-field="category"]');
    const productCategory = categoryEl ? categoryEl.textContent.trim() : '';

    // Category match: compare radio n4-list-value to product <p> text content
    const categoryMatch = !selectedCategory || productCategory === selectedCategory;

    // Filter match: OR logic — product must match at least one checked filter
    let filterMatch = true;
    if (checkedFilters.length > 0) {
      const productFilterEls = item.querySelectorAll('[n4-list-field="filter"]');
      const productFilters = [];
      productFilterEls.forEach(function (p) {
        productFilters.push(p.getAttribute('n4-list-value'));
      });
      filterMatch = checkedFilters.some(function (val) {
        return productFilters.indexOf(val) !== -1;
      });
    }

    item.style.display = (categoryMatch && filterMatch) ? '' : 'none';
  });
}

// ─── Level 1 → Level 2 cascade ───────────────────────────────────────────────
(function initLevel1() {
  const level1Wrap = document.querySelector('[data-filter-dropdown="level-1-filters-wrap"]');
  if (!level1Wrap) return;

  level1Wrap.querySelectorAll('input[type="radio"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      const categorySlug = toSlug(this.getAttribute('n4-list-value'));
      resetLevels();
      showLevel2(categorySlug);
      applyFilters();
    });
  });
})();

function showLevel2(categorySlug) {
  const level2 = document.querySelector('[data-filters-dropdown="level-2"]');
  if (!level2) return;
  level2.style.display = '';

  level2.querySelectorAll('[data-filter-list-id]').forEach(function (group) {
    const match = group.getAttribute('data-filter-list-id') === categorySlug;
    group.style.display = match ? '' : 'none';
  });
}

// ─── Level 2 checkboxes → re-apply filters ───────────────────────────────────
(function initLevel2() {
  const level2 = document.querySelector('[data-filters-dropdown="level-2"]');
  if (!level2) return;

  level2.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
    cb.addEventListener('change', function () {
      applyFilters();
    });
  });
})();

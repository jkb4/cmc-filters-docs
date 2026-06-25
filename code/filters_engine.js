// ─── Config ───────────────────────────────────────────────────────────────────
const IS_DESIGNER = document.documentElement.hasAttribute('wf-designer');

// ─── Helper: display name to slug ────────────────────────────────────────────
function toSlug(str) {
  return str.toLowerCase().replace(/\s+/g, '-');
}

// ─── Helper: get checked Level 2 value for a category (fork parent) ──────────
// Used by: showLevel3(), updateLevel2ForkMuting()
function getActiveLevel2ParentCategory(categorySlug) {
  const level2 = document.querySelector('[data-filters-dropdown="level-2"]');
  if (!level2) return null;
  const activeGroup = level2.querySelector('[data-filter-list-id="' + categorySlug + '"]');
  if (!activeGroup) return null;
  const checked = activeGroup.querySelector('input[type="checkbox"]:checked');
  return checked ? checked.getAttribute('n4-list-value') : null;
}

// ─── Helper: get fork parent from visible Level 3 items ───────────────────────
// Used by: showLevel4() — more reliable than reading Level 2 state at this point
function getLevel3ForkParent(categorySlug) {
  const level3 = document.querySelector('[data-filters-dropdown="level-3"]');
  if (!level3) return null;
  const group = level3.querySelector('[data-filter-list-id="' + categorySlug + '"]');
  if (!group) return null;
  var found = null;
  group.querySelectorAll('[data-filter-dropdown="level-3-filters-item"]').forEach(function (item) {
    if (found !== null) return;
    if (item.style.display !== 'none') {
      var pc = item.getAttribute('data-filter-parent-category');
      if (pc && pc !== '') found = pc;
    }
  });
  return found;
}

// ─── Helper: get fork parent from visible Level 4 items ───────────────────────
// Used by: showLevel5() -- parallel to getLevel3ForkParent
function getLevel4ForkParent(categorySlug) {
  const level4 = document.querySelector('[data-filters-dropdown="level-4"]');
  if (!level4) return null;
  const group = level4.querySelector('[data-filter-list-id="' + categorySlug + '"]');
  if (!group) return null;
  var found = null;
  group.querySelectorAll('[data-filter-dropdown="level-4-filters-item"]').forEach(function (item) {
    if (found !== null) return;
    if (item.style.display !== 'none') {
      var pc = item.getAttribute('data-filter-parent-category');
      if (pc && pc !== '') found = pc;
    }
  });
  return found;
}

// ─── Level 1: count items ─────────────────────────────────────────────────────
(function updateLevel1Count() {
  const wrap = document.querySelector('[data-filter-dropdown="level-1-filters-wrap"]');
  const countEl = document.querySelector('[data-filters-dropdown="level-1-filters-count"]');
  if (!wrap || !countEl) return;
  const count = wrap.querySelectorAll('[data-filter-dropdown="level-1-filters-item"]').length;
  countEl.textContent = '(' + count + ')';
})();

// ─── Hide levels 2–5 on load ─────────────────────────────────────────────────
(function initLevelVisibility() {
  if (IS_DESIGNER) return;
  ['level-2', 'level-3', 'level-4', 'level-5'].forEach(function (level) {
    const el = document.querySelector('[data-filters-dropdown="' + level + '"]');
    if (el) el.style.display = 'none';
  });
})();

// ─── Reset a single level (uncheck, hide, clear count/label) ─────────────────
function resetLevel(levelNum) {
  const levelKey = 'level-' + levelNum;
  const el = document.querySelector('[data-filters-dropdown="' + levelKey + '"]');
  if (!el) return;
  el.style.display = 'none';

  el.querySelectorAll('input[type="checkbox"]').forEach(function (input) {
    input.checked = false;
    input.classList.remove('w--redirected-checked');
  });

  el.querySelectorAll('input[type="radio"]').forEach(function (input) {
    input.checked = false;
    const label = input.closest('.w-radio');
    if (label) label.classList.remove('is-list-active');
    const btn = input.parentElement && input.parentElement.querySelector('.w-radio-input');
    if (btn) btn.classList.remove('w--redirected-checked');
  });

  const countEl = document.querySelector('[data-filters-dropdown="' + levelKey + '-filters-count"]');
  if (countEl) countEl.textContent = '(0)';
  const labelEl = document.querySelector('[data-filters-dropdown="lvl-' + levelNum + '-label-get"]');
  if (labelEl) labelEl.textContent = 'Lvl ' + levelNum + ' Filter';
}

// ─── Reset levels 2-5 (called on Level 1 change) ────────────────────────────
function resetLevels() {
  resetLevel(2);
  resetLevel(3);
  resetLevel(4);
  resetLevel(5);
}

// ─── Apply filters to product list ───────────────────────────────────────────
// Logic: AND between levels (each checked level is a gate),
//        OR within a level (any match within the same level passes).
function applyFilters() {
  // Level 1: radio reads selected category
  const categoryInput = document.querySelector('[n4-list-field="category"][type="radio"]:checked');
  const selectedCategory = categoryInput ? categoryInput.getAttribute('n4-list-value') : null;

  // Collect checked filter values per level
  function getCheckedLevel(levelNum) {
    const container = document.querySelector('[data-filters-dropdown="level-' + levelNum + '"]');
    if (!container) return [];
    const vals = [];
    container.querySelectorAll('input[type="checkbox"]:checked').forEach(function (cb) {
      vals.push(cb.getAttribute('n4-list-value'));
    });
    return vals;
  }

  const levelFilters = [
    getCheckedLevel(2),
    getCheckedLevel(3),
    getCheckedLevel(4),
    getCheckedLevel(5),
  ];

  // Show/hide each product item
  document.querySelectorAll('[n4-filters-item]').forEach(function (item) {
    const categoryEl = item.querySelector('[n4-list-field="category"]');
    const productCategory = categoryEl ? categoryEl.textContent.trim() : '';

    // Level 1 gate: category must match
    const categoryMatch = !selectedCategory || productCategory === selectedCategory;

    // Collect all product filter slugs once
    const productFilters = [];
    item.querySelectorAll('[n4-list-field="filter"]').forEach(function (p) {
      productFilters.push(p.getAttribute('n4-list-value'));
    });

    // Each level is a gate: if anything is checked at that level,
    // the product must match at least one value from that level.
    const filterMatch = levelFilters.every(function (lvl) {
      if (lvl.length === 0) return true; // nothing checked -- gate open
      return lvl.some(function (val) { return productFilters.indexOf(val) !== -1; });
    });

    item.style.display = (categoryMatch && filterMatch) ? '' : 'none';
  });
}

// ─── Level 1 to Level 2 cascade ──────────────────────────────────────────────
(function initLevel1() {
  const level1Wrap = document.querySelector('[data-filter-dropdown="level-1-filters-wrap"]');
  if (!level1Wrap) return;

  level1Wrap.querySelectorAll('input[type="radio"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      const categorySlug = toSlug(this.getAttribute('n4-list-value'));
      resetLevels();
      showLevel2(categorySlug);
      updateLevel2Availability();
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

  // Update Level 2 count from active group
  const activeGroup = level2.querySelector('[data-filter-list-id="' + categorySlug + '"]');
  const countEl = document.querySelector('[data-filters-dropdown="level-2-filters-count"]');
  const labelEl = document.querySelector('[data-filters-dropdown="lvl-2-label-get"]');

  if (activeGroup) {
    const wrap = activeGroup.querySelector('[data-filter-dropdown="level-2-filters-wrap"]');
    const count = wrap ? wrap.querySelectorAll('[data-filter-dropdown="level-2-filters-item"]').length : 0;
    if (countEl) countEl.textContent = '(' + count + ')';

    const labelPost = activeGroup.querySelector('[data-filters-label="lvl-2-label-post"]');
    if (labelEl && labelPost) labelEl.textContent = labelPost.textContent.trim();
  }
}

// ─── Level 2: mute unavailable filters ───────────────────────────────────────
function updateLevel2Availability() {
  const categoryInput = document.querySelector('[n4-list-field="category"][type="radio"]:checked');
  const selectedCategory = categoryInput ? categoryInput.getAttribute('n4-list-value') : null;

  // Collect all filter slugs from products matching selected category
  const availableFilters = new Set();
  document.querySelectorAll('[n4-filters-item]').forEach(function (item) {
    const categoryEl = item.querySelector('[n4-list-field="category"]');
    const productCategory = categoryEl ? categoryEl.textContent.trim() : '';
    if (!selectedCategory || productCategory === selectedCategory) {
      item.querySelectorAll('[n4-list-field="filter"]').forEach(function (p) {
        availableFilters.add(p.getAttribute('n4-list-value'));
      });
    }
  });

  // Mute/unmute each Level 2 checkbox item
  const level2 = document.querySelector('[data-filters-dropdown="level-2"]');
  if (!level2) return;
  level2.querySelectorAll('[data-filter-dropdown="level-2-filters-item"]').forEach(function (item) {
    const cb = item.querySelector('input[type="checkbox"]');
    if (!cb) return;
    const available = availableFilters.has(cb.getAttribute('n4-list-value'));
    item.style.opacity = available ? '' : '0.5';
    item.style.pointerEvents = available ? '' : 'none';
  });
}

// ─── Level 2: fork muting (Carlton — mutually exclusive choices) ──────────────
// Detects fork automatically: if Level 3 items have non-empty data-filter-parent-category
// matching Level 2 values, checking one mutes the others.
function updateLevel2ForkMuting(categorySlug) {
  const level2 = document.querySelector('[data-filters-dropdown="level-2"]');
  if (!level2) return;
  const activeGroup = level2.querySelector('[data-filter-list-id="' + categorySlug + '"]');
  if (!activeGroup) return;

  // Collect fork parent values from Level 3 items with non-empty data-filter-parent-category
  const level3 = document.querySelector('[data-filters-dropdown="level-3"]');
  const level3Group = level3 ? level3.querySelector('[data-filter-list-id="' + categorySlug + '"]') : null;
  if (!level3Group) return;

  const forkParents = new Set();
  level3Group.querySelectorAll('[data-filter-dropdown="level-3-filters-item"][data-filter-parent-category]').forEach(function (el) {
    const pc = el.getAttribute('data-filter-parent-category');
    if (pc && pc !== '') forkParents.add(pc);
  });
  if (forkParents.size === 0) return; // No fork dependency — nothing to do

  // Find which fork value is currently checked (if any)
  const checkedFork = getActiveLevel2ParentCategory(categorySlug);

  // Override: mute all non-selected fork items on top of availability state
  activeGroup.querySelectorAll('[data-filter-dropdown="level-2-filters-item"]').forEach(function (item) {
    const cb = item.querySelector('input[type="checkbox"]');
    if (!cb) return;
    const val = cb.getAttribute('n4-list-value');
    if (!forkParents.has(val)) return; // Not a fork item — skip

    if (checkedFork && val !== checkedFork) {
      item.style.opacity = '0.5';
      item.style.pointerEvents = 'none';
    }
    // If no fork is checked, updateLevel2Availability() already set the correct state
  });
}

// ─── Level 2 checkboxes: re-apply + show Level 3 ─────────────────────────────
(function initLevel2() {
  const level2 = document.querySelector('[data-filters-dropdown="level-2"]');
  if (!level2) return;

  level2.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
    cb.addEventListener('change', function () {
      // Cascade reset: Level 2 change clears all downstream levels
      resetLevel(3);
      resetLevel(4);
      resetLevel(5);

      applyFilters();

      const categoryInput = document.querySelector('[n4-list-field="category"][type="radio"]:checked');
      if (!categoryInput) return;
      const categorySlug = toSlug(categoryInput.getAttribute('n4-list-value'));

      const anyChecked = level2.querySelectorAll('input[type="checkbox"]:checked').length > 0;

      if (anyChecked) {
        showLevel3(categorySlug);
        updateLevel3Availability();
      }

      // Always re-apply Level 2 muting after any checkbox change (availability + fork on top)
      updateLevel2Availability();
      updateLevel2ForkMuting(categorySlug);
    });
  });
})();

// ─── Level 3: show (with Carlton fork logic) ──────────────────────────────────
function showLevel3(categorySlug) {
  const level3 = document.querySelector('[data-filters-dropdown="level-3"]');
  if (!level3) return;
  level3.style.display = '';

  level3.querySelectorAll('[data-filter-list-id]').forEach(function (group) {
    const match = group.getAttribute('data-filter-list-id') === categorySlug;
    group.style.display = match ? '' : 'none';
  });

  const activeGroup = level3.querySelector('[data-filter-list-id="' + categorySlug + '"]');
  const countEl = document.querySelector('[data-filters-dropdown="level-3-filters-count"]');
  const labelEl = document.querySelector('[data-filters-dropdown="lvl-3-label-get"]');

  if (!activeGroup) return;

  // Detect fork: any Level 3 items with non-empty data-filter-parent-category?
  const isFork = !!activeGroup.querySelector(
    '[data-filter-dropdown="level-3-filters-item"][data-filter-parent-category]:not([data-filter-parent-category=""])'
  );

  if (isFork) {
    const selectedParent = getActiveLevel2ParentCategory(categorySlug);

    // Show/hide items by parent category match
    activeGroup.querySelectorAll('[data-filter-dropdown="level-3-filters-item"]').forEach(function (item) {
      const parentCat = item.getAttribute('data-filter-parent-category');
      item.style.display = (parentCat === selectedParent) ? '' : 'none';
    });

    // Show/hide label elements by parent category match
    activeGroup.querySelectorAll('[data-filters-label="lvl-3-label-post"]').forEach(function (lbl) {
      const parentCat = lbl.getAttribute('data-filter-parent-category');
      lbl.style.display = (parentCat === selectedParent) ? '' : 'none';
    });

    // Count only visible items
    let count = 0;
    activeGroup.querySelectorAll('[data-filter-dropdown="level-3-filters-item"]').forEach(function (item) {
      if (item.style.display !== 'none') count++;
    });
    if (countEl) countEl.textContent = '(' + count + ')';

    // Label text from matching parent category label element
    const matchingLabel = selectedParent
      ? activeGroup.querySelector('[data-filters-label="lvl-3-label-post"][data-filter-parent-category="' + selectedParent + '"]')
      : null;
    if (labelEl && matchingLabel) labelEl.textContent = matchingLabel.textContent.trim();

  } else {
    // Non-fork: original behavior — show all items
    activeGroup.querySelectorAll('[data-filter-dropdown="level-3-filters-item"]').forEach(function (item) {
      item.style.display = '';
    });

    const wrap = activeGroup.querySelector('[data-filter-dropdown="level-3-filters-wrap"]');
    const count = wrap ? wrap.querySelectorAll('[data-filter-dropdown="level-3-filters-item"]').length : 0;
    if (countEl) countEl.textContent = '(' + count + ')';

    const labelPost = activeGroup.querySelector('[data-filters-label="lvl-3-label-post"]');
    if (labelEl && labelPost) labelEl.textContent = labelPost.textContent.trim();
  }
}

// ─── Level 3: hide + reset (defined, not currently called — deferred) ────────
function hideLevel3() {
  const level3 = document.querySelector('[data-filters-dropdown="level-3"]');
  if (!level3) return;
  level3.style.display = 'none';

  level3.querySelectorAll('input[type="checkbox"]').forEach(function (input) {
    input.checked = false;
    input.classList.remove('w--redirected-checked');
  });

  const countEl = document.querySelector('[data-filters-dropdown="level-3-filters-count"]');
  if (countEl) countEl.textContent = '(0)';
  const labelEl = document.querySelector('[data-filters-dropdown="lvl-3-label-get"]');
  if (labelEl) labelEl.textContent = 'Lvl 3 Filter';
}

// ─── Level 3: mute unavailable filters (based on visible products) ────────────
function updateLevel3Availability() {
  // Collect filter slugs from currently VISIBLE products only
  const availableFilters = new Set();
  document.querySelectorAll('[n4-filters-item]').forEach(function (item) {
    if (item.style.display === 'none') return;
    item.querySelectorAll('[n4-list-field="filter"]').forEach(function (p) {
      availableFilters.add(p.getAttribute('n4-list-value'));
    });
  });

  const level3 = document.querySelector('[data-filters-dropdown="level-3"]');
  if (!level3) return;
  // Only mute items that are currently visible (not fork-hidden)
  level3.querySelectorAll('[data-filter-dropdown="level-3-filters-item"]').forEach(function (item) {
    if (item.style.display === 'none') return; // fork-hidden — don't touch
    const cb = item.querySelector('input[type="checkbox"]');
    if (!cb) return;
    const available = availableFilters.has(cb.getAttribute('n4-list-value'));
    item.style.opacity = available ? '' : '0.5';
    item.style.pointerEvents = available ? '' : 'none';
  });
}

// ─── Level 3 checkboxes: re-apply filters + show Level 4 ────────────────────
(function initLevel3() {
  const level3 = document.querySelector('[data-filters-dropdown="level-3"]');
  if (!level3) return;

  level3.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
    cb.addEventListener('change', function () {
      // Cascade reset: Level 3 change clears all downstream levels
      resetLevel(4);
      resetLevel(5);

      applyFilters();
      updateLevel3Availability();

      const categoryInput = document.querySelector('[n4-list-field="category"][type="radio"]:checked');
      if (!categoryInput) return;
      const categorySlug = toSlug(categoryInput.getAttribute('n4-list-value'));

      const anyChecked = level3.querySelectorAll('input[type="checkbox"]:checked').length > 0;
      if (anyChecked) {
        showLevel4(categorySlug);
        updateLevel4Availability();
      }
    });
  });
})();

// ─── Level 4: show (with fork logic — same pattern as Level 3) ───────────────
function showLevel4(categorySlug) {
  const level4 = document.querySelector('[data-filters-dropdown="level-4"]');
  if (!level4) return;

  // Check for a matching group with items BEFORE showing the container.
  // Lift Carriers has an empty Level 4 group in the DOM -- leave the container hidden.
  const activeGroup = level4.querySelector('[data-filter-list-id="' + categorySlug + '"]');
  if (!activeGroup) return;
  const hasItems = !!activeGroup.querySelector('[data-filter-dropdown="level-4-filters-item"]');
  if (!hasItems) return;

  level4.style.display = '';

  level4.querySelectorAll('[data-filter-list-id]').forEach(function (group) {
    const match = group.getAttribute('data-filter-list-id') === categorySlug;
    group.style.display = match ? '' : 'none';
  });

  const countEl = document.querySelector('[data-filters-dropdown="level-4-filters-count"]');
  const labelEl = document.querySelector('[data-filters-dropdown="lvl-4-label-get"]');

  // Detect fork: any Level 4 items with non-empty data-filter-parent-category?
  const isFork = !!activeGroup.querySelector(
    '[data-filter-dropdown="level-4-filters-item"][data-filter-parent-category]:not([data-filter-parent-category=""])'
  );

  if (isFork) {
    // Fork parent key — read from visible Level 3 items (more reliable than Level 2 checked state)
    const selectedParent = getLevel3ForkParent(categorySlug);

    activeGroup.querySelectorAll('[data-filter-dropdown="level-4-filters-item"]').forEach(function (item) {
      const parentCat = item.getAttribute('data-filter-parent-category');
      item.style.display = (parentCat === selectedParent) ? '' : 'none';
    });

    activeGroup.querySelectorAll('[data-filters-label="lvl-4-label-post"]').forEach(function (lbl) {
      const parentCat = lbl.getAttribute('data-filter-parent-category');
      lbl.style.display = (parentCat === selectedParent) ? '' : 'none';
    });

    let count = 0;
    activeGroup.querySelectorAll('[data-filter-dropdown="level-4-filters-item"]').forEach(function (item) {
      if (item.style.display !== 'none') count++;
    });
    if (countEl) countEl.textContent = '(' + count + ')';

    const matchingLabel = selectedParent
      ? activeGroup.querySelector('[data-filters-label="lvl-4-label-post"][data-filter-parent-category="' + selectedParent + '"]')
      : null;
    if (labelEl && matchingLabel) labelEl.textContent = matchingLabel.textContent.trim();

  } else {
    // Non-fork: show all items
    activeGroup.querySelectorAll('[data-filter-dropdown="level-4-filters-item"]').forEach(function (item) {
      item.style.display = '';
    });

    const wrap = activeGroup.querySelector('[data-filter-dropdown="level-4-filters-wrap"]');
    const count = wrap ? wrap.querySelectorAll('[data-filter-dropdown="level-4-filters-item"]').length : 0;
    if (countEl) countEl.textContent = '(' + count + ')';

    const labelPost = activeGroup.querySelector('[data-filters-label="lvl-4-label-post"]');
    if (labelEl && labelPost) labelEl.textContent = labelPost.textContent.trim();
  }
}

// ─── Level 4: mute unavailable filters (based on visible products) ────────────
function updateLevel4Availability() {
  const availableFilters = new Set();
  document.querySelectorAll('[n4-filters-item]').forEach(function (item) {
    if (item.style.display === 'none') return;
    item.querySelectorAll('[n4-list-field="filter"]').forEach(function (p) {
      availableFilters.add(p.getAttribute('n4-list-value'));
    });
  });

  const level4 = document.querySelector('[data-filters-dropdown="level-4"]');
  if (!level4) return;
  level4.querySelectorAll('[data-filter-dropdown="level-4-filters-item"]').forEach(function (item) {
    if (item.style.display === 'none') return; // fork-hidden — don't touch
    const cb = item.querySelector('input[type="checkbox"]');
    if (!cb) return;
    const available = availableFilters.has(cb.getAttribute('n4-list-value'));
    item.style.opacity = available ? '' : '0.5';
    item.style.pointerEvents = available ? '' : 'none';
  });
}

// ─── Level 4 checkboxes: re-apply filters + show Level 5 ─────────────────────
(function initLevel4() {
  const level4 = document.querySelector('[data-filters-dropdown="level-4"]');
  if (!level4) return;

  level4.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
    cb.addEventListener('change', function () {
      // Cascade reset: Level 4 change clears Level 5
      resetLevel(5);

      applyFilters();
      updateLevel4Availability();

      const categoryInput = document.querySelector('[n4-list-field="category"][type="radio"]:checked');
      if (!categoryInput) return;
      const categorySlug = toSlug(categoryInput.getAttribute('n4-list-value'));

      const anyChecked = level4.querySelectorAll('input[type="checkbox"]:checked').length > 0;
      if (anyChecked) {
        showLevel5(categorySlug);
        updateLevel5Availability();
      }
    });
  });
})();

// ─── Level 5: show ────────────────────────────────────────────────────────────
function showLevel5(categorySlug) {
  const level5 = document.querySelector('[data-filters-dropdown="level-5"]');
  if (!level5) return;

  const activeGroup = level5.querySelector('[data-filter-list-id="' + categorySlug + '"]');
  if (!activeGroup) return;

  // Groups for Carlton, Trailers, Lift Carriers exist in DOM but are empty -- leave hidden
  const hasItems = !!activeGroup.querySelector('[data-filter-dropdown="level-5-filters-item"]');
  if (!hasItems) return;

  level5.style.display = '';

  level5.querySelectorAll('[data-filter-list-id]').forEach(function (group) {
    const match = group.getAttribute('data-filter-list-id') === categorySlug;
    group.style.display = match ? '' : 'none';
  });

  const countEl = document.querySelector('[data-filters-dropdown="level-5-filters-count"]');
  const labelEl = document.querySelector('[data-filters-dropdown="lvl-5-label-get"]');

  // Detect fork: any Level 5 items with non-empty data-filter-parent-category?
  const isFork = !!activeGroup.querySelector(
    '[data-filter-dropdown="level-5-filters-item"][data-filter-parent-category]:not([data-filter-parent-category=""])'
  );

  if (isFork) {
    // Fork parent key -- read from visible Level 4 items
    const selectedParent = getLevel4ForkParent(categorySlug);

    activeGroup.querySelectorAll('[data-filter-dropdown="level-5-filters-item"]').forEach(function (item) {
      const parentCat = item.getAttribute('data-filter-parent-category');
      item.style.display = (parentCat === selectedParent) ? '' : 'none';
    });

    activeGroup.querySelectorAll('[data-filters-label="lvl-5-label-post"]').forEach(function (lbl) {
      const parentCat = lbl.getAttribute('data-filter-parent-category');
      lbl.style.display = (parentCat === selectedParent) ? '' : 'none';
    });

    let count = 0;
    activeGroup.querySelectorAll('[data-filter-dropdown="level-5-filters-item"]').forEach(function (item) {
      if (item.style.display !== 'none') count++;
    });
    if (countEl) countEl.textContent = '(' + count + ')';

    const matchingLabel = selectedParent
      ? activeGroup.querySelector('[data-filters-label="lvl-5-label-post"][data-filter-parent-category="' + selectedParent + '"]')
      : null;
    if (labelEl && matchingLabel) labelEl.textContent = matchingLabel.textContent.trim();

  } else {
    // Non-fork: show all items
    activeGroup.querySelectorAll('[data-filter-dropdown="level-5-filters-item"]').forEach(function (item) {
      item.style.display = '';
    });

    const wrap = activeGroup.querySelector('[data-filter-dropdown="level-5-filters-wrap"]');
    const count = wrap ? wrap.querySelectorAll('[data-filter-dropdown="level-5-filters-item"]').length : 0;
    if (countEl) countEl.textContent = '(' + count + ')';

    const labelPost = activeGroup.querySelector('[data-filters-label="lvl-5-label-post"]');
    if (labelEl && labelPost) labelEl.textContent = labelPost.textContent.trim();
  }
}

// ─── Level 5: mute unavailable filters (based on visible products) ────────────
function updateLevel5Availability() {
  const availableFilters = new Set();
  document.querySelectorAll('[n4-filters-item]').forEach(function (item) {
    if (item.style.display === 'none') return;
    item.querySelectorAll('[n4-list-field="filter"]').forEach(function (p) {
      availableFilters.add(p.getAttribute('n4-list-value'));
    });
  });

  const level5 = document.querySelector('[data-filters-dropdown="level-5"]');
  if (!level5) return;
  level5.querySelectorAll('[data-filter-dropdown="level-5-filters-item"]').forEach(function (item) {
    if (item.style.display === 'none') return; // fork-hidden -- don't touch
    const cb = item.querySelector('input[type="checkbox"]');
    if (!cb) return;
    const available = availableFilters.has(cb.getAttribute('n4-list-value'));
    item.style.opacity = available ? '' : '0.5';
    item.style.pointerEvents = available ? '' : 'none';
  });
}

// ─── Level 5 checkboxes: re-apply filters ────────────────────────────────────
(function initLevel5() {
  const level5 = document.querySelector('[data-filters-dropdown="level-5"]');
  if (!level5) return;

  level5.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
    cb.addEventListener('change', function () {
      applyFilters();
      updateLevel5Availability();
    });
  });
})();

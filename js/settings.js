/* ==========================================================================
   FinTrack — settings.js
   Profile, currency, theme, notifications and data management.
   ========================================================================== */

(() => {
  'use strict';

  const els = {};

  /* -------------------------------------------------------------- helpers */

  function renderAccountStats() {
    const transactions = FTStorage.getTransactions();
    const budgets = FTStorage.getBudgets();
    const totals = FT.computeTotals(transactions);
    const months = new Set(transactions.map((t) => FT.monthKey(t.date))).size;

    els.stats.innerHTML = [
      ['Transactions', FT.formatNumber(transactions.length)],
      ['Budgets', FT.formatNumber(budgets.length)],
      ['Months tracked', FT.formatNumber(months)],
      ['Net balance', FT.formatCurrency(totals.balance)],
      ['Savings rate', `${totals.savingsRate.toFixed(1)}%`]
    ].map(([label, value]) => `
      <div class="stat-list__row"><span>${label}</span><span>${value}</span></div>`).join('');

    const settings = FTStorage.getSettings();
    // Currency label removed from profileMeta as we now show email instead.
  }

  function fillForm() {
    const settings = FTStorage.getSettings();
    els.name.value = settings.name;
    els.currency.innerHTML = Object.entries(FT.CURRENCIES)
      .map(([code, meta]) => `<option value="${code}"${code === settings.currency ? ' selected' : ''}>${meta.symbol} — ${meta.label}</option>`)
      .join('');
    document.getElementById(FT.currentTheme() === 'dark' ? 'themeDark' : 'themeLight').checked = true;
    els.notifications.checked = Boolean(settings.notifications);
    els.notificationsLabel.textContent = settings.notifications ? 'Enabled' : 'Disabled';
    updatePhotoUI(!!settings.avatar);
  }

  function updatePhotoUI(hasAvatar) {
    if (els.removePhotoBtn) {
      els.removePhotoBtn.hidden = !hasAvatar;
    }
    if (els.uploadPhotoBtn) {
      const label = els.uploadPhotoBtn.querySelector('span');
      if (label) label.textContent = hasAvatar ? 'Change photo' : 'Upload photo';
    }
  }

  async function handlePhotoSelect(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    
    try {
      els.uploadPhotoBtn.disabled = true;
      const avatar = await FT.compressImage(file);
      FTStorage.saveSettings({ avatar });
      FT.renderProfile();
      updatePhotoUI(true);
      FT.toast('Profile photo updated successfully.', 'success', { force: true });
    } catch (err) {
      FT.toast(err.message || 'Could not upload that image.', 'error', { force: true });
    } finally {
      els.uploadPhotoBtn.disabled = false;
      els.photoInput.value = '';  // reset so same file can be re-selected
    }
  }

  async function handleRemovePhoto() {
    const confirmed = await FT.confirmAction({
      title: 'Remove profile photo?',
      message: 'Your profile will revert to showing your initials.',
      confirmText: 'Remove',
      danger: false
    });
    if (!confirmed) return;

    // Empty string acts as a removal sentinel (saveSettings merges with stored).
    FTStorage.saveSettings({ avatar: '' });
    FT.renderProfile();
    updatePhotoUI(false);
    FT.toast('Profile photo removed.', 'success', { force: true });
  }

  const download = (filename, text) => {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  function exportBackup() {
    const stamp = new Date().toISOString().slice(0, 10);
    download(`fintrack-backup-${stamp}.json`, JSON.stringify(FTStorage.exportData(), null, 2));
    FT.toast('Backup exported successfully.', 'success', { force: true });
  }

  /* -------------------------------------------------------------- actions */

  function handleSubmit(event) {
    event.preventDefault();
    const name = els.name.value.trim();
    if (!name) {
      els.name.classList.add('is-invalid');
      els.nameError.textContent = 'Profile name cannot be empty.';
      FT.toast('Please enter a profile name.', 'error', { force: true });
      return;
    }
    els.name.classList.remove('is-invalid');
    els.nameError.textContent = '';

    const theme = document.querySelector('input[name="themeChoice"]:checked').value;
    FTStorage.saveSettings({
      name,
      currency: els.currency.value,
      theme,
      notifications: els.notifications.checked
    });
    FT.applyTheme(theme);
    FT.renderProfile();
    renderAccountStats();
    FT.toast('Settings saved successfully.', 'success', { force: true });
  }

  async function handleClearData() {
    const confirmed = await FT.confirmAction({
      title: 'Delete all data?',
      message: 'All transactions and budgets stored in this browser will be permanently deleted. This cannot be undone.',
      confirmText: 'Delete everything'
    });
    if (!confirmed) return;
    FTStorage.clearAllData(true);
    renderAccountStats();
    FT.toast('All data deleted.', 'success', { force: true });
  }

  async function handleSampleData() {
    const confirmed = await FT.confirmAction({
      title: 'Reload sample data?',
      message: 'This replaces your current transactions and budgets with the FinTrack demo dataset.',
      confirmText: 'Reload sample data',
      danger: false
    });
    if (!confirmed) return;
    FTStorage.clearAllData(true);
    FTStorage.seedSampleData(true);
    renderAccountStats();
    FT.toast('Sample data restored.', 'success', { force: true });
  }

  function handleImport(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        FTStorage.importData(JSON.parse(reader.result));
        fillForm();
        FT.applyTheme(FTStorage.getSettings().theme);
        FT.renderProfile();
        renderAccountStats();
        FT.toast('Backup imported successfully.', 'success', { force: true });
      } catch (err) {
        FT.toast(`Import failed: ${err.message}`, 'error', { force: true });
      }
    };
    reader.onerror = () => FT.toast('Could not read that file.', 'error', { force: true });
    reader.readAsText(file);
    event.target.value = '';
  }

  /* --------------------------------------------------------------- wiring */

  function init() {
    Object.assign(els, {
      form: FT.$('#settingsForm'),
      name: FT.$('#profileName'),
      nameError: FT.$('#errProfileName'),
      currency: FT.$('#currencySelect'),
      notifications: FT.$('#notificationsToggle'),
      notificationsLabel: FT.$('#notificationsLabel'),
      stats: FT.$('#accountStats'),
      profileMeta: FT.$('#profileMeta'),
      importFile: FT.$('#importFile'),
      photoInput: FT.$('#photoInput'),
      uploadPhotoBtn: FT.$('#uploadPhotoBtn'),
      removePhotoBtn: FT.$('#removePhotoBtn'),
      openAddCategoryBtn: FT.$('#openAddCategoryBtn'),
      categoryModal: FT.$('#categoryModal'),
      categoryForm: FT.$('#categoryForm'),
      catName: FT.$('#catName'),
      errCatName: FT.$('#errCatName'),
      catCustomColor: FT.$('#catCustomColor'),
      colorSwatches: FT.$('#colorSwatches'),
      expenseCategoryList: FT.$('#expenseCategoryList'),
      incomeCategoryList: FT.$('#incomeCategoryList')
    });

    fillForm();
    renderAccountStats();

    // Photo upload wiring
    if (els.uploadPhotoBtn && els.photoInput) {
      els.uploadPhotoBtn.addEventListener('click', () => els.photoInput.click());
    }
    if (els.photoInput) {
      els.photoInput.addEventListener('change', handlePhotoSelect);
    }
    if (els.removePhotoBtn) {
      els.removePhotoBtn.addEventListener('click', handleRemovePhoto);
    }

    // Keep the remove button state in sync if avatar changes elsewhere
    document.addEventListener('ft:avatarchange', (e) => {
      updatePhotoUI(!!e.detail.hasAvatar);
    });

    els.form.addEventListener('submit', handleSubmit);

    // Live preview for instant-feedback controls
    els.name.addEventListener('input', () => {
      if (els.name.value.trim()) { els.name.classList.remove('is-invalid'); els.nameError.textContent = ''; }
    });
    els.currency.addEventListener('change', () => {
      FTStorage.saveSettings({ currency: els.currency.value });
      renderAccountStats();
      FT.toast(`Currency changed to ${els.currency.value}.`, 'success');
    });
    FT.$$('input[name="themeChoice"]').forEach((radio) =>
      radio.addEventListener('change', (e) => {
        FT.applyTheme(e.target.value);
        FTStorage.saveSettings({ theme: e.target.value });
      }));
    els.notifications.addEventListener('change', () => {
      FTStorage.saveSettings({ notifications: els.notifications.checked });
      els.notificationsLabel.textContent = els.notifications.checked ? 'Enabled' : 'Disabled';
      FT.toast(`Notifications ${els.notifications.checked ? 'enabled' : 'disabled'}.`, 'success', { force: true });
    });

    FT.$('#exportBtn').addEventListener('click', exportBackup);
    FT.$('#importBtn').addEventListener('click', () => els.importFile.click());
    els.importFile.addEventListener('change', handleImport);
    FT.$('#sampleBtn').addEventListener('click', handleSampleData);
    FT.$('#clearBtn').addEventListener('click', handleClearData);

    // Custom categories wiring
    if (els.openAddCategoryBtn) {
      els.openAddCategoryBtn.addEventListener('click', () => {
        els.categoryForm.reset();
        els.catName.classList.remove('is-invalid');
        if (els.errCatName) els.errCatName.textContent = '';
        selectSwatch('#3b82f6');
        FT.openModal(els.categoryModal);
      });
    }

    if (els.categoryForm) {
      els.categoryForm.addEventListener('submit', handleCategorySubmit);
    }

    if (els.catCustomColor) {
      els.catCustomColor.addEventListener('input', (e) => {
        selectSwatch(e.target.value, false);
      });
    }

    if (els.expenseCategoryList) {
      els.expenseCategoryList.addEventListener('click', handleCategoryClick);
    }
    if (els.incomeCategoryList) {
      els.incomeCategoryList.addEventListener('click', handleCategoryClick);
    }

    initSwatches();
    renderCategories();

    // Keep the radio buttons in sync with the topbar theme toggle
    document.addEventListener('ft:themechange', (e) => {
      const target = document.getElementById(e.detail.theme === 'dark' ? 'themeDark' : 'themeLight');
      if (target) target.checked = true;
    });
    document.addEventListener('ft:datachange', () => {
      renderAccountStats();
      renderCategories();
    });
  }

  const SWATCHES = [
    '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4',
    '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b'
  ];

  function initSwatches() {
    if (!els.colorSwatches) return;
    els.colorSwatches.innerHTML = SWATCHES.map(c => `
      <button type="button" class="swatch-btn${c === '#3b82f6' ? ' is-active' : ''}" data-color="${c}" style="background-color: ${c}" aria-label="Color ${c}"></button>
    `).join('');

    els.colorSwatches.addEventListener('click', (e) => {
      const btn = e.target.closest('.swatch-btn');
      if (!btn) return;
      selectSwatch(btn.dataset.color);
    });
  }

  function selectSwatch(color, updateInput = true) {
    if (updateInput && els.catCustomColor) {
      els.catCustomColor.value = color;
    }
    if (els.colorSwatches) {
      els.colorSwatches.querySelectorAll('.swatch-btn').forEach(btn => {
        btn.classList.toggle('is-active', btn.dataset.color.toLowerCase() === color.toLowerCase());
      });
    }
  }

  function renderCategories() {
    if (!els.expenseCategoryList || !els.incomeCategoryList) return;

    const customCats = FTStorage.getCustomCategories();
    const defaultsExpense = FT.EXPENSE_CATEGORIES || ['Food', 'Housing', 'Transport', 'Entertainment', 'Shopping', 'Health', 'Utilities', 'Other'];
    const defaultsIncome = FT.INCOME_CATEGORIES || ['Salary', 'Freelance', 'Investments', 'Gifts', 'Other'];

    const renderList = (defaults, type) => {
      const customForType = customCats.filter(c => c.type === type);
      const defaultBadges = defaults.map(name => {
        const color = FT.categoryColor(name);
        return `
          <span class="category-badge">
            <span class="category-badge__dot" style="background:${color}"></span>
            <span>${FT.escapeHtml(name)}</span>
          </span>`;
      }).join('');

      const customBadges = customForType.map(c => {
        return `
          <span class="category-badge is-custom">
            <span class="category-badge__dot" style="background:${c.color}"></span>
            <span>${FT.escapeHtml(c.name)}</span>
            <button type="button" class="category-badge__del" data-del-cat="${c.id}" data-cat-name="${FT.escapeHtml(c.name)}" aria-label="Delete category ${FT.escapeHtml(c.name)}">
              <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          </span>`;
      }).join('');

      return defaultBadges + customBadges;
    };

    els.expenseCategoryList.innerHTML = renderList(defaultsExpense, 'expense');
    els.incomeCategoryList.innerHTML = renderList(defaultsIncome, 'income');
  }

  function handleCategorySubmit(e) {
    e.preventDefault();
    const name = (els.catName.value || '').trim();
    if (!name) {
      els.catName.classList.add('is-invalid');
      if (els.errCatName) els.errCatName.textContent = 'Please enter a category name.';
      return;
    }

    const type = (els.categoryForm.querySelector('input[name="catType"]:checked') || {}).value || 'expense';
    const color = els.catCustomColor ? els.catCustomColor.value : '#3b82f6';

    const existingNames = FT.getCategories(type).map(n => n.toLowerCase());
    if (existingNames.includes(name.toLowerCase())) {
      els.catName.classList.add('is-invalid');
      if (els.errCatName) els.errCatName.textContent = 'A category with this name already exists.';
      return;
    }

    try {
      FTStorage.addCustomCategory({ name, type, color });
      FT.closeModal(els.categoryModal);
      renderCategories();
      FT.toast(`Added "${name}" to ${type} categories.`, 'success', { force: true });
    } catch (err) {
      els.catName.classList.add('is-invalid');
      if (els.errCatName) els.errCatName.textContent = err.message;
    }
  }

  async function handleCategoryClick(e) {
    const btn = e.target.closest('[data-del-cat]');
    if (!btn) return;
    const id = btn.dataset.delCat;
    const name = btn.dataset.catName || 'this category';

    const confirmed = await FT.confirmAction({
      title: 'Delete category?',
      message: `Are you sure you want to delete "${name}"? Existing transactions will keep this category name, but it will no longer appear in category selectors.`,
      confirmText: 'Delete Category',
      danger: true
    });

    if (!confirmed) return;
    FTStorage.deleteCustomCategory(id);
    renderCategories();
    FT.toast(`Deleted "${name}".`, 'success', { force: true });
  }

  document.addEventListener('DOMContentLoaded', init);
})();

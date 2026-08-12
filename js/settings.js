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
      removePhotoBtn: FT.$('#removePhotoBtn')
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

    // Keep the radio buttons in sync with the topbar theme toggle
    document.addEventListener('ft:themechange', (e) => {
      const target = document.getElementById(e.detail.theme === 'dark' ? 'themeDark' : 'themeLight');
      if (target) target.checked = true;
    });
    document.addEventListener('ft:datachange', renderAccountStats);
  }

  document.addEventListener('DOMContentLoaded', init);
})();

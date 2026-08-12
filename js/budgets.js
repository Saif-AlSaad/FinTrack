/* ==========================================================================
   FinTrack — budgets.js
   Monthly category budgets with live progress from transaction data.
   ========================================================================== */

(() => {
  'use strict';

  const ICONS = {
    edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    del: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
    warn: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z'
  };

  const state = { month: FT.currentMonthKey(), editingId: null };
  const els = {};

  const budgetsForMonth = () => {
    const transactions = FTStorage.getTransactions();
    return FTStorage.getBudgets()
      .filter((b) => b.month === state.month)
      .map((b) => FT.budgetProgress(b, transactions))
      .sort((a, b) => b.percent - a.percent);
  };

  /* ----------------------------------------------------------- rendering */

  function renderOverview(list) {
    const totalBudget = list.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = list.reduce((sum, b) => sum + b.spent, 0);
    const remaining = totalBudget - totalSpent;
    const used = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    const overCount = list.filter((b) => b.status === 'over').length;

    const cards = [
      ['Total Budget', FT.formatCurrency(totalBudget), `${list.length} categor${list.length === 1 ? 'y' : 'ies'}`, 'balance'],
      ['Total Spent', FT.formatCurrency(totalSpent), `${used.toFixed(1)}% of budget used`, 'expense'],
      ['Remaining', FT.formatCurrency(remaining), remaining >= 0 ? 'Available to spend' : 'Over the limit', remaining >= 0 ? 'income' : 'expense'],
      ['Over Budget', String(overCount), overCount ? 'Needs your attention' : 'All categories on track', 'savings']
    ];

    els.overview.innerHTML = cards.map(([label, value, hint, mod]) => `
      <article class="card card--hover stat-card">
        <div class="stat-card__top">
          <span class="stat-card__label">${label}</span>
          <span class="stat-card__icon stat-card__icon--${mod}" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M11 2v20c-5.07-.5-9-4.79-9-10s3.93-9.5 9-10zm2.03 0v8.99H22c-.47-4.74-4.24-8.52-8.97-8.99zm0 11.01V22c4.74-.47 8.5-4.25 8.97-8.99h-8.97z"/></svg>
          </span>
        </div>
        <p class="stat-card__value">${value}</p>
        <p class="stat-card__meta">${hint}</p>
      </article>`).join('');
  }

  function renderAlerts(list) {
    const over = list.filter((b) => b.status === 'over');
    const warning = list.filter((b) => b.status === 'warning');
    const blocks = [];
    if (over.length) {
      blocks.push(`<div class="budget-alert budget-alert--over"><svg viewBox="0 0 24 24"><path d="${ICONS.warn}"/></svg>
        <span><strong>Over budget:</strong> ${over.map((b) => `${b.category} (${b.percent.toFixed(0)}%)`).join(', ')}. Consider reducing spending in these categories.</span></div>`);
    }
    if (warning.length) {
      blocks.push(`<div class="budget-alert budget-alert--warning"><svg viewBox="0 0 24 24"><path d="${ICONS.warn}"/></svg>
        <span><strong>Approaching limit:</strong> ${warning.map((b) => `${b.category} (${b.percent.toFixed(0)}%)`).join(', ')}.</span></div>`);
    }
    els.alerts.innerHTML = blocks.join('');
  }

  function renderGrid(list) {
    if (!list.length) {
      els.grid.innerHTML = '';
      els.empty.innerHTML = FT.emptyState({
        icon: 'M11 2v20c-5.07-.5-9-4.79-9-10s3.93-9.5 9-10zm2.03 0v8.99H22c-.47-4.74-4.24-8.52-8.97-8.99zm0 11.01V22c4.74-.47 8.5-4.25 8.97-8.99h-8.97z',
        title: 'No budgets for this month',
        message: 'Create a category budget to track how much you are allowed to spend.',
        actionLabel: 'Create Budget',
        actionAttrs: 'data-action="add-budget"'
      });
      return;
    }
    els.empty.innerHTML = '';
    els.grid.innerHTML = list.map((b) => {
      const color = FT.categoryColor(b.category);
      const alert = b.status === 'over'
        ? `<div class="budget-alert budget-alert--over"><svg viewBox="0 0 24 24"><path d="${ICONS.warn}"/></svg><span>You exceeded this budget by ${FT.formatCurrency(Math.abs(b.remaining))}.</span></div>`
        : b.status === 'warning'
          ? `<div class="budget-alert budget-alert--warning"><svg viewBox="0 0 24 24"><path d="${ICONS.warn}"/></svg><span>Only ${FT.formatCurrency(b.remaining)} left in this budget.</span></div>`
          : '';
      return `
      <article class="card card--hover budget-card">
        <div class="budget-card__head">
          <span class="cat-icon-wrap" style="background:${color}1f;color:${color}" aria-hidden="true">${FT.categoryIcon(b.category)}</span>
          <div>
            <p class="budget-card__title">${b.category}</p>
            <p class="budget-card__month">${FT.monthLabel(b.month, false)}${b.note ? ` · ${FT.escapeHtml(b.note)}` : ''}</p>
          </div>
          <div class="budget-card__actions">
            <button class="btn-icon" type="button" data-edit-budget="${b.id}" aria-label="Edit ${b.category} budget"><svg viewBox="0 0 24 24"><path d="${ICONS.edit}"/></svg></button>
            <button class="btn-icon btn-icon--danger" type="button" data-delete-budget="${b.id}" aria-label="Delete ${b.category} budget"><svg viewBox="0 0 24 24"><path d="${ICONS.del}"/></svg></button>
          </div>
        </div>

        <div class="budget-card__figures">
          <div class="figure"><span class="figure__label">Budget</span><span class="figure__value">${FT.formatCurrency(b.amount, { decimals: 0 })}</span></div>
          <div class="figure"><span class="figure__label">Spent</span><span class="figure__value">${FT.formatCurrency(b.spent, { decimals: 0 })}</span></div>
          <div class="figure ${b.remaining < 0 ? 'figure--over' : ''}"><span class="figure__label">${b.remaining < 0 ? 'Over' : 'Left'}</span><span class="figure__value">${FT.formatCurrency(Math.abs(b.remaining), { decimals: 0 })}</span></div>
        </div>

        <div class="budget-card__progress">
          <div class="progress" role="progressbar" aria-valuenow="${b.percent.toFixed(0)}" aria-valuemin="0" aria-valuemax="100" aria-label="${b.category} budget usage">
            <div class="progress__bar progress__bar--${b.status}" style="width:${b.clamped}%"></div>
          </div>
          <div class="budget-card__percent">
            <span>${b.percent.toFixed(0)}% used</span>
            <span class="badge badge--${b.status === 'over' ? 'expense' : b.status === 'warning' ? 'warning' : 'income'}">${b.statusLabel}</span>
          </div>
        </div>
        ${alert}
      </article>`;
    }).join('');
  }

  function render() {
    const list = budgetsForMonth();
    renderOverview(list);
    renderAlerts(list);
    renderGrid(list);
  }

  /* ---------------------------------------------------------- form logic */

  const setError = (inputId, errorId, message) => {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);
    input.classList.toggle('is-invalid', Boolean(message));
    error.textContent = message || '';
    return !message;
  };

  function openForm(budget = null) {
    state.editingId = budget ? budget.id : null;
    els.form.reset();
    ['errBudgetCategory', 'errBudgetAmount', 'errBudgetMonth'].forEach((id) => { document.getElementById(id).textContent = ''; });
    ['budgetCategory', 'budgetAmount', 'budgetMonthField'].forEach((id) => document.getElementById(id).classList.remove('is-invalid'));

    els.category.innerHTML = `<option value="">Select category</option>${FT.BUDGET_CATEGORIES
      .map((c) => `<option value="${c}"${budget && budget.category === c ? ' selected' : ''}>${c}</option>`).join('')}`;
    els.amount.value = budget ? budget.amount : '';
    els.monthField.value = budget ? budget.month : state.month;
    els.note.value = budget ? budget.note : '';
    els.modalTitle.textContent = budget ? 'Edit Budget' : 'Create Budget';
    els.submitBtn.textContent = budget ? 'Update Budget' : 'Save Budget';
    FT.openModal(els.modal);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const category = els.category.value;
    const amountRaw = els.amount.value.trim();
    const amount = Number(amountRaw);
    const month = els.monthField.value;

    let valid = true;
    valid = setError('budgetCategory', 'errBudgetCategory', category ? '' : 'Please select a category.') && valid;
    if (!amountRaw) valid = setError('budgetAmount', 'errBudgetAmount', 'Budget amount is required.') && valid;
    else if (Number.isNaN(amount)) valid = setError('budgetAmount', 'errBudgetAmount', 'Amount must be a number.') && valid;
    else if (amount <= 0) valid = setError('budgetAmount', 'errBudgetAmount', 'Amount must be greater than zero.') && valid;
    else valid = setError('budgetAmount', 'errBudgetAmount', '') && valid;
    valid = setError('budgetMonthField', 'errBudgetMonth', month ? '' : 'Month is required.') && valid;

    if (valid && FTStorage.budgetExists(category, month, state.editingId)) {
      valid = setError('budgetCategory', 'errBudgetCategory', `A ${category} budget already exists for this month.`);
    }
    if (!valid) {
      FT.toast('Please fix the highlighted fields.', 'error', { force: true });
      return;
    }

    const payload = { category, amount, month, note: els.note.value.trim() };
    if (state.editingId) {
      FTStorage.updateBudget(state.editingId, payload);
      FT.toast('Budget updated successfully.', 'success');
    } else {
      FTStorage.addBudget(payload);
      FT.toast('Budget created successfully.', 'success');
    }

    state.month = month;
    els.monthInput.value = month;
    state.editingId = null;
    FT.closeModal(els.modal);
    render();

    // Immediate feedback if the new limit is already exceeded.
    const created = FTStorage.getBudgets().find((b) => b.category === category && b.month === month);
    if (created) {
      const progress = FT.budgetProgress(created);
      if (progress.status === 'over') FT.toast(`Budget exceeded: ${category} is already ${progress.percent.toFixed(0)}% used.`, 'error', { force: true });
      else if (progress.status === 'warning') FT.toast(`${category} budget is ${progress.percent.toFixed(0)}% used.`, 'warning', { force: true });
    }
  }

  async function handleDelete(id) {
    const budget = FTStorage.getBudgets().find((b) => b.id === id);
    if (!budget) return;
    const confirmed = await FT.confirmAction({
      title: 'Delete budget?',
      message: `Are you sure you want to delete the ${budget.category} budget for ${FT.monthLabel(budget.month, false)}?`,
      confirmText: 'Delete'
    });
    if (!confirmed) return;
    FTStorage.deleteBudget(id);
    FT.toast('Budget deleted successfully.', 'success');
    render();
  }

  /* -------------------------------------------------------------- wiring */

  function init() {
    Object.assign(els, {
      overview: FT.$('#budgetOverview'),
      alerts: FT.$('#budgetAlerts'),
      grid: FT.$('#budgetGrid'),
      empty: FT.$('#budgetEmpty'),
      monthInput: FT.$('#budgetMonth'),
      modal: FT.$('#budgetModal'),
      modalTitle: FT.$('#budgetModalTitle'),
      form: FT.$('#budgetForm'),
      category: FT.$('#budgetCategory'),
      amount: FT.$('#budgetAmount'),
      monthField: FT.$('#budgetMonthField'),
      note: FT.$('#budgetNote'),
      submitBtn: FT.$('#budgetSubmitBtn')
    });

    els.monthInput.value = state.month;
    render();

    els.monthInput.addEventListener('change', (e) => {
      state.month = e.target.value || FT.currentMonthKey();
      els.monthInput.value = state.month;
      render();
    });
    FT.$('#thisMonthBtn').addEventListener('click', () => {
      state.month = FT.currentMonthKey();
      els.monthInput.value = state.month;
      render();
    });

    els.form.addEventListener('submit', handleSubmit);

    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-action="add-budget"]')) { openForm(); return; }
      const editBtn = event.target.closest('[data-edit-budget]');
      if (editBtn) {
        openForm(FTStorage.getBudgets().find((b) => b.id === editBtn.dataset.editBudget));
        return;
      }
      const delBtn = event.target.closest('[data-delete-budget]');
      if (delBtn) handleDelete(delBtn.dataset.deleteBudget);
    });

    document.addEventListener('ft:datachange', (e) => {
      if (e.detail && e.detail.type !== 'budgets') render();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();

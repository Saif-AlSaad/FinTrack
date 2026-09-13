/* ==========================================================================
   FinTrack — transactions.js
   Full CRUD, search, filter and sort for transactions.
   ========================================================================== */

(() => {
  'use strict';

  const ACTION_ICONS = {
    view: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zm0-7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
    edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    del: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z'
  };

  const state = {
    search: '',
    type: 'all',
    category: 'all',
    month: '',
    sort: 'newest',
    page: 1,
    pageSize: 25,
    editingId: null
  };

  const els = {};

  /* ---------------------------------------------------------- data logic */

  /** Apply search + filters + sorting to the stored transactions. */
  function getVisibleTransactions() {
    const term = state.search.trim().toLowerCase();
    let list = FTStorage.getTransactions();

    if (term) {
      list = list.filter((tx) =>
        tx.title.toLowerCase().includes(term) ||
        tx.description.toLowerCase().includes(term) ||
        tx.category.toLowerCase().includes(term));
    }
    if (state.type !== 'all') list = list.filter((tx) => tx.type === state.type);
    if (state.category !== 'all') list = list.filter((tx) => tx.category === state.category);
    if (state.month) list = list.filter((tx) => FT.monthKey(tx.date) === state.month);

    const sorters = {
      newest: (a, b) => (b.date === a.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)),
      oldest: (a, b) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date)),
      highest: (a, b) => b.amount - a.amount,
      lowest: (a, b) => a.amount - b.amount,
      title: (a, b) => a.title.localeCompare(b.title)
    };
    return list.sort(sorters[state.sort] || sorters.newest);
  }

  /* ------------------------------------------------------------ rendering */

  function renderTotals(list) {
    const { income, expenses, balance, savingsRate } = FT.computeTotals(list);
    els.totals.innerHTML = [
      ['Transactions', String(list.length), ''],
      ['Income', FT.formatCurrency(income), 'amount--income'],
      ['Expenses', FT.formatCurrency(expenses), 'amount--expense'],
      ['Net Balance', FT.formatCurrency(balance), balance >= 0 ? 'amount--income' : 'amount--expense']
    ].map(([label, value, cls], i) => `
      <div class="summary-strip__item">
        <p class="summary-strip__label">${label}</p>
        <p class="summary-strip__value ${cls}">${value}</p>
        ${i === 3 ? `<p class="small muted">Savings rate ${savingsRate.toFixed(1)}%</p>` : ''}
      </div>`).join('');
  }

  function renderPills() {
    const pills = [];
    if (state.search) pills.push(['search', `“${state.search}”`]);
    if (state.type !== 'all') pills.push(['type', state.type === 'income' ? 'Income' : 'Expense']);
    if (state.category !== 'all') pills.push(['category', state.category]);
    if (state.month) pills.push(['month', FT.monthLabel(state.month, false)]);
    els.pills.innerHTML = pills.map(([key, label]) => `
      <span class="pill">${FT.escapeHtml(label)}
        <button type="button" data-clear-filter="${key}" aria-label="Remove ${FT.escapeHtml(label)} filter">&times;</button>
      </span>`).join('');
  }

  function renderPagination(totalItems) {
    if (!els.pagination) return;
    const totalPages = Math.ceil(totalItems / state.pageSize) || 1;
    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;

    if (totalItems <= 0) {
      els.pagination.hidden = true;
      return;
    }
    els.pagination.hidden = false;

    const start = (state.page - 1) * state.pageSize + 1;
    const end = Math.min(state.page * state.pageSize, totalItems);
    els.paginationInfo.textContent = `Showing ${start}–${end} of ${totalItems} transaction${totalItems === 1 ? '' : 's'}`;

    els.prevPageBtn.disabled = state.page <= 1;
    els.nextPageBtn.disabled = state.page >= totalPages;

    let pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (state.page <= 3) {
        pages = [1, 2, 3, 4, totalPages];
      } else if (state.page >= totalPages - 2) {
        pages = [1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
      } else {
        pages = [1, state.page - 1, state.page, state.page + 1, totalPages];
      }
    }

    els.pageNumbers.innerHTML = pages.map((p, idx) => {
      const prev = pages[idx - 1];
      const ellipsis = prev && p - prev > 1 ? '<span class="pagination-ellipsis" aria-hidden="true">…</span>' : '';
      return `${ellipsis}<button type="button" class="btn btn--sm page-btn ${p === state.page ? 'is-active' : 'btn--ghost'}" data-page-num="${p}" aria-label="Page ${p}" ${p === state.page ? 'aria-current="page"' : ''}>${p}</button>`;
    }).join('');
  }

  function renderTable() {
    const list = getVisibleTransactions();
    const total = FTStorage.getTransactions().length;

    renderTotals(list);
    renderPills();
    renderPagination(list.length);
    els.count.textContent = list.length === total
      ? `Showing all ${total} transaction${total === 1 ? '' : 's'}`
      : `Showing ${list.length} of ${total} transactions`;

    if (!list.length) {
      els.tbody.innerHTML = '';
      els.table.hidden = true;
      if (els.pagination) els.pagination.hidden = true;
      els.empty.innerHTML = total === 0
        ? FT.emptyState({
          title: 'No transactions yet',
          message: 'Start tracking your finances by adding your first transaction.',
          actionLabel: 'Add Transaction',
          actionAttrs: 'data-action="add-transaction"'
        })
        : FT.emptyState({
          icon: 'M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
          title: 'No matching transactions',
          message: 'Try a different keyword or reset the filters to see everything again.',
          actionLabel: 'Reset filters',
          actionAttrs: 'data-reset-filters'
        });
      return;
    }

    els.table.hidden = false;
    els.empty.innerHTML = '';
    const startIndex = (state.page - 1) * state.pageSize;
    const pageItems = list.slice(startIndex, startIndex + state.pageSize);
    els.tbody.innerHTML = pageItems.map((tx) => {
      const color = FT.categoryColor(tx.category);
      return `
      <tr data-id="${tx.id}">
        <td data-label="Transaction">
          <div class="tx-cell">
            <span class="cat-icon-wrap" style="background:${color}1f;color:${color}" aria-hidden="true">${FT.categoryIcon(tx.category)}</span>
            <div>
              <p class="tx-cell__title">${FT.escapeHtml(tx.title)}</p>
              ${tx.description ? `<p class="tx-cell__desc">${FT.escapeHtml(tx.description)}</p>` : ''}
            </div>
          </div>
        </td>
        <td data-label="Category"><span class="badge">${FT.escapeHtml(tx.category)}</span></td>
        <td data-label="Date">${FT.formatDate(tx.date)}</td>
        <td data-label="Type"><span class="badge badge--${tx.type}">${tx.type === 'income' ? 'Income' : 'Expense'}</span></td>
        <td data-label="Amount" class="txt-right amount amount--${tx.type}">${tx.type === 'income' ? '+' : '−'}${FT.formatCurrency(tx.amount)}</td>
        <td data-label="Actions" class="txt-right">
          <div class="table-actions">
            <button class="btn-icon" type="button" data-view="${tx.id}" aria-label="View ${FT.escapeHtml(tx.title)}"><svg viewBox="0 0 24 24"><path d="${ACTION_ICONS.view}"/></svg></button>
            <button class="btn-icon" type="button" data-edit="${tx.id}" aria-label="Edit ${FT.escapeHtml(tx.title)}"><svg viewBox="0 0 24 24"><path d="${ACTION_ICONS.edit}"/></svg></button>
            <button class="btn-icon btn-icon--danger" type="button" data-delete="${tx.id}" aria-label="Delete ${FT.escapeHtml(tx.title)}"><svg viewBox="0 0 24 24"><path d="${ACTION_ICONS.del}"/></svg></button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  /* ------------------------------------------------------------ form logic */

  const setError = (inputId, errorId, message) => {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);
    if (input) input.classList.toggle('is-invalid', Boolean(message));
    if (error) error.textContent = message || '';
    return !message;
  };

  function clearErrors() {
    ['errTitle', 'errAmount', 'errCategory', 'errDate', 'errType'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = '';
    });
    ['txTitle', 'txAmount', 'txCategory', 'txDate'].forEach((id) =>
      document.getElementById(id).classList.remove('is-invalid'));
  }

  /** Returns a valid transaction object or null when validation fails. */
  function validateForm() {
    const title = els.title.value.trim();
    const amountRaw = els.amount.value.trim();
    const amount = Number(amountRaw);
    const category = els.category.value;
    const date = els.date.value;
    const typeInput = document.querySelector('input[name="txType"]:checked');

    let valid = true;
    valid = setError('txTitle', 'errTitle', title ? '' : 'Title is required.') && valid;
    if (!amountRaw) valid = setError('txAmount', 'errAmount', 'Amount is required.') && valid;
    else if (Number.isNaN(amount)) valid = setError('txAmount', 'errAmount', 'Amount must be a number.') && valid;
    else if (amount <= 0) valid = setError('txAmount', 'errAmount', 'Amount must be greater than zero.') && valid;
    else valid = setError('txAmount', 'errAmount', '') && valid;
    valid = setError('txCategory', 'errCategory', category ? '' : 'Please select a category.') && valid;
    valid = setError('txDate', 'errDate', date ? '' : 'Date is required.') && valid;
    if (!typeInput) {
      document.getElementById('errType').textContent = 'Please choose a transaction type.';
      valid = false;
    }
    if (!valid) return null;
    return {
      title,
      amount,
      category,
      date,
      type: typeInput.value,
      description: els.description.value.trim()
    };
  }

  function openForm(transaction = null) {
    state.editingId = transaction ? transaction.id : null;
    clearErrors();
    els.form.reset();

    const type = transaction ? transaction.type : 'expense';
    document.getElementById(type === 'income' ? 'typeIncome' : 'typeExpense').checked = true;
    FT.fillCategoryOptions(els.category, type, transaction ? transaction.category : '');

    els.modalTitle.textContent = transaction ? 'Edit Transaction' : 'Add Transaction';
    els.submitBtn.textContent = transaction ? 'Update Transaction' : 'Save Transaction';
    els.title.value = transaction ? transaction.title : '';
    els.amount.value = transaction ? transaction.amount : '';
    els.date.value = transaction ? transaction.date : FT.todayISO();
    els.description.value = transaction ? transaction.description : '';

    FT.openModal(els.modal);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const data = validateForm();
    if (!data) {
      FT.toast('Please fix the highlighted fields.', 'error', { force: true });
      return;
    }
    if (state.editingId) {
      FTStorage.updateTransaction(state.editingId, data);
      FT.toast('Transaction updated successfully.', 'success');
    } else {
      FTStorage.addTransaction(data);
      FT.toast('Transaction added successfully.', 'success');
    }
    checkBudgetAlert(data);
    FT.closeModal(els.modal);
    state.editingId = null;
    renderTable();
  }

  /** Warn when a new expense pushes a budget over/near its limit. */
  function checkBudgetAlert(data) {
    if (data.type !== 'expense') return;
    const budget = FTStorage.getBudgets()
      .find((b) => b.category === data.category && b.month === FT.monthKey(data.date));
    if (!budget) return;
    const progress = FT.budgetProgress(budget);
    if (progress.status === 'over') {
      FT.toast(`Budget exceeded: ${budget.category} is ${progress.percent.toFixed(0)}% used.`, 'error', { force: true });
    } else if (progress.status === 'warning') {
      FT.toast(`Heads up: ${budget.category} budget is ${progress.percent.toFixed(0)}% used.`, 'warning', { force: true });
    }
  }

  async function handleDelete(id) {
    const tx = FTStorage.getTransaction(id);
    if (!tx) return;
    const confirmed = await FT.confirmAction({
      title: 'Delete transaction?',
      message: `Are you sure you want to delete this transaction? “${tx.title}” (${FT.formatCurrency(tx.amount)}) will be permanently removed.`,
      confirmText: 'Delete'
    });
    if (!confirmed) return;
    FTStorage.deleteTransaction(id);
    FT.toast('Transaction deleted successfully.', 'success');
    renderTable();
  }

  function openView(id) {
    const tx = FTStorage.getTransaction(id);
    if (!tx) return;
    els.viewBody.innerHTML = [
      ['Title', FT.escapeHtml(tx.title)],
      ['Amount', `<span class="amount amount--${tx.type}">${tx.type === 'income' ? '+' : '−'}${FT.formatCurrency(tx.amount)}</span>`],
      ['Type', `<span class="badge badge--${tx.type}">${tx.type === 'income' ? 'Income' : 'Expense'}</span>`],
      ['Category', FT.escapeHtml(tx.category)],
      ['Date', FT.formatDate(tx.date, 'long')],
      ['Description', tx.description ? FT.escapeHtml(tx.description) : '—']
    ].map(([label, value]) => `
      <div class="detail-row"><dt>${label}</dt><dd>${value}</dd></div>`).join('');
    els.viewEdit.dataset.id = tx.id;
    FT.openModal(els.viewModal);
  }

  /* ------------------------------------------------------------- wiring */

  function resetFilters() {
    state.search = '';
    state.type = 'all';
    state.category = 'all';
    state.month = '';
    state.sort = 'newest';
    state.page = 1;
    els.search.value = '';
    els.typeFilter.value = 'all';
    els.categoryFilter.value = 'all';
    els.monthFilter.value = '';
    els.sortSelect.value = 'newest';
    renderTable();
  }

  function buildCategoryFilter() {
    const all = [...new Set([...FT.INCOME_CATEGORIES, ...FT.EXPENSE_CATEGORIES])].sort();
    els.categoryFilter.innerHTML = `<option value="all">All categories</option>${all
      .map((c) => `<option value="${c}">${c}</option>`).join('')}`;
  }

  function init() {
    Object.assign(els, {
      totals: FT.$('#filterTotals'),
      pills: FT.$('#activePills'),
      count: FT.$('#resultCount'),
      table: FT.$('#txTable'),
      tbody: FT.$('#txTableBody'),
      empty: FT.$('#txEmpty'),
      pagination: FT.$('#txPagination'),
      paginationInfo: FT.$('#paginationInfo'),
      pageSizeSelect: FT.$('#pageSizeSelect'),
      prevPageBtn: FT.$('#prevPageBtn'),
      nextPageBtn: FT.$('#nextPageBtn'),
      pageNumbers: FT.$('#pageNumbers'),
      search: FT.$('#searchInput'),
      typeFilter: FT.$('#typeFilter'),
      categoryFilter: FT.$('#categoryFilter'),
      monthFilter: FT.$('#monthFilter'),
      sortSelect: FT.$('#sortSelect'),
      modal: FT.$('#txModal'),
      modalTitle: FT.$('#txModalTitle'),
      form: FT.$('#txForm'),
      title: FT.$('#txTitle'),
      amount: FT.$('#txAmount'),
      category: FT.$('#txCategory'),
      date: FT.$('#txDate'),
      description: FT.$('#txDescription'),
      submitBtn: FT.$('#txSubmitBtn'),
      viewModal: FT.$('#txViewModal'),
      viewBody: FT.$('#txViewBody'),
      viewEdit: FT.$('#txViewEdit')
    });

    buildCategoryFilter();
    FT.fillCategoryOptions(els.category, 'expense');

    // Parse URL parameters for drill-downs
    const params = new URLSearchParams(window.location.search);
    if (params.get('category')) {
      state.category = params.get('category');
      els.categoryFilter.value = state.category;
    }
    if (params.get('month')) {
      state.month = params.get('month');
      els.monthFilter.value = state.month;
    }
    if (params.get('type')) {
      state.type = params.get('type');
      els.typeFilter.value = state.type;
    }
    if (params.get('search')) {
      state.search = params.get('search');
      els.search.value = state.search;
    }

    renderTable();

    // Filters
    let searchTimer;
    els.search.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      const value = e.target.value;
      searchTimer = setTimeout(() => { state.search = value; state.page = 1; renderTable(); }, 180);
    });
    els.typeFilter.addEventListener('change', (e) => { state.type = e.target.value; state.page = 1; renderTable(); });
    els.categoryFilter.addEventListener('change', (e) => { state.category = e.target.value; state.page = 1; renderTable(); });
    els.monthFilter.addEventListener('change', (e) => { state.month = e.target.value; state.page = 1; renderTable(); });
    els.sortSelect.addEventListener('change', (e) => { state.sort = e.target.value; state.page = 1; renderTable(); });
    FT.$('#resetFilters').addEventListener('click', resetFilters);

    // Pagination events
    if (els.pageSizeSelect) {
      els.pageSizeSelect.addEventListener('change', (e) => {
        state.pageSize = Number(e.target.value) || 25;
        state.page = 1;
        renderTable();
      });
    }
    if (els.prevPageBtn) {
      els.prevPageBtn.addEventListener('click', () => {
        if (state.page > 1) {
          state.page -= 1;
          renderTable();
          els.table.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }
    if (els.nextPageBtn) {
      els.nextPageBtn.addEventListener('click', () => {
        state.page += 1;
        renderTable();
        els.table.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
    if (els.pageNumbers) {
      els.pageNumbers.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-page-num]');
        if (btn) {
          state.page = Number(btn.dataset.pageNum);
          renderTable();
          els.table.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }

    // Category options follow the selected type inside the form
    FT.$$('input[name="txType"]').forEach((radio) =>
      radio.addEventListener('change', (e) => FT.fillCategoryOptions(els.category, e.target.value)));

    els.form.addEventListener('submit', handleSubmit);
    els.viewEdit.addEventListener('click', () => {
      const tx = FTStorage.getTransaction(els.viewEdit.dataset.id);
      FT.closeModal(els.viewModal);
      setTimeout(() => openForm(tx), 200);
    });

    // Delegated actions
    document.addEventListener('click', (event) => {
      const addBtn = event.target.closest('[data-action="add-transaction"]');
      if (addBtn) { event.preventDefault(); openForm(); return; }

      const clearPill = event.target.closest('[data-clear-filter]');
      if (clearPill) {
        const key = clearPill.dataset.clearFilter;
        if (key === 'search') { state.search = ''; els.search.value = ''; }
        if (key === 'type') { state.type = 'all'; els.typeFilter.value = 'all'; }
        if (key === 'category') { state.category = 'all'; els.categoryFilter.value = 'all'; }
        if (key === 'month') { state.month = ''; els.monthFilter.value = ''; }
        state.page = 1;
        renderTable();
        return;
      }
      if (event.target.closest('[data-reset-filters]')) { resetFilters(); return; }

      const viewBtn = event.target.closest('[data-view]');
      if (viewBtn) { openView(viewBtn.dataset.view); return; }
      const editBtn = event.target.closest('[data-edit]');
      if (editBtn) { openForm(FTStorage.getTransaction(editBtn.dataset.edit)); return; }
      const delBtn = event.target.closest('[data-delete]');
      if (delBtn) handleDelete(delBtn.dataset.delete);
    });

    // Deep link: transactions.html?action=new opens the form immediately
    if (params.get('action') === 'new') {
      openForm();
      window.history.replaceState({}, '', 'transactions.html');
    }

    document.addEventListener('ft:datachange', (e) => {
      if (e.detail && ['import', 'clear', 'seed'].includes(e.detail.type)) renderTable();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();

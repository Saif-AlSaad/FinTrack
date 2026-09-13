/* ==========================================================================
   FinTrack — budgets.js
   Monthly category budgets and Savings Goals with progress tracking.
   ========================================================================== */

(() => {
  'use strict';

  const ICONS = {
    edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    del: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
    warn: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
    check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    plus: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z'
  };

  const state = {
    activeTab: 'budgets',
    month: FT.currentMonthKey(),
    editingBudgetId: null,
    editingGoalId: null
  };

  const els = {};

  const budgetsForMonth = () => {
    const transactions = FTStorage.getTransactions();
    return FTStorage.getBudgets()
      .filter((b) => b.month === state.month)
      .map((b) => FT.budgetProgress(b, transactions))
      .sort((a, b) => b.percent - a.percent);
  };

  /* ------------------------------------------------------------- tab logic */

  function switchTab(tab = 'budgets') {
    state.activeTab = tab;
    const isBudgets = tab === 'budgets';

    els.tabBudgetsBtn.classList.toggle('is-active', isBudgets);
    els.tabBudgetsBtn.setAttribute('aria-selected', String(isBudgets));
    els.tabGoalsBtn.classList.toggle('is-active', !isBudgets);
    els.tabGoalsBtn.setAttribute('aria-selected', String(!isBudgets));

    els.budgetsView.hidden = !isBudgets;
    els.goalsView.hidden = isBudgets;

    if (els.headerActionText) {
      els.headerActionText.textContent = isBudgets ? 'New Budget' : 'New Goal';
    }

    if (isBudgets) renderBudgets();
    else renderGoals();
  }

  /* ----------------------------------------------------- budgets rendering */

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
      <article class="card card--hover budget-card" style="--cat-accent: ${color};">
        <div class="budget-card__head">
          <span class="cat-icon-wrap" style="background:${color}1f;color:${color}" aria-hidden="true">${FT.categoryIcon(b.category)}</span>
          <div class="budget-card__info">
            <h3 class="budget-card__title">${b.category}</h3>
            <p class="budget-card__month">${FT.monthLabel(b.month, false)}${b.note ? ` · ${FT.escapeHtml(b.note)}` : ''}</p>
          </div>
          <div class="budget-card__actions">
            <button class="btn-icon" type="button" data-edit-budget="${b.id}" aria-label="Edit ${b.category} budget"><svg viewBox="0 0 24 24"><path d="${ICONS.edit}"/></svg></button>
            <button class="btn-icon btn-icon--danger" type="button" data-delete-budget="${b.id}" aria-label="Delete ${b.category} budget"><svg viewBox="0 0 24 24"><path d="${ICONS.del}"/></svg></button>
          </div>
        </div>

        <div class="budget-card__stats">
          <div class="budget-stat">
            <span class="budget-stat__label">Spent</span>
            <span class="budget-stat__spent budget-stat__spent--${b.status}">${FT.formatCurrency(b.spent)}</span>
          </div>
          <div class="budget-stat budget-stat--right">
            <span class="budget-stat__label">Budget Limit</span>
            <span class="budget-stat__limit">${FT.formatCurrency(b.amount)}</span>
          </div>
        </div>

        <div class="budget-card__bar-wrap">
          <div class="progress" role="progressbar" aria-valuenow="${b.percent.toFixed(0)}" aria-valuemin="0" aria-valuemax="100" aria-label="${b.category} budget progress">
            <div class="progress__bar progress__bar--${b.status}" style="width:${b.clamped}%"></div>
          </div>
        </div>

        <div class="budget-card__footer">
          <span class="status-pill status-pill--${b.status}">${b.statusLabel}</span>
          <div class="budget-card__meta-right">
            <span class="budget-pct">${b.percent.toFixed(0)}% used</span>
            <span class="budget-sep">·</span>
            <span class="budget-rem-amt ${b.remaining < 0 ? 'budget-rem-amt--over' : ''}">
              ${b.remaining >= 0 ? `${FT.formatCurrency(b.remaining)} left` : `${FT.formatCurrency(Math.abs(b.remaining))} over`}
            </span>
          </div>
        </div>
        ${alert}
      </article>`;
    }).join('');
  }

  function renderBudgets() {
    const list = budgetsForMonth();
    renderOverview(list);
    renderAlerts(list);
    renderGrid(list);
  }

  /* ------------------------------------------------------- goals rendering */

  function renderGoals() {
    const rawGoals = FTStorage.getGoals();
    const goals = rawGoals.map(FT.goalProgress);

    // Overview KPIs
    const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
    const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
    const completedCount = goals.filter(g => g.isCompleted).length;

    els.goalsOverview.innerHTML = [
      ['Total Target', FT.formatCurrency(totalTarget), `${goals.length} target goal${goals.length === 1 ? '' : 's'}`, 'balance'],
      ['Total Saved', FT.formatCurrency(totalSaved), `${overallProgress.toFixed(1)}% of total targets achieved`, 'income'],
      ['Remaining to Save', FT.formatCurrency(Math.max(0, totalTarget - totalSaved)), 'Required across all goals', 'expense'],
      ['Completed Goals', `${completedCount} / ${goals.length}`, completedCount === goals.length && goals.length > 0 ? 'All milestones achieved! 🎉' : `${goals.length - completedCount} in progress`, 'savings']
    ].map(([label, value, hint, mod]) => `
      <article class="card card--hover stat-card">
        <div class="stat-card__top">
          <span class="stat-card__label">${label}</span>
          <span class="stat-card__icon stat-card__icon--${mod}" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
          </span>
        </div>
        <p class="stat-card__value">${value}</p>
        <p class="stat-card__meta">${hint}</p>
      </article>`).join('');

    if (!goals.length) {
      els.goalsGrid.innerHTML = '';
      els.goalsEmpty.innerHTML = FT.emptyState({
        icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z',
        title: 'No savings goals yet',
        message: 'Create dedicated target buckets for vacations, emergency funds, or big purchases.',
        actionLabel: 'Create New Goal',
        actionAttrs: 'data-action="add-goal"'
      });
      return;
    }

    els.goalsEmpty.innerHTML = '';
    els.goalsGrid.innerHTML = goals.map((g) => {
      const daysText = g.isCompleted
        ? '<span class="badge badge--completed">Goal Reached! 🎉</span>'
        : g.daysLeft !== null
          ? (g.daysLeft > 0 ? `<span class="badge badge--brand">${g.daysLeft} days left</span>` : '<span class="badge badge--expense">Target date passed</span>')
          : '';

      return `
      <article class="card card--hover goal-card">
        <div class="goal-card__top">
          <div>
            <p class="goal-card__title">${FT.escapeHtml(g.title)}</p>
            <div class="goal-card__meta">
              <span class="badge">${FT.escapeHtml(g.category)}</span>
              ${daysText}
            </div>
          </div>
          <div class="budget-card__actions">
            <button class="btn-icon" type="button" data-edit-goal="${g.id}" aria-label="Edit ${FT.escapeHtml(g.title)}"><svg viewBox="0 0 24 24"><path d="${ICONS.edit}"/></svg></button>
            <button class="btn-icon btn-icon--danger" type="button" data-delete-goal="${g.id}" aria-label="Delete ${FT.escapeHtml(g.title)}"><svg viewBox="0 0 24 24"><path d="${ICONS.del}"/></svg></button>
          </div>
        </div>

        <div class="goal-card__amounts">
          <div>
            <p class="small muted">Saved so far</p>
            <p class="goal-card__saved" style="color:${g.color}">${FT.formatCurrency(g.currentAmount)}</p>
          </div>
          <div class="txt-right">
            <p class="small muted">Target</p>
            <p class="goal-card__target">${FT.formatCurrency(g.targetAmount)}</p>
          </div>
        </div>

        <div>
          <div class="progress" role="progressbar" aria-valuenow="${g.percent.toFixed(0)}" aria-valuemin="0" aria-valuemax="100" aria-label="${g.title} progress">
            <div class="progress__bar" style="width:${g.clamped}%; background:${g.color}"></div>
          </div>
          <div class="row row--between mt-2" style="font-size: .8rem; color: var(--text-muted);">
            <span>${g.percent.toFixed(0)}% achieved</span>
            <span>${g.remaining > 0 ? `${FT.formatCurrency(g.remaining)} to go` : 'Complete'}</span>
          </div>
        </div>

        ${g.note ? `<p class="small muted" style="margin-top:-.3rem;">${FT.escapeHtml(g.note)}</p>` : ''}

        <div class="goal-card__footer">
          <button type="button" class="btn btn--sm btn--primary" data-deposit-goal="${g.id}">
            <svg viewBox="0 0 24 24" width="16" height="16"><path d="${ICONS.plus}"/></svg>
            <span>Add Funds</span>
          </button>
          <span class="small muted">${g.targetDate ? `Due ${FT.formatDate(g.targetDate)}` : 'No deadline'}</span>
        </div>
      </article>`;
    }).join('');
  }

  /* ----------------------------------------------------- budget form logic */

  function setBudgetError(id, msg) {
    const el = els[id] || (id === 'budgetMonth' ? els.monthField : null) || FT.$(`#${id}`);
    const err = FT.$(`#err${id.charAt(0).toUpperCase() + id.slice(1)}`);
    if (el) el.classList.toggle('is-invalid', Boolean(msg));
    if (err) err.textContent = msg || '';
    return !msg;
  }

  function clearBudgetErrors() {
    ['budgetCategory', 'budgetAmount', 'budgetMonth'].forEach((id) => setBudgetError(id, ''));
  }

  function openBudgetForm(budget = null) {
    clearBudgetErrors();
    state.editingBudgetId = budget ? budget.id : null;
    els.budgetId.value = budget ? budget.id : '';
    els.modalTitle.textContent = budget ? 'Edit Budget' : 'Create Budget';
    els.submitBtn.textContent = budget ? 'Update Budget' : 'Save Budget';

    FT.fillCategoryOptions(els.category, 'expense', budget ? budget.category : '');
    els.amount.value = budget ? budget.amount : '';
    els.monthField.value = budget ? budget.month : state.month;
    els.note.value = budget ? budget.note || '' : '';

    FT.openModal(els.modal);
  }

  function handleBudgetSubmit(event) {
    event.preventDefault();
    clearBudgetErrors();

    const category = els.category.value;
    const amount = Number(els.amount.value);
    const month = els.monthField.value;
    const note = els.note.value.trim();

    let valid = true;
    if (!category) valid = setBudgetError('budgetCategory', 'Please select a category') && false;
    if (!amount || amount <= 0) valid = setBudgetError('budgetAmount', 'Enter an amount greater than zero') && false;
    if (!month) valid = setBudgetError('budgetMonth', 'Please choose a month') && false;
    if (valid && FTStorage.budgetExists(category, month, state.editingBudgetId)) {
      valid = setBudgetError('budgetCategory', `A budget for ${category} already exists in ${FT.monthLabel(month, false)}`) && false;
    }
    if (!valid) return;

    if (state.editingBudgetId) {
      FTStorage.updateBudget(state.editingBudgetId, { category, amount, month, note });
      FT.toast('Budget updated successfully.', 'success');
    } else {
      FTStorage.addBudget({ category, amount, month, note });
      FT.toast('Budget created successfully.', 'success');
    }

    state.month = month;
    els.monthInput.value = month;
    FT.closeModal(els.modal);
    renderBudgets();
  }

  async function handleBudgetDelete(id) {
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
    renderBudgets();
  }

  /* ------------------------------------------------------- goal form logic */

  function setGoalError(id, msg) {
    const el = FT.$(`#${id}`);
    const err = FT.$(`#err${id.charAt(0).toUpperCase() + id.slice(1)}`);
    if (el) el.classList.toggle('is-invalid', Boolean(msg));
    if (err) err.textContent = msg || '';
    return !msg;
  }

  function clearGoalErrors() {
    ['goalTitle', 'goalTargetAmount'].forEach((id) => setGoalError(id, ''));
  }

  function openGoalForm(goal = null) {
    clearGoalErrors();
    state.editingGoalId = goal ? goal.id : null;
    els.goalId.value = goal ? goal.id : '';
    els.goalModalTitle.textContent = goal ? 'Edit Savings Goal' : 'New Savings Goal';
    els.goalSubmitBtn.textContent = goal ? 'Update Goal' : 'Save Goal';

    els.goalTitle.value = goal ? goal.title : '';
    els.goalTargetAmount.value = goal ? goal.targetAmount : '';
    els.goalCurrentAmount.value = goal ? goal.currentAmount : '';
    els.goalTargetDate.value = goal ? goal.targetDate || '' : '';
    els.goalCategory.value = goal ? goal.category : 'Savings';
    els.goalColor.value = goal ? goal.color : '#10b981';
    els.goalNote.value = goal ? goal.note || '' : '';

    FT.openModal(els.goalModal);
  }

  function handleGoalSubmit(event) {
    event.preventDefault();
    clearGoalErrors();

    const title = els.goalTitle.value.trim();
    const targetAmount = Number(els.goalTargetAmount.value);
    const currentAmount = Number(els.goalCurrentAmount.value) || 0;
    const targetDate = els.goalTargetDate.value;
    const category = els.goalCategory.value;
    const color = els.goalColor.value;
    const note = els.goalNote.value.trim();

    let valid = true;
    if (!title) valid = setGoalError('goalTitle', 'Please enter a goal title') && false;
    if (!targetAmount || targetAmount <= 0) valid = setGoalError('goalTargetAmount', 'Target amount must be greater than zero') && false;
    if (!valid) return;

    if (state.editingGoalId) {
      FTStorage.updateGoal(state.editingGoalId, { title, targetAmount, currentAmount, targetDate, category, color, note });
      FT.toast('Goal updated successfully.', 'success');
    } else {
      FTStorage.addGoal({ title, targetAmount, currentAmount, targetDate, category, color, note });
      FT.toast('Goal created successfully!', 'success');
    }

    FT.closeModal(els.goalModal);
    renderGoals();
  }

  async function handleGoalDelete(id) {
    const goal = FTStorage.getGoals().find((g) => g.id === id);
    if (!goal) return;
    const confirmed = await FT.confirmAction({
      title: 'Delete savings goal?',
      message: `Are you sure you want to delete "${goal.title}"? Your accumulated progress of ${FT.formatCurrency(goal.currentAmount)} will be removed.`,
      confirmText: 'Delete'
    });
    if (!confirmed) return;
    FTStorage.deleteGoal(id);
    FT.toast('Goal deleted successfully.', 'success');
    renderGoals();
  }

  /* ---------------------------------------------------- deposit form logic */

  function openDepositModal(goal) {
    els.depositGoalId.value = goal.id;
    els.depositGoalSubtitle.textContent = `Deposit money into "${goal.title}"`;
    els.depositAmount.value = '';
    const err = FT.$('#errDepositAmount');
    if (err) err.textContent = '';
    els.depositAmount.classList.remove('is-invalid');
    FT.openModal(els.depositModal);
  }

  function handleDepositSubmit(event) {
    event.preventDefault();
    const goalId = els.depositGoalId.value;
    const amount = Number(els.depositAmount.value);
    const err = FT.$('#errDepositAmount');

    if (!amount || amount <= 0) {
      els.depositAmount.classList.add('is-invalid');
      if (err) err.textContent = 'Enter an amount greater than zero';
      return;
    }

    try {
      const updated = FTStorage.depositToGoal(goalId, amount);
      FT.closeModal(els.depositModal);
      if (updated.currentAmount >= updated.targetAmount) {
        FT.toast(`Congratulations! You reached your goal for "${updated.title}"! 🎉`, 'success', { force: true, duration: 5000 });
      } else {
        FT.toast(`Added ${FT.formatCurrency(amount)} to "${updated.title}".`, 'success');
      }
      renderGoals();
    } catch (e) {
      FT.toast(e.message || 'Unable to deposit funds.', 'error');
    }
  }

  /* -------------------------------------------------------------- wiring */

  function init() {
    Object.assign(els, {
      tabBudgetsBtn: FT.$('#tabBudgetsBtn'),
      tabGoalsBtn: FT.$('#tabGoalsBtn'),
      headerActionBtn: FT.$('#headerActionBtn'),
      headerActionText: FT.$('#headerActionText'),
      budgetsView: FT.$('#budgetsView'),
      goalsView: FT.$('#goalsView'),

      // Budgets
      overview: FT.$('#budgetOverview'),
      alerts: FT.$('#budgetAlerts'),
      grid: FT.$('#budgetGrid'),
      empty: FT.$('#budgetEmpty'),
      monthInput: FT.$('#budgetMonth'),
      modal: FT.$('#budgetModal'),
      modalTitle: FT.$('#budgetModalTitle'),
      form: FT.$('#budgetForm'),
      budgetId: FT.$('#budgetId'),
      category: FT.$('#budgetCategory'),
      amount: FT.$('#budgetAmount'),
      monthField: FT.$('#budgetMonthField'),
      note: FT.$('#budgetNote'),
      submitBtn: FT.$('#budgetSubmitBtn'),

      // Goals
      goalsOverview: FT.$('#goalsOverview'),
      goalsGrid: FT.$('#goalsGrid'),
      goalsEmpty: FT.$('#goalsEmpty'),
      goalModal: FT.$('#goalModal'),
      goalModalTitle: FT.$('#goalModalTitle'),
      goalForm: FT.$('#goalForm'),
      goalId: FT.$('#goalId'),
      goalTitle: FT.$('#goalTitle'),
      goalTargetAmount: FT.$('#goalTargetAmount'),
      goalCurrentAmount: FT.$('#goalCurrentAmount'),
      goalTargetDate: FT.$('#goalTargetDate'),
      goalCategory: FT.$('#goalCategory'),
      goalColor: FT.$('#goalColor'),
      goalNote: FT.$('#goalNote'),
      goalSubmitBtn: FT.$('#goalSubmitBtn'),

      // Deposit
      depositModal: FT.$('#depositModal'),
      depositGoalSubtitle: FT.$('#depositGoalSubtitle'),
      depositForm: FT.$('#depositForm'),
      depositGoalId: FT.$('#depositGoalId'),
      depositAmount: FT.$('#depositAmount')
    });

    els.monthInput.value = state.month;

    // Deep link: ?tab=goals and ?action=new
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'goals') {
      switchTab('goals');
      if (params.get('action') === 'new') {
        openGoalForm();
        window.history.replaceState({}, '', 'budgets.html?tab=goals');
      }
    } else {
      renderBudgets();
      if (params.get('action') === 'new') {
        openBudgetForm();
        window.history.replaceState({}, '', 'budgets.html');
      }
    }

    // Tab buttons
    els.tabBudgetsBtn.addEventListener('click', () => switchTab('budgets'));
    els.tabGoalsBtn.addEventListener('click', () => switchTab('goals'));

    // Dynamic header action button
    els.headerActionBtn.addEventListener('click', () => {
      if (state.activeTab === 'budgets') openBudgetForm();
      else openGoalForm();
    });

    // Month picker
    els.monthInput.addEventListener('change', (e) => {
      state.month = e.target.value || FT.currentMonthKey();
      els.monthInput.value = state.month;
      renderBudgets();
    });
    FT.$('#thisMonthBtn').addEventListener('click', () => {
      state.month = FT.currentMonthKey();
      els.monthInput.value = state.month;
      renderBudgets();
    });

    // Form submissions
    els.form.addEventListener('submit', handleBudgetSubmit);
    els.goalForm.addEventListener('submit', handleGoalSubmit);
    els.depositForm.addEventListener('submit', handleDepositSubmit);

    // Preset deposit buttons
    FT.$$('[data-deposit-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.depositPreset;
        els.depositAmount.value = val;
      });
    });

    // Delegated actions
    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-action="add-budget"]')) { openBudgetForm(); return; }
      if (event.target.closest('[data-action="add-goal"]')) { openGoalForm(); return; }

      // Budget edit / delete
      const editBudgetBtn = event.target.closest('[data-edit-budget]');
      if (editBudgetBtn) {
        openBudgetForm(FTStorage.getBudgets().find((b) => b.id === editBudgetBtn.dataset.editBudget));
        return;
      }
      const delBudgetBtn = event.target.closest('[data-delete-budget]');
      if (delBudgetBtn) {
        handleBudgetDelete(delBudgetBtn.dataset.deleteBudget);
        return;
      }

      // Goal edit / delete / deposit
      const editGoalBtn = event.target.closest('[data-edit-goal]');
      if (editGoalBtn) {
        openGoalForm(FTStorage.getGoals().find((g) => g.id === editGoalBtn.dataset.editGoal));
        return;
      }
      const delGoalBtn = event.target.closest('[data-delete-goal]');
      if (delGoalBtn) {
        handleGoalDelete(delGoalBtn.dataset.deleteGoal);
        return;
      }
      const depositGoalBtn = event.target.closest('[data-deposit-goal]');
      if (depositGoalBtn) {
        const goal = FTStorage.getGoals().find((g) => g.id === depositGoalBtn.dataset.depositGoal);
        if (goal) openDepositModal(goal);
        return;
      }
    });

    document.addEventListener('ft:datachange', () => {
      if (state.activeTab === 'budgets') renderBudgets();
      else renderGoals();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();

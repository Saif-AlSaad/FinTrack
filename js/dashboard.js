/* ==========================================================================
   FinTrack — dashboard.js
   Renders every dashboard widget from live LocalStorage data.
   ========================================================================== */

(() => {
  'use strict';

  const ICONS = {
    balance: 'M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
    income: 'M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z',
    expense: 'M16 18l2.29-2.29-4.88-4.88-4 4L2 7.41 3.41 6l6 6 4-4 6.3 6.29L22 12v6z',
    savings: 'M19.83 7.5l-2.27-2.27c.07-.42.18-.83.32-1.23L18 3c-1.1 0-2.09.45-2.83 1.17A6.94 6.94 0 0 0 13 4H9C5.13 4 2 7.13 2 11c0 3.53 2.61 6.43 6 6.92V21h4v-2h2v2h4v-4.28c.51-.4.96-.86 1.34-1.38L22 15v-7.5h-2.17zM13 9H9V7h4v2zm4.5 2c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z',
    check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    warn: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
    info: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
    up: 'M7 14l5-5 5 5z',
    down: 'M7 10l5 5 5-5z'
  };

  /** Percentage change helper (safe against division by zero). */
  const changePct = (current, previous) => {
    if (!previous) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const trendMarkup = (value, invert = false) => {
    if (!Number.isFinite(value) || value === 0) return '<span class="trend">No change</span>';
    const positive = invert ? value < 0 : value > 0;
    const cls = positive ? 'trend--up' : 'trend--down';
    const icon = value > 0 ? ICONS.up : ICONS.down;
    return `<span class="trend ${cls}"><svg viewBox="0 0 24 24"><path d="${icon}"/></svg>${Math.abs(value).toFixed(1)}%</span>`;
  };

  /* ------------------------------------------------------- summary cards */

  function renderSummary(transactions) {
    const totals = FT.computeTotals(transactions);
    const thisMonth = FT.computeTotals(FT.filterByPeriod(transactions, 'this-month'));
    const lastMonth = FT.computeTotals(FT.filterByPeriod(transactions, 'last-month'));

    const cards = [
      {
        label: 'Total Balance', value: totals.balance, icon: ICONS.balance, mod: 'balance',
        meta: `${trendMarkup(changePct(thisMonth.balance, lastMonth.balance))} <span>vs last month</span>`
      },
      {
        label: 'Total Income', value: totals.income, icon: ICONS.income, mod: 'income',
        meta: `${trendMarkup(changePct(thisMonth.income, lastMonth.income))} <span>vs last month</span>`
      },
      {
        label: 'Total Expenses', value: totals.expenses, icon: ICONS.expense, mod: 'expense',
        meta: `${trendMarkup(changePct(thisMonth.expenses, lastMonth.expenses), true)} <span>vs last month</span>`
      },
      {
        label: 'Total Savings', value: totals.savings, icon: ICONS.savings, mod: 'savings',
        meta: `<span>Savings rate <strong>${totals.savingsRate.toFixed(1)}%</strong></span>`
      }
    ];

    FT.$('#summaryCards').innerHTML = cards.map((card) => `
      <article class="card card--hover stat-card">
        <div class="stat-card__top">
          <span class="stat-card__label">${card.label}</span>
          <span class="stat-card__icon stat-card__icon--${card.mod}" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="${card.icon}"/></svg>
          </span>
        </div>
        <p class="stat-card__value">${FT.formatCurrency(card.value)}</p>
        <p class="stat-card__meta">${card.meta}</p>
      </article>`).join('');

    const sub = FT.$('[data-welcome-sub]');
    if (sub) {
      sub.textContent = thisMonth.count
        ? `You recorded ${thisMonth.count} transaction${thisMonth.count > 1 ? 's' : ''} this month with a net of ${FT.formatCurrency(thisMonth.balance)}.`
        : 'No activity recorded this month yet — add your first transaction to get started.';
    }
    return totals;
  }

  /* -------------------------------------------------------------- charts */

  function renderIncomeExpenseChart(transactions) {
    const series = FT.monthlySeries(transactions, FT.recentMonthKeys(6));
    const theme = FT.chartTheme();
    FT.renderChart('incomeExpenseChart', {
      type: 'bar',
      data: {
        labels: series.map((s) => s.label),
        datasets: [
          { label: 'Income', data: series.map((s) => s.income), backgroundColor: theme.income, borderRadius: 6, maxBarThickness: 26 },
          { label: 'Expenses', data: series.map((s) => s.expenses), backgroundColor: theme.expense, borderRadius: 6, maxBarThickness: 26 }
        ]
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        onClick: (evt, elements) => {
          if (elements.length > 0) {
            const idx = elements[0].index;
            if (series[idx]) window.location.href = `transactions.html?month=${encodeURIComponent(series[idx].key)}`;
          }
        },
        onHover: (event, chartElement) => {
          const target = event.native ? event.native.target : event.chart?.canvas;
          if (target) target.style.cursor = chartElement.length ? 'pointer' : 'default';
        },
        plugins: {
          legend: { position: 'top', align: 'end' },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${FT.formatCurrency(ctx.parsed.y)}` } }
        },
        scales: {
          x: { grid: { display: false }, border: { display: false } },
          y: { beginAtZero: true, grid: { color: theme.grid }, border: { display: false }, ticks: { callback: FT.currencyTick } }
        }
      }
    });
  }

  function renderCategoryChart(transactions) {
    const monthTx = FT.filterByPeriod(transactions, 'this-month');
    const data = FT.groupByCategory(monthTx.length ? monthTx : transactions, 'expense').slice(0, 7);
    const legend = FT.$('#categoryLegend');

    if (!data.length) {
      FT.showChartEmpty('categoryChart', {
        title: 'No expenses yet',
        message: 'Category insights appear once you record an expense.',
        actionLabel: 'Add Transaction',
        actionHref: 'transactions.html?action=new'
      });
      if (legend) legend.innerHTML = '';
      return;
    }

    const total = data.reduce((sum, d) => sum + d.total, 0);
    FT.renderChart('categoryChart', {
      type: 'doughnut',
      data: {
        labels: data.map((d) => d.category),
        datasets: [{
          data: data.map((d) => d.total),
          backgroundColor: data.map((d) => FT.categoryColor(d.category)),
          borderWidth: 0,
          hoverOffset: 10
        }]
      },
      options: {
        cutout: '66%',
        onClick: (evt, elements) => {
          if (elements.length > 0) {
            const idx = elements[0].index;
            if (data[idx]) window.location.href = `transactions.html?category=${encodeURIComponent(data[idx].category)}`;
          }
        },
        onHover: (event, chartElement) => {
          const target = event.native ? event.native.target : event.chart?.canvas;
          if (target) target.style.cursor = chartElement.length ? 'pointer' : 'default';
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${FT.formatCurrency(ctx.parsed)} (${((ctx.parsed / total) * 100).toFixed(1)}%)`
            }
          }
        }
      }
    });

    if (legend) {
      legend.innerHTML = data.map((d) => `
        <a class="legend-item" href="transactions.html?category=${encodeURIComponent(d.category)}" title="Filter by ${d.category}">
          <span class="legend-dot" style="background:${FT.categoryColor(d.category)}"></span>
          ${d.category} · <strong>${((d.total / total) * 100).toFixed(0)}%</strong>
        </a>`).join('');
    }
  }

  function renderMonthlySpendChart(transactions) {
    const series = FT.monthlySeries(transactions, FT.recentMonthKeys(6));
    const theme = FT.chartTheme();
    const avg = series.reduce((s, m) => s + m.expenses, 0) / (series.length || 1);
    const badge = FT.$('#avgSpendBadge');
    if (badge) badge.textContent = `Average ${FT.formatCurrency(avg, { decimals: 0 })}/mo`;

    FT.renderChart('monthlySpendChart', {
      type: 'line',
      data: {
        labels: series.map((s) => s.label),
        datasets: [{
          label: 'Expenses',
          data: series.map((s) => s.expenses),
          borderColor: theme.brand,
          backgroundColor: (ctx) => {
            const { ctx: c, chartArea } = ctx.chart;
            if (!chartArea) return 'rgba(37,99,235,.15)';
            const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(37,99,235,.28)');
            gradient.addColorStop(1, 'rgba(37,99,235,0)');
            return gradient;
          },
          fill: true, tension: .38, borderWidth: 3,
          pointBackgroundColor: theme.surface, pointBorderColor: theme.brand,
          pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6
        }]
      },
      options: {
        onClick: (evt, elements) => {
          if (elements.length > 0) {
            const idx = elements[0].index;
            if (series[idx]) window.location.href = `transactions.html?month=${encodeURIComponent(series[idx].key)}`;
          }
        },
        onHover: (event, chartElement) => {
          const target = event.native ? event.native.target : event.chart?.canvas;
          if (target) target.style.cursor = chartElement.length ? 'pointer' : 'default';
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => ` Spent: ${FT.formatCurrency(ctx.parsed.y)}` } }
        },
        scales: {
          x: { grid: { display: false }, border: { display: false } },
          y: { beginAtZero: true, grid: { color: theme.grid }, border: { display: false }, ticks: { callback: FT.currencyTick } }
        }
      }
    });
  }

  /* ------------------------------------------------- recent transactions */

  function renderRecent(transactions) {
    const host = FT.$('#recentTransactions');
    if (!host) return;
    const recent = [...transactions]
      .sort((a, b) => (b.date === a.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)))
      .slice(0, 5);

    if (!recent.length) {
      host.innerHTML = FT.emptyState({
        title: 'No transactions yet',
        message: 'Start tracking your finances by adding your first transaction.',
        actionLabel: 'Add Transaction',
        actionHref: 'transactions.html?action=new'
      });
      return;
    }

    host.innerHTML = recent.map((tx) => {
      const color = FT.categoryColor(tx.category);
      return `
      <div class="tx-item">
        <span class="cat-icon-wrap" style="background:${color}1f;color:${color}" aria-hidden="true">${FT.categoryIcon(tx.category)}</span>
        <div class="tx-item__body">
          <p class="tx-item__title">${FT.escapeHtml(tx.title)}</p>
          <p class="tx-item__meta"><span>${FT.escapeHtml(tx.category)}</span><span>${FT.formatDate(tx.date)}</span></p>
        </div>
        <p class="tx-item__amount amount amount--${tx.type}">
          ${tx.type === 'income' ? '+' : '−'}${FT.formatCurrency(tx.amount)}
        </p>
      </div>`;
    }).join('');
  }

  /* -------------------------------------------------------- budget widget */

  function renderBudgets(transactions) {
    const host = FT.$('#budgetProgress');
    if (!host) return;
    const month = FT.currentMonthKey();
    const label = FT.$('#budgetMonthLabel');
    if (label) label.textContent = FT.monthLabel(month, false);

    const budgets = FTStorage.getBudgets()
      .filter((b) => b.month === month)
      .map((b) => FT.budgetProgress(b, transactions))
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 5);

    if (!budgets.length) {
      host.innerHTML = FT.emptyState({
        icon: 'M11 2v20c-5.07-.5-9-4.79-9-10s3.93-9.5 9-10zm2.03 0v8.99H22c-.47-4.74-4.24-8.52-8.97-8.99zm0 11.01V22c4.74-.47 8.5-4.25 8.97-8.99h-8.97z',
        title: 'No budgets for this month',
        message: 'Create category budgets to monitor your spending limits.',
        actionLabel: 'Create Budget',
        actionHref: 'budgets.html'
      });
      return;
    }

    host.innerHTML = budgets.map((b) => `
      <div class="budget-mini__row">
        <div class="budget-mini__head">
          <span class="budget-mini__name">
            <span class="status-dot status-dot--${b.status}" aria-hidden="true"></span> ${b.category}
          </span>
          <span class="budget-mini__value">${FT.formatCurrency(b.spent, { decimals: 0 })} / ${FT.formatCurrency(b.amount, { decimals: 0 })}</span>
        </div>
        <div class="progress" role="progressbar" aria-valuenow="${b.percent.toFixed(0)}" aria-valuemin="0" aria-valuemax="100" aria-label="${b.category} budget used">
          <div class="progress__bar progress__bar--${b.status}" style="width:${b.clamped}%"></div>
        </div>
        <span class="small muted">${b.percent.toFixed(0)}% used · ${b.remaining >= 0 ? `${FT.formatCurrency(b.remaining, { decimals: 0 })} left` : `${FT.formatCurrency(Math.abs(b.remaining), { decimals: 0 })} over`}</span>
      </div>`).join('');
  }

  /* ------------------------------------------------------ financial health */

  function renderHealth(transactions, totals) {
    const host = FT.$('#healthSummary');
    const insightHost = FT.$('#healthInsights');
    if (!host || !insightHost) return;

    const monthTx = FT.filterByPeriod(transactions, 'this-month');
    const monthTotals = FT.computeTotals(monthTx);
    const budgets = FTStorage.getBudgets()
      .filter((b) => b.month === FT.currentMonthKey())
      .map((b) => FT.budgetProgress(b, transactions));
    const overBudget = budgets.filter((b) => b.status === 'over');
    const warningBudgets = budgets.filter((b) => b.status === 'warning');

    // Score: savings rate (60%) + budget adherence (40%), clamped 0–100.
    const savingsScore = Math.max(0, Math.min(totals.savingsRate, 40)) / 40 * 60;
    const budgetScore = budgets.length
      ? (budgets.filter((b) => b.status === 'normal').length / budgets.length) * 40
      : 28;
    const score = Math.round(Math.max(0, Math.min(100, savingsScore + budgetScore)));
    const grade = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs attention';

    host.innerHTML = `
      <div class="health__score">
        <div class="health__ring" style="--score:${score}" role="img" aria-label="Financial health score ${score} out of 100">
          <span>${score}</span>
        </div>
        <div class="health__summary">
          <h4>${grade}</h4>
          <p>Your savings rate is <strong>${totals.savingsRate.toFixed(1)}%</strong> across ${totals.count} recorded transactions.</p>
        </div>
      </div>
      <div class="health__list">
        <div class="health__item"><svg viewBox="0 0 24 24"><path d="${ICONS.info}"/></svg>
          This month: ${FT.formatCurrency(monthTotals.income)} in · ${FT.formatCurrency(monthTotals.expenses)} out
        </div>
        <div class="health__item"><svg viewBox="0 0 24 24"><path d="${ICONS.info}"/></svg>
          Active budgets: ${budgets.length} · On track: ${budgets.filter((b) => b.status === 'normal').length}
        </div>
      </div>`;

    const insights = [];
    if (totals.savingsRate >= 20) {
      insights.push(['good', ICONS.check, `Great job — you are saving ${totals.savingsRate.toFixed(1)}% of your income.`]);
    } else if (totals.savingsRate > 0) {
      insights.push(['warn', ICONS.warn, `Your savings rate is ${totals.savingsRate.toFixed(1)}%. Aim for at least 20%.`]);
    } else {
      insights.push(['bad', ICONS.warn, 'You are spending more than you earn. Review your largest expenses.']);
    }

    const topCategory = FT.groupByCategory(monthTx, 'expense')[0];
    if (topCategory) {
      insights.push(['warn', ICONS.info, `${topCategory.category} is your biggest expense this month at ${FT.formatCurrency(topCategory.total)}.`]);
    }
    if (overBudget.length) {
      insights.push(['bad', ICONS.warn, `${overBudget.length} budget${overBudget.length > 1 ? 's are' : ' is'} over the limit: ${overBudget.map((b) => b.category).join(', ')}.`]);
    }
    if (warningBudgets.length) {
      insights.push(['warn', ICONS.warn, `Approaching limit: ${warningBudgets.map((b) => b.category).join(', ')}.`]);
    }
    if (monthTotals.balance > 0) {
      insights.push(['good', ICONS.check, `You are ${FT.formatCurrency(monthTotals.balance)} in surplus this month.`]);
    }

    insightHost.innerHTML = insights.slice(0, 5).map(([tone, icon, text]) => `
      <div class="health__item health__item--${tone}">
        <svg viewBox="0 0 24 24"><path d="${icon}"/></svg><span>${FT.escapeHtml(text)}</span>
      </div>`).join('');
  }

  function renderGoals() {
    const host = FT.$('#dashboardGoals');
    if (!host) return;
    const goals = FTStorage.getGoals().map(FT.goalProgress).slice(0, 3);

    if (!goals.length) {
      host.innerHTML = FT.emptyState({
        icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z',
        title: 'No active savings goals',
        message: 'Set target buckets for vacations, emergency funds, or big purchases.',
        actionLabel: 'Create Goal',
        actionHref: 'budgets.html?tab=goals'
      });
      return;
    }

    host.innerHTML = goals.map((g) => `
      <div class="card card--hover goal-mini" style="padding: 1.15rem; border: 1px solid var(--border); display: flex; flex-direction: column; gap: .65rem;">
        <div class="row row--between">
          <strong style="font-size: .95rem;">${FT.escapeHtml(g.title)}</strong>
          <span class="badge ${g.isCompleted ? 'badge--completed' : ''}">${g.isCompleted ? 'Completed 🎉' : `${g.percent.toFixed(0)}%`}</span>
        </div>
        <div class="progress" role="progressbar" aria-valuenow="${g.percent.toFixed(0)}" aria-valuemin="0" aria-valuemax="100">
          <div class="progress__bar" style="width:${g.clamped}%; background:${g.color}"></div>
        </div>
        <div class="row row--between small muted">
          <span>${FT.formatCurrency(g.currentAmount)} saved</span>
          <span>Target: ${FT.formatCurrency(g.targetAmount)}</span>
        </div>
      </div>`).join('');
  }

  /* ----------------------------------------------------------- bootstrap */

  function renderDashboard() {
    const transactions = FTStorage.getTransactions();
    const monthLabelEl = FT.$('[data-current-month]');
    if (monthLabelEl) {
      const monthTotals = FT.computeTotals(FT.filterByPeriod(transactions, 'this-month'));
      monthLabelEl.textContent = `${monthTotals.balance >= 0 ? '+' : ''}${FT.formatCurrency(monthTotals.balance)}`;
      monthLabelEl.classList.toggle('welcome__month-value--positive', monthTotals.balance >= 0);
      monthLabelEl.classList.toggle('welcome__month-value--negative', monthTotals.balance < 0);
    }

    const totals = renderSummary(transactions);
    renderIncomeExpenseChart(transactions);
    renderCategoryChart(transactions);
    renderMonthlySpendChart(transactions);
    renderRecent(transactions);
    renderBudgets(transactions);
    renderGoals();
    renderHealth(transactions, totals);
  }

  document.addEventListener('DOMContentLoaded', renderDashboard);
  document.addEventListener('ft:datachange', renderDashboard);
  document.addEventListener('ft:themechange', () => {
    const transactions = FTStorage.getTransactions();
    renderIncomeExpenseChart(transactions);
    renderCategoryChart(transactions);
    renderMonthlySpendChart(transactions);
  });
})();

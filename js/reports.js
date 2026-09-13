/* ==========================================================================
   FinTrack — reports.js
   Period-filtered analytics powered by Chart.js and real transaction data.
   ========================================================================== */

(() => {
  'use strict';

  const state = { period: 'this-month' };

  const PERIOD_LABELS = {
    'this-month': 'Current month',
    'last-month': 'Last month',
    'last-6-months': 'Last 6 months',
    'this-year': 'Current year',
    all: 'All time'
  };

  /** Month keys covered by the selected period (used for the trend charts). */
  function periodMonths(transactions) {
    if (state.period === 'this-month') return [FT.currentMonthKey()];
    if (state.period === 'last-month') {
      const d = new Date();
      const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      return [`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`];
    }
    if (state.period === 'last-6-months') return FT.recentMonthKeys(6);
    if (state.period === 'this-year') {
      const year = new Date().getFullYear();
      return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
    }
    const keys = [...new Set(transactions.map((t) => FT.monthKey(t.date)))].sort();
    return keys.length ? keys : [FT.currentMonthKey()];
  }

  /* ------------------------------------------------------------------ KPIs */

  function renderKpis(list) {
    const { income, expenses, balance, savingsRate, count } = FT.computeTotals(list);
    const months = Math.max(1, new Set(list.map((t) => FT.monthKey(t.date))).size);
    const avgExpense = expenses / months;
    const biggest = [...list].filter((t) => t.type === 'expense').sort((a, b) => b.amount - a.amount)[0];

    FT.$('#periodSummary').textContent =
      `${PERIOD_LABELS[state.period]} · ${count} transaction${count === 1 ? '' : 's'} analysed`;

    FT.$('#reportKpis').innerHTML = [
      ['Total Income', FT.formatCurrency(income), `${list.filter((t) => t.type === 'income').length} income entries`],
      ['Total Expenses', FT.formatCurrency(expenses), `Avg ${FT.formatCurrency(avgExpense, { decimals: 0 })}/month`],
      ['Net Savings', FT.formatCurrency(balance), `Savings rate ${savingsRate.toFixed(1)}%`],
      ['Largest Expense', biggest ? FT.formatCurrency(biggest.amount) : FT.formatCurrency(0), biggest ? `${biggest.title} · ${biggest.category}` : 'No expenses recorded']
    ].map(([label, value, hint]) => `
      <div class="kpi">
        <p class="kpi__label">${label}</p>
        <p class="kpi__value">${value}</p>
        <p class="kpi__hint">${FT.escapeHtml(hint)}</p>
      </div>`).join('');
  }

  /* ---------------------------------------------------------------- charts */

  function renderIncomeExpense(list, months) {
    const series = FT.monthlySeries(list, months);
    const theme = FT.chartTheme();
    FT.renderChart('reportIncomeExpense', {
      type: 'bar',
      data: {
        labels: series.map((s) => s.label),
        datasets: [
          { label: 'Income', data: series.map((s) => s.income), backgroundColor: theme.income, borderRadius: 6, maxBarThickness: 30 },
          { label: 'Expenses', data: series.map((s) => s.expenses), backgroundColor: theme.expense, borderRadius: 6, maxBarThickness: 30 }
        ]
      },
      options: {
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

  function renderCategoryDoughnut(list) {
    const data = FT.groupByCategory(list, 'expense');
    if (!data.length) {
      FT.showChartEmpty('reportCategory', {
        title: 'No expense data',
        message: 'There are no expenses in this period yet.'
      });
      return;
    }
    const total = data.reduce((sum, d) => sum + d.total, 0);
    FT.renderChart('reportCategory', {
      type: 'doughnut',
      data: {
        labels: data.map((d) => d.category),
        datasets: [{
          data: data.map((d) => d.total),
          backgroundColor: data.map((d) => FT.categoryColor(d.category)),
          borderWidth: 0, hoverOffset: 10
        }]
      },
      options: {
        cutout: '62%',
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
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: { label: (ctx) => ` ${ctx.label}: ${FT.formatCurrency(ctx.parsed)} (${((ctx.parsed / total) * 100).toFixed(1)}%)` }
          }
        }
      }
    });
  }

  function renderTrend(canvasId, list, months, type) {
    const series = FT.monthlySeries(list, months);
    const theme = FT.chartTheme();
    const color = type === 'income' ? theme.income : theme.expense;
    FT.renderChart(canvasId, {
      type: 'line',
      data: {
        labels: series.map((s) => s.label),
        datasets: [{
          label: type === 'income' ? 'Income' : 'Expenses',
          data: series.map((s) => (type === 'income' ? s.income : s.expenses)),
          borderColor: color,
          backgroundColor: `${color}26`,
          fill: true, tension: .35, borderWidth: 3,
          pointBackgroundColor: theme.surface, pointBorderColor: color,
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
          tooltip: { callbacks: { label: (ctx) => ` ${FT.formatCurrency(ctx.parsed.y)}` } }
        },
        scales: {
          x: { grid: { display: false }, border: { display: false } },
          y: { beginAtZero: true, grid: { color: theme.grid }, border: { display: false }, ticks: { callback: FT.currencyTick } }
        }
      }
    });
  }

  /* ------------------------------------------------------------ breakdown */

  function renderBreakdown(list) {
    const host = FT.$('#categoryBreakdown');
    const data = FT.groupByCategory(list, 'expense');
    if (!data.length) {
      host.innerHTML = FT.emptyState({
        title: 'Nothing to break down',
        message: 'Add expenses in this period to see a category breakdown.',
        actionLabel: 'Add Transaction',
        actionHref: 'transactions.html?action=new'
      });
      return;
    }
    const total = data.reduce((sum, d) => sum + d.total, 0);
    host.innerHTML = data.map((d) => {
      const share = (d.total / total) * 100;
      const color = FT.categoryColor(d.category);
      return `
      <a class="breakdown-row" href="transactions.html?category=${encodeURIComponent(d.category)}" title="Filter transactions by ${d.category}">
        <div class="breakdown-row__top">
          <span class="legend-dot" style="background:${color}" aria-hidden="true"></span>
          <span class="breakdown-row__name">${d.category}</span>
          <span class="breakdown-row__value">${FT.formatCurrency(d.total)}</span>
          <span class="breakdown-row__share">${share.toFixed(1)}%</span>
        </div>
        <div class="progress"><div class="progress__bar" style="width:${share}%;background:${color}"></div></div>
      </a>`;
    }).join('');
  }

  function renderInsights(list) {
    const host = FT.$('#reportInsights');
    const totals = FT.computeTotals(list);
    const categories = FT.groupByCategory(list, 'expense');
    const incomeSources = FT.groupByCategory(list, 'income');
    const months = Math.max(1, new Set(list.map((t) => FT.monthKey(t.date))).size);
    const insights = [];

    if (!list.length) {
      host.innerHTML = FT.emptyState({
        title: 'No data for this period',
        message: 'Choose a different period or add transactions to generate insights.'
      });
      return;
    }

    insights.push(`You earned <strong>${FT.formatCurrency(totals.income)}</strong> and spent <strong>${FT.formatCurrency(totals.expenses)}</strong>, keeping <strong>${FT.formatCurrency(totals.balance)}</strong>.`);
    if (categories[0]) {
      const share = (categories[0].total / totals.expenses) * 100;
      insights.push(`<strong>${categories[0].category}</strong> is your largest expense category at ${share.toFixed(1)}% of total spending.`);
    }
    if (incomeSources[0]) {
      insights.push(`Most income came from <strong>${incomeSources[0].category}</strong> (${FT.formatCurrency(incomeSources[0].total)}).`);
    }
    insights.push(`Average monthly spending is <strong>${FT.formatCurrency(totals.expenses / months, { decimals: 0 })}</strong> across ${months} month${months > 1 ? 's' : ''}.`);
    insights.push(totals.savingsRate >= 20
      ? `Your savings rate of <strong>${totals.savingsRate.toFixed(1)}%</strong> is above the recommended 20%.`
      : `Your savings rate is <strong>${totals.savingsRate.toFixed(1)}%</strong> — try trimming discretionary spending to reach 20%.`);

    host.innerHTML = insights.map((text) => `
      <div class="insight">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
        <span>${text}</span>
      </div>`).join('');
  }

  /* -------------------------------------------------------------- refresh */

  function render() {
    const all = FTStorage.getTransactions();
    const list = FT.filterByPeriod(all, state.period);
    const months = periodMonths(all);

    renderKpis(list);
    renderIncomeExpense(list, months);
    renderCategoryDoughnut(list);
    renderTrend('reportMonthlyExpense', list, months, 'expense');
    renderTrend('reportMonthlyIncome', list, months, 'income');
    renderBreakdown(list);
    renderInsights(list);
  }

  function init() {
    FT.$$('.period-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        state.period = tab.dataset.period;
        FT.$$('.period-tab').forEach((t) => {
          const active = t === tab;
          t.classList.toggle('is-active', active);
          t.setAttribute('aria-selected', String(active));
        });
        render();
      });
    });

    render();
    document.addEventListener('ft:datachange', render);
    document.addEventListener('ft:themechange', render);
  }

  document.addEventListener('DOMContentLoaded', init);
})();

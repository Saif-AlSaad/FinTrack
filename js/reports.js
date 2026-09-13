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

  /* ------------------------------------------------------------ PDF Export */

  async function exportPdf() {
    const btn = FT.$('#downloadPdfBtn');
    const originalContent = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-sm" aria-hidden="true"></span><span>Generating PDF...</span>';
    }
    FT.toast('Preparing your financial PDF report...', 'info');

    // Wait a brief tick to allow DOM/state to settle
    await new Promise((resolve) => setTimeout(resolve, 150));

    try {
      const all = FTStorage.getTransactions();
      const list = FT.filterByPeriod(all, state.period);
      const totals = FT.computeTotals(list);
      const settings = FTStorage.getSettings();
      const user = FTStorage.getCurrentUser() || {};
      const userName = settings.name || user.name || 'FinTrack User';
      const userEmail = user.email || 'user@fintrack.app';
      const periodName = PERIOD_LABELS[state.period] || 'Financial Report';

      // Capture Chart Canvas images cleanly
      const incExpCanvas = document.getElementById('reportIncomeExpense');
      const catCanvas = document.getElementById('reportCategory');
      const incExpImg = incExpCanvas ? incExpCanvas.toDataURL('image/png') : null;
      const catImg = catCanvas ? catCanvas.toDataURL('image/png') : null;

      // Group categories
      const categories = FT.groupByCategory(list, 'expense');
      const totalExpense = categories.reduce((sum, d) => sum + d.total, 0);

      const categoryRows = categories.length ? categories.map((c) => {
        const share = totalExpense > 0 ? (c.total / totalExpense) * 100 : 0;
        const color = FT.categoryColor(c.category);
        return `
          <tr>
            <td>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; display: inline-block;"></span>
                <span style="font-weight: 600;">${FT.escapeHtml(c.category)}</span>
              </div>
            </td>
            <td style="text-align: right; font-weight: 700; font-variant-numeric: tabular-nums;">${FT.formatCurrency(c.total)}</td>
            <td style="text-align: right; font-weight: 600; font-size: .72rem; color: #64748b;">${share.toFixed(1)}%</td>
            <td>
              <div class="pdf-bar-wrap">
                <div class="pdf-bar-fill" style="width: ${share}%; background: ${color};"></div>
              </div>
            </td>
          </tr>
        `;
      }).join('') : '<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 12px;">No expense records in this period</td></tr>';

      // Top / All Transactions (up to 30)
      const sortedTx = [...list].sort((a, b) => new Date(b.date) - new Date(a.date));
      const displayTx = sortedTx.slice(0, 30);
      const txRows = displayTx.length ? displayTx.map((t) => {
        const isIncome = t.type === 'income';
        const badgeClass = isIncome ? 'is-income' : 'is-expense';
        const sign = isIncome ? '+' : '-';
        return `
          <tr>
            <td style="font-variant-numeric: tabular-nums; white-space: nowrap; color: #64748b; font-size: .72rem;">${FT.formatDate(t.date)}</td>
            <td style="font-weight: 600;">${FT.escapeHtml(t.title)}</td>
            <td>${FT.escapeHtml(t.category)}</td>
            <td><span class="pdf-type-badge ${badgeClass}">${t.type}</span></td>
            <td style="text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; color: ${isIncome ? '#059669' : '#0f172a'};">
              ${sign}${FT.formatCurrency(t.amount)}
            </td>
          </tr>
        `;
      }).join('') : '<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 12px;">No transactions recorded for this period</td></tr>';

      // Financial Insights
      const insightsList = [];
      const months = Math.max(1, new Set(list.map((t) => FT.monthKey(t.date))).size);
      if (list.length) {
        insightsList.push(`Earned <strong>${FT.formatCurrency(totals.income)}</strong> and spent <strong>${FT.formatCurrency(totals.expenses)}</strong>, netting <strong>${FT.formatCurrency(totals.balance)}</strong> in total savings.`);
        if (categories[0]) {
          const share = totals.expenses > 0 ? (categories[0].total / totals.expenses) * 100 : 0;
          insightsList.push(`<strong>${categories[0].category}</strong> represents your highest expense category at ${share.toFixed(1)}% of all spending.`);
        }
        insightsList.push(`Average monthly expenditure is <strong>${FT.formatCurrency(totals.expenses / months, { decimals: 0 })}</strong>.`);
        insightsList.push(totals.savingsRate >= 20
          ? `Savings rate is <strong>${totals.savingsRate.toFixed(1)}%</strong>, exceeding the recommended 20% financial independence threshold.`
          : `Savings rate is <strong>${totals.savingsRate.toFixed(1)}%</strong>. Increasing monthly savings toward 20% is suggested.`);
      } else {
        insightsList.push('No transactions found in this period. Add transactions to generate financial health insights.');
      }

      const insightsHtml = insightsList.map((txt) => `
        <div class="pdf-insight-row">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
          <span>${txt}</span>
        </div>
      `).join('');

      const genTimestamp = new Date().toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      });

      // Construct Printable / PDF Template DOM
      const template = document.createElement('div');
      template.className = 'pdf-render-wrapper';
      template.innerHTML = `
        <div class="pdf-header">
          <div class="pdf-brand">
            <div class="pdf-brand__icon">
              <svg viewBox="0 0 24 24"><path d="M3.5 18.5l6-6 4 4L22 7.9 20.6 6.5l-7.1 7.1-4-4L2 17z"/><path d="M2 20h20v2H2z"/></svg>
            </div>
            <div>
              <div class="pdf-brand__name">FinTrack</div>
              <div class="pdf-brand__tag">Personal Wealth & Money Manager</div>
            </div>
          </div>
          <div class="pdf-meta">
            <div class="pdf-badge">${periodName}</div>
            <div>Client: <strong>${FT.escapeHtml(userName)}</strong></div>
            <div style="font-size: .72rem; color: #64748b;">${FT.escapeHtml(userEmail)}</div>
            <div style="font-size: .68rem; color: #94a3b8; margin-top: 2px;">Generated: ${genTimestamp}</div>
          </div>
        </div>

        <div class="pdf-section">
          <div class="pdf-section-title">Executive Summary</div>
          <div class="pdf-kpi-grid">
            <div class="pdf-kpi pdf-kpi--income">
              <div class="pdf-kpi__label">Total Income</div>
              <div class="pdf-kpi__val">${FT.formatCurrency(totals.income)}</div>
              <div class="pdf-kpi__hint">${list.filter((t) => t.type === 'income').length} entries</div>
            </div>
            <div class="pdf-kpi pdf-kpi--expense">
              <div class="pdf-kpi__label">Total Expenses</div>
              <div class="pdf-kpi__val">${FT.formatCurrency(totals.expenses)}</div>
              <div class="pdf-kpi__hint">${list.filter((t) => t.type === 'expense').length} entries</div>
            </div>
            <div class="pdf-kpi pdf-kpi--balance">
              <div class="pdf-kpi__label">Net Savings</div>
              <div class="pdf-kpi__val">${FT.formatCurrency(totals.balance)}</div>
              <div class="pdf-kpi__hint">Net cash flow</div>
            </div>
            <div class="pdf-kpi pdf-kpi--rate">
              <div class="pdf-kpi__label">Savings Rate</div>
              <div class="pdf-kpi__val">${totals.savingsRate.toFixed(1)}%</div>
              <div class="pdf-kpi__hint">${totals.savingsRate >= 20 ? 'Target achieved (≥20%)' : 'Target: 20%'}</div>
            </div>
          </div>
        </div>

        <div class="pdf-section" style="page-break-inside: avoid;">
          <div class="pdf-section-title">Financial Charts & Analytics</div>
          <div class="pdf-charts-grid">
            <div class="pdf-chart-card">
              <div class="pdf-chart-card__title">Monthly Income vs Expenses</div>
              ${incExpImg ? `<img src="${incExpImg}" class="pdf-chart-img" alt="Income vs Expenses Chart">` : '<p style="font-size: .75rem; color: #94a3b8; padding: 20px; text-align: center;">No trend data</p>'}
            </div>
            <div class="pdf-chart-card">
              <div class="pdf-chart-card__title">Expenses by Category</div>
              ${catImg ? `<img src="${catImg}" class="pdf-chart-img" alt="Expense Category Doughnut Chart">` : '<p style="font-size: .75rem; color: #94a3b8; padding: 20px; text-align: center;">No category data</p>'}
            </div>
          </div>
        </div>

        <div class="pdf-section" style="page-break-inside: avoid;">
          <div class="pdf-section-title">Expense Breakdown by Category</div>
          <table class="pdf-table">
            <thead>
              <tr>
                <th style="width: 32%;">Category</th>
                <th style="text-align: right; width: 22%;">Amount</th>
                <th style="text-align: right; width: 16%;">Share</th>
                <th style="width: 30%;">Distribution</th>
              </tr>
            </thead>
            <tbody>
              ${categoryRows}
            </tbody>
          </table>
        </div>

        <div class="pdf-section">
          <div class="pdf-section-title">Transactions Ledger (${displayTx.length}${sortedTx.length > displayTx.length ? ` of ${sortedTx.length}` : ''})</div>
          <table class="pdf-table">
            <thead>
              <tr>
                <th style="width: 15%;">Date</th>
                <th style="width: 35%;">Title</th>
                <th style="width: 22%;">Category</th>
                <th style="width: 10%;">Type</th>
                <th style="text-align: right; width: 18%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${txRows}
            </tbody>
          </table>
        </div>

        <div class="pdf-section" style="page-break-inside: avoid;">
          <div class="pdf-section-title">Financial Insights & Recommendations</div>
          <div class="pdf-insights-box">
            ${insightsHtml}
          </div>
        </div>

        <div class="pdf-footer">
          <div>FinTrack Money Manager · Confidential Financial Summary</div>
          <div>Strictly Private & Client-Side · Generated securely in browser</div>
        </div>
      `;

      document.body.appendChild(template);

      // Check if html2pdf is available
      if (typeof window.html2pdf === 'function') {
        const dateStamp = new Date().toISOString().slice(0, 10);
        const filename = `FinTrack-Report-${state.period}-${dateStamp}.pdf`;
        const opt = {
          margin: [8, 8, 10, 8],
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true,
            logging: false
          },
          jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
          },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        await window.html2pdf().set(opt).from(template).save();
        template.remove();
        FT.toast('PDF report downloaded successfully!', 'success', { force: true });
      } else {
        // Fallback to browser print
        template.remove();
        FT.toast('Opening browser print dialog (Save as PDF)...', 'info', { force: true });
        window.print();
      }
    } catch (err) {
      console.error('[PDF Export Error]', err);
      FT.toast('Could not generate PDF directly. Opening print dialog...', 'warning', { force: true });
      window.print();
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalContent;
      }
    }
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

    const downloadBtn = FT.$('#downloadPdfBtn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', exportPdf);
    }

    render();
    document.addEventListener('ft:datachange', render);
    document.addEventListener('ft:themechange', render);
  }

  document.addEventListener('DOMContentLoaded', init);
})();

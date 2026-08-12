# 💰 FinTrack — Personal Finance Dashboard

A modern, responsive **personal finance management dashboard** built with pure **HTML5, CSS3 and vanilla JavaScript (ES6+)**, using **LocalStorage** for persistence and **Chart.js** for data visualization.

No frameworks. No backend. No build step. Just open `index.html`.

> **Default currency:** BDT (৳) — changeable from the Settings page.

---

## 📖 Project Description

FinTrack helps you track income and expenses, set monthly category budgets, monitor savings, and analyse spending through interactive reports. Every figure on every screen — balance, income, expenses, savings rate, budget progress and all charts — is **calculated dynamically from your transaction data**. Nothing is hardcoded.

All data lives in your browser's LocalStorage, so it persists between sessions and never leaves your device.

---

## ✨ Features

### Dashboard
- Personalised welcome message (time-aware greeting)
- Summary cards: **Balance, Income, Expenses, Savings** (+ savings rate & month-over-month trends)
- Income vs Expenses bar chart (last 6 months)
- Expense category doughnut chart with legend
- Monthly spending trend line chart with monthly average
- Latest 5 transactions with category icons and a **View All** link
- Live budget progress bars
- Financial health score, grade and automatic insights

### Transactions
- Full **CRUD**: create, read, update, delete (with confirmation modal)
- Unique IDs, title, amount, type, category, date, description
- **Search** by title/description/category
- **Filters**: type, category, month + removable filter pills
- **Sorting**: newest, oldest, highest amount, lowest amount, A–Z
- Live filtered totals (count, income, expenses, net balance)
- Professional table on desktop → responsive cards on mobile
- Inline form validation with clear error messages
- Detail view modal

### Budgets
- Create / edit / delete monthly category budgets
- Month switcher (any month, "This month" shortcut)
- Budget vs spent vs remaining + percentage used
- Progress bars with status: **On Track (<80%) · Warning (80–99%) · Over Budget (≥100%)**
- Warning banners and toast alerts when limits are approached or exceeded
- Duplicate-budget protection per category/month

### Reports
- Period filters: current month, last month, last 6 months, current year, all time
- Income vs Expense chart
- Expense by Category doughnut chart
- Monthly Expense chart
- Monthly Income chart
- KPI grid, ranked category breakdown and generated insights
- All charts rebuild automatically when data or theme changes

### Settings
- Profile name, currency (BDT default, +5 more), theme, notification preference
- Export a JSON backup, import a backup, reload sample data
- Danger zone: delete all data (with confirmation)
- Account statistics panel

### Everywhere
- 🌗 **Light / dark mode** with LocalStorage persistence (no flash on reload)
- 🔔 Reusable toast notification system
- ♿ Semantic HTML, ARIA labels, keyboard-accessible modals with focus trap, visible focus states, skip link
- 📱 Fully responsive: desktop sidebar → mobile drawer navigation
- 🧭 Professional empty states everywhere (never a blank section)
- 🌱 Realistic sample dataset on first launch (all stats derived from it)

---

## 🛠️ Technologies Used

| Technology | Purpose |
|---|---|
| HTML5 | Semantic structure |
| CSS3 | Custom design system (variables, grid, flexbox, transitions) |
| JavaScript (ES6+) | Application logic, modules via IIFE namespaces |
| LocalStorage | Data persistence layer |
| [Chart.js 4](https://www.chartjs.org/) | The **only** external JS dependency |
| Google Fonts (Inter) | Typography |

---

## 📁 Project Structure

```
FinTrack/
│
├── index.html            # Dashboard
├── transactions.html     # Transaction management (CRUD + search/filter/sort)
├── budgets.html          # Monthly category budgets
├── reports.html          # Analytics & charts
├── settings.html         # Preferences & data management
│
├── css/
│   ├── style.css         # Design tokens, app shell, shared components
│   ├── dashboard.css     # Dashboard-specific styles
│   ├── transactions.css  # Transactions page styles
│   ├── budgets.css       # Budgets page styles
│   ├── reports.css       # Reports page styles
│   ├── settings.css      # Settings page styles
│   └── responsive.css    # Breakpoints & table→card transformation
│
├── js/
│   ├── storage.js        # LocalStorage layer + sample data + import/export
│   ├── app.js            # Shared shell: theme, nav, helpers, calculations, toasts, modals
│   ├── dashboard.js      # Dashboard widgets & charts
│   ├── transactions.js   # Transaction CRUD, search, filter, sort
│   ├── budgets.js        # Budget CRUD & progress
│   ├── reports.js        # Period-filtered analytics
│   └── settings.js       # Settings & data management
│
├── assets/
│   └── icons/
│       └── icons.svg     # SVG icon sprite
│
└── README.md
```

### Key JavaScript APIs

```js
// storage.js
FTStorage.getTransactions()          FTStorage.saveTransactions(list)
FTStorage.addTransaction(tx)         FTStorage.updateTransaction(id, patch)
FTStorage.deleteTransaction(id)      FTStorage.getTransaction(id)
FTStorage.getBudgets()               FTStorage.saveBudgets(list)
FTStorage.addBudget(b)               FTStorage.updateBudget(id, patch)
FTStorage.deleteBudget(id)           FTStorage.getSettings()
FTStorage.saveSettings(patch)        FTStorage.seedSampleData(force)
FTStorage.exportData()               FTStorage.importData(json)

// app.js
FT.computeTotals(transactions)       // { income, expenses, balance, savings, savingsRate }
FT.groupByCategory(list, type)       FT.monthlySeries(list, monthKeys)
FT.filterByPeriod(list, period)      FT.budgetProgress(budget, transactions)
FT.formatCurrency(value)             FT.formatDate(iso)
FT.toast(message, type)              FT.confirmAction({ title, message })
FT.renderChart(canvasId, config)     FT.emptyState({ title, message, actionLabel })
```

### Financial formulas

```
Balance      = Total Income − Total Expenses
Savings      = Total Income − Total Expenses
Savings Rate = Income > 0 ? ((Income − Expenses) / Income) × 100 : 0   // division-by-zero safe
Budget %     = Budget > 0 ? (Spent / Budget) × 100 : 0
```

---

## 🚀 How to Run the Project Locally

### Option 1 — Open directly
1. Download or clone the repository.
2. Double-click `index.html` (or open it in your browser).

### Option 2 — Local dev server (recommended)

```bash
# clone
git clone https://github.com/your-username/fintrack.git
cd fintrack

# any static server works:
python3 -m http.server 5500        # → http://localhost:5500
# or
npx serve .
# or use VS Code "Live Server" → Go Live
```

An internet connection is only required for the Chart.js CDN and the Inter web font; everything else works offline.

---

## 🌍 Deploying to GitHub Pages

1. Create a new GitHub repository (e.g. `fintrack`) and push the project:
   ```bash
   git init
   git add .
   git commit -m "feat: FinTrack personal finance dashboard"
   git branch -M main
   git remote add origin https://github.com/your-username/fintrack.git
   git push -u origin main
   ```
2. On GitHub open **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Select branch **`main`** and folder **`/ (root)`**, then click **Save**.
5. Wait ~1 minute — your site will be live at:
   `https://your-username.github.io/fintrack/`

> Because `index.html` sits in the repository root and all asset paths are relative, no extra configuration is required.

---

## 📸 Screenshots

| Screen | Preview |
|---|---|
| Dashboard (light) | `docs/screenshots/dashboard-light.png` |
| Dashboard (dark) | `docs/screenshots/dashboard-dark.png` |
| Transactions | `docs/screenshots/transactions.png` |
| Budgets | `docs/screenshots/budgets.png` |
| Reports | `docs/screenshots/reports.png` |
| Mobile view | `docs/screenshots/mobile.png` |

_Add your own captures to `docs/screenshots/` and they will render here:_

```markdown
![FinTrack Dashboard](docs/screenshots/dashboard-light.png)
```

---

## 🔮 Future Improvements

- Recurring transactions & scheduled bill reminders
- Savings goals with target dates and contribution tracking
- CSV / PDF export of reports
- Multi-account support (cash, bank, mobile wallet)
- Optional cloud sync (Firebase / Supabase)
- Multi-currency conversion with live exchange rates
- PWA support with offline caching and installability
- Charts for net-worth growth and cash-flow forecasting
- Unit tests for the calculation layer

---

## 👤 Author

**Your Name**
Frontend Developer

- Portfolio: [your-portfolio.com](https://your-portfolio.com)
- GitHub: [@your-username](https://github.com/your-username)
- LinkedIn: [/in/your-profile](https://linkedin.com/in/your-profile)

---

## 📄 License

Released under the [MIT License](https://opensource.org/licenses/MIT) — free to use, modify and learn from.

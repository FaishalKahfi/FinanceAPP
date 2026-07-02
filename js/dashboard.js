/* ============================================
   FinanceKu - Dashboard Module (Role-Based)
   ============================================ */

const Dashboard = {
  charts: {},
  _eventsBound: false,

  async init() {
    if (!this._eventsBound) {
      this.bindEvents();
      this._eventsBound = true;
    }
    this.setupRoleUI();
    await this.loadData();
  },

  bindEvents() {
    const yearFilter = document.getElementById('dashboard-year');
    if (yearFilter) {
      // Populate year options
      const currentYear = new Date().getFullYear();
      yearFilter.innerHTML = `<option value="">Semua Tahun</option>`;
      for (let y = currentYear; y >= currentYear - 5; y--) {
        yearFilter.innerHTML += `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`;
      }
      yearFilter.addEventListener('change', () => this.loadData());
    }

    // User filter change (admin)
    const userFilter = document.getElementById('dashboard-user-filter');
    if (userFilter) {
      userFilter.addEventListener('change', () => this.loadData());
    }
  },

  setupRoleUI() {
    const isAdmin = Auth.isAdmin();
    const filterGroup = document.getElementById('dashboard-user-filter-group');
    if (filterGroup) {
      filterGroup.classList.toggle('hidden', !isAdmin);
      if (isAdmin) {
        UI.populateUserSelect('dashboard-user-filter', true);
      }
    }
  },

  async loadData() {
    const userId = Auth.getUserId();
    if (!userId) return;

    const isAdmin = Auth.isAdmin();
    const year = document.getElementById('dashboard-year')?.value;
    const yearNum = year ? Number(year) : null;

    let data;
    if (isAdmin) {
      const filterUserId = document.getElementById('dashboard-user-filter')?.value;
      if (filterUserId) {
        // Admin filtering specific user
        data = await DB.getDashboardData(String(filterUserId), yearNum);
      } else {
        // Admin viewing all users
        data = await this.getAllUsersDashboardData(yearNum);
      }
    } else {
      // Regular user
      data = await DB.getDashboardData(userId, yearNum);
    }

    this.updateSummaryCards(data);
    this.updateCharts(data, year);
  },

  // Get aggregated dashboard data for all users (admin)
  async getAllUsersDashboardData(year) {
    const incomes = await DB.getAllIncomes();
    const expenses = await DB.getAllExpenses();

    const totalIncome = incomes.reduce((sum, i) => sum + Number(i.nominal), 0);
    const totalExpense = expenses.reduce((sum, e) => sum + Number(e.nominal), 0);
    const balance = totalIncome - totalExpense;

    const monthlyIncome = {};
    const monthlyExpense = {};
    
    // Category Breakdown & Advanced Analytics
    const expensesByCategory = {};
    const currentYearExpenses = [];

    incomes.forEach(item => {
      const d = new Date(item.tanggal);
      const itemYear = d.getFullYear();
      const itemMonth = d.getMonth();
      if (year && itemYear !== year) return;
      const key = `${itemYear}-${String(itemMonth + 1).padStart(2, '0')}`;
      monthlyIncome[key] = (monthlyIncome[key] || 0) + Number(item.nominal);
    });

    expenses.forEach(item => {
      const d = new Date(item.tanggal);
      const itemYear = d.getFullYear();
      const itemMonth = d.getMonth();
      if (year && itemYear !== year) return;
      
      const nominal = Number(item.nominal);
      const key = `${itemYear}-${String(itemMonth + 1).padStart(2, '0')}`;
      monthlyExpense[key] = (monthlyExpense[key] || 0) + nominal;
      
      // Group by category
      if (item.kategori) {
        expensesByCategory[item.kategori] = (expensesByCategory[item.kategori] || 0) + nominal;
      }
      
      // Store to get top 5 later
      currentYearExpenses.push(item);
    });
    
    // Get top 5 expenses by nominal
    currentYearExpenses.sort((a, b) => Number(b.nominal) - Number(a.nominal));
    const topExpenses = currentYearExpenses.slice(0, 5);

    return { totalIncome, totalExpense, balance, monthlyIncome, monthlyExpense, expensesByCategory, topExpenses };
  },

  updateSummaryCards(data) {
    const incomeEl = document.getElementById('total-income');
    const expenseEl = document.getElementById('total-expense');
    const balanceEl = document.getElementById('total-balance');

    if (incomeEl) incomeEl.textContent = UI.formatCurrency(data.totalIncome);
    if (expenseEl) expenseEl.textContent = UI.formatCurrency(data.totalExpense);
    if (balanceEl) balanceEl.textContent = UI.formatCurrency(data.balance);
  },

  updateCharts(data, selectedYear) {
    const year = selectedYear || new Date().getFullYear();

    // Build month labels and data arrays
    const labels = [];
    const incomeData = [];
    const expenseData = [];

    for (let m = 0; m < 12; m++) {
      labels.push(UI.getMonthShort(m));
      const key = `${year}-${String(m + 1).padStart(2, '0')}`;
      incomeData.push(data.monthlyIncome[key] || 0);
      expenseData.push(data.monthlyExpense[key] || 0);
    }

    this.renderIncomeChart(labels, incomeData);
    this.renderExpenseChart(labels, expenseData);
    this.renderComparisonChart(labels, incomeData, expenseData);
    
    // Render Advanced Analytics
    this.renderCategoryPieChart(data.expensesByCategory);
    this.renderTopExpenses(data.topExpenses);
  },

  renderIncomeChart(labels, data) {
    const ctx = document.getElementById('income-chart');
    if (!ctx) return;

    if (this.charts.income) this.charts.income.destroy();

    this.charts.income = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Pemasukan',
          data,
          backgroundColor: 'rgba(22, 163, 74, 0.7)',
          borderColor: '#16A34A',
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => UI.formatCurrency(ctx.raw)
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (val) => 'Rp ' + UI.formatNumber(val),
              font: { size: 11 }
            },
            grid: { color: 'rgba(0,0,0,0.05)' }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 } }
          }
        }
      }
    });
  },

  renderExpenseChart(labels, data) {
    const ctx = document.getElementById('expense-chart');
    if (!ctx) return;

    if (this.charts.expense) this.charts.expense.destroy();

    this.charts.expense = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Pengeluaran',
          data,
          backgroundColor: 'rgba(220, 38, 38, 0.7)',
          borderColor: '#DC2626',
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => UI.formatCurrency(ctx.raw)
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (val) => 'Rp ' + UI.formatNumber(val),
              font: { size: 11 }
            },
            grid: { color: 'rgba(0,0,0,0.05)' }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 } }
          }
        }
      }
    });
  },

  renderComparisonChart(labels, incomeData, expenseData) {
    const ctx = document.getElementById('comparison-chart');
    if (!ctx) return;

    if (this.charts.comparison) this.charts.comparison.destroy();

    this.charts.comparison = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Pemasukan',
            data: incomeData,
            borderColor: '#16A34A',
            backgroundColor: 'rgba(22, 163, 74, 0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#16A34A',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7
          },
          {
            label: 'Pengeluaran',
            data: expenseData,
            borderColor: '#DC2626',
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#DC2626',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { size: 12, weight: '600' }, usePointStyle: true, padding: 16 }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${UI.formatCurrency(ctx.raw)}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (val) => 'Rp ' + UI.formatNumber(val),
              font: { size: 11 }
            },
            grid: { color: 'rgba(0,0,0,0.05)' }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 } }
          }
        }
      }
    });
  },

  renderCategoryPieChart(categoriesData) {
    const ctx = document.getElementById('expense-pie-chart');
    if (!ctx) return;

    if (this.charts.categoryPie) this.charts.categoryPie.destroy();

    const labels = Object.keys(categoriesData || {});
    const data = Object.values(categoriesData || {});

    // Provide default empty state if no data
    if (labels.length === 0) {
      this.charts.categoryPie = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['Belum ada pengeluaran'], datasets: [{ data: [1], backgroundColor: ['#E5E7EB'] }] },
        options: { plugins: { tooltip: { enabled: false }, legend: { position: 'bottom' } }, cutout: '70%'}
      });
      return;
    }

    // Dynamic color palette
    const colors = ['#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#EC4899', '#F43F5E', '#8B5CF6', '#14B8A6'];

    this.charts.categoryPie = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'right',
            labels: { boxWidth: 12, font: { size: 11 }, usePointStyle: true }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${UI.formatCurrency(ctx.raw)}`
            }
          }
        }
      }
    });
  },

  renderTopExpenses(expenses) {
    const container = document.getElementById('top-expenses-list');
    if (!container) return;

    if (!expenses || expenses.length === 0) {
      container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--gray-500); font-size: 0.875rem;">Belum ada pengeluaran di periode ini.</div>`;
      return;
    }

    let html = '';
    expenses.forEach(item => {
      html += `
        <div class="top-expense-item">
          <div class="top-expense-info">
            <div class="top-expense-cat">${item.kategori || 'Tanpa Kategori'}</div>
            <div class="top-expense-date">${UI.formatDateFull(item.tanggal)}</div>
          </div>
          <div class="top-expense-amount">
            ${UI.formatCurrency(item.nominal)}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }
};

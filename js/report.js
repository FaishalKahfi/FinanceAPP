/* ============================================
   FinanceKu - Report Module (Role-Based)
   General Ledger, Laba Rugi, Arus Kas
   ============================================ */

const Report = {
  currentTab: 'ledger',
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
    // Tab navigation
    document.querySelectorAll('.report-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Filter
    const filterBtn = document.getElementById('report-filter-btn');
    if (filterBtn) {
      filterBtn.addEventListener('click', () => this.loadData());
    }

    // Export buttons
    const exportPdfBtn = document.getElementById('report-export-pdf');
    if (exportPdfBtn) {
      exportPdfBtn.addEventListener('click', () => ExportUtil.exportReportPDF(this.currentTab));
    }

    const exportExcelBtn = document.getElementById('report-export-excel');
    if (exportExcelBtn) {
      exportExcelBtn.addEventListener('click', () => ExportUtil.exportReportExcel(this.currentTab));
    }
  },

  setupRoleUI() {
    const isAdmin = Auth.isAdmin();
    const filterGroup = document.getElementById('report-user-filter-group');
    if (filterGroup) {
      filterGroup.classList.toggle('hidden', !isAdmin);
      if (isAdmin) {
        UI.populateUserSelect('report-user-filter', true);
      }
    }
  },

  switchTab(tab) {
    this.currentTab = tab;

    // Update tab buttons
    document.querySelectorAll('.report-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Update tab contents
    document.querySelectorAll('.report-tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `report-${tab}`);
    });

    this.loadData();
  },

  getFilters() {
    const startDate = document.getElementById('report-filter-start')?.value;
    const endDate = document.getElementById('report-filter-end')?.value;
    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    return filters;
  },

  async loadData() {
    const userId = Auth.getUserId();
    if (!userId) return;

    const isAdmin = Auth.isAdmin();
    const filters = this.getFilters();

    let incomes, expenses;

    if (isAdmin) {
      const filterUserId = document.getElementById('report-user-filter')?.value;
      if (filterUserId) {
        incomes = await DB.getIncomes(String(filterUserId), filters);
        expenses = await DB.getExpenses(String(filterUserId), filters);
      } else {
        incomes = await DB.getAllIncomes(filters);
        expenses = await DB.getAllExpenses(filters);
      }
    } else {
      incomes = await DB.getIncomes(userId, filters);
      expenses = await DB.getExpenses(userId, filters);
    }

    switch (this.currentTab) {
      case 'ledger':
        this.renderLedger(incomes, expenses);
        break;
      case 'profitloss':
        this.renderProfitLoss(incomes, expenses);
        break;
      case 'cashflow':
        this.renderCashFlow(incomes, expenses);
        break;
    }
  },

  // ---- General Ledger ----
  renderLedger(incomes, expenses) {
    const tbody = document.getElementById('ledger-table-body');
    if (!tbody) return;

    // Combine and sort by date
    const transactions = [
      ...incomes.map(i => ({ ...i, type: 'income' })),
      ...expenses.map(e => ({ ...e, type: 'expense' }))
    ].sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

    if (transactions.length === 0) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="6">${UI.emptyState('fa-book', 'Buku besar kosong', 'Belum ada transaksi untuk ditampilkan')}</td></tr>`;
      return;
    }

    let saldo = 0;
    tbody.innerHTML = transactions.map(item => {
      const debit = item.type === 'income' ? Number(item.nominal) : 0;
      const kredit = item.type === 'expense' ? Number(item.nominal) : 0;
      saldo += debit - kredit;

      const desc = `${item.kategori} - ${item.keterangan || item.akun}`;

      return `
        <tr>
          <td data-label="Tanggal">${UI.formatDate(item.tanggal)}</td>
          <td data-label="Deskripsi">${desc}</td>
          <td data-label="Debit" class="text-right ${debit > 0 ? 'amount-income' : ''}">${debit > 0 ? UI.formatCurrency(debit) : '-'}</td>
          <td data-label="Kredit" class="text-right ${kredit > 0 ? 'amount-expense' : ''}">${kredit > 0 ? UI.formatCurrency(kredit) : '-'}</td>
          <td data-label="Saldo" class="text-right amount-balance">${UI.formatCurrency(saldo)}</td>
          <td data-label="Akun"><span class="badge ${item.type === 'income' ? 'badge-income' : 'badge-expense'}">${item.akun}</span></td>
        </tr>
      `;
    }).join('');

    // Totals
    const totalDebit = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.nominal), 0);
    const totalKredit = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.nominal), 0);

    tbody.innerHTML += `
      <tr class="report-total-row">
        <td colspan="2" class="text-right hide-on-mobile"><strong>TOTAL</strong></td>
        <td data-label="Total Debit" class="text-right amount-income full-on-mobile"><strong>${UI.formatCurrency(totalDebit)}</strong></td>
        <td data-label="Total Kredit" class="text-right amount-expense full-on-mobile"><strong>${UI.formatCurrency(totalKredit)}</strong></td>
        <td data-label="Saldo Akhir" class="text-right amount-balance full-on-mobile"><strong>${UI.formatCurrency(saldo)}</strong></td>
        <td class="hide-on-mobile"></td>
      </tr>
    `;
  },

  // ---- Laba Rugi (Income Statement) ----
  renderProfitLoss(incomes, expenses) {
    const container = document.getElementById('profitloss-content');
    if (!container) return;

    // Group incomes by category
    const incomeByCategory = {};
    incomes.forEach(i => {
      incomeByCategory[i.kategori] = (incomeByCategory[i.kategori] || 0) + Number(i.nominal);
    });

    // Group expenses by category
    const expenseByCategory = {};
    expenses.forEach(e => {
      expenseByCategory[e.kategori] = (expenseByCategory[e.kategori] || 0) + Number(e.nominal);
    });

    const totalIncome = incomes.reduce((s, i) => s + Number(i.nominal), 0);
    const totalExpense = expenses.reduce((s, e) => s + Number(e.nominal), 0);
    const netProfit = totalIncome - totalExpense;

    let html = `
      <table class="data-table" id="profitloss-table">
        <thead>
          <tr>
            <th>Keterangan</th>
            <th class="text-right">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          <tr><td colspan="2" style="background:var(--success-50);color:var(--success-600);font-weight:700;padding:12px 16px;">
            <i class="fas fa-arrow-down"></i> PENDAPATAN
          </td></tr>
    `;

    Object.entries(incomeByCategory).forEach(([cat, amount]) => {
      html += `<tr><td data-label="Kategori" style="padding-left:32px">${cat}</td><td data-label="Jumlah" class="text-right amount-income">${UI.formatCurrency(amount)}</td></tr>`;
    });

    html += `
      <tr class="report-total-row">
        <td class="text-right hide-on-mobile"><strong>Total Pendapatan</strong></td>
        <td data-label="Total Pendapatan" class="text-right amount-income full-on-mobile"><strong>${UI.formatCurrency(totalIncome)}</strong></td>
      </tr>
      <tr><td colspan="2" style="background:var(--danger-50);color:var(--danger-600);font-weight:700;padding:12px 16px;">
        <i class="fas fa-arrow-up"></i> BEBAN / PENGELUARAN
      </td></tr>
    `;

    Object.entries(expenseByCategory).forEach(([cat, amount]) => {
      html += `<tr><td data-label="Kategori" style="padding-left:32px">${cat}</td><td data-label="Jumlah" class="text-right amount-expense">${UI.formatCurrency(amount)}</td></tr>`;
    });

    html += `
      <tr class="report-total-row">
        <td class="text-right hide-on-mobile"><strong>Total Beban</strong></td>
        <td data-label="Total Beban" class="text-right amount-expense full-on-mobile"><strong>${UI.formatCurrency(totalExpense)}</strong></td>
      </tr>
      <tr style="background:${netProfit >= 0 ? 'var(--success-50)' : 'var(--danger-50)'}" class="report-total-row">
        <td class="hide-on-mobile" style="font-weight:800;font-size:1rem;padding:16px;">
          ${netProfit >= 0 ? '📈 LABA BERSIH' : '📉 RUGI BERSIH'}
        </td>
        <td data-label="${netProfit >= 0 ? 'LABA BERSIH' : 'RUGI BERSIH'}" class="text-right full-on-mobile" style="font-weight:800;font-size:1.125rem;color:${netProfit >= 0 ? 'var(--success-600)' : 'var(--danger-600)'}">
          ${UI.formatCurrency(Math.abs(netProfit))}
        </td>
      </tr>
      </tbody></table>
    `;

    if (totalIncome === 0 && totalExpense === 0) {
      container.innerHTML = UI.emptyState('fa-chart-bar', 'Belum ada data', 'Tambahkan transaksi untuk melihat laporan laba rugi');
    } else {
      container.innerHTML = html;
    }
  },

  // ---- Arus Kas (Cash Flow) ----
  renderCashFlow(incomes, expenses) {
    const container = document.getElementById('cashflow-content');
    if (!container) return;

    // Group by account
    const accountFlow = {};

    incomes.forEach(i => {
      if (!accountFlow[i.akun]) accountFlow[i.akun] = { inflow: 0, outflow: 0 };
      accountFlow[i.akun].inflow += Number(i.nominal);
    });

    expenses.forEach(e => {
      if (!accountFlow[e.akun]) accountFlow[e.akun] = { inflow: 0, outflow: 0 };
      accountFlow[e.akun].outflow += Number(e.nominal);
    });

    const totalInflow = incomes.reduce((s, i) => s + Number(i.nominal), 0);
    const totalOutflow = expenses.reduce((s, e) => s + Number(e.nominal), 0);
    const netFlow = totalInflow - totalOutflow;

    if (totalInflow === 0 && totalOutflow === 0) {
      container.innerHTML = UI.emptyState('fa-exchange-alt', 'Belum ada data', 'Tambahkan transaksi untuk melihat laporan arus kas');
      return;
    }

    let html = `
      <table class="data-table" id="cashflow-table">
        <thead>
          <tr>
            <th>Akun</th>
            <th class="text-right">Kas Masuk</th>
            <th class="text-right">Kas Keluar</th>
            <th class="text-right">Arus Kas Bersih</th>
          </tr>
        </thead>
        <tbody>
    `;

    Object.entries(accountFlow).forEach(([akun, flow]) => {
      const net = flow.inflow - flow.outflow;
      html += `
        <tr>
          <td data-label="Akun"><strong>${akun}</strong></td>
          <td data-label="Kas Masuk" class="text-right amount-income">${UI.formatCurrency(flow.inflow)}</td>
          <td data-label="Kas Keluar" class="text-right amount-expense">${UI.formatCurrency(flow.outflow)}</td>
          <td data-label="Arus Kas Bersih" class="text-right ${net >= 0 ? 'amount-income' : 'amount-expense'}">${UI.formatCurrency(net)}</td>
        </tr>
      `;
    });

    html += `
      <tr class="report-total-row">
        <td class="hide-on-mobile"><strong>TOTAL</strong></td>
        <td data-label="Total Masuk" class="text-right amount-income full-on-mobile"><strong>${UI.formatCurrency(totalInflow)}</strong></td>
        <td data-label="Total Keluar" class="text-right amount-expense full-on-mobile"><strong>${UI.formatCurrency(totalOutflow)}</strong></td>
        <td data-label="Total Arus Kas" class="text-right full-on-mobile" style="font-weight:800;color:${netFlow >= 0 ? 'var(--success-600)' : 'var(--danger-600)'}">
          <strong>${UI.formatCurrency(netFlow)}</strong>
        </td>
      </tr>
      </tbody></table>
    `;

    container.innerHTML = html;
  }
};

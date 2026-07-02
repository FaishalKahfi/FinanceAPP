/* ============================================
   FinanceKu - Expense Module (Role-Based)
   ============================================ */

const Expense = {
  editingId: null,
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
    const addBtn = document.getElementById('add-expense-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.openForm());
    }

    const form = document.getElementById('expense-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    const cancelBtn = document.getElementById('expense-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => UI.hideModal('expense-modal'));
    }

    const filterBtn = document.getElementById('expense-filter-btn');
    if (filterBtn) {
      filterBtn.addEventListener('click', () => this.loadData());
    }

    // User select change (admin) - update target label
    const userSelect = document.getElementById('expense-user-select');
    if (userSelect) {
      userSelect.addEventListener('change', () => {
        const label = document.getElementById('expense-target-label');
        const selected = userSelect.options[userSelect.selectedIndex];
        if (selected && selected.value) {
          label.innerHTML = `<i class="fas fa-info-circle"></i> Input untuk: ${selected.text}`;
        } else {
          label.textContent = '';
        }
      });
    }
  },

  // Setup role-based UI visibility
  setupRoleUI() {
    const isAdmin = Auth.isAdmin();

    // Show/hide user filter in list page
    const filterGroup = document.getElementById('expense-user-filter-group');
    if (filterGroup) {
      filterGroup.classList.toggle('hidden', !isAdmin);
      if (isAdmin) {
        UI.populateUserSelect('expense-user-filter', true);
      }
    }

    // Show/hide user column header in table
    const thUser = document.getElementById('expense-th-user');
    if (thUser) {
      thUser.classList.toggle('hidden', !isAdmin);
    }

    // Update page subtitle
    const subtitle = document.getElementById('expense-page-subtitle');
    if (subtitle) {
      subtitle.textContent = isAdmin
        ? 'Kelola data pengeluaran semua user (Admin Mode)'
        : 'Kelola semua data pengeluaran Anda';
    }
  },

  async openForm(id = null) {
    this.editingId = id;
    const form = document.getElementById('expense-form');
    const title = document.getElementById('expense-modal-title');
    const isAdmin = Auth.isAdmin();

    await UI.populateCategorySelect('expense-kategori', 'expense');
    await UI.populateAccountSelect('expense-akun');

    // Admin: show user select
    const userSelectGroup = document.getElementById('expense-user-select-group');
    const targetLabel = document.getElementById('expense-target-label');

    if (isAdmin) {
      userSelectGroup.classList.remove('hidden');
      await UI.populateUserSelect('expense-user-select', false);
    } else {
      userSelectGroup.classList.add('hidden');
    }

    if (id) {
      title.textContent = 'Edit Pengeluaran';
      const item = await DB.getExpenseById(id);
      if (item) {
        document.getElementById('expense-tanggal').value = item.tanggal;
        document.getElementById('expense-kategori').value = item.kategori;
        document.getElementById('expense-akun').value = item.akun;
        UI.setNominalValue('expense-nominal', item.nominal);
        document.getElementById('expense-keterangan').value = item.keterangan || '';

        // Admin: set the user select to the item's owner
        if (isAdmin) {
          const userSelect = document.getElementById('expense-user-select');
          userSelect.value = String(item.user_id);
          userSelect.dispatchEvent(new Event('change'));
        }
      }
    } else {
      title.textContent = 'Tambah Pengeluaran';
      form.reset();
      document.getElementById('expense-tanggal').value = UI.today();

      // Admin: default to current user
      if (isAdmin) {
        const userSelect = document.getElementById('expense-user-select');
        userSelect.value = String(Auth.getUserId());
        userSelect.dispatchEvent(new Event('change'));
      }

      if (targetLabel) targetLabel.textContent = '';
    }

    UI.showModal('expense-modal');
  },

  async handleSubmit(e) {
    e.preventDefault();

    const tanggal = document.getElementById('expense-tanggal').value;
    const kategori = document.getElementById('expense-kategori').value;
    const akun = document.getElementById('expense-akun').value;
    const nominal = UI.parseNominal(document.getElementById('expense-nominal').value);
    const keterangan = document.getElementById('expense-keterangan').value.trim();

    if (!tanggal || !kategori || !akun || !nominal) {
      UI.error('Semua field wajib diisi');
      return;
    }

    if (isNaN(nominal) || nominal <= 0) {
      UI.error('Nominal harus berupa angka positif');
      return;
    }

    // ---- Role-Based user_id ----
    let user_id;
    if (Auth.isAdmin()) {
      const selectedUserId = document.getElementById('expense-user-select').value;
      if (!selectedUserId) {
        UI.error('Pilih user terlebih dahulu');
        return;
      }
      user_id = String(selectedUserId);
    } else {
      // Force user_id to current user (security)
      user_id = Auth.getUserId();
    }

    const data = {
      user_id,
      tanggal,
      kategori,
      akun,
      nominal,
      keterangan,
      updatedAt: new Date().toISOString()
    };

    try {
      if (this.editingId) {
        await DB.updateExpense(this.editingId, data);
        UI.success('Pengeluaran berhasil diperbarui');
      } else {
        data.createdAt = new Date().toISOString();
        await DB.addExpense(data);
        UI.success('Pengeluaran berhasil ditambahkan');
      }

      UI.hideModal('expense-modal');
      this.editingId = null;
      await this.loadData();
    } catch (err) {
      UI.error('Gagal menyimpan data: ' + err.message);
    }
  },

  async deleteItem(id) {
    const confirmed = await UI.confirm('Hapus data pengeluaran ini?', 'Data yang dihapus tidak dapat dikembalikan.');
    if (!confirmed) return;

    try {
      await DB.deleteExpense(id);
      UI.success('Data pengeluaran dihapus');
      await this.loadData();
    } catch (err) {
      UI.error('Gagal menghapus data');
    }
  },

  async loadData() {
    const userId = Auth.getUserId();
    if (!userId) return;

    const isAdmin = Auth.isAdmin();
    const filters = this.getFilters();

    let data;
    if (isAdmin) {
      // Admin: get filtered by user, or all
      const filterUserId = document.getElementById('expense-user-filter')?.value;
      if (filterUserId) {
        data = await DB.getExpenses(String(filterUserId), filters);
      } else {
        data = await DB.getAllExpenses(filters);
      }
    } else {
      // User: own data only
      data = await DB.getExpenses(userId, filters);
    }

    await this.renderTable(data);
  },

  getFilters() {
    const startDate = document.getElementById('expense-filter-start')?.value;
    const endDate = document.getElementById('expense-filter-end')?.value;
    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    return filters;
  },

  async renderTable(data) {
    const tbody = document.getElementById('expense-table-body');
    if (!tbody) return;
    const isAdmin = Auth.isAdmin();
    const colSpan = isAdmin ? 8 : 7;

    if (data.length === 0) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="${colSpan}">${UI.emptyState('fa-arrow-up', 'Belum ada pengeluaran', 'Klik tombol "Tambah" untuk menambah data pengeluaran')}</td></tr>`;
      return;
    }

    // Pre-load user names for admin view
    let userNames = {};
    if (isAdmin) {
      const users = await DB.getAllUsers();
      users.forEach(u => { userNames[u.id] = u.fullName || u.username; });
    }

    let total = 0;
    tbody.innerHTML = data.map((item, idx) => {
      total += Number(item.nominal);
      const userCol = isAdmin
        ? `<td data-label="User"><span class="user-badge-cell"><i class="fas fa-user"></i> ${userNames[item.user_id] || 'Unknown'}</span></td>`
        : '';
      return `
        <tr>
          <td data-label="#">${idx + 1}</td>
          <td data-label="Tanggal">${UI.formatDate(item.tanggal)}</td>
          ${userCol}
          <td data-label="Kategori"><span class="badge badge-expense">${item.kategori}</span></td>
          <td data-label="Akun">${item.akun}</td>
          <td data-label="Nominal" class="text-right amount-expense">${UI.formatCurrency(item.nominal)}</td>
          <td data-label="Keterangan">${item.keterangan || '-'}</td>
          <td data-label="Aksi" class="text-center">
            <div class="btn-group" style="justify-content:center">
              <button class="btn btn-ghost btn-icon" onclick="Expense.openForm('${item.id}')" title="Edit">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-ghost btn-icon" onclick="Expense.deleteItem('${item.id}')" title="Hapus" style="color:var(--danger-500)">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Total row
    const totalColSpan = isAdmin ? 5 : 4;
    tbody.innerHTML += `
      <tr class="report-total-row">
        <td colspan="${totalColSpan}" class="text-right hide-on-mobile"><strong>Total Pengeluaran</strong></td>
        <td data-label="Total Pengeluaran" class="text-right amount-expense full-on-mobile"><strong>${UI.formatCurrency(total)}</strong></td>
        <td colspan="2" class="hide-on-mobile"></td>
      </tr>
    `;
  }
};

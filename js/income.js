/* ============================================
   FinanceKu - Income Module (Role-Based)
   ============================================ */

const Income = {
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
    // Add button
    const addBtn = document.getElementById('add-income-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.openForm());
    }

    // Form submit
    const form = document.getElementById('income-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    // Cancel button
    const cancelBtn = document.getElementById('income-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => UI.hideModal('income-modal'));
    }

    // Filters
    const filterBtn = document.getElementById('income-filter-btn');
    if (filterBtn) {
      filterBtn.addEventListener('click', () => this.loadData());
    }

    // User select change (admin) - update target label
    const userSelect = document.getElementById('income-user-select');
    if (userSelect) {
      userSelect.addEventListener('change', () => {
        const label = document.getElementById('income-target-label');
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
    const filterGroup = document.getElementById('income-user-filter-group');
    if (filterGroup) {
      filterGroup.classList.toggle('hidden', !isAdmin);
      if (isAdmin) {
        UI.populateUserSelect('income-user-filter', true);
      }
    }

    // Show/hide user column header in table
    const thUser = document.getElementById('income-th-user');
    if (thUser) {
      thUser.classList.toggle('hidden', !isAdmin);
    }

    // Update page subtitle
    const subtitle = document.getElementById('income-page-subtitle');
    if (subtitle) {
      subtitle.textContent = isAdmin
        ? 'Kelola data pemasukan semua user (Admin Mode)'
        : 'Kelola semua data pemasukan Anda';
    }
  },

  async openForm(id = null) {
    this.editingId = id;
    const form = document.getElementById('income-form');
    const title = document.getElementById('income-modal-title');
    const isAdmin = Auth.isAdmin();

    // Populate selects
    await UI.populateCategorySelect('income-kategori', 'income');
    await UI.populateAccountSelect('income-akun');

    // Admin: show user select
    const userSelectGroup = document.getElementById('income-user-select-group');
    const targetLabel = document.getElementById('income-target-label');

    if (isAdmin) {
      userSelectGroup.classList.remove('hidden');
      await UI.populateUserSelect('income-user-select', false);
    } else {
      userSelectGroup.classList.add('hidden');
    }

    if (id) {
      title.textContent = 'Edit Pemasukan';
      const item = await DB.getIncomeById(id);
      if (item) {
        document.getElementById('income-tanggal').value = item.tanggal;
        document.getElementById('income-kategori').value = item.kategori;
        document.getElementById('income-akun').value = item.akun;
        UI.setNominalValue('income-nominal', item.nominal);
        document.getElementById('income-keterangan').value = item.keterangan || '';

        // Admin: set the user select to the item's owner
        if (isAdmin) {
          const userSelect = document.getElementById('income-user-select');
          userSelect.value = String(item.user_id);
          // Trigger change to update label
          userSelect.dispatchEvent(new Event('change'));
        }
      }
    } else {
      title.textContent = 'Tambah Pemasukan';
      form.reset();
      document.getElementById('income-tanggal').value = UI.today();

      // Admin: default to current user
      if (isAdmin) {
        const userSelect = document.getElementById('income-user-select');
        userSelect.value = String(Auth.getUserId());
        userSelect.dispatchEvent(new Event('change'));
      }

      if (targetLabel) targetLabel.textContent = '';
    }

    UI.showModal('income-modal');
  },

  async handleSubmit(e) {
    e.preventDefault();

    const tanggal = document.getElementById('income-tanggal').value;
    const kategori = document.getElementById('income-kategori').value;
    const akun = document.getElementById('income-akun').value;
    const nominal = UI.parseNominal(document.getElementById('income-nominal').value);
    const keterangan = document.getElementById('income-keterangan').value.trim();

    // Validation
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
      const selectedUserId = document.getElementById('income-user-select').value;
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
        await DB.updateIncome(this.editingId, data);
        UI.success('Pemasukan berhasil diperbarui');
      } else {
        data.createdAt = new Date().toISOString();
        await DB.addIncome(data);
        UI.success('Pemasukan berhasil ditambahkan');
      }

      UI.hideModal('income-modal');
      this.editingId = null;
      await this.loadData();
    } catch (err) {
      UI.error('Gagal menyimpan data: ' + err.message);
    }
  },

  async deleteItem(id) {
    const confirmed = await UI.confirm('Hapus data pemasukan ini?', 'Data yang dihapus tidak dapat dikembalikan.');
    if (!confirmed) return;

    try {
      await DB.deleteIncome(id);
      UI.success('Data pemasukan dihapus');
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
      const filterUserId = document.getElementById('income-user-filter')?.value;
      if (filterUserId) {
        data = await DB.getIncomes(String(filterUserId), filters);
      } else {
        data = await DB.getAllIncomes(filters);
      }
    } else {
      // User: own data only
      data = await DB.getIncomes(userId, filters);
    }

    await this.renderTable(data);
  },

  getFilters() {
    const startDate = document.getElementById('income-filter-start')?.value;
    const endDate = document.getElementById('income-filter-end')?.value;
    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    return filters;
  },

  async renderTable(data) {
    const tbody = document.getElementById('income-table-body');
    if (!tbody) return;
    const isAdmin = Auth.isAdmin();
    const colSpan = isAdmin ? 8 : 7;

    if (data.length === 0) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="${colSpan}">${UI.emptyState('fa-arrow-down', 'Belum ada pemasukan', 'Klik tombol "Tambah" untuk menambah data pemasukan')}</td></tr>`;
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
          <td data-label="Kategori"><span class="badge badge-income">${item.kategori}</span></td>
          <td data-label="Akun">${item.akun}</td>
          <td data-label="Nominal" class="text-right amount-income">${UI.formatCurrency(item.nominal)}</td>
          <td data-label="Keterangan">${item.keterangan || '-'}</td>
          <td data-label="Aksi" class="text-center">
            <div class="btn-group" style="justify-content:center">
              <button class="btn btn-ghost btn-icon" onclick="Income.openForm('${item.id}')" title="Edit">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-ghost btn-icon" onclick="Income.deleteItem('${item.id}')" title="Hapus" style="color:var(--danger-500)">
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
        <td colspan="${totalColSpan}" class="text-right hide-on-mobile"><strong>Total Pemasukan</strong></td>
        <td data-label="Total Pemasukan" class="text-right amount-income full-on-mobile"><strong>${UI.formatCurrency(total)}</strong></td>
        <td colspan="2" class="hide-on-mobile"></td>
      </tr>
    `;
  }
};

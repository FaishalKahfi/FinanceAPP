/* ============================================
   FinanceKu - Account Module
   ============================================ */

const Account = {
  editingId: null,
  _eventsBound: false,

  async init() {
    if (!this._eventsBound) {
      this.bindEvents();
      this._eventsBound = true;
    }
    await this.loadData();
  },

  bindEvents() {
    const addBtn = document.getElementById('add-account-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.openForm());
    }

    const form = document.getElementById('account-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    const cancelBtn = document.getElementById('account-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => UI.hideModal('account-modal'));
    }
  },

  async openForm(id = null) {
    this.editingId = id;
    const form = document.getElementById('account-form');
    const title = document.getElementById('account-modal-title');

    if (id) {
      title.textContent = 'Edit Akun';
      const item = await DB.getAccountById(id);
      if (item) {
        document.getElementById('account-name').value = item.name;
        document.getElementById('account-type').value = item.type;
      }
    } else {
      title.textContent = 'Tambah Akun';
      form.reset();
    }

    UI.showModal('account-modal');
  },

  async handleSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('account-name').value.trim();
    const type = document.getElementById('account-type').value;

    if (!name || !type) {
      UI.error('Semua field wajib diisi');
      return;
    }

    const data = { name, type };

    try {
      if (this.editingId) {
        await DB.updateAccount(this.editingId, data);
        UI.success('Akun berhasil diperbarui');
      } else {
        await DB.addAccount(data);
        UI.success('Akun berhasil ditambahkan');
      }

      UI.hideModal('account-modal');
      this.editingId = null;
      await this.loadData();
    } catch (err) {
      UI.error('Gagal menyimpan akun: ' + err.message);
    }
  },

  async deleteItem(id) {
    const confirmed = await UI.confirm('Hapus akun ini?', 'Akun yang sudah digunakan pada transaksi tetap akan tersimpan.');
    if (!confirmed) return;

    try {
      await DB.deleteAccount(id);
      UI.success('Akun dihapus');
      await this.loadData();
    } catch (err) {
      UI.error('Gagal menghapus akun');
    }
  },

  async loadData() {
    const data = await DB.getAccounts();
    this.renderTable(data);
  },

  getTypeLabel(type) {
    const labels = { cash: 'Kas', bank: 'Bank', 'e-wallet': 'E-Wallet' };
    return labels[type] || type;
  },

  getTypeIcon(type) {
    const icons = { cash: 'fa-wallet', bank: 'fa-university', 'e-wallet': 'fa-mobile-alt' };
    return icons[type] || 'fa-piggy-bank';
  },

  renderTable(data) {
    const tbody = document.getElementById('account-table-body');
    if (!tbody) return;

    if (data.length === 0) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="4">${UI.emptyState('fa-university', 'Belum ada akun', 'Klik tombol "Tambah" untuk menambah akun')}</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map((item, idx) => `
      <tr>
        <td data-label="#">${idx + 1}</td>
        <td data-label="Nama Akun">
          <div class="d-flex align-center gap-1">
            <i class="fas ${this.getTypeIcon(item.type)}" style="color:var(--primary-500)"></i>
            <strong>${item.name}</strong>
          </div>
        </td>
        <td data-label="Tipe"><span class="badge badge-primary">${this.getTypeLabel(item.type)}</span></td>
        <td data-label="Aksi" class="text-center">
          <div class="btn-group" style="justify-content:center">
            <button class="btn btn-ghost btn-icon" onclick="Account.openForm('${item.id}')" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-ghost btn-icon" onclick="Account.deleteItem('${item.id}')" title="Hapus" style="color:var(--danger-500)">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }
};

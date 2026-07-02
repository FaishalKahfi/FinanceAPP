/* ============================================
   FinanceKu - Category Module
   ============================================ */

const Category = {
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
    const addBtn = document.getElementById('add-category-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.openForm());
    }

    const form = document.getElementById('category-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    const cancelBtn = document.getElementById('category-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => UI.hideModal('category-modal'));
    }
  },

  async openForm(id = null) {
    this.editingId = id;
    const form = document.getElementById('category-form');
    const title = document.getElementById('category-modal-title');

    if (id) {
      title.textContent = 'Edit Kategori';
      const item = await DB.getCategoryById(id);
      if (item) {
        document.getElementById('category-name').value = item.name;
        document.getElementById('category-type').value = item.type;
      }
    } else {
      title.textContent = 'Tambah Kategori';
      form.reset();
    }

    UI.showModal('category-modal');
  },

  async handleSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('category-name').value.trim();
    const type = document.getElementById('category-type').value;

    if (!name || !type) {
      UI.error('Semua field wajib diisi');
      return;
    }

    const data = { name, type };

    try {
      if (this.editingId) {
        await DB.updateCategory(this.editingId, data);
        UI.success('Kategori berhasil diperbarui');
      } else {
        await DB.addCategory(data);
        UI.success('Kategori berhasil ditambahkan');
      }

      UI.hideModal('category-modal');
      this.editingId = null;
      await this.loadData();
    } catch (err) {
      UI.error('Gagal menyimpan kategori: ' + err.message);
    }
  },

  async deleteItem(id) {
    const confirmed = await UI.confirm('Hapus kategori ini?', 'Kategori yang sudah digunakan pada transaksi tetap akan tersimpan.');
    if (!confirmed) return;

    try {
      await DB.deleteCategory(id);
      UI.success('Kategori dihapus');
      await this.loadData();
    } catch (err) {
      UI.error('Gagal menghapus kategori');
    }
  },

  async loadData() {
    const data = await DB.getCategories();
    this.renderTable(data);
  },

  renderTable(data) {
    const tbody = document.getElementById('category-table-body');
    if (!tbody) return;

    if (data.length === 0) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="4">${UI.emptyState('fa-tags', 'Belum ada kategori', 'Klik tombol "Tambah" untuk menambah kategori')}</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map((item, idx) => `
      <tr>
        <td data-label="#">${idx + 1}</td>
        <td data-label="Nama Kategori"><strong>${item.name}</strong></td>
        <td data-label="Tipe">
          <span class="badge ${item.type === 'income' ? 'badge-income' : 'badge-expense'}">
            <i class="fas ${item.type === 'income' ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>
            ${item.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
          </span>
        </td>
        <td data-label="Aksi" class="text-center">
          <div class="btn-group" style="justify-content:center">
            <button class="btn btn-ghost btn-icon" onclick="Category.openForm('${item.id}')" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-ghost btn-icon" onclick="Category.deleteItem('${item.id}')" title="Hapus" style="color:var(--danger-500)">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }
};

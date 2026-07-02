/* ============================================
   FinanceKu - UI Module
   ============================================ */

const UI = {
  // ---- Toast Notifications ----
  toast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };

    toast.innerHTML = `
      <i class="fas ${icons[type] || icons.info}"></i>
      <span>${message}</span>
      <button class="toast-close" onclick="this.parentElement.classList.add('toast-exit'); setTimeout(() => this.parentElement.remove(), 300)">
        <i class="fas fa-times"></i>
      </button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  success(msg) { this.toast(msg, 'success'); },
  error(msg) { this.toast(msg, 'error', 4000); },
  warning(msg) { this.toast(msg, 'warning'); },
  info(msg) { this.toast(msg, 'info'); },

  // ---- Loading Spinner ----
  showLoading() {
    document.getElementById('loading-overlay').classList.add('active');
  },

  hideLoading() {
    document.getElementById('loading-overlay').classList.remove('active');
  },

  // ---- Modal ----
  showModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  hideModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  hideAllModals() {
    document.querySelectorAll('.modal-overlay.active').forEach(m => {
      m.classList.remove('active');
    });
    document.body.style.overflow = '';
  },

  // ---- Confirm Dialog ----
  confirm(message, subtext = '') {
    return new Promise((resolve) => {
      const overlay = document.getElementById('confirm-modal');
      document.getElementById('confirm-text').textContent = message;
      document.getElementById('confirm-subtext').textContent = subtext;

      const confirmBtn = document.getElementById('confirm-yes-btn');
      const cancelBtn = document.getElementById('confirm-no-btn');

      const cleanup = () => {
        this.hideModal('confirm-modal');
        confirmBtn.removeEventListener('click', onConfirm);
        cancelBtn.removeEventListener('click', onCancel);
      };

      const onConfirm = () => { cleanup(); resolve(true); };
      const onCancel = () => { cleanup(); resolve(false); };

      confirmBtn.addEventListener('click', onConfirm);
      cancelBtn.addEventListener('click', onCancel);

      this.showModal('confirm-modal');
    });
  },

  // ---- Empty State ----
  emptyState(icon = 'fa-inbox', title = 'Tidak ada data', text = 'Belum ada data yang tersedia') {
    return `
      <div class="empty-state">
        <div class="empty-state-icon"><i class="fas ${icon}"></i></div>
        <div class="empty-state-title">${title}</div>
        <div class="empty-state-text">${text}</div>
      </div>
    `;
  },

  // ---- Sidebar Toggle (Mobile) ----
  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  },

  closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  },

  // ---- Format Helpers ----
  formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  },

  formatNumber(num) {
    return new Intl.NumberFormat('id-ID').format(num);
  },

  formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  },

  formatDateFull(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  },

  // ---- Online/Offline Status ----
  updateOnlineStatus() {
    const banner = document.getElementById('offline-banner');
    if (navigator.onLine) {
      banner.classList.remove('active');
    } else {
      banner.classList.add('active');
    }
  },

  // ---- Populate Select ----
  async populateCategorySelect(selectId, type = null) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const categories = await DB.getCategories(type);
    const currentVal = select.value;
    select.innerHTML = '<option value="">Pilih Kategori</option>';
    categories.forEach(cat => {
      select.innerHTML += `<option value="${cat.name}">${cat.name}</option>`;
    });
    if (currentVal) select.value = currentVal;
  },

  async populateAccountSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const accounts = await DB.getAccounts();
    const currentVal = select.value;
    select.innerHTML = '<option value="">Pilih Akun</option>';
    accounts.forEach(acc => {
      select.innerHTML += `<option value="${acc.name}">${acc.name}</option>`;
    });
    if (currentVal) select.value = currentVal;
  },

  // ---- Set navbar title ----
  setPageTitle(title) {
    document.getElementById('navbar-title').textContent = title;
  },

  // ---- Update navbar date ----
  updateNavbarDate() {
    const el = document.getElementById('navbar-date');
    if (el) {
      el.innerHTML = `<i class="fas fa-calendar-alt"></i> ${this.formatDateFull(new Date())}`;
    }
  },

  // ---- Update sidebar user info ----
  updateUserInfo(user) {
    const nameEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');
    const avatarEl = document.getElementById('sidebar-user-avatar');
    if (nameEl) nameEl.textContent = user.fullName || user.username;
    if (roleEl) roleEl.textContent = user.role;
    if (avatarEl) avatarEl.textContent = (user.fullName || user.username).charAt(0).toUpperCase();
  },

  // ---- Get today's date string ----
  today() {
    return new Date().toISOString().split('T')[0];
  },

  // ---- Months helper ----
  getMonthName(monthIndex) {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return months[monthIndex];
  },

  getMonthShort(monthIndex) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return months[monthIndex];
  },

  // ---- Nominal Input Formatting (thousand separator with dots) ----
  formatNominalInput(input) {
    // Save cursor position
    const cursorPos = input.selectionStart;
    const oldLength = input.value.length;

    // Strip non-digit characters
    let raw = input.value.replace(/\D/g, '');

    // Remove leading zeros
    raw = raw.replace(/^0+/, '') || '';

    // Format with dots as thousand separator
    if (raw) {
      input.value = raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    } else {
      input.value = '';
    }

    // Adjust cursor position
    const newLength = input.value.length;
    const diff = newLength - oldLength;
    const newCursorPos = Math.max(0, cursorPos + diff);
    input.setSelectionRange(newCursorPos, newCursorPos);
  },

  // Parse formatted nominal string back to number (strip dots)
  parseNominal(value) {
    if (typeof value === 'number') return value;
    return Number(String(value).replace(/\./g, '')) || 0;
  },

  // Set nominal input with formatted value
  setNominalValue(inputId, value) {
    const input = document.getElementById(inputId);
    if (input && value) {
      input.value = String(Math.round(Number(value))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }
  },

  // ---- Role-Based UI Helpers ----

  // Populate user select dropdown (for admin)
  async populateUserSelect(selectId, includeAll = false) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const users = await DB.getAllUsers();
    const currentVal = select.value;
    select.innerHTML = includeAll
      ? '<option value="">Semua User</option>'
      : '<option value="">Pilih User</option>';
      
    users.forEach(u => {
      // Menyembunyikan admin dari opsi pilihan, sehingga hanya user biasa yang tampil
      if (u.role === 'admin') return;
      select.innerHTML += `<option value="${u.id}">${u.fullName || u.username}</option>`;
    });
    
    if (currentVal) select.value = currentVal;
  },

  // Update role badge in navbar
  updateRoleBadge() {
    const badge = document.getElementById('role-badge');
    if (!badge || !AppState.currentUser) return;

    const isAdmin = AppState.currentUser.role === 'admin';
    badge.className = `role-badge ${isAdmin ? 'admin' : 'user'}`;
    badge.innerHTML = isAdmin
      ? '<i class="fas fa-shield-alt"></i> Admin Mode'
      : '<i class="fas fa-user"></i> User Mode';
    badge.classList.remove('hidden');
  },

  // Cache for user names (avoids repeated DB lookups)
  _userNameCache: {},

  async getUserNameById(userId) {
    if (this._userNameCache[userId]) return this._userNameCache[userId];
    const users = await DB.getAllUsers();
    users.forEach(u => {
      this._userNameCache[u.id] = u.fullName || u.username;
    });
    return this._userNameCache[userId] || 'Unknown';
  },

  // Clear user cache (call on login/logout)
  clearUserCache() {
    this._userNameCache = {};
  },

  // ---- Theme Toggle ----
  initTheme() {
    const isDark = localStorage.getItem('theme') === 'dark';
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      this.updateThemeIcon(true);
    } else {
      this.updateThemeIcon(false);
    }
    
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }
  },

  toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
      this.updateThemeIcon(false);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      this.updateThemeIcon(true);
    }
  },

  updateThemeIcon(isDark) {
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }
  }
};

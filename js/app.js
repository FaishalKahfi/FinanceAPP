/* ============================================
   FinanceKu - Main Application (Router & State)
   ============================================ */

// ---- Global State ----
const AppState = {
  currentUser: null,
  currentPage: 'login',
  initialized: false
};

// ---- Router ----
const Router = {
  routes: ['login', 'dashboard', 'income', 'expense', 'category', 'account', 'report', 'settings'],

  pageTitles: {
    login: 'Login',
    dashboard: 'Dashboard',
    income: 'Pemasukan',
    expense: 'Pengeluaran',
    category: 'Kategori',
    account: 'Akun',
    report: 'Laporan',
    settings: 'Pengaturan'
  },

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  },

  handleRoute() {
    let hash = window.location.hash.replace('#', '') || 'login';

    // Guard: redirect to login if not authenticated
    if (hash !== 'login' && !AppState.currentUser) {
      window.location.hash = '#login';
      return;
    }

    // Guard: redirect to dashboard if already logged in and trying to access login
    if (hash === 'login' && AppState.currentUser) {
      window.location.hash = '#dashboard';
      return;
    }

    // Validate route
    if (!this.routes.includes(hash)) {
      hash = AppState.currentUser ? 'dashboard' : 'login';
      window.location.hash = '#' + hash;
      return;
    }

    this.navigate(hash);
  },

  navigate(page) {
    AppState.currentPage = page;

    // Toggle login vs app layout
    const loginPage = document.getElementById('login-page');
    const appContainer = document.getElementById('app-container');

    if (page === 'login') {
      loginPage.classList.remove('hidden');
      appContainer.classList.add('hidden');
    } else {
      loginPage.classList.add('hidden');
      appContainer.classList.remove('hidden');

      // Update UI
      UI.setPageTitle(this.pageTitles[page] || page);
      UI.updateNavbarDate();

      if (AppState.currentUser) {
        UI.updateUserInfo(AppState.currentUser);
        UI.updateRoleBadge();
      }

      // Update sidebar active state
      document.querySelectorAll('.sidebar-nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
      });

      // Show correct page section
      document.querySelectorAll('.page-section').forEach(section => {
        section.classList.toggle('active', section.id === `page-${page}`);
      });

      // Close sidebar on mobile
      UI.closeSidebar();

      // Initialize page module
      this.initPage(page);
    }
  },

  async initPage(page) {
    try {
      switch (page) {
        case 'dashboard':
          await Dashboard.init();
          break;
        case 'income':
          await Income.init();
          break;
        case 'expense':
          await Expense.init();
          break;
        case 'category':
          await Category.init();
          break;
        case 'account':
          await Account.init();
          break;
        case 'report':
          await Report.init();
          break;
      }
    } catch (err) {
      console.error(`[App] Failed to init page ${page}:`, err);
      UI.error('Gagal memuat halaman');
    }
  }
};

// ---- App Initialization ----
const App = {
  async init() {
    if (AppState.initialized) return;

    try {
      // Seed database with defaults
      await seedDatabase();

      // Init auth forms
      Auth.initLoginForm();

      // Check existing session
      Auth.checkSession();

      // Init Theme
      UI.initTheme();

      // Init sidebar navigation events
      this.initSidebarNav();

      // Init online/offline listeners
      this.initOnlineStatus();

      // Init router
      Router.init();

      // Register service worker
      this.registerServiceWorker();

      AppState.initialized = true;
      console.log('[App] FinanceKu initialized');
    } catch (err) {
      console.error('[App] Init error:', err);
      UI.error('Gagal memulai aplikasi');
    }
  },

  initSidebarNav() {
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        if (page) {
          window.location.hash = '#' + page;
        }
      });
    });

    // Sidebar toggle (mobile)
    const toggleBtn = document.getElementById('sidebar-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => UI.toggleSidebar());
    }

    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => UI.closeSidebar());
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        const confirmed = await UI.confirm('Keluar dari aplikasi?', 'Anda akan diarahkan ke halaman login.');
        if (confirmed) Auth.logout();
      });
    }

    // Backup & Restore buttons
    const backupBtn = document.getElementById('backup-btn');
    if (backupBtn) {
      backupBtn.addEventListener('click', () => ExportUtil.backupToJSON());
    }

    const restoreBtn = document.getElementById('restore-btn');
    if (restoreBtn) {
      restoreBtn.addEventListener('click', () => ExportUtil.restoreFromJSON());
    }
  },

  initOnlineStatus() {
    UI.updateOnlineStatus();
    window.addEventListener('online', () => {
      UI.updateOnlineStatus();
      UI.success('Anda kembali online');
    });
    window.addEventListener('offline', () => {
      UI.updateOnlineStatus();
      UI.warning('Anda sedang offline');
    });
  },

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => {
          console.log('[App] Service Worker registered:', reg.scope);
        })
        .catch(err => {
          console.warn('[App] Service Worker registration failed:', err);
        });
    }
  }
};

// ---- Start App ----
document.addEventListener('DOMContentLoaded', () => App.init());

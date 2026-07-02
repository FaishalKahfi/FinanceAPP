/* ============================================
   FinanceKu - Authentication Module
   ============================================ */

const Auth = {
  // ---- Login ----
  async login(username, password) {
    if (!username || !password) {
      throw new Error('Username dan password harus diisi');
    }

    const user = await DB.getUser(username);
    if (!user) {
      throw new Error('Username tidak ditemukan');
    }

    const hashedPassword = await hashPassword(password);
    if (user.password !== hashedPassword) {
      throw new Error('Password salah');
    }

    // Set current user in state
    AppState.currentUser = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role
    };

    // Persist session
    localStorage.setItem('financeKu_session', JSON.stringify(AppState.currentUser));

    return AppState.currentUser;
  },

  // ---- Register ----
  async register(username, password, fullName) {
    if (!username || !password || !fullName) {
      throw new Error('Semua field harus diisi');
    }

    if (username.length < 3) {
      throw new Error('Username minimal 3 karakter');
    }

    if (password.length < 6) {
      throw new Error('Password minimal 6 karakter');
    }

    // Check if username exists
    const existing = await DB.getUser(username);
    if (existing) {
      throw new Error('Username sudah digunakan');
    }

    const hashedPassword = await hashPassword(password);
    const userId = await DB.addUser({
      username,
      password: hashedPassword,
      fullName,
      role: 'user',
      createdAt: new Date().toISOString()
    });

    return userId;
  },

  // ---- Logout ----
  logout() {
    AppState.currentUser = null;
    localStorage.removeItem('financeKu_session');
    UI.clearUserCache();
    window.location.hash = '#login';
  },

  // ---- Check Session ----
  checkSession() {
    const session = localStorage.getItem('financeKu_session');
    if (session) {
      try {
        AppState.currentUser = JSON.parse(session);
        return true;
      } catch (e) {
        localStorage.removeItem('financeKu_session');
        return false;
      }
    }
    return false;
  },

  // ---- Is Admin ----
  isAdmin() {
    return AppState.currentUser && AppState.currentUser.role === 'admin';
  },

  // ---- Get Current User ID ----
  getUserId() {
    return AppState.currentUser && AppState.currentUser.id ? String(AppState.currentUser.id) : null;
  },

  // ---- Init Login Form ----
  initLoginForm() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');

    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        try {
          UI.showLoading();
          await this.login(username, password);
          UI.hideLoading();
          UI.success(`Selamat datang, ${AppState.currentUser.fullName}!`);
          window.location.hash = '#dashboard';
        } catch (err) {
          UI.hideLoading();
          UI.error(err.message);
        }
      });
    }

    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('register-fullname').value.trim();
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;

        try {
          UI.showLoading();
          await this.register(username, password, fullName);
          UI.hideLoading();
          UI.success('Registrasi berhasil! Silakan login.');
          document.getElementById('login-section').classList.remove('hidden');
          document.getElementById('register-section').classList.add('hidden');
          registerForm.reset();
        } catch (err) {
          UI.hideLoading();
          UI.error(err.message);
        }
      });
    }

    if (showRegister) {
      showRegister.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('register-section').classList.remove('hidden');
      });
    }

    if (showLogin) {
      showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('register-section').classList.add('hidden');
        document.getElementById('login-section').classList.remove('hidden');
      });
    }
  }
};

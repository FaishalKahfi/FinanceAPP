// js/db.js
/* ============================================
   FinanceKu - Database Module (Firebase Firestore)
   ============================================ */

const firebaseConfig = {
  apiKey: "AIzaSyByajPurr2Khr4zUJrk8ADZOLC6YqhjwwI",
  authDomain: "financeapp-3bacf.firebaseapp.com",
  projectId: "financeapp-3bacf",
  storageBucket: "financeapp-3bacf.firebasestorage.app",
  messagingSenderId: "53332105152",
  appId: "1:53332105152:web:c5af1f0e1331373017da25",
  measurementId: "G-DM08J3VTYH"
};

// Initialize Firebase only if not already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence()
  .catch(function(err) {
      if (err.code == 'failed-precondition') {
          console.warn('Multiple tabs open, persistence can only be enabled in one tab at a a time.');
      } else if (err.code == 'unimplemented') {
          console.warn('The current browser does not support all of the features required to enable persistence');
      }
  });

// Helper to map snapshot to array with id
const mapSnapshot = (snapshot) => {
  const data = [];
  snapshot.forEach(doc => {
    data.push({ id: doc.id, ...doc.data() });
  });
  return data;
};

// ---- Seed Default Data ----

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function seedDatabase() {
  try {
    // Seed admin user if no users exist
    const usersSnapshot = await db.collection('users').limit(1).get();
    if (usersSnapshot.empty) {
      const adminHash = await hashPassword('admin123');
      const userHash = await hashPassword('user123');

      await db.collection('users').add({ username: 'admin', password: adminHash, fullName: 'Administrator', role: 'admin', createdAt: new Date().toISOString() });
      await db.collection('users').add({ username: 'user', password: userHash, fullName: 'Pengguna', role: 'user', createdAt: new Date().toISOString() });
      console.log('[DB] Default users seeded');
    }

    // Seed default categories
    const catSnapshot = await db.collection('categories').limit(1).get();
    if (catSnapshot.empty) {
      const defaultCategories = [
        // Income categories
        { name: 'Gaji', type: 'income', icon: 'fa-briefcase' },
        { name: 'Freelance', type: 'income', icon: 'fa-laptop-code' },
        { name: 'Investasi', type: 'income', icon: 'fa-chart-line' },
        { name: 'Bonus', type: 'income', icon: 'fa-gift' },
        { name: 'Pendapatan Lain', type: 'income', icon: 'fa-coins' },
        // Expense categories
        { name: 'Makanan & Minuman', type: 'expense', icon: 'fa-utensils' },
        { name: 'Transportasi', type: 'expense', icon: 'fa-car' },
        { name: 'Belanja', type: 'expense', icon: 'fa-shopping-bag' },
        { name: 'Tagihan', type: 'expense', icon: 'fa-file-invoice' },
        { name: 'Hiburan', type: 'expense', icon: 'fa-film' },
        { name: 'Kesehatan', type: 'expense', icon: 'fa-heartbeat' },
        { name: 'Pendidikan', type: 'expense', icon: 'fa-graduation-cap' },
        { name: 'Pengeluaran Lain', type: 'expense', icon: 'fa-ellipsis-h' }
      ];
      for (const cat of defaultCategories) {
        await db.collection('categories').add(cat);
      }
      console.log('[DB] Default categories seeded');
    }

    // Seed default accounts
    const accSnapshot = await db.collection('accounts').limit(1).get();
    if (accSnapshot.empty) {
      const defaultAccounts = [
        { name: 'Kas', type: 'cash', icon: 'fa-wallet' },
        { name: 'Bank BCA', type: 'bank', icon: 'fa-university' },
        { name: 'Bank Mandiri', type: 'bank', icon: 'fa-university' },
        { name: 'GoPay', type: 'e-wallet', icon: 'fa-mobile-alt' },
        { name: 'OVO', type: 'e-wallet', icon: 'fa-mobile-alt' },
        { name: 'Dana', type: 'e-wallet', icon: 'fa-mobile-alt' }
      ];
      for (const acc of defaultAccounts) {
        await db.collection('accounts').add(acc);
      }
      console.log('[DB] Default accounts seeded');
    }

    console.log('[DB] Database ready');
  } catch (error) {
    console.error('[DB] Seed error:', error);
  }
}

// ---- CRUD Helpers ----

const DB = {
  // Users
  async getUser(username) {
    const snapshot = await db.collection('users').where('username', '==', username).limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  },

  async addUser(userData) {
    const docRef = await db.collection('users').add(userData);
    return docRef.id;
  },

  async getAllUsers() {
    const snapshot = await db.collection('users').get();
    return mapSnapshot(snapshot);
  },

  // Incomes
  async getIncomes(userId, filters = {}) {
    let query = db.collection('incomes').where('user_id', '==', userId);
    let results = mapSnapshot(await query.get());
    return applyDateFilters(results, filters);
  },

  async getAllIncomes(filters = {}) {
    let results = mapSnapshot(await db.collection('incomes').get());
    return applyDateFilters(results, filters);
  },

  async addIncome(data) {
    const docRef = await db.collection('incomes').add(data);
    return docRef.id;
  },

  async updateIncome(id, data) {
    await db.collection('incomes').doc(id).update(data);
    return id;
  },

  async deleteIncome(id) {
    await db.collection('incomes').doc(id).delete();
    return id;
  },

  async getIncomeById(id) {
    const doc = await db.collection('incomes').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  // Expenses
  async getExpenses(userId, filters = {}) {
    let query = db.collection('expenses').where('user_id', '==', userId);
    let results = mapSnapshot(await query.get());
    return applyDateFilters(results, filters);
  },

  async getAllExpenses(filters = {}) {
    let results = mapSnapshot(await db.collection('expenses').get());
    return applyDateFilters(results, filters);
  },

  async addExpense(data) {
    const docRef = await db.collection('expenses').add(data);
    return docRef.id;
  },

  async updateExpense(id, data) {
    await db.collection('expenses').doc(id).update(data);
    return id;
  },

  async deleteExpense(id) {
    await db.collection('expenses').doc(id).delete();
    return id;
  },

  async getExpenseById(id) {
    const doc = await db.collection('expenses').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  // Categories
  async getCategories(type = null) {
    let query = db.collection('categories');
    if (type) {
      query = query.where('type', '==', type);
    }
    return mapSnapshot(await query.get());
  },

  async addCategory(data) {
    const docRef = await db.collection('categories').add(data);
    return docRef.id;
  },

  async updateCategory(id, data) {
    await db.collection('categories').doc(id).update(data);
    return id;
  },

  async deleteCategory(id) {
    await db.collection('categories').doc(id).delete();
    return id;
  },

  async getCategoryById(id) {
    const doc = await db.collection('categories').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  // Accounts
  async getAccounts() {
    return mapSnapshot(await db.collection('accounts').get());
  },

  async addAccount(data) {
    const docRef = await db.collection('accounts').add(data);
    return docRef.id;
  },

  async updateAccount(id, data) {
    await db.collection('accounts').doc(id).update(data);
    return id;
  },

  async deleteAccount(id) {
    await db.collection('accounts').doc(id).delete();
    return id;
  },

  async getAccountById(id) {
    const doc = await db.collection('accounts').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  // Backup & Restore
  async exportAllData() {
    const users = mapSnapshot(await db.collection('users').get());
    const incomes = mapSnapshot(await db.collection('incomes').get());
    const expenses = mapSnapshot(await db.collection('expenses').get());
    const categories = mapSnapshot(await db.collection('categories').get());
    const accounts = mapSnapshot(await db.collection('accounts').get());

    return {
      version: 1,
      exportDate: new Date().toISOString(),
      appName: 'FinanceKu',
      data: { users, incomes, expenses, categories, accounts }
    };
  },

  async importAllData(jsonData) {
    if (!jsonData || !jsonData.data) {
      throw new Error('Format data tidak valid');
    }

    const { users, incomes, expenses, categories, accounts } = jsonData.data;

    const batch = db.batch();

    const clearCollection = async (collectionName) => {
      const snapshot = await db.collection(collectionName).get();
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
    };
    
    await clearCollection('users');
    await clearCollection('incomes');
    await clearCollection('expenses');
    await clearCollection('categories');
    await clearCollection('accounts');

    // Import new data
    const addCollectionData = (collectionName, items) => {
      if (items && items.length) {
        items.forEach(item => {
          // Keep the id string type
          const docRef = db.collection(collectionName).doc(String(item.id));
          const { id, ...dataToSave } = item;
          batch.set(docRef, dataToSave);
        });
      }
    };

    addCollectionData('users', users);
    addCollectionData('incomes', incomes);
    addCollectionData('expenses', expenses);
    addCollectionData('categories', categories);
    addCollectionData('accounts', accounts);

    await batch.commit();

    return true;
  },

  // Dashboard aggregation
  async getDashboardData(userId, year, month) {
    const incomes = await this.getIncomes(userId);
    const expenses = await this.getExpenses(userId);

    const totalIncome = incomes.reduce((sum, i) => sum + Number(i.nominal), 0);
    const totalExpense = expenses.reduce((sum, e) => sum + Number(e.nominal), 0);
    const balance = totalIncome - totalExpense;

    // Monthly breakdown for charts
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
  }
};

// ---- Date Filter Helper ----
function applyDateFilters(results, filters) {
  if (!filters) return results;

  let filtered = results;

  if (filters.startDate) {
    filtered = filtered.filter(r => r.tanggal >= filters.startDate);
  }
  if (filters.endDate) {
    filtered = filtered.filter(r => r.tanggal <= filters.endDate);
  }
  if (filters.month !== undefined && filters.month !== '' && filters.year) {
    filtered = filtered.filter(r => {
      const d = new Date(r.tanggal);
      return d.getMonth() === Number(filters.month) && d.getFullYear() === Number(filters.year);
    });
  } else if (filters.year) {
    filtered = filtered.filter(r => {
      const d = new Date(r.tanggal);
      return d.getFullYear() === Number(filters.year);
    });
  }

  // Sort by date descending
  filtered.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

  return filtered;
}

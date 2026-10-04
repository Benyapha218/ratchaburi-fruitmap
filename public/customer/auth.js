const CustomerAuth = {
  saveToken(token, user) {
    localStorage.setItem('customer_token', token);
    localStorage.setItem('customer_user', JSON.stringify(user));
  },

  getToken() {
    return localStorage.getItem('customer_token');
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('customer_user'));
    } catch (err) {
      return null;
    }
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  logout() {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_user');
    window.location.href = 'login.html';
  },

  async authFetch(url, options = {}) {
    const token = this.getToken();
    const headers = {
      ...(options.headers || {}),
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
    return fetch(url, { ...options, headers });
  },

  requireLogin() {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
    }
  }
};
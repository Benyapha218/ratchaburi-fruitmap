(function () {
  const LOGIN_PAGE = 'login.html';
  const PUBLIC_PAGES = ['login.html', 'register.html'];

  function getCurrentPage() {
    return window.location.pathname.split('/').pop() || '';
  }

  function getToken() {
    return localStorage.getItem('token');
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }

  function requireLogin() {
    if (PUBLIC_PAGES.includes(getCurrentPage())) return true;
    if (!getToken()) {
      window.location.href = LOGIN_PAGE;
      return false;
    }
    return true;
  }

  function getAuthHeaders(extraHeaders) {
    const token = getToken();
    return {
      ...(extraHeaders || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  async function authFetch(url, options) {
    const opts = options || {};
    const headers = getAuthHeaders(opts.headers);

    const response = await fetch(url, { ...opts, headers });

    if (response.status === 401 && !PUBLIC_PAGES.includes(getCurrentPage())) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = LOGIN_PAGE;
    }

    return response;
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = LOGIN_PAGE;
  }

  window.OwnerAuth = {
    getToken,
    getUser,
    requireLogin,
    getAuthHeaders,
    authFetch,
    logout
  };

  if (!PUBLIC_PAGES.includes(getCurrentPage())) {
    requireLogin();
  }
})();

const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');

if (CustomerAuth.isLoggedIn()) {
  window.location.href = 'home.html';
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    alert('กรุณากรอกอีเมลและรหัสผ่าน');
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'กำลังเข้าสู่ระบบ...';

  try {
    const response = await fetch('/api/owner/login', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
      return;
    }

    if (data.user.role !== 'customer') {
      alert('บัญชีนี้ไม่ใช่บัญชีลูกค้า กรุณาเข้าสู่ระบบที่หน้าเจ้าของสวนแทน');
      return;
    }

    CustomerAuth.saveToken(data.token, data.user);
    window.location.href = 'home.html';

  } catch (err) {
    console.error('Login error:', err);
    alert('เชื่อมต่อ server ไม่ได้ กรุณาลองใหม่อีกครั้ง');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Login';
  }
});

const registerUserLink = document.getElementById('registerUser');
if (registerUserLink) {
  registerUserLink.addEventListener('click', () => {
    window.location.href = 'register.html';
  });
}

const registerOwnerLink = document.getElementById('registerOwner');
if (registerOwnerLink) {
  registerOwnerLink.addEventListener('click', () => {
    window.location.href = '../owner/register.html';
  });
}
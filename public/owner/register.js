  const form = document.getElementById('registerForm');
  const messageBox = document.getElementById('formMessage');
  const submitBtn = document.getElementById('submitBtn');

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const displayName = document.getElementById('displayName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!displayName || !email || !password) {
      messageBox.style.color = '#dc2626';
      messageBox.textContent = 'กรุณากรอกข้อมูลให้ครบทุกช่อง';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'กำลังสมัคร...';
    messageBox.textContent = '';

    try {
      // 💡 แก้จุดนี้: เปลี่ยนจาก /login เป็น /register
      const response = await fetch('/api/owner/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, email, password })
      });

      const data = await response.json();

      if (response.ok) {
        messageBox.style.color = '#17663f';
        messageBox.textContent = 'สมัครสมาชิกสำเร็จ! กำลังพาไปหน้าเข้าสู่ระบบ...';
        form.reset();
        setTimeout(() => {
          window.location.href = 'login.html'; // ส่งต่อไปหน้าล็อกอิน
        }, 1200);
      } else {
        messageBox.style.color = '#dc2626';
        messageBox.textContent = data.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่';
      }
    } catch (err) {
      messageBox.style.color = '#dc2626';
      messageBox.textContent = 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบว่า server กำลังรันอยู่';
      console.error(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'สมัครเจ้าของสวน';
    }
  });
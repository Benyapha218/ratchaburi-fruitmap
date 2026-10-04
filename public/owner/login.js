    const form = document.getElementById('registerForm');
    const messageBox = document.getElementById('formMessage');
    const submitBtn = document.getElementById('submitBtn');

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      if (!email || !password) {
        messageBox.style.color = '#dc2626';
        messageBox.textContent = 'กรุณากรอกอีเมลและรหัสผ่าน';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'กำลังเข้าสู่ระบบ...';
      messageBox.textContent = '';

      try {
        const response = await fetch('/api/owner/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
          if (data.user.role && data.user.role !== 'owner') { // ปรับคำว่า 'owner' ให้ตรงกับค่า role ในฐานข้อมูลของคุณ
            messageBox.style.color = '#dc2626';
            messageBox.textContent = 'บัญชีนี้ไม่ใช่บัญชีเจ้าของสวน กรุณาเข้าสู่ระบบที่หน้าลูกค้า';
            submitBtn.disabled = false;
            submitBtn.textContent = 'เข้าสู่ระบบ';
            return;
          }

          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));

          messageBox.style.color = '#17663f';
          messageBox.textContent = 'เข้าสู่ระบบสำเร็จ! กำลังพาไปหน้าจัดการสวน...';
          form.reset();
          setTimeout(() => {
            window.location.href = 'index.html';
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
        submitBtn.textContent = 'เข้าสู่ระบบ';
      }
    });
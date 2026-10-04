    const accountMessage = document.getElementById('accountMessage');
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const avatarInitial = document.getElementById('avatarInitial');

    const valName = document.getElementById('valName');
    const valEmail = document.getElementById('valEmail');
    const logoutBtn = document.getElementById('logoutBtn');

    CustomerAuth.requireLogin();

    async function loadAccountProfile() {
      try {
        const response = await CustomerAuth.authFetch('/api/customer/users');

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Server returned status ${response.status}`);
        }

        const data = await response.json();
        const customer = data.user || data.customer || data;

        const name = customer.display_name || customer.name || customer.displayName || 'ผู้ใช้งาน';
        const email = customer.email || '-';

        profileName.textContent = name;
        profileEmail.textContent = email;
        avatarInitial.textContent = name.charAt(0).toUpperCase();

        valName.textContent = name;
        valEmail.textContent = email;

      } catch (err) {
        console.error('Load Profile Error:', err);
        accountMessage.textContent = 'โหลดข้อมูลบัญชีไม่สำเร็จ';
        accountMessage.style.color = '#dc2626';
      }
    }

    logoutBtn.addEventListener('click', () => {
      if (confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
        CustomerAuth.logout();
      }
    });

    loadAccountProfile();
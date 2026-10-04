const accountMessage = document.getElementById('accountMessage');
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const avatarInitial = document.getElementById('avatarInitial');

    const valName = document.getElementById('valName');
    const valEmail = document.getElementById('valEmail');
    const logoutBtn = document.getElementById('logoutBtn');

    async function loadAccountProfile() {
      try {
        const response = await OwnerAuth.authFetch('/api/owner/users');

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Server returned status ${response.status}`);
        }

        const data = await response.json();
        const owner = data.user || data.owner || data;

        const name = owner.display_name || owner.name || owner.displayName || 'ผู้ดูแลระบบ';
        const email = owner.email || '-';
        const phone = owner.phone || 'ยังไม่ได้ระบุ';

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
        if (typeof OwnerAuth !== 'undefined' && typeof OwnerAuth.logout === 'function') {
          OwnerAuth.logout();
        } else {
          localStorage.clear();
          window.location.href = 'login.html';
        }
      }
    });

    loadAccountProfile();
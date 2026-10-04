const urlParams = new URLSearchParams(window.location.search);
let gardenId = urlParams.get('id');
const formMessage = document.getElementById('formMessage');
const saveBtn = document.getElementById('saveBtn');

const openStatusCard = document.getElementById('openStatusCard');
const openToggle = document.getElementById('gardenOpenToggle');
const openLabel = document.getElementById('gardenOpenLabel');
const openHint = document.getElementById('gardenOpenHint');
const closeReason = document.getElementById('closeReason');
const closeDetail = document.getElementById('closeDetail');
const closeFrom = document.getElementById('closeFrom');
const closeTo = document.getElementById('closeTo');

function syncOpenUI() {
  const isOpen = openToggle.checked;
  openStatusCard.classList.toggle('is-closed', !isOpen);
  openLabel.textContent = isOpen ? 'สวนเปิดทำการ' : 'สวนปิดทำการชั่วคราว (แจ้งปัญหา)';
  openHint.textContent = isOpen
    ? 'ลูกค้าเห็นสวนของคุณและจองได้ตามปกติ'
    : 'หน้าหลักจะแสดงป้ายปิดทำการ และลูกค้าจะจองไม่ได้ในช่วงที่ปิด';
}

function loadOpenStatus(garden) {
  const s = (garden && garden.openStatus) || { isOpen: true };
  openToggle.checked = s.isOpen !== false;
  closeReason.value = s.reason || '';
  closeDetail.value = s.detail || '';
  closeFrom.value = s.closedFrom || '';
  closeTo.value = s.closedTo || '';
  syncOpenUI();
}

function validateOpenStatus() {
  if (openToggle.checked) return null;
  if (!closeReason.value) return 'กรุณาเลือกเหตุผลที่สวนไม่เปิดทำการ';
  if (closeFrom.value && closeTo.value && closeFrom.value > closeTo.value) {
    return 'วันที่เริ่มปิดต้องไม่เกินวันที่สิ้นสุด';
  }
  return null;
}

openToggle.addEventListener('change', syncOpenUI);

document.addEventListener('DOMContentLoaded', async () => {
  if (!gardenId) {
    try {
      const res = await OwnerAuth.authFetch('/api/owner/gardens');
      if (res.ok) {
        const data = await res.json();
        if (data.gardens && data.gardens.length > 0) {
          gardenId = data.gardens[0]._id;
        }
      }
    } catch (e) {
      console.error('Error fetching garden:', e);
    }
  }

  if (!gardenId) {
    formMessage.style.color = '#dc2626';
    formMessage.textContent = 'ไม่พบรหัสสวน กรุณาเลือกสวนก่อนใช้งาน';
    saveBtn.disabled = true;
    return;
  }

  try {
    const response = await OwnerAuth.authFetch(`/api/owner/gardens/${gardenId}`);
    if (!response.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ');
    const data = await response.json();
    loadOpenStatus(data.garden);
  } catch (err) {
    console.error('Error loading garden:', err);
    formMessage.style.color = '#dc2626';
    formMessage.textContent = 'เกิดข้อผิดพลาดในการโหลดข้อมูลสวน';
  }
});

saveBtn.addEventListener('click', async () => {
  if (!gardenId) return;

  const invalid = validateOpenStatus();
  if (invalid) {
    formMessage.style.color = '#dc2626';
    formMessage.textContent = invalid;
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'กำลังบันทึก...';
  formMessage.textContent = '';

  try {
    const isOpen = openToggle.checked;
    const res = await OwnerAuth.authFetch(`/api/owner/gardens/${gardenId}/open-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isOpen,
        reason: isOpen ? '' : closeReason.value,
        detail: isOpen ? '' : closeDetail.value.trim(),
        closedFrom: isOpen ? '' : closeFrom.value,
        closedTo: isOpen ? '' : closeTo.value
      })
    });
        let data = {};
        try {
        data = await res.json();
        } catch (e) {
        console.warn('Response is not JSON', e);
        }

        if (res.ok) {
        formMessage.style.color = '#17663f';
        formMessage.textContent = 'บันทึกเรียบร้อย';
        
        setTimeout(() => {
            window.location.replace(`add-garden2.html?id=${gardenId}`);
        }, 1200);
        } else {
        formMessage.style.color = '#dc2626';
        formMessage.textContent = data.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่';
        }
    
  } catch (err) {
    formMessage.style.color = '#dc2626';
    formMessage.textContent = 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบว่า server กำลังรันอยู่';
    console.error(err);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'บันทึกสถานะ';
  }
});
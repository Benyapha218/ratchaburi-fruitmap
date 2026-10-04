const urlParams = new URLSearchParams(window.location.search);
let gardenId = urlParams.get('id');
const formMessage = document.getElementById('formMessage');
const saveBtn = document.getElementById('saveBtn');

const thaiMonths = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const today = new Date();
const currentRealYear = today.getFullYear();
const currentRealMonth = today.getMonth();
const currentRealDate = today.getDate();

let viewYear = currentRealYear;
let viewMonth = currentRealMonth;

let homestaysData = [];
let roomStatusMatrix = {}; 

const monthYearLabel = document.getElementById('monthYearLabel');
const prevMonthBtn = document.getElementById('prevMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');
const matrixTableHead = document.querySelector('#matrixTable thead tr');
const matrixBody = document.getElementById('matrixBody');

function dateKey(y, m, d) { return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }

function renderMatrixTable() {
  const thaiYear = viewYear + 543;
  monthYearLabel.textContent = `${thaiMonths[viewMonth]} ${thaiYear}`;
  prevMonthBtn.disabled = (viewYear === currentRealYear && viewMonth === currentRealMonth);

  const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();

  let headHtml = `<th style="padding: 12px; text-align: left; min-width: 200px; position: sticky; left: 0; background: #2d4d40; z-index: 2;">ประเภทห้องพัก</th>`;
  for (let d = 1; d <= totalDays; d++) {
    headHtml += `<th style="min-width: 36px; font-size: 12px;">${d}</th>`;
  }
  matrixTableHead.innerHTML = headHtml;

  if (homestaysData.length === 0) {
    matrixBody.innerHTML = `<tr><td colspan="${totalDays + 1}" style="padding: 24px; color: #9ca3af;">ยังไม่มีข้อมูลห้องพัก Homestay ในระบบ</td></tr>`;
    return;
  }

  let bodyHtml = '';
  homestaysData.forEach((h, hIndex) => {
    const roomName = h.name || `ห้องพักที่ ${hIndex + 1}`;
    const roomType = h.roomType ? ` (${h.roomType})` : '';

    bodyHtml += `<tr>`;
    bodyHtml += `<td style="padding: 10px 12px; text-align: left; font-weight: 600; background: #fff; position: sticky; left: 0; z-index: 1; border-right: 2px solid #e5e7eb;">${roomName}${roomType}</td>`;

    for (let d = 1; d <= totalDays; d++) {
      const dKey = dateKey(viewYear, viewMonth, d);
      const isPast = (viewYear < currentRealYear) ||
                     (viewYear === currentRealYear && viewMonth < currentRealMonth) ||
                     (viewYear === currentRealYear && viewMonth === currentRealMonth && d < currentRealDate);

      if (!roomStatusMatrix[hIndex]) roomStatusMatrix[hIndex] = {};
      
      if (!roomStatusMatrix[hIndex][dKey] && !isPast) {
        roomStatusMatrix[hIndex][dKey] = 'available';
      }

      const status = roomStatusMatrix[hIndex][dKey] || '';

      if (isPast) {
        bodyHtml += `<td class="cell-status disabled">-</td>`;
      } else {
        let statusClass = '';
        let statusText = '';
        if (status === 'available') { statusClass = 'available'; statusText = '✓'; }
        else if (status === 'booked') { statusClass = 'booked'; statusText = '✕'; }

        bodyHtml += `<td class="cell-status ${statusClass}" data-hindex="${hIndex}" data-date="${dKey}">${statusText}</td>`;
      }
    }
    bodyHtml += `</tr>`;
  });

  matrixBody.innerHTML = bodyHtml;

  matrixBody.querySelectorAll('.cell-status:not(.disabled)').forEach(cell => {
    cell.addEventListener('click', () => {
      const hIndex = cell.dataset.hindex;
      const dKey = cell.dataset.date;

      if (!roomStatusMatrix[hIndex]) roomStatusMatrix[hIndex] = {};
      const currentStatus = roomStatusMatrix[hIndex][dKey];

      if (currentStatus === 'available') {
        roomStatusMatrix[hIndex][dKey] = 'booked';
      } else {
        roomStatusMatrix[hIndex][dKey] = 'available';
      }

      renderMatrixTable();
    });
  });
}

prevMonthBtn.addEventListener('click', () => {
  if (viewYear > currentRealYear || (viewYear === currentRealYear && viewMonth > currentRealMonth)) {
    viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    renderMatrixTable();
  }
});

nextMonthBtn.addEventListener('click', () => {
  viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  renderMatrixTable();
});

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
    const garden = data.garden;
    homestaysData = (garden && garden.homestays) || [];

    if (homestaysData.length === 0) {
      formMessage.style.color = '#dc2626';
      formMessage.textContent = 'ยังไม่มีข้อมูล Homestay ในระบบ (กรุณาเพิ่ม Homestay ก่อน)';
      saveBtn.disabled = true;
    }

    homestaysData.forEach((h, idx) => {
      roomStatusMatrix[idx] = {};
      const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
      for (let d = 1; d <= totalDays; d++) {
        const dKey = dateKey(viewYear, viewMonth, d);
        roomStatusMatrix[idx][dKey] = 'available';
      }

      if (Array.isArray(h.statusMatrix)) {
        h.statusMatrix.forEach(item => {
          roomStatusMatrix[idx][item.date] = item.status;
        });
      } else if (h.availableDates) {
        h.availableDates.forEach(dStr => {
          roomStatusMatrix[idx][dStr] = 'available';
        });
      }
    });

    renderMatrixTable();

  } catch (err) {
    console.error('Error loading homestays:', err);
    formMessage.style.color = '#dc2626';
    formMessage.textContent = 'เกิดข้อผิดพลาดในการโหลดข้อมูลห้องพัก';
  }
});

saveBtn.addEventListener('click', async () => {
  if (!gardenId) return;

  saveBtn.disabled = true;
  saveBtn.textContent = 'กำลังบันทึก...';
  formMessage.textContent = '';

  try {
    const resGet = await OwnerAuth.authFetch(`/api/owner/gardens/${gardenId}`);
    const dataGet = await resGet.json();
    let homestays = dataGet.garden?.homestays || [];

    homestays = homestays.map((h, idx) => {
      const matrixObj = roomStatusMatrix[idx] || {};
      const statusList = [];
      const availableList = [];

      Object.keys(matrixObj).forEach(dateStr => {
        const st = matrixObj[dateStr];
        statusList.push({ date: dateStr, status: st });
        if (st === 'available') availableList.push(dateStr);
      });

      return {
        ...h,
        statusMatrix: statusList,
        availableDates: availableList
      };
    });

    const formData = new FormData();
    formData.append('homestays', JSON.stringify(homestays));

    const response = await OwnerAuth.authFetch(`/api/owner/gardens/${gardenId}/homestay`, {
      method: 'PUT',
      body: formData
    });
    const data = await response.json();

    if (response.ok) {
      formMessage.style.color = '#17663f';
      formMessage.textContent = 'บันทึกสถานะห้องพักสำเร็จ!';
      
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
    saveBtn.textContent = 'บันทึกสถานะทั้งหมด';
  }
});
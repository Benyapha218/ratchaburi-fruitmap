const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];
const THAI_DAY_NAMES = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

let allVisitBookings = []; 
let allHomestayBookings = [];
let ownerGardens = [];  
let selectedGardenId = null; 

function pad2(n) { return String(n).padStart(2, '0'); }
function toDateKey(year, month, day) { return `${year}-${pad2(month + 1)}-${pad2(day)}`; }
function formatThaiDate(dateKey) {
  if (!dateKey) return '';
  const [y, m, d] = dateKey.split('-').map(Number);
  return `${d} ${THAI_MONTHS[m - 1]} ${y + 543}`;
}

const now = new Date();
const TODAY_KEY = toDateKey(now.getFullYear(), now.getMonth(), now.getDate());

let visitYear = now.getFullYear();
let visitMonth = now.getMonth();
let visitSelectedDate = TODAY_KEY;

let hsYear = now.getFullYear();
let hsMonth = now.getMonth();
let hsSelectedDate = TODAY_KEY;

async function loadOwnerGardens() {
  const gardenSelect = document.getElementById('gardenSelect');
  try {
    const response = await OwnerAuth.authFetch('/api/owner/gardens');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'โหลดรายชื่อสวนไม่สำเร็จ');

    ownerGardens = data.gardens || [];

    if (ownerGardens.length === 0) {
      gardenSelect.innerHTML = `<option value="">ยังไม่มีสวนในระบบ</option>`;
      return;
    }

    gardenSelect.innerHTML = ownerGardens
      .map(g => `<option value="${g._id}">${escapeHtml(g.garden_name || 'ไม่ระบุชื่อสวน')}</option>`)
      .join('');

    selectedGardenId = ownerGardens[0]._id;
    gardenSelect.value = selectedGardenId;

  } catch (err) {
    console.error('Load owner gardens error:', err);
    gardenSelect.innerHTML = `<option value="">โหลดรายชื่อสวนไม่สำเร็จ</option>`;
  }
}

document.getElementById('gardenSelect').addEventListener('change', (e) => {
  selectedGardenId = e.target.value;
  drawVisitCalendar();
  drawHomestayCalendar();
  renderVisitManagement();
  renderHomestayManagement();
});

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderCalendar(year, month, gridEl, labelEl, opts) {
  if (!gridEl || !labelEl) return;
  labelEl.textContent = `${THAI_MONTHS[month]} ${year + 543}`;
  gridEl.innerHTML = '';

  THAI_DAY_NAMES.forEach(d => {
    const el = document.createElement('div');
    el.className = 'day-name';
    el.textContent = d;
    gridEl.appendChild(el);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-cell empty';
    gridEl.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = toDateKey(year, month, day);
    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    cell.textContent = day;
    cell.dataset.date = dateKey;

    if (dateKey === opts.todayKey) cell.classList.add('today');
    if (dateKey === opts.selectedKey) cell.classList.add('selected');
    if (opts.hasPending && opts.hasPending.has(dateKey)) cell.classList.add('has-pending');
    if (opts.hasApproved && opts.hasApproved.has(dateKey)) cell.classList.add('has-approved');

    cell.addEventListener('click', () => opts.onSelectDate(dateKey));
    gridEl.appendChild(cell);
  }
}

function drawVisitCalendar() {
  const gardenBookings = allVisitBookings.filter(b => String(b.garden_id) === String(selectedGardenId));
  const hasPending = new Set(gardenBookings.filter(b => b.status === 'รออนุมัติการจอง').map(b => b.date));
  const hasApproved = new Set(gardenBookings.filter(b => b.status === 'อนุมัติแล้ว').map(b => b.date));

  renderCalendar(
    visitYear, visitMonth,
    document.getElementById('visitCalGrid'),
    document.getElementById('visitMonthLabel'),
    {
      todayKey: TODAY_KEY,
      selectedKey: visitSelectedDate,
      hasPending,
      hasApproved,
      onSelectDate: (dateKey) => {
        visitSelectedDate = dateKey;
        drawVisitCalendar();
        renderVisitManagement();
      }
    }
  );
}

const visitPrevBtn = document.getElementById('visitPrevBtn');
const visitNextBtn = document.getElementById('visitNextBtn');
if (visitPrevBtn) {
  visitPrevBtn.addEventListener('click', () => {
    visitMonth--; if (visitMonth < 0) { visitMonth = 11; visitYear--; }
    drawVisitCalendar();
  });
}
if (visitNextBtn) {
  visitNextBtn.addEventListener('click', () => {
    visitMonth++; if (visitMonth > 11) { visitMonth = 0; visitYear++; }
    drawVisitCalendar();
  });
}

function drawHomestayCalendar() {
  const gardenBookings = allHomestayBookings.filter(b => String(b.garden_id) === String(selectedGardenId));
  const hasPending = new Set(gardenBookings.filter(b => b.status === 'รออนุมัติการจอง').map(b => b.date));
  const hasApproved = new Set(gardenBookings.filter(b => b.status === 'อนุมัติแล้ว').map(b => b.date));

  renderCalendar(
    hsYear, hsMonth,
    document.getElementById('homestayCalGrid'), 
    document.getElementById('homestayMonthLabel'), 
    {
      todayKey: TODAY_KEY,
      selectedKey: hsSelectedDate,
      hasPending,
      hasApproved,
      onSelectDate: (dateKey) => {
        hsSelectedDate = dateKey;
        drawHomestayCalendar();
        renderHomestayManagement();
      }
    }
  );
}

const hsPrevBtn = document.getElementById('hsPrevBtn') || document.getElementById('homestayPrevBtn');
const hsNextBtn = document.getElementById('hsNextBtn') || document.getElementById('homestayNextBtn');
if (hsPrevBtn) {
  hsPrevBtn.addEventListener('click', () => {
    hsMonth--; if (hsMonth < 0) { hsMonth = 11; hsYear--; }
    drawHomestayCalendar();
  });
}
if (hsNextBtn) {
  hsNextBtn.addEventListener('click', () => {
    hsMonth++; if (hsMonth > 11) { hsMonth = 0; hsYear++; }
    drawHomestayCalendar();
  });
}

async function fetchBookingsFromDB() {
  try {
    const [visitRes, hsRes] = await Promise.all([
      fetch('/api/customer/bookings'),
      fetch('/api/customer/homestay')
    ]);

    if (visitRes.ok) allVisitBookings = await visitRes.json();
    if (hsRes.ok) allHomestayBookings = await hsRes.json();

    drawVisitCalendar();
    drawHomestayCalendar();
    renderVisitManagement();
    renderHomestayManagement();
  } catch (err) {
    console.error('Error fetching bookings:', err);
  }
}

function renderVisitManagement() {
  const pendingPanel = document.getElementById('visitPendingPanel');
  const approvedBody = document.getElementById('visitApprovedBody');

  const gardenBookings = allVisitBookings.filter(b => String(b.garden_id) === String(selectedGardenId));
  const dateBookings = gardenBookings.filter(b => b.date === visitSelectedDate);

  let pendingHtml = '';
  let pendingCount = 0;
  let approvedRowsHtml = '';

  dateBookings.forEach((b) => {
    if (b.status === 'รออนุมัติการจอง') {
      pendingCount++;
      pendingHtml += `
        <div class="pending-card" data-id="${b._id}">
          <div class="name">${escapeHtml(b.display_name || b.name || 'ผู้เข้าชมทั่วไป')}</div>
          <div class="line">${escapeHtml(b.email || 'customer@email.com')}</div>
          <div class="line">${escapeHtml(b.phone || 'ไม่ระบุเบอร์โทร')}</div>
          <div class="line">◴ ${escapeHtml(b.startTime)} - ${escapeHtml(b.endTime)} น. | จำนวนแขก ${escapeHtml(String(b.count))} ท่าน</div>
          <div class="actions">
            <button type="button" class="btn-confirm" onclick="updateVisitStatus('${b._id}', 'อนุมัติแล้ว')">ยืนยันการจอง</button>
            <button type="button" class="btn-cancel" onclick="updateVisitStatus('${b._id}', 'ไม่อนุมัติ')">ยกเลิกการจอง</button>
          </div>
        </div>
      `;
    } else if (b.status === 'อนุมัติแล้ว') {
      approvedRowsHtml += `
        <tr>
          <td>${escapeHtml(b.display_name || 'ผู้เข้าชมทั่วไป')}</td>
          <td>${escapeHtml(b.email || '-')}</td>
          <td>${escapeHtml(b.phone || '-')}</td>
          <td>${escapeHtml(b.startTime)} - ${escapeHtml(b.endTime)} น.</td>
          <td>${escapeHtml(String(b.count))}</td>
        </tr>
      `;
    }
  });

  const panelDateEl = document.getElementById('visitPanelDate');
  if (panelDateEl) panelDateEl.textContent = formatThaiDate(visitSelectedDate);
  const pendingCountEl = document.getElementById('visitPendingCount');
  if (pendingCountEl) pendingCountEl.textContent = `ทั้งหมด ${pendingCount} รายการ`;

  if (pendingPanel) {
    pendingPanel.querySelectorAll('.pending-card, .empty-pending-msg').forEach(el => el.remove());
    if (pendingCount === 0) {
      pendingPanel.insertAdjacentHTML('beforeend', `<div class="empty-pending-msg">ไม่มีรายการรออนุมัติในวันที่เลือก</div>`);
    } else {
      pendingPanel.insertAdjacentHTML('beforeend', pendingHtml);
    }
  }

  const tableDateEl = document.getElementById('visitTableDate');
  if (tableDateEl) tableDateEl.textContent = formatThaiDate(visitSelectedDate);
  if (approvedBody) {
    approvedBody.innerHTML = approvedRowsHtml || `<tr><td colspan="5" style="text-align:center; padding: 20px; opacity:0.8;">ยังไม่มีรายชื่อที่อนุมัติในวันที่เลือก</td></tr>`;
  }
  const approvedCountEl = document.getElementById('visitApprovedCount');
  if (approvedCountEl) approvedCountEl.textContent = `ทั้งหมด ${dateBookings.filter(b => b.status === 'อนุมัติแล้ว').length} รายชื่อ`;
}

function renderHomestayManagement() {
  const pendingPanel = document.getElementById('homestayPendingPanel') || document.getElementById('visitPendingPanel');
  const approvedBody = document.getElementById('homestayApprovedBody') || document.getElementById('visitApprovedBody');

  const gardenBookings = allHomestayBookings.filter(b => String(b.garden_id) === String(selectedGardenId));
  const dateBookings = gardenBookings.filter(b => b.date === hsSelectedDate);

  let pendingHtml = '';
  let pendingCount = 0;
  let approvedRowsHtml = '';

  dateBookings.forEach((b) => {
    const checkOutDate = b.endTime ? b.endTime.replace('เช็คเอาท์: ', '') : '-';

    if (b.status === 'รออนุมัติการจอง') {
      pendingCount++;
      pendingHtml += `
        <div class="pending-card" data-id="${b._id}">
          <div class="name">${escapeHtml(b.display_name || 'ผู้เข้าพักทั่วไป')}</div>
          <div class="line">${escapeHtml(b.email || 'customer@email.com')}</div>
          <div class="line">${escapeHtml(b.phone || 'ไม่ระบุเบอร์โทร')}</div>
          <div class="line">${escapeHtml(b.name || 'ไม่ระบุชื่อห้องพัก')}</div>
          <div class="line">𖠿 ประเภทห้อง: <strong>${escapeHtml(b.roomType || '-')}</strong></div>
          <div class="line">📅 เช็คอิน: ${escapeHtml(b.date)} | เช็คเอาท์: ${escapeHtml(checkOutDate)}</div>
          <div class="line">🚪จำนวนห้องที่จอง: ${escapeHtml(String(b.count))} ห้อง</div>
          <div class="actions">
            <button type="button" class="btn-confirm" onclick="updateHomestayStatus('${b._id}', 'อนุมัติแล้ว')">ยืนยันการจอง</button>
            <button type="button" class="btn-cancel" onclick="updateHomestayStatus('${b._id}', 'ไม่อนุมัติ')">ยกเลิกการจอง</button>
          </div>
        </div>
      `;
    } else if (b.status === 'อนุมัติแล้ว') {
      approvedRowsHtml += `
        <tr>
          <td>${escapeHtml(b.display_name || 'ผู้เข้าพักทั่วไป')}</td>
          <td>${escapeHtml(b.email || '-')}</td>
          <td>${escapeHtml(b.phone || '-')}</td>
          <td>${escapeHtml(b.name || 'ไม่ระบุชื่อห้องพัก')}</td>
          <td>${escapeHtml(b.roomType || '-')}</td>
          <td>${escapeHtml(String(b.count))} ห้อง</td>
          <td>${escapeHtml(b.date)}</td>
          <td>${escapeHtml(checkOutDate)}</td>
        </tr>
      `;
    }
  });

  const hsPanelDateEl = document.getElementById('homestayPanelDate');
  if (hsPanelDateEl) hsPanelDateEl.textContent = formatThaiDate(hsSelectedDate);
  const hsPendingCountEl = document.getElementById('homestayPendingCount');
  if (hsPendingCountEl) hsPendingCountEl.textContent = `ทั้งหมด ${pendingCount} รายการ`;

  if (pendingPanel && document.getElementById('homestayPendingPanel')) {
    pendingPanel.querySelectorAll('.pending-card, .empty-pending-msg').forEach(el => el.remove());
    if (pendingCount === 0) {
      pendingPanel.insertAdjacentHTML('beforeend', `<div class="empty-pending-msg">ไม่มีรายการรออนุมัติการจองห้องพักในวันที่เลือก</div>`);
    } else {
      pendingPanel.insertAdjacentHTML('beforeend', pendingHtml);
    }
  }

  const hsTableDateEl = document.getElementById('homestayTableDate');
  if (hsTableDateEl) hsTableDateEl.textContent = formatThaiDate(hsSelectedDate);
  if (approvedBody && document.getElementById('homestayApprovedBody')) {
    approvedBody.innerHTML = approvedRowsHtml || `<tr><td colspan="7" style="text-align:center; padding: 20px; opacity:0.8;">ยังไม่มีรายชื่อห้องพักที่อนุมัติในวันที่เลือก</td></tr>`;
  }
  const hsApprovedCountEl = document.getElementById('homestayApprovedCount');
  if (hsApprovedCountEl) hsApprovedCountEl.textContent = `ทั้งหมด ${dateBookings.filter(b => b.status === 'อนุมัติแล้ว').length} รายชื่อ`;
}

window.updateVisitStatus = async function(bookingId, newStatus) {
  try {
    const response = await fetch(`/api/customer/bookings/${bookingId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (!response.ok) throw new Error('ไม่สามารถอัปเดตสถานะได้');
    alert(`อัปเดตสถานะเป็น "${newStatus}" เรียบร้อยแล้ว`);
    fetchBookingsFromDB();
  } catch (err) {
    console.error('Update visit status error:', err);
    alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
  }
};

window.updateHomestayStatus = async function(bookingId, newStatus) {
  if (!bookingId) {
    alert('ไม่พบรหัสการจอง');
    return;
  }
  try {
    const response = await fetch(`/api/customer/homestay/${bookingId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (!response.ok) throw new Error('ไม่สามารถอัปเดตสถานะได้');
    alert(`อัปเดตสถานะ Homestay เป็น "${newStatus}" เรียบร้อยแล้ว`);
    fetchBookingsFromDB();
  } catch (err) {
    console.error('Update homestay status error:', err);
    alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
  }
};

async function init() {
  drawVisitCalendar();          
  drawHomestayCalendar();
  await loadOwnerGardens();     
  await fetchBookingsFromDB();  
}

init();
let allGardens = [];
let currentGarden = null;

let currentThaiYear = new Date().getFullYear() + 543; 

const statusMessage = document.getElementById('statusMessage');
const detailCard = document.getElementById('detailCard');
const gardenSelect = document.getElementById('gardenSelect');

async function loadGardens() {
  try {
    const response = await OwnerAuth.authFetch('/api/owner/gardens');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'โหลดข้อมูลไม่สำเร็จ');

    allGardens = data.gardens || [];
    if (allGardens.length === 0) return;

    populateSelect();
    renderGarden(allGardens[0]);
  } catch (err) {
    console.error('Load gardens error:', err);
  }
}

function populateSelect() {
  if (!gardenSelect) return;
  gardenSelect.innerHTML = allGardens
    .map(g => `<option value="${g._id}">${escapeHtml(g.garden_name || 'ไม่ระบุชื่อสวน')}</option>`)
    .join('');
}

if (gardenSelect) {
  gardenSelect.addEventListener('change', () => {
    const selected = allGardens.find(g => g._id === gardenSelect.value);
    if (selected) renderGarden(selected);
  });
}

function renderGarden(garden) {
  currentGarden = garden;
  if (gardenSelect) gardenSelect.value = garden._id;
  fetchDashboardSummary(garden._id, currentThaiYear);
}

async function fetchDashboardSummary(gardenId, thaiYear) {
  try {
    const christYear = thaiYear - 543;
    const response = await OwnerAuth.authFetch(`/api/owner/dashboard-summary?gardenId=${gardenId}&year=${christYear}`);
    const data = await response.json();

    if (response.ok) {
      document.getElementById('statPending').textContent = data.pendingCount ?? 0;
      document.getElementById('statReviews').textContent = data.reviewCount ?? 0;
      document.getElementById('statAvgScore').textContent = data.avgScore ?? '0.0';

      // อัปเดตข้อความแสดงปีทั้ง 2 การ์ด
      document.getElementById('currentYearLabel').textContent = `ปี ${thaiYear}`;
      document.getElementById('currentYearLabel2').textContent = `ปี ${thaiYear}`;

      renderBookingChart(data.monthlyBookings || Array(12).fill(0));
      renderReviewChart(data.monthlyReviewsAvg || Array(12).fill(0));
    }
  } catch (err) {
    console.error('Fetch dashboard error:', err);
  }
}

function setupYearSwitchers() {
  const changeYear = (offset) => {
    currentThaiYear += offset;
    if (currentGarden) {
      fetchDashboardSummary(currentGarden._id, currentThaiYear);
    }
  };

  document.querySelectorAll('.chart-card').forEach((card, idx) => {
    const prevBtn = card.querySelector('.year-switch button:first-of-type');
    const nextBtn = card.querySelector('.year-switch button:last-of-type');

    if (prevBtn) prevBtn.onclick = () => changeYear(-1);
    if (nextBtn) nextBtn.onclick = () => changeYear(1);
  });
}

function renderBookingChart(monthlyValues) {
  const container = document.querySelector('.charts-row .chart-card:nth-child(1) .chart-frame svg');
  if (!container) return;

  const maxVal = Math.max(...monthlyValues, 5);
  container.querySelectorAll('.dynamic-bar, .dynamic-value-text').forEach(el => el.remove());

  const xPositions = [45, 88, 131, 174, 217, 260, 303, 346, 389, 432, 475, 518];
  
  monthlyValues.forEach((val, index) => {
    const x = xPositions[index];
    const chartHeight = 160;
    const barHeight = (val / maxVal) * chartHeight;
    const y = 180 - barHeight;

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('class', 'dynamic-bar');
    rect.setAttribute('x', x - 10);
    rect.setAttribute('y', y);
    rect.setAttribute('width', '20');
    rect.setAttribute('height', Math.max(barHeight, 2));
    rect.setAttribute('fill', '#17663f');
    rect.setAttribute('rx', '4');
    container.appendChild(rect);

    if (val > 0) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('class', 'dynamic-value-text');
      text.setAttribute('x', x);
      text.setAttribute('y', y - 6);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', '#374151');
      text.setAttribute('font-size', '10px');
      text.textContent = val;
      container.appendChild(text);
    }
  });

  const topAxisLabel = document.getElementById('bookingTopAxis');
  if (topAxisLabel) topAxisLabel.textContent = maxVal;
}

function renderReviewChart(monthlyAvgs) {
  const container = document.querySelector('.charts-row .chart-card:nth-child(2) .chart-frame svg');
  if (!container) return;

  container.querySelectorAll('.dynamic-line, .dynamic-dot, .dynamic-review-text').forEach(el => el.remove());

  const xPositions = [45, 88, 131, 174, 217, 260, 303, 346, 389, 432, 475, 518];
  let points = [];

  monthlyAvgs.forEach((avg, index) => {
    const x = xPositions[index];
    const y = 180 - (avg / 5) * 160;
    points.push(`${x},${y}`);

    if (avg > 0) {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('class', 'dynamic-dot');
      circle.setAttribute('cx', x);
      circle.setAttribute('cy', y);
      circle.setAttribute('r', '4');
      circle.setAttribute('fill', '#f59e0b');
      container.appendChild(circle);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('class', 'dynamic-review-text');
      text.setAttribute('x', x);
      text.setAttribute('y', y - 8);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', '#b45309');
      text.setAttribute('font-size', '10px');
      text.setAttribute('font-weight', 'bold');
      text.textContent = avg;
      container.appendChild(text);
    }
  });

  if (points.length > 0) {
    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('class', 'dynamic-line');
    polyline.setAttribute('points', points.join(' '));
    polyline.setAttribute('fill', 'none');
    polyline.setAttribute('stroke', '#f59e0b');
    polyline.setAttribute('stroke-width', '2.5');
    container.appendChild(polyline);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

setupYearSwitchers();
loadGardens();
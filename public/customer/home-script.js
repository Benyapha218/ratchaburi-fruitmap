let recommendedIds = new Set();

const RECOMMEND_LIMIT = 6;

document.addEventListener('DOMContentLoaded', loadGardensData);

async function attachRatings(gardens) {
  return Promise.all(gardens.map(async g => {
    try {
      const res = await fetch(`/api/customer/reviews?garden_id=${encodeURIComponent(g._id)}`);
      if (!res.ok) return { ...g, average_rating: 0, review_count: 0 };
      const data = await res.json();
      return {
        ...g,
        average_rating: Number(data.avgScore) || 0,
        review_count: Number(data.reviewCount) || 0
      };
    } catch (e) {
      return { ...g, average_rating: 0, review_count: 0 };
    }
  }));
}

function isGardenClosedToday(garden) {
  const st = garden && (garden.openStatus || garden.open_status);
  if (!st) return false;                       // ไม่มีข้อมูล = เปิดปกติ
  if (st.isOpen !== false && st.isOpen !== 'false') return false;

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const from = st.closedFrom ? String(st.closedFrom).split('T')[0] : '0000-00-00';
  const to = st.closedTo ? String(st.closedTo).split('T')[0] : '9999-12-31';
  return todayStr >= from && todayStr <= to;
}

async function fetchGardens() {
  const urls = ['/api/customer/gardens', '/api/map/gardens'];
  let lastErr = null;

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        lastErr = new Error(`${url} ตอบกลับสถานะ ${res.status}`);
        console.warn(lastErr.message);
        continue;
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.gardens || []);
      console.info(`โหลดสวนจาก ${url}: ${list.length} รายการ`);
      return list;
    } catch (e) {
      lastErr = e;
      console.warn(`${url} ใช้ไม่ได้:`, e.message);
    }
  }
  throw lastErr || new Error('ไม่สามารถโหลดรายการสวนได้');
}

async function ensureOpenStatus(gardens) {
  if (gardens.some(g => g.openStatus !== undefined)) return gardens;

  console.info('รายการสวนไม่มี openStatus จึงดึงจากรายละเอียดสวนแต่ละแห่งแทน');
  return Promise.all(gardens.map(async g => {
    try {
      const res = await fetch(`/api/customer/gardens/${g._id}`);
      if (!res.ok) return g;
      const data = await res.json();
      return { ...g, openStatus: data.garden && data.garden.openStatus };
    } catch (e) {
      return g;
    }
  }));
}

async function loadGardensData() {
  const recommendTrack = document.getElementById('carouselTrack');
  const openTrack = document.getElementById('openTrack');

  if (recommendTrack) recommendTrack.innerHTML = `<div style="padding:20px; color:#9ca3af;">กำลังโหลด...</div>`;
  if (openTrack) openTrack.innerHTML = `<div style="padding:20px; color:#9ca3af;">กำลังโหลด...</div>`;

  try {
    let gardens = await fetchGardens();

    if (gardens.length === 0) {
      if (recommendTrack) recommendTrack.innerHTML = `<div style="padding:20px; color:#9ca3af;">ยังไม่มีสวนในระบบ</div>`;
      if (openTrack) openTrack.innerHTML = `<div style="padding:20px; color:#9ca3af;">ยังไม่มีสวนในระบบ</div>`;
      return;
    }

    gardens = await ensureOpenStatus(gardens);
    gardens = await attachRatings(gardens);

    const recGardens = gardens
      .filter(g => g.review_count > 0)
      .sort((a, b) => (b.average_rating - a.average_rating) || (b.review_count - a.review_count))
      .slice(0, RECOMMEND_LIMIT);
    recommendedIds = new Set(recGardens.map(g => String(g._id)));

    if (recommendTrack) {
      recommendTrack.innerHTML = recGardens.length === 0
        ? `<div style="padding:20px; color:#9ca3af;">ยังไม่มีสวนที่ได้รับรีวิว</div>`
        : recGardens.map(renderGardenCard).join('');
    }

    if (openTrack) {
      const openGardens = gardens.filter(g => !isGardenClosedToday(g));
      openTrack.innerHTML = openGardens.length === 0
        ? `<div style="padding:20px; color:#9ca3af;">ไม่มีสวนที่เปิดทำการในวันนี้</div>`
        : openGardens.map(renderGardenCard).join('');
    }

  } catch (err) {
    console.error('Load gardens error:', err);
    const msg = `<div style="padding:20px; color:#dc2626;">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>`;
    if (recommendTrack) recommendTrack.innerHTML = msg;
    if (openTrack) openTrack.innerHTML = msg;
  }
}

function renderGardenCard(garden) {
  const noImage = "data:image/svg+xml;utf8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="280" height="180"><rect width="100%" height="100%" fill="#e5ebe6"/><text x="50%" y="50%" fill="#9ca3af" font-size="14" text-anchor="middle" dominant-baseline="middle">ไม่มีรูปภาพ</text></svg>');
  const img = (garden.images && garden.images[0]) || noImage;
  const name = escapeHtml(garden.garden_name || 'ไม่ระบุชื่อสวน');
  const rating = Number(garden.average_rating || 0);

  const tags = [];
  if (isGardenClosedToday(garden)) {
    tags.push('<span style="background:#fee2e2; color:#991b1b; padding:2px 6px; font-size:11px; border-radius:4px; border:1px solid #fca5a5;">🚫 ปิดทำการชั่วคราว</span>');
  }
  if (garden.hasHomestay) {
    tags.push('<span style="background:#f0fdf4; color:#166534; padding:2px 6px; font-size:11px; border-radius:4px; border:1px solid #d1fae5;">Homestay</span>');
  }
  if (recommendedIds.has(String(garden._id))) {
    tags.push('<span style="background:#fef9c3; color:#854d0e; padding:2px 6px; font-size:11px; border-radius:4px; border:1px solid #fde047;">⭐ สวนแนะนำ</span>');
  }

  return `
    <div class="garden-card" onclick="location.href='garden-detail.html?id=${garden._id}'" style="cursor: pointer; text-align: left; padding: 12px; background: white; border-radius: 16px; border: 1px solid #e0d8c8; width: 280px; flex: 0 0 auto;">
      <div style="position: relative;">
        <img src="${img}" alt="${name}" onerror="this.onerror=null;this.src='${noImage}'" style="width: 100%; height: 180px; object-fit: cover; border-radius: 12px; display: block;">
        ${rating > 0 ? `<span style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.75); color: #facc15; padding: 2px 8px; font-size: 12px; font-weight: 700; border-radius: 20px;">⭐ ${rating.toFixed(1)}${garden.review_count ? ` (${garden.review_count})` : ''}</span>` : ''}
      </div>
      <div style="margin-top: 10px;">
        <div style="font-weight: 700; color: #14532d; font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</div>
        <p style="font-size: 12px; color: #6b7280; margin: 4px 0 8px 0;">${escapeHtml(formatGardenAddress(garden))}</p>
        ${tags.length ? `<div style="display: flex; flex-wrap: wrap; gap: 4px;">${tags.join('')}</div>` : ''}
      </div>
    </div>
  `;
}

function formatGardenAddress(garden) {
  const address = garden.address || {};
  return [
    address.subdistrict ? `ต.${address.subdistrict}` : '',
    address.district ? `อ.${address.district}` : '',
    address.province ? `จ.${address.province}` : ''
  ].filter(Boolean).join(' ') || 'ราชบุรี';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
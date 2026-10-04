let allGardens = [];
let currentGarden = null;

const REASON_TH = {
  weather: 'สภาพอากาศ / ภัยธรรมชาติ',
  no_harvest: 'ผลผลิตหมด / นอกฤดูกาล',
  maintenance: 'ปรับปรุง / ซ่อมแซม',
  personal: 'ธุระส่วนตัว',
  other: 'อื่น ๆ'
};

function isGardenClosedNow(g) {
  const st = g && g.openStatus;
  if (!st || st.isOpen !== false) return false;
  const today = new Date().toISOString().split('T')[0];
  return (!st.closedFrom || today >= st.closedFrom) && (!st.closedTo || today <= st.closedTo);
}

function isRoomBlockedOn(h, dateStr) {
  return Array.isArray(h.statusMatrix) &&
         h.statusMatrix.some(x => x.date === dateStr && x.status === 'booked');
}

function getAvailableRoomsToday(h) {
  const total = parseInt(h.roomCount, 10) || 0;
  const today = new Date().toISOString().split('T')[0];
  if (isGardenClosedNow(currentGarden)) return 0;
  if (isRoomBlockedOn(h, today)) return 0;
  const approved = (currentGarden && Array.isArray(currentGarden.approvedBookings)) ? currentGarden.approvedBookings : [];
  const booked = approved
    .filter(b => b.name === h.name &&
                 today >= b.date &&
                 today < String(b.endTime || '').replace('เช็คเอาท์: ', ''))
    .reduce((sum, b) => sum + (parseInt(b.count, 10) || 0), 0);
  return Math.max(0, total - booked);
}

let map = null;
let marker = null;

const statusMessage = document.getElementById('statusMessage');
const detailCard = document.getElementById('detailCard');
const gardenSelect = document.getElementById('gardenSelect');
const deleteBtn = document.getElementById('deleteBtn');
const editGardenBtn = document.getElementById('editGardenBtn');

editGardenBtn.addEventListener('click', () => {
  if (currentGarden) {
    window.location.href = `add-garden2.html?id=${currentGarden._id}`;
  } else {
    window.location.href = 'add-garden2.html';
  }
});

const detailModal = document.getElementById('detailModal');
const detailModalTitle = document.getElementById('detailModalTitle');
const detailModalBody = document.getElementById('detailModalBody');
const detailModalClose = document.getElementById('detailModalClose');

function openDetailModal(type) {
  if (!currentGarden) return;
  let title = '';
  let bodyHtml = '';

if (type === 'standard') {
    const standardsList = Array.isArray(currentGarden.standards) && currentGarden.standards.length > 0 
      ? currentGarden.standards 
      : (currentGarden.reg_num || currentGarden.standard_detail ? [{
          reg_num: currentGarden.reg_num,
          standard_detail: currentGarden.standard_detail,
          logo_images: currentGarden.certInputLogo || [],
          certificates: currentGarden.certInput || []
        }] : []);

    title = 'มาตรฐานสวน';
    if (standardsList.length === 0) {
      bodyHtml = `<div style="font-size:12.5px; color:#9ca3af; padding: 14px 0; text-align: center; background: #ffffff; border-radius: 8px; margin-top: 8px;">📋 ยังไม่มีข้อมูลมาตรฐานสวน</div>`;
    } else {
      bodyHtml = `
        <div class="workshop-list">
          ${standardsList.map((std, index) => {
            // ดึงรูปโลโก้และใบรับรองของมาตรฐานนี้
            const logos = Array.isArray(std.logo_images) ? std.logo_images : (std.logo ? [std.logo] : []);
            const certs = Array.isArray(std.certificates) ? std.certificates : (std.certificate ? [std.certificate] : []);

            return `
              <div class="workshop-mini-item2" style="margin-bottom: 12px; flex-direction: column; align-items: flex-start;">
                <div style="font-weight: 700; color: #17663f; margin-bottom: 4px;">มาตรฐานที่ ${index + 1}</div>${std.reg_num ? `<div class="workshop-mini-title"><strong>ชื่อมาตรฐาน:</strong> ${escapeHtml(std.reg_num)}</div>` : ''}
                ${std.standard_detail ? `<div class="workshop-mini-desc" style="margin-top: 4px;"><strong>รายละเอียด:</strong> ${escapeHtml(std.standard_detail)}</div>` : ''}
                
                <!-- ส่วนแสดงรูปโลโก้และใบรับรอง -->
                <div style="display: flex; gap: 12px; margin-top: 8px; flex-wrap: wrap;">
                  ${logos.length > 0 ? `
                    <div>
                      <div style="font-size: 12px; color: #4b5563; margin-bottom: 2px;">โลโก้มาตรฐาน:</div>
                      <img src="${logos[0]}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd;">
                    </div>
                  ` : ''}
                  ${certs.length > 0 ? `
                    <div>
                      <div style="font-size: 12px; color: #4b5563; margin-bottom: 2px;">ใบรับรอง:</div>
                      <img src="${certs[0]}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd;">
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }
  } else if (type === 'price') {
    const products = Array.isArray(currentGarden.products) ? currentGarden.products : [];
    title = 'ราคาผลไม้';
    bodyHtml = products.length === 0
      ? `<div style="font-size:12.5px; color:#9ca3af; padding: 14px 0; text-align: center; background: #ffffff; border-radius: 8px;">ยังไม่มีข้อมูลราคาผลไม้</div>`
      : `
        <div class="season-table-wrap">
          <table class="season-table">
            <thead>
              <tr>
                <th>รูปภาพ</th>
                <th>ผลไม้</th>
                <th>สายพันธุ์</th>
                <th>เกรด</th>
                <th>ราคาหน้าสวน</th>
                <th>ราคาออนไลน์</th>
              </tr>
            </thead>
            <tbody>
              ${products.map(p => `
                <tr>
                  <td>
                    ${p.image 
                      ? `<img src="${escapeHtml(p.image)}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; display: block;">` 
                      : `<span style="color: #9ca3af; font-size: 12px;">ไม่มีรูป</span>`
                    }
                  </td>
                  <td><strong>${escapeHtml(p.fruitName || '-')}</strong></td>
                  <td><strong>${escapeHtml(p.variety || '-')}</strong></td>
                  <td>${escapeHtml(p.grade || '-')}</td>
                  <td>${p.priceOffline ? `฿${escapeHtml(String(p.priceOffline))} / ${escapeHtml(p.unitOffline || 'หน่วย')}` : '-'}</td>
                  <td>${p.priceOnline ? `฿${escapeHtml(String(p.priceOnline))} / ${escapeHtml(p.unitOnline || 'หน่วย')}` : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
  } else if (type === 'homestay') {
    const homestaysList = Array.isArray(currentGarden.homestays) ? currentGarden.homestays : [];
    title = 'ข้อมูล Homestay';
    if (homestaysList.length === 0) {
      bodyHtml = `<div style="font-size:12.5px; color:#9ca3af; padding: 14px 0; text-align: center; background: #ffffff; border-radius: 8px;">🏡 สวนนี้ยังไม่มี Homestay</div>`;
    } else {
      bodyHtml = `
        <div class="homestay-gallery-wrap" id="homestayGalleryWrap">
          <button type="button" class="homestay-nav prev" id="homestayPrev">‹</button>
          <div class="homestay-track" id="homestayTrack">
            ${homestaysList.map((h, index) => {
              // รวมรูป Homestay และรูปภายในห้องทั้งหมดเข้าด้วยกัน
              const allImages = [
                ...(Array.isArray(h.images) ? h.images : (h.image ? [h.image] : [])),
                ...(Array.isArray(h.interiorImages) ? h.interiorImages : (h.interiorImage ? [h.interiorImage] : []))
              ];
              const firstImage = allImages.length > 0 ? allImages[0] : '';

              return `
                <div class="homestay-slide" data-index="${index}">
                  <div class="homestay-popup-content">
                    <!-- 1. รูปหลักขนาดใหญ่ด้านบน -->
                    <div class="main-image-container">
                      ${firstImage 
                        ? `<img id="mainHomestayImg_${index}" src="${firstImage}" alt="รูปหลัก Homestay" style="width: 100%; height: 280px; object-fit: cover; border-radius: 12px; background: #e5ebe6; display: block;">` 
                        : `<div id="mainHomestayImg_${index}" class="no-image-box" style="height:280px; display:flex; align-items:center; justify-content:center; background:#e5ebe6; border-radius:12px; color:#6b7280;">ไม่มีรูปภาพ</div>`
                      }
                    </div>

                    <!-- 2. แถวรูปย่อยด้านล่าง (Thumbnail) -->
                    <div class="thumbnail-list" style="display: flex; gap: 10px; margin-top: 12px; overflow-x: auto; padding-bottom: 5px;">
                      ${allImages.length > 0 ? allImages.map((imgUrl, imgIdx) => `
                        <img src="${imgUrl}" class="thumb-img-${index}" data-src="${imgUrl}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 2px solid ${imgIdx === 0 ? '#17663f' : 'transparent'}; transition: 0.2s;">
                      `).join('') : '<p style="color: #6b7280; font-size: 14px;">ไม่มีรูปภาพ</p>'}
                    </div>
                  </div>

                  <div class="homestay-info" style="margin-top:15px;">
                    <div class="h-title" style="font-weight: 700; font-size: 16px; color: #17663f;">${escapeHtml(h.name || `ห้องที่ ${index + 1}`)}</div>
                    ${h.roomType ? `<div class="h-meta" style="margin-top: 4px; color: #374151;">ประเภทห้อง: ${escapeHtml(h.roomType)}</div>` : ''}
                    ${h.roomCount ? `<div class="h-meta" style="margin-top: 2px; color: #374151;">ห้องว่างวันนี้: ${getAvailableRoomsToday(h)} / ${escapeHtml(String(h.roomCount))} ห้อง${getAvailableRoomsToday(h) <= 0 ? ' <span style="color:#dc2626; font-weight:700;">(เต็ม)</span>' : ''}</div>` : ''}
                    ${h.description ? `<div class="h-desc" style="margin-top: 6px; color: #4b5563;">${escapeHtml(h.description)}</div>` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          <button type="button" class="homestay-nav next" id="homestayNext">›</button>
        </div>
        <div class="homestay-dots" id="homestayDots"></div>
      `;
    }
  }

  detailModalTitle.textContent = title;
  detailModalBody.innerHTML = bodyHtml;
  detailModal.classList.add('open');

  if (type === 'homestay') {
    const homestaysList = Array.isArray(currentGarden.homestays) ? currentGarden.homestays : [];
    if (homestaysList.length > 0) {
      setupHomestayGallery(homestaysList.length);

      // ผูก Event ให้เมื่อคลิกรูปย่อย (Thumbnail) แล้วสลับรูปขึ้นไปแสดงข้างบนแทน
      homestaysList.forEach((_, index) => {
        const mainImg = document.getElementById(`mainHomestayImg_${index}`);
        const thumbs = document.querySelectorAll(`.thumb-img-${index}`);
        thumbs.forEach(thumb => {
          thumb.addEventListener('click', (e) => {
            if (mainImg && mainImg.tagName === 'IMG') {
              mainImg.src = e.target.dataset.src;
            }
            thumbs.forEach(t => t.style.borderColor = 'transparent');
            e.target.style.borderColor = '#17663f';
          });
        });
      });
    }
  }
}

function closeDetailModal() { detailModal.classList.remove('open'); }
detailModalClose.addEventListener('click', closeDetailModal);
detailModal.addEventListener('click', (e) => { if (e.target === detailModal) closeDetailModal(); });

async function loadGardens() {
  try {
    const response = await OwnerAuth.authFetch('/api/owner/gardens');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'โหลดข้อมูลไม่สำเร็จ');
    allGardens = data.gardens || [];

    if (allGardens.length === 0) {
      statusMessage.textContent = 'ยังไม่มีข้อมูลสวนในระบบ — กด "+ เพิ่มสวน" เพื่อเริ่มต้น';
      detailCard.style.display = 'none';
      return;
    }

    populateSelect();
    const params = new URLSearchParams(window.location.search);
    const requestedId = params.get('id');
    const initialGarden = (requestedId && allGardens.find(g => String(g._id) === requestedId)) || allGardens[0];
    renderGarden(initialGarden);
  } catch (err) {
    statusMessage.classList.add('error');
    statusMessage.textContent = 'เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาตรวจสอบว่า server กำลังรันอยู่';
    console.error('Load gardens error:', err);
  }
}

function populateSelect() {
  gardenSelect.innerHTML = allGardens
    .map(g => `<option value="${g._id}">${escapeHtml(g.garden_name || 'ไม่ระบุชื่อสวน')}</option>`)
    .join('');
}

gardenSelect.addEventListener('change', () => {
  const selected = allGardens.find(g => g._id === gardenSelect.value);
  if (selected) renderGarden(selected);
});

function renderGarden(garden) {
  currentGarden = garden;
  gardenSelect.value = garden._id;
  statusMessage.style.display = 'none';
  detailCard.style.display = 'block';

  const name = escapeHtml(garden.garden_name || 'ไม่ระบุชื่อสวน');
  const desc = escapeHtml(garden.description || 'ยังไม่มีคำอธิบายสวน');
  const address = garden.address || {};
  const addressLine = [
    address.address_no ? `${address.address_no}` : '',
    address.moo ? `ม.${address.moo}` : '',
    address.subdistrict ? `ต.${address.subdistrict}` : '',
    address.district ? `อ.${address.district}` : '',
    address.province ? `จ.${address.province}` : ''
  ].filter(Boolean).join(' ') || 'ยังไม่ระบุที่อยู่';

  const contact = garden.contact || {};
  const seasonsList = Array.isArray(garden.fruit_seasons) ? garden.fruit_seasons : [];

  const os = garden.openStatus || {};
  const closedBanner = os.isOpen === false ? `
    <div class="closed-banner">
      <b>🚫 สวนปิดทำการชั่วคราว</b> — ${escapeHtml(REASON_TH[os.reason] || '')}
      ${os.detail ? '<br>' + escapeHtml(os.detail) : ''}
      ${(os.closedFrom || os.closedTo) ? '<br>ช่วงที่ปิด: ' + escapeHtml(os.closedFrom || 'ไม่ระบุ') + ' ถึง ' + escapeHtml(os.closedTo || 'ไม่ระบุ') : ''}
      <br><a href="gaedenOpen.html?id=${garden._id}">แก้ไขสถานะ</a>
    </div>` : '';

  detailCard.innerHTML = `
    <div class="page-grid">
      <div class="main-col">
        <div class="detail-header">
          <div class="detail-header-left">
            <h2>${name}</h2>
          </div>
        </div>

        ${closedBanner}

        <div class="tag-row">
          <span class="tag-pill">สวนผลไม้</span>
        </div>

        <div class="gallery-wrap" id="galleryWrap">
          <button type="button" class="gallery-nav prev" id="galleryPrev">‹</button>
          <div class="gallery-track" id="galleryTrack"></div>
          <button type="button" class="gallery-nav next" id="galleryNext">›</button>
        </div>
        <div class="dots" id="galleryDots"></div>

        <div class="desc-block">
          <h3>คำอธิบายสวน</h3>
          <p>${desc}</p>

          <h3 style="margin-top: 20px;">📅 ปฏิทินฤดูกาลและผลผลิตของสวน</h3>

          <div class="table-responsive">
            <table class="season-table" id="seasonMatrixTable">
              <thead>
                <tr>
                  <th style="text-align: left; padding-left: 12px;">ผลไม้ / พันธุ์</th>
                  <th>ม.ค.</th>
                  <th>ก.พ.</th>
                  <th>มี.ค.</th>
                  <th>เม.ย.</th>
                  <th>พ.ค.</th>
                  <th>มิ.ย.</th>
                  <th>ก.ค.</th>
                  <th>ส.ค.</th>
                  <th>ก.ย.</th>
                  <th>ต.ค.</th>
                  <th>พ.ย.</th>
                  <th>ธ.ค.</th>
                </tr>
              </thead>
              <tbody>
                ${seasonsList.length === 0 ? `
                  <tr>
                    <td colspan="13" style="text-align: center; color: #9ca3af; padding: 20px;">
                      ยังไม่มีข้อมูลฤดูกาลผลไม้ในระบบ
                    </td>
                  </tr>
                ` : seasonsList.map(s => {
                  const fruitName = escapeHtml(s.fruitName || 'ไม่ระบุ');
                  const variety = s.variety ? ` (${escapeHtml(s.variety)})` : '';
                  const monthsData = s.months || {};

                  let monthCells = '';
                  for (let i = 0; i < 12; i++) {
                    const mInfo = monthsData[i];
                    if (mInfo && mInfo.active) {
                      if (mInfo.status === 'peak') {
                        monthCells += `<td class="peak">ผลดก</td>`;
                      } else if (mInfo.status === 'harvest') {
                        monthCells += `<td class="harvest">เก็บเกี่ยว</td>`;
                      } else if (mInfo.status === 'rest') {
                        monthCells += `<td class="rest">บำรุงต้น</td>`;
                      } else {
                        monthCells += `<td class="harvest">ออกผล</td>`;
                      }
                    } else {
                      monthCells += `<td class="rest">-</td>`;
                    }
                  }

                  return `
                    <tr>
                      <td class="fruit-name">${fruitName}${variety}</td>${monthCells}
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <div class="legend-container">
            <div class="legend-item">
              <div class="legend-box peak"></div>
              <span>ช่วงผลดก</span>
            </div>
            <div class="legend-item">
              <div class="legend-box harvest"></div>
              <span>ช่วงเก็บเกี่ยว</span>
            </div>
            <div class="legend-item">
              <div class="legend-box rest"></div>
              <span>ช่วงบำรุงต้น</span>
            </div>
          </div>
        </div>

        <div class="feature-grid">
          <div class="feature-card">
            <h4>มาตรฐานสวน</h4>
            <button type="button" class="btn-mini" onclick="openDetailModal('standard')">รายละเอียด</button>
          </div>
          <div class="feature-card">
            <h4>ราคาผลไม้</h4>
            <button type="button" class="btn-mini" onclick="openDetailModal('price')">รายละเอียด</button>
          </div>
          <div class="feature-card">
            <h4>ข้อมูล Homestay</h4>
            <button type="button" class="btn-mini" onclick="openDetailModal('homestay')">รายละเอียด</button>
          </div>
        </div>
      </div>

      <div class="side-col">
        <div class="info-box">
          <div class="info-title">ⓘ ข้อมูลติดต่อ</div>
          <div class="contact-list-horizontal">
            ${contact.phone ? `<div class="contact-item"><span class="contact-icon phone">📞</span><span>${escapeHtml(contact.phone)}</span></div>` : ''}
            ${contact.line ? `<div class="contact-item"><span class="contact-icon line">L</span><span>${escapeHtml(contact.line)}</span></div>` : ''}
            ${contact.facebook ? `<div class="contact-item"><span class="contact-icon facebook">f</span><span>${escapeHtml(contact.facebook)}</span></div>` : ''}
          </div>
          ${(!contact.phone && !contact.line && !contact.facebook) ? `<div class="info-line" style="color:#9ca3af; margin:0;">ยังไม่มีข้อมูลติดต่อ</div>` : ''}
        </div>

        <div class="info-box">
          <div class="info-title">พิกัดและแผนที่</div>
          <div class="info-line" style="margin-bottom:10px;">${addressLine}</div>
          <div class="map-wrap">
            <div id="mapView"></div>
          </div>
          <div class="map-btn-row">
            <button type="button" class="btn-block" id="navigateBtn">🧭 นำทาง</button>
          </div>
        </div>

        <div class="booking-box">
          <div class="info-title">เลือกวันเข้าชมสวน</div>
          <div class="booking-row">
            <input type="date" id="bookingDate">
            <button type="button" id="checkBookingBtn">เช็คตาราง</button>
          </div>

          <div class="info-title" style="margin-top: 18px;">กิจกรรมแนะนำตามวันที่เลือก</div>
          <div id="workshopResultBox"></div>

          <div class="info-title" style="margin-top: 18px;">ข้อมูลการจองเข้าชมสวน</div>
          <div id="workshopBookData"></div>
        </div>
      </div>
    </div>
  `;

  renderMap(garden);
  renderGallery(garden);
  setupBookingBox(garden);
  loadReviews(garden);
  if (typeof setupSeasonFilters === 'function') setupSeasonFilters();
}



function renderMap(garden) {
  const loc = garden.location || {};
  const lat = loc.lat || 13.5282;
  const lng = loc.lng || 99.8134;
  const hasRealLocation = !!(loc.lat && loc.lng);

  if (map) { map.remove(); map = null; }
  map = L.map('mapView', { zoomControl: true }).setView([lat, lng], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  if (hasRealLocation) { marker = L.marker([lat, lng]).addTo(map); }

  function openGoogleMapsDirections() {
    if (!hasRealLocation) {
      alert('สวนนี้ยังไม่มีการปักหมุดพิกัด กรุณาเพิ่มพิกัดก่อน');
      return;
    }
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  }

  map.on('click', openGoogleMapsDirections);
  document.getElementById('navigateBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    openGoogleMapsDirections();
  });
}

function setupBookingBox(garden) {
  const checkBtn = document.getElementById('checkBookingBtn');
  const dateInput = document.getElementById('bookingDate');
  const resultBox = document.getElementById('workshopResultBox');
  const bookingData = document.getElementById('workshopBookData');

  const today = new Date().toISOString().split('T')[0];
  dateInput.min = today;
  dateInput.value = today;

  function renderFilteredWorkshops(selectedDate) {
    const workshopsList = Array.isArray(garden.workshops) ? garden.workshops : [];
    const bookingsList = Array.isArray(garden.booking_slots) ? garden.booking_slots : [];

    const matched = workshopsList.filter(ws => (!ws.date && !ws.booking_date) || ws.date === selectedDate || ws.booking_date === selectedDate);
    const matched2 = bookingsList.filter(bk => (!bk.date && !bk.booking_date) || bk.date === selectedDate || bk.booking_date === selectedDate);

    resultBox.innerHTML = matched.length === 0 
      ? `<div style="font-size:12.5px; color:#9ca3af; padding: 14px 0; text-align: center; background: #ffffff; border-radius: 8px; margin-top: 8px;">📅 ไม่มีรอบกิจกรรมในวันที่ ${escapeHtml(selectedDate)}</div>`
      : `<div class="workshop-list">${matched.map(ws => `
          <div class="workshop-mini-item">
            ${ws.image ? `<img src="${ws.image}" alt="">` : ''}
            <div class="workshop-mini-info">
              <div class="workshop-mini-title">${escapeHtml(ws.workshop_name || ws.title || 'กิจกรรมสวน')}</div>
              ${ws.startTime ? `<div class="workshop-mini-time">⏰ ${escapeHtml(ws.startTime)} - ${escapeHtml(ws.endTime || '')}</div>` : ''}
            </div>
          </div>
        `).join('')}</div>`;

    if (matched2.length === 0) {
      bookingData.innerHTML = `<div style="font-size:12.5px; color:#9ca3af; padding: 14px 0; text-align: center; background: #ffffff; border-radius: 8px; margin-top: 8px;">🕒 ไม่มีการจองในวันที่ ${escapeHtml(selectedDate)}</div>`;
    } else {
      let itemsHtml = matched2.map(bk => {
        const capNum = parseInt(bk.capacity, 10) || 0;
        let capacityDisplay = capNum <= 0 
          ? '<span style="color: #dc2626; font-weight: 700;">เต็ม</span>' 
          : `<span>${capNum} คน</span>`;

        return `
          <div class="workshop-mini-item" style="font-size:12.5px; display:grid; grid-template-columns: 1fr 1fr 1fr; text-align:center; align-items:center;">
            <span>${escapeHtml(bk.date)}</span>
            <span>${escapeHtml(bk.startTime)} - ${escapeHtml(bk.endTime)}</span>
            ${capacityDisplay}
          </div>
        `;
      }).join('');

      bookingData.innerHTML = `<div class="workshop-list">${itemsHtml}</div>`;
    }
  }

  renderFilteredWorkshops(today);
  checkBtn.addEventListener('click', () => {
    if (!dateInput.value) { alert('กรุณาเลือกวันที่ก่อนครับ'); return; }
    renderFilteredWorkshops(dateInput.value);
  });
}

function renderGallery(garden) {
  const images = garden.images || [];
  const galleryWrap = document.getElementById('galleryWrap');
  const galleryTrack = document.getElementById('galleryTrack');
  const galleryDots = document.getElementById('galleryDots');
  const prevBtn = document.getElementById('galleryPrev');
  const nextBtn = document.getElementById('galleryNext');

  if (images.length === 0) {
    galleryWrap.innerHTML = `<div class="no-image-box">ยังไม่มีรูปภาพสวนนี้</div>`;
    galleryDots.innerHTML = '';
    return;
  }

  galleryTrack.innerHTML = images.map(src => `<img src="${src}" alt="" draggable="false">`).join('');
  const needsNav = images.length > 1;
  prevBtn.style.display = needsNav ? 'flex' : 'none';
  nextBtn.style.display = needsNav ? 'flex' : 'none';

  galleryDots.innerHTML = images.map((_, i) => `<button type="button" class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></button>`).join('');
  const dots = Array.from(galleryDots.querySelectorAll('.dot'));

  function scrollToIndex(index) {
    const imgEl = galleryTrack.children[index];
    if (!imgEl) return;
    galleryTrack.scrollTo({ left: imgEl.offsetLeft - galleryTrack.offsetLeft, behavior: 'smooth' });
  }

  function updateActiveDot() {
    const trackLeft = galleryTrack.scrollLeft;
    let closestIndex = 0, closestDistance = Infinity;
    Array.from(galleryTrack.children).forEach((imgEl, i) => {
      const distance = Math.abs(imgEl.offsetLeft - galleryTrack.offsetLeft - trackLeft);
      if (distance < closestDistance) { closestDistance = distance; closestIndex = i; }
    });
    dots.forEach((dot, i) => dot.classList.toggle('active', i === closestIndex));
  }

  dots.forEach(dot => dot.addEventListener('click', () => scrollToIndex(parseInt(dot.dataset.index, 10))));
  let currentIndex = 0;
  prevBtn.onclick = () => { currentIndex = Math.max(0, currentIndex - 1); scrollToIndex(currentIndex); };
  nextBtn.onclick = () => { currentIndex = Math.min(images.length - 1, currentIndex + 1); scrollToIndex(currentIndex); };
  galleryTrack.addEventListener('scroll', updateActiveDot, { passive: true });
}

function setupHomestayGallery(count) {
      const track = document.getElementById('homestayTrack');
      const dotsBox = document.getElementById('homestayDots');
      const prevBtn = document.getElementById('homestayPrev');
      const nextBtn = document.getElementById('homestayNext');
      if (!track) return;

      const needsNav = count > 1;
      prevBtn.style.display = needsNav ? 'flex' : 'none';
      nextBtn.style.display = needsNav ? 'flex' : 'none';
      dotsBox.innerHTML = needsNav ? Array.from({ length: count }, (_, i) => `<button type="button" class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></button>`).join('') : '';
      const dots = Array.from(dotsBox.querySelectorAll('.dot'));

      function scrollToIndex(index) {
        const slide = track.children[index];
        if (!slide) return;
        track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: 'smooth' });
        currentIndex = index;
        updateActiveDot();
      }

      function updateActiveDot() {
        const trackLeft = track.scrollLeft;
        let closestIndex = 0, closestDistance = Infinity;
        Array.from(track.children).forEach((slide, i) => {
          const distance = Math.abs(slide.offsetLeft - track.offsetLeft - trackLeft);
          if (distance < closestDistance) { closestDistance = distance; closestIndex = i; }
        });
        dots.forEach((dot, i) => dot.classList.toggle('active', i === closestIndex));
      }

      dots.forEach(dot => dot.addEventListener('click', () => scrollToIndex(parseInt(dot.dataset.index, 10))));
      let currentIndex = 0;
      prevBtn.onclick = () => { currentIndex = Math.max(0, currentIndex - 1); scrollToIndex(currentIndex); };
      nextBtn.onclick = () => { currentIndex = Math.min(count - 1, currentIndex + 1); scrollToIndex(currentIndex); };
      
      track.addEventListener('scroll', updateActiveDot, { passive: true });
    }

deleteBtn.addEventListener('click', async () => {
  if (!currentGarden) return;
  if (!confirm(`ต้องการลบข้อมูลสวน "${currentGarden.garden_name}" ใช่หรือไม่?`)) return;
  try {
    const response = await OwnerAuth.authFetch(`/api/owner/gardens/${currentGarden._id}`, { method: 'DELETE' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'ลบข้อมูลไม่สำเร็จ');
    alert('ลบข้อมูลสวนสำเร็จ');
    await loadGardens();
  } catch (err) {
    alert('เกิดข้อผิดพลาด: ' + err.message);
  }
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

loadGardens();
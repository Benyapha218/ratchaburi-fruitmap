let currentGarden = null;
let map = null;
let marker = null;
let currentSelectedSlot = null;
let pendingBookings = [];

// ===== สถานะเปิด/ปิดทำการของสวน =====
const REASON_TH = {
  weather: 'สภาพอากาศ / ภัยธรรมชาติ',
  no_harvest: 'ผลผลิตหมด / นอกฤดูกาล',
  maintenance: 'ปรับปรุง / ซ่อมแซม',
  personal: 'ธุระส่วนตัว',
  other: 'อื่น ๆ'
};

// สวนปิดทำการอยู่ ณ วันนี้หรือไม่ (ดูจาก garden.openStatus)
function isGardenClosedNow(g) {
  const st = g && g.openStatus;
  if (!st || st.isOpen !== false) return false;
  const today = new Date().toISOString().split('T')[0];
  return (!st.closedFrom || today >= st.closedFrom) && (!st.closedTo || today <= st.closedTo);
}

const statusMessage = document.getElementById('statusMessage');
const detailCard = document.getElementById('detailCard');

const detailModal = document.getElementById('detailModal');
const detailModalTitle = document.getElementById('detailModalTitle');
const detailModalBody = document.getElementById('detailModalBody');
const detailModalClose = document.getElementById('detailModalClose');

// เจ้าของสวนตั้งสถานะ "ไม่ว่าง/เต็ม" (✕) ของห้องประเภทนี้ในวันที่กำหนดไว้หรือไม่
function isRoomBlockedOn(h, dateStr) {
  return Array.isArray(h.statusMatrix) &&
         h.statusMatrix.some(x => x.date === dateStr && x.status === 'booked');
}

// คำนวณจำนวนห้องว่างของ Homestay ห้องนั้น ๆ ในวันนี้ (หักการจองที่ "อนุมัติแล้ว" และวันที่เจ้าของสวนปิดเอง)
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

function openDetailModal(type, slotData = null) {
  if (!currentGarden) return;

  // สวนปิดทำการ: ไม่ให้เปิดฟอร์มจอง
  if ((type === 'book_slot' || type === 'book_homestay') && isGardenClosedNow(currentGarden)) {
    alert('สวนปิดทำการชั่วคราว ไม่สามารถจองได้ในขณะนี้');
    return;
  }

  let title = '';
  let bodyHtml = '';

  if (type === 'standard') {
    const standardsList = Array.isArray(currentGarden.standards) && currentGarden.standards.length > 0 
      ? currentGarden.standards 
      : (currentGarden.reg_num || currentGarden.standard_detail ? [{
          reg_num: currentGarden.reg_num,
          standard_detail: currentGarden.standard_detail
        }] : []);

  title = 'มาตรฐานสวน';
    if (standardsList.length === 0) {
      bodyHtml = `<div style="font-size:12.5px; color:#9ca3af; padding: 14px 0; text-align: center; background: #ffffff; border-radius: 8px;">📋 ยังไม่มีข้อมูลมาตรฐานสวน</div>`;
    } else {
      bodyHtml = `
        <div class="workshop-list">
          ${standardsList.map((std, index) => {
            // ดึงรูปโลโก้และใบรับรองของมาตรฐานนี้
            const logos = Array.isArray(std.logo_images) ? std.logo_images : (std.logo ? [std.logo] : []);
            const certs = Array.isArray(std.certificates) ? std.certificates : (std.certificate ? [std.certificate] : []);

            return `
              <div class="workshop-mini-item2" style="margin-bottom: 12px; flex-direction: column; align-items: flex-start; padding: 14px 16px;">
                <div style="font-weight: 700; color: #17663f; font-size: 15px; margin-bottom: 4px;">มาตรฐานที่ ${index + 1}</div>${std.reg_num ? `<div class="workshop-mini-title" style="font-size: 14px;"><strong>ชื่อมาตรฐาน:</strong> ${escapeHtml(std.reg_num)}</div>` : ''}
                ${std.standard_detail ? `<div class="workshop-mini-desc" style="margin-top: 4px; font-size: 13px; color: #4b5563;"><strong>รายละเอียด:</strong> ${escapeHtml(std.standard_detail)}</div>` : ''}
                
                <!-- ส่วนแสดงรูปโลโก้และใบรับรอง -->
                <div style="display: flex; gap: 16px; margin-top: 12px; flex-wrap: wrap; align-items: flex-start;">
                  ${logos.length > 0 ? `
                    <div>
                      <div style="font-size: 12px; font-weight: 600; color: #4b5563; margin-bottom: 4px;">โลโก้มาตรฐาน:</div>
                      <img src="${logos[0]}" 
                           onclick="openImagePreview('${logos[0]}', 'โลโก้มาตรฐาน: ${escapeHtml(std.reg_num || '')}')"
                           title="คลิกเพื่อดูภาพขนาดใหญ่"
                           style="width: 95px; height: 95px; object-fit: contain; background: #ffffff; padding: 4px; border-radius: 8px; border: 1px solid #d1d5db; box-shadow: 0 1px 3px rgba(0,0,0,0.08); cursor: pointer; transition: transform 0.15s ease;">
                    </div>
                  ` : ''}
                  ${certs.length > 0 ? `
                    <div>
                      <div style="font-size: 12px; font-weight: 600; color: #4b5563; margin-bottom: 4px;">ใบรับรองมาตรฐาน:</div>
                      <div style="position: relative; display: inline-block; cursor: pointer;" onclick="openImagePreview('${certs[0]}', 'ใบรับรอง: ${escapeHtml(std.reg_num || '')}')">
                        <img src="${certs[0]}" 
                             title="คลิกเพื่อดูภาพขนาดใหญ่"
                             style="width: 95px; height: 120px; object-fit: cover; background: #ffffff; border-radius: 8px; border: 1px solid #d1d5db; box-shadow: 0 1px 3px rgba(0,0,0,0.08); display: block;">
                        <span style="position: absolute; bottom: 4px; right: 4px; background: rgba(0,0,0,0.65); color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 4px;">ดูเพิ่มเติม</span>
                      </div>
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
        <div class="table-responsive">
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
              const gardenClosed = isGardenClosedNow(currentGarden);
              const availableToday = getAvailableRoomsToday(h);
              const isFull = availableToday <= 0 || gardenClosed;

              // รวมรูป Homestay และรูปภายในห้องทั้งหมดเข้าด้วยกัน (เหมือนหน้าเจ้าของสวน)
              const allImages = [
                ...(Array.isArray(h.images) ? h.images : (h.image ? [h.image] : [])),
                ...(Array.isArray(h.interiorImages) ? h.interiorImages : (h.interiorImage ? [h.interiorImage] : []))
              ];
              const firstImage = allImages.length > 0 ? allImages[0] : '';

              return `
              <div class="homestay-slide" data-index="${index}">
                <div class="homestay-popup-content">
                  <!-- รูปหลักขนาดใหญ่ด้านบน -->
                  <div class="main-image-container">
                    ${firstImage
                      ? `<img id="mainHomestayImg_${index}" src="${firstImage}" alt="รูปหลัก Homestay" draggable="false" style="width: 100%; height: 280px; object-fit: cover; border-radius: 12px; background: #e5ebe6; display: block;">`
                      : `<div id="mainHomestayImg_${index}" class="no-image-box" style="height:280px; display:flex; align-items:center; justify-content:center; background:#e5ebe6; border-radius:12px; color:#6b7280;">ไม่มีรูปภาพ</div>`
                    }
                  </div>

                  <!-- แถวรูปย่อยด้านล่าง (Thumbnail) -->
                  ${allImages.length > 1 ? `
                  <div class="thumbnail-list" style="display: flex; gap: 10px; margin-top: 12px; overflow-x: auto; padding-bottom: 5px;">
                    ${allImages.map((imgUrl, imgIdx) => `
                      <img src="${imgUrl}" class="thumb-img-${index}" data-src="${imgUrl}" draggable="false" style="width: 70px; height: 70px; flex-shrink: 0; object-fit: cover; border-radius: 8px; cursor: pointer; border: 2px solid ${imgIdx === 0 ? '#17663f' : 'transparent'}; transition: 0.2s;">
                    `).join('')}
                  </div>` : ''}
                </div>
                <div class="homestay-info" style="margin-top:10px;">
                  <div class="h-title">${escapeHtml(h.name || `ห้องที่ ${index + 1}`)}</div>
                  ${h.roomType ? `<div class="h-meta">ประเภทห้อง: ${escapeHtml(h.roomType)}</div>` : ''}
                  ${h.roomCount ? `<div class="h-meta">ห้องว่างวันนี้: ${availableToday} / ${escapeHtml(String(h.roomCount))} ห้อง</div>` : ''}
                  ${h.description ? `<div class="h-desc">${escapeHtml(h.description)}</div>` : ''}

                  ${isFull
                    ? `<div style="width: 100%; margin-top: 14px; box-sizing: border-box; background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; border-radius: 8px; padding: 14px; font-weight: 700; text-align: center; font-size: 15px;">
                         ${gardenClosed ? '🚫 สวนปิดทำการชั่วคราว ไม่สามารถจองได้' : '🚫 ห้องเต็มแล้ว ไม่สามารถจองได้'}
                       </div>`
                    : `<!-- ปุ่มใหญ่คลิกเพื่อจอง -->
                       <button type="button" class="btn-open-hs-booking" data-index="${index}" style="width: 100%; margin-top: 14px; background: #17663f; color: #fff; border: none; border-radius: 8px; padding: 14px; font-weight: 700; cursor: pointer; font-size: 15px;">
                         📅 เลือกจอง Homestay นี้
                       </button>`
                  }
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
  } else if (type === 'book_slot' && slotData) {
    currentSelectedSlot = slotData;
    title = 'ระบุจำนวนผู้เข้าชมสวน';
    bodyHtml = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div style="font-size: 14px; color: #374151;">
          <div><strong>วันที่:</strong> ${escapeHtml(slotData.date)}</div>
          <div><strong>เวลา:</strong> ${escapeHtml(slotData.startTime)} - ${escapeHtml(slotData.endTime)}</div>
          <div><strong>รับได้สูงสุด:</strong> ${escapeHtml(String(slotData.capacity))} คน</div>
        </div>
        <div>
          <label style="display: block; font-weight: 600; margin-bottom: 6px; font-size: 13.5px;">จำนวนคนที่ต้องการจอง (คน):</label>
          <input type="number" id="inputBookingCount" min="1" max="${slotData.capacity}" value="1" 
            style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px;">
        </div>
        <div>
          <label style="display: block; font-weight: 600; margin-bottom: 6px; font-size: 13.5px;">เบอร์โทรศัพท์:</label>
          <input type="tel" id="inputPhone" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px;">
        </div>
        <button type="button" id="submitBookingBtn" style="background: #17663f; color: #fff; border: none; border-radius: 8px; padding: 12px; font-weight: 700; cursor: pointer; font-size: 14px;">
          ยืนยันการจอง
        </button>
      </div>
    `;
  } else if (type === 'book_homestay' && slotData) {
    title = 'ระบุข้อมูลการจอง Homestay (ภายใน 2 เดือน)';

    const now = new Date();
    let checkInOptionsHtml = '';
    let checkOutOptionsHtml = '';
    
    for (let i = 0; i < 60; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const dateVal = d.toISOString().split('T')[0];
      checkInOptionsHtml += `<option value="${dateVal}">${dateVal}</option>`;
    }

    for (let i = 1; i < 61; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const dateVal = d.toISOString().split('T')[0];
      checkOutOptionsHtml += `<option value="${dateVal}">${dateVal}</option>`;
    }

    // ฟังก์ชันคำนวณจำนวนห้องว่างตามวันที่เลือก
    function calculateAvailableRooms() {
      const checkIn = document.getElementById('inputHsCheckIn').value;
      const checkOut = document.getElementById('inputHsCheckOut').value;
      const totalRooms = parseInt(slotData.roomCount, 10) || 1;

      // ดึงรายการจองที่อนุมัติแล้วจากข้อมูลสวน (currentGarden.approvedBookings หรือโหลดมาตรวจสอบ)
      const approvedBookings = Array.isArray(currentGarden.approvedBookings) ? currentGarden.approvedBookings : [];

      let maxBookedRoomsInPeriod = 0;

      // วนลูปเช็คทีละวันในช่วงที่ลูกค้าเลือกเข้าพัก (Check-in ถึง Check-out)
      let curr = new Date(checkIn);
      const end = new Date(checkOut);

      while (curr < end) {
        const dateStr = curr.toISOString().split('T')[0];
        
        // นับจำนวนห้องที่ถูกจองและอนุมัติแล้วในวันนี้ สำหรับห้องพักชื่อนี้
        let bookedOnThisDay = 0;
        approvedBookings.forEach(b => {
          if (b.name === slotData.name) {
            // ตรวจสอบว่าวันที่เลือกตรงกับช่วงที่ลูกค้ารายอื่นจองไว้หรือไม่
            if (dateStr >= b.date && dateStr < b.endTime.replace('เช็คเอาท์: ', '')) {
              bookedOnThisDay += parseInt(b.count, 10) || 0;
            }
          }
        });

        // วันที่เจ้าของสวนตั้งเป็น "ไม่ว่าง/เต็ม" ให้ถือว่าห้องเต็มทุกห้องในคืนนั้น
        if (isRoomBlockedOn(slotData, dateStr)) {
          bookedOnThisDay = totalRooms;
        }

        // คืนที่สวนปิดทำการ (ตามช่วงวันที่เจ้าของตั้งไว้) ถือว่าห้องเต็มทุกห้อง
        const st = currentGarden.openStatus;
        if (st && st.isOpen === false &&
            (!st.closedFrom || dateStr >= st.closedFrom) &&
            (!st.closedTo || dateStr <= st.closedTo)) {
          bookedOnThisDay = totalRooms;
        }

        if (bookedOnThisDay > maxBookedRoomsInPeriod) {
          maxBookedRoomsInPeriod = bookedOnThisDay;
        }

        curr.setDate(curr.getDate() + 1);
      }

      const availableRooms = Math.max(0, totalRooms - maxBookedRoomsInPeriod);
      
      // อัปเดตข้อความแสดงจำนวนห้องว่างบนหน้า Modal
      const roomAvailableEl = document.getElementById('roomAvailableText');
      if (roomAvailableEl) {
        roomAvailableEl.textContent = availableRooms;
      }

      // อัปเดตค่า max ของ input จำนวนห้องที่จองได้
      const inputRooms = document.getElementById('inputHsRooms');
      if (inputRooms) {
        inputRooms.max = availableRooms;
        if (parseInt(inputRooms.value, 10) > availableRooms) {
          inputRooms.value = availableRooms > 0 ? availableRooms : 0;
        }
      }
    }

    bodyHtml = `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div style="font-size: 14px; color: #374151;">
          <div><strong>ห้องพัก:</strong> ${escapeHtml(slotData.name)}</div>
          <div><strong>ประเภทห้อง:</strong> ${escapeHtml(slotData.roomType || '-')}</div>
          <div><strong>จำนวนห้องว่างในวันที่เลือก:</strong> <span id="roomAvailableText" style="color: #166534; font-weight: 700;">${escapeHtml(String(slotData.roomCount || 10))}</span> ห้อง (จากทั้งหมด ${escapeHtml(String(slotData.roomCount || 10))} ห้อง)</div>
        </div>
        <div>
          <label style="display: block; font-weight: 600; margin-bottom: 6px; font-size: 13.5px;">วันที่เช็คอิน (Check-in):</label>
          <select id="inputHsCheckIn" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; background: #fff;">
            ${checkInOptionsHtml}
          </select>
        </div>
        <div>
          <label style="display: block; font-weight: 600; margin-bottom: 6px; font-size: 13.5px;">วันที่เช็คเอาท์ (Check-out):</label>
          <select id="inputHsCheckOut" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; background: #fff;">
            ${checkOutOptionsHtml}
          </select>
        </div>
        
        <div id="summaryStayDuration" style="padding: 10px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; font-size: 13.5px; color: #166534; font-weight: 600;">
          ระยะเวลาเข้าพัก: 1 คืน
        </div>

        <div>
          <label style="display: block; font-weight: 600; margin-bottom: 6px; font-size: 13.5px;">จำนวนห้องที่ต้องการจอง:</label>
          <input type="number" id="inputHsRooms" min="1" max="${slotData.roomCount || 10}" value="1" 
            style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px;">
        </div>
        <div>
          <label style="display: block; font-weight: 600; margin-bottom: 6px; font-size: 13.5px;">เบอร์โทรศัพท์:</label>
          <input type="tel" id="inputHsPhone" placeholder="0891234567" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px;">
        </div>
        <button type="button" id="submitHsBookingBtn" style="background: #17663f; color: #fff; border: none; border-radius: 8px; padding: 12px; font-weight: 700; cursor: pointer; font-size: 14px;">
          ยืนยันการจอง
        </button>
      </div>
    `;

    // ผูก Event ให้คำนวณใหม่ทันทีเมื่อเปลี่ยนวันที่เช็คอินหรือเช็คเอาท์
    setTimeout(() => {
      const checkInSelect = document.getElementById('inputHsCheckIn');
      const checkOutSelect = document.getElementById('inputHsCheckOut');
      if (checkInSelect && checkOutSelect) {
        checkInSelect.addEventListener('change', () => {
          calculateAvailableRooms();
        });
        checkOutSelect.addEventListener('change', () => {
          calculateAvailableRooms();
        });
        calculateAvailableRooms(); // คำนวณตั้งแต่เปิด Modal ครั้งแรก
      }
    }, 100);
  }
  detailModalTitle.textContent = title;
  detailModalBody.innerHTML = bodyHtml;
  detailModal.classList.add('open');

  if (type === 'book_slot') {
    const submitBtn = document.getElementById('submitBookingBtn');
    const inputCount = document.getElementById('inputBookingCount');
    const inputPhone = document.getElementById('inputPhone');
    
    if (submitBtn && inputCount) {
      submitBtn.addEventListener('click', async () => {
        const count = parseInt(inputCount.value, 10);
        const maxCap = parseInt(slotData.capacity, 10);
        const phone = inputPhone ? inputPhone.value.trim() : '';

        if (!count || count < 1) {
          alert('กรุณาระบุจำนวนคนให้ถูกต้อง');
          return;
        }
        if (count > maxCap) {
          alert(`ไม่สามารถจองเกินจำนวนสูงสุดที่กำหนดไว้ (${maxCap} คน) ได้ครับ`);
          return;
        }
        if (!phone) {
          alert('กรุณากรอกเบอร์โทรศัพท์สำหรับติดต่อ');
          return;
        }

        try {
          const loggedInUser = JSON.parse(localStorage.getItem('customer_user'));

          if (!loggedInUser || !loggedInUser.email) {
            alert('กรุณาเข้าสู่ระบบก่อนทำการจอง');
            window.location.href = 'login.html';
            return;
          }

          const bookingDataPayload = {
            display_name: loggedInUser.displayName || 'ผู้ใช้งานทั่วไป',
            email: loggedInUser.email || 'ไม่ระบุอีเมล',
            garden_id: currentGarden._id || currentGarden.id,
            garden_name: currentGarden.garden_name,
            date: slotData.date,
            startTime: slotData.startTime,
            endTime: slotData.endTime,
            count: count,
            phone: phone,
            status: 'รออนุมัติการจอง'
          };

          const response = await fetch('/api/customer/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingDataPayload)
          });

          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'ไม่สามารถบันทึกการจองได้');

          alert('ส่งคำขอจองสำเร็จ! บันทึกลงฐานข้อมูลเรียบร้อย');
          closeDetailModal();

          const dateInput = document.getElementById('bookingDate');
          if (dateInput) dateInput.dispatchEvent(new Event('change'));

        } catch (err) {
          console.error('Booking error:', err);
          alert('เกิดข้อผิดพลาด: ' + err.message);
        }
      });
    }
  }

  if (type === 'homestay') {
    const homestaysList = Array.isArray(currentGarden.homestays) ? currentGarden.homestays : [];
    if (homestaysList.length > 0) {
      setupHomestayGallery(homestaysList.length);

      // คลิกรูปย่อยแล้วสลับรูปหลักด้านบน
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

      document.querySelectorAll('.btn-open-hs-booking').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.target.dataset.index, 10);
          const homestayItem = homestaysList[idx];
          openDetailModal('book_homestay', homestayItem);
        });
      });
    }
  }

  if (type === 'book_homestay' && slotData) {
    const checkInSelect = document.getElementById('inputHsCheckIn');
    const checkOutSelect = document.getElementById('inputHsCheckOut');
    const summaryBox = document.getElementById('summaryStayDuration');

    function updateStaySummary() {
      const checkInDate = new Date(checkInSelect.value);
      const checkOutDate = new Date(checkOutSelect.value);
      const diffTime = checkOutDate - checkInDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        summaryBox.textContent = `ระยะเวลาเข้าพัก: ${diffDays} คืน`;
        summaryBox.style.color = '#166534';
        summaryBox.style.background = '#f0fdf4';
        summaryBox.style.borderColor = '#bbf7d0';
      } else {
        summaryBox.textContent = '⚠️ วันที่เช็คเอาท์ต้องอยู่หลังวันที่เช็คอินอย่างน้อย 1 วัน';
        summaryBox.style.color = '#dc2626';
        summaryBox.style.background = '#fef2f2';
        summaryBox.style.borderColor = '#fecaca';
      }
    }

    if (checkInSelect && checkOutSelect) {
      checkInSelect.addEventListener('change', updateStaySummary);
      checkOutSelect.addEventListener('change', updateStaySummary);
      updateStaySummary();
    }

    const submitBtn = document.getElementById('submitHsBookingBtn');
    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        const checkIn = checkInSelect.value;
        const checkOut = checkOutSelect.value;
        const rooms = parseInt(document.getElementById('inputHsRooms').value, 10);
        const maxRooms = parseInt(document.getElementById('inputHsRooms').max, 10) || 0; // ห้องว่างจริงในช่วงวันที่เลือก
        const phone = document.getElementById('inputHsPhone').value.trim();

        if (new Date(checkOut) <= new Date(checkIn)) {
          alert('วันที่เช็คเอาท์ต้องมากกว่าวันที่เช็คอิน');
          return;
        }
        if (!rooms || rooms < 1) {
          alert('กรุณาระบุจำนวนห้องให้ถูกต้อง');
          return;
        }
        if (rooms > maxRooms) {
          alert(`ไม่สามารถจองเกินจำนวนห้องที่มีอยู่ (${maxRooms} ห้อง) ได้ครับ`);
          return;
        }
        if (!phone) {
          alert('กรุณากรอกเบอร์โทรศัพท์สำหรับติดต่อ');
          return;
        }

        try {
          const loggedInUser = JSON.parse(localStorage.getItem('customer_user'));
          if (!loggedInUser || !loggedInUser.email) {
            alert('กรุณาเข้าสู่ระบบก่อนทำการจอง');
            window.location.href = 'login.html';
            return;
          }

          const bookingPayload = {
            display_name: loggedInUser.displayName || 'ผู้ใช้งานทั่วไป',
            email: loggedInUser.email,
            garden_id: currentGarden._id || currentGarden.id,
            name: slotData.name || '-',
            roomType: slotData.roomType || '-',
            garden_name: `${currentGarden.garden_name} (จอง Homestay: ${slotData.name || 'ห้องพัก'})`,
            date: checkIn,
            startTime: `เช็คอิน: ${checkIn}`,
            endTime: `เช็คเอาท์: ${checkOut}`,
            count: rooms,
            phone: phone,
            status: 'รออนุมัติการจอง'
          };

          const response = await fetch('/api/customer/homestay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingPayload)
          });

          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'ไม่สามารถบันทึกการจอง Homestay ได้');

          alert('ส่งคำขอจอง Homestay สำเร็จ! บันทึกข้อมูลเรียบร้อย');
          closeDetailModal();
        } catch (err) {
          console.error('Homestay booking error:', err);
          alert('เกิดข้อผิดพลาด: ' + err.message);
        }
      });
    }
  }
}

function closeDetailModal() { detailModal.classList.remove('open'); }
detailModalClose.addEventListener('click', closeDetailModal);
detailModal.addEventListener('click', (e) => { if (e.target === detailModal) closeDetailModal(); });

async function loadGardenDetail() {
  try {
    const params = new URLSearchParams(window.location.search);
    const gardenId = params.get('id');

    if (!gardenId) {
      statusMessage.classList.add('error');
      statusMessage.textContent = 'ไม่พบรหัสสวนที่ต้องการแสดงข้อมูล';
      return;
    }

    const response = await fetch(`/api/customer/gardens/${gardenId}`);
    const data = await response.json();

    if (!response.ok) {
      statusMessage.classList.add('error');
      statusMessage.textContent = data.error || 'ไม่พบข้อมูลสวนนี้ในระบบ';
      return;
    }

    renderGarden(data.garden);
  } catch (err) {
    statusMessage.classList.add('error');
    statusMessage.textContent = 'ไม่สามารถเชื่อมต่อเพื่อโหลดข้อมูลสวนได้';
    console.error('Load detail error:', err);
  }
}

function renderGarden(garden) {
  currentGarden = garden;
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

  // สถานะเปิด/ปิดทำการ: แสดงแถบเตือนและป้ายเมื่อสวนปิดอยู่ตอนนี้
  const os = garden.openStatus || {};
  const gardenClosed = isGardenClosedNow(garden);
  const closedBanner = gardenClosed ? `
    <div class="closed-banner">
      <b>🚫 สวนปิดทำการชั่วคราว</b> — ${escapeHtml(REASON_TH[os.reason] || '')}
      ${os.detail ? '<br>' + escapeHtml(os.detail) : ''}
      ${os.closedTo ? '<br>คาดว่าเปิดอีกครั้ง: ' + escapeHtml(os.closedTo) : ''}
    </div>` : '';
  const closedBadge = gardenClosed ? '<span class="badge-closed">🚫 ปิดทำการชั่วคราว</span>' : '';

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
          ${garden.hasHomestay ? '<span class="tag-pill" style="background:#166534;">มี Homestay</span>' : ''}
          ${closedBadge}
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
            <table class="season-table">
              <thead>
                <tr>
                  <th style="text-align: left; padding-left: 12px;">ผลไม้ / พันธุ์</th>
                  <th>ม.ค.</th><th>ก.พ.</th><th>มี.ค.</th><th>เม.ย.</th><th>พ.ค.</th><th>มิ.ย.</th>
                  <th>ก.ค.</th><th>ส.ค.</th><th>ก.ย.</th><th>ต.ค.</th><th>พ.ย.</th><th>ธ.ค.</th>
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
                      if (mInfo.status === 'peak') monthCells += `<td class="peak">ผลดก</td>`;
                      else if (mInfo.status === 'harvest') monthCells += `<td class="harvest">เก็บเกี่ยว</td>`;
                      else if (mInfo.status === 'rest') monthCells += `<td class="rest">บำรุงต้น</td>`;
                      else monthCells += `<td class="harvest">ออกผล</td>`;
                    } else {
                      monthCells += `<td class="rest">-</td>`;
                    }
                  }
                  return `<tr><td class="fruit-name">${fruitName}${variety}</td>${monthCells}</tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>

          <div class="legend-container">
            <div class="legend-item"><div class="legend-box peak"></div><span>ช่วงผลดก</span></div>
            <div class="legend-item"><div class="legend-box harvest"></div><span>ช่วงเก็บเกี่ยว</span></div>
            <div class="legend-item"><div class="legend-box rest"></div><span>ช่วงบำรุงต้น</span></div>
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
          <div class="map-wrap"><div id="mapView"></div></div>
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
}

function starsText(n) {
  const r = Math.max(0, Math.min(5, Math.round(n)));
  return '★'.repeat(r) + '☆'.repeat(5 - r);
}

// โหลดและแสดงรีวิวของสวน (ต่อท้ายคอลัมน์หลักของหน้า)
async function loadReviews(garden) {
  const host = detailCard.querySelector('.main-col');
  if (!host) return;

  let section = document.getElementById('reviewSection');
  if (!section) {
    section = document.createElement('section');
    section.id = 'reviewSection';
    section.style.cssText = 'margin-top: 28px;';
    host.appendChild(section);
  }
  section.innerHTML = '<div style="color:#9ca3af;">กำลังโหลดรีวิว...</div>';

  try {
    const res = await fetch(`/api/customer/reviews?garden_id=${encodeURIComponent(garden._id)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'โหลดรีวิวไม่สำเร็จ');

    const reviews = Array.isArray(data.reviews) ? data.reviews : [];
    const summaryHtml = data.reviewCount > 0
      ? `<span style="color:#f59e0b; font-size:20px; letter-spacing:2px;">${starsText(data.avgScore)}</span>
         <span style="font-weight:700; color:#1f2937; font-size:18px; margin-left:6px;">${Number(data.avgScore).toFixed(1)}</span>
         <span style="color:#6b7280; font-size:14px;"> / 5 (${data.reviewCount} รีวิว)</span>`
      : `<span style="color:#9ca3af; font-size:14px;">ยังไม่มีรีวิว</span>`;

    const listHtml = reviews.map(r => {
      const dateText = r.created_at ? new Date(r.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
      return `
        <div style="background:#ffffff; border-radius:12px; padding:14px 18px; box-shadow:0 1px 4px rgba(0,0,0,0.06); margin-top:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">
            <div style="font-weight:700; color:#1f2937;">${escapeHtml(r.display_name || 'ผู้ใช้งาน')}</div>
            <div style="color:#f59e0b; letter-spacing:1px;">${starsText(r.rating)}</div>
          </div>
          ${r.comment ? `<div style="margin-top:6px; color:#4b5563; font-size:14px; white-space:pre-wrap;">${escapeHtml(r.comment)}</div>` : ''}
          <div style="margin-top:6px; color:#9ca3af; font-size:12px;">${escapeHtml(dateText)}</div>
        </div>`;
    }).join('');

    section.innerHTML = `
      <div class="info-title" style="margin-bottom:8px;">★ รีวิวจากผู้เข้าพัก/เข้าชม</div>
      <div>${summaryHtml}</div>
      ${listHtml}
    `;
  } catch (err) {
    console.error('Load reviews error:', err);
    section.innerHTML = '<div style="color:#dc2626;">โหลดรีวิวไม่สำเร็จ</div>';
  }
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
      alert('สวนนี้ยังไม่มีการปักหมุดพิกัด');
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
    
    const userMatchedBookings = pendingBookings.filter(pb => pb.date === selectedDate);

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

    let bookingHtml = '';

    if (matched2.length === 0 && userMatchedBookings.length === 0) {
      bookingHtml = `<div style="font-size:12.5px; color:#9ca3af; padding: 14px 0; text-align: center; background: #ffffff; border-radius: 8px; margin-top: 8px;">🕒 ไม่มีการจองในวันที่ ${escapeHtml(selectedDate)}</div>`;
    } else {
      bookingHtml = `<div class="workshop-list">`;
      
      matched2.forEach(bk => {
        const currentCapacity = parseInt(bk.capacity, 10) || 0;
        
        let actionHtml = '';
        if (isGardenClosedNow(garden)) {
          actionHtml = `<span style="color: #dc2626; font-weight: 700; font-size: 13px;">สวนปิด</span>`;
        } else if (currentCapacity <= 0) {
          actionHtml = `<span style="color: #dc2626; font-weight: 700; font-size: 13px;">เต็ม</span>`;
        } else {
          actionHtml = `
            <button type="button" class="btn-mini btn-book-slot" data-date="${escapeHtml(bk.date)}" data-start="${escapeHtml(bk.startTime)}" data-end="${escapeHtml(bk.endTime)}" data-capacity="${escapeHtml(String(currentCapacity))}" style="white-space: nowrap; padding: 6px 12px; background: #17663f; color: #fff; border: none; border-radius: 6px; cursor: pointer;">
              จองรอบนี้
            </button>
          `;
        }

        bookingHtml += `
          <div class="workshop-mini-item" style="font-size:12.5px; display:flex; justify-content:space-between; align-items:center; gap: 8px;">
            <div style="display:flex; flex-direction:column; gap:2px;">
              <span style="font-weight:600;">${escapeHtml(bk.date)}</span>
              <span style="color:#17663f;">◴ ${escapeHtml(bk.startTime)} - ${escapeHtml(bk.endTime)}</span>
            </div>
            ${actionHtml}
          </div>
        `;
      });

      userMatchedBookings.forEach(ub => {
        bookingHtml += `
          <div class="workshop-mini-item" style="font-size:12.5px; background: #fffbeb; border: 1px dashed #f59e0b; display:flex; justify-content:space-between; align-items:center; gap: 8px; margin-top: 6px;">
            <div style="display:flex; flex-direction:column; gap:2px;">
              <span style="font-weight:600;">📅 ${escapeHtml(ub.date)} (${escapeHtml(ub.startTime)} - ${escapeHtml(ub.endTime)})</span>
              <span style="color: #d97706;">จำนวน: ${ub.count} คน | <strong>สถานะ: ${escapeHtml(ub.status)}</strong></span>
            </div>
          </div>
        `;
      });

      bookingHtml += `</div>`;
    }

    bookingData.innerHTML = bookingHtml;

    bookingData.querySelectorAll('.btn-book-slot').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const slotData = {
          date: e.target.dataset.date,
          startTime: e.target.dataset.start,
          endTime: e.target.dataset.end,
          capacity: parseInt(e.target.dataset.capacity, 10)
        };
        openDetailModal('book_slot', slotData);
      });
    });
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
  }

  dots.forEach(dot => dot.addEventListener('click', () => scrollToIndex(parseInt(dot.dataset.index, 10))));
  let currentIndex = 0;
  prevBtn.onclick = () => { currentIndex = Math.max(0, currentIndex - 1); scrollToIndex(currentIndex); };
  nextBtn.onclick = () => { currentIndex = Math.min(count - 1, currentIndex + 1); scrollToIndex(currentIndex); };
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function checkReviewPermissionAndRenderForm(garden) {
  const loggedInUser = JSON.parse(localStorage.getItem('customer_user'));
  const reviewContainer = document.getElementById('reviewFormContainer') || createReviewContainer();

  if (!loggedInUser || !loggedInUser.email) {
    reviewContainer.innerHTML = `<p style="color: #6b7280; font-size: 14px;">กรุณาเข้าสู่ระบบเพื่อเขียนรีวิว (เฉพาะผู้ที่ได้รับการอนุมัติการจองแล้ว)</p>`;
    return;
  }

  try {
    const [bRes, hRes] = await Promise.all([
      fetch(`/api/customer/bookings?email=${encodeURIComponent(loggedInUser.email)}`),
      fetch(`/api/customer/homestay?email=${encodeURIComponent(loggedInUser.email)}`)
    ]);
    
    const bookings = await bRes.json();
    const homestays = await hRes.json();
    
    const allMyBookings = [...(Array.isArray(bookings) ? bookings : []), ...(Array.isArray(homestays) ? homestays : [])];
    
    const hasApprovedBooking = allMyBookings.some(b => 
      String(b.garden_id) === String(garden._id || garden.id) && b.status === 'อนุมัติแล้ว'
    );

    if (!hasApprovedBooking) {
      reviewContainer.innerHTML = `
        <div style="background: #fef2f2; border: 1px solid #fca5a5; padding: 12px; border-radius: 8px; color: #dc2626; font-size: 13.5px;">
          🔒 คุณยังไม่สามารถรีวิวสวนนี้ได้ (ต้องได้รับการอนุมัติการจองเข้าชมสวนหรือห้องพักก่อนจึงจะสามารถเขียนรีวิวได้)
        </div>
      `;
      return;
    }

    reviewContainer.innerHTML = `
      <div style="background: #ffffff; padding: 16px; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-top: 16px;">
        <h4 style="margin: 0 0 10px 0; color: #17663f;">✎ เขียนรีวิวของคุณ</h4>
        <div style="margin-bottom: 10px;">
          <label style="font-size: 13.5px; font-weight: 600;">ให้คะแนน (1-5 ดาว):</label>
          <select id="reviewRating" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #d1d5db; margin-top: 4px;">
            <option value="5">★★★★★ (5 - ดีเยี่ยม)</option>
            <option value="4">★★★★☆ (4 - ดีมาก)</option>
            <option value="3">★★★☆☆ (3 - ปานกลาง)</option>
            <option value="2">★★☆☆☆ (2 - ควรปรับปรุง)</option>
            <option value="1">★☆☆☆☆ (1 - แย่มาก)</option>
          </select>
        </div>
        <div style="margin-bottom: 10px;">
          <label style="font-size: 13.5px; font-weight: 600;">ความคิดเห็น:</label>
          <textarea id="reviewComment" rows="3" placeholder="เล่าประสบการณ์ความประทับใจ..." style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #d1d5db; margin-top: 4px; box-sizing: border-box;"></textarea>
        </div>
        <button type="button" id="submitReviewBtn" style="background: #17663f; color: #fff; border: none; padding: 10px 16px; border-radius: 6px; font-weight: 700; cursor: pointer;">
          ส่งรีวิว
        </button>
      </div>
    `;

    document.getElementById('submitReviewBtn').addEventListener('click', async () => {
      const rating = document.getElementById('reviewRating').value;
      const comment = document.getElementById('reviewComment').value.trim();

      const response = await fetch('/api/customer/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loggedInUser.email,
          garden_id: garden._id || garden.id,
          rating: rating,
          comment: comment
        })
      });

      const result = await response.json();
      if (!response.ok) {
        alert(result.error || 'ไม่สามารถส่งรีวิวได้');
        return;
      }

      alert('ส่งรีวิวเรียบร้อยแล้ว ขอบคุณสำหรับความคิดเห็นครับ!');
      location.reload();
    });

  } catch (err) {
    console.error('Check review permission error:', err);
  }
}

function createReviewContainer() {
  const mainCol = document.querySelector('.main-col');
  const div = document.createElement('div');
  div.id = 'reviewFormContainer';
  mainCol.appendChild(div);
  return div;
}

// ฟังก์ชันเปิดดูภาพใหญ่ (LightBox Preview)
function openImagePreview(imageUrl, caption = '') {
  let previewModal = document.getElementById('imagePreviewModal');
  
  if (!previewModal) {
    previewModal = document.createElement('div');
    previewModal.id = 'imagePreviewModal';
    previewModal.style.cssText = `
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      z-index: 99999;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      padding: 20px;
    `;
    previewModal.innerHTML = `
      <div style="position: relative; max-width: 90vw; max-height: 85vh; display: flex; flex-direction: column; align-items: center;">
        <button type="button" onclick="closeImagePreview()" style="position: absolute; top: -40px; right: -10px; background: none; border: none; color: #ffffff; font-size: 30px; font-weight: bold; cursor: pointer; line-height: 1;">✕</button>
        <img id="previewModalImg" src="" style="max-width: 90vw; max-height: 80vh; object-fit: contain; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); background: #ffffff;">
        <div id="previewModalCaption" style="color: #ffffff; font-size: 14px; margin-top: 12px; text-align: center; text-shadow: 0 1px 2px rgba(0,0,0,0.8);"></div>
      </div>
    `;
    
    // คลิกที่พื้นหลังสีดำเพื่อปิด
    previewModal.addEventListener('click', (e) => {
      if (e.target === previewModal) {
        closeImagePreview();
      }
    });

    document.body.appendChild(previewModal);
  }

  const imgEl = document.getElementById('previewModalImg');
  const capEl = document.getElementById('previewModalCaption');
  
  imgEl.src = imageUrl;
  capEl.textContent = caption;
  previewModal.style.display = 'flex';
}

function closeImagePreview() {
  const previewModal = document.getElementById('imagePreviewModal');
  if (previewModal) {
    previewModal.style.display = 'none';
  }
}

loadGardenDetail();
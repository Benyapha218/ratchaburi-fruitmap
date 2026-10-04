function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

let allBookingsData = [];

async function loadMyBookings() {
  const container = document.getElementById('myBookingsContainer');
  
  try {
    const loggedInUser = JSON.parse(localStorage.getItem('customer_user'));
    
    if (!loggedInUser || !loggedInUser.email) {
      container.innerHTML = `<div style="text-align: center; color: #dc2626; padding: 20px;">กรุณาเข้าสู่ระบบก่อนดูรายการจอง</div>`;
      return;
    }

    const [bookingsRes, homestayRes] = await Promise.all([
      fetch(`/api/customer/bookings?email=${encodeURIComponent(loggedInUser.email)}`),
      fetch(`/api/customer/homestay?email=${encodeURIComponent(loggedInUser.email)}`)
    ]);

    const gardenBookings = await bookingsRes.json();
    const homestayBookings = await homestayRes.json();

    const savedBookings = [
      ...(Array.isArray(gardenBookings) ? gardenBookings : []),
      ...(Array.isArray(homestayBookings) ? homestayBookings : [])
    ];

    allBookingsData = savedBookings;

    if (!savedBookings || savedBookings.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; color: #9ca3af; padding: 60px 0; background: #ffffff; border-radius: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.05);">
          <div style="font-size: 48px; margin-bottom: 12px;">📭</div>
          <div style="font-size: 16px; font-weight: 600; color: #4b5563;">ยังไม่มีรายการจองในขณะนี้</div>
          <div style="font-size: 13.5px; color: #9ca3af; margin-top: 4px;">คุณสามารถเลือกดูสวนและทำการจองรอบเข้าชมหรือ Homestay ได้จากหน้าแผนที่หรือหน้าหลัก</div>
        </div>
      `;
      return;
    }

    const pendingBookings = savedBookings.filter(b => b.status === 'รออนุมัติการจอง');

    if (pendingBookings.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; color: #9ca3af; padding: 60px 0; background: #ffffff; border-radius: 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.05);">
          <div style="font-size: 48px; margin-bottom: 12px;">📭</div>
          <div style="font-size: 16px; font-weight: 600; color: #4b5563;">ยังไม่มีรายการจองที่รออนุมัติในขณะนี้</div>
          <div style="font-size: 13.5px; color: #9ca3af; margin-top: 4px;">คุณสามารถตรวจสอบประวัติการจองอื่นๆ ได้จากปุ่มประวัติการจอง</div>
        </div>
      `;
      return;
    }

    container.innerHTML = pendingBookings.map((b) => {
      let statusBg = '#fffbeb';
      let statusColor = '#d97706';
      let statusBorder = '#f59e0b';
      
      const isHomestay = b.roomType && b.roomType !== '-';
      const bookingTitleType = isHomestay ? '𖠿 จอง Homestay' : '𖤣𖥧 จองเข้าชมสวน';

      let detailsHtml = '';
      if (isHomestay) {

        let roomNameDisplay = b.name;
        if (!roomNameDisplay || roomNameDisplay === '-') {
          const match = b.garden_name ? b.garden_name.match(/:\s*([^)]+)/) : null;
          roomNameDisplay = match ? match[1] : (b.roomType || '-');
        }

        detailsHtml = `
          <div style="font-size: 14px; color: #4b5563;"><strong>ชื่อห้องพัก:</strong> ${escapeHtml(roomNameDisplay)}</div>
          <div style="font-size: 14px; color: #4b5563;"><strong>ประเภทห้อง:</strong> ${escapeHtml(b.roomType)}</div>
          <div style="font-size: 14px; color: #4b5563;"><strong>วันเช็คอิน:</strong> ${escapeHtml(b.date)}</div>
          <div style="font-size: 14px; color: #4b5563;"><strong>วันเช็คเอาท์:</strong> ${escapeHtml(b.endTime.replace('เช็คเอาท์: ', ''))}</div>
          <div style="font-size: 14px; color: #4b5563;"><strong>จำนวนห้อง:</strong> ${escapeHtml(String(b.count))} ห้อง</div>
        `;
      } else {
        detailsHtml = `
          <div style="font-size: 14px; color: #4b5563;"><strong>วันที่เข้าชม:</strong> ${escapeHtml(b.date)}</div>
          <div style="font-size: 14px; color: #4b5563;"><strong>รอบเวลา:</strong> ${escapeHtml(b.startTime)} - ${escapeHtml(b.endTime)} น.</div>
          <div style="font-size: 14px; color: #4b5563;"><strong>จำนวนผู้เข้าชม:</strong> ${escapeHtml(String(b.count))} คน</div>
        `;
      }

      return `
        <div style="background: #ffffff; border-radius: 12px; padding: 20px 24px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; border-left: 6px solid ${statusBorder};">
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <div style="font-size: 13px; font-weight: 700; color: #047857; background: #ecfdf5; padding: 2px 8px; border-radius: 4px; width: fit-content; margin-bottom: 2px;">${bookingTitleType}</div>
            <div style="font-size: 18px; font-weight: 700; color: #1f2937;">${escapeHtml(b.garden_name || 'สวนผลไม้ราชบุรี')}</div>
            ${detailsHtml}
            <div style="font-size: 14px; color: #4b5563;"><strong>เบอร์โทรศัพท์:</strong> ${escapeHtml(b.phone || 'ไม่ระบุ')}</div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 10px;">
            <span style="background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusBorder}; padding: 6px 14px; border-radius: 20px; font-size: 13.5px; font-weight: 700;">
              ${escapeHtml(b.status)}
            </span>
            <button type="button" onclick="cancelBooking('${escapeHtml(b._id)}', ${isHomestay})" style="background: transparent; color: #dc2626; border: 1px solid #fca5a5; padding: 4px 10px; border-radius: 6px; font-size: 12px; cursor: pointer;">
              ยกเลิกการจอง
            </button>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Load bookings error:', err);
    container.innerHTML = `<div style="text-align: center; color: #dc2626; padding: 20px;">เกิดข้อผิดพลาดในการโหลดข้อมูลการจอง</div>`;
  }
}

async function openHistoryModal() {
  const modal = document.getElementById('historyModal');
  const modalBody = document.getElementById('historyModalBody');

  if (!allBookingsData || allBookingsData.length === 0) {
    modalBody.innerHTML = `<div style="text-align: center; color: #9ca3af; padding: 20px;">ไม่มีประวัติการจอง</div>`;
    modal.style.display = 'flex';
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const reviewedRes = await fetch('/api/customer/reviews/mine', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const reviewedData = await reviewedRes.json();
    const reviewedIds = reviewedData.reviewedBookingIds || [];

    let historyItems = allBookingsData.filter(b => b.status !== 'รออนุมัติการจอง');
    
    if (historyItems.length === 0) {
      modalBody.innerHTML = `<div style="text-align: center; color: #9ca3af; padding: 20px;">ยังไม่มีประวัติการจองที่อนุมัติหรือปฏิเสธ</div>`;
    } else {
      historyItems.sort((a, b) => new Date(b.date) - new Date(a.date));

      modalBody.innerHTML = historyItems.map((b) => {
        let statusBg = '#fffbeb';
        let statusColor = '#d97706';
        let statusBorder = '#f59e0b';
        
        if (b.status === 'อนุมัติแล้ว') {
          statusBg = '#f0fdf4';
          statusColor = '#16a34a';
          statusBorder = '#22c55e';
        } else if (b.status === 'ไม่อนุมัติ') {
          statusBg = '#fef2f2';
          statusColor = '#dc2626';
          statusBorder = '#f87171';
        }

        const isHomestay = b.roomType && b.roomType !== '-';
        const bookingTitleType = isHomestay ? '𖠿 จอง Homestay' : '𖤣𖥧 จองเข้าชมสวน';
        const isAlreadyReviewed = reviewedIds.includes(String(b._id));

        let reviewBtnHtml = '';
        if (b.status === 'อนุมัติแล้ว') {
          if (isAlreadyReviewed) {
            reviewBtnHtml = `<span style="font-size: 12px; color: #16a34a; font-weight: 600;">⭐ รีวิวแล้ว</span>`;
          } else {
            reviewBtnHtml = `
              <button type="button" onclick="openReviewModal('${b._id}', '${escapeHtml(b.garden_name || 'สวนผลไม้ราชบุรี')}')" style="background: #17663f; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">
                ⭐ เขียนรีวิว
              </button>
            `;
          }
        }

        return `
          <div style="background: #fef3c7; border-radius: 10px; padding: 14px 18px; border: 1px solid #fcd34d; display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 10px;">
            <div>
              <div style="font-size: 12px; font-weight: 700; color: #047857; margin-bottom: 2px;">${bookingTitleType}</div>
              <div style="font-weight: 700; color: #1f2937; font-size: 15px;">${escapeHtml(b.garden_name || 'สวนผลไม้ราชบุรี')}</div>
              <div style="font-size: 13px; color: #4b5563;">วันที่: ${escapeHtml(b.date)}</div>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
              <span style="background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusBorder}; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 700; white-space: nowrap;">
                ${escapeHtml(b.status)}
              </span>
              ${reviewBtnHtml}
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Load history error:', err);
  }

  modal.style.display = 'flex';
}

function closeHistoryModal() {
  document.getElementById('historyModal').style.display = 'none';
}

async function cancelBooking(bookingId, isHomestay) {
  if (confirm('คุณต้องการยกเลิกการจองนี้ใช่หรือไม่?')) {
    try {
      const endpoint = isHomestay ? `/api/customer/homestay/${bookingId}` : `/api/customer/bookings/${bookingId}`;
      
      const response = await fetch(endpoint, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('ไม่สามารถลบข้อมูลการจองได้');
      }

      alert('ยกเลิกการจองเรียบร้อยแล้ว');
      loadMyBookings();
    } catch (err) {
      console.error('Cancel error:', err);
      alert('เกิดข้อผิดพลาดในการยกเลิกการจอง');
    }
  }
}

async function openHistoryModal() {
  const modal = document.getElementById('historyModal');
  const modalBody = document.getElementById('historyModalBody');

  if (!allBookingsData || allBookingsData.length === 0) {
    modalBody.innerHTML = `<div style="text-align: center; color: #9ca3af; padding: 20px;">ไม่มีประวัติการจอง</div>`;
    modal.style.display = 'flex';
    return;
  }

  try {
    const token = localStorage.getItem('token') || localStorage.getItem('customer_token');
    
    const reviewedRes = await fetch('/api/customer/reviews/mine', {
      headers: { 
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    
    const reviewedData = await reviewedRes.json();
    const reviewedIds = reviewedData.reviewedBookingIds || [];

    let historyItems = allBookingsData.filter(b => b.status !== 'รออนุมัติการจอง');
    
    if (historyItems.length === 0) {
      modalBody.innerHTML = `<div style="text-align: center; color: #9ca3af; padding: 20px;">ยังไม่มีประวัติการจองที่อนุมัติหรือปฏิเสธ</div>`;
    } else {
      historyItems.sort((a, b) => new Date(b.date) - new Date(a.date));

      modalBody.innerHTML = historyItems.map((b) => {
        let statusBg = '#fffbeb';
        let statusColor = '#d97706';
        let statusBorder = '#f59e0b';
        
        if (b.status === 'อนุมัติแล้ว') {
          statusBg = '#f0fdf4';
          statusColor = '#16a34a';
          statusBorder = '#22c55e';
        } else if (b.status === 'ไม่อนุมัติ') {
          statusBg = '#fef2f2';
          statusColor = '#dc2626';
          statusBorder = '#f87171';
        }

        const isHomestay = b.roomType && b.roomType !== '-';
        const bookingTitleType = isHomestay ? '𖠿 จอง Homestay' : '𖤣𖥧 จองเข้าชมสวน';
        const isAlreadyReviewed = reviewedIds.includes(String(b._id));

        let reviewBtnHtml = '';
        if (b.status === 'อนุมัติแล้ว') {
          if (isAlreadyReviewed) {
            reviewBtnHtml = `<span style="font-size: 12px; color: #16a34a; font-weight: 600;">⭐ รีวิวแล้ว</span>`;
          } else {
            reviewBtnHtml = `
              <button type="button" onclick="openReviewModal('${b._id}', '${escapeHtml(b.garden_name || 'สวนผลไม้ราชบุรี')}')" style="background: #17663f; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">
                ⭐ เขียนรีวิว
              </button>
            `;
          }
        }

        return `
          <div style="background: #fef3c7; border-radius: 10px; padding: 14px 18px; border: 1px solid #fcd34d; display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 10px;">
            <div>
              <div style="font-size: 12px; font-weight: 700; color: #047857; margin-bottom: 2px;">${bookingTitleType}</div>
              <div style="font-weight: 700; color: #1f2937; font-size: 15px;">${escapeHtml(b.garden_name || 'สวนผลไม้ราชบุรี')}</div>
              <div style="font-size: 13px; color: #4b5563;">วันที่: ${escapeHtml(b.date)}</div>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
              <span style="background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusBorder}; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 700; white-space: nowrap;">
                ${escapeHtml(b.status)}
              </span>
              ${reviewBtnHtml}
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Load history error:', err);
  }

  modal.style.display = 'flex';
}

// ตัวแปรสำหรับจำว่ากำลังรีวิวรายการจอง ID ไหน
let currentReviewBookingId = null;

// ฟังก์ชันเปิด Modal เขียนรีวิว
function openReviewModal(bookingId, gardenName) {
  currentReviewBookingId = bookingId;

  // ตรวจสอบว่าในหน้า HTML มี modal รีวิวหรือยัง ถ้ายังไม่มีให้สร้างขึ้นมาอัตโนมัติ
  let modal = document.getElementById('reviewModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'reviewModal';
    modal.style.cssText = 'display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 9999; justify-content: center; align-items: center; padding: 20px;';
    modal.innerHTML = `
      <div style="background: #ffffff; width: 100%; max-width: 420px; border-radius: 16px; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); position: relative;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 id="modalGardenTitle" style="margin: 0; font-size: 18px; color: #1f2937; font-weight: 700;">เขียนรีวิว</h3>
          <button type="button" onclick="closeReviewModal()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #6b7280;">✕</button>
        </div>
        
        <div style="margin-bottom: 14px;">
          <label style="display: block; font-size: 13.5px; font-weight: 600; color: #374151; margin-bottom: 6px;">ให้คะแนนความพึงพอใจ:</label>
          <select id="modalRating" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none;">
            <option value="5">⭐⭐⭐⭐⭐ 5 ดาว (ยอดเยี่ยม)</option>
            <option value="4">⭐⭐⭐⭐ 4 ดาว (ดีมาก)</option>
            <option value="3">⭐⭐⭐ 3 ดาว (ปานกลาง)</option>
            <option value="2">⭐⭐ 2 ดาว (พอใช้)</option>
            <option value="1">⭐ 1 ดาว (ต้องปรับปรุง)</option>
          </select>
        </div>

        <div style="margin-bottom: 18px;">
          <label style="display: block; font-size: 13.5px; font-weight: 600; color: #374151; margin-bottom: 6px;">ความคิดเห็นเพิ่มเติม:</label>
          <textarea id="modalComment" rows="4" placeholder="บอกเล่าความประทับใจ การบริการ หรือผลไม้ในสวน..." style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; box-sizing: border-box; resize: vertical;"></textarea>
        </div>

        <div style="display: flex; gap: 10px;">
          <button type="button" onclick="closeReviewModal()" style="flex: 1; padding: 10px; border: 1px solid #d1d5db; background: #f3f4f6; color: #374151; border-radius: 8px; font-weight: 600; cursor: pointer;">ยกเลิก</button>
          <button type="button" id="btnSubmitReview" onclick="handleReviewSubmit()" style="flex: 1; padding: 10px; border: none; background: #17663f; color: #ffffff; border-radius: 8px; font-weight: 700; cursor: pointer;">ส่งรีวิว</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const titleEl = document.getElementById('modalGardenTitle');
  if (titleEl) titleEl.textContent = `เขียนรีวิว: ${gardenName}`;
  
  // รีเซ็ตค่าฟอร์ม
  const ratingEl = document.getElementById('modalRating');
  const commentEl = document.getElementById('modalComment');
  if (ratingEl) ratingEl.value = '5';
  if (commentEl) commentEl.value = '';

  modal.style.display = 'flex';
}

// ฟังก์ชันปิด Modal เขียนรีวิว
function closeReviewModal() {
  const modal = document.getElementById('reviewModal');
  if (modal) modal.style.display = 'none';
  currentReviewBookingId = null;
}

// ฟังก์ชันเรียกเมื่อกดส่งรีวิว
async function handleReviewSubmit() {
  if (!currentReviewBookingId) return;
  await submitReview(currentReviewBookingId);
}

// ฟังก์ชันส่งรีวิวไป Backend
async function submitReview(bookingId) {
  const rating = Number(document.getElementById('modalRating').value);
  const comment = document.getElementById('modalComment').value.trim();
  
  const token = localStorage.getItem('token') || localStorage.getItem('customer_token');
  const loggedInUser = JSON.parse(localStorage.getItem('customer_user'));

  if (!token && (!loggedInUser || !loggedInUser.email)) {
    alert('กรุณาเข้าสู่ระบบใหม่อีกครั้งเพื่อยืนยันตัวตน');
    window.location.href = 'login.html';
    return;
  }

  const submitBtn = document.getElementById('btnSubmitReview');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'กำลังส่ง...';
  }

  try {
    const response = await fetch('/api/customer/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ 
        booking_id: bookingId, 
        rating, 
        comment 
      })
    });

    const result = await response.json();
    if (!response.ok) {
      alert(result.error || 'ไม่สามารถส่งรีวิวได้');
      return;
    }

    alert('ส่งรีวิวสำเร็จ! ขอบคุณสำหรับความคิดเห็นครับ');
    closeReviewModal();
    await openHistoryModal(); // รีเฟรช Modal ประวัติการจองให้ขึ้นปุ่ม "⭐ รีวิวแล้ว"
  } catch (err) {
    console.error('Submit review error:', err);
    alert('เกิดข้อผิดพลาดในการส่งรีวิว');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'ส่งรีวิว';
    }
  }
}

loadMyBookings();
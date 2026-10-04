    const urlParams = new URLSearchParams(window.location.search);
    const gardenId = urlParams.get('id');
    const formMessage = document.getElementById('formMessage');
    const saveBtn = document.getElementById('saveBtn');

    if (!gardenId) {
      formMessage.style.color = '#dc2626';
      formMessage.textContent = 'ไม่พบรหัสสวน กรุณาเข้าหน้านี้ผ่านการเลือกสวนที่ต้องการเพิ่มข้อมูลก่อน';
      saveBtn.disabled = true;
    }

    const thaiMonths = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
    const today = new Date();
    const currentRealYear = today.getFullYear();
    const currentRealMonth = today.getMonth();
    const currentRealDate = today.getDate();

    let viewYear = currentRealYear;
    let viewMonth = currentRealMonth;
    let selectedDate = new Date(currentRealYear, currentRealMonth, currentRealDate);

    const monthYearLabel = document.getElementById('monthYearLabel');
    const calendarGrid = document.getElementById('calendarGrid');
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    const selectedDateDisplay = document.getElementById('selectedDateDisplay');
    const datesWithSlot = new Set();

    function dateKey(y, m, d) { return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }

    function renderCalendar() {
      const thaiYear = viewYear + 543;
      monthYearLabel.textContent = `${thaiMonths[viewMonth]} ${thaiYear}`;
      prevMonthBtn.disabled = (viewYear === currentRealYear && viewMonth === currentRealMonth);
      calendarGrid.querySelectorAll('.day-number, .empty').forEach(el => el.remove());

      const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
      const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();

      for (let i = 0; i < firstDayIndex; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.classList.add('day-number', 'empty');
        calendarGrid.appendChild(emptyDiv);
      }

      for (let day = 1; day <= totalDays; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('day-number');
        dayDiv.textContent = day;

        const isPast = (viewYear < currentRealYear) ||
                       (viewYear === currentRealYear && viewMonth < currentRealMonth) ||
                       (viewYear === currentRealYear && viewMonth === currentRealMonth && day < currentRealDate);

        if (isPast) {
          dayDiv.classList.add('disabled');
        } else {
          if (selectedDate.getFullYear() === viewYear && selectedDate.getMonth() === viewMonth && selectedDate.getDate() === day) {
            dayDiv.classList.add('selected');
          }
          if (datesWithSlot.has(dateKey(viewYear, viewMonth, day))) {
            dayDiv.classList.add('has-slot');
          }
          dayDiv.addEventListener('click', () => {
            selectedDate = new Date(viewYear, viewMonth, day);
            updateSelectedDateDisplay();
            renderCalendar();
          });
        }
        calendarGrid.appendChild(dayDiv);
      }
    }

    function updateSelectedDateDisplay() {
      const day = selectedDate.getDate();
      selectedDateDisplay.textContent = `${day} ${thaiMonths[selectedDate.getMonth()]} ${selectedDate.getFullYear() + 543}`;
    }

    prevMonthBtn.addEventListener('click', () => {
      if (viewYear > currentRealYear || (viewYear === currentRealYear && viewMonth > currentRealMonth)) {
        viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; }
        renderCalendar();
      }
    });

    nextMonthBtn.addEventListener('click', () => {
      viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      renderCalendar();
    });

    function isoDate(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
    function formatThaiDate(isoStr) {
      if (!isoStr) return '';
      const [y, m, d] = isoStr.split('-').map(Number);
      return `${d} ${thaiMonths[m - 1]} ${y + 543}`;
    }

    const slotList = document.getElementById('slotList');

    function timeOptionsHtml(selectedValue) {
      let html = '';
      for (let h = 0; h <= 23; h++) {
        const v = String(h).padStart(2, '0');
        html += `<option value="${v}" ${selectedValue === v ? 'selected' : ''}>${v}</option>`;
      }
      return html;
    }
    function minuteOptionsHtml(selectedValue) {
      let html = '';
      for (let m = 0; m <= 55; m += 5) {
        const v = String(m).padStart(2, '0');
        html += `<option value="${v}" ${selectedValue === v ? 'selected' : ''}>${v}</option>`;
      }
      return html;
    }

    function createSlotBlock(data = {}) {
      const dateIso = data.date || isoDate(selectedDate);
      const [sh, sm] = (data.startTime || '09:00').split(':');
      const [eh, em] = (data.endTime || '12:00').split(':');

      const block = document.createElement('div');
      block.className = 'slot-box';
      block.dataset.date = dateIso;

      block.innerHTML = `
        <span class="slot-date-tag">${formatThaiDate(dateIso)}</span>
        <button type="button" class="btn-remove-slot js-remove-slot" title="ลบรายการนี้">✕</button>
        <label class="field-label">ช่วงเวลาที่รับคิวเข้าชม</label>
        <div class="time-range-wrap">
          <span>เวลา</span>
          <select class="time-select js-start-hour">${timeOptionsHtml(sh)}</select>:
          <select class="time-select js-start-minute">${minuteOptionsHtml(sm)}</select>
          <span>ถึง</span>
          <select class="time-select js-end-hour">${timeOptionsHtml(eh)}</select>:
          <select class="time-select js-end-minute">${minuteOptionsHtml(em)}</select>
          <span style="margin-left: 8px;">จำนวนคนที่รับ</span>
          <input type="text" class="capacity-input js-capacity" placeholder="0" value="${escapeAttr(data.capacity)}">
          <span>คน</span>
        </div>
      `;

      block.querySelector('.js-remove-slot').addEventListener('click', () => {
        block.remove();
        refreshDatesWithSlotMarkers();
      });

      return block;
    }

    function refreshDatesWithSlotMarkers() {
      datesWithSlot.clear();
      slotList.querySelectorAll('.slot-box').forEach(block => {
        if (block.dataset.date) datesWithSlot.add(block.dataset.date);
      });
      renderCalendar();
    }

    document.getElementById('addSlotBtn').addEventListener('click', () => {
      slotList.appendChild(createSlotBlock());
      refreshDatesWithSlotMarkers();
    });

    function escapeAttr(str) {
      if (str === undefined || str === null) return '';
      return String(str).replace(/"/g, '&quot;');
    }

    document.addEventListener('DOMContentLoaded', async () => {
      updateSelectedDateDisplay();
      renderCalendar();

      if (!gardenId) return;

      try {
        const response = await OwnerAuth.authFetch(`/api/owner/gardens/${gardenId}`);
        if (!response.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ');
        const data = await response.json();
        const garden = data.garden;
        const slots = (garden && garden.booking_slots) || [];

        slots.forEach(s => slotList.appendChild(createSlotBlock({
          date: s.date, startTime: s.startTime, endTime: s.endTime, capacity: s.capacity
        })));

        refreshDatesWithSlotMarkers();
      } catch (err) {
        console.error('Error loading booking slots:', err);
      }
    });

    saveBtn.addEventListener('click', async () => {
      if (!gardenId) return;

      const blocks = Array.from(slotList.querySelectorAll('.slot-box'));
      const bookingSlots = [];

      blocks.forEach(block => {
        const capacity = block.querySelector('.js-capacity').value.trim();
        if (capacity === '') return; // ข้ามรายการที่ยังไม่ได้กรอกจำนวนคน

        const startTime = `${block.querySelector('.js-start-hour').value}:${block.querySelector('.js-start-minute').value}`;
        const endTime = `${block.querySelector('.js-end-hour').value}:${block.querySelector('.js-end-minute').value}`;

        bookingSlots.push({
          date: block.dataset.date,
          startTime,
          endTime,
          capacity
        });
      });

      if (bookingSlots.length === 0) {
        formMessage.style.color = '#dc2626';
        formMessage.textContent = 'กรุณาเพิ่มช่วงเวลาและจำนวนคนที่รับอย่างน้อย 1 รายการ';
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = 'กำลังบันทึก...';
      formMessage.style.color = '';
      formMessage.textContent = '';

      try {
        const response = await OwnerAuth.authFetch(`/api/owner/gardens/${gardenId}/bookings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingSlots })
        });
        const data = await response.json();

        if (response.ok) {
          formMessage.style.color = '#17663f';
          formMessage.textContent = 'บันทึกข้อมูลการจองคิวเข้าชมสวนสำเร็จ!';
          setTimeout(() => history.back(), 1200);
        } else if (response.status === 401) {
          formMessage.style.color = '#dc2626';
          formMessage.textContent = 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่';
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
        saveBtn.textContent = 'บันทึกข้อมูล';
      }
    });
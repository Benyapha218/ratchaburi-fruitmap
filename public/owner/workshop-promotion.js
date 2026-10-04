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
    const datesWithWorkshop = new Set();

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
          if (datesWithWorkshop.has(dateKey(viewYear, viewMonth, day))) {
            dayDiv.classList.add('has-workshop');
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

    const workshopList = document.getElementById('workshopList');

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

    function createWorkshopBlock(data = {}) {
      const dateIso = data.date || isoDate(selectedDate);
      const [sh, sm] = (data.startTime || '09:00').split(':');
      const [eh, em] = (data.endTime || '16:00').split(':');

      const block = document.createElement('div');
      block.className = 'workshop-form-box';
      block.dataset.date = dateIso;
      block.dataset.existingImage = data.image || '';

      block.innerHTML = `
        <span class="workshop-date-tag">${formatThaiDate(dateIso)}</span>
        <button type="button" class="btn-remove-workshop js-remove-workshop" title="ลบรายการนี้">✕</button>
        <div>
          <label class="field-label">ชื่อ Workshop / โปรโมชั่น</label>
          <input type="text" class="js-title" placeholder="กรอกชื่อ Workshop / โปรโมชั่น" value="${escapeAttr(data.title)}">
          <label class="field-label" style="margin-top: 14px;">เวลา</label>
          <div class="time-range-wrap">
            <select class="time-select js-start-hour">${timeOptionsHtml(sh)}</select>:
            <select class="time-select js-start-minute">${minuteOptionsHtml(sm)}</select>
            <span style="margin: 0 4px;">ถึง</span>
            <select class="time-select js-end-hour">${timeOptionsHtml(eh)}</select>:
            <select class="time-select js-end-minute">${minuteOptionsHtml(em)}</select>
          </div>
        </div>
        <div>
          <label class="field-label">รายละเอียด Workshop / โปรโมชั่น</label>
          <textarea class="js-description" placeholder="กรอกรายละเอียด Workshop / โปรโมชั่น">${escapeHtml(data.description)}</textarea>
          <label class="field-label" style="margin-top: 14px;">แนบรูป Workshop / โปรโมชั่น</label>
          <div class="js-workshop-preview-area" style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <label class="upload-box-workshop js-upload-label" style="cursor: pointer; margin-bottom: 0;">
              🖼️<br>
              <span class="js-upload-text" style="font-size: 13px;">แนบรูปที่นี่</span>
              <input type="file" class="js-workshop-image" accept="image/*" hidden>
            </label>
          </div>
        </div>
      `;

      const fileInput = block.querySelector('.js-workshop-image');
      const previewArea = block.querySelector('.js-workshop-preview-area');
      const uploadLabel = block.querySelector('.js-upload-label');

      function renderPreview(imgSrc) {
        const oldPreview = previewArea.querySelectorAll('.preview-item');
        oldPreview.forEach(el => el.remove());

        if (!imgSrc) {
          uploadLabel.style.display = 'block';
          return;
        }

        uploadLabel.style.display = 'none';

        const wrap = document.createElement('div');
        wrap.className = 'preview-item';
        wrap.style.cssText = 'position: relative; width: 90px; height: 90px; border-radius: 8px; overflow: hidden; border: 1px solid #ddd; flex-shrink: 0;';
        
        wrap.innerHTML = `
          <img src="${imgSrc}" style="width: 100%; height: 100%; object-fit: cover;">
          <button type="button" class="btn-remove-img" style="position: absolute; top: 2px; right: 2px; background: rgba(220,38,38,0.8); color: white; border: none; border-radius: 50%; width: 22px; height: 22px; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;">✕</button>
        `;

        wrap.querySelector('.btn-remove-img').addEventListener('click', () => {
          block.dataset.existingImage = '';
          fileInput.value = '';
          renderPreview(null);
        });

        previewArea.prepend(wrap);
      }

      if (block.dataset.existingImage) {
        renderPreview(block.dataset.existingImage);
      }

      fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files[0]) {
          const reader = new FileReader();
          reader.onload = (e) => {
            block.dataset.existingImage = '';
            renderPreview(e.target.result);
          };
          reader.readAsDataURL(fileInput.files[0]);
        }
      });

      block.querySelector('.js-remove-workshop').addEventListener('click', () => {
        block.remove();
        refreshDatesWithWorkshopMarkers();
      });

      return block;
    }

    function refreshDatesWithWorkshopMarkers() {
      datesWithWorkshop.clear();
      workshopList.querySelectorAll('.workshop-form-box').forEach(block => {
        if (block.dataset.date) datesWithWorkshop.add(block.dataset.date);
      });
      renderCalendar();
    }

    document.getElementById('addWorkshopBtn').addEventListener('click', () => {
      workshopList.appendChild(createWorkshopBlock());
      refreshDatesWithWorkshopMarkers();
    });

    function escapeAttr(str) {
      if (str === undefined || str === null) return '';
      return String(str).replace(/"/g, '&quot;');
    }
    function escapeHtml(str) {
      if (str === undefined || str === null) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
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
        const workshops = (garden && garden.workshops) || [];

        workshops.forEach(w => workshopList.appendChild(createWorkshopBlock({
          date: w.date, title: w.title, startTime: w.startTime, endTime: w.endTime,
          description: w.description, image: w.image
        })));

        refreshDatesWithWorkshopMarkers();
      } catch (err) {
        console.error('Error loading workshops:', err);
      }
    });

    saveBtn.addEventListener('click', async () => {
      if (!gardenId) return;

      const blocks = Array.from(workshopList.querySelectorAll('.workshop-form-box'));
      const workshops = [];
      const workshopImageFiles = [];
      const workshopImageIndexes = [];

      blocks.forEach(block => {
        const title = block.querySelector('.js-title').value.trim();
        if (title === '') return;

        const workshopIndex = workshops.length;
        const startTime = `${block.querySelector('.js-start-hour').value}:${block.querySelector('.js-start-minute').value}`;
        const endTime = `${block.querySelector('.js-end-hour').value}:${block.querySelector('.js-end-minute').value}`;

        const workshop = {
          date: block.dataset.date, title, startTime, endTime,
          description: block.querySelector('.js-description').value.trim()
        };

        if (block.dataset.existingImage) workshop.image = block.dataset.existingImage;

        const fileInput = block.querySelector('.js-workshop-image');
        if (fileInput.files[0]) {
          workshopImageFiles.push(fileInput.files[0]);
          workshopImageIndexes.push(workshopIndex);
        }

        workshops.push(workshop);
      });

      if (workshops.length === 0) {
        formMessage.style.color = '#dc2626';
        formMessage.textContent = 'กรุณาเพิ่มข้อมูล Workshop/โปรโมชั่นอย่างน้อย 1 รายการ (ต้องมีชื่อ)';
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = 'กำลังบันทึก...';
      formMessage.style.color = '';
      formMessage.textContent = '';

      try {
        const formData = new FormData();
        formData.append('workshops', JSON.stringify(workshops));
        formData.append('workshopImageIndexes', JSON.stringify(workshopImageIndexes));
        workshopImageFiles.forEach(file => formData.append('workshopImages', file));

        const response = await OwnerAuth.authFetch(`/api/owner/gardens/${gardenId}/workshops`, {
          method: 'PUT', body: formData
        });
        const data = await response.json();

        if (response.ok) {
          formMessage.style.color = '#17663f';
          formMessage.textContent = 'บันทึกข้อมูล Workshop/โปรโมชั่นสำเร็จ!';
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
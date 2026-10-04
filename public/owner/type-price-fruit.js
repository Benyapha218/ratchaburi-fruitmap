const urlParams = new URLSearchParams(window.location.search);
    let gardenId = urlParams.get('id');

    const formMessage = document.getElementById('formMessage');
    const saveBtn = document.getElementById('saveBtn');

    if (!gardenId) {
      formMessage.style.color = '#dc2626';
      formMessage.textContent = 'ไม่พบรหัสสวน กรุณาเข้าหน้านี้ผ่านการเลือกสวนที่ต้องการเพิ่มข้อมูลก่อน';
      saveBtn.disabled = true;
    }

    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];

    const productRows = document.getElementById('productRows');

    function createProductRow(data = {}) {
      const row = document.createElement('div');
      row.className = 'row-block fruit-price-grid';
      row.innerHTML = `
        <div>
          <label class="field-label">รูปผลไม้</label>
          <div class="js-fruit-preview-area" style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <label class="upload-btn-mini js-upload-label" style="cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
              🖼️ <span class="js-upload-text">แนบรูป</span>
              <input type="file" class="js-fruit-image" accept="image/*" hidden>
            </label>
          </div>
        </div>
        <div>
          <label class="field-label">ชื่อผลไม้</label>
          <input type="text" class="js-fruit-name" placeholder="ชื่อผลไม้" value="${escapeAttr(data.fruitName)}">
        </div>
        <div>
          <label class="field-label">สายพันธุ์</label>
          <input type="text" class="js-fruit-variety" placeholder="สายพันธุ์" value="${escapeAttr(data.variety)}">
        </div>
        <div>
          <label class="field-label">ราคาออนไลน์</label>
          <input type="text" class="js-price-online" placeholder="ราคา" value="${escapeAttr(data.priceOnline)}">
        </div>
        <div>
          <label class="field-label">หน่วย</label>
          <input type="text" class="js-unit-online" placeholder="กก./ลูก" value="${escapeAttr(data.unitOnline)}">
        </div>
        <div>
          <label class="field-label">ราคาออฟไลน์</label>
          <input type="text" class="js-price-offline" placeholder="ราคา" value="${escapeAttr(data.priceOffline)}">
        </div>
        <div>
          <label class="field-label">หน่วย</label>
          <input type="text" class="js-unit-offline" placeholder="กก./ลูก" value="${escapeAttr(data.unitOffline)}">
        </div>
        <div>
          <label class="field-label">เกรด</label>
          <select class="grade-select js-grade">
            <option value="" ${!data.grade ? 'selected' : ''}>เลือก</option>
            <option value="A" ${data.grade === 'A' ? 'selected' : ''}>เกรด A</option>
            <option value="B" ${data.grade === 'B' ? 'selected' : ''}>เกรด B</option>
            <option value="C" ${data.grade === 'C' ? 'selected' : ''}>เกรด C</option>
          </select>
        </div>
        <div>
          <label class="field-label">รายละเอียดเกรด</label>
          <input type="text" class="js-grade-detail" placeholder="รายละเอียด" value="${escapeAttr(data.gradeDetail)}">
        </div>
        <div>
          <label class="field-label">&nbsp;</label>
          <button type="button" class="btn-remove-row js-remove-row" title="ลบแถวนี้">✕</button>
        </div>
      `;
      row.dataset.existingImage = data.image || '';

      const fileInput = row.querySelector('.js-fruit-image');
      const previewArea = row.querySelector('.js-fruit-preview-area');
      const uploadLabel = row.querySelector('.js-upload-label');

      function renderPreview(imgSrc) {
        const oldPreview = previewArea.querySelectorAll('.preview-item');
        oldPreview.forEach(el => el.remove());

        if (!imgSrc) {
          uploadLabel.style.display = 'inline-flex';
          return;
        }

        uploadLabel.style.display = 'none';

        const wrap = document.createElement('div');
        wrap.className = 'preview-item';
        wrap.style.cssText = 'position: relative; width: 70px; height: 70px; border-radius: 8px; overflow: hidden; border: 1px solid #ddd; flex-shrink: 0;';
        
        wrap.innerHTML = `
          <img src="${imgSrc}" style="width: 100%; height: 100%; object-fit: cover;">
          <button type="button" class="btn-remove-img" style="position: absolute; top: 2px; right: 2px; background: rgba(220,38,38,0.8); color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 11px; display: flex; align-items: center; justify-content: center;">✕</button>
        `;

        wrap.querySelector('.btn-remove-img').addEventListener('click', () => {
          row.dataset.existingImage = '';
          fileInput.value = '';
          renderPreview(null);
        });

        previewArea.prepend(wrap);
      }

      if (row.dataset.existingImage) {
        renderPreview(row.dataset.existingImage);
      }

      fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files[0]) {
          const reader = new FileReader();
          reader.onload = (e) => {
            row.dataset.existingImage = '';
            renderPreview(e.target.result);
          };
          reader.readAsDataURL(fileInput.files[0]);
        }
      });

      row.querySelector('.js-remove-row').addEventListener('click', () => row.remove());
      return row;
    }

    document.getElementById('addProductRowBtn').addEventListener('click', () => {
      productRows.appendChild(createProductRow());
    });

    const seasonRows = document.getElementById('seasonRows');

    function createSeasonRow(data = {}) {
      const row = document.createElement('div');
      row.className = 'row-block';
      
      const savedMonths = data.months || {};

      row.innerHTML = `
        <div class="fruit-season-grid">
          <div>
            <label class="field-label">ชื่อผลไม้</label>
            <input type="text" class="js-season-name" placeholder="กรอกชื่อผลไม้" value="${escapeAttr(data.fruitName)}">
          </div>
          <div>
            <label class="field-label">สายพันธุ์ผลไม้</label>
            <input type="text" class="js-season-variety" placeholder="กรอกสายพันธุ์" value="${escapeAttr(data.variety)}">
          </div>
          <div>
            <label class="field-label">&nbsp;</label>
            <button type="button" class="btn-remove-row js-remove-row" title="ลบแถวนี้">✕</button>
          </div>
        </div>

        <div class="month-picker-container">
          <label class="field-label">ระยะเวลาเติบโตช่วงเวลาแต่ละเดือน (เลือกสถานะ)</label>
          <div class="month-grid">
            ${thaiMonths.map((m, index) => {
              const monthData = savedMonths[index] || {};
              const isChecked = monthData.active ? 'checked' : '';
              const statusVal = monthData.status || 'harvest';
              return `
                <label class="month-checkbox-label" data-month="${index}">
                  <div style="display:flex; align-items:center; justify-content:center; gap:6px;">
                    <input type="checkbox" class="js-month-check" ${isChecked}>
                    <strong>${m}</strong>
                  </div>
                  <select class="js-month-status">
                    <option value="peak" ${statusVal === 'peak' ? 'selected' : ''}>ช่วงผลดก</option>
                    <option value="harvest" ${statusVal === 'harvest' ? 'selected' : ''}>ช่วงเก็บเกี่ยว</option>
                    <option value="rest" ${statusVal === 'rest' ? 'selected' : ''}>ช่วงบำรุงต้น</option>
                  </select>
                </label>
              `;
            }).join('')}
          </div>
        </div>
      `;

      row.querySelector('.js-remove-row').addEventListener('click', () => row.remove());
      return row;
    }

    document.getElementById('addSeasonRowBtn').addEventListener('click', () => {
      seasonRows.appendChild(createSeasonRow());
    });

    const offlineRows = document.getElementById('offlineRows');

    function createOfflineRow(data = {}) {
      const row = document.createElement('div');
      row.className = 'row-block offline-market-grid';
      row.innerHTML = `
        <div>
          <label class="field-label">ตลาดส่งขาย</label>
          <input type="text" class="js-offline-market" placeholder="กรอกชื่อตลาด" value="${escapeAttr(data.market)}">
        </div>
        <div>
          <label class="field-label">เส้นทาง</label>
          <input type="text" class="js-offline-route" placeholder="แนบ Link Google Map" value="${escapeAttr(data.route)}">
        </div>
        <div>
          <label class="field-label">&nbsp;</label>
          <button type="button" class="btn-remove-row js-remove-row" title="ลบแถวนี้">✕</button>
        </div>
      `;
      row.querySelector('.js-remove-row').addEventListener('click', () => row.remove());
      return row;
    }

    document.getElementById('addOfflineRowBtn').addEventListener('click', () => {
      offlineRows.appendChild(createOfflineRow());
    });

    function escapeAttr(str) {
      if (str === undefined || str === null) return '';
      return String(str).replace(/"/g, '&quot;');
    }

    document.addEventListener('DOMContentLoaded', async () => {
      if (!gardenId) {
        productRows.appendChild(createProductRow());
        seasonRows.appendChild(createSeasonRow());
        offlineRows.appendChild(createOfflineRow());
        return;
      }

      try {
        const response = await OwnerAuth.authFetch(`/api/owner/gardens/${gardenId}`);
        if (!response.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ');

        const data = await response.json();
        const garden = data.garden;

        const products = (garden && garden.products) || [];
        const seasons = (garden && garden.fruit_seasons) || [];
        const onlineChannels = (garden && garden.online_channels) || [];
        const offlineMarkets = (garden && garden.offline_markets) || [];

        if (products.length > 0) {
          products.forEach(p => productRows.appendChild(createProductRow({
            fruitName: p.fruitName,
            variety: p.variety,
            priceOnline: p.priceOnline,
            unitOnline: p.unitOnline,
            priceOffline: p.priceOffline,
            unitOffline: p.unitOffline,
            grade: p.grade,
            gradeDetail: p.gradeDetail,
            image: p.image
          })));
        } else {
          productRows.appendChild(createProductRow());
        }

        if (seasons.length > 0) {
          seasons.forEach(s => seasonRows.appendChild(createSeasonRow({
            fruitName: s.fruitName,
            variety: s.variety,
            months: s.months
          })));
        } else {
          seasonRows.appendChild(createSeasonRow());
        }

        document.querySelectorAll('input[name="onlineChannel"]').forEach(cb => {
          cb.checked = onlineChannels.includes(cb.value);
        });

        if (offlineMarkets.length > 0) {
          offlineMarkets.forEach(m => offlineRows.appendChild(createOfflineRow({
            market: m.market,
            route: m.route
          })));
        } else {
          offlineRows.appendChild(createOfflineRow());
        }

      } catch (err) {
        console.error('Error loading garden products:', err);
        productRows.appendChild(createProductRow());
        seasonRows.appendChild(createSeasonRow());
        offlineRows.appendChild(createOfflineRow());
      }
    });

    saveBtn.addEventListener('click', async () => {
      if (!gardenId) return;

      const productRowEls = Array.from(productRows.querySelectorAll('.row-block'));
      const products = [];
      const productImageFiles = [];
      const productImageIndexes = [];

      productRowEls.forEach(row => {
        const fruitName = row.querySelector('.js-fruit-name').value.trim();
        if (fruitName === '') return;

        const productIndex = products.length;
        const product = {
          fruitName,
          variety: row.querySelector('.js-fruit-variety').value.trim(),
          priceOnline: row.querySelector('.js-price-online').value.trim(),
          unitOnline: row.querySelector('.js-unit-online').value.trim(),
          priceOffline: row.querySelector('.js-price-offline').value.trim(),
          unitOffline: row.querySelector('.js-unit-offline').value.trim(),
          grade: row.querySelector('.js-grade').value,
          gradeDetail: row.querySelector('.js-grade-detail').value.trim()
        };

        if (row.dataset.existingImage) {
          product.image = row.dataset.existingImage;
        }

        const fileInput = row.querySelector('.js-fruit-image');
        if (fileInput.files[0]) {
          productImageFiles.push(fileInput.files[0]);
          productImageIndexes.push(productIndex);
        }

        products.push(product);
      });

      const seasons = Array.from(seasonRows.querySelectorAll('.row-block')).map(row => {
        const fruitName = row.querySelector('.js-season-name').value.trim();
        if (!fruitName) return null;

        const months = {};
        row.querySelectorAll('.month-checkbox-label').forEach(label => {
          const monthIdx = label.dataset.month;
          const isChecked = label.querySelector('.js-month-check').checked;
          const statusVal = label.querySelector('.js-month-status').value;
          if (isChecked) {
            months[monthIdx] = { active: true, status: statusVal };
          }
        });

        return {
          fruitName,
          variety: row.querySelector('.js-season-variety').value.trim(),
          months
        };
      }).filter(Boolean);

      const onlineChannels = Array.from(
        document.querySelectorAll('input[name="onlineChannel"]:checked')
      ).map(cb => cb.value);

      const offlineMarkets = Array.from(offlineRows.querySelectorAll('.row-block')).map(row => ({
        market: row.querySelector('.js-offline-market').value.trim(),
        route: row.querySelector('.js-offline-route').value.trim()
      })).filter(m => m.market !== '');

      if (products.length === 0) {
        formMessage.style.color = '#dc2626';
        formMessage.textContent = 'กรุณากรอกข้อมูลผลไม้อย่างน้อย 1 รายการ (ต้องมีชื่อผลไม้)';
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = 'กำลังบันทึก...';
      formMessage.style.color = '';
      formMessage.textContent = '';

      try {
        const formData = new FormData();
        formData.append('products', JSON.stringify(products));
        formData.append('seasons', JSON.stringify(seasons));
        formData.append('onlineChannels', JSON.stringify(onlineChannels));
        formData.append('offlineMarkets', JSON.stringify(offlineMarkets));
        formData.append('productImageIndexes', JSON.stringify(productImageIndexes));

        productImageFiles.forEach(file => {
          formData.append('productImages', file);
        });

        const response = await OwnerAuth.authFetch(`/api/owner/gardens/${gardenId}/products`, {
          method: 'PUT',
          body: formData
        });

        const data = await response.json();

        if (response.ok) {
          formMessage.style.color = '#17663f';
          formMessage.textContent = 'บันทึกข้อมูลผลไม้สำเร็จ!';
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
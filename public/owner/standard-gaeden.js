    const urlParams = new URLSearchParams(window.location.search);
    const gardenId = urlParams.get('id');

    const formMessage = document.getElementById('formMessage');
    const saveBtn = document.getElementById('saveBtn');
    const standardsRows = document.getElementById('standardsRows');

    if (!gardenId) {
      formMessage.style.color = '#dc2626';
      formMessage.textContent = 'ไม่พบรหัสสวน กรุณาเข้าหน้านี้ผ่านการเลือกสวนที่ต้องการเพิ่มมาตรฐานก่อน';
      saveBtn.disabled = true;
    }

function createStandardRow(data = {}) {
      const row = document.createElement('div');
      row.className = 'row-block standard-grid';
      row.innerHTML = `
        <div>
          <label class="field-label">โลโก้มาตรฐาน</label>
          <div class="js-logo-preview-area" style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <label class="upload-btn-mini js-upload-label" style="cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
              🖼️ <span class="js-upload-text">แนบโลโก้</span>
              <input type="file" class="js-logo-input" accept="image/*" hidden>
            </label>
          </div>
        </div>
        <div>
          <label class="field-label">ชื่อมาตรฐานสวน</label>
          <input type="text" class="js-reg-num" placeholder="กรอกชื่อมาตรฐาน" value="${escapeAttr(data.regNum)}">
        </div>
        <div>
          <label class="field-label">เลขทะเบียน/รายละเอียด</label>
          <textarea class="js-detail" placeholder="กรอกรายละเอียด">${escapeAttr(data.detail)}</textarea>
        </div>
        <div>
          <label class="field-label">ใบรับรอง</label>
          <div class="js-cert-preview-area" style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <label class="upload-btn-mini js-cert-upload-label" style="cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
              📄 <span class="js-cert-upload-text">ใบรับรอง</span>
              <input type="file" class="js-cert-input" accept="image/*" hidden>
            </label>
          </div>
        </div>
        <div>
          <label class="field-label">&nbsp;</label>
          <button type="button" class="btn-remove-row js-remove-row" title="ลบแถวนี้">✕</button>
        </div>
      `;

      row.dataset.existingLogo = data.logo || '';
      row.dataset.existingCert = data.certificate || '';

      const logoInput = row.querySelector('.js-logo-input');
      const logoArea = row.querySelector('.js-logo-preview-area');
      const uploadLabelLogo = row.querySelector('.js-upload-label');

      const certInput = row.querySelector('.js-cert-input');
      const certArea = row.querySelector('.js-cert-preview-area');
      const uploadLabelCert = row.querySelector('.js-cert-upload-label');

      // ฟังก์ชันจัดการแสดงพรีวิวโลโก้
      function renderLogoPreview(imgSrc) {
        const oldPreview = logoArea.querySelectorAll('.preview-logo-item');
        oldPreview.forEach(el => el.remove());

        if (!imgSrc) {
          uploadLabelLogo.style.display = 'inline-flex';
          return;
        }

        uploadLabelLogo.style.display = 'none';

        const wrap = document.createElement('div');
        wrap.className = 'preview-logo-item';
        wrap.style.cssText = 'position: relative; width: 70px; height: 70px; border-radius: 8px; overflow: hidden; border: 1px solid #ddd; flex-shrink: 0;';
        
        wrap.innerHTML = `
          <img src="${imgSrc}" style="width: 100%; height: 100%; object-fit: cover;">
          <button type="button" class="btn-remove-logo" style="position: absolute; top: 2px; right: 2px; background: rgba(220,38,38,0.8); color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 11px; display: flex; align-items: center; justify-content: center;">✕</button>
        `;

        wrap.querySelector('.btn-remove-logo').addEventListener('click', () => {
          row.dataset.existingLogo = '';
          logoInput.value = '';
          renderLogoPreview(null);
        });

        logoArea.prepend(wrap);
      }

      function renderCertPreview(imgSrc) {
        const oldPreview = certArea.querySelectorAll('.preview-cert-item');
        oldPreview.forEach(el => el.remove());

        if (!imgSrc) {
          uploadLabelCert.style.display = 'inline-flex';
          return;
        }

        uploadLabelCert.style.display = 'none';

        const wrap = document.createElement('div');
        wrap.className = 'preview-cert-item';
        wrap.style.cssText = 'position: relative; width: 70px; height: 70px; border-radius: 8px; overflow: hidden; border: 1px solid #ddd; flex-shrink: 0;';
        
        wrap.innerHTML = `
          <img src="${imgSrc}" style="width: 100%; height: 100%; object-fit: cover;">
          <button type="button" class="btn-remove-cert" style="position: absolute; top: 2px; right: 2px; background: rgba(220,38,38,0.8); color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 11px; display: flex; align-items: center; justify-content: center;">✕</button>
        `;

        wrap.querySelector('.btn-remove-cert').addEventListener('click', () => {
          row.dataset.existingCert = '';
          certInput.value = '';
          renderCertPreview(null);
        });

        certArea.prepend(wrap);
      }

      if (row.dataset.existingLogo) {
        renderLogoPreview(row.dataset.existingLogo);
      }
      if (row.dataset.existingCert) {
        renderCertPreview(row.dataset.existingCert);
      }

      logoInput.addEventListener('change', () => {
        if (logoInput.files && logoInput.files[0]) {
          const reader = new FileReader();
          reader.onload = (e) => {
            row.dataset.existingLogo = '';
            renderLogoPreview(e.target.result);
          };
          reader.readAsDataURL(logoInput.files[0]);
        }
      });

      certInput.addEventListener('change', () => {
        if (certInput.files && certInput.files[0]) {
          const reader = new FileReader();
          reader.onload = (e) => {
            row.dataset.existingCert = '';
            renderCertPreview(e.target.result);
          };
          reader.readAsDataURL(certInput.files[0]);
        }
      });

      row.querySelector('.js-remove-row').addEventListener('click', () => row.remove());
      return row;
    }

    document.getElementById('addStandardRowBtn').addEventListener('click', () => {
      standardsRows.appendChild(createStandardRow());
    });

    function escapeAttr(str) {
      if (str === undefined || str === null) return '';
      return String(str).replace(/"/g, '&quot;');
    }

    document.addEventListener('DOMContentLoaded', async () => {
      if (!gardenId) {
        standardsRows.appendChild(createStandardRow());
        return;
      }

      try {
        const response = await OwnerAuth.authFetch(`/api/owner/gardens/${gardenId}`);
        if (!response.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ');

        const data = await response.json();
        const garden = data.garden || data;
        const standards = garden.standards || [];

        if (standards.length > 0) {
          standards.forEach(std => {
            standardsRows.appendChild(createStandardRow({
              regNum: std.reg_num || std.regNum || '',
              detail: std.standard_detail || std.detail || '',
              logo: (std.logo_images && std.logo_images[0]) || '',
              certificate: (std.certificates && std.certificates[0]) || ''
            }));
          });
        } else if (garden.reg_num || garden.standard_detail) {
          standardsRows.appendChild(createStandardRow({
            regNum: garden.reg_num || '',
            detail: garden.standard_detail || '',
            logo: (garden.certInputLogo && garden.certInputLogo[0]) || '',
            certificate: (garden.certInput && garden.certInput[0]) || ''
          }));
        } else {
          standardsRows.appendChild(createStandardRow());
        }
      } catch (err) {
        console.error('Error loading standards:', err);
        standardsRows.appendChild(createStandardRow());
      }
    });

    saveBtn.addEventListener('click', async () => {
      if (!gardenId) return;

      const rowEls = Array.from(standardsRows.querySelectorAll('.row-block'));
      const standards = [];
      const logoFiles = [];
      const logoIndexes = [];
      const certFiles = [];
      const certIndexes = [];

      rowEls.forEach((row, index) => {
        const regNum = row.querySelector('.js-reg-num').value.trim();
        const detail = row.querySelector('.js-detail').value.trim();

        if (regNum === '' && detail === '') return; // ข้ามแถวที่ว่างเปล่า

        const stdIndex = standards.length;
        const standardItem = { regNum, detail };

        if (row.dataset.existingLogo) standardItem.logo = row.dataset.existingLogo;
        if (row.dataset.existingCert) standardItem.certificate = row.dataset.existingCert;

        const logoInput = row.querySelector('.js-logo-input');
        if (logoInput.files[0]) {
          logoFiles.push(logoInput.files[0]);
          logoIndexes.push(stdIndex);
        }

        const certInput = row.querySelector('.js-cert-input');
        if (certInput.files[0]) {
          certFiles.push(certInput.files[0]);
          certIndexes.push(stdIndex);
        }

        standards.push(standardItem);
      });

      if (standards.length === 0) {
        formMessage.style.color = '#dc2626';
        formMessage.textContent = 'กรุณากรอกข้อมูลมาตรฐานอย่างน้อย 1 รายการ';
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = 'กำลังบันทึก...';
      formMessage.style.color = '';
      formMessage.textContent = '';

      try {
        const formData = new FormData();
        formData.append('standards', JSON.stringify(standards));
        formData.append('logoIndexes', JSON.stringify(logoIndexes));
        formData.append('certIndexes', JSON.stringify(certIndexes));

        logoFiles.forEach(file => formData.append('standardLogos', file));
        certFiles.forEach(file => formData.append('standardCerts', file));

        const response = await OwnerAuth.authFetch(`/api/owner/gardens/${gardenId}/standards`, {
          method: 'PUT',
          body: formData
        });

        const data = await response.json();

        if (response.ok) {
          formMessage.style.color = '#17663f';
          formMessage.textContent = 'บันทึกข้อมูลมาตรฐานสำเร็จ!';
          setTimeout(() => history.back(), 1200);
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
        saveBtn.textContent = 'บันทึกข้อมูลสวน';
      }
    });
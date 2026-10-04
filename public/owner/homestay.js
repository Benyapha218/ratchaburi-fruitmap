const TOKEN_KEY = 'token';

    function getAuthToken() {
      return localStorage.getItem(TOKEN_KEY);
    }

    function authHeaders() {
      const token = getAuthToken();
      return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    if (!getAuthToken()) {
      alert('กรุณาเข้าสู่ระบบก่อนใช้งาน');
      window.location.href = 'login.html';
    }

    const uploadBox = document.getElementById('uploadBox');
    const imageInput = document.getElementById('imageInput');
    const imagePreview = document.getElementById('imagePreview');

    if (uploadBox && imageInput && imagePreview) {
      uploadBox.addEventListener('click', () => imageInput.click());

      imageInput.addEventListener('change', () => {
        imagePreview.innerHTML = '';
        Array.from(imageInput.files).forEach(file => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            imagePreview.appendChild(img);
          };
          reader.readAsDataURL(file);
        });
      });
    }

    const latInput = document.getElementById('lat');
    const lngInput = document.getElementById('lng');
    const coordDisplay = document.getElementById('coordDisplay');
    const mapEl = document.getElementById('mapPlaceholder');

    let map = null;
    let marker = null;

    if (mapEl) {
      const defaultLat = 13.5282;
      const defaultLng = 99.8134;

      map = L.map('mapPlaceholder').setView([defaultLat, defaultLng], 11);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      setTimeout(() => {
        map.invalidateSize();
      }, 300);

      map.on('click', (e) => {
        placeMarker(e.latlng.lat, e.latlng.lng);
      });
    }

    function updateCoordFields(lat, lng) {
      const latFixed = parseFloat(lat).toFixed(6);
      const lngFixed = parseFloat(lng).toFixed(6);
      if (latInput) latInput.value = latFixed;
      if (lngInput) lngInput.value = lngFixed;
      if (coordDisplay) coordDisplay.textContent = `${latFixed}, ${lngFixed}`;
    }

    function placeMarker(lat, lng) {
      if (!map) return;
      if (marker) {
        marker.setLatLng([lat, lng]);
      } else {
        marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          updateCoordFields(pos.lat, pos.lng);
        });
      }
      updateCoordFields(lat, lng);
    }

    const findCoordBtn = document.getElementById('findCoordBtn');
    if (findCoordBtn) {
      findCoordBtn.addEventListener('click', () => {
        const lat = parseFloat(latInput.value);
        const lng = parseFloat(lngInput.value);

        if (isNaN(lat) || isNaN(lng)) {
          alert('กรุณากรอกละติจูดและลองจิจูดเป็นตัวเลขก่อนค้นหาพิกัด');
          return;
        }

        map.setView([lat, lng], 15);
        placeMarker(lat, lng);
      });
    }

    document.addEventListener('DOMContentLoaded', async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const gardenId = urlParams.get('id');

      if (gardenId) {
        try {
          const response = await fetch(`/api/owner/gardens/${gardenId}`, {
            headers: authHeaders()
          });
          if (!response.ok) return;

          const data = await response.json();
          const garden = data.garden;

          if (!garden) return;

          const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
          };

          setVal('gardenName', garden.garden_name || '');
          setVal('gardenDesc', garden.description || '');
          setVal('phone', garden.contact?.phone || '');
          setVal('facebook', garden.contact?.facebook || '');
          setVal('lineId', garden.contact?.line || '');

          setVal('addressNo', garden.address?.address_no || '');
          setVal('moo', garden.address?.moo || '');
          setVal('soi', garden.address?.soi || '');
          setVal('road', garden.address?.road || '');
          setVal('subdistrict', garden.address?.subdistrict || '');
          setVal('district', garden.address?.district || '');
          setVal('province', garden.address?.province || '');

          if (garden.images && garden.images.length > 0 && imagePreview) {
            imagePreview.innerHTML = '';
            garden.images.forEach(imgUrl => {
              const img = document.createElement('img');
              img.src = imgUrl;
              imagePreview.appendChild(img);
            });
          }

          if (garden.location?.lat && garden.location?.lng) {
            placeMarker(garden.location.lat, garden.location.lng);
            map.setView([garden.location.lat, garden.location.lng], 15);
          }

        } catch (err) {
          console.error('Error loading garden details:', err);
        }
      }
    });

    const gardenForm = document.getElementById('gardenForm');

    if (gardenForm) {
      const saveBtn = gardenForm.querySelector('.btn-save');

      gardenForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const urlParams = new URLSearchParams(window.location.search);
        const gardenId = urlParams.get('id');

        const messageBox = document.getElementById('formMessage');
        const gardenName = document.getElementById('gardenName').value.trim();

        if (!gardenName) {
          messageBox.style.color = '#dc2626';
          messageBox.textContent = 'กรุณากรอกชื่อสวน';
          return;
        }

        const url = gardenId ? `/api/owner/gardens/${gardenId}` : '/api/owner/gardens';
        const method = gardenId ? 'PUT' : 'POST';

        const formData = new FormData();
        formData.append('gardenName', gardenName);
        formData.append('description', document.getElementById('gardenDesc').value);
        formData.append('phone', document.getElementById('phone').value);
        formData.append('facebook', document.getElementById('facebook').value);
        formData.append('lineId', document.getElementById('lineId').value);
        formData.append('addressNo', document.getElementById('addressNo').value);
        formData.append('moo', document.getElementById('moo').value);
        formData.append('soi', document.getElementById('soi').value);
        formData.append('road', document.getElementById('road').value);
        formData.append('subdistrict', document.getElementById('subdistrict').value);
        formData.append('district', document.getElementById('district').value);
        formData.append('province', document.getElementById('province').value);
        formData.append('lat', document.getElementById('lat').value);
        formData.append('lng', document.getElementById('lng').value);

        Array.from(imageInput.files).forEach(file => {
          formData.append('images', file);
        });

        saveBtn.disabled = true;
        saveBtn.textContent = 'กำลังบันทึก...';
        messageBox.textContent = '';

        try {
          const response = await fetch(`/api/owner/gardens/${gardenId}/homestay`, {
            method: 'PUT',
            headers: authHeaders(),
            body: formData
          });

          const data = await response.json();

          if (response.ok) {
            homestayMessage.style.color = '#17663f';
            homestayMessage.textContent = data.message || 'บันทึกข้อมูล Homestay สำเร็จ!';

            // ใช้ history.back() ถอยกลับไปหน้าก่อนหน้าแบบเดียวกับฟังก์ชันจองคิว
            setTimeout(() => {
              history.back();
            }, 1200);

          } else if (response.status === 401) {
            homestayMessage.style.color = '#dc2626';
            homestayMessage.textContent = 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่';
          } else {
            homestayMessage.style.color = '#dc2626';
            homestayMessage.textContent = data.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่';
          }
        } catch (err) {
          homestayMessage.style.color = '#dc2626';
          homestayMessage.textContent = 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบว่า server กำลังรันอยู่';
          console.error(err);
        } finally {
          btnSaveHomestay.disabled = false;
          btnSaveHomestay.textContent = 'บันทึกข้อมูล';
        }
      });
    }

    (function () {
      const homestayList = document.getElementById('homestayList');
      const btnAddHomestay = document.getElementById('btnAddHomestay');
      const btnSaveHomestay = document.getElementById('btnSaveHomestay');
      const homestayMessage = document.getElementById('homestayMessage');

      if (!homestayList || !btnAddHomestay || !btnSaveHomestay) return;

      let homestayIndex = 1;

      function setupImageUploader(item, inputClass, previewClass) {
        const fileInput = item.querySelector(inputClass);
        const previewList = item.querySelector(previewClass);
        let dataTransfer = new DataTransfer();

        fileInput.addEventListener('change', () => {
          Array.from(fileInput.files).forEach(file => {
            dataTransfer.items.add(file);
          });
          fileInput.files = dataTransfer.files;
          renderPreviews();
        });

        function renderPreviews() {
          const newPreviews = previewList.querySelectorAll('.preview-item.new-file');
          newPreviews.forEach(el => el.remove());

          Array.from(dataTransfer.files).forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const div = document.createElement('div');
              div.className = 'preview-item new-file';
              div.style.cssText = 'position: relative; width: 90px; height: 90px; border-radius: 8px; overflow: hidden; border: 1px solid #ddd;';
              div.innerHTML = `
                <img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover;">
                <button type="button" class="btn-remove-new" style="position: absolute; top: 2px; right: 2px; background: rgba(220,38,38,0.8); color: white; border: none; border-radius: 50%; width: 22px; height: 22px; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;">✕</button>
              `;

              div.querySelector('.btn-remove-new').addEventListener('click', () => {
                const dt = new DataTransfer();
                const { files } = fileInput;
                for (let i = 0; i < files.length; i++) {
                  if (i !== index) dt.items.add(files[i]);
                }
                fileInput.files = dt.files;
                dataTransfer = dt;
                renderPreviews();
              });

              previewList.appendChild(div);
            };
            reader.readAsDataURL(file);
          });
        }
      }

      function initItemUploaders(item) {
        setupImageUploader(item, '.hs-image-input', '.hs-image-preview-list');
        setupImageUploader(item, '.hs-interior-input', '.hs-interior-preview-list');
      }

      homestayList.querySelectorAll('.homestay-item').forEach(initItemUploaders);

      function refreshRemoveButtons() {
        const items = homestayList.querySelectorAll('.homestay-item');
        items.forEach(item => {
          const existingBtn = item.querySelector('.btn-remove-homestay');
          if (items.length > 1 && !existingBtn) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn-remove-homestay';
            btn.textContent = 'ลบรายการนี้';
            btn.addEventListener('click', () => {
              item.remove();
              refreshRemoveButtons();
            });
            item.appendChild(btn);
          } else if (items.length <= 1 && existingBtn) {
            existingBtn.remove();
          }
        });
      }

      btnAddHomestay.addEventListener('click', () => {
        const firstItem = homestayList.querySelector('.homestay-item');
        if (!firstItem) return;
        
        const newItem = firstItem.cloneNode(true);
        newItem.dataset.index = homestayIndex;
        
        newItem.querySelectorAll('input[type="text"], textarea').forEach(el => el.value = '');
        newItem.querySelectorAll('input[type="file"]').forEach(el => el.value = '');
        newItem.querySelectorAll('.hs-image-preview-list, .hs-interior-preview-list').forEach(el => el.innerHTML = '');

        const oldRemoveBtn = newItem.querySelector('.btn-remove-homestay');
        if (oldRemoveBtn) oldRemoveBtn.remove();

        homestayList.appendChild(newItem);
        initItemUploaders(newItem);

        homestayIndex++;
        refreshRemoveButtons();
      });

      function collectHomestayData() {
        const items = homestayList.querySelectorAll('.homestay-item');
        const homestays = [];
        const formData = new FormData();

        const allHomestayImagesMeta = [];
        const allInteriorImagesMeta = [];
        const deletedExistingImages = [];
        const deletedExistingInteriors = [];

        items.forEach((item, idx) => {
          const name = item.querySelector('.hs-name').value.trim();
          const roomType = item.querySelector('.hs-roomtype').value.trim();
          const roomCount = item.querySelector('.hs-roomcount').value.trim();
          const desc = item.querySelector('.hs-desc').value.trim();

          homestays.push({ name, roomType, roomCount, description: desc });

          const imageInput = item.querySelector('.hs-image-input');
          const imageCount = imageInput.files.length;
          for (let i = 0; i < imageCount; i++) {
            formData.append(`homestayImages_${idx}`, imageInput.files[i]);
          }
          allHomestayImagesMeta.push(imageCount);

          const interiorInput = item.querySelector('.hs-interior-input');
          const interiorCount = interiorInput.files.length;
          for (let i = 0; i < interiorCount; i++) {
            formData.append(`homestayInteriorImages_${idx}`, interiorInput.files[i]);
          }
          allInteriorImagesMeta.push(interiorCount);

          const removedImgs = Array.from(item.querySelectorAll('.existing-img-item.removed')).map(el => el.dataset.url);
          deletedExistingImages.push(removedImgs);

          const removedInteriors = Array.from(item.querySelectorAll('.existing-interior-item.removed')).map(el => el.dataset.url);
          deletedExistingInteriors.push(removedInteriors);
        });

        formData.append('homestays', JSON.stringify(homestays));
        formData.append('homestayImagesMeta', JSON.stringify(allHomestayImagesMeta));
        formData.append('homestayInteriorImagesMeta', JSON.stringify(allInteriorImagesMeta));
        formData.append('deletedExistingImages', JSON.stringify(deletedExistingImages));
        formData.append('deletedExistingInteriors', JSON.stringify(deletedExistingInteriors));

        return { homestays, formData };
      }

      btnSaveHomestay.addEventListener('click', async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const gardenId = urlParams.get('id');

        if (!gardenId) {
          homestayMessage.style.color = '#dc2626';
          homestayMessage.textContent = 'ไม่พบรหัสสวน กรุณาบันทึกข้อมูลสวนหลักก่อน';
          return;
        }

        const { homestays, formData } = collectHomestayData();
        const hasValidItem = homestays.some(h => h.name);
        
        if (!hasValidItem) {
          homestayMessage.style.color = '#dc2626';
          homestayMessage.textContent = 'กรุณากรอกชื่อ Homestay อย่างน้อย 1 รายการ';
          return;
        }

        btnSaveHomestay.disabled = true;
        btnSaveHomestay.textContent = 'กำลังบันทึก...';
        homestayMessage.style.color = '';
        homestayMessage.textContent = '';

        try {
          const response = await OwnerAuth.authFetch(`/api/owner/gardens/${gardenId}/homestay`, {
            method: 'PUT',
            body: formData
          });

          const data = await response.json();

          if (response.ok) {
            homestayMessage.style.color = '#17663f';
            homestayMessage.textContent = data.message || 'บันทึกข้อมูล Homestay สำเร็จ!';
            setTimeout(() => history.back(), 1200);
          } else if (response.status === 401) {
            homestayMessage.style.color = '#dc2626';
            homestayMessage.textContent = 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่';
          } else {
            homestayMessage.style.color = '#dc2626';
            homestayMessage.textContent = data.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่';
          }
        } catch (err) {
          homestayMessage.style.color = '#dc2626';
          homestayMessage.textContent = 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบว่า server กำลังรันอยู่';
          console.error(err);
        } finally {
          btnSaveHomestay.disabled = false;
          btnSaveHomestay.textContent = 'บันทึกข้อมูล';
        }
      });

      document.addEventListener('DOMContentLoaded', async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const gardenId = urlParams.get('id');
        if (!gardenId) return;

        try {
          const response = await fetch(`/api/owner/gardens/${gardenId}`, {
            headers: authHeaders()
          });
          if (!response.ok) return;
          const data = await response.json();
          const homestays = data.garden?.homestays;

          if (!Array.isArray(homestays) || homestays.length === 0) return;

          homestayList.innerHTML = '';
          homestayIndex = 0;

          homestays.forEach(h => {
            const item = document.createElement('div');
            item.className = 'homestay-item';
            item.dataset.index = homestayIndex;

            item.innerHTML = `
              <div class="fruit-price-grid" style="grid-template-columns: 2fr 1.5fr 1fr !important;">
                <div>
                  <label class="field-label">ชื่อ Homestay</label>
                  <input type="text" class="hs-name" value="${h.name || ''}">
                </div>
                <div>
                  <label class="field-label">ประเภทห้อง</label>
                  <input type="text" class="hs-roomtype" value="${h.roomType || ''}">
                </div>
                <div>
                  <label class="field-label">จำนวนห้อง</label>
                  <input type="text" class="hs-roomcount" value="${h.roomCount || ''}">
                </div>
              </div>

              <div style="margin-top: 20px;">
                <label class="field-label">รูป Homestay (เพิ่มได้หลายรูป)</label>
                <div class="image-upload-container">
                  <label class="upload-btn-mini" style="width: 150px !important;">
                    <span class="upload-btn-text">🖼️ เพิ่มรูปภาพ</span>
                    <input type="file" class="hs-image-input" accept="image/*" multiple hidden>
                  </label>
                  <div class="hs-image-preview-list" style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
                    ${Array.isArray(h.images) ? h.images.map(imgUrl => `
                      <div class="preview-item existing-img-item" data-url="${imgUrl}" style="position: relative; width: 90px; height: 90px; border-radius: 8px; overflow: hidden; border: 1px solid #ddd;">
                        <img src="${imgUrl}" style="width: 100%; height: 100%; object-fit: cover;">
                        <button type="button" class="btn-remove-existing" style="position: absolute; top: 2px; right: 2px; background: rgba(220,38,38,0.8); color: white; border: none; border-radius: 50%; width: 22px; height: 22px; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;">✕</button>
                      </div>
                    `).join('') : ''}
                  </div>
                </div>
              </div>

              <div style="margin-top: 20px;">
                <label class="field-label">รูปภายในห้อง (เพิ่มได้หลายรูป)</label>
                <div class="image-upload-container">
                  <label class="upload-btn-mini" style="width: 150px !important;">
                    <span class="upload-btn-text">🖼️ เพิ่มรูปภาพ</span>
                    <input type="file" class="hs-interior-input" accept="image/*" multiple hidden>
                  </label>
                  <div class="hs-interior-preview-list" style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px;">
                    ${Array.isArray(h.interiorImages) ? h.interiorImages.map(imgUrl => `
                      <div class="preview-item existing-interior-item" data-url="${imgUrl}" style="position: relative; width: 90px; height: 90px; border-radius: 8px; overflow: hidden; border: 1px solid #ddd;">
                        <img src="${imgUrl}" style="width: 100%; height: 100%; object-fit: cover;">
                        <button type="button" class="btn-remove-existing" style="position: absolute; top: 2px; right: 2px; background: rgba(220,38,38,0.8); color: white; border: none; border-radius: 50%; width: 22px; height: 22px; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;">✕</button>
                      </div>
                    `).join('') : ''}
                  </div>
                </div>
              </div>

              <div style="margin-top: 20px; width: 100%;">
                <label class="field-label">รายละเอียด Homestay</label>
                <textarea class="hs-desc">${h.description || ''}</textarea>
              </div>
            `;

            homestayList.appendChild(item);
            initItemUploaders(item);

            item.querySelectorAll('.btn-remove-existing').forEach(btn => {
              btn.addEventListener('click', (e) => {
                const previewDiv = e.target.closest('.preview-item');
                previewDiv.classList.add('removed');
                previewDiv.style.display = 'none';
              });
            });

            homestayIndex++;
          });

          refreshRemoveButtons();
        } catch (err) {
          console.error('Error loading homestay data:', err);
        }
      });
    })();
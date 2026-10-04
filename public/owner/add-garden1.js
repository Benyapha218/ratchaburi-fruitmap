// ===== อัพโหลดรูปภาพ (รองรับพรีวิว, ปุ่มลบ, และจัดการไฟล์) =====
    const uploadBox = document.getElementById('uploadBox');
    const imageInput = document.getElementById('imageInput');
    const imagePreview = document.getElementById('imagePreview');

    let selectedFilesArray = [];
    let existingImagesArray = [];

    uploadBox.addEventListener('click', () => imageInput.click());

    function renderImagePreviews() {
      imagePreview.innerHTML = '';

      existingImagesArray.forEach((imgUrl, index) => {
        const wrap = document.createElement('div');
        wrap.className = 'preview-item existing-item';
        wrap.style.cssText = 'position: relative; width: 90px; height: 90px; border-radius: 8px; overflow: hidden; border: 1px solid #ddd; display: inline-block; margin-right: 8px; margin-bottom: 8px;';
        
        wrap.innerHTML = `
          <img src="${imgUrl}" style="width: 100%; height: 100%; object-fit: cover;">
          <button type="button" class="btn-remove-old" data-index="${index}" style="position: absolute; top: 2px; right: 2px; background: rgba(220,38,38,0.8); color: white; border: none; border-radius: 50%; width: 22px; height: 22px; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;">✕</button>
        `;
        
        wrap.querySelector('.btn-remove-old').addEventListener('click', () => {
          existingImagesArray.splice(index, 1);
          renderImagePreviews();
        });

        imagePreview.appendChild(wrap);
      });

      selectedFilesArray.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const wrap = document.createElement('div');
          wrap.className = 'preview-item new-item';
          wrap.style.cssText = 'position: relative; width: 90px; height: 90px; border-radius: 8px; overflow: hidden; border: 1px solid #ddd; display: inline-block; margin-right: 8px; margin-bottom: 8px;';
          
          wrap.innerHTML = `
            <img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover;">
            <button type="button" class="btn-remove-new" data-index="${index}" style="position: absolute; top: 2px; right: 2px; background: rgba(220,38,38,0.8); color: white; border: none; border-radius: 50%; width: 22px; height: 22px; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;">✕</button>
          `;

          wrap.querySelector('.btn-remove-new').addEventListener('click', () => {
            selectedFilesArray.splice(index, 1);
            renderImagePreviews();
          });

          imagePreview.appendChild(wrap);
        };
        reader.readAsDataURL(file);
      });
    }

    imageInput.addEventListener('change', () => {
      const files = Array.from(imageInput.files);
      selectedFilesArray = selectedFilesArray.concat(files);
      imageInput.value = '';
      renderImagePreviews();
    });

    // ===== แผนที่ Leaflet =====
    const latInput = document.getElementById('lat');
    const lngInput = document.getElementById('lng');
    const coordDisplay = document.getElementById('coordDisplay');

    const defaultLat = 13.5282;
    const defaultLng = 99.8134;

    const map = L.map('mapPlaceholder').setView([defaultLat, defaultLng], 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    setTimeout(() => {
      map.invalidateSize();
    }, 300);

    let marker = null;

    function updateCoordFields(lat, lng) {
      const latFixed = parseFloat(lat).toFixed(6);
      const lngFixed = parseFloat(lng).toFixed(6);
      latInput.value = latFixed;
      lngInput.value = lngFixed;
      coordDisplay.textContent = `${latFixed}, ${lngFixed}`;
    }

    function placeMarker(lat, lng) {
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

    map.on('click', (e) => {
      placeMarker(e.latlng.lat, e.latlng.lng);
    });

    document.getElementById('findCoordBtn').addEventListener('click', () => {
      const lat = parseFloat(latInput.value);
      const lng = parseFloat(lngInput.value);

      if (isNaN(lat) || isNaN(lng)) {
        alert('กรุณากรอกละติจูดและลองจิจูดเป็นตัวเลขก่อนค้นหาพิกัด');
        return;
      }

      map.setView([lat, lng], 15);
      placeMarker(lat, lng);
    });

    document.addEventListener('DOMContentLoaded', async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const gardenId = urlParams.get('id');

      if (gardenId) {
        try {
          const response = await OwnerAuth.authFetch(`/api/owner/gardens/${gardenId}`);
          if (!response.ok) return;

          const data = await response.json();
          const garden = data.garden;

          if (!garden) return;

          document.getElementById('gardenName').value = garden.garden_name || '';
          document.getElementById('gardenDesc').value = garden.description || '';
          document.getElementById('phone').value = garden.contact?.phone || '';
          document.getElementById('facebook').value = garden.contact?.facebook || '';
          document.getElementById('lineId').value = garden.contact?.line || '';
          
          document.getElementById('addressNo').value = garden.address?.address_no || '';
          document.getElementById('moo').value = garden.address?.moo || '';
          document.getElementById('soi').value = garden.address?.soi || '';
          document.getElementById('road').value = garden.address?.road || '';
          document.getElementById('subdistrict').value = garden.address?.subdistrict || '';
          document.getElementById('district').value = garden.address?.district || '';
          document.getElementById('province').value = garden.address?.province || '';

          if (garden.images && garden.images.length > 0) {
            existingImagesArray = garden.images;
            renderImagePreviews();
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

      selectedFilesArray.forEach(file => {
        formData.append('images', file);
      });

      existingImagesArray.forEach(imgUrl => {
        formData.append('existingImages', imgUrl);
      });

      saveBtn.disabled = true;
      saveBtn.textContent = 'กำลังบันทึก...';
      messageBox.textContent = '';

      try {
        const response = await OwnerAuth.authFetch(url, {
          method: method,
          body: formData
        });

        const data = await response.json();

        if (response.ok) {
          messageBox.style.color = '#17663f';
          messageBox.textContent = gardenId ? 'แก้ไขข้อมูลสวนสำเร็จ!' : 'บันทึกข้อมูลสวนสำเร็จ!';
          
          setTimeout(() => {
            history.back();
          }, 1200);
        } else if (response.status === 401) {
          messageBox.style.color = '#dc2626';
          messageBox.textContent = 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่';
        } else {
          messageBox.style.color = '#dc2626';
          messageBox.textContent = data.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่';
        }
      } catch (err) {
        messageBox.style.color = '#dc2626';
        messageBox.textContent = 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบว่า server กำลังรันอยู่';
        console.error(err);
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'บันทึกข้อมูลสวน';
      }
    });
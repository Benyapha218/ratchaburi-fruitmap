let map = null;
    let allGardens = [];
    let markers = [];
    let activeFilter = 'all';
    let recommendedIds = new Set();
    let userCoords = null;
    let userMarker = null;

    const orchardSearch = document.getElementById('orchard-search');
    const orchardList = document.getElementById('orchard-list');
    const orchardEmpty = document.getElementById('orchard-empty');
    const orchardSearchEmpty = document.getElementById('orchard-search-empty');
    const pinCount = document.getElementById('pinCount');
    const listTitle = document.getElementById('listTitle');
    const listSubtitle = document.getElementById('listSubtitle');
    const clearDistrictBtn = document.getElementById('clearDistrictBtn');

    function getFilteredGardens() {
      let list = allGardens.slice();
      const district = getSelectedDistrictName();

      if (district) {
        list = list.filter(g => gardenMatchesDistrict(g, district));
      }

      const q = orchardSearch.value.trim().toLowerCase();
      if (q) {
        list = list.filter(g => {
          const hay = [g.garden_name, g.description, g.address?.district, g.address?.subdistrict,
            ...(g.products || []).map(p => p.name)].join(' ').toLowerCase();
          return hay.includes(q);
        });
      }

      if (activeFilter === 'recommended') {
        list = list
          .filter(g => recommendedIds.has(String(g._id)))
          .sort((a, b) => (b.rating || b.average_rating || 0) - (a.rating || b.average_rating || 0)); // เรียงจากคะแนนรีวิวมากไปน้อย
      }

      if (activeFilter === 'nearby' && userCoords) {
        list = list.map(g => ({
          ...g,
          distance_km: haversineKm(userCoords.lat, userCoords.lng, g.location.lat, g.location.lng)
        })).sort((a, b) => a.distance_km - b.distance_km);
      }

      return list;
    }

    function clearMarkers() {
      markers.forEach(m => map.removeLayer(m));
      markers = [];
    }

    function addMarkers(list) {
      clearMarkers();
      list.forEach(garden => {
        const lat = garden.location?.lat;
        const lng = garden.location?.lng;
        if (lat == null || lng == null) return;

        const districtName = gardenDistrictName(garden);
        const color = getDistrictColor(districtName);
        const icon = createGardenMarkerIcon(L, garden, color);
        const marker = L.marker([lat, lng], { icon }).addTo(map);

        const imgHtml = garden.images?.length
          ? `<img src="${escapeHtml(garden.images[0])}" style="width:100%;height:80px;object-fit:cover;border-radius:8px;margin-bottom:6px;" alt="">`
          : '';

        marker.bindPopup(`
          ${imgHtml}
          <strong style="color:#14532d;font-size:15px;">${escapeHtml(garden.garden_name)}</strong><br/>
          <span style="font-size:12px;color:#6b7280;">${escapeHtml(formatGardenAddress(garden))}</span>
          ${garden.description ? `<p style="font-size:13px;color:#4b5563;margin:6px 0 0;">${escapeHtml(garden.description)}</p>` : ''}
          <div style="display:flex;gap:6px;margin-top:8px;">
            <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" rel="noopener"
              style="display:inline-block;background:#166534;color:#fff;padding:6px 12px;border-radius:8px;font-size:12px;text-decoration:none;font-weight:600;">🧭 นำทาง</a>
            <a href="garden-detail.html?id=${encodeURIComponent(garden._id)}"
              style="display:inline-block;background:#ffffff;color:#166534;border:1.5px solid #166534;padding:5px 12px;border-radius:8px;font-size:12px;text-decoration:none;font-weight:600;">📄 รายละเอียดสวน</a>
          </div>
        `, { maxWidth: 260 });

        marker.gardenId = String(garden._id);
        marker.on('click', () => highlightItem(marker.gardenId));
        markers.push(marker);
      });

      pinCount.textContent = `หมุดจากระบบ — ${list.length} สวน`;
    }

    function renderList(list) {
      orchardList.innerHTML = '';

      if (!list.length) {
        if (allGardens.length > 0) {
          orchardEmpty.classList.add('hidden');
          orchardSearchEmpty.classList.remove('hidden');
        } else {
          orchardEmpty.classList.remove('hidden');
          orchardSearchEmpty.classList.add('hidden');
        }
        clearMarkers();
        pinCount.textContent = 'หมุดจากระบบ — 0 สวน';
        return;
      }

      orchardEmpty.classList.add('hidden');
      orchardSearchEmpty.classList.add('hidden');

      list.forEach(garden => {
        const li = document.createElement('li');
        li.className = 'orchard-item p-3 hover:bg-[#f0fdf4] rounded-lg transition border border-transparent hover:border-[#d1fae5] cursor-pointer';
        li.dataset.id = String(garden._id);
        li.setAttribute('role', 'listitem');

        const thumb = garden.images?.length
          ? `<div class="list-thumb"><img src="${escapeHtml(garden.images[0])}" alt=""></div>`
          : listIconHtml(garden);

        const tags = [];
        if (garden.hasHomestay) tags.push('<span class="rounded-md bg-[#f0fdf4] text-[#166534] px-2 py-0.5 text-[11px] font-medium border border-[#d1fae5]">Homestay</span>');
        if (recommendedIds.has(String(garden._id))) tags.push('<span class="rounded-md bg-[#fef9c3] text-[#854d0e] px-2 py-0.5 text-[11px] font-medium border border-[#fde047]">⭐ สวนแนะนำ</span>');
        if (garden.distance_km != null) tags.push(`<span class="rounded-md bg-[#eff6ff] text-[#1d4ed8] px-2 py-0.5 text-[11px] font-medium border border-[#bfdbfe]">${formatDistance(garden.distance_km)}</span>`);

        li.innerHTML = `
          <div class="flex items-center gap-2.5 min-w-0">
            ${thumb}
            <div class="min-w-0 flex-1">
              <div class="font-semibold text-[#14532d] truncate">${escapeHtml(garden.garden_name)}</div>
              <p class="text-xs text-[#6b7280] mt-0.5 m-0">${escapeHtml(formatGardenAddress(garden))}</p>
              ${tags.length ? `<div class="mt-1.5 flex flex-wrap gap-1">${tags.join('')}</div>` : ''}
            </div>
          </div>
          <div class="mt-2 flex justify-end">
            <a href="garden-detail.html?id=${encodeURIComponent(garden._id)}" class="btn-detail" onclick="event.stopPropagation()">
              📄 รายละเอียดสวน
            </a>
          </div>
        `;

        li.addEventListener('click', () => focusGarden(garden));
        orchardList.appendChild(li);
      });

      addMarkers(list);
    }

    function highlightItem(id) {
      orchardList.querySelectorAll('.orchard-item').forEach(li => {
        li.classList.toggle('selected', li.dataset.id === id);
      });
    }

    function focusGarden(garden) {
      highlightItem(String(garden._id));
      map.setView([garden.location.lat, garden.location.lng], 14, { animate: true });
      const m = markers.find(x => x.gardenId === String(garden._id));
      if (m) m.openPopup();
    }

    function applyFilter() {
      const list = getFilteredGardens();
      const district = getSelectedDistrictName();

      if (district) {
        listTitle.textContent = `สวนใน${normalizeAmphoe(district)}`;
        listSubtitle.textContent = 'คลิกอำเภออีกครั้งเพื่อยกเลิกการกรอง';
        clearDistrictBtn.classList.remove('hidden');
      } else {
        listTitle.textContent = activeFilter === 'recommended' ? 'สวนแนะนำ (คะแนนรีวิวสูงสุด)'
          : activeFilter === 'nearby' ? 'สวนใกล้ฉัน' : 'รายการสวน';
        listSubtitle.textContent = 'คลิกอำเภอบนแผนที่เพื่อกรองสวน';
        clearDistrictBtn.classList.add('hidden');
      }

      renderList(list);
    }

    function loadRecommended() {
      try {
        const topGardens = allGardens
          .filter(g => (g.rating || g.average_rating || 0) >= 4.0)
          .map(g => String(g._id));

        recommendedIds = new Set(topGardens);
      } catch (e) {
        recommendedIds = new Set();
      }
    }

    async function loadGardens() {
      try {
        const res = await fetch('/api/map/gardens');
        const data = await res.json();
        allGardens = data.gardens || [];
        
        loadRecommended();
        applyFilter();
      } catch (err) {
        console.error('Load gardens error:', err);
      }
    }

    clearDistrictBtn.addEventListener('click', () => {
      clearDistrictSelection();
      applyFilter();
    });

    orchardSearch.addEventListener('input', applyFilter);
    orchardSearch.addEventListener('search', applyFilter);

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const f = btn.dataset.filter;
        if (f === 'nearby') {
          if (!navigator.geolocation) { alert('เบราว์เซอร์ไม่รองรับ GPS'); return; }
          navigator.geolocation.getCurrentPosition(pos => {
            userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            if (userMarker) map.removeLayer(userMarker);
            userMarker = L.circleMarker([userCoords.lat, userCoords.lng], {
              radius: 8, color: '#2563eb', fillColor: '#2563eb', fillOpacity: 1, weight: 3
            }).addTo(map).bindPopup('📍 ตำแหน่งของคุณ');
            activeFilter = 'nearby';
            document.querySelectorAll('.filter-btn').forEach(b => {
              b.classList.toggle('active', b.dataset.filter === 'nearby');
              b.style.background = b.classList.contains('active') ? '#166534' : '';
              b.style.color = b.classList.contains('active') ? '#fff' : '';
            });
            applyFilter();
          }, () => alert('ไม่สามารถเข้าถึงตำแหน่งได้'));
          return;
        }
        activeFilter = f;
        document.querySelectorAll('.filter-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.filter === f);
          b.style.background = b.classList.contains('active') ? '#166534' : '';
          b.style.color = b.classList.contains('active') ? '#fff' : '';
        });
        applyFilter();
      });
    });

    document.addEventListener('DOMContentLoaded', async () => {
      map = L.map('map', { scrollWheelZoom: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      await loadRatchaburiDistricts(map, {
        onSelect() { applyFilter(); }
      });

      await loadGardens();

      setTimeout(() => map.invalidateSize(), 300);
    });
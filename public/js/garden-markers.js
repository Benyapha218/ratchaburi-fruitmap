/**
 * ไอคอนหมุดผลไม้บนแผนที่
 */
const FRUIT_EMOJI_MAP = {
  /*mango: '🥭',
  mangosteen: '🟣',
  grape: '🍇',
  coconut: '🥥',*/
  orange: '📍',
  /*papaya: '🍈',
  durian: '🌰',
  default: '🌳'*/
};

function detectFruitEmoji(garden) {
  const text = [
    garden.products?.[0]?.name,
    garden.garden_name,
    garden.description
  ].join(' ').toLowerCase();

  /*if (text.includes('มะม่วง')) return FRUIT_EMOJI_MAP.mango;
  if (text.includes('มังคุด')) return '🟣';
  if (text.includes('องุ่น')) return FRUIT_EMOJI_MAP.grape;
  if (text.includes('มะพร้าว')) return FRUIT_EMOJI_MAP.coconut;*/
  if (text.includes('ส้ม')) return FRUIT_EMOJI_MAP.orange;
  /*if (text.includes('มะละกอ')) return FRUIT_EMOJI_MAP.papaya;
  if (text.includes('ทุเรียน')) return FRUIT_EMOJI_MAP.durian;
  if (text.includes('ลำไย')) return '🍇';
  if (text.includes('ลิ้นจี่')) return '🔴';*/
  return FRUIT_EMOJI_MAP.default;
}

function createGardenMarkerIcon(L, garden, districtColor) {
  const emoji = detectFruitEmoji(garden);
  const color = districtColor || '#166534';

  return L.divIcon({
    className: 'garden-fruit-marker',
    html: `
      <div style="
        width:40px;height:40px;border-radius:50%;
        background:${color};
        border:3px solid #f0fdf4;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 3px 10px rgba(0,0,0,.35);
        font-size:20px;line-height:1;
      ">${emoji}</div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });
}

function listIconHtml(garden) {
  const emoji = detectFruitEmoji(garden);
  return `<div class="fruit-pin" aria-hidden="true">${emoji}</div>`;
}

function formatGardenAddress(garden) {
  const a = garden.address || {};
  const parts = [];
  if (a.district) parts.push(`อ.${normalizeAmphoe(a.district)}`);
  if (a.province) parts.push(`จ.${a.province}`);
  else parts.push('จ.ราชบุรี');
  return parts.join(' ');
}

function normalizeAmphoe(name) {
  return String(name || '')
    .replace(/^อำเภอ\s*/i, '')
    .replace(/^อ\.\s*/i, '')
    .trim();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function formatDistance(km) {
  if (km == null) return '';
  if (km < 1) return `${Math.round(km * 1000)} ม.`;
  return `${km.toFixed(1)} กม.`;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getDistrictColor(districtNameTh) {
  if (!districtNameTh || typeof DISTRICT_PALETTE === 'undefined') return '#166534';
  return (DISTRICT_PALETTE[districtNameTh] || {}).stroke || '#166534';
}

function gardenDistrictName(garden) {
  const d = garden.address?.district;
  if (!d) return null;
  const norm = normalizeAmphoe(d);
  const key = `อำเภอ${norm}`;
  return DISTRICT_PALETTE[key] ? key : null;
}

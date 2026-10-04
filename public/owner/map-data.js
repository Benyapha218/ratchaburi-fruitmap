const RATCHABURI_DISTRICTS = [
  {
    id: 'mueang',
    name: 'เมืองราชบุรี',
    aliases: ['เมืองราชบุรี', 'เมือง', 'อ.เมืองราชบุรี', 'อ.เมือง'],
    color: '#17663f',
    center: [13.5282, 99.8134],
    polygon: [
      [13.48, 99.76], [13.48, 99.87], [13.58, 99.87], [13.58, 99.76]
    ]
  },
  {
    id: 'chom-bueng',
    name: 'จอมบึง',
    aliases: ['จอมบึง', 'อ.จอมบึง'],
    color: '#2563eb',
    center: [13.589, 99.589],
    polygon: [
      [13.52, 99.52], [13.52, 99.66], [13.65, 99.66], [13.65, 99.52]
    ]
  },
  {
    id: 'suan-phueng',
    name: 'สวนผึ้ง',
    aliases: ['สวนผึ้ง', 'อ.สวนผึ้ง'],
    color: '#9333ea',
    center: [13.456, 99.334],
    polygon: [
      [13.35, 99.22], [13.35, 99.45], [13.55, 99.45], [13.55, 99.22]
    ]
  },
  {
    id: 'damnoen-saduak',
    name: 'ดำเนินสะดวก',
    aliases: ['ดำเนินสะดวก', 'อ.ดำเนินสะดวก'],
    color: '#ea580c',
    center: [13.518, 99.954],
    polygon: [
      [13.45, 99.88], [13.45, 100.03], [13.58, 100.03], [13.58, 99.88]
    ]
  },
  {
    id: 'ban-pong',
    name: 'บ้านโป่ง',
    aliases: ['บ้านโป่ง', 'อ.บ้านโป่ง'],
    color: '#0891b2',
    center: [13.826, 99.877],
    polygon: [
      [13.76, 99.82], [13.76, 99.94], [13.88, 99.94], [13.88, 99.82]
    ]
  },
  {
    id: 'bang-phae',
    name: 'บางแพ',
    aliases: ['บางแพ', 'อ.บางแพ'],
    color: '#db2777',
    center: [13.724, 99.889],
    polygon: [
      [13.67, 99.84], [13.67, 99.94], [13.77, 99.94], [13.77, 99.84]
    ]
  },
  {
    id: 'photharam',
    name: 'โพธาราม',
    aliases: ['โพธาราม', 'อ.โพธาราม'],
    color: '#ca8a04',
    center: [13.686, 99.849],
    polygon: [
      [13.63, 99.79], [13.63, 99.91], [13.74, 99.91], [13.74, 99.79]
    ]
  },
  {
    id: 'pak-tho',
    name: 'ปากท่อ',
    aliases: ['ปากท่อ', 'อ.ปากท่อ'],
    color: '#dc2626',
    center: [13.374, 99.295],
    polygon: [
      [13.28, 99.20], [13.28, 99.40], [13.46, 99.40], [13.46, 99.20]
    ]
  },
  {
    id: 'wat-phleng',
    name: 'วัดเพลง',
    aliases: ['วัดเพลง', 'อ.วัดเพลง'],
    color: '#65a30d',
    center: [13.456, 99.578],
    polygon: [
      [13.40, 99.52], [13.40, 99.64], [13.51, 99.64], [13.51, 99.52]
    ]
  },
  {
    id: 'ban-kha',
    name: 'บ้านคา',
    aliases: ['บ้านคา', 'อ.บ้านคา'],
    color: '#7c3aed',
    center: [13.789, 99.456],
    polygon: [
      [13.72, 99.38], [13.72, 99.54], [13.85, 99.54], [13.85, 99.38]
    ]
  }
];

const RATCHABURI_CENTER = [13.5282, 99.8134];
const RATCHABURI_ZOOM = 10;

function normalizeDistrictName(value) {
  if (!value) return '';
  return value
    .replace(/^อ\.\s*/i, '')
    .replace(/^อำเภอ\s*/i, '')
    .trim();
}

function matchDistrictByName(districtName) {
  const norm = normalizeDistrictName(districtName);
  if (!norm) return null;
  return RATCHABURI_DISTRICTS.find(d =>
    d.name === norm || d.aliases.some(a => normalizeDistrictName(a) === norm)
  ) || null;
}

function pointInPolygon(point, polygon) {
  const [y, x] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function matchDistrictByLocation(lat, lng) {
  for (const district of RATCHABURI_DISTRICTS) {
    if (pointInPolygon([lat, lng], district.polygon)) {
      return district;
    }
  }
  return null;
}

function getGardenDistrict(garden) {
  const byName = matchDistrictByName(garden.address?.district || garden.district_normalized);
  if (byName) return byName;

  const lat = garden.location?.lat;
  const lng = garden.location?.lng;
  if (lat != null && lng != null) {
    return matchDistrictByLocation(lat, lng);
  }
  return null;
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

function formatDistance(km) {
  if (km == null) return '';
  if (km < 1) return `${Math.round(km * 1000)} ม.`;
  return `${km.toFixed(1)} กม.`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

/**
 * ขอบเขตอำเภอจังหวัดราชบุรี + สีพาสเทล (จาก GeoJSON)
 */
const DISTRICT_PALETTE = {
  'อำเภอเมืองราชบุรี': { fill: '#f9a8d4', stroke: '#db2777' },
  'อำเภอโพธาราม': { fill: '#fde68a', stroke: '#d97706' },
  'อำเภอบ้านโป่ง': { fill: '#d6b88a', stroke: '#92400e' },
  'อำเภอดำเนินสะดวก': { fill: '#7dd3fc', stroke: '#0284c7' },
  'อำเภอปากท่อ': { fill: '#f0abfc', stroke: '#c026d3' },
  'อำเภอจอมบึง': { fill: '#c4b5fd', stroke: '#7c3aed' },
  'อำเภอสวนผึ้ง': { fill: '#86efac', stroke: '#16a34a' },
  'อำเภอบางแพ': { fill: '#fda4af', stroke: '#e11d48' },
  'อำเภอวัดเพลง': { fill: '#fef08a', stroke: '#ca8a04' },
  'อำเภอบ้านคา': { fill: '#a5b4fc', stroke: '#4f46e5' }
};

let districtLayerGroup = null;
let districtLayersByName = {};
let selectedDistrictName = null;
let onDistrictSelectCallback = null;

function normalizeAmphoe(name) {
  return String(name || '')
    .replace(/^อำเภอ\s*/i, '')
    .replace(/^อ\.\s*/i, '')
    .trim();
}

function getDistrictStyle(name, selected) {
  const palette = DISTRICT_PALETTE[name] || { fill: '#d1d5db', stroke: '#6b7280' };
  const isSelected = selected === name;
  const isDimmed = selected && !isSelected;
  return {
    color: palette.stroke,
    weight: isSelected ? 3 : 2,
    fillColor: palette.fill,
    fillOpacity: isDimmed ? 0.2 : isSelected ? 0.62 : 0.5,
    opacity: isDimmed ? 0.5 : 0.95
  };
}

function refreshDistrictStyles() {
  Object.keys(districtLayersByName).forEach(name => {
    districtLayersByName[name].setStyle(getDistrictStyle(name, selectedDistrictName));
  });
}

function selectDistrict(name) {
  if (selectedDistrictName === name) {
    selectedDistrictName = null;
  } else {
    selectedDistrictName = name;
  }
  refreshDistrictStyles();
  if (typeof onDistrictSelectCallback === 'function') {
    onDistrictSelectCallback(selectedDistrictName);
  }
}

async function loadRatchaburiDistricts(map, options) {
  const opts = options || {};
  onDistrictSelectCallback = opts.onSelect || null;

  const response = await fetch(opts.geoUrl || '/geo/ratchaburi-amphoe.geojson');
  const geo = await response.json();

  if (districtLayerGroup) {
    map.removeLayer(districtLayerGroup);
  }

  districtLayersByName = {};
  districtLayerGroup = L.geoJSON(geo, {
    style(feature) {
      return getDistrictStyle(feature.properties.name_th, selectedDistrictName);
    },
    onEachFeature(feature, layer) {
      const name = feature.properties.name_th;
      districtLayersByName[name] = layer;
      layer.bindTooltip(normalizeAmphoe(name), { sticky: true, className: 'district-tip' });
      layer.on('click', () => {
        selectDistrict(name);
        if (selectedDistrictName === name) {
          map.fitBounds(layer.getBounds(), { padding: [30, 30], maxZoom: 12 });
        }
      });
    }
  }).addTo(map);

  const bounds = districtLayerGroup.getBounds();
  map.fitBounds(bounds, { padding: [18, 18], maxZoom: 11 });

  return districtLayerGroup;
}

function gardenMatchesDistrict(garden, districtNameTh) {
  if (!districtNameTh) return true;
  const gardenDistrict = normalizeAmphoe(garden.address?.district);
  const amphoe = normalizeAmphoe(districtNameTh);
  return gardenDistrict === amphoe;
}

function getSelectedDistrictName() {
  return selectedDistrictName;
}

function clearDistrictSelection() {
  selectedDistrictName = null;
  refreshDistrictStyles();
  if (typeof onDistrictSelectCallback === 'function') {
    onDistrictSelectCallback(null);
  }
}

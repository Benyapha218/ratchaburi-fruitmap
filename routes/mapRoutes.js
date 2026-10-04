const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const connectDB = require('../config/db');

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeDistrictName(value) {
  if (!value) return '';
  return value
    .replace(/^อ\.\s*/i, '')
    .replace(/^อำเภอ\s*/i, '')
    .trim();
}

function hasValidLocation(garden) {
  const lat = garden.location?.lat;
  const lng = garden.location?.lng;
  return lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng);
}

function formatGardenForMap(garden, extra) {
  const address = garden.address || {};
  return {
    _id: garden._id,
    garden_name: garden.garden_name || 'ไม่ระบุชื่อสวน',
    description: garden.description || '',
    images: garden.images || [],
    contact: garden.contact || {},
    address: {
      subdistrict: address.subdistrict || '',
      district: address.district || '',
      province: address.province || 'ราชบุรี'
    },
    location: {
      lat: garden.location.lat,
      lng: garden.location.lng
    },
    products: garden.products || [],
    district_normalized: normalizeDistrictName(address.district),
    average_rating: typeof garden.average_rating === 'number' ? Number(garden.average_rating.toFixed(1)) : 0,
    ...(extra || {})
  };
}

async function fetchGardensWithRating(db, query = {}) {
  const gardensCollection = db.collection('orchards');
  return await gardensCollection.aggregate([
    { $match: query },
    {
      $lookup: {
        from: 'reviews',
        localField: '_id',
        foreignField: 'garden_id',
        as: 'reviews'
      }
    },
    {
      $addFields: {
        average_rating: { $avg: '$reviews.rating' }
      }
    },
    { $sort: { created_at: -1 } }
  ]).toArray();
}

router.get('/gardens', async (req, res) => {
  try {
    const { district, q, lat, lng, limit } = req.query;
    const db = await connectDB();

    const query = {
      is_active: true,
      'location.lat': { $ne: null },
      'location.lng': { $ne: null }
    };

    const gardens = await fetchGardensWithRating(db, query);
    let result = gardens.filter(hasValidLocation).map(g => formatGardenForMap(g));

    if (district) {
      const districtNorm = normalizeDistrictName(district);
      result = result.filter(g => g.district_normalized === districtNorm);
    }

    if (q) {
      const keyword = q.trim().toLowerCase();
      result = result.filter(g => {
        const haystack = [
          g.garden_name,
          g.description,
          g.address.subdistrict,
          g.address.district,
          ...(g.products || []).map(p => p.name)
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(keyword);
      });
    }

    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      if (!Number.isNaN(userLat) && !Number.isNaN(userLng)) {
        result = result
          .map(g => ({
            ...g,
            distance_km: haversineKm(userLat, userLng, g.location.lat, g.location.lng)
          }))
          .sort((a, b) => a.distance_km - b.distance_km);
      }
    }

    const max = parseInt(limit, 10);
    if (!Number.isNaN(max) && max > 0) {
      result = result.slice(0, max);
    }

    res.json({ gardens: result, total: result.length });
  } catch (err) {
    console.error('Map gardens error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลแผนที่' });
  }
});

router.get('/gardens/recommended', async (req, res) => {
  try {
    const db = await connectDB();
    const query = {
      is_active: true,
      'location.lat': { $ne: null },
      'location.lng': { $ne: null }
    };

    const gardens = await fetchGardensWithRating(db, query);

    const result = gardens
      .filter(hasValidLocation)
      .map(g => formatGardenForMap(g))
      .filter(g => g.average_rating >= 4.0)
      .sort((a, b) => b.average_rating - a.average_rating)
      .slice(0, 10);

    res.json({ gardens: result });
  } catch (err) {
    console.error('Recommended gardens error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงสวนแนะนำ' });
  }
});

router.get('/gardens/nearby', async (req, res) => {
  try {
    const { lat, lng, limit } = req.query;
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    if (Number.isNaN(userLat) || Number.isNaN(userLng)) {
      return res.status(400).json({ error: 'กรุณาระบุ lat และ lng' });
    }

    const db = await connectDB();
    const query = {
      is_active: true,
      'location.lat': { $ne: null },
      'location.lng': { $ne: null }
    };

    const gardens = await fetchGardensWithRating(db, query);
    const max = parseInt(limit, 10) || 15;

    const result = gardens
      .filter(hasValidLocation)
      .map(g => {
        const formatted = formatGardenForMap(g);
        return {
          ...formatted,
          distance_km: haversineKm(userLat, userLng, formatted.location.lat, formatted.location.lng)
        };
      })
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, max);

    res.json({ gardens: result, user_location: { lat: userLat, lng: userLng } });
  } catch (err) {
    console.error('Nearby gardens error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงสวนใกล้ฉัน' });
  }
});

module.exports = router;
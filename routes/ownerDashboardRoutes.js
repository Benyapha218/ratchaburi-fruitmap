const express = require('express');
const { ObjectId } = require('mongodb');
const connectDB = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware') || require('./authmiddleware');

const router = express.Router();

router.get('/dashboard-summary', authMiddleware, async (req, res) => {
  try {
    const { gardenId, year } = req.query;
    if (!ObjectId.isValid(gardenId)) {
      return res.status(400).json({ error: 'รหัสสวนไม่ถูกต้อง' });
    }

    const db = await connectDB();
    const targetGardenId = new ObjectId(gardenId);
    const targetYear = parseInt(year, 10) || new Date().getFullYear();

    const [pendingGardenBookings, pendingHomestayBookings] = await Promise.all([
      db.collection('garden_bookings').countDocuments({ garden_id: targetGardenId, status: 'รออนุมัติการจอง' }),
      db.collection('homestay_bookings').countDocuments({ garden_id: targetGardenId, status: 'รออนุมัติการจอง' })
    ]);
    const pendingCount = pendingGardenBookings + pendingHomestayBookings;

    const [reviewSummaryRow] = await db.collection('reviews').aggregate([
      { $match: { garden_id: targetGardenId } },
      { $group: { _id: null, reviewCount: { $sum: 1 }, avgScore: { $avg: '$rating' } } }
    ]).toArray();

    const reviewCount = reviewSummaryRow ? reviewSummaryRow.reviewCount : 0;
    const avgScore = reviewSummaryRow ? Number(reviewSummaryRow.avgScore.toFixed(1)) : 0.0;

    const startOfYear = new Date(Date.UTC(targetYear, 0, 1));
    const endOfYear = new Date(Date.UTC(targetYear + 1, 0, 1));

    const [gardenBookingsRows, homestayBookingsRows] = await Promise.all([
      db.collection('garden_bookings').find({
        garden_id: targetGardenId,
        status: 'อนุมัติแล้ว',
        created_at: { $gte: startOfYear, $lt: endOfYear }
      }).toArray(),
      db.collection('homestay_bookings').find({
        garden_id: targetGardenId,
        status: 'อนุมัติแล้ว',
        created_at: { $gte: startOfYear, $lt: endOfYear }
      }).toArray()
    ]);

    const monthlyBookings = Array(12).fill(0);
    [...gardenBookingsRows, ...homestayBookingsRows].forEach(b => {
      if (b.created_at) {
        const month = new Date(b.created_at).getUTCMonth(); // 0 - 11
        monthlyBookings[month] += 1;
      }
    });

    const reviewRows = await db.collection('reviews').aggregate([
      { 
        $match: { 
          garden_id: targetGardenId, 
          created_at: { $gte: startOfYear, $lt: endOfYear } 
        } 
      },
      { 
        $group: { 
          _id: { $month: '$created_at' }, 
          avgRating: { $avg: '$rating' } 
        } 
      }
    ]).toArray();

    const monthlyReviewsAvg = Array(12).fill(0);
    reviewRows.forEach(r => {
      const monthIndex = r._id - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        monthlyReviewsAvg[monthIndex] = Number(r.avgRating.toFixed(1));
      }
    });

    res.json({
      pendingCount,
      reviewCount,
      avgScore,
      monthlyBookings,
      monthlyReviewsAvg,
      year: targetYear
    });

  } catch (err) {
    console.error('Dashboard summary error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลแดชบอร์ด' });
  }
});

module.exports = router;
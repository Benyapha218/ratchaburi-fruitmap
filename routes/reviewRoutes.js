const express = require('express');
const { ObjectId } = require('mongodb');
const connectDB = require('../config/db');

const authMiddleware = require('../middleware/authMiddleware') || require('./authmiddleware');

const router = express.Router();

let indexReady = null;
function ensureIndexes(db) {
  if (!indexReady) {
    indexReady = Promise.all([
      db.collection('reviews').createIndex({ booking_id: 1 }, { unique: true }),
      db.collection('reviews').createIndex({ garden_id: 1, created_at: -1 })
    ]).catch(err => { indexReady = null; throw err; });
  }
  return indexReady;
}

async function findBooking(db, bookingId) {
  const map = [
    { name: 'homestay_bookings', type: 'homestay' },
    { name: 'garden_bookings', type: 'garden' }
  ];
  for (const { name, type } of map) {
    const booking = await db.collection(name).findOne({ _id: new ObjectId(bookingId) });
    if (booking) {
      const isHomestay = type === 'homestay' || (booking.roomType && booking.roomType !== '-');
      return { booking, booking_type: isHomestay ? 'homestay' : 'garden' };
    }
  }
  return { booking: null, booking_type: null };
}

async function getReviewSummary(db, gardenId) {
  const [row] = await db.collection('reviews').aggregate([
    { $match: { garden_id: new ObjectId(gardenId) } },
    { $group: { _id: null, reviewCount: { $sum: 1 }, avgScore: { $avg: '$rating' } } }
  ]).toArray();
  return {
    reviewCount: row ? row.reviewCount : 0,
    avgScore: row ? Number(row.avgScore.toFixed(1)) : 0
  };
}

async function getMonthlyAverage(db, gardenId, year) {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));
  const rows = await db.collection('reviews').aggregate([
    { $match: { garden_id: new ObjectId(gardenId), created_at: { $gte: start, $lt: end } } },
    { $group: { _id: { $month: '$created_at' }, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]).toArray();
  return Array.from({ length: 12 }, (_, i) => {
    const r = rows.find(x => x._id === i + 1);
    return { month: i + 1, avg: r ? Number(r.avg.toFixed(1)) : 0, count: r ? r.count : 0 };
  });
}

router.post('/reviews', authMiddleware, async (req, res) => {
  try {
    const { booking_id, comment } = req.body;
    const rating = Number(req.body.rating);

    if (!ObjectId.isValid(booking_id)) {
      return res.status(400).json({ error: 'รหัสการจองไม่ถูกต้อง' });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'กรุณาให้คะแนน 1-5 ดาว' });
    }

    const db = await connectDB();
    await ensureIndexes(db);

    const user = await db.collection('users').findOne(
      { _id: new ObjectId(req.user.userId || req.user.id) },
      { projection: { password_hash: 0 } }
    );
    if (!user) return res.status(404).json({ error: 'ไม่พบข้อมูลผู้ใช้' });

    const { booking, booking_type } = await findBooking(db, booking_id);
    if (!booking) return res.status(404).json({ error: 'ไม่พบรายการจอง' });

    if (!booking.email || booking.email !== user.email) {
      return res.status(403).json({ error: 'คุณไม่มีสิทธิ์รีวิวรายการจองนี้' });
    }
    if (booking.status !== 'อนุมัติแล้ว') {
      return res.status(400).json({ error: 'รีวิวได้เฉพาะรายการจองที่ได้รับอนุมัติแล้วเท่านั้น' });
    }
    if (!booking.garden_id) {
      return res.status(400).json({ error: 'รายการจองนี้ไม่มีข้อมูลสวน' });
    }

    const existingReview = await db.collection('reviews').findOne({ booking_id: booking._id });
    if (existingReview) {
      return res.status(409).json({ error: 'คุณรีวิวรายการจองนี้ไปแล้ว' });
    }

    const review = {
      garden_id: new ObjectId(booking.garden_id),
      booking_id: booking._id,
      booking_type,
      user_email: user.email,
      display_name: booking.display_name || user.display_name || user.name || 'ผู้ใช้งาน',
      rating,
      comment: String(comment || '').trim().slice(0, 500),
      created_at: new Date()
    };

    await db.collection('reviews').insertOne(review);
    res.status(201).json({ message: 'ขอบคุณสำหรับรีวิว' });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ error: 'คุณรีวิวรายการจองนี้ไปแล้ว' });
    }
    console.error('Create review error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกรีวิว' });
  }
});

router.get('/reviews/mine', authMiddleware, async (req, res) => {
  try {
    const db = await connectDB();
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(req.user.userId || req.user.id) },
      { projection: { email: 1 } }
    );
    if (!user) return res.status(404).json({ error: 'ไม่พบข้อมูลผู้ใช้' });

    const rows = await db.collection('reviews')
      .find({ user_email: user.email })
      .project({ booking_id: 1 })
      .toArray();
    res.json({ reviewedBookingIds: rows.map(r => String(r.booking_id)) });
  } catch (err) {
    console.error('Get my reviews error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

router.get('/reviews', async (req, res) => {
  try {
    const { garden_id } = req.query;
    if (!ObjectId.isValid(garden_id)) {
      return res.status(400).json({ error: 'รหัสสวนไม่ถูกต้อง' });
    }
    const db = await connectDB();
    const [reviews, summary] = await Promise.all([
      db.collection('reviews')
        .find({ garden_id: new ObjectId(garden_id) })
        .project({ display_name: 1, rating: 1, comment: 1, created_at: 1 })
        .sort({ created_at: -1 })
        .limit(50)
        .toArray(),
      getReviewSummary(db, garden_id)
    ]);
    res.json({ reviews, ...summary });
  } catch (err) {
    console.error('Get reviews error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

module.exports = router;
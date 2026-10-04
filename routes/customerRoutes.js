// routes/customerRoutes.js
const express = require('express');
const { ObjectId } = require('mongodb');
const connectDB = require('../config/db');
const { requireAuth } = require('./authmiddleware');
const router = express.Router();

router.get('/gardens', async (req, res) => {
  try {
    const db = await connectDB();
    const gardens = await db.collection('orchards')
      .find({ is_active: true })
      .project({
        garden_name: 1,
        images: 1,
        address: 1,
        location: 1,
        openStatus: 1,
        hasHomestay: 1
      })
      .toArray();

    res.json({ gardens });
  } catch (err) {
    console.error('Get gardens error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

router.get('/gardens/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'รหัสสวนไม่ถูกต้อง' });
    }

    const db = await connectDB();
    const garden = await db.collection('orchards').findOne({
      _id: new ObjectId(id),
      is_active: true
    });

    if (!garden) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลสวนนี้' });
    }

    const approvedHomestayBookings = await db.collection('homestay_bookings')
      .find({ garden_id: new ObjectId(id), status: 'อนุมัติแล้ว' })
      .project({ name: 1, date: 1, endTime: 1, count: 1 })
      .toArray();

    res.json({
      garden: {
        ...garden,
        approvedBookings: approvedHomestayBookings
      }
    });

  } catch (err) {
    console.error('Get garden detail error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

router.get('/users', requireAuth, async (req, res) => {
  try {
    const db = await connectDB();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne(
      { _id: new ObjectId(req.user.userId) },
      { projection: { password_hash: 0 } }
    );

    if (!user) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลผู้ใช้' });
    }

    res.json({ user });

  } catch (err) {
    console.error('Get customer profile error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

module.exports = router;
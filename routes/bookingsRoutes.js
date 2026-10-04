const express = require('express');
const { ObjectId } = require('mongodb');
const connectDB = require('../config/db');

const router = express.Router();

router.post('/bookings', async (req, res) => {
  try {
    const { display_name, email, garden_id, garden_name, date, startTime, endTime, count, phone, status } = req.body;

    const db = await connectDB();
    const bookingsCollection = db.collection('garden_bookings');

    const newBooking = {
      display_name: display_name || 'ไม่ระบุชื่อ',
      email: email || 'ไม่ระบุอีเมล',
      garden_id: garden_id ? new ObjectId(garden_id) : null,
      garden_name,
      date,
      startTime,
      endTime,
      count: parseInt(count, 10),
      phone,
      status: status || 'รออนุมัติการจอง',
      created_at: new Date()
    };

    const result = await bookingsCollection.insertOne(newBooking);
    res.status(201).json({ message: 'บันทึกการจองสำเร็จ', bookingId: result.insertedId });
  } catch (err) {
    console.error('Booking save error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
  }
});

router.get('/bookings', async (req, res) => {
  try {
    const { email } = req.query;
    const db = await connectDB();
    const bookingsCollection = db.collection('garden_bookings');

    const query = email ? { email: email } : {};
    const bookings = await bookingsCollection.find(query).sort({ created_at: -1 }).toArray();

    res.status(200).json(bookings);
  } catch (err) {
    console.error('Get bookings error:', err);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลการจองได้' });
  }
});

router.delete('/bookings/:id', async (req, res) => {
  try {
    const bookingId = req.params.id;

    const db = await connectDB();
    const bookingsCollection = db.collection('garden_bookings');

    const result = await bookingsCollection.deleteOne({ _id: new ObjectId(bookingId) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'ไม่พบรายการจองที่ต้องการยกเลิก' });
    }

    res.status(200).json({ message: 'ยกเลิกการจองสำเร็จ' });
  } catch (err) {
    console.error('Delete booking error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการยกเลิกการจอง' });
  }
});

router.patch('/bookings/:id/status', async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { status } = req.body;

    const db = await connectDB();
    const bookingsCollection = db.collection('garden_bookings');
    const orchardsCollection = db.collection('orchards');

    const booking = await bookingsCollection.findOne({ _id: new ObjectId(bookingId) });
    if (!booking) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลการจองนี้' });
    } 

    if (status === 'อนุมัติแล้ว' && booking.status !== 'อนุมัติแล้ว') {
      
      const updateResult = await orchardsCollection.updateOne(
        { 
          _id: new ObjectId(booking.garden_id),
          "booking_slots.date": booking.date,
          "booking_slots.startTime": booking.startTime 
        },
        { 
          $inc: { "booking_slots.$.capacity": -parseInt(booking.count, 10) } 
        }
      );

      console.log("Update capacity result:", updateResult);
    }

    const result = await bookingsCollection.updateOne(
      { _id: new ObjectId(bookingId) },
      { $set: { status: status } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลการจองนี้' });
    }

    res.status(200).json({ message: 'อัปเดตสถานะและตัดโควตาสำเร็จ' });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ' });
  }
});

module.exports = router;
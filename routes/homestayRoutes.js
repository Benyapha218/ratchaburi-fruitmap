const express = require('express');
const { ObjectId } = require('mongodb');
const connectDB = require('../config/db');

const router = express.Router();

async function findBookingAndCollection(db, bookingId) {
  const collections = ['homestay_bookings', 'garden_bookings'];
  for (const colName of collections) {
    const col = db.collection(colName);
    try {
      const booking = await col.findOne({ _id: new ObjectId(bookingId) });
      if (booking) {
        return { collection: col, booking };
      }
    } catch (e) {
    }
  }
  return { collection: null, booking: null };
}

function gardenClosedError(garden, date, checkOut) {
  const s = garden && garden.openStatus;
  if (!s || s.isOpen !== false) return null;

  const msg = 'สวนปิดทำการชั่วคราว' + (s.detail ? ` (${s.detail})` : '') + ' ไม่รับจองในช่วงวันที่เลือก';
  if (!s.closedFrom && !s.closedTo) return msg;

  let lastNight = date;
  if (checkOut && checkOut > date) {
    const d = new Date(checkOut);
    d.setDate(d.getDate() - 1);
    lastNight = d.toISOString().split('T')[0];
  }
  const overlaps = date <= (s.closedTo || '9999-12-31') && lastNight >= (s.closedFrom || '0000-01-01');
  return overlaps ? msg : null;
}

async function checkRoomAvailability(db, { garden_id, name, date, endTime, count, excludeId }) {
  if (!garden_id || !name || name === '-') return null;

  const garden = await db.collection('orchards').findOne({ _id: garden_id });
  const closedError = gardenClosedError(garden, date, String(endTime || '').replace('เช็คเอาท์: ', ''));
  if (closedError) return closedError;
  const room = ((garden && garden.homestays) || []).find(h => h.name === name);
  if (!room) return null;

  const totalRooms = parseInt(room.roomCount, 10) || 0;
  const stripOut = (v) => String(v || '').replace('เช็คเอาท์: ', '');
  const checkOut = stripOut(endTime);
  const wanted = parseInt(count, 10) || 0;
  const blocked = new Set(
    (Array.isArray(room.statusMatrix) ? room.statusMatrix : [])
      .filter(x => x.status === 'booked')
      .map(x => x.date)
  );

  const filter = { garden_id, name, status: 'อนุมัติแล้ว' };
  if (excludeId) filter._id = { $ne: excludeId };
  const [a, b] = await Promise.all([
    db.collection('homestay_bookings').find(filter).toArray(),
    db.collection('garden_bookings').find({ ...filter, roomType: { $exists: true, $ne: '-' } }).toArray()
  ]);
  const approved = [...a, ...b];

  for (let d = new Date(date); d < new Date(checkOut); d.setDate(d.getDate() + 1)) {
    const ds = d.toISOString().split('T')[0];
    if (blocked.has(ds)) {
      return `ห้องพักนี้ไม่ว่างในคืนวันที่ ${ds}`;
    }
    const used = approved
      .filter(x => ds >= x.date && ds < stripOut(x.endTime))
      .reduce((sum, x) => sum + (parseInt(x.count, 10) || 0), 0);
    if (used + wanted > totalRooms) {
      return `ห้องไม่พอในคืนวันที่ ${ds} (ว่าง ${Math.max(0, totalRooms - used)} ห้อง)`;
    }
  }
  return null;
}

router.post('/homestay', async (req, res) => {
  try {
    const { display_name, email, name, roomType, garden_id, garden_name, date, startTime, endTime, count, phone, status } = req.body;

    const db = await connectDB();
    const bookingsCollection = db.collection('homestay_bookings');

    const availabilityError = await checkRoomAvailability(db, {
      garden_id: garden_id ? new ObjectId(garden_id) : null,
      name,
      date,
      endTime,
      count
    });
    if (availabilityError) {
      return res.status(409).json({ error: availabilityError });
    }

    const newBooking = {
      display_name: display_name || 'ไม่ระบุชื่อ',
      email: email || 'ไม่ระบุอีเมล',
      garden_id: garden_id ? new ObjectId(garden_id) : null,
      name: name || '-',
      roomType: roomType || '-',
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

router.get('/homestay', async (req, res) => {
  try {
    const { email } = req.query;
    const db = await connectDB();
    
    const homestayCol = db.collection('homestay_bookings');
    const gardenCol = db.collection('garden_bookings');

    const query = email ? { email: email } : {};
    const homestayData = await homestayCol.find(query).toArray();
    const gardenData = await gardenCol.find({ ...query, roomType: { $exists: true,$ne: '-' } }).toArray();

    const allBookings = [...homestayData, ...gardenData].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.status(200).json(allBookings);
  } catch (err) {
    console.error('Get bookings error:', err);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลการจองได้' });
  }
});

router.delete('/homestay/:id', async (req, res) => {
  try {
    const bookingId = req.params.id;
    const db = await connectDB();
    
    const { collection } = await findBookingAndCollection(db, bookingId);
    if (!collection) {
      return res.status(404).json({ error: 'ไม่พบรายการจองที่ต้องการยกเลิก' });
    }

    await collection.deleteOne({ _id: new ObjectId(bookingId) });
    res.status(200).json({ message: 'ยกเลิกการจองสำเร็จ' });
  } catch (err) {
    console.error('Delete booking error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการยกเลิกการจอง' });
  }
});

router.patch('/homestay/:id/status', async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { status } = req.body;

    const db = await connectDB();
    
    const { collection, booking } = await findBookingAndCollection(db, bookingId);
    if (!booking || !collection) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลการจองนี้' });
    }

    if (status === 'อนุมัติแล้ว' && booking.roomType && booking.roomType !== '-') {
      const availabilityError = await checkRoomAvailability(db, {
        garden_id: booking.garden_id,
        name: booking.name,
        date: booking.date,
        endTime: booking.endTime,
        count: booking.count,
        excludeId: booking._id
      });
      if (availabilityError) {
        return res.status(409).json({ error: availabilityError });
      }
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(bookingId) },
      { $set: { status: status } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลการจองนี้' });
    }

    res.status(200).json({ message: 'อัปเดตสถานะ Homestay สำเร็จ' });
  } catch (err) {
    console.error('Update homestay status error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตสถานะ' });
  }
});

module.exports = router;
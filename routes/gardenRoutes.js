// -----#ส่วนนำเข้า -----
const express = require('express');
const router = express.Router(); 
const { ObjectId } = require('mongodb'); 
const connectDB = require('../config/db'); 
const upload = require('../middleware/upload'); 
const authMiddleware = require('../middleware/authMiddleware'); 
const { isGardenOwner, normalizeUserId } = require('../middleware/gardenOwnership'); 

async function findOwnedGarden(gardensCollection, gardenId, user) {
  if (!ObjectId.isValid(gardenId)) {
    return { error: { status: 400, message: 'รหัสสวนไม่ถูกต้อง' } };
  }

  const garden = await gardensCollection.findOne({
    _id: new ObjectId(gardenId),
    is_active: true
  });

  if (!garden) {
    return { error: { status: 404, message: 'ไม่พบข้อมูลสวนนี้' } };
  } 

  if (!isGardenOwner(garden, user)) {
    return { error: { status: 403, message: 'คุณไม่มีสิทธิ์เข้าถึงสวนนี้' } };
  }

  return { garden };
}

router.post('/gardens', authMiddleware, upload.fields([ 
  { name: 'images', maxCount: 10 }
]), async (req, res) => { 
  try {
    const {
      gardenName, description, phone, facebook, lineId,
      addressNo, moo, soi, road, subdistrict, district, province,
      lat, lng
    } = req.body;

    if (!gardenName) {
      return res.status(400).json({ error: 'กรุณากรอกชื่อสวน' });
    }

    const imageUrls = (req.files?.images || []).map(file => `/uploads/${file.filename}`);

    const db = await connectDB();
    const gardensCollection = db.collection('orchards');

    const newGarden = {
      garden_name: gardenName,
      description: description || '',
      contact: { phone: phone || '', facebook: facebook || '', line: lineId || '' },
      images: imageUrls,
      address: {
        address_no: addressNo || '', moo: moo || '', soi: soi || '', road: road || '',
        subdistrict: subdistrict || '', district: district || '', province: province || ''
      },
      location: { lat: lat ? parseFloat(lat) : null, lng: lng ? parseFloat(lng) : null },
      owner_email: req.user.email,
      owner_id: normalizeUserId(req.user.id),
      created_by_email: req.user.email,
      created_at: new Date(),
      is_active: true,
      standards: [],
      products: [],
      fruit_seasons: [],
      offline_markets: [],
      online_channels: [],
      workshops: [],
      booking_slots: [],
      homestays: []
    };

    const result = await gardensCollection.insertOne(newGarden);

    res.status(201).json({
      message: 'บันทึกข้อมูลสวนสำเร็จ',
      gardenId: result.insertedId,
      owner_email: req.user.email
    });
  } catch (err) {
    console.error('Create garden error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่' });
  }
});

router.get('/gardens', authMiddleware, async (req, res) => {
  try {
    const db = await connectDB(); 
    const gardensCollection = db.collection('orchards');

    const gardens = await gardensCollection 
      .find({ is_active: true, owner_email: req.user.email })
      .sort({ created_at: -1 })
      .toArray();

    const gardenIds = gardens.map(g => g._id);
    const approved = gardenIds.length
      ? await db.collection('homestay_bookings').find({
          garden_id: { $in: gardenIds },
          status: 'อนุมัติแล้ว'
        }).toArray()
      : [];
    gardens.forEach(g => {
      g.approvedBookings = approved.filter(b => String(b.garden_id) === String(g._id));
    });

    res.json({ gardens, owner_email: req.user.email });
  } catch (err) { 
    console.error('Get gardens error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่' });
  }
});

router.get('/gardens/:id', authMiddleware, async (req, res) => {
  try {
    const db = await connectDB();
    const gardensCollection = db.collection('orchards');

    const result = await findOwnedGarden(gardensCollection, req.params.id, req.user);
    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }

    const approvedHomestayBookings = await db.collection('homestay_bookings').find({
      garden_id: new ObjectId(req.params.id),
      status: 'อนุมัติแล้ว'
    }).toArray();

    res.json({ 
      garden: {
        ...result.garden,
        approvedBookings: approvedHomestayBookings
      } 
    });
  } catch (err) {
    console.error('Get garden error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่' });
  }
});

router.put('/gardens/:id', authMiddleware, upload.fields([
  { name: 'images', maxCount: 10 }
]), async (req, res) => {
  try {
    const db = await connectDB();
    const gardensCollection = db.collection('orchards');

    const result = await findOwnedGarden(gardensCollection, req.params.id, req.user);
    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }

    const {
      gardenName, description, phone, facebook, lineId,
      addressNo, moo, soi, road, subdistrict, district, province,
      lat, lng
    } = req.body;

    const updateFields = { updated_by_email: req.user.email, updated_at: new Date() };

    if (gardenName !== undefined) updateFields.garden_name = gardenName;
    if (description !== undefined) updateFields.description = description;
    if (phone !== undefined) updateFields['contact.phone'] = phone;
    if (facebook !== undefined) updateFields['contact.facebook'] = facebook;
    if (lineId !== undefined) updateFields['contact.line'] = lineId;
    if (addressNo !== undefined) updateFields['address.address_no'] = addressNo;
    if (moo !== undefined) updateFields['address.moo'] = moo;
    if (soi !== undefined) updateFields['address.soi'] = soi;
    if (road !== undefined) updateFields['address.road'] = road;
    if (subdistrict !== undefined) updateFields['address.subdistrict'] = subdistrict;
    if (district !== undefined) updateFields['address.district'] = district;
    if (province !== undefined) updateFields['address.province'] = province;
    if (lat !== undefined) updateFields['location.lat'] = lat ? parseFloat(lat) : null;
    if (lng !== undefined) updateFields['location.lng'] = lng ? parseFloat(lng) : null;

    let finalImages = [];

    if (req.body.existingImages) {
      finalImages = Array.isArray(req.body.existingImages) 
        ? req.body.existingImages 
        : [req.body.existingImages];
    }

    if (req.files?.images?.length > 0) {
      const newImagePaths = req.files.images.map(file => `/uploads/${file.filename}`);
      finalImages = finalImages.concat(newImagePaths);
    }

    if (req.body.existingImages !== undefined || req.files?.images?.length > 0) {
      updateFields.images = finalImages;
    }

    await gardensCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { 
        $set: updateFields,$unset: { 
          reg_num: "", 
          standard_detail: "", 
          certInputLogo: "", 
          certInput: "", 
          certificates: "" 
        }
      }
    );

    res.status(200).json({
      message: 'แก้ไขข้อมูลสวนสำเร็จ',
      gardenId: req.params.id,
      updated_by_email: req.user.email
    });
  } catch (err) {
    console.error('Update garden error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล กรุณาลองใหม่' });
  }
});

router.put('/gardens/:id/standards', authMiddleware, upload.any(), async (req, res) => {
  try {
    const db = await connectDB();
    const gardensCollection = db.collection('orchards');

    const result = await findOwnedGarden(gardensCollection, req.params.id, req.user);
    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }

    let standards, logoIndexes, certIndexes;
    try {
      standards = JSON.parse(req.body.standards || '[]');
      logoIndexes = JSON.parse(req.body.logoIndexes || '[]');
      certIndexes = JSON.parse(req.body.certIndexes || '[]');
    } catch (parseErr) {
      return res.status(400).json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' });
    }

    if (!Array.isArray(standards) || standards.length === 0) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลมาตรฐานอย่างน้อย 1 รายการ' });
    }

    const logoFiles = (req.files || []).filter(f => f.fieldname === 'standardLogos');
    logoFiles.forEach((file, i) => {
      const stdIdx = logoIndexes[i];
      if (standards[stdIdx]) {
        standards[stdIdx].logo_images = [`/uploads/${file.filename}`];
      }
    });

    const certFiles = (req.files || []).filter(f => f.fieldname === 'standardCerts');
    certFiles.forEach((file, i) => {
      const stdIdx = certIndexes[i];
      if (standards[stdIdx]) {
        standards[stdIdx].certificates = [`/uploads/${file.filename}`];
      }
    });

    const standardsWithMeta = standards.map(std => ({
      id: std.id || new ObjectId().toString(),
      reg_num: std.regNum || '',
      standard_detail: std.detail || '',
      logo_images: std.logo_images || (std.logo ? [std.logo] : []),
      certificates: std.certificates || (std.certificate ? [std.certificate] : []),
      updated_at: new Date()
    }));

    await gardensCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          standards: standardsWithMeta,
          updated_at: new Date()
        },
        $unset: {
          reg_num: "",
          standard_detail: "",
          certInputLogo: "",
          certInput: "",
          certificates: ""
        }
      }
    );

    res.json({
      message: 'บันทึกข้อมูลมาตรฐานสวนสำเร็จ',
      gardenId: req.params.id,
      count: standardsWithMeta.length
    });
  } catch (err) {
    console.error('Save standards error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลมาตรฐาน กรุณาลองใหม่' });
  }
});

router.delete('/gardens/:id', authMiddleware, async (req, res) => {
  try {
    const db = await connectDB();
    const gardensCollection = db.collection('orchards');

    const result = await findOwnedGarden(gardensCollection, req.params.id, req.user);
    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }

    await gardensCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { is_active: false, deleted_by_email: req.user.email, deleted_at: new Date() } }
    );

    res.json({ message: 'ลบข้อมูลสวนสำเร็จ', deleted_by_email: req.user.email });
  } catch (err) {
    console.error('Delete garden error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบข้อมูล กรุณาลองใหม่' });
  }
});

router.put('/gardens/:id/products', authMiddleware, upload.array('productImages', 20), async (req, res) => {
  try {
    const db = await connectDB();
    const gardensCollection = db.collection('orchards');

    const result = await findOwnedGarden(gardensCollection, req.params.id, req.user);
    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }

    let products, seasons, onlineChannels, offlineMarkets, productImageIndexes;

    try {
      products = JSON.parse(req.body.products || '[]');
      seasons = JSON.parse(req.body.seasons || '[]');
      onlineChannels = JSON.parse(req.body.onlineChannels || '[]');
      offlineMarkets = JSON.parse(req.body.offlineMarkets || '[]');
      productImageIndexes = JSON.parse(req.body.productImageIndexes || '[]');
    } catch (parseErr) {
      return res.status(400).json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' });
    }

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลผลไม้อย่างน้อย 1 รายการ' });
    }

    (req.files || []).forEach((file, i) => {
      const productIndex = productImageIndexes[i];
      if (products[productIndex]) {
        products[productIndex].image = `/uploads/${file.filename}`;
      }
    });

    const productsWithMeta = products.map(product => ({
      ...product,
      added_by_email: req.user.email,
      updated_at: new Date()
    }));

    const updateFields = {
      products: productsWithMeta,
      products_updated_by_email: req.user.email,
      products_updated_at: new Date(),
      updated_at: new Date()
    };

    if (Array.isArray(seasons)) {
      updateFields.fruit_seasons = seasons.map(season => ({
        ...season, added_by_email: req.user.email, updated_at: new Date()
      }));
    }
    if (Array.isArray(onlineChannels)) {
      updateFields.online_channels = onlineChannels;
    }
    if (Array.isArray(offlineMarkets)) {
      updateFields.offline_markets = offlineMarkets.map(market => ({
        ...market, added_by_email: req.user.email, updated_at: new Date()
      }));
    }

    await gardensCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { 
        $set: updateFields,$unset: { reg_num: "", standard_detail: "", certInputLogo: "", certInput: "", certificates: "" } 
      }
    );

    res.json({
      message: 'บันทึกข้อมูลผลไม้สำเร็จ',
      gardenId: req.params.id,
      saved_by_email: req.user.email,
      productCount: productsWithMeta.length
    });
  } catch (err) {
    console.error('Save products error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลผลไม้ กรุณาลองใหม่' });
  }
});

router.put('/gardens/:id/workshops', authMiddleware, upload.array('workshopImages', 20), async (req, res) => {
  try {
    const db = await connectDB();
    const gardensCollection = db.collection('orchards');

    const result = await findOwnedGarden(gardensCollection, req.params.id, req.user);
    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }

    let workshops, workshopImageIndexes;

    try {
      workshops = JSON.parse(req.body.workshops || '[]');
      workshopImageIndexes = JSON.parse(req.body.workshopImageIndexes || '[]');
    } catch (parseErr) {
      return res.status(400).json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' });
    }

    if (!Array.isArray(workshops) || workshops.length === 0) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูล Workshop/โปรโมชั่นอย่างน้อย 1 รายการ' });
    }

    (req.files || []).forEach((file, i) => {
      const workshopIndex = workshopImageIndexes[i];
      if (workshops[workshopIndex]) {
        workshops[workshopIndex].image = `/uploads/${file.filename}`;
      }
    });

    const workshopsWithMeta = workshops.map(workshop => ({
      ...workshop, added_by_email: req.user.email, updated_at: new Date()
    }));

    await gardensCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          workshops: workshopsWithMeta,
          workshops_updated_by_email: req.user.email,
          workshops_updated_at: new Date(),
          updated_at: new Date()
        },
        $unset: { reg_num: "", standard_detail: "", certInputLogo: "", certInput: "", certificates: "" }
      }
    );

    res.json({
      message: 'บันทึกข้อมูล Workshop/โปรโมชั่นสำเร็จ',
      gardenId: req.params.id,
      saved_by_email: req.user.email,
      workshopCount: workshopsWithMeta.length
    });
  } catch (err) {
    console.error('Save workshops error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล Workshop กรุณาลองใหม่' });
  }
});

router.put('/gardens/:id/bookings', authMiddleware, async (req, res) => {
  try {
    const db = await connectDB();
    const gardensCollection = db.collection('orchards');

    const result = await findOwnedGarden(gardensCollection, req.params.id, req.user);
    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }

    const { bookingSlots } = req.body;

    if (!Array.isArray(bookingSlots) || bookingSlots.length === 0) {
      return res.status(400).json({ error: 'กรุณาเพิ่มช่วงเวลารับคิวอย่างน้อย 1 รายการ' });
    }

    const bookingSlotsWithMeta = bookingSlots.map(slot => ({
      ...slot,
      capacity: Number(slot.capacity) || 0,
      added_by_email: req.user.email,
      updated_at: new Date()
    }));

    await gardensCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          booking_slots: bookingSlotsWithMeta,
          bookingOpen: true,
          bookings_updated_by_email: req.user.email,
          bookings_updated_at: new Date(),
          updated_at: new Date()
        },
        $unset: { reg_num: "", standard_detail: "", certInputLogo: "", certInput: "", certificates: "" }
      }
    );

    res.json({
      message: 'บันทึกข้อมูลการจองคิวเข้าชมสวนสำเร็จ',
      gardenId: req.params.id,
      saved_by_email: req.user.email,
      slotCount: bookingSlotsWithMeta.length
    });
  } catch (err) {
    console.error('Save bookings error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลการจอง กรุณาลองใหม่' });
  }
});

router.put('/gardens/:id/homestay', authMiddleware, upload.any(), async (req, res) => {
  try {
    const db = await connectDB();
    const gardensCollection = db.collection('orchards');

    const result = await findOwnedGarden(gardensCollection, req.params.id, req.user);
    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }

    let homestays;

    try {
      if (typeof req.body.homestays === 'string') {
        homestays = JSON.parse(req.body.homestays || '[]');
      } else {
        homestays = req.body.homestays || [];
      }
    } catch (parseErr) {
      return res.status(400).json({ error: 'รูปแบบข้อมูลไม่ถูกต้อง' });
    }

    if (!Array.isArray(homestays) || homestays.length === 0) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูล Homestay อย่างน้อย 1 รายการ' });
    }

    const existingGarden = result.garden;
    const oldHomestays = existingGarden.homestays || [];

      const homestaysWithMeta = homestays.map((h, idx) => {
      const oldItem = oldHomestays[idx] || {};
      
      return {
        ...oldItem,
        ...h,
        roomCount: Number(h.roomCount) || 1, // 👈 แปลงค่า roomCount เป็นตัวเลข Number แท้ๆ ตรงนี้
        statusMatrix: h.statusMatrix || oldItem.statusMatrix || [],
        availableDates: h.availableDates || oldItem.availableDates || [],
        added_by_email: req.user.email,
        updated_at: new Date()
      };
    });

    await gardensCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          homestays: homestaysWithMeta,
          hasHomestay: true,
          homestay_updated_by_email: req.user.email,
          homestay_updated_at: new Date(),
          updated_at: new Date()
        }
      }
    );

    res.json({
      message: 'บันทึกสถานะห้องพักสำเร็จ',
      gardenId: req.params.id,
      homestayCount: homestaysWithMeta.length
    });
  } catch (err) {
    console.error('Save homestay status error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่' });
  }
});

const OPEN_STATUS_REASONS = ['weather', 'no_harvest', 'maintenance', 'personal', 'other'];

router.put('/gardens/:id/open-status', authMiddleware, async (req, res) => {
  try {
    const db = await connectDB();
    const gardensCollection = db.collection('orchards');

    const result = await findOwnedGarden(gardensCollection, req.params.id, req.user);
    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }

    const { isOpen, reason, detail, closedFrom, closedTo } = req.body;

    if (typeof isOpen !== 'boolean') {
      return res.status(400).json({ error: 'ข้อมูลสถานะไม่ถูกต้อง' });
    }
    if (!isOpen && !OPEN_STATUS_REASONS.includes(reason)) {
      return res.status(400).json({ error: 'กรุณาเลือกเหตุผลที่สวนไม่เปิดทำการ' });
    }
    if (closedFrom && closedTo && closedFrom > closedTo) {
      return res.status(400).json({ error: 'วันที่เริ่มปิดต้องไม่เกินวันที่สิ้นสุด' });
    }

    const openStatus = {
      isOpen,
      reason: isOpen ? '' : reason,
      detail: isOpen ? '' : String(detail || '').slice(0, 500),
      closedFrom: isOpen ? '' : (closedFrom || ''),
      closedTo: isOpen ? '' : (closedTo || ''),
      updatedAt: new Date()
    };

    const gardenObjId = new ObjectId(req.params.id);

    await gardensCollection.updateOne(
      { _id: gardenObjId },
      { $set: { openStatus, updated_at: new Date(), open_status_updated_by_email: req.user.email } }
    );

    const issues = db.collection('garden_issues');
    if (!isOpen) {
      await issues.insertOne({
        garden_id: gardenObjId,
        garden_name: result.garden.garden_name,
        reason: openStatus.reason,
        detail: openStatus.detail,
        closedFrom: openStatus.closedFrom,
        closedTo: openStatus.closedTo,
        reported_by_email: req.user.email,
        resolved: false,
        created_at: new Date()
      });
    } else {
      await issues.updateMany(
        { garden_id: gardenObjId, resolved: false },
        { $set: { resolved: true, resolved_at: new Date() } }
      );
    }

    res.json({ message: 'บันทึกสถานะสวนสำเร็จ', openStatus });
  } catch (err) {
    console.error('Save open-status error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกสถานะสวน กรุณาลองใหม่' });
  }
});

module.exports = router;
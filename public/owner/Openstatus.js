const { ObjectId } = require('mongodb');
const connectDB = require('../config/db');

const VALID_REASONS = ['weather', 'no_harvest', 'maintenance', 'personal', 'other'];

router.put('/gardens/:id/open-status', authMiddleware, async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'รหัสสวนไม่ถูกต้อง' });
    }

    const { isOpen, reason, detail, closedFrom, closedTo } = req.body;

    if (typeof isOpen !== 'boolean') {
      return res.status(400).json({ error: 'ข้อมูลสถานะไม่ถูกต้อง' });
    }
    if (!isOpen && !VALID_REASONS.includes(reason)) {
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

    const db = await connectDB();
    const gardenId = new ObjectId(req.params.id);

    const result = await db.collection('gardens').updateOne(
      { _id: gardenId, owner_id: new ObjectId(req.user.userId) },
      { $set: { openStatus } }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'ไม่พบสวน หรือคุณไม่มีสิทธิ์แก้ไขสวนนี้' });
    }

    const issues = db.collection('garden_issues');
    if (!isOpen) {
      await issues.insertOne({
        garden_id: gardenId,
        reason: openStatus.reason,
        detail: openStatus.detail,
        closedFrom: openStatus.closedFrom,
        closedTo: openStatus.closedTo,
        resolved: false,
        created_at: new Date()
      });
    } else {
      await issues.updateMany({ garden_id: gardenId, resolved: false }, { $set: { resolved: true } });
    }

    res.json({ ok: true, openStatus });
  } catch (err) {
    console.error('Update open-status error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
  }
});


function isGardenClosed(garden, checkIn) {
  const s = garden && garden.openStatus;
  if (!s || s.isOpen !== false) return false;
  if (!s.closedFrom && !s.closedTo) return true;
  return (!s.closedFrom || checkIn >= s.closedFrom) &&
         (!s.closedTo || checkIn <= s.closedTo);
}

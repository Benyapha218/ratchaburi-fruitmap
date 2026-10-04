const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const connectDB = require('../config/db');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { displayName, email, password, role } = req.body;

    if (!displayName || !email || !password) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบทุกช่อง' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
    }

    const allowedRoles = ['owner', 'customer'];
    const userRole = allowedRoles.includes(role) ? role : 'owner';

    const db = await connectDB();
    const usersCollection = db.collection('users');

    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'อีเมลนี้ถูกใช้สมัครแล้ว' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await usersCollection.insertOne({
      display_name: displayName,
      email,
      password_hash,
      role: userRole,
      created_at: new Date(),
      is_active: true
    });

    res.status(201).json({
      message: 'สมัครสมาชิกสำเร็จ',
      userId: result.insertedId
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่' });
  }
});


router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' });
    }

    const db = await connectDB();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'เข้าสู่ระบบสำเร็จ',
      token,
      user: {
        displayName: user.display_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่' });
  }
});

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบ' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token ไม่ถูกต้องหรือหมดอายุ กรุณาเข้าสู่ระบบใหม่' });
  }
}

router.get('/users', authMiddleware, async (req, res) => {
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
    console.error('Get user profile error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

module.exports = router;
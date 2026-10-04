require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path'); // <-- จุดที่ 1: เพิ่ม path module ตรงนี้
const connectDB = require('./config/db');
const ownerRoutes = require('./routes/ownerRoutes');
const gardenRoutes = require('./routes/gardenRoutes');
const mapRoutes = require('./routes/mapRoutes');
const customerRoutes = require('./routes/customerRoutes');
const bookingsRoutes = require('./routes/bookingsRoutes');
const homestayRoutes = require('./routes/homestayRoutes');
const ownerDashboardRoutes = require('./routes/ownerDashboardRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// serve ไฟล์ frontend ทั้งหมดจากโฟลเดอร์ public
app.use(express.static('public'));

// เส้นทาง API สำหรับเจ้าของสวน
app.use('/api/owner', ownerRoutes);
app.use('/api/owner', gardenRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/owner', ownerDashboardRoutes);

// เส้นทาง API สำหรับลูกค้า
app.use('/api/customer', customerRoutes);
app.use('/api/customer', bookingsRoutes);
app.use('/api/customer', homestayRoutes);
app.use('/api/customer', reviewRoutes);

// ==========================================
// <-- จุดที่ 2: เพิ่ม Route สำหรับเปิดหน้า HTML ตรงนี้
// ==========================================

// หน้าแรกเริ่มต้น (/) -> ให้ชี้ไปที่หน้าหลักของนักท่องเที่ยว/ลูกค้า
// (เปลี่ยนชื่อไฟล์ 'index.html' ให้ตรงกับชื่อไฟล์ HTML หน้าแรกที่คุณมีในโฟลเดอร์ public)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ทางเข้าหน้าฝั่งเจ้าของสวน (/owner)
// (เปลี่ยนชื่อไฟล์ 'owner-login.html' หรือ 'login.html' ให้ตรงกับไฟล์ที่มีใน public)
app.get('/owner', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ทางเข้าหน้าฝั่งลูกค้าโดยตรง (/customer) (ถ้ามี)
app.get('/customer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'customer.html'));
});

// ==========================================

// เชื่อมต่อ MongoDB แล้วค่อยเปิด server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server กำลังรันที่ http://127.0.0.1:${PORT}`);
  });
});
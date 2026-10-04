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

// 1. หน้าแรกของเว็บไซต์ (/) -> ชี้ไปที่หน้าหลักของลูกค้า (home.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'customer', 'home.html'));
});

// 2. หน้าฝั่งลูกค้า (/customer) -> ชี้ไปที่ home.html เช่นกัน
app.get('/customer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'customer', 'home.html'));
});

// 3. หน้าฝั่งเจ้าของสวน (/owner) -> ชี้ไปที่หน้า index.html ของฝั่ง owner
app.get('/owner', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'owner', 'index.html'));
});

// ==========================================

// เชื่อมต่อ MongoDB แล้วค่อยเปิด server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server กำลังรันที่ http://127.0.0.1:${PORT}`);
  });
});
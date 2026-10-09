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

app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'public', 'customer')));
app.use(express.static(path.join(__dirname, 'public', 'owner')));

app.use('/api/owner', ownerRoutes);
app.use('/api/owner', gardenRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/owner', ownerDashboardRoutes);

app.use('/api/customer', customerRoutes);
app.use('/api/customer', bookingsRoutes);
app.use('/api/customer', homestayRoutes);
app.use('/api/customer', reviewRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'customer', 'home.html'));
});

app.get('/customer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'customer', 'home.html'));
});

app.get('/owner', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'owner', 'index.html'));
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server กำลังรันที่ http://127.0.0.1:${PORT}`);
  });
});
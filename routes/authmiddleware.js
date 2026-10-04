const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization; 

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded; 
    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({ error: 'Token ไม่ถูกต้องหรือหมดอายุ กรุณาเข้าสู่ระบบใหม่' });
  }
}

module.exports = { requireAuth }; 
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = {
      id: decoded.userId || decoded.id || decoded._id,
      email: decoded.email,
      role: decoded.role
    };

    if (!req.user.email) {
      return res.status(401).json({ error: 'Token ไม่มีข้อมูลอีเมล กรุณาเข้าสู่ระบบใหม่' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token ไม่ถูกต้องหรือหมดอายุ กรุณาเข้าสู่ระบบใหม่' });
  }
}

module.exports = authMiddleware;

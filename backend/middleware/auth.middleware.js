const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
    // Lấy token từ header Authorization (Bearer Token)
    let token = req.headers['authorization'];

    if (!token) {
        return res.status(403).json({ message: 'Không có token cung cấp! Vui lòng đăng nhập.' });
    }

    if (token.startsWith('Bearer ')) {
        token = token.slice(7, token.length); // Bỏ chữ "Bearer "
    }

    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key', (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Lỗi xác thực (Token hết hạn hoặc không hợp lệ)!' });
        }
        
        // Lưu thông tin user (đã được lưu trong token lúc sign in auth.controller)
        req.userId = decoded.id;
        req.userEmail = decoded.email;
        req.userRole = decoded.role;
        
        next();
    });
};

exports.isAdmin = (req, res, next) => {
    // Yêu cầu phải chạy verifyToken trước middlewares này
    if (req.userRole !== 'admin') {
        return res.status(403).json({ message: 'Yêu cầu quyền Quản trị viên (Admin)!' });
    }
    next();
};

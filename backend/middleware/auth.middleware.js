const jwt = require('jsonwebtoken');

const getTokenFromHeader = (authorizationHeader) => {
    let token = String(authorizationHeader || '').trim();
    if (!token) {
        return '';
    }

    if (token.startsWith('Bearer ')) {
        token = token.slice(7, token.length);
    }

    return token.trim();
};

const applyDecodedUser = (req, decoded = {}) => {
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;
};

exports.verifyToken = (req, res, next) => {
    // Lấy token từ header Authorization (Bearer Token)
    const token = getTokenFromHeader(req.headers['authorization']);

    if (!token) {
        return res.status(403).json({ message: 'Không có token cung cấp! Vui lòng đăng nhập.' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key', (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Lỗi xác thực (Token hết hạn hoặc không hợp lệ)!' });
        }
        
        // Lưu thông tin user (đã được lưu trong token lúc sign in auth.controller)
        applyDecodedUser(req, decoded);
        
        next();
    });
};

exports.optionalVerifyToken = (req, res, next) => {
    const token = getTokenFromHeader(req.headers['authorization']);

    if (!token) {
        return next();
    }

    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key', (err, decoded) => {
        if (!err && decoded) {
            applyDecodedUser(req, decoded);
        }

        return next();
    });
};

exports.isAdmin = (req, res, next) => {
    // Yêu cầu phải chạy verifyToken trước middlewares này
    if (req.userRole !== 'admin') {
        return res.status(403).json({ message: 'Yêu cầu quyền Quản trị viên (Admin)!' });
    }
    next();
};

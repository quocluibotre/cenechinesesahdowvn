const express = require('express');
const { login, register, getMe } = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const router = express.Router();

// Tương đương với file test_login.php
router.post('/login', login);

// Tương đương với file register.php
router.post('/register', register);

router.get('/me', verifyToken, getMe);

// Có thể thêm middleware bảo vệ tại đây nếu cần (từ auth.middleware.js)
// Ví dụ: router.get('/me', verifyToken, getUserProfile);

module.exports = router;

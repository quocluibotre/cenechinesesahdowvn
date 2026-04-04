const express = require('express');
const { getDashboardStats } = require('../controllers/admin.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/stats', verifyToken, isAdmin, getDashboardStats);

module.exports = router;

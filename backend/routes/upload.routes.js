const express = require('express');
const { presignUpload } = require('../controllers/upload.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/presign', verifyToken, isAdmin, presignUpload);

module.exports = router;

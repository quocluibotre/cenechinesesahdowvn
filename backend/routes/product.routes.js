const express = require('express');
const { getVideos, getVideoById, deleteVideo, uploadVideo, updateVideo } = require('../controllers/product.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');
const router = express.Router();

// Lấy danh sách video (tương ứng get_videos.php cũ)
router.get('/', getVideos);

// Lấy thông tin chi tiết video (tương ứng get_video.php cũ)
router.get('/:id', getVideoById);

// Xóa video (tương ứng delete_video.php)
router.delete('/:id', verifyToken, isAdmin, deleteVideo);

// Thêm mới/upload video metadata (tương ứng upload_video.php)
router.post('/upload', verifyToken, isAdmin, uploadVideo);

// Cập nhật video metadata (tương ứng update_video.php)
router.put('/:id', verifyToken, isAdmin, updateVideo);

module.exports = router;

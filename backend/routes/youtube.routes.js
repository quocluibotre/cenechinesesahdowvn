const express = require('express');
const router = express.Router();
const youtubeController = require('../controllers/youtube.controller');

// Nguồn lấy url video -> parse qua Data API v3 -> Lưu vào MySQL/Postgres
router.post('/process', youtubeController.processVideoUrl);

// Nguồn cho frontend truyền id -> Cào caption -> LLM dịch -> Sql insert
router.post('/subtitles/translate', youtubeController.extractAndTranslateSubtitles);

// Re-translate chỉ các phụ đề còn "Chưa dịch" trong DB
router.post('/subtitles/retranslate', youtubeController.retranslateSubtitles);

// Lấy phụ đề từ DB theo video_id (cho Player)
router.get('/subtitles/:videoId', youtubeController.getSubtitlesByVideoId);

// DEBUG: Test lấy transcript thô (xóa sau khi debug xong)
router.get('/debug/transcript/:youtubeId', youtubeController.debugTranscript);


module.exports = router;

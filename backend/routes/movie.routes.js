const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movie.controller');

// One-shot: fetch OMDb + luu DB + import subtitle
router.post('/auto-import', movieController.autoImportMovie);

// Lưu phim IMDB vào DB (video_url = "imdb:tt...")
router.post('/process', movieController.processImdbMovie);

// Tìm danh sách phụ đề từ OpenSubtitles (preview trước khi tải)
router.get('/search-subtitles', movieController.searchSubtitleCandidates);

// Tải phụ đề EN tốt nhất từ OpenSubtitles và lưu vào DB
router.post('/subtitles/import', movieController.fetchAndImportSubtitles);

// Lấy phụ đề của phim theo video_id (cho Player)
router.get('/subtitles/:videoId', movieController.getMovieSubtitles);

module.exports = router;

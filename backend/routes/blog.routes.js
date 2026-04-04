const express = require('express');
const {
	getVocabulary,
	getSavedWords,
	saveWord,
	removeSavedWord,
	getVideoSlang,
	getWordPronunciation,
	generateVocabulary,
} = require('../controllers/blog.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');
const router = express.Router();

router.get('/vocabulary', getVocabulary);                 // GET /api/blog/vocabulary?video_id=1
router.post('/vocabulary/generate', verifyToken, isAdmin, generateVocabulary);  // POST /api/blog/vocabulary/generate

router.get('/slang', getVideoSlang);                      // GET /api/blog/slang?video_id=1
router.get('/tts', getWordPronunciation);                 // GET /api/blog/tts?word=你好

router.get('/saved_words', verifyToken, getSavedWords);   // GET /api/blog/saved_words
router.post('/saved_words', verifyToken, saveWord);       // POST /api/blog/saved_words
router.delete('/saved_words/:id', verifyToken, removeSavedWord);

module.exports = router;

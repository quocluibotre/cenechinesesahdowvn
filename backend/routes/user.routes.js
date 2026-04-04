const express = require('express');
const {
	getUsers,
	getUserById,
	updateUser,
	deleteUser,
	getMyStats,
	getUserProgress,
	saveUserProgress,
} = require('../controllers/user.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/stats/me', verifyToken, getMyStats);
router.get('/progress', verifyToken, getUserProgress);
router.post('/progress', verifyToken, saveUserProgress);

router.get('/', verifyToken, isAdmin, getUsers);
router.get('/:id', verifyToken, isAdmin, getUserById);
router.put('/:id', verifyToken, isAdmin, updateUser);
router.delete('/:id', verifyToken, isAdmin, deleteUser);

module.exports = router;
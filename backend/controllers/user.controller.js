const db = require('../config/db.config');

const formatDuration = (seconds) => {
    const safe = Math.max(0, Number(seconds || 0));
    const mins = Math.floor(safe / 60);
    const secs = Math.floor(safe % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
};

exports.getUsers = async (req, res) => {
    try {
        const { search = '', role = '', status = '', page = 1, limit = 20 } = req.query;
        const safePage = Math.max(1, Number(page) || 1);
        const safeLimit = Math.max(1, Math.min(50, Number(limit) || 20));
        const offset = (safePage - 1) * safeLimit;

        let whereClause = 'WHERE 1=1';
        const whereParams = [];

        if (search) {
            whereClause += ' AND (u.username LIKE ? OR u.email LIKE ? OR u.full_name LIKE ?)';
            whereParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (role === 'admin' || role === 'user') {
            whereClause += ' AND u.role = ?';
            whereParams.push(role);
        }

        if (status === 'active') {
            whereClause += ' AND u.is_active = 1';
        } else if (status === 'inactive') {
            whereClause += ' AND u.is_active = 0';
        } else if (status !== '') {
            whereClause += ' AND u.is_active = ?';
            whereParams.push(Number(status) ? 1 : 0);
        }

        const dataQuery = `
            SELECT
                u.id, u.username, u.email, u.full_name, u.avatar_url,
                u.role, u.hsk_level, u.created_at, u.last_login, u.is_active,
                u.email_verified,
                COALESCE(up.videos_watched, 0) AS videos_watched,
                COALESCE(up.total_watch_seconds, 0) AS total_watch_seconds
            FROM users u
            LEFT JOIN (
                SELECT user_id, COUNT(*) AS videos_watched, COALESCE(SUM(watched_seconds), 0) AS total_watch_seconds
                FROM user_progress
                GROUP BY user_id
            ) up ON up.user_id = u.id
            ${whereClause}
            ORDER BY u.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const [rows] = await db.promise().query(dataQuery, [...whereParams, safeLimit, offset]);

        const countQuery = `SELECT COUNT(*) AS total FROM users u ${whereClause}`;
        const [[{ total = 0 }]] = await db.promise().query(countQuery, whereParams);

        const totalPages = Math.ceil(Number(total) / safeLimit);

        res.status(200).json({
            success: true,
            data: rows,
            total: Number(total),
            page: safePage,
            limit: safeLimit,
            totalPages,
            pagination: {
                total: Number(total),
                page: safePage,
                limit: safeLimit,
                total_pages: totalPages,
            },
        });
    } catch (error) {
        console.error('Error getUsers:', error);
        res.status(500).json({ success: false, error: 'Loi server' });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT u.id, u.username, u.email, u.full_name, u.avatar_url, u.role,
                   u.hsk_level, u.created_at, u.last_login, u.is_active, u.email_verified,
                   (SELECT COUNT(*) FROM user_progress WHERE user_id = u.id) AS videos_watched,
                   (SELECT COALESCE(SUM(watched_seconds), 0) FROM user_progress WHERE user_id = u.id) AS total_watch_seconds
            FROM users u
            WHERE u.id = ?
        `;

        const [rows] = await db.promise().query(query, [id]);
        if (!rows.length) {
            return res.status(404).json({ success: false, error: 'Khong tim thay nguoi dung' });
        }

        res.status(200).json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error getUserById:', error);
        res.status(500).json({ success: false, error: 'Loi server' });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, is_active, hsk_level, full_name } = req.body;

        const query = `
            UPDATE users
            SET role = COALESCE(?, role),
                is_active = COALESCE(?, is_active),
                hsk_level = COALESCE(?, hsk_level),
                full_name = COALESCE(?, full_name)
            WHERE id = ?
        `;

        const params = [
            role || null,
            is_active === undefined ? null : (is_active ? 1 : 0),
            hsk_level || null,
            full_name || null,
            id,
        ];

        const [result] = await db.promise().query(query, params);
        if (!result.affectedRows) {
            return res.status(404).json({ success: false, error: 'User khong ton tai' });
        }

        res.status(200).json({ success: true, message: 'Cap nhat nguoi dung thanh cong' });
    } catch (error) {
        console.error('Error updateUser:', error);
        res.status(500).json({ success: false, error: 'Loi server' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const [users] = await db.promise().query('SELECT id, role FROM users WHERE id = ? LIMIT 1', [id]);
        if (!users.length) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (users[0].role === 'admin') {
            const [[{ totalAdmins = 0 }]] = await db.promise().query("SELECT COUNT(*) AS totalAdmins FROM users WHERE role = 'admin'");
            if (Number(totalAdmins) <= 1) {
                return res.status(400).json({ success: false, error: 'Cannot delete the last admin' });
            }
        }

        await db.promise().query('DELETE FROM user_progress WHERE user_id = ?', [id]);
        await db.promise().query('DELETE FROM user_saved_words WHERE user_id = ?', [id]);
        await db.promise().query('DELETE FROM user_sessions WHERE user_id = ?', [id]);
        await db.promise().query('DELETE FROM users WHERE id = ?', [id]);

        res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleteUser:', error);
        res.status(500).json({ success: false, error: 'Loi server' });
    }
};

exports.getMyStats = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        const [users] = await db.promise().query(
            'SELECT id, username, full_name, avatar_url, hsk_level FROM users WHERE id = ? LIMIT 1',
            [userId]
        );

        if (!users.length) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const [[{ videosWatched = 0 }]] = await db.promise().query(
            'SELECT COUNT(*) AS videosWatched FROM user_progress WHERE user_id = ? AND watched_seconds > 0',
            [userId]
        );

        const [[{ savedWords = 0 }]] = await db.promise().query(
            'SELECT COUNT(*) AS savedWords FROM user_saved_words WHERE user_id = ?',
            [userId]
        );

        const [rows] = await db.promise().query(
            `
            SELECT DISTINCT DATE(last_watched_at) AS watched_date
            FROM user_progress
            WHERE user_id = ? AND last_watched_at IS NOT NULL
            ORDER BY watched_date DESC
            LIMIT 60
            `,
            [userId]
        );

        let streak = 0;
        const expected = new Date();
        expected.setHours(0, 0, 0, 0);

        for (const row of rows) {
            const day = new Date(row.watched_date);
            day.setHours(0, 0, 0, 0);
            if (day.getTime() === expected.getTime()) {
                streak += 1;
                expected.setDate(expected.getDate() - 1);
            } else {
                break;
            }
        }

        res.status(200).json({
            success: true,
            data: {
                user: users[0],
                videos_watched: Number(videosWatched),
                saved_words: Number(savedWords),
                streak,
            },
        });
    } catch (error) {
        console.error('Error getMyStats:', error);
        res.status(500).json({ success: false, error: 'Loi server' });
    }
};

exports.getUserProgress = async (req, res) => {
    try {
        const userId = req.userId;
        const { video_id } = req.query;

        if (!userId) {
            return res.status(200).json({ success: true, data: [], message: 'User not logged in' });
        }

        if (video_id) {
            const [rows] = await db.promise().query(
                `
                SELECT
                    up.id AS progress_id,
                    up.video_id,
                    up.watched_seconds,
                    up.last_position,
                    up.watch_percentage,
                    up.is_completed,
                    up.last_watched_at
                FROM user_progress up
                WHERE up.user_id = ? AND up.video_id = ?
                `,
                [userId, Number(video_id)]
            );

            return res.status(200).json({ success: true, data: rows });
        }

        const [rows] = await db.promise().query(
            `
            SELECT
                up.id AS progress_id,
                up.video_id,
                up.watched_seconds,
                up.last_position,
                up.watch_percentage,
                up.is_completed,
                up.last_watched_at,
                v.title,
                v.title_cn,
                v.thumbnail_url,
                v.video_url,
                v.duration,
                v.hsk_level
            FROM user_progress up
            JOIN videos v ON up.video_id = v.id
            WHERE up.user_id = ?
              AND up.watch_percentage > 0
              AND up.watch_percentage < 100
              AND up.is_completed = 0
            ORDER BY up.last_watched_at DESC
            LIMIT 10
            `,
            [userId]
        );

        const data = rows.map((item) => {
            const remainingSeconds = Math.max(0, Number(item.duration || 0) - Number(item.watched_seconds || 0));
            return {
                ...item,
                remaining_seconds: remainingSeconds,
                remaining_formatted: formatDuration(remainingSeconds),
                watched_formatted: formatDuration(Number(item.watched_seconds || 0)),
            };
        });

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error getUserProgress:', error);
        res.status(500).json({ success: false, error: 'Loi server' });
    }
};

exports.saveUserProgress = async (req, res) => {
    try {
        const userId = req.userId;
        const {
            video_id,
            watched_seconds = 0,
            last_position = 0,
            duration = 0,
            is_completed = false,
        } = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, error: 'User not authenticated' });
        }

        if (!video_id) {
            return res.status(400).json({ success: false, error: 'video_id is required' });
        }

        let watchPercentage = 0;
        if (Number(duration) > 0) {
            watchPercentage = Math.min(100, Math.round((Number(watched_seconds) / Number(duration)) * 10000) / 100);
        }

        let completed = Boolean(is_completed);
        if (watchPercentage >= 90) {
            completed = true;
            watchPercentage = 100;
        }

        const [existingRows] = await db.promise().query(
            'SELECT id FROM user_progress WHERE user_id = ? AND video_id = ? LIMIT 1',
            [userId, Number(video_id)]
        );

        if (existingRows.length) {
            await db.promise().query(
                `
                UPDATE user_progress
                SET watched_seconds = ?,
                    last_position = ?,
                    watch_percentage = ?,
                    is_completed = ?,
                    completed_at = ?,
                    last_watched_at = NOW()
                WHERE user_id = ? AND video_id = ?
                `,
                [
                    Number(watched_seconds),
                    Number(last_position),
                    watchPercentage,
                    completed ? 1 : 0,
                    completed ? new Date() : null,
                    userId,
                    Number(video_id),
                ]
            );
        } else {
            await db.promise().query(
                `
                INSERT INTO user_progress
                    (user_id, video_id, watched_seconds, last_position, watch_percentage, is_completed, completed_at, first_watched_at, last_watched_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                `,
                [
                    userId,
                    Number(video_id),
                    Number(watched_seconds),
                    Number(last_position),
                    watchPercentage,
                    completed ? 1 : 0,
                    completed ? new Date() : null,
                ]
            );
        }

        await db.promise().query('UPDATE videos SET view_count = view_count + 1 WHERE id = ?', [Number(video_id)]);

        res.status(200).json({
            success: true,
            data: {
                watch_percentage: watchPercentage,
                is_completed: completed,
            },
        });
    } catch (error) {
        console.error('Error saveUserProgress:', error);
        res.status(500).json({ success: false, error: 'Loi server' });
    }
};
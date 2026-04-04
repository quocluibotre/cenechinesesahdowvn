const db = require('../config/db.config');

exports.getDashboardStats = async (req, res) => {
    try {
        const [[{ totalVideos = 0 }]] = await db.promise().query('SELECT COUNT(*) AS totalVideos FROM videos');
        const [[{ publishedVideos = 0 }]] = await db.promise().query('SELECT COUNT(*) AS publishedVideos FROM videos WHERE is_published = 1');
        const [[{ videosThisWeek = 0 }]] = await db.promise().query('SELECT COUNT(*) AS videosThisWeek FROM videos WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)');

        const [[{ totalUsers = 0 }]] = await db.promise().query('SELECT COUNT(*) AS totalUsers FROM users');
        const [[{ usersToday = 0 }]] = await db.promise().query('SELECT COUNT(*) AS usersToday FROM users WHERE DATE(created_at) = CURDATE()');

        const [[{ totalViews = 0 }]] = await db.promise().query('SELECT COALESCE(SUM(view_count), 0) AS totalViews FROM videos');
        const [[{ totalWatchSeconds = 0 }]] = await db.promise().query('SELECT COALESCE(SUM(watched_seconds), 0) AS totalWatchSeconds FROM user_progress');

        const [recentVideos] = await db.promise().query(`
            SELECT v.id, v.title, v.hsk_level, v.is_published, v.thumbnail_url, v.created_at,
                   c.name AS category_name
            FROM videos v
            LEFT JOIN categories c ON v.category_id = c.id
            ORDER BY v.created_at DESC
            LIMIT 5
        `);

        const [recentUsers] = await db.promise().query(`
            SELECT id, username, full_name, avatar_url, email, role, created_at, last_login, is_active
            FROM users
            ORDER BY created_at DESC
            LIMIT 5
        `);

        const data = {
            total_videos: Number(totalVideos),
            published_videos: Number(publishedVideos),
            videos_this_week: Number(videosThisWeek),
            total_users: Number(totalUsers),
            users_today: Number(usersToday),
            total_views: Number(totalViews),
            total_watch_hours: Math.round(Number(totalWatchSeconds) / 3600),
            recent_videos: recentVideos.map((v) => ({
                ...v,
                status: Number(v.is_published) === 1 ? 'published' : 'draft',
            })),
            recent_users: recentUsers,
        };

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error getDashboardStats:', error);
        res.status(500).json({ success: false, error: 'Loi server' });
    }
};

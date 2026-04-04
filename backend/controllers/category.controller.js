const db = require('../config/db.config');

exports.getCategories = async (req, res) => {
    try {
        const query = `
            SELECT c.id, c.name, c.slug, c.icon, c.description, c.sort_order,
                   COUNT(v.id) AS video_count
            FROM categories c
            LEFT JOIN videos v ON c.id = v.category_id AND v.is_published = 1
            GROUP BY c.id
            ORDER BY c.sort_order ASC
        `;

        const [rows] = await db.promise().query(query);

        const data = rows.map((cat) => ({
            ...cat,
            id: Number(cat.id),
            sort_order: Number(cat.sort_order || 0),
            video_count: Number(cat.video_count || 0),
        }));

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error getCategories:', error);
        res.status(500).json({ success: false, error: 'Loi server' });
    }
};

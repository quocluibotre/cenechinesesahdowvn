const db = require('../config/db.config');

const DEFAULT_CATEGORIES = [
    {
        name: 'Giao tiep co ban',
        slug: 'giao-tiep-co-ban',
        description: 'Mau cau giao tiep hang ngay',
        icon: 'chat',
    },
    {
        name: 'Tinh huong cong viec',
        slug: 'tinh-huong-cong-viec',
        description: 'Tieng Trung dung trong moi truong lam viec',
        icon: 'work',
    },
    {
        name: 'Du lich va di chuyen',
        slug: 'du-lich-va-di-chuyen',
        description: 'Mau cau can thiet khi di du lich',
        icon: 'flight',
    },
    {
        name: 'Hoc theo HSK',
        slug: 'hoc-theo-hsk',
        description: 'Noi dung theo cap do HSK 1-6',
        icon: 'school',
    },
    {
        name: 'Van hoa va giai tri',
        slug: 'van-hoa-va-giai-tri',
        description: 'Chu de van hoa, phim anh, giai tri',
        icon: 'theaters',
    },
];

const isDuplicateCategoryError = (error) => {
    const code = String(error?.code || '').trim();
    return code === '23505' || code === 'ER_DUP_ENTRY';
};

const ensureDefaultCategories = async () => {
    const [countRows] = await db.promise().query('SELECT COUNT(*) AS total FROM categories');
    const total = Number(countRows?.[0]?.total || 0);

    if (total > 0) {
        return;
    }

    const values = DEFAULT_CATEGORIES.map((item, index) => [
        item.name,
        item.slug,
        item.description,
        item.icon,
        index + 1,
    ]);

    try {
        await db.promise().query(
            'INSERT INTO categories (name, slug, description, icon, sort_order) VALUES ?',
            [values]
        );
    } catch (error) {
        if (!isDuplicateCategoryError(error)) {
            throw error;
        }
    }
};

exports.getCategories = async (req, res) => {
    try {
        await ensureDefaultCategories();

        const query = `
            SELECT c.id, c.name, c.slug, c.icon, c.description, c.sort_order,
                   COUNT(v.id) AS video_count
            FROM categories c
            LEFT JOIN videos v ON c.id = v.category_id AND v.is_published = 1
            GROUP BY c.id, c.name, c.slug, c.icon, c.description, c.sort_order
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

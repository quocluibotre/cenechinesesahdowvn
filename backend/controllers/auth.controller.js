const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const db = require('../config/db.config');

const generateUniqueUsername = async (base) => {
    const normalized = (base || 'user')
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 45) || 'user';

    let username = normalized;
    let counter = 1;

    while (true) {
        const [rows] = await db.promise().query('SELECT id FROM users WHERE username = ? LIMIT 1', [username]);
        if (!rows.length) {
            return username;
        }
        username = `${normalized}_${counter}`;
        counter += 1;
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Vui long cung cap email hoac username va mat khau.' });
        }

        const account = String(email).trim();
        const [users] = await db.promise().query(
            `
            SELECT id, username, full_name, email, avatar_url, role, hsk_level, password_hash
            FROM users
            WHERE (email = ? OR username = ?) AND is_active = 1
            LIMIT 1
            `,
            [account, account]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'Tai khoan khong ton tai hoac da bi vo hieu hoa.' });
        }

        const user = users[0];
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Mat khau khong chinh xac.' });
        }

        await db.promise().query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'fallback_secret_key',
            { expiresIn: '1d' }
        );

        const userPayload = {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            email: user.email,
            avatar_url: user.avatar_url,
            role: user.role,
            hsk_level: user.hsk_level,
        };

        res.status(200).json({
            success: true,
            message: 'Dang nhap thanh cong!',
            token,
            user: userPayload,
            data: {
                user: userPayload,
                token,
            }
        });
    } catch (error) {
        console.error('Login route error:', error);
        res.status(500).json({ message: 'Loi server noi bo' });
    }
};

exports.getMe = async (req, res) => {
    try {
        if (!req.userId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        const [rows] = await db.promise().query(
            `
            SELECT id, username, full_name, email, avatar_url, role, hsk_level, is_active, email_verified
            FROM users
            WHERE id = ?
            LIMIT 1
            `,
            [req.userId]
        );

        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!rows[0].is_active) {
            return res.status(403).json({ success: false, message: 'Tai khoan da bi vo hieu hoa' });
        }

        return res.status(200).json({ success: true, user: rows[0] });
    } catch (error) {
        console.error('GetMe route error:', error);
        return res.status(500).json({ success: false, message: 'Loi server noi bo' });
    }
};

exports.register = async (req, res) => {
    try {
        const { username, full_name, email, password, hsk_level } = req.body;

        if (!email || !password || !full_name) {
            return res.status(400).json({ message: 'Vui long cung cap day du thong tin.' });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({ message: 'Email khong hop le.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Mat khau toi thieu 6 ky tu.' });
        }

        const [existingByEmail] = await db.promise().query('SELECT id FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
        if (existingByEmail.length > 0) {
            return res.status(409).json({ message: 'Email nay da duoc su dung.' });
        }

        const preferredUsername = username || normalizedEmail.split('@')[0];
        const safeUsername = await generateUniqueUsername(preferredUsername);

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const insertQuery = `
            INSERT INTO users (username, email, password_hash, full_name, hsk_level, role)
            VALUES (?, ?, ?, ?, ?, 'user')
        `;

        let safeHskLevel = Number(hsk_level || 1);
        if (Number.isNaN(safeHskLevel) || safeHskLevel < 1 || safeHskLevel > 6) {
            safeHskLevel = 1;
        }

        const [result] = await db.promise().query(insertQuery, [
            safeUsername,
            normalizedEmail,
            hashedPassword,
            String(full_name).trim(),
            safeHskLevel,
        ]);

        let createdUserId = Number(result?.insertId || 0);
        if (!createdUserId) {
            const [createdRows] = await db.promise().query('SELECT id FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
            createdUserId = Number(createdRows?.[0]?.id || 0);
        }

        if (!createdUserId) {
            return res.status(500).json({ message: 'Khong the tao tai khoan luc nay.' });
        }

        res.status(201).json({
            success: true,
            message: 'Dang ky thanh cong! Vui long dang nhap.',
            userId: createdUserId,
            username: safeUsername,
            data: {
                user: {
                    id: createdUserId,
                    username: safeUsername,
                    email: normalizedEmail,
                    full_name: String(full_name).trim(),
                    hsk_level: safeHskLevel,
                },
            },
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Loi server noi bo' });
    }
};

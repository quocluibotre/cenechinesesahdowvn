const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const userRoutes = require('./routes/user.routes');
const blogRoutes = require('./routes/blog.routes');
const adminRoutes = require('./routes/admin.routes');
const categoryRoutes = require('./routes/category.routes');
const uploadRoutes = require('./routes/upload.routes');
const proxyUtils = require('./utils/proxy.utils');
const youtubeRoutes = require('./routes/youtube.routes');
// const bookingRoutes = require('./routes/booking.routes');

const app = express();
const PORT = process.env.PORT || 3000;

const normalize = (value) => String(value || '').trim().replace(/\/$/, '');

const configuredOriginEntries = [
    ...String(process.env.CORS_ORIGINS || '').split(','),
    ...String(process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '').split(','),
]
    .map((item) => normalize(item))
    .filter(Boolean);

const defaultAllowedHostnames = new Set([
    'cinechineseshadow.online',
    'www.cinechineseshadow.online',
]);

const allowedOrigins = new Set();
const allowedHostnames = new Set();

configuredOriginEntries.forEach((entry) => {
    allowedOrigins.add(entry);

    try {
        const parsed = new URL(entry.includes('://') ? entry : `https://${entry}`);
        if (parsed.hostname) {
            allowedHostnames.add(parsed.hostname.toLowerCase());
        }
    } catch {
        // Ignore invalid CORS_ORIGINS entries.
    }
});

defaultAllowedHostnames.forEach((hostname) => {
    allowedHostnames.add(hostname);
});

const allowedHostnameSuffixes = String(process.env.CORS_ORIGIN_SUFFIXES || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .map((item) => item.replace(/^\*\./, '').replace(/^\./, ''));

const hasAllowedSuffix = (hostname) => allowedHostnameSuffixes.some((suffix) => (
    hostname === suffix || hostname.endsWith(`.${suffix}`)
));

const isAllowedOrigin = (origin) => {
    if (!origin) {
        return true;
    }

    const normalizedOrigin = normalize(origin);

    if (allowedOrigins.has(normalizedOrigin)) {
        return true;
    }

    try {
        const { hostname } = new URL(normalizedOrigin);
        const safeHostname = String(hostname || '').toLowerCase();

        return allowedHostnames.has(safeHostname)
            || hasAllowedSuffix(safeHostname)
            || safeHostname.endsWith('.pages.dev');
    } catch {
        return false;
    }
};

const corsOptions = {
    origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Proxy Subtitle API (tương đương api/proxy_subtitle.php cũ)
app.get('/api/proxy_subtitle', proxyUtils.proxySubtitle);

// Serve static files from 'uploads' directory
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/product', productRoutes); // Video management
app.use('/api/user', userRoutes);       // User management
app.use('/api/blog', blogRoutes);       // Vocabulary / Learning
app.use('/api/admin', adminRoutes);     // Admin dashboard
app.use('/api/category', categoryRoutes); // Categories
app.use('/api/upload', uploadRoutes);   // Presigned upload
app.use('/api/youtube', youtubeRoutes); // Youtube custom pipeline

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ message: 'Internal Server Error!' });
});

// Khởi động server
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
    console.log(`📁 Thư mục Uploads đã sẵn sàng phục vụ tĩnh.`);
});

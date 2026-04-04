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
// const bookingRoutes = require('./routes/booking.routes');

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = new Set([
    ...String(process.env.CORS_ORIGINS || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
]);

const isAllowedOrigin = (origin) => {
    if (!origin) {
        return true;
    }

    if (allowedOrigins.has(origin)) {
        return true;
    }

    try {
        const { hostname } = new URL(origin);
        return hostname.endsWith('.pages.dev');
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
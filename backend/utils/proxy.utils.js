const https = require('https');
const http = require('http');
const urlModule = require('url');

// Proxy tải Subtitle (VTT) từ R2 để tránh lỗi CORS cho người dùng web (tương tự như proxy_subtitle.php cũ)
exports.proxySubtitle = async (req, res) => {
    try {
        const urlToFetch = req.query.url;

        if (!urlToFetch) {
            return res.status(400).send('Thiếu tham số url');
        }

        // Tùy chọn bảo mật: Ràng buộc host chứa phụ đề của bạn (ví dụ chỉ cho proxy từ Cloudflare R2 của bạn)
        // const ALLOWED_HOST = process.env.R2_PUBLIC_URL_HOST || 'pub-xxxxx.r2.dev'; 
        // const parsedUrl = urlModule.parse(urlToFetch);
        // if (parsedUrl.host !== ALLOWED_HOST) {
        //     return res.status(403).send('Forbidden: Không cho phép URL này');
        // }

        // Kiểm tra đuôi file (Chỉ cho file .vtt)
        if (!urlToFetch.toLowerCase().endsWith('.vtt')) {
            return res.status(403).send('Chỉ cho phép Fetch file VTT');
        }

        // Chọn http hay https dựa trên url gốc
        const client = urlToFetch.startsWith('https') ? https : http;

        client.get(urlToFetch, (remoteRes) => {
            if (remoteRes.statusCode !== 200) {
                return res.status(remoteRes.statusCode).send('Failed to fetch subtitle');
            }

            // Gởi Response với Content-Type chuẩn
            res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache trong 1 ngày

            // Stream file từ Server đích thằng về Client Nodejs của bạn
            remoteRes.pipe(res);
        }).on('error', (err) => {
            console.error('Error fetching subtitle proxy', err);
            res.status(502).send('Internal Server Error fetching subtitle');
        });

    } catch (err) {
        console.error('Khởi tạo lỗi proxySubtitle', err);
        res.status(500).send('Có lỗi proxy.');
    }
};
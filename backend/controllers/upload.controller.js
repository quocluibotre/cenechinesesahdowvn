const path = require('path');
const crypto = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const ALLOWED_FOLDERS = ['videos', 'thumbnails', 'subtitles'];

const sanitizeExt = (filename) => {
    const ext = path.extname(filename || '').replace('.', '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return ext || 'bin';
};

exports.presignUpload = async (req, res) => {
    try {
        const { filename, content_type, folder } = req.body;

        if (!filename || !folder) {
            return res.status(400).json({ success: false, error: 'filename va folder la bat buoc' });
        }

        if (!ALLOWED_FOLDERS.includes(folder)) {
            return res.status(400).json({ success: false, error: 'Invalid folder' });
        }

        const endpoint = process.env.R2_ENDPOINT;
        const bucket = process.env.R2_BUCKET;
        const accessKeyId = process.env.R2_ACCESS_KEY;
        const secretAccessKey = process.env.R2_SECRET_KEY;
        const publicBase = process.env.R2_PUBLIC_URL;

        if (!endpoint || !bucket || !accessKeyId || !secretAccessKey || !publicBase) {
            return res.status(400).json({
                success: false,
                error: 'Thieu bien moi truong R2_ENDPOINT/R2_BUCKET/R2_ACCESS_KEY/R2_SECRET_KEY/R2_PUBLIC_URL',
            });
        }

        const ext = sanitizeExt(filename);
        const objectKey = `${folder}/${Date.now()}_${crypto.randomBytes(8).toString('hex')}.${ext}`;

        const client = new S3Client({
            region: 'auto',
            endpoint,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });

        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: objectKey,
            ContentType: content_type || 'application/octet-stream',
        });

        const presignedUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
        const publicUrl = `${publicBase.replace(/\/$/, '')}/${objectKey}`;

        return res.status(200).json({
            success: true,
            presigned_url: presignedUrl,
            public_url: publicUrl,
            r2_key: objectKey,
            content_type: content_type || 'application/octet-stream',
        });
    } catch (error) {
        console.error('Error presignUpload:', error);
        return res.status(500).json({ success: false, error: 'Loi server tao presigned URL' });
    }
};

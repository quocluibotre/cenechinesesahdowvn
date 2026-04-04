const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const requiredEnv = ['R2_ENDPOINT', 'R2_BUCKET', 'R2_ACCESS_KEY', 'R2_SECRET_KEY', 'R2_PUBLIC_URL'];

const getMissingEnv = () => requiredEnv.filter((key) => !process.env[key]);

const assertR2Config = () => {
    const missing = getMissingEnv();
    if (missing.length) {
        throw new Error(`Missing R2 environment variables: ${missing.join(', ')}`);
    }
};

const getR2Client = () => {
    assertR2Config();

    return new S3Client({
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY,
            secretAccessKey: process.env.R2_SECRET_KEY,
        },
    });
};

const toPublicUrl = (key) => `${process.env.R2_PUBLIC_URL.replace(/\/$/, '')}/${String(key || '').replace(/^\/+/, '')}`;

const uploadLocalFileToR2 = async (localPath, r2Key, contentType = 'application/octet-stream') => {
    assertR2Config();

    if (!localPath || !fs.existsSync(localPath)) {
        throw new Error('Local file does not exist');
    }

    const fileStream = fs.createReadStream(localPath);
    const client = getR2Client();

    await client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: r2Key,
        Body: fileStream,
        ContentType: contentType,
    }));

    return {
        success: true,
        key: r2Key,
        url: toPublicUrl(r2Key),
    };
};

const uploadBufferToR2 = async (buffer, r2Key, contentType = 'application/octet-stream') => {
    assertR2Config();

    if (!Buffer.isBuffer(buffer)) {
        throw new Error('buffer must be a Buffer instance');
    }

    const client = getR2Client();

    await client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: r2Key,
        Body: buffer,
        ContentType: contentType,
    }));

    return {
        success: true,
        key: r2Key,
        url: toPublicUrl(r2Key),
    };
};

const deleteR2File = async (r2Key) => {
    assertR2Config();

    const client = getR2Client();
    await client.send(new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: r2Key,
    }));

    return { success: true };
};

const inferContentTypeFromExtension = (filename = '') => {
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.mp4') return 'video/mp4';
    if (ext === '.webm') return 'video/webm';
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.png') return 'image/png';
    if (ext === '.webp') return 'image/webp';
    if (ext === '.vtt') return 'text/vtt';
    if (ext === '.srt') return 'text/plain';
    return 'application/octet-stream';
};

module.exports = {
    getMissingEnv,
    toPublicUrl,
    uploadLocalFileToR2,
    uploadBufferToR2,
    deleteR2File,
    inferContentTypeFromExtension,
};

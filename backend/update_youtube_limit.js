const fs = require('fs');
let code = fs.readFileSync('controllers/youtube.controller.js', 'utf8');

// Replace the SQL query to add LIMIT 20
const targetStr = `SELECT id, en_text FROM subtitles WHERE video_id = ? AND (vn_text = '(Chưa dịch)' OR vn_text IS NULL OR vn_text = '')`;
const replacementStr = `SELECT id, en_text FROM subtitles WHERE video_id = ? AND (vn_text = '(Chưa dịch)' OR vn_text IS NULL OR vn_text = '') LIMIT 15`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replacementStr);
    
    // Also change the return message
    code = code.replace(
        'return res.json({ success: true, message: `Đã dịch thành công ${updatedCount} câu`, updated: updatedCount });',
        'return res.json({ success: true, message: `Đã dịch ${updatedCount} câu (Nhấn lại nếu vẫn còn lỗi)`, updated: updatedCount });'
    );

    fs.writeFileSync('controllers/youtube.controller.js', code, 'utf8');
    console.log('Modified retranslateSubtitles to LIMIT 15.');
} else {
    console.log('Could not find the target string!');
}

const fs = require('fs');
const FILE = '../backend/controllers/blog.controller.js';
let content = fs.readFileSync(FILE, 'utf8');

// 1. Update extractVocabularyFromLLM prompt to handle English
const oldExtractorPrompt = `    const prompt = [
        'Ban la tro ly ngon ngu hoc tieng Trung cho nguoi Viet.',
        'Duoi day la mang cac cap cau phu de Trung-Viet.',
        'Hay trich xuat tu 3 den 8 tu/cum tu quan trong trong moi nhom, uu tien tu co gia tri giao tiep.',
        'Moi lan goi, chi tra ve toi da 16 object de tranh tran token.',
        'Nghia tieng Viet phai bam sat ngu canh cua cau Viet da cho, ngan gon, tu nhien.',
        'Bat buoc tra ve JSON THUAN la mot array object voi dung 3 field: word, meaning, pinyin.',
        'Khong giai thich them, khong markdown, khong chu thich.',
        \`Dau vao: \${JSON.stringify(compactPairs)}\`,
    ].join('\\n');`;

const newExtractorPrompt = `    const isEnglish = (subtitlePairsChunk[0] && subtitlePairsChunk[0].isEnglish) || false;
    const prompt = isEnglish ? [
        'Ban la tro ly ngon ngu hoc tieng Anh cho nguoi Viet.',
        'Duoi day la mang cac cap cau phu de Anh-Viet.',
        'Hay trich xuat tu 3 den 8 tu/cum tu (vocabulary/idiom/phrasal verb) quan trong trong moi nhom, uu tien tu co gia tri giao tiep.',
        'Moi lan goi, chi tra ve toi da 16 object de tranh tran token.',
        'Nghia tieng Viet phai bam sat ngu canh cua cau Viet da cho, ngan gon, tu nhien.',
        'Bat buoc tra ve JSON THUAN la mot array object voi dung 3 field: word, meaning, pinyin (pinyin mac dinh de trong hoac chua phien am IPA).',
        'Khong giai thich them, khong markdown, khong chu thich.',
        \`Dau vao: \${JSON.stringify(compactPairs)}\`,
    ].join('\\n') : [
        'Ban la tro ly ngon ngu hoc tieng Trung cho nguoi Viet.',
        'Duoi day la mang cac cap cau phu de Trung-Viet.',
        'Hay trich xuat tu 3 den 8 tu/cum tu quan trong trong moi nhom, uu tien tu co gia tri giao tiep.',
        'Moi lan goi, chi tra ve toi da 16 object de tranh tran token.',
        'Nghia tieng Viet phai bam sat ngu canh cua cau Viet da cho, ngan gon, tu nhien.',
        'Bat buoc tra ve JSON THUAN la mot array object voi dung 3 field: word, meaning, pinyin.',
        'Khong giai thich them, khong markdown, khong chu thich.',
        \`Dau vao: \${JSON.stringify(compactPairs)}\`,
    ].join('\\n');`;

content = content.replace(oldExtractorPrompt, newExtractorPrompt);

// 2. Modify generateVocabulary SQL and fetch logic
const oldGenerateStart = `    try {
        if (req.userRole !== 'admin') {
            return res.status(403).json({ success: false, error: 'Chi admin moi duoc tao tu vung bang AI' });
        }`;

const newGenerateStart = `    try {
        if (req.userRole !== 'admin') {
            return res.status(403).json({ success: false, error: 'Chi admin moi duoc tao tu vung bang AI' });
        }
        const extractYouTubeId = (url) => {
            if (!url) return null;
            const regExp = /^.*((youtu.be\\/)|(v\\/)|(\\/u\\/\\w\\/)|(embed\\/)|(watch\\?))\\??v?=?([^#&?]*).*/;
            const match = url.match(regExp);
            return (match && match[7].length === 11) ? match[7] : null;
        };`;

content = content.replace(oldGenerateStart, newGenerateStart);

const oldVideoQuery = `        const [videos] = await db.promise().query(
            'SELECT id, subtitle_cn_url, subtitle_vi_url, hsk_level FROM videos WHERE id = ? LIMIT 1',
            [resolvedVideoId]
        );`;
const newVideoQuery = `        const [videos] = await db.promise().query(
            'SELECT id, subtitle_cn_url, subtitle_vi_url, hsk_level, language_track, video_url FROM videos WHERE id = ? LIMIT 1',
            [resolvedVideoId]
        );`;
content = content.replace(oldVideoQuery, newVideoQuery);

const oldValidationAndFetch = `        if (!video.subtitle_cn_url) {
            return res.status(400).json({ success: false, error: 'Video chua co phu de tieng Trung' });
        }

        if (!String(process.env.GEMINI_API_KEY || '').trim()) {
            return res.status(500).json({ success: false, error: 'Thieu GEMINI_API_KEY tren server' });
        }

        const subtitleCnContent = await loadSubtitleContent(video.subtitle_cn_url);

        let subtitleViContent = '';
        if (video.subtitle_vi_url) {
            try {
                subtitleViContent = await loadSubtitleContent(video.subtitle_vi_url);
            } catch (error) {
                console.warn('Warning load subtitle_vi for meaning fallback:', error.message || error);
            }
        }

        const cues = parseSubtitleCues(subtitleCnContent, { requireChinese: true });
        if (!cues.length) {
            return res.status(200).json({ success: false, error: 'Khong doc duoc phu de tieng Trung' });
        }

        const meaningCues = subtitleViContent
            ? parseSubtitleCues(subtitleViContent, { requireChinese: false })
            : [];
        const subtitlePairs = buildSubtitlePairs(cues, meaningCues);`;

const newValidationAndFetch = `        if (!String(process.env.GEMINI_API_KEY || '').trim()) {
            return res.status(500).json({ success: false, error: 'Thieu GEMINI_API_KEY tren server' });
        }

        let subtitlePairs = [];
        const isEnglish = video.language_track === 'english';
        const ytId = extractYouTubeId(video.video_url);

        if (ytId) {
            const [dbSubs] = await db.promise().query('SELECT * FROM subtitles WHERE video_id = ? ORDER BY start_time ASC', [resolvedVideoId]);
            if (!dbSubs.length) {
                return res.status(200).json({ success: false, error: 'Chưa có dữ liệu phụ đề YouTube trong DB' });
            }
            subtitlePairs = dbSubs.map((s, idx) => ({
                cueIndex: idx,
                start: Number(s.start_time),
                cn: s.en_text, 
                vi: s.vn_text,
                isEnglish: isEnglish
            }));
        } else {
            if (!video.subtitle_cn_url) {
                return res.status(400).json({ success: false, error: 'Video chua co phu de goc (subtitle_cn_url)' });
            }
            const subtitleCnContent = await loadSubtitleContent(video.subtitle_cn_url);

            let subtitleViContent = '';
            if (video.subtitle_vi_url) {
                try {
                    subtitleViContent = await loadSubtitleContent(video.subtitle_vi_url);
                } catch (error) {
                    console.warn('Warning load subtitle_vi for meaning fallback:', error.message || error);
                }
            }

            const cues = parseSubtitleCues(subtitleCnContent, { requireChinese: !isEnglish });
            if (!cues.length) {
                return res.status(200).json({ success: false, error: 'Khong doc duoc phu de' });
            }

            const meaningCues = subtitleViContent
                ? parseSubtitleCues(subtitleViContent, { requireChinese: false })
                : [];
            
            subtitlePairs = cues.map((cue, index) => {
                const cn = String(cue?.text || '').trim().replace(/\\n/g, ' ');
                if (!cn) return null;
                
                if (!isEnglish && !(/[\\u3400-\\u9fff]/.test(cn))) {
                    return null;
                }
                
                let vi = '';
                if (meaningCues.length) {
                   const matched = meaningCues.find(m => Math.abs(Number(m.start||0) - Number(cue.start||0)) < 1.5);
                   if (matched) vi = String(matched.text || '').trim().replace(/\\n/g, ' ');
                }

                return {
                    cueIndex: index,
                    start: Number(cue?.start || 0),
                    cn,
                    vi,
                    isEnglish
                };
            }).filter(Boolean);
        }`;

content = content.replace(oldValidationAndFetch, newValidationAndFetch);

// 3. Prevent hasChinese regex validation from blocking english words
const oldNormalizeItems = `        const word = sanitizeChineseWord(item?.word || item?.term || item?.word_cn);
        if (!word || !hasChinese(word) || word.length < 2 || word.length > 10) {
            continue;
        }

        if (!/^[\\u3400-\\u9fff]+$/.test(word)) {
            continue;
        }`;

const newNormalizeItems = `        const wordRaw = String(item?.word || item?.term || item?.word_cn || '');
        const isEnglish = (subtitlePairs[0] && subtitlePairs[0].isEnglish) || false;
        
        let word = wordRaw;
        if (!isEnglish) {
            word = sanitizeChineseWord(wordRaw);
            if (!word || !hasChinese(word) || Math.max(word.length, wordRaw.length) < 2 || word.length > 15) continue;
            if (!/^[\\u3400-\\u9fff]+$/.test(word)) continue;
        } else {
            word = wordRaw.trim().replace(/[^a-zA-Z0-9\\'- ]/g, '');
            if (!word || word.length < 2 || word.length > 25) continue;
        }`;
content = content.replace(oldNormalizeItems, newNormalizeItems);

fs.writeFileSync(FILE, content, 'utf8');
console.log('Blog controller updated!');

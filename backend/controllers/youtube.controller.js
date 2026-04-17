const db = require('../config/db.config');
const axios = require('axios');
const { YoutubeTranscript } = require('youtube-transcript');

const TRANSLATE_ENGINE = String(process.env.YOUTUBE_TRANSLATE_ENGINE || 'fast').trim().toLowerCase();
const TRANSLATE_CONCURRENCY = Math.max(1, Math.min(12, Number(process.env.YOUTUBE_TRANSLATE_CONCURRENCY || 6)));
const TRANSLATE_TIMEOUT_MS = Math.max(3000, Number(process.env.YOUTUBE_TRANSLATE_TIMEOUT_MS || 12000));
const TRANSLATE_ENDPOINT = String(process.env.YOUTUBE_TRANSLATE_ENDPOINT || 'https://translate.googleapis.com/translate_a/single').trim();
const TRANSLATE_CONTEXT_GROUP = Math.max(1, Math.min(10, Number(process.env.YOUTUBE_TRANSLATE_CONTEXT_GROUP || 4)));
const IDIOM_REWRITE_ENGINE = String(process.env.YOUTUBE_IDIOM_REWRITE_ENGINE || 'auto').trim().toLowerCase();
const IDIOM_REWRITE_MAX_ITEMS = Math.max(0, Math.min(80, Number(process.env.YOUTUBE_IDIOM_REWRITE_MAX_ITEMS || 20)));
const IDIOM_REWRITE_MODEL = String(process.env.YOUTUBE_IDIOM_REWRITE_MODEL || process.env.GEMINI_MODEL || 'gemini-2.0-flash').trim();
let idiomRewriteCooldownUntil = 0;
const SUBTITLE_SEGMENT_MAX_WORDS = Math.max(8, Number(process.env.YOUTUBE_SUBTITLE_MAX_WORDS || 14));
const SUBTITLE_SEGMENT_MAX_CHARS = Math.max(60, Number(process.env.YOUTUBE_SUBTITLE_MAX_CHARS || 96));
const SUBTITLE_SEGMENT_MAX_DURATION = Math.max(2.5, Number(process.env.YOUTUBE_SUBTITLE_MAX_DURATION || 6.5));
const SUBTITLE_SEGMENT_PAUSE_SEC = Math.max(0.2, Number(process.env.YOUTUBE_SUBTITLE_PAUSE_SEC || 1.1));

// --- Tách Video ID từ URL ---
function extractYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// Chuyển đổi duration chuẩn ISO 8601 (PT1H2M10S) sang giây
function parseISO8601Duration(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;
    const hours = (parseInt(match[1]) || 0);
    const minutes = (parseInt(match[2]) || 0);
    const seconds = (parseInt(match[3]) || 0);
    return hours * 3600 + minutes * 60 + seconds;
}

function normalizeTranscriptTime(rawValue) {
    const parsed = Number(rawValue || 0);
    if (!Number.isFinite(parsed) || parsed < 0) {
        return 0;
    }

    // youtube-transcript may return ms, while other paths use seconds.
    return parsed > 1000 ? parsed / 1000 : parsed;
}

async function fetchYouTubeTranscriptByLibrary(videoId) {
    if (!YoutubeTranscript || typeof YoutubeTranscript.fetchTranscript !== 'function') {
        throw new Error('Transcript fallback library unavailable');
    }

    const languageCandidates = ['en', 'en-US', 'en-GB', null];
    let lastError = null;

    for (const lang of languageCandidates) {
        try {
            const options = lang ? { lang } : undefined;
            const rows = options
                ? await YoutubeTranscript.fetchTranscript(videoId, options)
                : await YoutubeTranscript.fetchTranscript(videoId);

            if (!Array.isArray(rows) || rows.length === 0) {
                continue;
            }

            const captions = rows
                .map((item) => {
                    const text = String(item?.text || '').replace(/\s+/g, ' ').trim();
                    const start = normalizeTranscriptTime(item?.offset ?? item?.start ?? item?.startMs);
                    const dur = normalizeTranscriptTime(item?.duration ?? item?.dur ?? item?.durationMs);

                    if (!text) {
                        return null;
                    }

                    return {
                        text,
                        start,
                        dur: dur > 0 ? dur : 2,
                        words: null,
                    };
                })
                .filter(Boolean);

            if (captions.length) {
                return captions;
            }
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error('No transcript returned by fallback library');
}

async function fetchYouTubeMetadataWithApiKey(videoId, apiKey) {
    const ytApiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails&key=${apiKey}`;
    const response = await axios.get(ytApiUrl, { timeout: 20000 });
    const items = response.data?.items;

    if (!Array.isArray(items) || items.length === 0) {
        return null;
    }

    const snippet = items[0]?.snippet || {};
    const contentDetails = items[0]?.contentDetails || {};

    const title = String(snippet.title || '').trim();
    const thumbnail = snippet.thumbnails?.high?.url
        || snippet.thumbnails?.medium?.url
        || snippet.thumbnails?.default?.url
        || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    const durationSecs = parseISO8601Duration(contentDetails.duration || '');

    if (!title) {
        return null;
    }

    return {
        title,
        thumbnail,
        durationSecs: Number.isFinite(durationSecs) ? durationSecs : 0,
    };
}

async function fetchYouTubeMetadataWithoutApiKey(videoId) {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const fallbackThumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    let title = '';
    let thumbnail = '';
    let durationSecs = 0;

    try {
        const oembedResponse = await axios.get('https://www.youtube.com/oembed', {
            params: {
                url: videoUrl,
                format: 'json',
            },
            timeout: 20000,
        });

        title = String(oembedResponse.data?.title || '').trim();
        thumbnail = String(oembedResponse.data?.thumbnail_url || '').trim();
    } catch {
        // Continue with watch-page parse fallback.
    }

    try {
        const watchResponse = await axios.get(videoUrl, {
            timeout: 20000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            },
        });

        const html = String(watchResponse.data || '');

        if (!title) {
            const titleMatch = html.match(/<meta\s+name="title"\s+content="([^"]+)"/i)
                || html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
            if (titleMatch?.[1]) {
                title = String(titleMatch[1]).trim();
            }
        }

        if (!thumbnail) {
            const thumbMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
            if (thumbMatch?.[1]) {
                thumbnail = String(thumbMatch[1]).trim();
            }
        }

        const lengthMatch = html.match(/"lengthSeconds":"(\d+)"/);
        if (lengthMatch?.[1]) {
            const parsed = Number(lengthMatch[1]);
            if (Number.isFinite(parsed) && parsed > 0) {
                durationSecs = parsed;
            }
        }
    } catch {
        // Ignore watch parse failures and rely on oEmbed/minimal fallback.
    }

    if (!title) {
        return null;
    }

    return {
        title,
        thumbnail: thumbnail || fallbackThumbnail,
        durationSecs,
    };
}

function normalizeTranslateEngine(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (['gemini', 'llm'].includes(normalized)) return 'gemini';
    if (['fast', 'google', 'google_free', 'google-free', 'translate-only'].includes(normalized)) return 'fast';
    return 'fast';
}

function normalizeLanguageTrack(value, fallback = 'english') {
    const normalized = String(value || '').trim().toLowerCase();
    if (['english', 'en', 'eng'].includes(normalized)) return 'english';
    if (['chinese', 'cn', 'zh', 'mandarin'].includes(normalized)) return 'chinese';
    return fallback;
}

function normalizeIdiomRewriteEngine(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (['off', 'none', 'disable', 'disabled'].includes(normalized)) return 'off';
    if (['gemini', 'llm'].includes(normalized)) return 'gemini';
    return 'auto';
}

function hasGeminiApiKey() {
    return Boolean(String(process.env.GEMINI_API_KEY || '').trim());
}

function isGeminiQuotaError(errorLike) {
    const source = String(errorLike || '').toLowerCase();
    return source.includes('quota exceeded')
        || source.includes('rate limit')
        || source.includes('too many requests')
        || source.includes('429');
}

function parseRetrySeconds(errorLike) {
    const source = String(errorLike || '');
    const match = source.match(/retry in\s+(\d+(?:\.\d+)?)s/i);
    if (!match) return null;
    const seconds = Number(match[1]);
    if (!Number.isFinite(seconds) || seconds <= 0) return null;
    return seconds;
}

function normalizeTextForLookup(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function applyThrowGameIdiom(enText, vnText) {
    const sourceEn = String(enText || '');
    const sourceVi = String(vnText || '').trim();
    if (!sourceVi) return sourceVi;

    const throwGamePattern = /\bthrow(?:ing|s|n)?\s+(?:the\s+)?games?\b/i;
    if (!throwGamePattern.test(sourceEn)) {
        return sourceVi;
    }

    let output = sourceVi;
    output = output.replace(/\bném\s+(?:trò\s+chơi|game)s?\b/gi, 'quăng game');
    output = output.replace(/\bnem\s+(?:tro\s+choi|game)s?\b/gi, 'quang game');
    output = output.replace(/\bquăng\s+trò\s+chơi\b/gi, 'quăng game');
    output = output.replace(/\bthả\s+trò\s+chơi\b/gi, 'thả game');

    const lookup = normalizeTextForLookup(output);
    if (lookup.includes('nem tro choi')) {
        output = output.replace(/ném\s+trò\s+chơi/gi, 'quăng game');
    }
    if (lookup.includes('quang game')) {
        output = output.replace(/quang game/gi, 'quăng game');
    }

    return output;
}

function applySubtitleIdioms(enText, vnText) {
    let output = String(vnText || '').trim();
    if (!output) return output;

    output = applyThrowGameIdiom(enText, output);
    return output;
}

function applyIdiomsToTranslatedItems(items = []) {
    return (Array.isArray(items) ? items : []).map((item) => {
        const normalizedVi = applySubtitleIdioms(item?.en_text, item?.vn_text || '');
        return {
            ...item,
            vn_text: normalizedVi || '(Chưa dịch)',
        };
    });
}

const STRONG_IDIOM_CUE_PATTERN = /\b(throw(?:ing|s|n)?\s+(?:the\s+)?games?|call(?:ing)?\s+it\s+a\s+day|hit\s+the\s+sack|piece\s+of\s+cake|break\s+a\s+leg|under\s+the\s+weather|spill\s+the\s+beans|cost\s+an\s+arm\s+and\s+a\s+leg|pull\s+off|figure\s+out|work\s+out|give\s+up|show\s+up|choke|clutch|feed|int(?:ing)?|snowball|tilt(?:ed)?|grief(?:ing)?)\b/i;
const PHRASAL_VERB_PATTERN = /\b[a-z]+'?[a-z]+\s+(?:up|down|out|off|on|over|away|through|back|into)\b/i;

function hasPotentialIdiomCue(enText) {
    const source = String(enText || '').trim().toLowerCase();
    if (!source) return false;
    if (STRONG_IDIOM_CUE_PATTERN.test(source)) return true;
    return PHRASAL_VERB_PATTERN.test(source);
}

function parseJsonArrayFromModelText(raw) {
    let text = String(raw || '').trim();
    if (!text) return [];

    text = text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start === -1 || end === -1 || end < start) {
        return [];
    }

    const jsonSlice = text.slice(start, end + 1);
    try {
        const parsed = JSON.parse(jsonSlice);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

async function refinePotentialIdiomsWithGemini(items = []) {
    const engine = normalizeIdiomRewriteEngine(IDIOM_REWRITE_ENGINE);
    if (engine === 'off') {
        return items;
    }

    if (!hasGeminiApiKey()) {
        return items;
    }

    const source = Array.isArray(items) ? items : [];
    if (!source.length || IDIOM_REWRITE_MAX_ITEMS <= 0) {
        return source;
    }

    if (Date.now() < idiomRewriteCooldownUntil) {
        return source;
    }

    const candidates = source
        .map((item, idx) => ({
            idx,
            en_text: String(item?.en_text || '').trim(),
            vn_text: String(item?.vn_text || '').trim(),
        }))
        .filter((item) => item.en_text && item.vn_text && hasPotentialIdiomCue(item.en_text))
        .slice(0, IDIOM_REWRITE_MAX_ITEMS);

    if (!candidates.length) {
        return source;
    }

    const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
    const modelName = IDIOM_REWRITE_MODEL || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const payload = candidates.map((item) => ({ idx: item.idx, en_text: item.en_text, vn_text: item.vn_text }));
    const prompt = [
        'Ban la bien tap vien phu de Anh-Viet cho noi dung hoi thoai doi thuong va game/esports.',
        'Nhiem vu: CHI sua lai vn_text neu en_text co idiom/slang/phrasal verb bi dich word-by-word.',
        'Neu vn_text hien tai da on thi giu nguyen.',
        'Uu tien cach noi tu nhien, ngan gon, dung ngu canh.',
        'Bat buoc tra ve JSON THUAN la array object voi 2 field: idx, vn_text.',
        'Khong markdown, khong giai thich them.',
        `Data: ${JSON.stringify(payload)}`,
    ].join('\n');

    try {
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.15, maxOutputTokens: 4096 },
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000,
        });

        const modelText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const rows = parseJsonArrayFromModelText(modelText);
        if (!rows.length) {
            return source;
        }

        const byIndex = new Map();
        for (const row of rows) {
            const idx = Number(row?.idx);
            const vn = applySubtitleIdioms(source[idx]?.en_text, String(row?.vn_text || '').trim());
            if (Number.isFinite(idx) && idx >= 0 && idx < source.length && vn) {
                byIndex.set(idx, vn);
            }
        }

        if (!byIndex.size) {
            return source;
        }

        return source.map((item, idx) => {
            const rewritten = byIndex.get(idx);
            if (!rewritten) return item;
            return {
                ...item,
                vn_text: rewritten,
            };
        });
    } catch (error) {
        const message = error?.response?.data?.error?.message || error?.message || error;
        if (isGeminiQuotaError(message)) {
            const retrySeconds = parseRetrySeconds(message);
            const cooldownMs = retrySeconds
                ? Math.max(30_000, Math.ceil(retrySeconds * 1000) + 1500)
                : 180_000;
            idiomRewriteCooldownUntil = Date.now() + cooldownMs;
            console.warn(`[YouTube] idiom auto rewrite paused for ${Math.ceil(cooldownMs / 1000)}s due to quota/rate limit.`);
        } else {
            console.warn('[YouTube] idiom auto rewrite skipped:', message);
        }
        return source;
    }
}

function parseFastTranslateResponse(payload) {
    if (!Array.isArray(payload) || !Array.isArray(payload[0])) {
        return '';
    }

    const segments = payload[0]
        .filter((part) => Array.isArray(part) && typeof part[0] === 'string')
        .map((part) => part[0]);

    return segments.join('').trim();
}

function buildContextMarkersText(items = []) {
    return items
        .map((item, index) => `[[[SEG_${index}]]] ${String(item?.en_text || '').trim()}`)
        .join('\n');
}

function parseContextMarkersText(translatedText, expectedCount) {
    const source = String(translatedText || '');
    if (!source || expectedCount <= 0) return null;

    const markerRegex = /\[\[\[SEG_(\d+)\]\]\]/g;
    const matches = Array.from(source.matchAll(markerRegex));
    if (!matches.length) return null;

    const result = new Array(expectedCount).fill('');

    for (let i = 0; i < matches.length; i += 1) {
        const rawIndex = Number(matches[i]?.[1]);
        if (!Number.isFinite(rawIndex) || rawIndex < 0 || rawIndex >= expectedCount) {
            continue;
        }

        const start = Number(matches[i]?.index || 0) + String(matches[i]?.[0] || '').length;
        const end = i + 1 < matches.length ? Number(matches[i + 1]?.index || source.length) : source.length;

        let value = source.slice(start, end)
            .replace(/\[\[\[SEG_(\d+)\]\]\]/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/^[-:–—]\s*/, '')
            .trim();

        if (!value) {
            continue;
        }

        result[rawIndex] = value;
    }

    if (result.some((item) => !item)) {
        return null;
    }

    return result;
}

async function mapWithConcurrency(items, concurrency, mapper) {
    if (!Array.isArray(items) || !items.length) {
        return [];
    }

    const safeConcurrency = Math.max(1, Math.min(Number(concurrency) || 1, items.length));
    const results = new Array(items.length);
    let nextIndex = 0;

    const workers = Array.from({ length: safeConcurrency }, async () => {
        while (nextIndex < items.length) {
            const currentIndex = nextIndex;
            nextIndex += 1;
            results[currentIndex] = await mapper(items[currentIndex], currentIndex);
        }
    });

    await Promise.all(workers);
    return results;
}

async function translateTextFast(text, attempt = 1) {
    const sourceText = String(text || '').trim();
    if (!sourceText) {
        return '';
    }

    try {
        const response = await axios.get(TRANSLATE_ENDPOINT, {
            params: {
                client: 'gtx',
                sl: 'auto',
                tl: 'vi',
                dt: 't',
                q: sourceText,
            },
            timeout: TRANSLATE_TIMEOUT_MS,
        });

        const translatedText = parseFastTranslateResponse(response.data);
        if (!translatedText) {
            throw new Error('Empty translation payload');
        }

        return translatedText;
    } catch (error) {
        if (attempt >= 3) {
            return '(Chưa dịch)';
        }

        await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
        return translateTextFast(sourceText, attempt + 1);
    }
}

async function translateChunkFastLineByLine(chunk) {
    return mapWithConcurrency(chunk, TRANSLATE_CONCURRENCY, async (item) => {
        const vnText = await translateTextFast(item.en_text);
        return {
            ...item,
            vn_text: vnText || '(Chưa dịch)',
        };
    });
}

async function translateChunkFast(chunk) {
    const source = Array.isArray(chunk) ? chunk : [];
    if (!source.length) return [];

    if (TRANSLATE_CONTEXT_GROUP <= 1 || source.length === 1) {
        return translateChunkFastLineByLine(source);
    }

    const groups = [];
    for (let i = 0; i < source.length; i += TRANSLATE_CONTEXT_GROUP) {
        groups.push(source.slice(i, i + TRANSLATE_CONTEXT_GROUP));
    }

    const groupConcurrency = Math.max(1, Math.min(groups.length, Math.ceil(TRANSLATE_CONCURRENCY / 2)));

    const translatedGroups = await mapWithConcurrency(groups, groupConcurrency, async (group) => {
        if (!group.length) return [];

        try {
            const markedText = buildContextMarkersText(group);
            const translatedText = await translateTextFast(markedText);
            const parsed = parseContextMarkersText(translatedText, group.length);

            if (!parsed) {
                return translateChunkFastLineByLine(group);
            }

            return group.map((item, index) => ({
                ...item,
                vn_text: String(parsed[index] || '').trim() || '(Chưa dịch)',
            }));
        } catch {
            return translateChunkFastLineByLine(group);
        }
    });

    return translatedGroups.flat();
}

function getSubtitleTranslateEngine() {
    return normalizeTranslateEngine(TRANSLATE_ENGINE);
}

// --- Module 1: Xử lý video ---
exports.processVideoUrl = async (req, res) => {
    try {
        const { url, language_track } = req.body;
        if (!url) return res.status(400).json({ success: false, message: 'URL is required' });

        const videoId = extractYouTubeId(url);
        if (!videoId) return res.status(400).json({ success: false, message: 'Invalid YouTube URL' });

        const apiKey = String(process.env.YOUTUBE_API_KEY || '').trim();
        let metadata = null;

        if (apiKey) {
            try {
                metadata = await fetchYouTubeMetadataWithApiKey(videoId, apiKey);
            } catch (apiError) {
                console.warn('[YouTube] Data API metadata fetch failed, trying no-key fallback:', apiError?.message || apiError);
            }
        } else {
            console.warn('[YouTube] Missing YOUTUBE_API_KEY, using no-key metadata fallback for /youtube/process');
        }

        if (!metadata) {
            metadata = await fetchYouTubeMetadataWithoutApiKey(videoId);
        }

        if (!metadata) {
            return res.status(404).json({
                success: false,
                message: 'Khong lay duoc metadata video tu YouTube. Vui long kiem tra link hoac cau hinh YOUTUBE_API_KEY.',
            });
        }

        const { title, thumbnail, durationSecs } = metadata;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const track = normalizeLanguageTrack(language_track, 'english');

        // Lưu vào MySql / Postgres
        const sql = `
            INSERT INTO videos (title, video_url, thumbnail_url, duration, language_track, hsk_level, is_published, is_free) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [title, videoUrl, thumbnail, durationSecs, track, 1, 1, 1];
        
        const result = await db.promise().query(sql, params);
        const insertId = result[0]?.insertId || result[0]?.id || (result[0] && result[0][0] && result[0][0].id);
        const resolvedInsertId = await resolveVideoIdForSubtitles(insertId, videoId);

        if (!resolvedInsertId) {
            return res.status(500).json({
                success: false,
                message: 'Insert video thanh cong nhung khong tim thay ban ghi trong bang videos',
            });
        }

        if (Number(resolvedInsertId) !== Number(insertId)) {
            console.warn(`[YouTube] processVideoUrl fallback id: insertId=${insertId}, resolvedId=${resolvedInsertId}, youtube_id=${videoId}`);
        }

        res.json({
            success: true,
            message: 'Video processed successfully',
            data: {
                id: resolvedInsertId,
                youtube_id: videoId,
                title,
                thumbnail_url: thumbnail,
                duration: durationSecs,
                video_url: videoUrl
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- Module 2 & 3: Cào phụ đề, tiền xử lý và dịch AI qua Gemini ---
function preprocessSubtitles(captions) {
    const merged = [];
    let tempStr = '';
    let currStart = 0;
    let currEnd = 0;
    let currWords = [];  // Gộp tất cả words của các captions được merge

    const pushCurrent = () => {
        const normalizedText = String(tempStr || '').replace(/\s+/g, ' ').trim();
        if (!normalizedText) return;

        merged.push({
            start: Number(currStart.toFixed(3)),
            end: Number(currEnd.toFixed(3)),
            en_text: normalizedText,
            words: currWords.length > 0 ? currWords : null
        });

        tempStr = '';
        currStart = 0;
        currEnd = 0;
        currWords = [];
    };

    for (let i = 0; i < captions.length; i++) {
        const item = captions[i];
        const text = String(item.text || '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        const startTime = Number(item.start || 0);
        const endTime = startTime + Number(item.dur || 0);

        if (!text) {
            continue;
        }

        if (!tempStr) {
            currStart = startTime;
            currEnd = endTime;
            currWords = [];
        } else {
            const pause = Math.max(0, startTime - currEnd);
            if (pause >= SUBTITLE_SEGMENT_PAUSE_SEC) {
                pushCurrent();
                currStart = startTime;
                currEnd = endTime;
                currWords = [];
            }
        }

        tempStr = tempStr ? `${tempStr} ${text}` : text;
        currEnd = Math.max(currEnd, endTime);

        // Gộp word timings từ caption này
        if (Array.isArray(item.words) && item.words.length > 0) {
            currWords = currWords.concat(item.words);
        }

        const currentWordCount = tempStr.split(/\s+/).filter(Boolean).length;
        const currentDuration = Math.max(0, currEnd - currStart);
        const sentenceBoundary = /[.!?…]["')\]]*$/.test(text);
        const tooLong = currentWordCount >= SUBTITLE_SEGMENT_MAX_WORDS
            || tempStr.length >= SUBTITLE_SEGMENT_MAX_CHARS
            || currentDuration >= SUBTITLE_SEGMENT_MAX_DURATION;

        if (sentenceBoundary || tooLong || i === captions.length - 1) {
            pushCurrent();
        }
    }

    pushCurrent();
    return merged;
}

async function translateChunkWithGemini(chunk, attempt = 1) {
    const apiKey = process.env.GEMINI_API_KEY || '';
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const prompt = `Translate the 'en_text' field of each object in this JSON array to Vietnamese and add a 'vn_text' field. Keep all other fields unchanged. Return ONLY a valid JSON array with exactly ${chunk.length} objects. No markdown, no explanation.\nData: ${JSON.stringify(chunk)}`;

    try {
        console.log(`Calling Gemini REST (attempt ${attempt}, model: ${modelName}, chunk: ${chunk.length})...`);

        const response = await axios.post(url, {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000
        });

        let textResult = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        textResult = textResult.trim()
            .replace(/^```json\n?/g, '').replace(/^```\n?/g, '').replace(/\n?```$/g, '').trim();

        const translatedArr = JSON.parse(textResult);

        if (!Array.isArray(translatedArr) || translatedArr.length !== chunk.length) {
            throw new Error(`Length mismatch: expected ${chunk.length}, got ${translatedArr ? translatedArr.length : 'invalid'}`);
        }

        console.log(`\u2705 Translated chunk of ${chunk.length} items successfully`);
        return translatedArr;

    } catch (err) {
        const status = err.response?.status;
        const errMsg = err.response?.data?.error?.message || err.message;
        console.error(`\u274c Attempt ${attempt} failed (HTTP ${status || 'N/A'}): ${errMsg.slice(0, 120)}`);

        // 429 = rate limit: ch\u1EDD l\u00e2u h\u01a1n
        if (status === 429 || errMsg.includes('quota') || errMsg.includes('429')) {
            const waitMs = attempt * 8000;  // 8s, 16s, 24s
            console.log(`\u23f3 Rate limited, waiting ${waitMs / 1000}s before retry...`);
            await new Promise(r => setTimeout(r, waitMs));
        }

        if (attempt >= 4) {
            console.error('All retries failed for chunk, marking as (Ch\u01b0a d\u1ECBch).');
            return chunk.map(c => ({ ...c, vn_text: '(Ch\u01b0a d\u1ECBch)' }));
        }

        await new Promise(r => setTimeout(r, 2000 * attempt));
        return translateChunkWithGemini(chunk, attempt + 1);
    }
}

async function translateChunk(chunk, engine) {
    const translated = engine === 'gemini'
        ? await translateChunkWithGemini(chunk)
        : await translateChunkFast(chunk);

    const normalized = applyIdiomsToTranslatedItems(translated);
    return refinePotentialIdiomsWithGemini(normalized);
}

function ensureTranslateEngineConfigured(engine) {
    if (engine === 'gemini' && !String(process.env.GEMINI_API_KEY || '').trim()) {
        return {
            ok: false,
            message: 'Missing GEMINI_API_KEY',
        };
    }

    return { ok: true };
}

async function resolveVideoIdForSubtitles(rawVideoId, youtubeId) {
    const numericId = Number(rawVideoId);
    if (Number.isFinite(numericId) && numericId > 0) {
        const [idRows] = await db.promise().query(
            'SELECT id FROM videos WHERE id = ? LIMIT 1',
            [numericId]
        );

        if (Array.isArray(idRows) && idRows.length) {
            return Number(idRows[0].id);
        }
    }

    const safeYoutubeId = String(youtubeId || '').trim();
    if (!safeYoutubeId) {
        return null;
    }

    const canonicalUrl = `https://www.youtube.com/watch?v=${safeYoutubeId}`;
    const [exactRows] = await db.promise().query(
        'SELECT id FROM videos WHERE video_url = ? ORDER BY id DESC LIMIT 1',
        [canonicalUrl]
    );

    if (Array.isArray(exactRows) && exactRows.length) {
        return Number(exactRows[0].id);
    }

    const [likeRows] = await db.promise().query(
        'SELECT id FROM videos WHERE video_url LIKE ? ORDER BY id DESC LIMIT 1',
        [`%${safeYoutubeId}%`]
    );

    if (Array.isArray(likeRows) && likeRows.length) {
        return Number(likeRows[0].id);
    }

    return null;
}

exports.extractAndTranslateSubtitles = async (req, res) => {
    try {
        const { db_video_id, youtube_id } = req.body;
        if (!db_video_id || !youtube_id) {
            return res.status(400).json({ success: false, message: 'Requires db_video_id and youtube_id' });
        }

        const resolvedVideoId = await resolveVideoIdForSubtitles(db_video_id, youtube_id);
        if (!resolvedVideoId) {
            return res.status(404).json({
                success: false,
                message: `Khong tim thay video trong DB cho db_video_id=${db_video_id}. Hay tai lai video YouTube truoc.`,
            });
        }

        if (Number(resolvedVideoId) !== Number(db_video_id)) {
            console.warn(`[YouTube] db_video_id=${db_video_id} khong ton tai, fallback sang video_id=${resolvedVideoId} theo youtube_id=${youtube_id}`);
        }

        const translateEngine = getSubtitleTranslateEngine();
        const translateConfig = ensureTranslateEngineConfigured(translateEngine);
        if (!translateConfig.ok) {
            return res.status(500).json({ success: false, message: translateConfig.message });
        }

        console.log(`[YouTube] subtitle translate engine: ${translateEngine}`);

        // Bước 1: Lấy transcript bằng YouTube InnerTube API (tự viết, không cần thư viện)
        let captions = [];

        const fetchYouTubeTranscript = async (videoId) => {
            // Gọi InnerTube API để lấy danh sách caption tracks
            const INNERTUBE_URL = 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false';
            const CLIENT_VERSION = '20.10.38';
            const USER_AGENT = `com.google.android.youtube/${CLIENT_VERSION} (Linux; U; Android 14)`;

            const innertubeRes = await axios.post(INNERTUBE_URL, {
                context: {
                    client: {
                        clientName: 'ANDROID',
                        clientVersion: CLIENT_VERSION
                    }
                },
                videoId: videoId
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': USER_AGENT
                }
            });

            const captionTracks = innertubeRes.data
                ?.captions
                ?.playerCaptionsTracklistRenderer
                ?.captionTracks;

            if (!Array.isArray(captionTracks) || captionTracks.length === 0) {
                throw new Error('Video này không có phụ đề (caption tracks) nào.');
            }

            console.log('Available tracks:', captionTracks.map(t => t.languageCode));

            // Ưu tiên tìm track tiếng Anh
            const preferredLangs = ['en', 'en-US', 'en-GB', 'en-CA'];
            let selectedTrack = null;
            for (const lang of preferredLangs) {
                selectedTrack = captionTracks.find(t => t.languageCode === lang);
                if (selectedTrack) break;
            }
            // Fallback: lấy track đầu tiên nếu không tìm được tiếng Anh
            if (!selectedTrack) selectedTrack = captionTracks[0];

            console.log('Selected track:', selectedTrack.languageCode, selectedTrack.name?.simpleText);

            // Fetch nội dung XML của transcript
            const xmlRes = await axios.get(selectedTrack.baseUrl, {
                headers: { 'User-Agent': USER_AGENT }
            });

            // Parse XML sang mảng objects
            // InnerTube dùng format: <p t="START_MS" d="DUR_MS"><s t="WORD_OFFSET_MS">word</s>...</p>
            const xml = xmlRes.data;
            const results = [];

            const pRegex = /<p t="(\d+)" d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
            let pMatch;
            while ((pMatch = pRegex.exec(xml)) !== null) {
                const pStart = parseInt(pMatch[1]);  // ms
                const pDur = parseInt(pMatch[2]);    // ms
                const inner = pMatch[3];

                // Parse từng chữ với timing riêng từ <s t="offset">word</s>
                const words = [];
                const sRegex = /<s(?:\s+[^>]*\bt="(\d+)"[^>]*)?>([^<]*)<\/s>|<s(?:\s+[^>]*)?>([^<]*)<\/s>/g;
                let sMatch;
                let hasWordTiming = false;

                // Parse <s> tags
                const sSimple = /<s([^>]*)>([^<]*)<\/s>/g;
                let sm;
                while ((sm = sSimple.exec(inner)) !== null) {
                    const attrs = sm[1];
                    const wordText = sm[2];
                    const tMatch = attrs.match(/\bt="(\d+)"/);
                    const wordOffset = tMatch ? parseInt(tMatch[1]) : 0;
                    const wordAbsTime = (pStart + wordOffset) / 1000; // giây
                    const cleanWord = wordText
                        .replace(/&amp;/g, '&').replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>').replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'");
                    if (cleanWord.trim()) {
                        words.push({ word: cleanWord, t: wordAbsTime });
                        hasWordTiming = true;
                    }
                }

                // Lấy full text từ inner (xóa hết thẻ HTML)
                let rawText = inner
                    .replace(/<s[^>]*>/g, '').replace(/<\/s>/g, '')
                    .replace(/<[^>]+>/g, '')
                    .replace(/&amp;/g, '&').replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>').replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'").replace(/\n/g, ' ').trim();

                if (rawText) {
                    results.push({
                        text: rawText,
                        start: pStart / 1000,
                        dur: pDur / 1000,
                        words: hasWordTiming ? words : null
                    });
                }
            }

            return results;
        };

        try {
            captions = await fetchYouTubeTranscript(youtube_id);
            console.log(`✅ Fetched ${captions.length} captions from InnerTube API`);
        } catch (innerError) {
            console.warn('InnerTube fetch error:', innerError?.message || innerError);

            try {
                captions = await fetchYouTubeTranscriptByLibrary(youtube_id);
                console.log(`✅ Fetched ${captions.length} captions via youtube-transcript fallback`);
            } catch (fallbackError) {
                const combinedMessage = `${innerError?.message || ''} ${fallbackError?.message || ''}`.toLowerCase();
                const noCaptionPattern = /caption tracks|no transcript|transcript is disabled|subtitles are disabled|could not retrieve a transcript|no subtitles|không có phụ đề/i;
                const isNoCaptionCase = noCaptionPattern.test(combinedMessage);

                return res.status(isNoCaptionCase ? 200 : 404).json({
                    success: false,
                    message: isNoCaptionCase
                        ? 'Không thể lấy phụ đề: Video này không có phụ đề công khai hoặc chủ video đã tắt caption.'
                        : `Không thể lấy phụ đề: ${fallbackError?.message || innerError?.message || 'Unknown error'}`,
                });
            }
        }

        if (captions.length === 0) {
            return res.status(200).json({
                success: false,
                message: 'Không thể lấy phụ đề: Video này không có phụ đề công khai hoặc transcript rỗng.'
            });
        }


        // Bước 2: Tiền xử lý
        const preprocessed = preprocessSubtitles(captions);

        // Bước 3: Batching / Chunking
        const BATCH_SIZE = 50;
        const chunks = [];
        for (let i = 0; i < preprocessed.length; i += BATCH_SIZE) {
            chunks.push(preprocessed.slice(i, i + BATCH_SIZE));
        }

        // Bước 4: Translate
        const allTranslated = [];
        for (let i = 0; i < chunks.length; i++) {
            console.log(`Translating chunk ${i+1}/${chunks.length}...`);
            const translatedChunk = await translateChunk(chunks[i], translateEngine);
            allTranslated.push(...translatedChunk);
        }

        // Clear bản cũ để có thể re-import phụ đề với segment mới (tránh trùng lặp)
        await db.promise().query('DELETE FROM subtitles WHERE video_id = ?', [resolvedVideoId]);

        // Bước 5: Insert database (bảng subtitles), lưu cả word_timings
        for (const sub of allTranslated) {
            // Lấy word_timings trực tiếp từ sub (preprocessSubtitles đã gộp sẵn)
            const wordTimings = sub.words ? JSON.stringify(sub.words) : null;

            const sql = `INSERT INTO subtitles (video_id, start_time, end_time, en_text, vn_text, word_timings) VALUES (?, ?, ?, ?, ?, ?)`;
            await db.promise().query(sql, [
                resolvedVideoId,
                sub.start,
                sub.end,
                sub.en_text,
                sub.vn_text || '',
                wordTimings
            ]);
        }

        return res.json({
            success: true,
            message: 'Subtitles extracted and translated successfully',
            video_id: resolvedVideoId,
            count: allTranslated.length,
            sample: allTranslated.slice(0, 5) // Return up to 5 samples
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// --- Re-translate chỉ những phụ đề chưa dịch ---
exports.retranslateSubtitles = async (req, res) => {
    try {
        const { video_id } = req.body;
        if (!video_id) return res.status(400).json({ success: false, message: 'video_id is required' });

        const translateEngine = getSubtitleTranslateEngine();
        const translateConfig = ensureTranslateEngineConfigured(translateEngine);
        if (!translateConfig.ok) {
            return res.status(500).json({ success: false, message: translateConfig.message });
        }

        console.log(`[YouTube] re-translate engine: ${translateEngine}`);

        const pendingLimit = translateEngine === 'gemini' ? 15 : 120;

        // Lấy tất cả rows chưa được dịch
        const [rows] = await db.promise().query(
            `SELECT id, en_text FROM subtitles WHERE video_id = ? AND (vn_text = '(Chưa dịch)' OR vn_text IS NULL OR vn_text = '') LIMIT ${pendingLimit}`,
            [video_id]
        );

        if (rows.length === 0) {
            return res.json({ success: true, message: 'Không có phụ đề nào cần dịch lại', updated: 0 });
        }

        console.log(`Found ${rows.length} untranslated subtitles for video_id=${video_id}`);

        const BATCH_SIZE = translateEngine === 'gemini' ? 10 : 35;
        const chunks = [];
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            chunks.push(rows.slice(i, i + BATCH_SIZE));
        }

        let updatedCount = 0;

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`Re-translating chunk ${i + 1}/${chunks.length} (${chunk.length} items)...`);

            try {
                const translated = await translateChunk(chunk, translateEngine);

                // Update từng row trong DB
                for (const item of translated) {
                    const vnText = String(item?.vn_text || '').trim();
                    if (vnText && vnText !== '(Chưa dịch)') {
                        await db.promise().query(
                            `UPDATE subtitles SET vn_text = ? WHERE id = ?`,
                            [vnText, item.id]
                        );
                        updatedCount++;
                    }
                }
            } catch (chunkErr) {
                const status = chunkErr.response?.status;
                const errMsg = chunkErr.response?.data?.error?.message || chunkErr.message;
                console.error(`Chunk ${i + 1} failed (HTTP ${status || 'N/A'}):`, errMsg.slice(0, 120));
            }

            if (translateEngine === 'gemini' && i < chunks.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 1500));
            }
        }

        return res.json({
            success: true,
            message: `Đã dịch lại ${updatedCount}/${rows.length} phụ đề`,
            updated: updatedCount,
            total: rows.length
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// --- API lấy phụ đề từ Database cho Player ---
exports.getSubtitlesByVideoId = async (req, res) => {
    try {
        const { videoId } = req.params;
        if (!videoId) return res.status(400).json({ success: false, message: 'videoId is required' });

        const sql = `SELECT id, video_id, start_time, end_time, en_text, vn_text, word_timings FROM subtitles WHERE video_id = ? ORDER BY start_time ASC`;
        const result = await db.promise().query(sql, [videoId]);
        const sourceRows = result[0] || [];
        const rows = [];
        const changedRows = [];

        for (const row of sourceRows) {
            const originalVi = String(row?.vn_text || '');
            const correctedVi = applySubtitleIdioms(row?.en_text, originalVi);

            if (row?.id && correctedVi && correctedVi !== originalVi) {
                changedRows.push({ id: row.id, vn_text: correctedVi });
            }

            rows.push({
                ...row,
                vn_text: correctedVi,
            });
        }

        if (changedRows.length) {
            for (const item of changedRows) {
                await db.promise().query(
                    'UPDATE subtitles SET vn_text = ? WHERE id = ?',
                    [item.vn_text, item.id]
                );
            }
            console.log(`[YouTube] Applied ${changedRows.length} idiom corrections for video_id=${videoId}`);
        }

        return res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// --- DEBUG: Kiểm tra transcript thô bằng InnerTube ---
exports.debugTranscript = async (req, res) => {
    try {
        const { youtubeId } = req.params;
        const INNERTUBE_URL = 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false';
        const CLIENT_VERSION = '20.10.38';
        const USER_AGENT = `com.google.android.youtube/${CLIENT_VERSION} (Linux; U; Android 14)`;

        const innertubeRes = await axios.post(INNERTUBE_URL, {
            context: { client: { clientName: 'ANDROID', clientVersion: CLIENT_VERSION } },
            videoId: youtubeId
        }, { headers: { 'Content-Type': 'application/json', 'User-Agent': USER_AGENT } });

        const captionTracks = innertubeRes.data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

        if (!captionTracks?.length) {
            return res.json({ success: false, message: 'Không có caption tracks', data: null });
        }

        // Lấy track đầu tiên
        const track = captionTracks.find(t => t.languageCode === 'en') || captionTracks[0];
        const xmlRes = await axios.get(track.baseUrl, { headers: { 'User-Agent': USER_AGENT } });

        return res.json({
            success: true,
            available_tracks: captionTracks.map(t => ({ lang: t.languageCode, name: t.name?.simpleText })),
            selected: track.languageCode,
            xml_sample: xmlRes.data.substring(0, 500)
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

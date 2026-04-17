const axios = require('axios');

function parseArgs(argv) {
    const args = {};

    for (let i = 0; i < argv.length; i += 1) {
        const token = String(argv[i] || '');
        if (!token.startsWith('--')) continue;

        const key = token.slice(2);
        const next = argv[i + 1];

        if (next && !String(next).startsWith('--')) {
            args[key] = next;
            i += 1;
        } else {
            args[key] = true;
        }
    }

    return args;
}

function normalizeTime(value, treatAsMilliseconds = false) {
    const parsed = Number(value || 0);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;

    if (treatAsMilliseconds) {
        return parsed / 1000;
    }

    return parsed;
}

function resolveApiBase(raw) {
    const safe = String(raw || '').trim().replace(/\/$/, '');
    if (!safe) return '';

    return safe.endsWith('/api') ? safe : `${safe}/api`;
}

async function loadTranscriptModule() {
    try {
        const mod = await import('youtube-transcript/dist/youtube-transcript.esm.js');
        if (typeof mod?.fetchTranscript === 'function') {
            return mod;
        }
    } catch (error) {
        throw new Error(`Khong tai duoc youtube-transcript module: ${error.message}`);
    }

    throw new Error('Khong tim thay fetchTranscript trong youtube-transcript module');
}

async function fetchTranscriptRows(youtubeId, preferredLang) {
    const transcriptApi = await loadTranscriptModule();
    const languageCandidates = [];

    if (preferredLang) {
        languageCandidates.push(String(preferredLang).trim());
    }

    languageCandidates.push('en', 'en-US', 'en-GB', null);

    let lastError = null;

    for (const lang of languageCandidates) {
        try {
            const opts = lang ? { lang } : {};
            const rows = await transcriptApi.fetchTranscript(youtubeId, opts);
            if (Array.isArray(rows) && rows.length) {
                return rows;
            }
        } catch (error) {
            lastError = error;
        }
    }

    throw new Error(lastError?.message || 'Khong lay duoc transcript tu may local');
}

function mapRowsToPayload(rows) {
    return rows
        .map((row) => {
            const text = String(row?.text || '').replace(/\s+/g, ' ').trim();
            if (!text) return null;

            const rawStart = Number(row?.offset ?? row?.start ?? row?.startMs ?? 0);
            const rawDur = Number(row?.duration ?? row?.dur ?? row?.durationMs ?? 0);
            const likelyMilliseconds = Number.isFinite(rawDur) && rawDur > 30;

            const start = normalizeTime(rawStart, likelyMilliseconds);
            let dur = normalizeTime(rawDur, likelyMilliseconds);

            if (!Number.isFinite(dur) || dur <= 0) {
                dur = 2;
            }

            if (dur > 45) {
                dur = 6;
            }

            // Send canonical millisecond payload so backend can normalize consistently,
            // including older deployments that rely on ms-based heuristics.
            const startMs = Math.max(0, Math.round(start * 1000));
            const durMs = Math.max(100, Math.round(dur * 1000));
            const endMs = startMs + durMs;

            return {
                start: startMs,
                dur: durMs,
                end: endMs,
                en_text: text,
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.start - b.start);
}

function parseJsonLoose(text) {
    const safe = String(text || '').trim();
    if (!safe) return null;

    try {
        return JSON.parse(safe);
    } catch {
        // continue with loose extraction
    }

    const objectMatch = safe.match(/\{[\s\S]*\}/);
    if (objectMatch?.[0]) {
        try {
            return JSON.parse(objectMatch[0]);
        } catch {
            // continue
        }
    }

    const arrayMatch = safe.match(/\[[\s\S]*\]/);
    if (arrayMatch?.[0]) {
        try {
            return JSON.parse(arrayMatch[0]);
        } catch {
            return null;
        }
    }

    return null;
}

function normalizeTranslatedText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function chunkArray(source, size) {
    const items = Array.isArray(source) ? source : [];
    const chunkSize = Math.max(1, Number(size || 1));
    const chunks = [];

    for (let i = 0; i < items.length; i += chunkSize) {
        chunks.push(items.slice(i, i + chunkSize));
    }

    return chunks;
}

async function translateChunkWithOllama(chunk, config) {
    const ollamaUrl = String(config?.url || '').replace(/\/$/, '');
    const model = String(config?.model || '').trim();

    if (!ollamaUrl) {
        throw new Error('Thieu ollama url');
    }

    if (!model) {
        throw new Error('Thieu ollama model');
    }

    const payload = chunk.map((item, index) => ({
        index,
        en_text: item.en_text,
    }));

    const prompt = [
        'Translate each English subtitle to natural Vietnamese for movie subtitles.',
        'Keep meaning accurate, concise, and fluent.',
        `Return ONLY strict JSON: {"translations": ["...", "..."]} with exactly ${chunk.length} items in the same order.`,
        `Input: ${JSON.stringify(payload)}`,
    ].join('\n');

    const response = await axios.post(
        `${ollamaUrl}/api/chat`,
        {
            model,
            stream: false,
            format: 'json',
            messages: [
                {
                    role: 'system',
                    content: 'You are a subtitle translator. Output JSON only.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        },
        {
            timeout: 240000,
            headers: { 'Content-Type': 'application/json' },
        }
    );

    const content = response.data?.message?.content || '';
    const parsed = parseJsonLoose(content);

    let translations = null;
    if (Array.isArray(parsed)) {
        translations = parsed;
    } else if (Array.isArray(parsed?.translations)) {
        translations = parsed.translations;
    }

    if (!Array.isArray(translations) || translations.length !== chunk.length) {
        throw new Error('Ollama output khong dung so luong cau');
    }

    return chunk.map((item, index) => ({
        ...item,
        vn_text: normalizeTranslatedText(translations[index]),
    }));
}

async function translateSubtitlesWithOllama(subtitles, config) {
    const chunkSize = Math.max(4, Math.min(60, Number(config?.chunkSize || 18)));
    const chunks = chunkArray(subtitles, chunkSize);
    const output = [];

    for (let i = 0; i < chunks.length; i += 1) {
        const chunk = chunks[i];
        try {
            const translated = await translateChunkWithOllama(chunk, config);
            output.push(...translated);
            console.log(`[local-ai] chunk ${i + 1}/${chunks.length} translated (${translated.length} lines)`);
        } catch (error) {
            console.warn(`[local-ai] chunk ${i + 1}/${chunks.length} failed: ${error.message}`);
            output.push(...chunk.map((item) => ({ ...item, vn_text: '' })));
        }
    }

    return output;
}

function buildHeaders(token) {
    const headers = { 'Content-Type': 'application/json' };
    const safeToken = String(token || '').trim();

    if (safeToken) {
        headers.Authorization = safeToken.startsWith('Bearer ')
            ? safeToken
            : `Bearer ${safeToken}`;
    }

    return headers;
}

async function callImportEndpoint(apiBase, headers, payload) {
    const url = `${apiBase}/youtube/subtitles/import`;
    const response = await axios.post(url, payload, { headers, timeout: 120000 });
    return response.data;
}

async function callRetranslateUntilDone(apiBase, headers, videoId, maxRounds) {
    const url = `${apiBase}/youtube/subtitles/retranslate`;
    const rounds = Math.max(1, Number(maxRounds || 8));

    let totalUpdated = 0;

    for (let i = 1; i <= rounds; i += 1) {
        const response = await axios.post(
            url,
            { video_id: Number(videoId) },
            { headers, timeout: 120000 }
        );

        const data = response.data || {};
        const updated = Number(data.updated || 0);
        totalUpdated += updated;

        console.log(`[retranslate] round ${i}: updated=${updated}, message=${data.message || ''}`);

        if (!updated) {
            break;
        }
    }

    return totalUpdated;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));

    const apiBase = resolveApiBase(args.api || process.env.API_BASE_URL || '');
    const videoId = Number(args['video-id'] || args.video_id || 0);
    const youtubeId = String(args['youtube-id'] || args.youtube_id || '').trim();
    const token = args.token || process.env.API_TOKEN || '';
    const lang = args.lang || process.env.SUBTITLE_LANG || '';
    const useLocalAi = Boolean(args['local-ai'] || args['use-local-ai'] || args['ollama-model'] || process.env.LOCAL_AI_TRANSLATE === '1');
    const ollamaUrl = String(args['ollama-url'] || process.env.OLLAMA_URL || 'http://127.0.0.1:11434').trim();
    const ollamaModel = String(args['ollama-model'] || process.env.OLLAMA_MODEL || 'qwen2.5:7b').trim();
    const ollamaChunkSize = Number(args['ollama-chunk-size'] || process.env.OLLAMA_CHUNK_SIZE || 18);
    const shouldRetranslate = Boolean(args['with-retranslate']) || (!args['skip-retranslate'] && !useLocalAi);
    const maxRounds = args['max-rounds'] || process.env.RETRANSLATE_MAX_ROUNDS || 8;

    if (!apiBase) {
        throw new Error('Thieu --api. Vi du: --api https://cenechinesesahdowvn.onrender.com/api');
    }

    if (!Number.isFinite(videoId) || videoId <= 0) {
        throw new Error('Thieu --video-id hop le. Vi du: --video-id 18');
    }

    if (!youtubeId) {
        throw new Error('Thieu --youtube-id. Vi du: --youtube-id R2DU85qLfJQ');
    }

    console.log(`[import] fetching transcript locally for youtubeId=${youtubeId}...`);
    const rows = await fetchTranscriptRows(youtubeId, lang);
    const subtitles = mapRowsToPayload(rows);

    if (!subtitles.length) {
        throw new Error('Transcript local rong sau khi map payload');
    }

    console.log(`[import] fetched ${subtitles.length} rows from local transcript`);

    let importSubtitles = subtitles;

    if (useLocalAi) {
        console.log(`[local-ai] translating with Ollama model=${ollamaModel}...`);
        importSubtitles = await translateSubtitlesWithOllama(subtitles, {
            url: ollamaUrl,
            model: ollamaModel,
            chunkSize: ollamaChunkSize,
        });

        const translatedCount = importSubtitles.filter((item) => normalizeTranslatedText(item.vn_text)).length;
        console.log(`[local-ai] translated ${translatedCount}/${importSubtitles.length} lines`);
    }

    const headers = buildHeaders(token);
    const importPayload = {
        video_id: videoId,
        youtube_id: youtubeId,
        subtitles: importSubtitles,
        replace_existing: true,
    };

    const importResult = await callImportEndpoint(apiBase, headers, importPayload);
    if (!importResult?.success) {
        throw new Error(importResult?.message || 'Import subtitles that bai');
    }

    console.log(
        `[import] success video_id=${importResult.video_id} imported=${importResult.imported} untranslated=${importResult.untranslated}`
    );

    if (shouldRetranslate) {
        const totalUpdated = await callRetranslateUntilDone(apiBase, headers, videoId, maxRounds);
        console.log(`[retranslate] done total_updated=${totalUpdated}`);
    } else {
        console.log('[retranslate] skipped');
    }
}

main().catch((error) => {
    console.error(`[error] ${error.message}`);
    process.exit(1);
});

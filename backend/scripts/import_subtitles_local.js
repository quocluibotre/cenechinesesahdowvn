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

function normalizeBooleanInput(value, fallback = false) {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'number') {
        return value !== 0;
    }

    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) {
        return fallback;
    }

    if (['1', 'true', 'yes', 'on', 'y'].includes(normalized)) {
        return true;
    }

    if (['0', 'false', 'no', 'off', 'n'].includes(normalized)) {
        return false;
    }

    return fallback;
}

function normalizeLimitedNumber(value, min, max, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function normalizeContextNote(value, maxLength = 220) {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

function normalizeContextState(raw, fallbackStyle = 'natural') {
    const source = raw && typeof raw === 'object' ? raw : {};
    const summary = normalizeContextNote(
        source.context_summary || source.summary || source.story_summary || '',
        1000
    );

    const policySource = Array.isArray(source.pronoun_policies)
        ? source.pronoun_policies
        : (Array.isArray(source.policies) ? source.policies : []);
    const pronounPolicies = [];
    for (const item of policySource) {
        const note = normalizeContextNote(item, 200);
        if (note && !pronounPolicies.includes(note)) {
            pronounPolicies.push(note);
        }
        if (pronounPolicies.length >= 12) {
            break;
        }
    }

    const characterSource = Array.isArray(source.character_notes)
        ? source.character_notes
        : (Array.isArray(source.characters) ? source.characters : []);
    const characterNotes = [];
    for (const item of characterSource) {
        if (typeof item === 'string') {
            const note = normalizeContextNote(item, 240);
            if (note && !characterNotes.includes(note)) {
                characterNotes.push(note);
            }
        } else if (item && typeof item === 'object') {
            const name = normalizeContextNote(item.name || item.character || item.person || '', 80);
            const relation = normalizeContextNote(item.relation || item.role || '', 120);
            const hint = normalizeContextNote(item.pronoun_hint || item.hint || '', 120);
            const note = [name, relation, hint].filter(Boolean).join(' - ');
            if (note && !characterNotes.includes(note)) {
                characterNotes.push(note);
            }
        }

        if (characterNotes.length >= 12) {
            break;
        }
    }

    return {
        style: normalizePronounStyle(source.style || source.pronoun_style || fallbackStyle),
        contextSummary: summary,
        pronounPolicies,
        characterNotes,
    };
}

function mergeContextState(baseState, nextState) {
    const merged = {
        style: normalizePronounStyle(nextState?.style || baseState?.style || 'natural'),
        contextSummary: normalizeContextNote(nextState?.contextSummary || '', 1000) || normalizeContextNote(baseState?.contextSummary || '', 1000),
        pronounPolicies: [],
        characterNotes: [],
    };

    const mergedPolicies = [];
    for (const item of [...(baseState?.pronounPolicies || []), ...(nextState?.pronounPolicies || [])]) {
        const note = normalizeContextNote(item, 200);
        if (note && !mergedPolicies.includes(note)) {
            mergedPolicies.push(note);
        }
        if (mergedPolicies.length >= 12) {
            break;
        }
    }
    merged.pronounPolicies = mergedPolicies;

    const mergedCharacters = [];
    for (const item of [...(baseState?.characterNotes || []), ...(nextState?.characterNotes || [])]) {
        const note = normalizeContextNote(item, 240);
        if (note && !mergedCharacters.includes(note)) {
            mergedCharacters.push(note);
        }
        if (mergedCharacters.length >= 12) {
            break;
        }
    }
    merged.characterNotes = mergedCharacters;

    return merged;
}

function buildGlobalContextHintText(state, maxChars = 1600) {
    const lines = [];
    const summary = normalizeContextNote(state?.contextSummary || '', 1000);
    if (summary) {
        lines.push(`Story context: ${summary}`);
    }

    const policies = Array.isArray(state?.pronounPolicies) ? state.pronounPolicies.filter(Boolean) : [];
    if (policies.length) {
        lines.push(`Pronoun policies: ${policies.join(' | ')}`);
    }

    const characters = Array.isArray(state?.characterNotes) ? state.characterNotes.filter(Boolean) : [];
    if (characters.length) {
        lines.push(`Character hints: ${characters.join(' | ')}`);
    }

    return lines.join('\n').slice(0, Math.max(300, Number(maxChars) || 1600));
}

function extractTranslationText(entry) {
    if (typeof entry === 'string') {
        return normalizeTranslatedText(entry);
    }

    if (!entry || typeof entry !== 'object') {
        return '';
    }

    const candidates = [
        entry.vn_text,
        entry.translation,
        entry.translated_text,
        entry.text,
        entry.vi,
        entry.value,
    ];

    for (const value of candidates) {
        if (typeof value === 'string' && value.trim()) {
            return normalizeTranslatedText(value);
        }
    }

    return '';
}

function extractTranslations(parsed, expectedCount) {
    let raw = null;

    if (Array.isArray(parsed)) {
        raw = parsed;
    } else if (Array.isArray(parsed?.translations)) {
        raw = parsed.translations;
    } else if (Array.isArray(parsed?.items)) {
        raw = parsed.items;
    } else if (expectedCount === 1) {
        if (typeof parsed === 'string') {
            raw = [parsed];
        } else if (typeof parsed?.translation === 'string') {
            raw = [parsed.translation];
        } else if (typeof parsed?.vn_text === 'string') {
            raw = [parsed.vn_text];
        } else if (typeof parsed?.text === 'string') {
            raw = [parsed.text];
        }
    }

    if (!Array.isArray(raw) || raw.length !== expectedCount) {
        return null;
    }

    const normalized = raw.map((entry) => extractTranslationText(entry));
    if (normalized.some((value) => !value)) {
        return null;
    }

    return normalized;
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

function normalizePronounStyle(value) {
    const normalized = String(value || '').trim().toLowerCase();

    if (['formal', 'neutral', 'toi-ban', 'toi_ban'].includes(normalized)) {
        return 'formal';
    }

    if (['intimate', 'close', 'than-mat', 'than_mat', 'family', 'anh-em', 'chi-em'].includes(normalized)) {
        return 'intimate';
    }

    return 'natural';
}

function buildPronounInstruction(pronounStyle, styleHint = '') {
    const lines = [
        'Use contextual Vietnamese pronouns and keep relationship consistent across adjacent lines.',
        'Do not default to "toi/ban" if the context is close, emotional, or family-like.',
        'Prefer natural pairs like "anh/em", "chi/em", "co/chau" when context supports them.',
        'If one line is ambiguous, infer from nearby lines and keep the chosen pronoun pair stable.',
    ];

    if (pronounStyle === 'formal') {
        lines.push('Bias toward polite-neutral pronouns unless close relationship is explicit.');
    } else if (pronounStyle === 'intimate') {
        lines.push('Bias toward close conversational pronouns in friend/family context when reasonable.');
    }

    const safeHint = String(styleHint || '').trim();
    if (safeHint) {
        lines.push(`Additional style hint: ${safeHint}`);
    }

    return lines.join(' ');
}

async function analyzeContextWindowWithOllama(chunk, config, previousState, startIndex) {
    const ollamaUrl = String(config?.url || '').replace(/\/$/, '');
    const model = String(config?.model || '').trim();

    if (!ollamaUrl) {
        throw new Error('Thieu ollama url');
    }

    if (!model) {
        throw new Error('Thieu ollama model');
    }

    const payload = chunk.map((item, index) => ({
        line_no: startIndex + index + 1,
        en_text: String(item?.en_text || '').trim(),
    })).filter((item) => item.en_text);

    if (!payload.length) {
        return normalizeContextState(previousState, previousState?.style || 'natural');
    }

    const prompt = [
        'You are a subtitle context analyst for English to Vietnamese translation.',
        'Read this subtitle window and infer relationship/tone for Vietnamese pronouns.',
        'Keep output compact and useful for consistent pronoun selection across dialogue.',
        'Return ONLY strict JSON object with fields:',
        '{"style":"formal|natural|intimate","context_summary":"...","pronoun_policies":["..."],"character_notes":["..."]}',
        'No markdown. No explanation outside JSON.',
        `Previous style: ${normalizePronounStyle(previousState?.style || 'natural')}`,
        `Previous summary: ${normalizeContextNote(previousState?.contextSummary || '', 600) || '(none)'}`,
        `Data: ${JSON.stringify(payload)}`,
    ].join('\n');

    const response = await axios.post(
        `${ollamaUrl}/api/chat`,
        {
            model,
            stream: false,
            format: 'json',
            options: {
                temperature: 0,
            },
            messages: [
                {
                    role: 'system',
                    content: 'You analyze subtitle context and output strict JSON only.',
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
    return normalizeContextState(parsed, previousState?.style || 'natural');
}

async function buildGlobalContextHintWithOllama(subtitles, config) {
    const items = Array.isArray(subtitles) ? subtitles : [];
    if (!items.length) {
        return {
            hint: '',
            suggestedPronounStyle: normalizePronounStyle(config?.pronounStyle || 'natural'),
        };
    }

    const windowSize = normalizeLimitedNumber(
        config?.contextWindowLines || process.env.LOCAL_AI_CONTEXT_WINDOW_LINES,
        20,
        260,
        120
    );
    const hintMaxChars = normalizeLimitedNumber(
        config?.contextMaxChars || process.env.LOCAL_AI_CONTEXT_MAX_CHARS,
        300,
        2800,
        1600
    );
    const chunks = chunkArray(items, windowSize);

    let state = normalizeContextState({
        style: normalizePronounStyle(config?.pronounStyle || 'natural'),
        context_summary: '',
        pronoun_policies: [],
        character_notes: [],
    }, 'natural');

    for (let i = 0; i < chunks.length; i += 1) {
        const chunk = chunks[i];
        try {
            const analyzed = await analyzeContextWindowWithOllama(chunk, config, state, i * windowSize);
            state = mergeContextState(state, analyzed);
            console.log(`[local-ai] context window ${i + 1}/${chunks.length} analyzed (${chunk.length} lines)`);
        } catch (error) {
            console.warn(`[local-ai] context window ${i + 1}/${chunks.length} skipped: ${error.message}`);
        }
    }

    return {
        hint: buildGlobalContextHintText(state, hintMaxChars),
        suggestedPronounStyle: normalizePronounStyle(state.style || config?.pronounStyle || 'natural'),
    };
}

async function translateChunkWithOllama(chunk, config) {
    const ollamaUrl = String(config?.url || '').replace(/\/$/, '');
    const model = String(config?.model || '').trim();
    const pronounStyle = normalizePronounStyle(config?.pronounStyle || process.env.LOCAL_AI_PRONOUN_STYLE || 'natural');
    const styleHint = String(config?.styleHint || process.env.LOCAL_AI_STYLE_HINT || '').trim();
    const globalContextHint = normalizeContextNote(config?.globalContextHint || '', 2200);

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
        'Keep meaning accurate, concise, and fluent for spoken dialogue.',
        globalContextHint ? `Global context from full script: ${globalContextHint}` : '',
        buildPronounInstruction(pronounStyle, styleHint),
        'Prefer meaning-equivalent translation over literal word-by-word translation.',
        `Return ONLY strict JSON: {"translations": ["...", "..."]} with exactly ${chunk.length} items in the same order.`,
        `Input: ${JSON.stringify(payload)}`,
    ].filter(Boolean).join('\n');

    const response = await axios.post(
        `${ollamaUrl}/api/chat`,
        {
            model,
            stream: false,
            format: 'json',
            options: {
                temperature: 0,
            },
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

    const translations = extractTranslations(parsed, chunk.length);

    if (!Array.isArray(translations) || translations.length !== chunk.length) {
        throw new Error('Ollama output khong dung so luong cau');
    }

    return chunk.map((item, index) => ({
        ...item,
        vn_text: normalizeTranslatedText(translations[index]),
    }));
}

async function translateChunkWithFallback(chunk, config) {
    try {
        return await translateChunkWithOllama(chunk, config);
    } catch (error) {
        if (chunk.length <= 1) {
            throw error;
        }

        // Keep local context by recursively splitting chunks before per-line fallback.
        if (chunk.length > 2) {
            const middle = Math.ceil(chunk.length / 2);

            try {
                const left = await translateChunkWithFallback(chunk.slice(0, middle), config);
                const right = await translateChunkWithFallback(chunk.slice(middle), config);
                return [...left, ...right];
            } catch {
                // Continue to per-line fallback below.
            }
        }

        const output = [];
        let recovered = 0;

        for (const item of chunk) {
            try {
                const translatedSingle = await translateChunkWithOllama([item], config);
                output.push(translatedSingle[0]);
                recovered += 1;
            } catch {
                output.push({ ...item, vn_text: '' });
            }
        }

        if (!recovered) {
            throw error;
        }

        console.warn(`[local-ai] fallback per-line recovered ${recovered}/${chunk.length} lines`);
        return output;
    }
}

async function translateSubtitlesWithOllama(subtitles, config) {
    const chunkSize = Math.max(4, Math.min(60, Number(config?.chunkSize || 18)));
    const chunks = chunkArray(subtitles, chunkSize);
    const output = [];
    const requestedPronounStyle = normalizePronounStyle(config?.pronounStyle || process.env.LOCAL_AI_PRONOUN_STYLE || 'natural');
    const hasExplicitPronounStyle = normalizeBooleanInput(config?.hasExplicitPronounStyle, false);
    const shouldUseGlobalContext = normalizeBooleanInput(
        config?.useGlobalContext ?? process.env.LOCAL_AI_GLOBAL_CONTEXT,
        false
    );

    let effectivePronounStyle = requestedPronounStyle;
    let globalContextHint = '';

    if (shouldUseGlobalContext) {
        const contextResult = await buildGlobalContextHintWithOllama(subtitles, {
            ...config,
            pronounStyle: requestedPronounStyle,
        });

        globalContextHint = String(contextResult?.hint || '').trim();
        if (!hasExplicitPronounStyle && contextResult?.suggestedPronounStyle) {
            effectivePronounStyle = normalizePronounStyle(contextResult.suggestedPronounStyle);
        }

        if (globalContextHint) {
            console.log(`[local-ai] global context ready (style=${effectivePronounStyle})`);
        } else {
            console.warn('[local-ai] global context enabled but empty; continue with chunk-only context');
        }
    }

    const runtimeConfig = {
        ...config,
        pronounStyle: effectivePronounStyle,
        globalContextHint,
    };

    for (let i = 0; i < chunks.length; i += 1) {
        const chunk = chunks[i];
        try {
            const translated = await translateChunkWithFallback(chunk, runtimeConfig);
            output.push(...translated);
            const translatedCount = translated.filter((item) => normalizeTranslatedText(item.vn_text)).length;

            if (translatedCount === translated.length) {
                console.log(`[local-ai] chunk ${i + 1}/${chunks.length} translated (${translated.length} lines)`);
            } else {
                console.warn(`[local-ai] chunk ${i + 1}/${chunks.length} partial (${translatedCount}/${translated.length} lines)`);
            }
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

function estimatePayloadBytes(payload) {
    try {
        return Buffer.byteLength(JSON.stringify(payload), 'utf8');
    } catch {
        return Number.MAX_SAFE_INTEGER;
    }
}

function buildImportPayloadChunks({
    videoId,
    youtubeId,
    subtitles,
    replaceExisting = true,
    maxBytes = 85000,
}) {
    const items = Array.isArray(subtitles) ? subtitles : [];
    if (!items.length) {
        return [];
    }

    const safeMaxBytes = normalizeLimitedNumber(maxBytes, 20000, 5 * 1024 * 1024, 85000);
    const chunks = [];
    let currentChunk = [];

    const buildPayload = (rows, shouldReplace) => ({
        video_id: videoId,
        youtube_id: youtubeId,
        subtitles: rows,
        replace_existing: shouldReplace,
    });

    for (const row of items) {
        const candidateChunk = [...currentChunk, row];
        const candidatePayload = buildPayload(candidateChunk, false);
        const candidateBytes = estimatePayloadBytes(candidatePayload);

        if (candidateBytes > safeMaxBytes && currentChunk.length > 0) {
            chunks.push(currentChunk);
            currentChunk = [row];
            continue;
        }

        currentChunk = candidateChunk;
    }

    if (currentChunk.length) {
        chunks.push(currentChunk);
    }

    return chunks.map((rows, index) => buildPayload(rows, index === 0 ? replaceExisting !== false : false));
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
    const rawPronounStyle = args['pronoun-style'] ?? process.env.LOCAL_AI_PRONOUN_STYLE ?? '';
    const pronounStyle = String(rawPronounStyle || 'natural').trim();
    const hasExplicitPronounStyle = String(rawPronounStyle || '').trim().length > 0;
    const styleHint = String(args['style-hint'] || process.env.LOCAL_AI_STYLE_HINT || '').trim();
    const useGlobalContext = normalizeBooleanInput(
        args['global-context'] ?? process.env.LOCAL_AI_GLOBAL_CONTEXT,
        false
    );
    const contextWindowLines = normalizeLimitedNumber(
        args['context-window-lines'] || process.env.LOCAL_AI_CONTEXT_WINDOW_LINES,
        20,
        260,
        120
    );
    const contextMaxChars = normalizeLimitedNumber(
        args['context-max-chars'] || process.env.LOCAL_AI_CONTEXT_MAX_CHARS,
        300,
        2800,
        1600
    );
    const importMaxBytes = normalizeLimitedNumber(
        args['import-max-bytes'] || process.env.SUBTITLE_IMPORT_MAX_BYTES,
        20000,
        5 * 1024 * 1024,
        85000
    );
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
        console.log(
            `[local-ai] translating with Ollama model=${ollamaModel}, pronoun_style=${normalizePronounStyle(pronounStyle)}, global_context=${useGlobalContext ? 'on' : 'off'}...`
        );
        importSubtitles = await translateSubtitlesWithOllama(subtitles, {
            url: ollamaUrl,
            model: ollamaModel,
            chunkSize: ollamaChunkSize,
            pronounStyle,
            hasExplicitPronounStyle,
            styleHint,
            useGlobalContext,
            contextWindowLines,
            contextMaxChars,
        });

        const translatedCount = importSubtitles.filter((item) => normalizeTranslatedText(item.vn_text)).length;
        console.log(`[local-ai] translated ${translatedCount}/${importSubtitles.length} lines`);
    }

    const headers = buildHeaders(token);
    const importPayloadChunks = buildImportPayloadChunks({
        videoId,
        youtubeId,
        subtitles: importSubtitles,
        replaceExisting: true,
        maxBytes: importMaxBytes,
    });

    if (!importPayloadChunks.length) {
        throw new Error('Khong tao duoc payload import tu danh sach subtitle');
    }

    console.log(
        `[import] uploading ${importSubtitles.length} lines in ${importPayloadChunks.length} chunk(s) (max_bytes=${importMaxBytes})`
    );

    let importedTotal = 0;
    let untranslatedTotal = 0;
    let resolvedVideoId = videoId;

    for (let i = 0; i < importPayloadChunks.length; i += 1) {
        const payload = importPayloadChunks[i];
        const payloadBytes = estimatePayloadBytes(payload);
        const importResult = await callImportEndpoint(apiBase, headers, payload);

        if (!importResult?.success) {
            throw new Error(importResult?.message || `Import subtitles that bai o chunk ${i + 1}`);
        }

        const importedCount = Number(importResult.imported || payload.subtitles.length || 0);
        const untranslatedCount = Number(importResult.untranslated || 0);

        importedTotal += importedCount;
        untranslatedTotal += untranslatedCount;
        resolvedVideoId = Number(importResult.video_id || resolvedVideoId || videoId);

        console.log(
            `[import] chunk ${i + 1}/${importPayloadChunks.length} success imported=${importedCount} untranslated=${untranslatedCount} bytes=${payloadBytes}`
        );
    }

    console.log(
        `[import] success video_id=${resolvedVideoId} imported=${importedTotal} untranslated=${untranslatedTotal} chunks=${importPayloadChunks.length}`
    );

    if (shouldRetranslate) {
        const totalUpdated = await callRetranslateUntilDone(apiBase, headers, videoId, maxRounds);
        console.log(`[retranslate] done total_updated=${totalUpdated}`);
    } else {
        console.log('[retranslate] skipped');
    }
}

main().catch((error) => {
    const responsePayload = error?.response?.data;
    if (responsePayload) {
        const details = typeof responsePayload === 'string'
            ? responsePayload
            : JSON.stringify(responsePayload);
        console.error(`[error] ${error.message} | response=${details}`);
    } else {
        console.error(`[error] ${error.message}`);
    }
    process.exit(1);
});

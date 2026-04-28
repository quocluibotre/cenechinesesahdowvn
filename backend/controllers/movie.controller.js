const https = require('https');
const http = require('http');
const db = require('../config/db.config');

const OPENSUBTITLES_API_KEY = process.env.OPENSUBTITLES_API_KEY || '';
const OPENSUBTITLES_API_BASE = 'https://api.opensubtitles.com/api/v1';
const APP_USER_AGENT = process.env.OPENSUBTITLES_APP_NAME || 'CineShadow v1.0';
const OMDB_API_KEY = process.env.OMDB_API_KEY || '8b7f7ee1';


// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract IMDB ID (tt\d+) from a URL or plain ID input.
 * Accepts: "tt12042730", "12042730", "https://www.imdb.com/title/tt12042730/"
 */
const extractImdbId = (input) => {
  const str = String(input || '').trim();
  if (!str) return null;
  if (/^tt\d+$/.test(str)) return str;
  const urlMatch = str.match(/\/title\/(tt\d+)/i);
  if (urlMatch) return urlMatch[1];
  if (/^\d+$/.test(str)) return `tt${str}`;
  return null;
};

/**
 * Convert SRT timestamp (HH:MM:SS,mmm or HH:MM:SS.mmm) to seconds.
 */
const srtTimeToSeconds = (ts) => {
  const normalized = String(ts || '').replace(',', '.');
  const parts = normalized.split(':');
  if (parts.length !== 3) return 0;
  return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
};

/**
 * Parse SRT file content into [{start_time, end_time, text}] rows (language-agnostic).
 */
const parseSrt = (content) => {
  const lines = String(content || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n');

  const subtitles = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line || /^\d+$/.test(line)) {
      i++;
      continue;
    }

    const timingMatch = line.match(
      /^(\d{1,2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,\.]\d{3})/
    );

    if (timingMatch) {
      const start = srtTimeToSeconds(timingMatch[1]);
      const end = srtTimeToSeconds(timingMatch[2]);
      i++;

      const textLines = [];
      while (i < lines.length && lines[i].trim() !== '') {
        textLines.push(lines[i].trim());
        i++;
      }

      const text = textLines
        .join(' ')
        .replace(/<[^>]+>/g, '')
        .replace(/\{[^}]+\}/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (text && end > start) {
        subtitles.push({ start_time: start, end_time: end, text });
      }
      continue;
    }

    i++;
  }

  return subtitles;
};

/**
 * Get duration (seconds) of a parsed subtitle array = last end_time.
 */
const getSubDuration = (subs) =>
  subs.length ? Math.max(...subs.map((s) => s.end_time)) : 0;

/**
 * Merge VI subtitles into EN rows by time overlap.
 * For each EN row, find the VI subtitle with the most overlap, attach its text as vn_text.
 */
const mergeByTimeOverlap = (enSubs, viSubs) => {
  if (!viSubs.length) return enSubs.map((s) => ({ ...s, vn_text: null }));

  return enSubs.map((en) => {
    let bestVi = null;
    let bestOverlap = 0;

    for (const vi of viSubs) {
      const overlapStart = Math.max(en.start_time, vi.start_time);
      const overlapEnd = Math.min(en.end_time, vi.end_time);
      const overlap = Math.max(0, overlapEnd - overlapStart);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestVi = vi;
      }
    }

    // Accept match only if overlap > 20% of EN duration
    const enDuration = en.end_time - en.start_time;
    const threshold = enDuration * 0.2;
    return {
      ...en,
      vn_text: (bestVi && bestOverlap >= threshold) ? bestVi.text : null,
    };
  });
};

/**
 * Simple HTTPS/HTTP GET that returns the response body as a string.
 */
const fetchText = (url) =>
  new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(
      url,
      { headers: { 'User-Agent': APP_USER_AGENT } },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => resolve(data));
      }
    );
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('fetchText timeout')); });
  });

/**
 * Generic OpenSubtitles REST API call.
 */
const openSubtitlesRequest = (method, path, body = null) =>
  new Promise((resolve, reject) => {
    const url = `${OPENSUBTITLES_API_BASE}${path}`;
    const options = {
      method,
      headers: {
        'Api-Key': OPENSUBTITLES_API_KEY,
        'User-Agent': APP_USER_AGENT,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };

    const req = https.request(url, options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, data: raw });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('OpenSubtitles timeout')); });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });

/**
 * Search OpenSubtitles for subtitle candidates for a given IMDB ID and language.
 * Returns array of candidates sorted by download_count DESC (SRT preferred).
 */
const searchCandidates = async (numericImdbId, language) => {
  const res = await openSubtitlesRequest(
    'GET',
    `/subtitles?imdb_id=${numericImdbId}&languages=${language}&type=movie&order_by=download_count&order_direction=desc`
  );

  if (res.status !== 200 || !Array.isArray(res.data?.data)) return [];

  const items = res.data.data;
  const srts = items.filter((item) => {
    const fmt = String(item?.attributes?.format || '').toLowerCase();
    const fname = String(item?.attributes?.files?.[0]?.file_name || '').toLowerCase();
    return fmt === 'srt' || fname.endsWith('.srt');
  });

  return (srts.length ? srts : items).map((item) => ({
    file_id: item?.attributes?.files?.[0]?.file_id,
    file_name: item?.attributes?.files?.[0]?.file_name || '',
    release: item?.attributes?.release || '',
    download_count: item?.attributes?.download_count || 0,
    format: item?.attributes?.format || 'srt',
    fps: item?.attributes?.fps || '',
    ratings: item?.attributes?.ratings || 0,
  })).filter((c) => c.file_id);
};

/**
 * Download subtitle: POST /download with file_id → get link → fetch text → parse SRT.
 * Returns parsed array or null on failure.
 */
const downloadAndParse = async (fileId) => {
  const dlRes = await openSubtitlesRequest('POST', '/download', { file_id: fileId });
  if (dlRes.status !== 200 || !dlRes.data?.link) return null;

  const srtContent = await fetchText(dlRes.data.link);
  const parsed = parseSrt(srtContent);
  return parsed.length ? parsed : null;
};

/**
 * Pick the best candidate whose subtitle duration is within `tolerance` of `targetDuration`.
 * Falls back to highest-download candidate if none match.
 * maxTry: max number of candidates to download before giving up.
 */
const pickBestByDuration = async (candidates, targetDuration, tolerance = 0.15, maxTry = 3) => {
  const tries = candidates.slice(0, maxTry);

  for (const candidate of tries) {
    const parsed = await downloadAndParse(candidate.file_id);
    if (!parsed) continue;

    const dur = getSubDuration(parsed);

    // If no target duration yet (first download), accept any valid file
    if (!targetDuration || targetDuration <= 0) {
      return { parsed, candidate, duration: dur };
    }

    const deviation = Math.abs(dur - targetDuration) / targetDuration;
    if (deviation <= tolerance) {
      return { parsed, candidate, duration: dur };
    }

    console.log(`[movie] ${candidate.language || '?'} candidate "${candidate.release}" duration ${dur}s deviates ${(deviation*100).toFixed(1)}% from target ${targetDuration}s — skipping`);
  }

  // Fallback: return the first successfully parsed one
  for (const candidate of tries) {
    const parsed = await downloadAndParse(candidate.file_id);
    if (parsed) {
      return { parsed, candidate, duration: getSubDuration(parsed) };
    }
  }

  return null;
};

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/movie/process
 */
exports.processImdbMovie = async (req, res) => {
  try {
    const {
      imdb_url, title, title_en, description,
      category_id, hsk_level, thumbnail_url, is_published, is_free,
    } = req.body;

    const imdbId = extractImdbId(imdb_url);
    if (!imdbId) {
      return res.status(400).json({ success: false, message: 'IMDB URL/ID không hợp lệ.' });
    }
    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: 'Tiêu đề phim là bắt buộc' });
    }

    const video_url = `imdb:${imdbId}`;

    const [result] = await db.promise().query(
      `INSERT INTO videos
         (title, title_cn, description, category_id, hsk_level, language_track,
          video_url, thumbnail_url, is_published, is_free, duration, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'english', ?, ?, ?, ?, 0, NOW(), NOW())`,
      [
        String(title).trim(),
        String(title_en || title).trim(),
        String(description || '').trim(),
        category_id ? Number(category_id) : null,
        Number(hsk_level || 1),
        video_url,
        String(thumbnail_url || '').trim(),
        is_published ? 1 : 0,
        is_free !== false ? 1 : 0,
      ]
    );

    return res.json({
      success: true,
      message: `Đã lưu phim "${title}" (${imdbId})`,
      data: { id: result.insertId, imdb_id: imdbId, video_url },
    });
  } catch (error) {
    console.error('processImdbMovie error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/movie/subtitles/import
 * Body: { video_id, imdb_id? }
 *
 * Flow:
 *  1. Search EN candidates on OpenSubtitles
 *  2. Download best EN → parse → get movie duration
 *  3. Search VI candidates
 *  4. Download best VI that matches the movie duration (±15%)
 *  5. Merge EN + VI by time overlap
 *  6. Save merged rows to DB
 */
exports.fetchAndImportSubtitles = async (req, res) => {
  try {
    const { video_id, imdb_id: rawImdbId, en_file_id, vi_file_id } = req.body;

    if (!video_id) {
      return res.status(400).json({ success: false, message: 'Thiếu video_id' });
    }

    let imdbId = extractImdbId(rawImdbId);
    if (!imdbId) {
      const [[video]] = await db.promise().query(
        'SELECT video_url FROM videos WHERE id = ?',
        [Number(video_id)]
      );
      if (!video) return res.status(404).json({ success: false, message: 'Không tìm thấy video' });
      const m = String(video.video_url || '').match(/^imdb:(tt\d+)$/);
      if (!m) return res.status(400).json({ success: false, message: 'Video này không phải phim IMDB' });
      imdbId = m[1];
    }

    if (!OPENSUBTITLES_API_KEY) {
      return res.status(500).json({ success: false, message: 'OPENSUBTITLES_API_KEY chưa được cấu hình' });
    }

    const numericId = imdbId.replace('tt', '');

    // ── 1. Download EN (dùng file_id đã chọn hoặc auto-pick) ────────────────
    let enResult;
    if (en_file_id) {
      console.log(`[movie] Using manually selected EN file_id=${en_file_id}`);
      const parsed = await downloadAndParse(en_file_id);
      if (!parsed) return res.status(502).json({ success: false, message: 'Không tải được phụ đề EN đã chọn' });
      enResult = { parsed, candidate: { file_id: en_file_id, release: 'manual' }, duration: getSubDuration(parsed) };
    } else {
      console.log(`[movie] Searching EN subtitles for ${imdbId}...`);
      const enCandidates = await searchCandidates(numericId, 'en');
      if (!enCandidates.length) {
        return res.status(404).json({ success: false, message: `Không tìm thấy phụ đề tiếng Anh cho ${imdbId}` });
      }
      enResult = await pickBestByDuration(enCandidates, 0);
      if (!enResult) return res.status(502).json({ success: false, message: 'Không tải được phụ đề EN' });
    }

    const enSubs = enResult.parsed;
    const movieDuration = enResult.duration;
    console.log(`[movie] EN: ${enSubs.length} lines, duration ~${Math.round(movieDuration)}s`);

    // ── 2. Download VI (dùng file_id đã chọn hoặc auto-pick) ────────────────
    let viSubs = [];
    let viName = null;

    if (vi_file_id) {
      console.log(`[movie] Using manually selected VI file_id=${vi_file_id}`);
      const parsed = await downloadAndParse(vi_file_id);
      if (parsed) {
        viSubs = parsed;
        viName = 'manual';
        console.log(`[movie] VI (manual): ${viSubs.length} lines`);
      }
    } else {
      console.log(`[movie] Searching VI subtitles for ${imdbId}...`);
      const viCandidates = await searchCandidates(numericId, 'vi');
      if (viCandidates.length) {
        const viResult = await pickBestByDuration(viCandidates, movieDuration, 0.15, 4);
        if (viResult) {
          viSubs = viResult.parsed;
          viName = viResult.candidate.release || viResult.candidate.file_name;
          console.log(`[movie] VI: ${viSubs.length} lines, duration ~${Math.round(viResult.duration)}s`);
        } else {
          console.log('[movie] No matching VI subtitle found');
        }
      } else {
        console.log('[movie] No VI subtitles found on OpenSubtitles');
      }
    }


    // ── 3. Merge EN + VI by time overlap ────────────────────────────────────
    const merged = mergeByTimeOverlap(enSubs, viSubs);
    const viMatched = merged.filter((s) => s.vn_text).length;
    console.log(`[movie] Merged: ${merged.length} EN lines, ${viMatched} with VI match`);

    // ── 4. Update movie duration in DB ──────────────────────────────────────
    await db.promise().query(
      'UPDATE videos SET duration = ? WHERE id = ?',
      [Math.round(movieDuration), Number(video_id)]
    );

    // ── 5. Save to DB ────────────────────────────────────────────────────────
    await db.promise().query('DELETE FROM subtitles WHERE video_id = ?', [Number(video_id)]);

    const values = merged.map((s) => [
      Number(video_id),
      s.start_time,
      s.end_time,
      s.text,        // en_text
      s.vn_text || null,
    ]);

    await db.promise().query(
      'INSERT INTO subtitles (video_id, start_time, end_time, en_text, vn_text) VALUES ?',
      [values]
    );

    return res.json({
      success: true,
      message: `Đã lưu ${merged.length} dòng phụ đề EN${viSubs.length ? ` + ${viMatched} dòng VI` : ' (không tìm thấy VI)'}`,
      count: merged.length,
      en_count: enSubs.length,
      vi_count: viMatched,
      movie_duration_s: Math.round(movieDuration),
      en_name: enResult.candidate.release || enResult.candidate.file_name,
      vi_name: viName || null,
      imdb_id: imdbId,
    });
  } catch (error) {
    console.error('fetchAndImportSubtitles error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/movie/subtitles/:videoId
 */
exports.getMovieSubtitles = async (req, res) => {
  try {
    const { videoId } = req.params;
    const [rows] = await db.promise().query(
      'SELECT id, start_time, end_time, en_text, vn_text FROM subtitles WHERE video_id = ? ORDER BY start_time ASC',
      [Number(videoId)]
    );
    return res.json({ success: true, data: rows, count: rows.length });
  } catch (error) {
    console.error('getMovieSubtitles error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/movie/search-subtitles
 * Query: ?imdb_id=tt12042730
 * Returns top EN + VI candidates for admin preview.
 */
exports.searchSubtitleCandidates = async (req, res) => {
  try {
    const imdbId = extractImdbId(req.query.imdb_id);
    if (!imdbId) {
      return res.status(400).json({ success: false, message: 'Thiếu hoặc sai imdb_id' });
    }
    if (!OPENSUBTITLES_API_KEY) {
      return res.status(500).json({ success: false, message: 'OPENSUBTITLES_API_KEY chưa được cấu hình' });
    }

    const numericId = imdbId.replace('tt', '');

    // Search both EN and VI in parallel
    const [enCandidates, viCandidates] = await Promise.all([
      searchCandidates(numericId, 'en'),
      searchCandidates(numericId, 'vi'),
    ]);

    return res.json({
      success: true,
      imdb_id: imdbId,
      en: enCandidates.slice(0, 8),
      vi: viCandidates.slice(0, 8),
    });
  } catch (error) {
    console.error('searchSubtitleCandidates error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Helper: fetch JSON via https ─────────────────────────────────────────────
const fetchJson = (url) => new Promise((resolve, reject) => {
  const lib = url.startsWith('https') ? https : http;
  lib.get(url, (res) => {
    let data = '';
    res.on('data', (c) => { data += c; });
    res.on('end', () => {
      try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
    });
  }).on('error', reject);
});

/**
 * POST /api/movie/auto-import
 * Body: { imdb_url, category_id?, hsk_level?, is_published?, is_free? }
 *
 * One-shot flow:
 *  1. Lấy thông tin phim từ OMDb (title, poster, plot)
 *  2. Lưu video vào DB
 *  3. Tự tìm + tải phụ đề EN + VI tốt nhất
 */
exports.autoImportMovie = async (req, res) => {
  try {
    const { imdb_url, category_id, hsk_level = 3, is_published = true, is_free = true } = req.body;

    // 1. Extract IMDB ID
    const imdbId = extractImdbId(imdb_url);
    if (!imdbId) {
      return res.status(400).json({ success: false, message: 'IMDB URL/ID không hợp lệ' });
    }

    // 2. Fetch OMDb
    console.log(`[auto-import] Fetching OMDb for ${imdbId}...`);
    const omdb = await fetchJson(
      `https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_API_KEY}&plot=full`
    );

    if (omdb.Response !== 'True') {
      return res.status(404).json({ success: false, message: `OMDb: ${omdb.Error || 'Không tìm thấy phim'}` });
    }

    const title    = omdb.Title || imdbId;
    const poster   = omdb.Poster !== 'N/A' ? omdb.Poster : '';
    const plot     = omdb.Plot   !== 'N/A' ? omdb.Plot   : '';
    const video_url = `imdb:${imdbId}`;

    // 3. Insert video into DB (upsert by video_url to avoid duplicates)
    const [[existing]] = await db.promise().query(
      'SELECT id FROM videos WHERE video_url = ? LIMIT 1', [video_url]
    );

    let videoId;
    if (existing) {
      videoId = existing.id;
      await db.promise().query(
        `UPDATE videos SET title=?, title_cn=?, description=?, thumbnail_url=?,
         category_id=?, hsk_level=?, is_published=?, is_free=?, updated_at=NOW() WHERE id=?`,
        [title, title, plot, poster,
         category_id ? Number(category_id) : null,
         Number(hsk_level),
         is_published ? 1 : 0,
         is_free !== false ? 1 : 0,
         videoId]
      );
      console.log(`[auto-import] Updated existing video #${videoId}`);
    } else {
      const [result] = await db.promise().query(
        `INSERT INTO videos
           (title, title_cn, description, category_id, hsk_level, language_track,
            video_url, thumbnail_url, is_published, is_free, duration, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'english', ?, ?, ?, ?, 0, NOW(), NOW())`,
        [title, title, plot,
         category_id ? Number(category_id) : null,
         Number(hsk_level),
         video_url, poster,
         is_published ? 1 : 0,
         is_free !== false ? 1 : 0]
      );
      videoId = result.insertId;
      console.log(`[auto-import] Inserted video #${videoId}`);
    }

    // 4. Import subtitles (auto-pick best EN + VI)
    let subMessage = '';
    if (OPENSUBTITLES_API_KEY) {
      try {
        const numericId = imdbId.replace('tt', '');

        // EN
        const enCandidates = await searchCandidates(numericId, 'en');
        let enSubs = [], movieDuration = 0;
        if (enCandidates.length) {
          const enResult = await pickBestByDuration(enCandidates, 0);
          if (enResult) {
            enSubs = enResult.parsed;
            movieDuration = enResult.duration;
          }
        }

        // VI
        let viSubs = [];
        const viCandidates = await searchCandidates(numericId, 'vi');
        if (viCandidates.length && movieDuration > 0) {
          const viResult = await pickBestByDuration(viCandidates, movieDuration, 0.15, 4);
          if (viResult) viSubs = viResult.parsed;
        }

        if (enSubs.length) {
          const merged = mergeByTimeOverlap(enSubs, viSubs);
          await db.promise().query('DELETE FROM subtitles WHERE video_id = ?', [videoId]);
          const values = merged.map((s) => [videoId, s.start_time, s.end_time, s.text, s.vn_text || null]);
          await db.promise().query(
            'INSERT INTO subtitles (video_id, start_time, end_time, en_text, vn_text) VALUES ?', [values]
          );
          if (movieDuration > 0) {
            await db.promise().query('UPDATE videos SET duration=? WHERE id=?', [Math.round(movieDuration), videoId]);
          }
          const viMatched = merged.filter((s) => s.vn_text).length;
          subMessage = `Đã tải ${merged.length} dòng EN${viSubs.length ? ` + ${viMatched} dòng VI` : ''}`;
        } else {
          subMessage = 'Không tìm thấy phụ đề EN';
        }
      } catch (subErr) {
        console.error('[auto-import] subtitle error:', subErr.message);
        subMessage = `Lỗi phụ đề: ${subErr.message}`;
      }
    } else {
      subMessage = 'Bỏ qua phụ đề (chưa cấu hình OPENSUBTITLES_API_KEY)';
    }

    return res.json({
      success: true,
      message: `✅ Đã thêm "${title}" — ${subMessage}`,
      data: { id: videoId, imdb_id: imdbId, title, thumbnail_url: poster },
    });
  } catch (error) {
    console.error('autoImportMovie error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import UserPanelDrawer from '../components/layout/UserPanelDrawer';
import VideoThumbnail from '../components/ui/VideoThumbnail';
import { API_BASE } from '../utils/apiBase';

const API_ORIGIN = API_BASE.endsWith('/api') ? API_BASE.slice(0, -4) : API_BASE;

const jsonHeaders = {
  Accept: 'application/json, text/plain;q=0.9, */*;q=0.8',
};

const parseVttTime = (input) => {
  const token = String(input || '')
    .replace(/\uFEFF/g, '')
    .trim()
    .split(/\s+/)[0]
    .replace(',', '.');

  if (!token) return 0;

  const parts = token.split(':');
  if (parts.length === 3) {
    return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
  }
  if (parts.length === 2) {
    return Number(parts[0]) * 60 + Number(parts[1]);
  }

  const parsed = Number(token);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseVtt = (raw) => {
  const lines = raw.split(/\r?\n/);
  const entries = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line || line === 'WEBVTT') {
      i += 1;
      continue;
    }

    const timingMatch = line.match(/^(.+?)\s*-->\s*(.+)$/);
    if (timingMatch) {
      const start = parseVttTime(timingMatch[1]);
      const end = parseVttTime(timingMatch[2]);

      i += 1;
      const textLines = [];
      while (i < lines.length && lines[i].trim() && !lines[i].includes('-->')) {
        textLines.push(lines[i].trim());
        i += 1;
      }

      const text = textLines.join(' ').replace(/<[^>]+>/g, '').trim();
      if (text && end > start) {
        entries.push({ start, end, text });
      }
      continue;
    }

    i += 1;
  }

  return entries;
};

const findSubtitleIndex = (subs, time) => {
  if (!subs.length) return -1;
  for (let i = 0; i < subs.length; i += 1) {
    if (time >= subs[i].start && time <= subs[i].end) {
      return i;
    }
  }
  return -1;
};

const SUBTITLE_MAX_VISIBLE_CHARS = 220;
const SUBTITLE_MAX_HIGHLIGHT_WORDS = 48;
const DB_SUBTITLE_CHUNK_MAX_WORDS = 14;
const DB_SUBTITLE_CHUNK_MAX_CHARS = 88;
const DB_SUBTITLE_CHUNK_MIN_DURATION = 0.55;

const sanitizeSubtitleText = (value, maxChars = SUBTITLE_MAX_VISIBLE_CHARS) => {
  const normalized = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return '';
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars).trimEnd()}...`;
};

const parseWordTimings = (value) => {
  if (!value) return null;
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return null;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const splitSubtitleSentences = (text) => {
  const normalized = sanitizeSubtitleText(text, 2000);
  if (!normalized) return [];

  const parts = normalized.match(/[^.!?]+(?:[.!?]+|$)/g);
  if (!parts || !parts.length) return [normalized];
  return parts.map((item) => item.trim()).filter(Boolean);
};

const splitSubtitleByWords = (text, maxWords = DB_SUBTITLE_CHUNK_MAX_WORDS, maxChars = DB_SUBTITLE_CHUNK_MAX_CHARS) => {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const chunks = [];
  let current = [];

  words.forEach((word) => {
    const candidate = current.length ? `${current.join(' ')} ${word}` : word;
    const shouldBreak = current.length >= maxWords || candidate.length > maxChars;

    if (shouldBreak && current.length) {
      chunks.push(current.join(' '));
      current = [word];
      return;
    }

    current.push(word);
  });

  if (current.length) {
    chunks.push(current.join(' '));
  }

  return chunks;
};

const buildSubtitleChunks = (text, maxWords = DB_SUBTITLE_CHUNK_MAX_WORDS, maxChars = DB_SUBTITLE_CHUNK_MAX_CHARS) => {
  const normalized = sanitizeSubtitleText(text, 4000);
  if (!normalized) return [];

  const sentenceParts = splitSubtitleSentences(normalized);
  const chunks = [];

  sentenceParts.forEach((part) => {
    const wordCount = part.split(/\s+/).filter(Boolean).length;
    if (wordCount <= maxWords && part.length <= maxChars) {
      chunks.push(part);
      return;
    }

    chunks.push(...splitSubtitleByWords(part, maxWords, maxChars));
  });

  return chunks.filter(Boolean);
};

const mergeChunksToCount = (chunks, targetCount) => {
  if (!Array.isArray(chunks) || !chunks.length) return [];
  if (targetCount <= 1) return [chunks.join(' ').trim()];
  if (chunks.length === targetCount) return chunks;

  const merged = [];
  for (let i = 0; i < targetCount; i += 1) {
    const from = Math.floor((i * chunks.length) / targetCount);
    const to = Math.floor(((i + 1) * chunks.length) / targetCount);
    const piece = chunks.slice(from, to).join(' ').trim();
    if (piece) {
      merged.push(piece);
    }
  }

  return merged.length ? merged : [chunks.join(' ').trim()];
};

const splitTextToChunkCount = (text, chunkCount, maxWords = 16, maxChars = 96) => {
  const normalized = sanitizeSubtitleText(text, 5000);
  if (chunkCount <= 1) return [normalized];
  if (!normalized) return Array.from({ length: chunkCount }, () => '');

  const natural = buildSubtitleChunks(normalized, maxWords, maxChars);
  if (natural.length >= chunkCount) {
    return natural.length === chunkCount ? natural : mergeChunksToCount(natural, chunkCount);
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  const averageWords = Math.max(1, Math.ceil(words.length / chunkCount));
  const rawWordChunks = splitSubtitleByWords(normalized, averageWords, maxChars);
  const balanced = rawWordChunks.length >= chunkCount
    ? mergeChunksToCount(rawWordChunks, chunkCount)
    : [...rawWordChunks];

  while (balanced.length < chunkCount) {
    balanced.push(balanced[balanced.length - 1] || normalized);
  }

  return balanced;
};

const HARD_BREAK_CHARS = new Set(['.', ',', '!', '?', ';', ':', '\u3002', '\uff01', '\uff1f', '\uff1b', '\uff1a', '\u2026']);

const findNearestSplitIndex = (text, targetIndex, minIndex, maxIndex) => {
  const source = String(text || '');
  const safeMin = Math.max(1, Number(minIndex || 1));
  const safeMax = Math.min(source.length - 1, Number(maxIndex || source.length - 1));
  if (safeMin >= safeMax) return safeMin;

  const safeTarget = Math.max(safeMin, Math.min(safeMax, Number(targetIndex || safeMin)));
  const maxRadius = 24;

  for (let radius = 0; radius <= maxRadius; radius += 1) {
    const left = safeTarget - radius;
    const right = safeTarget + radius;

    if (left > safeMin && left < safeMax && HARD_BREAK_CHARS.has(source[left])) {
      return left + 1;
    }
    if (right > safeMin && right < safeMax && HARD_BREAK_CHARS.has(source[right])) {
      return right + 1;
    }
  }

  for (let radius = 0; radius <= maxRadius; radius += 1) {
    const left = safeTarget - radius;
    const right = safeTarget + radius;

    if (left > safeMin && left < safeMax && /\s/.test(source[left])) {
      return left;
    }
    if (right > safeMin && right < safeMax && /\s/.test(source[right])) {
      return right;
    }
  }

  return safeTarget;
};

const splitTextByReferenceChunks = (text, referenceChunks, maxWords = 16, maxChars = 96) => {
  const normalized = sanitizeSubtitleText(text, 5000);
  const targetCount = Array.isArray(referenceChunks) ? referenceChunks.length : 0;

  if (targetCount <= 1) return [normalized];
  if (!normalized) return Array.from({ length: targetCount }, () => '');

  const natural = buildSubtitleChunks(normalized, maxWords, maxChars);
  if (natural.length === targetCount) {
    return natural;
  }

  const weights = referenceChunks.map((chunk) => {
    const words = String(chunk || '').trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, words || String(chunk || '').length);
  });
  const totalWeight = Math.max(1, weights.reduce((sum, item) => sum + item, 0));

  const slices = [];
  let cursor = 0;
  let accumulatedWeight = 0;

  for (let i = 0; i < targetCount; i += 1) {
    if (i === targetCount - 1) {
      slices.push(normalized.slice(cursor).trim());
      break;
    }

    accumulatedWeight += weights[i];
    const targetIndex = Math.round((normalized.length * accumulatedWeight) / totalWeight);
    const remainingSegments = targetCount - i - 1;
    const minIndex = cursor + 1;
    const maxIndex = Math.max(minIndex, normalized.length - remainingSegments);
    const splitIndex = findNearestSplitIndex(normalized, targetIndex, minIndex, maxIndex);

    slices.push(normalized.slice(cursor, splitIndex).trim());
    cursor = splitIndex;
  }

  const allFilled = slices.length === targetCount && slices.every((item) => item);
  if (allFilled) {
    return slices;
  }

  const fallback = splitTextToChunkCount(normalized, targetCount, maxWords, maxChars);
  return fallback.length === targetCount ? fallback : Array.from({ length: targetCount }, (_, index) => fallback[index] || '');
};

const normalizeDbSubtitles = (rows) => {
  if (!Array.isArray(rows) || !rows.length) return [];

  const normalizedRows = [];

  rows.forEach((row, rowIndex) => {
    const start = Number(row.start_time);
    const rawEnd = Number(row.end_time);

    if (!Number.isFinite(start)) return;

    const end = Number.isFinite(rawEnd) && rawEnd > start ? rawEnd : start + 1;
    const duration = Math.max(0.2, end - start);

    const enText = sanitizeSubtitleText(row.en_text, 6000);
    const vnText = sanitizeSubtitleText(row.vn_text, 6000);
    const sourceText = enText || vnText;
    if (!sourceText) return;

    const candidateChunks = buildSubtitleChunks(sourceText);
    const splitNeeded = candidateChunks.length > 1
      && (sourceText.length > 96 || sourceText.split(/\s+/).length > 18 || duration > 7);

    if (!splitNeeded) {
      normalizedRows.push({
        ...row,
        start_time: start,
        end_time: end,
        en_text: enText,
        vn_text: vnText,
      });
      return;
    }

    const maxByDuration = Math.max(1, Math.floor(duration / DB_SUBTITLE_CHUNK_MIN_DURATION));
    const chunkCount = Math.max(1, Math.min(candidateChunks.length, maxByDuration));
    const enChunks = chunkCount === candidateChunks.length
      ? candidateChunks
      : mergeChunksToCount(candidateChunks, chunkCount);
    const vnChunks = splitTextByReferenceChunks(vnText, enChunks);

    enChunks.forEach((chunk, index) => {
      const segStart = Number((start + ((duration * index) / enChunks.length)).toFixed(3));
      const segEnd = index === enChunks.length - 1
        ? end
        : Number((start + ((duration * (index + 1)) / enChunks.length)).toFixed(3));

      normalizedRows.push({
        ...row,
        id: `${row.id || rowIndex}-${index}`,
        start_time: segStart,
        end_time: segEnd,
        en_text: chunk,
        vn_text: vnChunks[index] || vnText || '',
        word_timings: null,
      });
    });
  });

  return normalizedRows.sort((a, b) => Number(a.start_time) - Number(b.start_time));
};

const toDuration = (seconds) => {
  const safe = Math.max(0, Math.floor(Number(seconds || 0)));
  const mm = Math.floor(safe / 60);
  const ss = safe % 60;
  return `${mm}:${String(ss).padStart(2, '0')}`;
};

const normalizeTrackValue = (value, fallback = 'chinese') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (['english', 'en', 'eng'].includes(normalized)) return 'english';
  if (['chinese', 'cn', 'zh', 'mandarin'].includes(normalized)) return 'chinese';
  return fallback;
};

// Trích xuất YouTube video ID từ URL
const extractYouTubeId = (url) => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|v=|embed\/)([^#&?]{11})/);
  return match ? match[1] : null;
};

// Component hiển thị phụ đề với highlight từng chữ theo YouTube style
const WordHighlight = ({ text, words, currentTime }) => {
  const normalizedText = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  const safeText = sanitizeSubtitleText(normalizedText);
  const isTrimmed = safeText.length < normalizedText.length;

  if (!words || words.length === 0 || words.length > SUBTITLE_MAX_HIGHLIGHT_WORDS || isTrimmed) {
    return <span>{safeText}</span>;
  }

  // Tìm chữ đang được nói (chữ mà currentTime >= t của nó, và t của chữ kế < currentTime)
  const currentWordIndex = words.reduce((acc, w, i) => {
    return currentTime >= w.t ? i : acc;
  }, -1);
  const useWordSpacing = /\s/.test(normalizedText);

  return (
    <span>
      {words.map((w, i) => (
        <span
          key={i}
          style={{
            color: i <= currentWordIndex ? '#FACC15' : 'white',
            fontWeight: i === currentWordIndex ? '700' : '500',
            transition: 'color 0.1s ease',
          }}
        >
          {`${String(w.word || '').trim()}${useWordSpacing && i < words.length - 1 ? ' ' : ''}`}
        </span>
      ))}
    </span>
  );
};

const getLevelLabel = (track, level) => {
  const safeLevel = Number(level || 1);
  return track === 'english' ? `Level ${safeLevel}` : `HSK ${safeLevel}`;
};

const withProxy = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) {
    return `${API_BASE}/proxy_subtitle?url=${encodeURIComponent(url)}`;
  }
  if (url.startsWith('/')) {
    return `${API_ORIGIN}${url}`;
  }
  return url;
};

const toAbsoluteUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${API_ORIGIN}${url}`;
  return url;
};

const buildSubtitleCandidates = (url) => {
  if (!url) return [];

  const candidates = [];
  const absolute = toAbsoluteUrl(url);

  if (absolute) {
    candidates.push(absolute);
  }

  const proxyUrl = withProxy(url);
  if (proxyUrl) {
    candidates.push(proxyUrl);
  }

  // Legacy PHP API compatibility
  if (/^https?:\/\//i.test(url)) {
    candidates.push(`${API_BASE}/proxy_subtitle.php?url=${encodeURIComponent(url)}`);
  }

  return Array.from(new Set(candidates));
};

const extractVideoPayload = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.success && raw.data && raw.data.id) return raw.data;
  if (raw.data && raw.data.video && raw.data.video.id) return raw.data.video;
  if (raw.id) return raw;
  return null;
};

const fetchVideoDetail = async (videoId) => {
  const encodedId = encodeURIComponent(videoId);
  const endpointCandidates = [
    `${API_BASE}/product/${encodedId}`,
    `${API_BASE}/videos/${encodedId}`,
    `${API_BASE}/get_video.php?id=${encodedId}`,
  ];

  for (const endpoint of endpointCandidates) {
    try {
      const response = await fetch(endpoint, {
        headers: jsonHeaders,
        cache: 'no-store',
      });

      if (!response.ok) {
        continue;
      }

      const json = await response.json();
      const payload = extractVideoPayload(json);
      if (payload?.id) {
        return payload;
      }
    } catch {
      // Try next endpoint candidate.
    }
  }

  return null;
};

const getAuth = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const Player = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const sentenceListRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const playerContainerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);  // YouTube IFrame API player instance
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const ytPollRef = useRef(null);    // setInterval handle cho YouTube sync
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recordChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const recordedAudioRef = useRef(null);
  const ttsAudioRef = useRef(null);
  const pronunciationResetTimerRef = useRef(null);
  const startAt = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = Number(params.get('t') || 0);
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  }, [videoId]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sentences');
  const [currentUser, setCurrentUser] = useState(readStoredUser);
  const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin';
  const [isUserPanelOpen, setIsUserPanelOpen] = useState(false);

  const [videoData, setVideoData] = useState(null);
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [vocabulary, setVocabulary] = useState([]);
  const [slang, setSlang] = useState([]);
  const [savedWordIds, setSavedWordIds] = useState(new Set());

  const [subCn, setSubCn] = useState([]);
  const [subVi, setSubVi] = useState([]);
  const [subPinyin, setSubPinyin] = useState([]);

  // Phụ đề từ database (cho video YouTube)
  const [dbSubtitles, setDbSubtitles] = useState([]);

  const [showCn, setShowCn] = useState(true);
  const [showVi, setShowVi] = useState(true);
  const [showPinyin, setShowPinyin] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [watchedSeconds, setWatchedSeconds] = useState(0);

  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState('');
  const [recordError, setRecordError] = useState('');

  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopRange, setLoopRange] = useState(null);
  const [speakingWordKey, setSpeakingWordKey] = useState('');
  const [pronunciationState, setPronunciationState] = useState({ key: '', value: 'idle' });

  const timelineSubtitles = useMemo(() => {
    // Ưu tiên phụ đề từ DB (YouTube)
    if (dbSubtitles.length) return dbSubtitles.map(s => ({ start: Number(s.start_time), end: Number(s.end_time), text: s.en_text }));
    if (subCn.length) return subCn;
    if (subVi.length) return subVi;
    if (subPinyin.length) return subPinyin;
    return [];
  }, [dbSubtitles, subCn, subVi, subPinyin]);

  const currentSubtitleIndex = useMemo(
    () => findSubtitleIndex(timelineSubtitles, currentTime),
    [timelineSubtitles, currentTime]
  );

  const currentCnSubtitle = useMemo(() => {
    // Nếu có phụ đề từ DB (YouTube), dùng đó
    if (dbSubtitles.length) {
      const found = dbSubtitles.find(s => currentTime >= Number(s.start_time) && currentTime <= Number(s.end_time));
      return found ? {
        text: found.en_text,
        vi_text: found.vn_text,
        start: Number(found.start_time),
        end: Number(found.end_time),
        words: parseWordTimings(found.word_timings)
      } : null;
    }
    const index = findSubtitleIndex(subCn, currentTime);
    return index >= 0 ? subCn[index] : null;
  }, [dbSubtitles, subCn, currentTime]);

  const currentViSubtitle = useMemo(() => {
    if (dbSubtitles.length) {
      const found = dbSubtitles.find(s => currentTime >= Number(s.start_time) && currentTime <= Number(s.end_time));
      return found ? { text: found.vn_text, start: Number(found.start_time), end: Number(found.end_time) } : null;
    }
    const index = findSubtitleIndex(subVi, currentTime);
    return index >= 0 ? subVi[index] : null;
  }, [dbSubtitles, subVi, currentTime]);

  const currentPinyinSubtitle = useMemo(() => {
    const index = findSubtitleIndex(subPinyin, currentTime);
    return index >= 0 ? subPinyin[index] : null;
  }, [subPinyin, currentTime]);

  const currentSubtitle = currentCnSubtitle || currentViSubtitle || currentPinyinSubtitle;

  const loadVttFile = async (url) => {
    if (!url) return [];

    const candidates = buildSubtitleCandidates(url);

    for (const candidate of candidates) {
      try {
        const response = await fetch(candidate, {
          headers: { Accept: 'text/vtt,text/plain;q=0.9,*/*;q=0.8' },
          cache: 'no-store',
        });

        if (!response.ok) {
          continue;
        }

        const text = await response.text();
        const parsed = parseVtt(text);
        if (parsed.length) {
          return parsed;
        }
      } catch {
        // Try next candidate URL.
      }
    }

    return [];
  };

  const fetchVocabulary = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/blog/vocabulary?video_id=${id}`);
      const data = await response.json();
      setVocabulary(data.success ? data.data || [] : []);
    } catch (error) {
      console.error('Error loading vocabulary:', error);
      setVocabulary([]);
    }
  };

  const redirectToLogin = () => {
    const redirect = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
    navigate(`/login?redirect=${redirect}`);
  };

  const syncCurrentUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setCurrentUser(null);
      return false;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: getAuth(),
        cache: 'no-store',
      });
      const data = await response.json();

      if (response.ok && data.success && data.user) {
        setCurrentUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        return true;
      }
    } catch (error) {
      console.error('Error syncing user in player:', error);
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
    return false;
  };

  const toggleUserPanel = async () => {
    if (isUserPanelOpen) {
      setIsUserPanelOpen(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      redirectToLogin();
      return;
    }

    const valid = await syncCurrentUser();
    if (!valid) {
      redirectToLogin();
      return;
    }

    setIsUserPanelOpen(true);
  };

  const handleLogout = () => {
    setIsUserPanelOpen(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
    navigate('/login', { replace: true });
  };

  const clearRecordTimer = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  };

  const stopRecordStream = () => {
    if (!mediaStreamRef.current) {
      return;
    }

    mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const resetRecordedAudio = () => {
    if (recordedAudioRef.current) {
      recordedAudioRef.current.pause();
      recordedAudioRef.current.currentTime = 0;
    }

    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
    }
    setRecordedAudioUrl('');
    setRecordSeconds(0);
    setRecordError('');
  };

  const startShadowRecording = async () => {
    if (isRecording) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setRecordError('Trình duyệt không hỗ trợ ghi âm.');
      return;
    }

    setRecordError('');
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl('');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
      ];
      const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported?.(type));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      mediaStreamRef.current = stream;
      recordChunksRef.current = [];
      setRecordSeconds(0);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        clearRecordTimer();
        stopRecordStream();

        const fallbackType = mimeType || 'audio/webm';
        const blob = new Blob(recordChunksRef.current, { type: fallbackType });
        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          setRecordedAudioUrl(url);
        }

        recordChunksRef.current = [];
        setIsRecording(false);
      };

      recorder.onerror = () => {
        setRecordError('Ghi âm bị gián đoạn, vui lòng thử lại.');
        clearRecordTimer();
        stopRecordStream();
        setIsRecording(false);
      };

      recorder.start(250);
      setIsRecording(true);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      setRecordError('Không thể truy cập micro, vui lòng cho phép quyền ghi âm.');
    }
  };

  const stopShadowRecording = () => {
    if (!mediaRecorderRef.current) {
      return;
    }

    if (mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      clearRecordTimer();
      stopRecordStream();
      setIsRecording(false);
    }
  };

  const replayRecordedAudio = async () => {
    if (!recordedAudioRef.current || !recordedAudioUrl) {
      return;
    }

    recordedAudioRef.current.currentTime = 0;
    try {
      await recordedAudioRef.current.play();
    } catch {
      // autoplay can be blocked without user gesture in some browsers
    }
  };

  const loadSavedWords = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setSavedWordIds(new Set());
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/blog/saved_words`, {
        headers: getAuth(),
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setSavedWordIds(new Set());
        return;
      }

      const data = await response.json();
      if (!data.success || !Array.isArray(data.data)) {
        setSavedWordIds(new Set());
        return;
      }

      const ids = data.data
        .map((item) => Number(item.vocabulary_id))
        .filter((id) => Number.isFinite(id) && id > 0);

      setSavedWordIds(new Set(ids));
    } catch (error) {
      console.error('Error loading saved words in player:', error);
    }
  };

  const fetchSlang = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/blog/slang?video_id=${id}`);
      const data = await response.json();
      setSlang(data.success ? data.data || [] : []);
    } catch (error) {
      console.error('Error loading slang:', error);
      setSlang([]);
    }
  };

  const fetchRelated = async (categoryId, excludeVideoId, track) => {
    try {
      let url = `${API_BASE}/product?limit=6&status=published`;
      if (categoryId) {
        url += `&category=${categoryId}`;
      }
      const normalizedTrack = normalizeTrackValue(track, 'all');
      if (normalizedTrack !== 'all') {
        url += `&track=${normalizedTrack}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      const list = (data.data || []).filter((item) => Number(item.id) !== Number(excludeVideoId)).slice(0, 4);
      setRelatedVideos(list);
    } catch (error) {
      console.error('Error loading related videos:', error);
      setRelatedVideos([]);
    }
  };

  const saveProgress = async () => {
    const token = localStorage.getItem('token');
    if (!token || !videoRef.current || !videoData) {
      return;
    }

    const payload = {
      video_id: Number(videoId),
      watched_seconds: Math.floor(watchedSeconds),
      last_position: videoRef.current.currentTime,
      duration: Number(videoRef.current.duration || videoData.duration || 0),
      is_completed: watchedSeconds > 0 && videoRef.current.duration > 0
        ? watchedSeconds / videoRef.current.duration >= 0.9
        : false,
    };

    try {
      await fetch(`${API_BASE}/user/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuth(),
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const loadProgress = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/user/progress?video_id=${videoId}`, {
        headers: getAuth(),
      });
      const data = await response.json();
      if (data.success && data.data && data.data.length && videoRef.current) {
        const progress = data.data[0];
        setWatchedSeconds(Number(progress.watched_seconds || 0));
        if (Number(progress.last_position || 0) > 10) {
          videoRef.current.currentTime = Number(progress.last_position);
        }
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const saveWord = async (item) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Vui lòng đăng nhập để lưu từ vựng');
      redirectToLogin();
      return;
    }

    const wordId = Number(item.id);
    if (Number.isFinite(wordId) && savedWordIds.has(wordId)) {
      alert('Từ này đã được lưu rồi');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/blog/saved_words`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuth(),
        },
        body: JSON.stringify({
          vocabulary_id: wordId,
          word_cn: item.word,
          pinyin: item.pinyin,
          meaning: item.meaning,
        }),
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        alert('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
        redirectToLogin();
        return;
      }

      const data = await response.json();
      if (!data.success) {
        alert(data.message || 'Không thể lưu từ');
        return;
      }

      setSavedWordIds((prev) => {
        const next = new Set(prev);
        if (Number.isFinite(wordId)) {
          next.add(wordId);
        }
        return next;
      });
    } catch (error) {
      console.error('Error saving word:', error);
      alert('Lỗi khi lưu từ');
    }
  };

  const pickPreferredVoice = (track = 'chinese') => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return null;
    }

    const voices = window.speechSynthesis.getVoices();
    if (!Array.isArray(voices) || !voices.length) {
      return null;
    }

    if (track === 'english') {
      return voices.find((voice) => /en-US|en-GB|english/i.test(`${voice.lang} ${voice.name}`))
        || voices.find((voice) => String(voice.lang || '').toLowerCase().startsWith('en'))
        || null;
    }

    return voices.find((voice) => /zh-CN|cmn-CN|zh-TW|chinese|mandarin/i.test(`${voice.lang} ${voice.name}`))
      || voices.find((voice) => String(voice.lang || '').toLowerCase().startsWith('zh'))
      || null;
  };

  const clearPronunciationResetTimer = () => {
    if (!pronunciationResetTimerRef.current) {
      return;
    }

    window.clearTimeout(pronunciationResetTimerRef.current);
    pronunciationResetTimerRef.current = null;
  };

  const markPronunciationError = (key) => {
    clearPronunciationResetTimer();
    setPronunciationState({ key, value: 'error' });

    pronunciationResetTimerRef.current = window.setTimeout(() => {
      setPronunciationState((current) => {
        if (current.key !== key || current.value !== 'error') {
          return current;
        }
        return { key: '', value: 'idle' };
      });
      pronunciationResetTimerRef.current = null;
    }, 1800);
  };

  const stopVocabularyPronunciation = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current.currentTime = 0;
      ttsAudioRef.current = null;
    }

    clearPronunciationResetTimer();
    setSpeakingWordKey('');
    setPronunciationState({ key: '', value: 'idle' });
  };

  const playWordByAudioFallback = (word, key, track = 'chinese') => {
    const encoded = encodeURIComponent(word);
    const sources = track === 'english'
      ? [
        `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en-US&q=${encoded}`,
        `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en-GB&q=${encoded}`,
      ]
      : [
        `${API_BASE}/blog/tts?word=${encoded}`,
        `https://dict.youdao.com/dictvoice?audio=${encoded}&type=0`,
        `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=zh-CN&q=${encoded}`,
      ];

    const trySource = (index) => {
      if (index >= sources.length) {
        setSpeakingWordKey('');
        markPronunciationError(key);
        return;
      }

      const audio = new Audio(sources[index]);
      audio.preload = 'auto';

      audio.onended = () => {
        if (ttsAudioRef.current === audio) {
          ttsAudioRef.current = null;
        }
        clearPronunciationResetTimer();
        setSpeakingWordKey((current) => (current === key ? '' : current));
        setPronunciationState((current) => (current.key === key ? { key: '', value: 'idle' } : current));
      };

      audio.onerror = () => {
        if (ttsAudioRef.current === audio) {
          ttsAudioRef.current = null;
        }
        trySource(index + 1);
      };

      ttsAudioRef.current = audio;
      const playPromise = audio.play();
      if (playPromise?.catch) {
        playPromise.then(() => {
          setPronunciationState({ key, value: 'playing' });
        });
        playPromise.catch(() => {
          if (ttsAudioRef.current === audio) {
            ttsAudioRef.current = null;
          }
          trySource(index + 1);
        });
      } else {
        setPronunciationState({ key, value: 'playing' });
      }
    };

    clearPronunciationResetTimer();
    setSpeakingWordKey(key);
    setPronunciationState({ key, value: 'loading' });
    trySource(0);
  };

  const speakVocabularyWord = (item) => {
    const word = String(item?.word || '').trim();
    if (!word) {
      return;
    }

    const key = `${item?.id || word}-${word}`;

    if (speakingWordKey === key) {
      stopVocabularyPronunciation();
      return;
    }

    if (typeof window === 'undefined' || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') {
      playWordByAudioFallback(word, key, normalizeTrackValue(videoData?.language_track, 'chinese'));
      return;
    }

    const speech = window.speechSynthesis;
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current.currentTime = 0;
      ttsAudioRef.current = null;
    }
    speech.cancel();
    clearPronunciationResetTimer();

    const activeTrack = normalizeTrackValue(videoData?.language_track, 'chinese');

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = activeTrack === 'english' ? 'en-US' : 'zh-CN';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voice = pickPreferredVoice(activeTrack);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || utterance.lang;
    }

    let started = false;
    const fallbackTimer = window.setTimeout(() => {
      if (!started) {
        speech.cancel();
        playWordByAudioFallback(word, key, activeTrack);
      }
    }, 1200);

    utterance.onstart = () => {
      started = true;
      window.clearTimeout(fallbackTimer);
      setSpeakingWordKey(key);
      setPronunciationState({ key, value: 'playing' });
    };

    utterance.onend = () => {
      window.clearTimeout(fallbackTimer);
      clearPronunciationResetTimer();
      setSpeakingWordKey((current) => (current === key ? '' : current));
      setPronunciationState((current) => (current.key === key ? { key: '', value: 'idle' } : current));
    };

    utterance.onerror = (event) => {
      window.clearTimeout(fallbackTimer);
      const reason = String(event?.error || '').toLowerCase();
      if (reason === 'interrupted' || reason === 'canceled') {
        clearPronunciationResetTimer();
        setSpeakingWordKey((current) => (current === key ? '' : current));
        setPronunciationState((current) => (current.key === key ? { key: '', value: 'idle' } : current));
        return;
      }

      playWordByAudioFallback(word, key, activeTrack);
    };

    setPronunciationState({ key, value: 'loading' });
    setSpeakingWordKey(key);
    speech.speak(utterance);
  };

  const generateVocabulary = async () => {
    if (!isAdmin) {
      alert('Chỉ Admin mới được tạo từ vựng AI');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/blog/vocabulary/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuth(),
        },
        body: JSON.stringify({ video_id: Number(videoId) }),
      });

      if (response.status === 401 || response.status === 403) {
        alert('Bạn không có quyền tạo từ vựng AI');
        return;
      }

      const data = await response.json();
      if (!data.success) {
        alert(data.error || 'Không thể tạo từ vựng');
        return;
      }

      await fetchVocabulary(videoId);
    } catch (error) {
      console.error('Error generating vocabulary:', error);
      alert('Lỗi khi tạo từ vựng');
    }
  };

  useEffect(() => {
    const run = async () => {
      if (!videoId) return;

      try {
        setLoading(true);

        const payload = await fetchVideoDetail(videoId);

        if (!payload || !payload.id) {
          setVideoData(null);
          setLoading(false);
          return;
        }

        setVideoData(payload);

        // Kiểm tra xem là video YouTube không
        const ytId = extractYouTubeId(payload.video_url);
        if (ytId) {
          // Load phụ đề từ database cho video YouTube
          try {
            const subRes = await fetch(`${API_BASE}/youtube/subtitles/${payload.id}`);
            const subData = await subRes.json();
            if (subData.success && Array.isArray(subData.data)) {
              setDbSubtitles(normalizeDbSubtitles(subData.data));
            }
          } catch (e) {
            console.error('Error loading DB subtitles:', e);
          }
        } else {
          // Video thường: load sub từ file VTT
          const [cn, vi, py] = await Promise.all([
            loadVttFile(payload.subtitle_cn_url),
            loadVttFile(payload.subtitle_vi_url),
            loadVttFile(payload.subtitle_pinyin_url),
          ]);
          setSubCn(cn);
          setSubVi(vi);
          setSubPinyin(py);
        }

        await Promise.all([
          fetchVocabulary(payload.id),
          fetchSlang(payload.id),
          fetchRelated(payload.category_id, payload.id, payload.language_track),
          loadSavedWords(),
          syncCurrentUser(),
        ]);
      } catch (error) {
        console.error('Error loading player:', error);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [videoId]);

  useEffect(() => {
    if (!videoData?.id) return undefined;

    const intervalId = setInterval(() => {
      const node = videoRef.current;
      if (!node) return;

      const liveTime = Number(node.currentTime || 0);
      setCurrentTime((prev) => (Math.abs(prev - liveTime) > 0.15 ? liveTime : prev));
      setWatchedSeconds((prev) => Math.max(prev, Math.floor(liveTime)));
    }, 250);

    return () => clearInterval(intervalId);
  }, [videoData?.id]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === 'token' || event.key === 'user') {
        setCurrentUser(readStoredUser());
        if (!localStorage.getItem('token')) {
          setIsUserPanelOpen(false);
        }
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    return () => {
      clearPronunciationResetTimer();
      clearRecordTimer();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      stopRecordStream();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
    };
  }, [recordedAudioUrl]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return undefined;
    }

    window.speechSynthesis.getVoices();

    return () => {
      stopVocabularyPronunciation();
    };
  }, []);

  // YouTube IFrame API: load script + khởi tạo player để lấy currentTime
  useEffect(() => {
    if (!videoData?.video_url) return;
    const ytId = extractYouTubeId(videoData.video_url);
    if (!ytId) return;

    let pollInterval = null;
    let retryTimeout = null;

    const startPolling = () => {
      if (pollInterval) clearInterval(pollInterval);
      pollInterval = setInterval(() => {
        try {
          const t = ytPlayerRef.current?.getCurrentTime?.();
          const d = ytPlayerRef.current?.getDuration?.();
          if (typeof d === 'number' && Number.isFinite(d) && d > 0) {
            setDuration((prev) => (Math.abs(prev - d) > 0.25 ? d : prev));
          }
          if (typeof t === 'number') {
            setCurrentTime(t);
            setWatchedSeconds(prev => Math.max(prev, Math.floor(t)));
          }
        } catch {}
      }, 300);
      ytPollRef.current = pollInterval;
    };

    const initPlayer = () => {
      if (!window.YT?.Player) return;
      const el = document.getElementById('yt-iframe-player');
      if (!el) {
        // Iframe chưa render xong, thử lại sau 200ms
        retryTimeout = setTimeout(initPlayer, 200);
        return;
      }
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch {}
      }
      ytPlayerRef.current = new window.YT.Player(el, {
        events: {
          onReady: (event) => {
            const d = event?.target?.getDuration?.();
            if (typeof d === 'number' && Number.isFinite(d) && d > 0) {
              setDuration(d);
            }
            const safeVolume = Math.round(Math.max(0, Math.min(1, Number(volume || 0))) * 100);
            if (typeof event?.target?.setVolume === 'function') {
              event.target.setVolume(safeVolume);
            }
            if (isMuted || safeVolume === 0) {
              event?.target?.mute?.();
            } else {
              event?.target?.unMute?.();
            }
            if (startAt > 0 && typeof event?.target?.seekTo === 'function') {
              event.target.seekTo(startAt, true);
            }
            startPolling();
          },
          onStateChange: (e) => setIsPlaying(e.data === 1),
        }
      });
    };

    if (window.YT?.Player) {
      // API đã load sẵn
      retryTimeout = setTimeout(initPlayer, 300);
    } else {
      // Load API lần đầu
      if (!document.getElementById('yt-api-script')) {
        const tag = document.createElement('script');
        tag.id = 'yt-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        retryTimeout = setTimeout(initPlayer, 300);
      };
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [videoData?.video_url, startAt]);

  useEffect(() => {
    if (!videoRef.current || !videoData?.id) return undefined;

    const node = videoRef.current;
    const onLoadedMeta = () => {
      setDuration(Number(node.duration || 0));
      node.volume = Math.max(0, Math.min(1, Number(volume || 0)));
      node.muted = isMuted || Number(volume || 0) <= 0;
      if (startAt > 0) {
        node.currentTime = startAt;
      }
      loadProgress();
    };

    const onTimeUpdate = () => {
      setCurrentTime(Number(node.currentTime || 0));
      setWatchedSeconds((prev) => Math.max(prev, Math.floor(node.currentTime || 0)));

      if (loopEnabled && loopRange && node.currentTime >= loopRange.end) {
        node.currentTime = loopRange.start;
      }
    };

    node.addEventListener('loadedmetadata', onLoadedMeta);
    node.addEventListener('timeupdate', onTimeUpdate);
    const pPlay = () => setIsPlaying(true);
    const pPause = () => setIsPlaying(false);
    node.addEventListener('play', pPlay);
    node.addEventListener('pause', pPause);

    return () => {
      node.removeEventListener('loadedmetadata', onLoadedMeta);
      node.removeEventListener('timeupdate', onTimeUpdate);
      node.removeEventListener('play', pPlay);
      node.removeEventListener('pause', pPause);
    };
  }, [loopEnabled, loopRange, videoId, startAt, videoData?.id, volume, isMuted]);

  useEffect(() => {
    stopShadowRecording();
    resetRecordedAudio();
    stopVocabularyPronunciation();
    setRecordError('');
  }, [videoId]);

  useEffect(() => {
    const id = setInterval(() => {
      saveProgress();
    }, 10000);

    return () => {
      clearInterval(id);
      saveProgress();
    };
  }, [watchedSeconds, videoData]);

  useEffect(() => {
    if (!sentenceListRef.current || currentSubtitleIndex < 0) return;
    const target = sentenceListRef.current.querySelector(`[data-sub-idx="${currentSubtitleIndex}"]`);
    if (target) {
      target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentSubtitleIndex]);


  const togglePlay = () => {
    if (extractYouTubeId(videoData?.video_url)) {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getPlayerState === 'function') {
        const state = ytPlayerRef.current.getPlayerState();
        if (state === 1) ytPlayerRef.current.pauseVideo();
        else ytPlayerRef.current.playVideo();
      }
    } else if (videoRef.current) {
      if (!videoRef.current.paused) videoRef.current.pause();
      else videoRef.current.play();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      playerContainerRef.current?.requestFullscreen?.().catch(e=>console.log(e));
    } else {
      document.exitFullscreen?.();
    }
  };

  const seekMediaTo = (time, shouldPlay = false) => {
    const target = Number(time);
    if (!Number.isFinite(target) || target < 0) return;

    if (extractYouTubeId(videoData?.video_url)) {
      if (!ytPlayerRef.current) return;
      if (typeof ytPlayerRef.current.seekTo === 'function') {
        ytPlayerRef.current.seekTo(target, true);
      }
      if (shouldPlay && typeof ytPlayerRef.current.playVideo === 'function') {
        ytPlayerRef.current.playVideo();
      }
      setCurrentTime(target);
      return;
    }

    if (!videoRef.current) return;
    videoRef.current.currentTime = target;
    if (shouldPlay) {
      videoRef.current.play();
    }
  };

  const stepMediaBy = (deltaSeconds) => {
    const current = Number(currentTime || 0);
    const maxDuration = Number(duration || 0);
    const nextTime = current + Number(deltaSeconds || 0);
    const capped = maxDuration > 0 ? Math.min(nextTime, maxDuration) : nextTime;
    seekMediaTo(Math.max(0, capped));
  };

  const setMediaVolume = (nextVolume) => {
    const safe = Math.max(0, Math.min(1, Number(nextVolume || 0)));
    const shouldMute = safe <= 0;
    setVolume(safe);
    setIsMuted(shouldMute);

    if (extractYouTubeId(videoData?.video_url)) {
      if (!ytPlayerRef.current) return;
      if (typeof ytPlayerRef.current.setVolume === 'function') {
        ytPlayerRef.current.setVolume(Math.round(safe * 100));
      }
      if (shouldMute) {
        ytPlayerRef.current.mute?.();
      } else {
        ytPlayerRef.current.unMute?.();
      }
      return;
    }

    if (!videoRef.current) return;
    videoRef.current.volume = safe;
    videoRef.current.muted = shouldMute;
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);

    if (extractYouTubeId(videoData?.video_url)) {
      if (!ytPlayerRef.current) return;
      if (nextMuted) {
        ytPlayerRef.current.mute?.();
      } else {
        if (volume <= 0) {
          setMediaVolume(0.6);
          return;
        }
        ytPlayerRef.current.unMute?.();
      }
      return;
    }

    if (!videoRef.current) return;
    if (!nextMuted && videoRef.current.volume <= 0) {
      setMediaVolume(0.6);
      return;
    }
    videoRef.current.muted = nextMuted;
  };

  const getVolumeIcon = () => {
    if (isMuted || volume <= 0) return 'volume_off';
    if (volume < 0.5) return 'volume_down';
    return 'volume_up';
  };

  const jumpToSentence = (index) => {
    if (index < 0 || index >= timelineSubtitles.length) return;
    seekMediaTo(timelineSubtitles[index].start, true);
  };

  const repeatCurrentSentence = () => {
    if (!currentSubtitle) return;
    seekMediaTo(currentSubtitle.start, true);
  };

  const toggleLoopCurrentSentence = () => {
    if (!currentSubtitle) return;
    if (loopEnabled) {
      setLoopEnabled(false);
      setLoopRange(null);
      return;
    }
    setLoopRange({ start: currentSubtitle.start, end: currentSubtitle.end });
    setLoopEnabled(true);
  };

  if (loading) {
    return <div className="min-h-screen p-8 text-center text-glass-subtle">Đang tải Player...</div>;
  }

  if (!videoData) {
    return (
      <div className="min-h-screen p-8 text-center">
        <p className="text-red-500">Không tìm thấy video.</p>
        <Link to="/library" className="mt-4 inline-block text-blue-600 hover:underline">Quay lại thư viện</Link>
      </div>
    );
  }

  const currentTrack = normalizeTrackValue(videoData.language_track, 'chinese');

  return (
    <div className="min-h-screen pb-10 text-glass-main relative">
      <div className="absolute top-24 left-[-4rem] w-44 h-44 bg-blue-300/35 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-8 right-[-4rem] w-52 h-52 bg-cyan-300/35 blur-3xl rounded-full pointer-events-none" />

      <header className="sticky top-3 z-40 px-3 sm:px-4">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 flex flex-wrap items-center gap-2 sm:gap-3 glass-surface rounded-2xl border border-white/70">
          <Link to="/library" className="order-1 glass-chip px-3 py-1.5 text-blue-700 font-semibold text-sm">← Thư viện</Link>
          <div className="order-3 w-full text-center min-w-0 sm:order-2 sm:flex-1">
            <h1 className="font-bold text-blue-950 truncate">{videoData.title}</h1>
            <p className="text-sm text-glass-subtle truncate">{videoData.title_cn || ''}</p>
            <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/75 text-blue-800">
              {currentTrack === 'english' ? 'Lộ trình tiếng Anh' : 'Lộ trình tiếng Trung'}
            </span>
            <p className="text-xs text-glass-subtle mt-0.5 sm:hidden">Đã xem: {toDuration(watchedSeconds)}</p>
          </div>
          <div className="order-2 ml-auto sm:order-3 flex items-center gap-2">
            <span className="glass-status glass-status-neutral hidden sm:inline-flex">Đã xem: {toDuration(watchedSeconds)}</span>
            <button
              onClick={handleLogout}
              className="glass-chip p-1.5 sm:p-2 text-glass-subtle hover:text-rose-600 rounded-full transition"
              title="Đăng xuất"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
            <button
              onClick={toggleUserPanel}
              className="glass-chip rounded-full p-1.5 flex items-center gap-1"
              title="Mở trang người dùng"
            >
              <img
                src={currentUser?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.full_name || currentUser?.username || 'User')}&background=3b82f6&color=fff`}
                alt="avatar"
                className="w-9 h-9 rounded-full ring-2 ring-white/70"
              />
              <span className="material-symbols-outlined text-glass-subtle text-base">{isUserPanelOpen ? 'close' : 'chevron_left'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6 grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <section className="xl:col-span-2 space-y-4">
          <div 
            ref={playerContainerRef}
            className="rounded-2xl overflow-hidden bg-black relative shadow-lg group aspect-video"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => isPlaying && setShowControls(false)}
            onTouchStart={() => setShowControls(true)}
            onMouseMove={() => { setShowControls(true); clearTimeout(window.controlsTimeout); window.controlsTimeout = setTimeout(() => isPlaying && setShowControls(false), 2500); }}
          >
            {extractYouTubeId(videoData.video_url) ? (
              <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
                <iframe
                  id="yt-iframe-player"
                  className="w-[110%] h-[110%] -ml-[5%] -mt-[5%]" 
                  src={`https://www.youtube.com/embed/${extractYouTubeId(videoData.video_url)}?enablejsapi=1&rel=0&modestbranding=1&controls=0&disablekb=1&fs=0&iv_load_policy=3&playsinline=1`}
                  title={videoData.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <video
                ref={videoRef}
                src={videoData.video_url}
                className="w-full h-full object-contain cursor-pointer"
                preload="metadata"
                onClick={togglePlay}
              />
            )}

            {extractYouTubeId(videoData.video_url) && (
              <div className="absolute inset-0 z-10 cursor-pointer" onClick={togglePlay}></div>
            )}

            {/* Thumbnail Overlay to block YouTube's native UI before playing starts */}
            {extractYouTubeId(videoData.video_url) && !isPlaying && currentTime === 0 && (
              <div className="absolute inset-0 z-15 bg-black cursor-pointer flex flex-col items-center justify-center transition-opacity duration-300 pointer-events-auto" onClick={togglePlay}>
                <img src={videoData.thumbnail_url} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-70" />
                <div className="relative z-20 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.7)] hover:bg-blue-500 hover:scale-105 transition-transform duration-200">
                  <span className="material-symbols-outlined text-white text-4xl ml-1">play_arrow</span>
                </div>
              </div>
            )}

            {/* Overlay phụ đề 2 dòng chung */}
            <div className={`absolute bottom-4 md:bottom-8 left-0 right-0 px-4 pb-4 pt-8 pointer-events-none text-center z-20 transition-opacity duration-300 ${(!showControls && isPlaying) ? 'opacity-100' : ''}`}>
              {showCn && currentCnSubtitle && (
                <div className="inline-block max-w-[94%] text-white font-bold text-base sm:text-lg md:text-xl lg:text-2xl leading-snug break-words drop-shadow-[0_2px_5px_rgba(0,0,0,1)] mb-1">
                  {extractYouTubeId(videoData.video_url) && currentCnSubtitle.words ? (
                     <WordHighlight text={currentCnSubtitle.text} words={currentCnSubtitle.words} currentTime={currentTime} />
                  ) : sanitizeSubtitleText(currentCnSubtitle.text)}
                </div>
              )}
              {showVi && currentViSubtitle && (
                <div className="block w-full max-w-[94%] mx-auto text-[#f1c40f] font-semibold text-xs sm:text-sm md:text-base mt-1 leading-snug break-words drop-shadow-[0_2px_5px_rgba(0,0,0,1)]">
                  {sanitizeSubtitleText(currentViSubtitle.text, 170)}
                </div>
              )}
              {showPinyin && currentPinyinSubtitle && (
                  <div className="block w-full max-w-[94%] mx-auto text-blue-200 font-medium text-[11px] sm:text-xs md:text-sm mt-1 leading-snug break-words drop-shadow-[0_2px_5px_rgba(0,0,0,1)]">{sanitizeSubtitleText(currentPinyinSubtitle.text, 170)}</div>
              )}
            </div>

            {/* Custom Control Bar */}
            <div className={`absolute bottom-0 left-0 right-0 p-3 pt-12 bg-gradient-to-t from-black/90 to-transparent z-30 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
               <div className="flex items-center gap-4 text-white px-2">
                 <button onClick={() => stepMediaBy(-10)} className="hover:text-blue-400 transition" title="Lùi 10 giây">
                   <span className="material-symbols-outlined text-3xl">replay_10</span>
                 </button>
                 <button onClick={togglePlay} className="hover:text-blue-400 transition">
                   <span className="material-symbols-outlined text-3xl">{isPlaying ? 'pause' : 'play_arrow'}</span>
                 </button>
                 <button onClick={() => stepMediaBy(10)} className="hover:text-blue-400 transition" title="Tiến 10 giây">
                   <span className="material-symbols-outlined text-3xl">forward_10</span>
                 </button>
                 <div className="flex-1 h-1.5 bg-white/30 rounded-full cursor-pointer relative group/progress" onClick={(e) => {
                     const rect = e.currentTarget.getBoundingClientRect();
                     const percent = (e.clientX - rect.left) / rect.width;
                     const newTime = percent * duration;
                    seekMediaTo(newTime);
                 }}>
                    <div className="absolute top-0 left-0 h-full bg-[#ff0000] rounded-full relative" style={{ width: `${(currentTime/duration)*100 || 0}%` }}>
                        <div className="absolute right-0 top-1/2 -mt-1.5 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover/progress:opacity-100 transform translate-x-1/2"></div>
                    </div>
                 </div>
                 <div className="text-sm font-medium tabular-nums">{toDuration(currentTime)} / {toDuration(duration)}</div>
                 <div className="flex items-center gap-2 min-w-[94px] sm:min-w-[140px]">
                   <button onClick={toggleMute} className="hover:text-blue-400 transition" title={isMuted ? 'Bật tiếng' : 'Tắt tiếng'}>
                     <span className="material-symbols-outlined text-2xl">{getVolumeIcon()}</span>
                   </button>
                   <input
                     type="range"
                     min="0"
                     max="1"
                     step="0.01"
                     value={volume}
                     onChange={(e) => setMediaVolume(Number(e.target.value))}
                     className="w-14 sm:w-24 accent-blue-500 cursor-pointer"
                     aria-label="Âm lượng"
                   />
                   <span className="hidden sm:inline text-xs text-white/80 tabular-nums w-9 text-right">{Math.round(volume * 100)}%</span>
                 </div>
                 <button onClick={toggleFullscreen} className="hover:text-blue-400 transition">
                   <span className="material-symbols-outlined text-2xl">{!document.fullscreenElement?'fullscreen':'fullscreen_exit'}</span>
                 </button>
               </div>
            </div>
          </div>

          <div className="glass-surface rounded-2xl p-4 border border-white/70">
            <div className="flex flex-wrap gap-2 items-center">
              <button onClick={() => setShowCn((v) => !v)} className={`px-3 py-1.5 rounded-lg text-sm border transition ${showCn ? 'glass-chip-active border-blue-400/40' : 'glass-chip'}`}>{currentTrack === 'english' ? 'EN' : 'CN'}</button>
              <button onClick={() => setShowVi((v) => !v)} className={`px-3 py-1.5 rounded-lg text-sm border transition ${showVi ? 'glass-chip-active border-blue-400/40' : 'glass-chip'}`}>VI</button>
              {currentTrack === 'chinese' && (
                <button onClick={() => setShowPinyin((v) => !v)} className={`px-3 py-1.5 rounded-lg text-sm border transition ${showPinyin ? 'glass-chip-active border-blue-400/40' : 'glass-chip'}`}>Pinyin</button>
              )}

              <div className="h-5 w-px bg-blue-200/60 mx-1" />

              <button onClick={repeatCurrentSentence} className="px-3 py-1.5 rounded-lg text-sm glass-chip">Lặp lại câu hiện tại</button>
              <button onClick={toggleLoopCurrentSentence} className={`px-3 py-1.5 rounded-lg text-sm border transition ${loopEnabled ? 'glass-chip-active' : 'glass-chip'}`}>
                {loopEnabled ? 'Dừng loop câu' : 'Loop câu hiện tại'}
              </button>
              {loopEnabled && loopRange && (
                <span className="glass-status glass-status-warning">{toDuration(loopRange.start)} - {toDuration(loopRange.end)}</span>
              )}

              <div className="ml-auto text-xs text-glass-subtle">{toDuration(currentTime)} / {toDuration(duration)}</div>
            </div>
          </div>

          <div className="glass-surface rounded-2xl border border-white/70">
            <div className="px-4 pt-4 pb-2 glass-section-head mb-0">
              <h2 className="glass-section-title">Video liên quan</h2>
              <Link to="/library" className="glass-chip px-3 py-1 text-xs text-blue-700 font-semibold">Xem thêm</Link>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 stagger-sequence">
              {relatedVideos.length ? relatedVideos.map((item) => (
                <Link key={item.id} to={`/player/${item.id}`} className="stagger-item flex gap-3 p-2 rounded-xl glass-surface border border-white/65 transition glass-hover-lift">
                  <VideoThumbnail
                    thumbnailUrl={item.thumbnail_url}
                    videoUrl={item.video_url}
                    alt={item.title}
                    className="w-24 h-14 rounded object-cover bg-gray-100"
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-blue-950 line-clamp-2">{item.title}</h3>
                    <p className="text-xs text-glass-subtle mt-1">{getLevelLabel(normalizeTrackValue(item.language_track, 'chinese'), item.hsk_level)} • {toDuration(item.duration)}</p>
                  </div>
                </Link>
              )) : (
                <p className="text-sm text-glass-subtle">Không có video liên quan</p>
              )}
            </div>
          </div>
        </section>

        <aside className="xl:col-span-1">
          <div className="glass-surface rounded-2xl border border-white/70 overflow-hidden">
            <div className="flex gap-2 p-2 border-b border-blue-200/40 text-sm font-medium overflow-x-auto glass-scroll">
              {[
                { key: 'sentences', label: 'Câu' },
                { key: 'shadow', label: 'Shadow' },
                { key: 'vocabulary', label: `Từ vựng (${vocabulary.length})` },
                { key: 'slang', label: `Tiếng lóng (${slang.length})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`shrink-0 min-w-[116px] sm:min-w-0 sm:flex-1 px-3 py-2.5 rounded-xl transition ${activeTab === tab.key ? 'glass-chip-active' : 'glass-chip'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'sentences' && (
              <div ref={sentenceListRef} className="max-h-[70vh] overflow-auto p-3 space-y-2 glass-scroll">
                {timelineSubtitles.length ? timelineSubtitles.map((entry, idx) => (
                  <button
                    key={`${entry.start}-${idx}`}
                    data-sub-idx={idx}
                    onClick={() => jumpToSentence(idx)}
                    className={`w-full text-left p-3 rounded-xl transition border ${idx === currentSubtitleIndex ? 'glass-surface-strong border-blue-400/40' : 'glass-surface border-white/65 hover:bg-white/70'}`}
                  >
                    <div className="text-[11px] text-blue-500 font-semibold mb-1 tabular-nums">{toDuration(entry.start)}</div>
                    <div className="text-[15px] text-slate-800 font-bold leading-snug">{entry.text}</div>
                    {(dbSubtitles.length ? dbSubtitles[idx]?.vn_text : subVi[idx]?.text) != entry.text && (dbSubtitles.length ? dbSubtitles[idx]?.vn_text : subVi[idx]?.text) && <div className="text-[13.5px] text-slate-500 font-medium mt-1 leading-snug">{dbSubtitles.length ? dbSubtitles[idx]?.vn_text : subVi[idx]?.text}</div>}
                  </button>
                )) : (
                  <p className="text-sm text-glass-subtle">Chưa có phụ đề.</p>
                )}
              </div>
            )}

            {activeTab === 'shadow' && (
              <div className="max-h-[70vh] overflow-auto p-3 space-y-3 glass-scroll">
                <div className="glass-surface rounded-xl border border-white/70 p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="glass-section-title text-sm">
                      <span className="material-symbols-outlined text-blue-600">mic</span>
                      Shadowing Studio
                    </h3>
                    <span className={`glass-status ${isRecording ? 'glass-status-danger' : 'glass-status-neutral'}`}>
                      {isRecording ? `Đang ghi ${toDuration(recordSeconds)}` : 'Sẵn sàng'}
                    </span>
                  </div>

                  <p className="text-xs text-glass-subtle">
                    Bấm nghe mẫu câu hiện tại, sau đó ghi âm giọng của bạn để so sánh và luyện phát âm.
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <button onClick={repeatCurrentSentence} className="glass-chip px-3 py-1.5 text-xs">Nghe mẫu câu hiện tại</button>

                    {!isRecording ? (
                      <button onClick={startShadowRecording} className="glass-btn glass-btn-primary px-3 py-1.5 text-xs font-semibold">
                        Bắt đầu ghi âm
                      </button>
                    ) : (
                      <button onClick={stopShadowRecording} className="glass-chip px-3 py-1.5 text-xs text-rose-600 font-semibold">
                        Dừng ghi âm
                      </button>
                    )}

                    <button
                      onClick={replayRecordedAudio}
                      disabled={!recordedAudioUrl}
                      className="glass-chip px-3 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Nghe lại bản ghi
                    </button>

                    <button
                      onClick={resetRecordedAudio}
                      disabled={!recordedAudioUrl || isRecording}
                      className="glass-chip px-3 py-1.5 text-xs text-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Xóa bản ghi
                    </button>
                  </div>

                  {recordError && (
                    <p className="text-xs text-rose-600 bg-rose-100/60 rounded-lg px-2 py-1 border border-rose-200/70">{recordError}</p>
                  )}

                  {recordedAudioUrl && (
                    <div className="space-y-2">
                      <audio ref={recordedAudioRef} controls src={recordedAudioUrl} className="w-full" />
                      <a
                        href={recordedAudioUrl}
                        download={`shadowing-${videoId}.webm`}
                        className="inline-flex items-center gap-1 text-xs text-blue-700 font-semibold hover:underline"
                      >
                        <span className="material-symbols-outlined text-sm">download</span>
                        Tải bản ghi âm
                      </a>
                    </div>
                  )}
                </div>

                {currentSubtitle && (
                  <div className="glass-empty text-left">
                    <p className="text-xs text-glass-subtle mb-1">Câu đang luyện</p>
                    <p className="text-sm text-blue-950 font-medium">{currentSubtitle.text}</p>
                    {showPinyin && currentPinyinSubtitle && currentPinyinSubtitle.text !== currentSubtitle.text && (
                      <p className="text-xs text-blue-600 mt-1">{currentPinyinSubtitle.text}</p>
                    )}
                    {showVi && currentViSubtitle && currentViSubtitle.text !== currentSubtitle.text && (
                      <p className="text-xs text-glass-subtle mt-1">{currentViSubtitle.text}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'vocabulary' && (
              <div className="max-h-[70vh] overflow-auto p-3 space-y-2 glass-scroll stagger-sequence">
                {isAdmin && (
                  <button
                    onClick={generateVocabulary}
                    className="w-full mb-2 px-3 py-2 rounded-lg glass-btn glass-btn-primary text-sm font-semibold"
                  >
                    AI tạo từ vựng
                  </button>
                )}

                {vocabulary.length ? vocabulary.map((item) => {
                  const isSaved = savedWordIds.has(Number(item.id));
                  const speakKey = `${item?.id || item.word}-${item.word}`;
                  const isCurrentWord = speakingWordKey === speakKey;
                  const currentPronunciationState = pronunciationState.key === speakKey ? pronunciationState.value : 'idle';
                  const isLoadingPronunciation = isCurrentWord && currentPronunciationState === 'loading';
                  const isPlayingPronunciation = isCurrentWord && currentPronunciationState === 'playing';
                  const isPronunciationError = currentPronunciationState === 'error';

                  return (
                    <div key={item.id} className="stagger-item p-3 rounded-xl glass-surface border border-white/70">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-lg font-semibold text-blue-950">{item.word}</div>
                          <div className="text-sm text-blue-600">{item.pinyin || ''}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => speakVocabularyWord(item)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition inline-flex items-center gap-1 ${isPlayingPronunciation || isLoadingPronunciation ? 'glass-chip-active border-blue-400/50 text-blue-700' : isPronunciationError ? 'border-rose-300/60 bg-rose-50/60 text-rose-700' : 'glass-chip text-blue-700'}`}
                          >
                            <span className="material-symbols-outlined text-sm">
                              {isPlayingPronunciation ? 'stop_circle' : isLoadingPronunciation ? 'hourglass_top' : isPronunciationError ? 'error' : 'volume_up'}
                            </span>
                            {isPlayingPronunciation ? 'Dừng' : isLoadingPronunciation ? 'Đang tải' : isPronunciationError ? 'Lỗi' : 'Nghe'}
                          </button>

                          <button
                            onClick={() => saveWord(item)}
                            disabled={isSaved}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${isSaved ? 'glass-status glass-status-success disabled:opacity-100' : 'glass-chip text-amber-700 disabled:opacity-60 disabled:cursor-not-allowed'}`}
                          >
                            {isSaved ? 'Đã lưu' : 'Lưu'}
                          </button>
                        </div>
                      </div>

                      <div className="text-sm text-glass-subtle mt-2">{item.meaning || '(Chưa có nghĩa)'}</div>
                      {item.example && <div className="text-xs text-glass-subtle mt-2 border-t border-blue-200/40 pt-2">Ví dụ: {item.example}</div>}
                    </div>
                  );
                }) : (
                  <p className="text-sm text-glass-subtle">Chưa có từ vựng cho video này.</p>
                )}
              </div>
            )}

            {activeTab === 'slang' && (
              <div className="max-h-[70vh] overflow-auto p-3 space-y-2 glass-scroll stagger-sequence">
                {slang.length ? slang.map((item) => (
                  <div key={item.id} className="stagger-item p-3 rounded-xl border border-white/70 glass-surface">
                    <p className="text-xl font-semibold text-blue-950 leading-tight">{item.word_cn}</p>
                    {item.pinyin && <p className="text-base text-blue-700 mt-1">Pinyin: {item.pinyin}</p>}
                    {item.meaning_vi && <p className="text-base text-glass-subtle mt-1">Nghĩa: {item.meaning_vi}</p>}
                    {item.tone_note && <p className="text-base text-glass-subtle mt-1">Sắc thái: {item.tone_note}</p>}
                    {item.usage_note && <p className="text-base text-glass-subtle mt-1">Cách dùng: {item.usage_note}</p>}

                    {(item.example_cn_1 || item.example_pinyin_1 || item.example_vi_1) && (
                      <div className="mt-3 space-y-0.5">
                        <p className="text-sm font-semibold text-blue-700">Ví dụ</p>
                        {item.example_cn_1 && <p className="text-base text-blue-950">{item.example_cn_1}</p>}
                        {item.example_pinyin_1 && <p className="text-base text-glass-subtle">{item.example_pinyin_1}</p>}
                        {item.example_vi_1 && <p className="text-base text-glass-subtle">{item.example_vi_1}</p>}
                      </div>
                    )}

                    {(item.example_cn_2 || item.example_pinyin_2 || item.example_vi_2) && (
                      <div className="mt-3 space-y-0.5">
                        <p className="text-sm font-semibold text-blue-700">Ví dụ 2</p>
                        {item.example_cn_2 && <p className="text-base text-blue-950">{item.example_cn_2}</p>}
                        {item.example_pinyin_2 && <p className="text-base text-glass-subtle">{item.example_pinyin_2}</p>}
                        {item.example_vi_2 && <p className="text-base text-glass-subtle">{item.example_vi_2}</p>}
                      </div>
                    )}
                  </div>
                )) : (
                  <p className="text-sm text-glass-subtle">Video này chưa có tiếng lóng.</p>
                )}
              </div>
            )}
          </div>
        </aside>
      </main>

      <UserPanelDrawer
        isOpen={isUserPanelOpen}
        onClose={() => setIsUserPanelOpen(false)}
        onLogout={handleLogout}
        currentUser={currentUser}
      />
    </div>
  );
};

export default Player;
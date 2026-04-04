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

const toDuration = (seconds) => {
  const safe = Math.max(0, Math.floor(Number(seconds || 0)));
  const mm = Math.floor(safe / 60);
  const ss = safe % 60;
  return `${mm}:${String(ss).padStart(2, '0')}`;
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
    if (subCn.length) return subCn;
    if (subVi.length) return subVi;
    if (subPinyin.length) return subPinyin;
    return [];
  }, [subCn, subVi, subPinyin]);

  const currentSubtitleIndex = useMemo(
    () => findSubtitleIndex(timelineSubtitles, currentTime),
    [timelineSubtitles, currentTime]
  );

  const currentCnSubtitle = useMemo(() => {
    const index = findSubtitleIndex(subCn, currentTime);
    return index >= 0 ? subCn[index] : null;
  }, [subCn, currentTime]);

  const currentViSubtitle = useMemo(() => {
    const index = findSubtitleIndex(subVi, currentTime);
    return index >= 0 ? subVi[index] : null;
  }, [subVi, currentTime]);

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

  const fetchRelated = async (categoryId, excludeVideoId) => {
    try {
      let url = `${API_BASE}/product?limit=6&status=published`;
      if (categoryId) {
        url += `&category=${categoryId}`;
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

  const pickChineseVoice = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return null;
    }

    const voices = window.speechSynthesis.getVoices();
    if (!Array.isArray(voices) || !voices.length) {
      return null;
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

  const playWordByAudioFallback = (word, key) => {
    const encoded = encodeURIComponent(word);
    const sources = [
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
      playWordByAudioFallback(word, key);
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

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voice = pickChineseVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || 'zh-CN';
    }

    let started = false;
    const fallbackTimer = window.setTimeout(() => {
      if (!started) {
        speech.cancel();
        playWordByAudioFallback(word, key);
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

      playWordByAudioFallback(word, key);
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

        const [cn, vi, py] = await Promise.all([
          loadVttFile(payload.subtitle_cn_url),
          loadVttFile(payload.subtitle_vi_url),
          loadVttFile(payload.subtitle_pinyin_url),
        ]);

        setSubCn(cn);
        setSubVi(vi);
        setSubPinyin(py);

        await Promise.all([
          fetchVocabulary(payload.id),
          fetchSlang(payload.id),
          fetchRelated(payload.category_id, payload.id),
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

  useEffect(() => {
    if (!videoRef.current || !videoData?.id) return undefined;

    const node = videoRef.current;
    const onLoadedMeta = () => {
      setDuration(Number(node.duration || 0));
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

    return () => {
      node.removeEventListener('loadedmetadata', onLoadedMeta);
      node.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [loopEnabled, loopRange, videoId, startAt, videoData?.id]);

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

  const jumpToSentence = (index) => {
    if (!videoRef.current || index < 0 || index >= timelineSubtitles.length) return;
    videoRef.current.currentTime = timelineSubtitles[index].start;
    videoRef.current.play();
  };

  const repeatCurrentSentence = () => {
    if (!currentSubtitle || !videoRef.current) return;
    videoRef.current.currentTime = currentSubtitle.start;
    videoRef.current.play();
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
          <div className="rounded-2xl overflow-hidden bg-black relative shadow-lg">
            <video
              ref={videoRef}
              src={videoData.video_url}
              controls
              className="w-full aspect-video"
              preload="metadata"
            />

            <div className="absolute left-0 right-0 bottom-9 md:bottom-11 px-4 pb-2 pt-8 pointer-events-none">
              {showCn && currentCnSubtitle && (
                <div className="text-white text-center font-medium text-base md:text-lg [text-shadow:0_2px_8px_rgba(0,0,0,0.7)]">{currentCnSubtitle.text}</div>
              )}
              {showVi && currentViSubtitle && (
                <div className="text-white/90 text-center text-sm mt-1 [text-shadow:0_2px_8px_rgba(0,0,0,0.65)]">{currentViSubtitle.text}</div>
              )}
              {showPinyin && currentPinyinSubtitle && (
                <div className="text-blue-200 text-center text-sm mt-1 [text-shadow:0_2px_8px_rgba(0,0,0,0.65)]">{currentPinyinSubtitle.text}</div>
              )}
            </div>
          </div>

          <div className="glass-surface rounded-2xl p-4 border border-white/70">
            <div className="flex flex-wrap gap-2 items-center">
              <button onClick={() => setShowCn((v) => !v)} className={`px-3 py-1.5 rounded-lg text-sm border transition ${showCn ? 'glass-chip-active border-blue-400/40' : 'glass-chip'}`}>CN</button>
              <button onClick={() => setShowVi((v) => !v)} className={`px-3 py-1.5 rounded-lg text-sm border transition ${showVi ? 'glass-chip-active border-blue-400/40' : 'glass-chip'}`}>VI</button>
              <button onClick={() => setShowPinyin((v) => !v)} className={`px-3 py-1.5 rounded-lg text-sm border transition ${showPinyin ? 'glass-chip-active border-blue-400/40' : 'glass-chip'}`}>Pinyin</button>

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
                    <p className="text-xs text-glass-subtle mt-1">HSK {item.hsk_level} • {toDuration(item.duration)}</p>
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
                    <div className="text-xs text-glass-subtle mb-1">{toDuration(entry.start)}</div>
                    <div className="text-sm text-blue-950">{entry.text}</div>
                    {subVi[idx] && subVi[idx].text !== entry.text && <div className="text-xs text-glass-subtle mt-1">{subVi[idx].text}</div>}
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
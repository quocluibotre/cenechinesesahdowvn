import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import VideoThumbnail from '../components/ui/VideoThumbnail';
import { API_BASE } from '../utils/apiBase';

const EMPTY_UPLOAD_FORM = {
  title: '',
  title_cn: '',
  description: '',
  category_id: '',
  hsk_level: '1',
  language_track: 'chinese',
  is_free: true,
  is_published: true,
  duration: '0',
  video_url: '',
  thumbnail_url: '',
  subtitle_cn_url: '',
  subtitle_vi_url: '',
  subtitle_pinyin_url: '',
};

const EMPTY_ASSET_FILES = {
  video: null,
  thumbnail: null,
  subtitleCn: null,
  subtitleVi: null,
  subtitlePinyin: null,
};

const createEmptySlangEntry = () => ({
  word_cn: '',
  pinyin: '',
  meaning_vi: '',
  tone_note: '',
  usage_note: '',
  example_cn_1: '',
  example_pinyin_1: '',
  example_vi_1: '',
  example_cn_2: '',
  example_pinyin_2: '',
  example_vi_2: '',
});

const mapSlangEntryFromApi = (item = {}) => ({
  word_cn: item.word_cn || item.word || '',
  pinyin: item.pinyin || '',
  meaning_vi: item.meaning_vi || item.meaning || '',
  tone_note: item.tone_note || item.tone || '',
  usage_note: item.usage_note || item.usage || '',
  example_cn_1: item.example_cn_1 || '',
  example_pinyin_1: item.example_pinyin_1 || '',
  example_vi_1: item.example_vi_1 || '',
  example_cn_2: item.example_cn_2 || '',
  example_pinyin_2: item.example_pinyin_2 || '',
  example_vi_2: item.example_vi_2 || '',
});

const getDefaultCategoryId = (list = []) => {
  if (!Array.isArray(list) || !list.length) {
    return '';
  }
  return String(list[0].id);
};

const normalizeTrackValue = (value, fallback = 'chinese') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (['english', 'en', 'eng'].includes(normalized)) return 'english';
  if (['chinese', 'cn', 'zh', 'mandarin'].includes(normalized)) return 'chinese';
  return fallback;
};

const extractYouTubeIdFromUrl = (videoUrl) => {
  const safeUrl = String(videoUrl || '').trim();
  if (!safeUrl) return '';

  const match = safeUrl.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/i);
  return match?.[1] || '';
};

const normalizeSlangEntries = (entries) => {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry) => ({
      ...mapSlangEntryFromApi(entry),
      sort_order: Number(entry?.sort_order || 0),
    }))
    .map((entry, index) => ({
      ...entry,
      word_cn: String(entry.word_cn || '').trim(),
      pinyin: String(entry.pinyin || '').trim(),
      meaning_vi: String(entry.meaning_vi || '').trim(),
      tone_note: String(entry.tone_note || '').trim(),
      usage_note: String(entry.usage_note || '').trim(),
      example_cn_1: String(entry.example_cn_1 || '').trim(),
      example_pinyin_1: String(entry.example_pinyin_1 || '').trim(),
      example_vi_1: String(entry.example_vi_1 || '').trim(),
      example_cn_2: String(entry.example_cn_2 || '').trim(),
      example_pinyin_2: String(entry.example_pinyin_2 || '').trim(),
      example_vi_2: String(entry.example_vi_2 || '').trim(),
      sort_order: index + 1,
    }))
    .filter((entry) => entry.word_cn);
};

const SlangEditor = ({
  entries,
  onAdd,
  onRemove,
  onFieldChange,
}) => (
  <div className="md:col-span-2 space-y-3">
    <div className="glass-surface-strong rounded-xl border border-white/70 p-3 flex flex-wrap items-center justify-between gap-2">
      <div>
        <h4 className="text-sm font-semibold text-blue-900">Từ lóng (tuỳ chọn)</h4>
        <p className="text-xs text-glass-subtle">Mỗi mục gồm từ, nghĩa, sắc thái, cách dùng và tối đa 2 ví dụ.</p>
      </div>
      <button type="button" onClick={onAdd} className="px-3 py-1.5 rounded-lg glass-chip text-xs font-semibold text-blue-700">
        + Thêm từ lóng
      </button>
    </div>

    {entries.map((entry, index) => (
      <div key={`slang-${index}`} className="glass-surface rounded-xl border border-white/70 p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-blue-900">Mục #{index + 1}</p>
          <button
            type="button"
            onClick={() => onRemove(index)}
            disabled={entries.length <= 1}
            className="px-2.5 py-1 rounded-lg glass-chip text-xs text-rose-600 disabled:opacity-50"
          >
            Xóa
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            className="glass-input px-3 py-2 rounded-lg"
            placeholder="Từ lóng (word_cn)"
            value={entry.word_cn}
            onChange={(e) => onFieldChange(index, 'word_cn', e.target.value)}
          />
          <input
            className="glass-input px-3 py-2 rounded-lg"
            placeholder="Pinyin"
            value={entry.pinyin}
            onChange={(e) => onFieldChange(index, 'pinyin', e.target.value)}
          />
          <textarea
            className="glass-input px-3 py-2 rounded-lg md:col-span-2"
            placeholder="Nghĩa (meaning_vi)"
            value={entry.meaning_vi}
            onChange={(e) => onFieldChange(index, 'meaning_vi', e.target.value)}
          />
          <textarea
            className="glass-input px-3 py-2 rounded-lg"
            placeholder="Sắc thái (tone_note)"
            value={entry.tone_note}
            onChange={(e) => onFieldChange(index, 'tone_note', e.target.value)}
          />
          <textarea
            className="glass-input px-3 py-2 rounded-lg"
            placeholder="Cách dùng (usage_note)"
            value={entry.usage_note}
            onChange={(e) => onFieldChange(index, 'usage_note', e.target.value)}
          />

          <div className="md:col-span-2 text-xs font-semibold text-blue-700">Ví dụ 1</div>
          <input
            className="glass-input px-3 py-2 rounded-lg"
            placeholder="Ví dụ CN 1"
            value={entry.example_cn_1}
            onChange={(e) => onFieldChange(index, 'example_cn_1', e.target.value)}
          />
          <input
            className="glass-input px-3 py-2 rounded-lg"
            placeholder="Ví dụ Pinyin 1"
            value={entry.example_pinyin_1}
            onChange={(e) => onFieldChange(index, 'example_pinyin_1', e.target.value)}
          />
          <input
            className="glass-input px-3 py-2 rounded-lg md:col-span-2"
            placeholder="Ví dụ VI 1"
            value={entry.example_vi_1}
            onChange={(e) => onFieldChange(index, 'example_vi_1', e.target.value)}
          />

          <div className="md:col-span-2 text-xs font-semibold text-blue-700">Ví dụ 2</div>
          <input
            className="glass-input px-3 py-2 rounded-lg"
            placeholder="Ví dụ CN 2"
            value={entry.example_cn_2}
            onChange={(e) => onFieldChange(index, 'example_cn_2', e.target.value)}
          />
          <input
            className="glass-input px-3 py-2 rounded-lg"
            placeholder="Ví dụ Pinyin 2"
            value={entry.example_pinyin_2}
            onChange={(e) => onFieldChange(index, 'example_pinyin_2', e.target.value)}
          />
          <input
            className="glass-input px-3 py-2 rounded-lg md:col-span-2"
            placeholder="Ví dụ VI 2"
            value={entry.example_vi_2}
            onChange={(e) => onFieldChange(index, 'example_vi_2', e.target.value)}
          />
        </div>
      </div>
    ))}
  </div>
);

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const requestPresignedUpload = async (file, folder) => {
  const response = await fetch(`${API_BASE}/upload/presign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      filename: file.name,
      content_type: file.type || 'application/octet-stream',
      folder,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.success || !data.presigned_url || !data.public_url) {
    throw new Error(data.error || data.message || 'Không thể tạo presigned URL');
  }

  return data;
};

const uploadFileToCloudflare = async (file, folder) => {
  if (!file) {
    return '';
  }

  const signed = await requestPresignedUpload(file, folder);
  const putResponse = await fetch(signed.presigned_url, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || signed.content_type || 'application/octet-stream',
    },
    body: file,
  });

  if (!putResponse.ok) {
    throw new Error(`Upload file ${file.name} thất bại`);
  }

  return signed.public_url;
};

const toPayload = (form, slangEntries = []) => {
  const parsedCategoryId = Number(form.category_id);

  return {
    ...form,
    category_id: Number.isFinite(parsedCategoryId) && parsedCategoryId > 0 ? parsedCategoryId : null,
    hsk_level: Number(form.hsk_level),
    language_track: normalizeTrackValue(form.language_track, 'chinese'),
    duration: Number(form.duration || 0),
    is_free: Boolean(form.is_free),
    is_published: Boolean(form.is_published),
    slang_entries: normalizeSlangEntries(slangEntries),
  };
};

const Admin = () => {
  const navigate = useNavigate();

  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [error, setError] = useState('');

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [videos, setVideos] = useState([]);
  const [categories, setCategories] = useState([]);

  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [uploadForm, setUploadForm] = useState({ ...EMPTY_UPLOAD_FORM });
  const [uploadFiles, setUploadFiles] = useState({ ...EMPTY_ASSET_FILES });
  const [uploadSlangEntries, setUploadSlangEntries] = useState([createEmptySlangEntry()]);
  const [uploading, setUploading] = useState(false);

  const [editVideoId, setEditVideoId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editFiles, setEditFiles] = useState({ ...EMPTY_ASSET_FILES });
  const [editSlangEntries, setEditSlangEntries] = useState([createEmptySlangEntry()]);
  const [savingEdit, setSavingEdit] = useState(false);

  // States cho tính năng tải Youtube
  const [ytUrl, setYtUrl] = useState('');
  const [ytStatus, setYtStatus] = useState('');
  const [isYtProcessing, setIsYtProcessing] = useState(false);

  // States cho tính năng dịch lại phụ đề
  const [ytRetranslateId, setYtRetranslateId] = useState('');
  const [retranslateStatus, setRetranslateStatus] = useState('');
  const [isRetranslating, setIsRetranslating] = useState(false);
  const editYoutubeId = useMemo(() => extractYouTubeIdFromUrl(editForm?.video_url), [editForm?.video_url]);

  // States cho tính năng thêm phìm IMDB
  const [movieForm, setMovieForm] = useState({
    imdb_url: '',
    title: '',
    title_en: '',
    description: '',
    category_id: '',
    hsk_level: '3',
    thumbnail_url: '',
    is_published: true,
    is_free: true,
  });
  const [movieStatus, setMovieStatus] = useState('');
  const [isMovieProcessing, setIsMovieProcessing] = useState(false);
  const [savedMovieId, setSavedMovieId] = useState(null);
  const [subImportStatus, setSubImportStatus] = useState('');
  const [isSubImporting, setIsSubImporting] = useState(false);
  const [subCandidates, setSubCandidates] = useState([]);
  const [isSearchingSubs, setIsSearchingSubs] = useState(false);


  const userCountText = useMemo(() => `${users.length} người dùng`, [users.length]);
  const adminTabs = [
    { key: 'dashboard', label: 'Tổng quan', icon: 'dashboard' },
    { key: 'videos', label: 'Video', icon: 'movie' },
    { key: 'users', label: 'Người dùng', icon: 'groups' },
    { key: 'upload', label: 'Đăng R2', icon: 'cloud_upload' },
    { key: 'youtube', label: 'Thêm Youtube (AI)', icon: 'smart_display' },
    { key: 'movie', label: 'Thêm Phìm (IMDB)', icon: 'theaters' },
  ];

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE}/category`);
      const data = await response.json();
      setCategories(data.data || []);
    } catch (e) {
      console.error('Error loading categories:', e);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/stats`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setStats(data.data);
        return;
      }
      setError(data.error || data.message || 'Không thể tải dashboard');
    } catch (e) {
      console.error('Error loading stats:', e);
      setError('Lỗi kết nối dashboard');
    }
  };

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams({ page: '1', limit: '50' });
      if (userSearch) params.set('search', userSearch);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter !== '') params.set('status', statusFilter);

      const response = await fetch(`${API_BASE}/user?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setUsers(data.data || []);
        return;
      }
      setError(data.error || data.message || 'Không thể tải danh sách user');
    } catch (e) {
      console.error('Error loading users:', e);
      setError('Lỗi kết nối danh sách user');
    }
  };

  const fetchVideos = async () => {
    try {
      const response = await fetch(`${API_BASE}/product?limit=200`);
      const data = await response.json();
      setVideos(data.data || []);
    } catch (e) {
      console.error('Error loading videos:', e);
      setError('Lỗi kết nối danh sách video');
    }
  };

  const refreshAll = async () => {
    await Promise.all([fetchCategories(), fetchStats(), fetchUsers(), fetchVideos()]);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    let mounted = true;

    const verifySession = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login', { replace: true });
        if (mounted) {
          setIsAuthorized(false);
          setAuthChecked(true);
        }
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: getAuthHeaders(),
        });
        const data = await response.json();

        if (!response.ok || !data.success || !data.user) {
          throw new Error('Invalid session');
        }

        localStorage.setItem('user', JSON.stringify(data.user));

        if (data.user.role !== 'admin') {
          navigate('/home', { replace: true });
          if (mounted) {
            setIsAuthorized(false);
            setAuthChecked(true);
          }
          return;
        }

        if (mounted) {
          setIsAuthorized(true);
          setAuthChecked(true);
        }
      } catch (err) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login', { replace: true });
        if (mounted) {
          setIsAuthorized(false);
          setAuthChecked(true);
        }
      }
    };

    verifySession();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (isAuthorized) {
      refreshAll();
    }
  }, [isAuthorized]);

  useEffect(() => {
    const validCategoryIds = new Set(categories.map((cat) => String(cat.id)));
    const fallbackCategoryId = getDefaultCategoryId(categories);

    setUploadForm((prev) => {
      const currentCategoryId = String(prev.category_id || '');
      if ((currentCategoryId && validCategoryIds.has(currentCategoryId)) || currentCategoryId === fallbackCategoryId) {
        return prev;
      }
      return { ...prev, category_id: fallbackCategoryId };
    });

    setEditForm((prev) => {
      if (!prev) {
        return prev;
      }

      const currentCategoryId = String(prev.category_id || '');
      if ((currentCategoryId && validCategoryIds.has(currentCategoryId)) || currentCategoryId === fallbackCategoryId) {
        return prev;
      }
      return { ...prev, category_id: fallbackCategoryId };
    });
  }, [categories]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch, roleFilter, statusFilter]);

  const updateUser = async (userId, payload) => {
    try {
      const response = await fetch(`${API_BASE}/user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.error || 'Cập nhật user thất bại');
        return;
      }
      fetchUsers();
    } catch (e) {
      console.error('Error updating user:', e);
      setError('Lỗi cập nhật user');
    }
  };

  const deleteUser = async (userId, label) => {
    if (!window.confirm(`Bạn chắc chắn muốn xóa user ${label}?`)) return;

    try {
      const response = await fetch(`${API_BASE}/user/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.error || 'Xóa user thất bại');
        return;
      }
      fetchUsers();
      fetchStats();
    } catch (e) {
      console.error('Error deleting user:', e);
      setError('Lỗi xóa user');
    }
  };

  const deleteVideo = async (id) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa video này?')) return;

    try {
      const response = await fetch(`${API_BASE}/product/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.error || data.message || 'Xóa video thất bại');
        return;
      }
      fetchVideos();
      fetchStats();
    } catch (e) {
      console.error('Error deleting video:', e);
      setError('Lỗi xóa video');
    }
  };

  const resolveUrlsWithUpload = async (form, files) => {
    const result = { ...form };

    if (files.video) {
      result.video_url = await uploadFileToCloudflare(files.video, 'videos');
    }
    if (files.thumbnail) {
      result.thumbnail_url = await uploadFileToCloudflare(files.thumbnail, 'thumbnails');
    }
    if (files.subtitleCn) {
      result.subtitle_cn_url = await uploadFileToCloudflare(files.subtitleCn, 'subtitles');
    }
    if (files.subtitleVi) {
      result.subtitle_vi_url = await uploadFileToCloudflare(files.subtitleVi, 'subtitles');
    }
    if (files.subtitlePinyin) {
      result.subtitle_pinyin_url = await uploadFileToCloudflare(files.subtitlePinyin, 'subtitles');
    }

    return result;
  };

  const updateSlangField = (setter) => (index, field, value) => {
    setter((prev) => prev.map((entry, idx) => (idx === index ? { ...entry, [field]: value } : entry)));
  };

  const addSlangEntry = (setter) => {
    setter((prev) => [...prev, createEmptySlangEntry()]);
  };

  const removeSlangEntry = (setter) => (index) => {
    setter((prev) => {
      if (prev.length <= 1) {
        return [createEmptySlangEntry()];
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const fetchVideoSlangEntries = async (videoId) => {
    try {
      const response = await fetch(`${API_BASE}/blog/slang?video_id=${videoId}`);
      const data = await response.json();
      if (response.ok && data.success && Array.isArray(data.data) && data.data.length) {
        return data.data.map(mapSlangEntryFromApi);
      }
    } catch (e) {
      console.error('Error loading slang entries for edit:', e);
    }

    return [createEmptySlangEntry()];
  };

  const triggerBackgroundVocabularyGenerate = async (videoId) => {
    const safeVideoId = Number(videoId);
    if (!Number.isFinite(safeVideoId) || safeVideoId <= 0) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/blog/vocabulary/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ video_id: safeVideoId }),
        keepalive: true,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        console.warn('Background generate vocabulary failed:', data.error || response.statusText);
      }
    } catch (error) {
      console.warn('Background generate vocabulary error:', error?.message || error);
    }
  };

  const uploadVideo = async (e) => {
    e.preventDefault();
    setUploading(true);
    setError('');

    try {
      const preparedForm = await resolveUrlsWithUpload(uploadForm, uploadFiles);
      if (!preparedForm.video_url) {
        setError('Vui lòng nhập Video URL hoặc chọn file video để upload Cloudflare');
        return;
      }

      const response = await fetch(`${API_BASE}/product/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(toPayload(preparedForm, uploadSlangEntries)),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Upload metadata thất bại');
        return;
      }

      const createdVideoId = Number(data?.data?.id || 0);
      if (createdVideoId > 0) {
        void triggerBackgroundVocabularyGenerate(createdVideoId);
      }

      setUploadForm({ ...EMPTY_UPLOAD_FORM, category_id: getDefaultCategoryId(categories) });
      setUploadFiles({ ...EMPTY_ASSET_FILES });
      setUploadSlangEntries([createEmptySlangEntry()]);
      await Promise.all([fetchVideos(), fetchStats()]);
      setActiveTab('videos');
    } catch (err) {
      console.error('Error uploading video metadata:', err);
      setError(err.message || 'Lỗi upload metadata');
    } finally {
      setUploading(false);
    }
  };

  const retranslateSubtitles = async () => {
    if (!ytRetranslateId) {
      setRetranslateStatus('⚠️ Vui lòng chọn video cần dịch lại');
      return;
    }
    setIsRetranslating(true);
    setRetranslateStatus('Đang dịch lại các câu chưa dịch...');
    try {
      const res = await fetch(`${API_BASE}/youtube/subtitles/retranslate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ video_id: Number(ytRetranslateId) }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setRetranslateStatus(`✅ ${data.message} (${data.updated}/${data.total} câu)`);
    } catch (err) {
      setRetranslateStatus(`❌ Lỗi: ${err.message}`);
    } finally {
      setIsRetranslating(false);
    }
  };

  const processYoutube = async (langTrack) => {
    if(!ytUrl) {
      setYtStatus("Vui lòng nhập Link Youtube trước");
      return;
    }
    setIsYtProcessing(true);
    setYtStatus(`Đang lấy thông tin Youtube (${langTrack})...`);
    try {
      const res = await fetch(`${API_BASE}/youtube/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ url: ytUrl, language_track: langTrack })
      });
      const data = await res.json();
      if(!data.success) throw new Error(data.message);
      
      const db_id = data.data.id;
      const yt_id = data.data.youtube_id;

      // Cập nhật lại logic language track ngay sau khi nó được default 'english' trong code controller cũ (có thể update controller sau, hoặc admin sẽ tự edit lại track)
      // Tạm thời gọi API dịch sub
      setYtStatus(`Đang dùng AI bóc tách sub & dịch (Xin đợi vài phút)...`);
      
      const subRes = await fetch(`${API_BASE}/youtube/subtitles/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ db_video_id: db_id, youtube_id: yt_id })
      });
      const subData = await subRes.json();
      
      if(!subData.success) {
         setYtStatus(`⚠️ Video đã được lưu (ID: ${db_id}) nhưng không thể tải phụ đề: ${subData.message}`);
      } else {
         setYtStatus(`✅ Thành công! Đã tải Video và AI dịch xong ${subData.count} câu phụ đề.`);
      }
      fetchVideos();
    } catch(err) {
      setYtStatus(`Lỗi: ${err.message}`);
    } finally {
      setIsYtProcessing(false);
    }
  };

  const startEditVideo = async (video) => {
    setEditVideoId(video.id);
    setEditForm({
      title: video.title || '',
      title_cn: video.title_cn || '',
      description: video.description || '',
      category_id: String(video.category_id || getDefaultCategoryId(categories)),
      hsk_level: String(video.hsk_level || 1),
      language_track: normalizeTrackValue(video.language_track, 'chinese'),
      is_free: Number(video.is_free) === 1,
      is_published: Number(video.is_published) === 1,
      duration: String(video.duration || 0),
      video_url: video.video_url || '',
      thumbnail_url: video.thumbnail_url || '',
      subtitle_cn_url: video.subtitle_cn_url || '',
      subtitle_vi_url: video.subtitle_vi_url || '',
      subtitle_pinyin_url: video.subtitle_pinyin_url || '',
    });
    setEditFiles({ ...EMPTY_ASSET_FILES });
    setEditSlangEntries(await fetchVideoSlangEntries(video.id));
  };

  const cancelEditVideo = () => {
    setEditVideoId(null);
    setEditForm(null);
    setEditFiles({ ...EMPTY_ASSET_FILES });
    setEditSlangEntries([createEmptySlangEntry()]);
  };

  const saveEditVideo = async () => {
    if (!editVideoId || !editForm) {
      return;
    }

    setSavingEdit(true);
    setError('');

    try {
      const preparedForm = await resolveUrlsWithUpload(editForm, editFiles);
      if (!preparedForm.video_url) {
        setError('Video cần có URL hoặc file upload');
        return;
      }

      const response = await fetch(`${API_BASE}/product/${editVideoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(toPayload(preparedForm, editSlangEntries)),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.error || data.message || 'Cập nhật video thất bại');
        return;
      }

      cancelEditVideo();
      await Promise.all([fetchVideos(), fetchStats()]);
    } catch (err) {
      console.error('Error updating video:', err);
      setError(err.message || 'Lỗi cập nhật video');
    } finally {
      setSavingEdit(false);
    }
  };

  if (!authChecked) {
    return <div className="min-h-screen p-8 text-center text-glass-subtle">Đang kiểm tra phiên đăng nhập...</div>;
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen text-glass-main pb-6 sm:pb-8 relative">
      <div className="absolute top-24 left-[-5rem] w-52 h-52 bg-blue-300/35 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-6 right-[-5rem] w-56 h-56 bg-cyan-300/35 blur-3xl rounded-full pointer-events-none" />

      <header className="sticky top-2 sm:top-3 z-20 px-3 sm:px-4">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex flex-wrap items-center gap-2 sm:gap-3 glass-surface rounded-2xl border border-white/70">
          <div className="order-1 flex items-center gap-3 min-w-0 flex-1">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30">
              <span className="material-symbols-outlined">shield_person</span>
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-blue-950">Admin Dashboard</h1>
              <p className="text-xs sm:text-sm text-glass-subtle">Quản lý nội dung, chất lượng học và người dùng</p>
            </div>
          </div>
          <div className="order-2 ml-auto sm:ml-0 flex items-center gap-2 sm:gap-3">
            <Link to="/library" className="glass-chip px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold text-blue-700">Về thư viện</Link>
            <button
              onClick={handleLogout}
              className="glass-chip p-1.5 sm:p-2 text-glass-subtle hover:text-rose-600 rounded-full transition"
              title="Đăng xuất"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-3 sm:p-4 space-y-4">
        {error && (
          <div className="glass-surface rounded-xl border border-rose-200/70 text-rose-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="glass-surface rounded-2xl border border-white/70 p-2 flex gap-2 overflow-x-auto glass-scroll whitespace-nowrap">
          {adminTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition inline-flex items-center gap-1.5 sm:gap-2 ${activeTab === tab.key ? 'glass-chip-active' : 'glass-chip'}`}
            >
              <span className="material-symbols-outlined text-base">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <section className="space-y-4">
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 stagger-sequence">
              <div className="stagger-item glass-kpi-card">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm text-glass-subtle">Tổng video</div>
                  <span className="glass-kpi-icon">
                    <span className="material-symbols-outlined text-base">movie</span>
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-blue-950 mt-2">{stats?.total_videos ?? '-'}</div>
                <div className="text-xs text-glass-subtle mt-1">+{stats?.videos_this_week ?? 0} tuần này</div>
              </div>
              <div className="stagger-item glass-kpi-card">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm text-glass-subtle">Video đã đăng</div>
                  <span className="glass-kpi-icon">
                    <span className="material-symbols-outlined text-base">public</span>
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-blue-950 mt-2">{stats?.published_videos ?? '-'}</div>
                <div className="text-xs text-glass-subtle mt-1">Sẵn sàng cho học viên</div>
              </div>
              <div className="stagger-item glass-kpi-card">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm text-glass-subtle">Tổng users</div>
                  <span className="glass-kpi-icon">
                    <span className="material-symbols-outlined text-base">groups</span>
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-blue-950 mt-2">{stats?.total_users ?? '-'}</div>
                <div className="text-xs text-glass-subtle mt-1">+{stats?.users_today ?? 0} hôm nay</div>
              </div>
              <div className="stagger-item glass-kpi-card">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm text-glass-subtle">Tổng giờ xem</div>
                  <span className="glass-kpi-icon">
                    <span className="material-symbols-outlined text-base">schedule</span>
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-blue-950 mt-2">{stats?.total_watch_hours ?? '-'}h</div>
                <div className="text-xs text-glass-subtle mt-1">Mức tương tác toàn hệ thống</div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'users' && (
          <section className="glass-surface rounded-2xl border border-white/70 p-4 overflow-hidden">
            <div className="glass-section-head">
              <h2 className="glass-section-title">
                <span className="material-symbols-outlined text-blue-600">groups</span>
                Quản lý người dùng
              </h2>
              <span className="glass-status glass-status-neutral">{userCountText}</span>
            </div>

            <div className="glass-surface-strong rounded-xl border border-white/70 p-3 mb-4 flex flex-wrap gap-2 items-center">
              <div className="relative grow w-full sm:w-auto min-w-0 sm:min-w-[220px]">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-glass-subtle text-base">search</span>
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Tìm theo tên hoặc email"
                  className="glass-input w-full pl-10 pr-3 py-2 rounded-lg text-sm"
                />
              </div>

              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="glass-input px-3 py-2 rounded-lg text-sm w-full sm:w-auto min-w-0 sm:min-w-[150px]">
                <option value="">Tất cả role</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>

              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="glass-input px-3 py-2 rounded-lg text-sm w-full sm:w-auto min-w-0 sm:min-w-[170px]">
                <option value="">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Đã khóa</option>
              </select>
            </div>

            <div className="md:hidden space-y-2">
              {users.map((user) => (
                <div key={user.id} className="glass-surface rounded-xl border border-white/70 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-blue-950 truncate">{user.full_name || user.username}</div>
                      <div className="text-xs text-glass-subtle truncate">{user.email}</div>
                      <div className="text-xs text-glass-subtle mt-0.5">@{user.username}</div>
                    </div>
                    <span className={`glass-status ${user.is_active ? 'glass-status-success' : 'glass-status-danger'}`}>
                      {user.is_active ? 'Hoạt động' : 'Đã khóa'}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-glass-subtle">
                    <div>
                      <p className="mb-1">Role</p>
                      <select
                        value={user.role}
                        onChange={(e) => updateUser(user.id, { role: e.target.value })}
                        className="glass-input w-full px-2 py-1.5 rounded-lg text-xs"
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <p>HSK: <span className="font-semibold text-blue-900">{user.hsk_level || '-'}</span></p>
                      <p>Đã xem: <span className="font-semibold text-blue-900">{user.videos_watched || 0}</span></p>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => updateUser(user.id, { is_active: !user.is_active })}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold ${user.is_active ? 'glass-chip text-amber-700' : 'glass-chip text-emerald-700'}`}
                    >
                      {user.is_active ? 'Khóa user' : 'Mở khóa'}
                    </button>
                    <button
                      onClick={() => deleteUser(user.id, user.full_name || user.username)}
                      className="px-2.5 py-1.5 rounded-lg glass-btn text-rose-600 text-xs font-semibold"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              ))}

              {!users.length && (
                <div className="glass-empty">
                  <span className="material-symbols-outlined text-3xl">person_search</span>
                  <p className="mt-1">Không có user nào phù hợp bộ lọc hiện tại.</p>
                </div>
              )}
            </div>

            <div className="hidden md:block overflow-auto glass-scroll rounded-xl border border-white/65 bg-white/20">
              <table className="glass-table w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="text-left">
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>HSK</th>
                    <th>Đã xem</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-blue-100/40">
                      <td>
                        <div className="font-medium text-blue-950">{user.full_name || user.username}</div>
                        <div className="text-xs text-glass-subtle">@{user.username}</div>
                      </td>
                      <td className="text-glass-subtle font-medium">{user.email}</td>
                      <td>
                        <select
                          value={user.role}
                          onChange={(e) => updateUser(user.id, { role: e.target.value })}
                          className="glass-input px-2 py-1 rounded-lg text-xs"
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td className="font-medium text-blue-900">{user.hsk_level || '-'}</td>
                      <td className="font-medium text-blue-900">{user.videos_watched || 0}</td>
                      <td>
                        <button
                          onClick={() => updateUser(user.id, { is_active: !user.is_active })}
                          className={`glass-status ${user.is_active ? 'glass-status-success' : 'glass-status-danger'}`}
                        >
                          {user.is_active ? 'Hoạt động' : 'Đã khóa'}
                        </button>
                      </td>
                      <td>
                        <button
                          onClick={() => deleteUser(user.id, user.full_name || user.username)}
                          className="px-2.5 py-1.5 rounded-lg glass-btn text-rose-600 text-xs font-semibold"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!users.length && (
                    <tr>
                      <td colSpan="7">
                        <div className="glass-empty m-2">
                          <span className="material-symbols-outlined text-3xl">person_search</span>
                          <p className="mt-1">Không có user nào phù hợp bộ lọc hiện tại.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'videos' && (
          <section className="glass-surface rounded-2xl border border-white/70 p-4 overflow-hidden space-y-4">
            <div className="glass-section-head">
              <h2 className="glass-section-title">
                <span className="material-symbols-outlined text-blue-600">video_library</span>
                Danh sách video
                <span className="glass-status glass-status-neutral">{videos.length}</span>
              </h2>
              <button onClick={fetchVideos} className="text-sm px-3 py-1.5 rounded-lg glass-chip">Tải lại</button>
            </div>

            <div className="md:hidden space-y-2">
              {videos.map((video) => (
                <div key={video.id} className="glass-surface rounded-xl border border-white/70 p-3">
                  <div className="flex items-start gap-2">
                    <VideoThumbnail
                      thumbnailUrl={video.thumbnail_url}
                      videoUrl={video.video_url}
                      alt={video.title}
                      className="w-24 h-14 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-blue-950 line-clamp-2">{video.title}</p>
                      <p className="text-xs text-glass-subtle line-clamp-1 mt-0.5">{video.title_cn || ''}</p>
                      <p className="text-xs text-blue-700/80 mt-0.5">
                        ID: {video.id} | YT: {extractYouTubeIdFromUrl(video.video_url) || '-'}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1 text-xs text-glass-subtle">
                        <span>HSK {video.hsk_level}</span>
                        <span>{normalizeTrackValue(video.language_track, 'chinese') === 'english' ? 'English' : 'Chinese'}</span>
                        <span>{video.category_name || '-'}</span>
                        <span>{video.view_count || 0} lượt xem</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`glass-status ${Number(video.is_published) ? 'glass-status-success' : 'glass-status-warning'}`}>
                      {Number(video.is_published) ? 'Published' : 'Draft'}
                    </span>
                    <Link to={`/player/${video.id}`} className="px-2.5 py-1.5 rounded-lg glass-btn text-blue-700 text-xs font-semibold">Xem</Link>
                    <button onClick={() => startEditVideo(video)} className="px-2.5 py-1.5 rounded-lg glass-btn text-amber-700 text-xs font-semibold">Sửa</button>
                    <button onClick={() => deleteVideo(video.id)} className="px-2.5 py-1.5 rounded-lg glass-btn text-rose-600 text-xs font-semibold">Xóa</button>
                  </div>
                </div>
              ))}

              {!videos.length && (
                <div className="glass-empty">
                  <span className="material-symbols-outlined text-3xl">video_call</span>
                  <p className="mt-1">Chưa có video nào trong hệ thống.</p>
                </div>
              )}
            </div>

            <div className="hidden md:block overflow-auto glass-scroll rounded-xl border border-white/65 bg-white/20">
              <table className="glass-table w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="text-left">
                    <th>Tiêu đề</th>
                    <th>HSK</th>
                    <th>Track</th>
                    <th>Category</th>
                    <th>View</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {videos.map((video) => (
                    <tr key={video.id} className="border-b border-blue-100/40">
                      <td>
                        <div className="font-medium text-blue-950">{video.title}</div>
                        <div className="text-xs text-glass-subtle">{video.title_cn || ''}</div>
                        <div className="text-xs text-blue-700/80 mt-0.5">ID: {video.id} | YT: {extractYouTubeIdFromUrl(video.video_url) || '-'}</div>
                      </td>
                      <td className="font-medium text-blue-900">HSK {video.hsk_level}</td>
                      <td className="font-medium text-blue-900">{normalizeTrackValue(video.language_track, 'chinese') === 'english' ? 'English' : 'Chinese'}</td>
                      <td className="text-glass-subtle font-medium">{video.category_name || '-'}</td>
                      <td className="font-medium text-blue-900">{video.view_count || 0}</td>
                      <td>
                        <span className={`glass-status ${Number(video.is_published) ? 'glass-status-success' : 'glass-status-warning'}`}>
                          {Number(video.is_published) ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <Link to={`/player/${video.id}`} className="px-2.5 py-1.5 rounded-lg glass-btn text-blue-700 text-xs font-semibold">Xem</Link>
                          <button onClick={() => startEditVideo(video)} className="px-2.5 py-1.5 rounded-lg glass-btn text-amber-700 text-xs font-semibold">Sửa</button>
                          <button onClick={() => deleteVideo(video.id)} className="px-2.5 py-1.5 rounded-lg glass-btn text-rose-600 text-xs font-semibold">Xóa</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!videos.length && (
                    <tr>
                      <td colSpan="7">
                        <div className="glass-empty m-2">
                          <span className="material-symbols-outlined text-3xl">video_call</span>
                          <p className="mt-1">Chưa có video nào trong hệ thống.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {editForm && (
              <div className="glass-surface-strong rounded-2xl border border-white/70 p-4 space-y-4">
                <div className="glass-section-head mb-0">
                  <h3 className="glass-section-title">
                    <span className="material-symbols-outlined text-blue-600">edit_square</span>
                    Sửa video #{editVideoId}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="glass-chip px-2.5 py-1 text-blue-800">DB ID: {editVideoId}</span>
                  <span className="glass-chip px-2.5 py-1 text-blue-800">YouTube ID: {editYoutubeId || '-'}</span>
                </div>
                <p className="text-xs text-glass-subtle">Chọn file để upload lên Cloudflare R2, hoặc giữ nguyên URL cũ nếu không muốn thay đổi.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input className="glass-input px-3 py-2 rounded-lg" placeholder="Tiêu đề" value={editForm.title} onChange={(e) => setEditForm((s) => ({ ...s, title: e.target.value }))} />
                  <input className="glass-input px-3 py-2 rounded-lg" placeholder="Tiêu đề Trung" value={editForm.title_cn} onChange={(e) => setEditForm((s) => ({ ...s, title_cn: e.target.value }))} />

                  <textarea className="glass-input px-3 py-2 rounded-lg md:col-span-2" placeholder="Mô tả" value={editForm.description} onChange={(e) => setEditForm((s) => ({ ...s, description: e.target.value }))} />

                  <select className="glass-input px-3 py-2 rounded-lg" value={editForm.category_id} onChange={(e) => setEditForm((s) => ({ ...s, category_id: e.target.value }))}>
                    {!categories.length && <option value="">Chưa có danh mục</option>}
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>

                  <select className="glass-input px-3 py-2 rounded-lg" value={editForm.hsk_level} onChange={(e) => setEditForm((s) => ({ ...s, hsk_level: e.target.value }))}>
                    {[1, 2, 3, 4, 5, 6].map((h) => <option key={h} value={h}>HSK {h}</option>)}
                  </select>

                  <select className="glass-input px-3 py-2 rounded-lg" value={editForm.language_track || 'chinese'} onChange={(e) => setEditForm((s) => ({ ...s, language_track: e.target.value }))}>
                    <option value="chinese">Track: Tiếng Trung</option>
                    <option value="english">Track: Tiếng Anh</option>
                  </select>

                  <input className="glass-input px-3 py-2 rounded-lg" placeholder="Duration (giây)" value={editForm.duration} onChange={(e) => setEditForm((s) => ({ ...s, duration: e.target.value }))} />

                  <div className="flex flex-wrap gap-3 items-center text-sm text-glass-subtle">
                    <label className="glass-chip px-3 py-1.5 inline-flex items-center gap-2">
                      <input type="checkbox" checked={editForm.is_free} onChange={(e) => setEditForm((s) => ({ ...s, is_free: e.target.checked }))} />
                      Miễn phí
                    </label>
                    <label className="glass-chip px-3 py-1.5 inline-flex items-center gap-2">
                      <input type="checkbox" checked={editForm.is_published} onChange={(e) => setEditForm((s) => ({ ...s, is_published: e.target.checked }))} />
                      Published
                    </label>
                  </div>

                  <input className="glass-input px-3 py-2 rounded-lg md:col-span-2" placeholder="Video URL" value={editForm.video_url} onChange={(e) => setEditForm((s) => ({ ...s, video_url: e.target.value }))} />
                  <input type="file" accept="video/*" className="glass-input px-3 py-2 rounded-lg md:col-span-2" onChange={(e) => setEditFiles((s) => ({ ...s, video: e.target.files?.[0] || null }))} />

                  <input className="glass-input px-3 py-2 rounded-lg md:col-span-2" placeholder="Thumbnail URL" value={editForm.thumbnail_url} onChange={(e) => setEditForm((s) => ({ ...s, thumbnail_url: e.target.value }))} />
                  <input type="file" accept="image/*" className="glass-input px-3 py-2 rounded-lg md:col-span-2" onChange={(e) => setEditFiles((s) => ({ ...s, thumbnail: e.target.files?.[0] || null }))} />

                  <input className="glass-input px-3 py-2 rounded-lg" placeholder="Subtitle CN URL" value={editForm.subtitle_cn_url} onChange={(e) => setEditForm((s) => ({ ...s, subtitle_cn_url: e.target.value }))} />
                  <input type="file" accept=".vtt,.srt,.txt" className="glass-input px-3 py-2 rounded-lg" onChange={(e) => setEditFiles((s) => ({ ...s, subtitleCn: e.target.files?.[0] || null }))} />

                  <input className="glass-input px-3 py-2 rounded-lg" placeholder="Subtitle VI URL" value={editForm.subtitle_vi_url} onChange={(e) => setEditForm((s) => ({ ...s, subtitle_vi_url: e.target.value }))} />
                  <input type="file" accept=".vtt,.srt,.txt" className="glass-input px-3 py-2 rounded-lg" onChange={(e) => setEditFiles((s) => ({ ...s, subtitleVi: e.target.files?.[0] || null }))} />

                  <input className="glass-input px-3 py-2 rounded-lg" placeholder="Subtitle Pinyin URL" value={editForm.subtitle_pinyin_url} onChange={(e) => setEditForm((s) => ({ ...s, subtitle_pinyin_url: e.target.value }))} />
                  <input type="file" accept=".vtt,.srt,.txt" className="glass-input px-3 py-2 rounded-lg" onChange={(e) => setEditFiles((s) => ({ ...s, subtitlePinyin: e.target.files?.[0] || null }))} />

                  <SlangEditor
                    entries={editSlangEntries}
                    onAdd={() => addSlangEntry(setEditSlangEntries)}
                    onRemove={removeSlangEntry(setEditSlangEntries)}
                    onFieldChange={updateSlangField(setEditSlangEntries)}
                  />
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button onClick={saveEditVideo} disabled={savingEdit} className="px-4 py-2 rounded-lg glass-btn glass-btn-primary font-semibold disabled:opacity-70">
                    {savingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                  <button onClick={cancelEditVideo} disabled={savingEdit} className="px-4 py-2 rounded-lg glass-btn text-glass-subtle">Hủy</button>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'upload' && (
          <section className="glass-surface rounded-2xl border border-white/70 p-4 space-y-4">
            <div className="glass-section-head mb-0">
              <h2 className="glass-section-title">
                <span className="material-symbols-outlined text-blue-600">cloud_upload</span>
                Upload video + file Cloudflare
              </h2>
              <span className="glass-status glass-status-neutral">R2</span>
            </div>
            <p className="text-xs text-glass-subtle">Nếu chọn file, hệ thống sẽ upload lên Cloudflare R2 và tự gán URL vào metadata.</p>

            <form onSubmit={uploadVideo} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className="glass-input px-3 py-2 rounded-lg" placeholder="Tiêu đề" value={uploadForm.title} onChange={(e) => setUploadForm((s) => ({ ...s, title: e.target.value }))} required />
              <input className="glass-input px-3 py-2 rounded-lg" placeholder="Tiêu đề Trung" value={uploadForm.title_cn} onChange={(e) => setUploadForm((s) => ({ ...s, title_cn: e.target.value }))} />

              <textarea className="glass-input px-3 py-2 rounded-lg md:col-span-2" placeholder="Mô tả" value={uploadForm.description} onChange={(e) => setUploadForm((s) => ({ ...s, description: e.target.value }))} />

              <div className="space-y-2">
                <select
                  className="glass-input w-full px-3 py-2 rounded-lg"
                  value={uploadForm.category_id}
                  onChange={(e) => setUploadForm((s) => ({ ...s, category_id: e.target.value }))}
                  disabled={!categories.length}
                >
                  {!categories.length && <option value="">Chưa có danh mục</option>}
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {!categories.length && (
                  <p className="text-xs text-amber-700">
                    Chưa có danh mục trong hệ thống. Bạn vẫn có thể đăng video, backend sẽ tự xử lý category khi dữ liệu danh mục được tạo.
                  </p>
                )}
              </div>

              <select className="glass-input px-3 py-2 rounded-lg" value={uploadForm.hsk_level} onChange={(e) => setUploadForm((s) => ({ ...s, hsk_level: e.target.value }))}>
                {[1, 2, 3, 4, 5, 6].map((h) => <option key={h} value={h}>HSK {h}</option>)}
              </select>

              <select className="glass-input px-3 py-2 rounded-lg" value={uploadForm.language_track || 'chinese'} onChange={(e) => setUploadForm((s) => ({ ...s, language_track: e.target.value }))}>
                <option value="chinese">Track: Tiếng Trung</option>
                <option value="english">Track: Tiếng Anh</option>
              </select>

              <input className="glass-input px-3 py-2 rounded-lg" placeholder="Duration (giây)" value={uploadForm.duration} onChange={(e) => setUploadForm((s) => ({ ...s, duration: e.target.value }))} />

              <div className="flex flex-wrap gap-3 items-center text-sm text-glass-subtle">
                <label className="glass-chip px-3 py-1.5 inline-flex items-center gap-2">
                  <input type="checkbox" checked={uploadForm.is_free} onChange={(e) => setUploadForm((s) => ({ ...s, is_free: e.target.checked }))} />
                  Video miễn phí
                </label>
                <label className="glass-chip px-3 py-1.5 inline-flex items-center gap-2">
                  <input type="checkbox" checked={uploadForm.is_published} onChange={(e) => setUploadForm((s) => ({ ...s, is_published: e.target.checked }))} />
                  Published
                </label>
              </div>

              <input className="glass-input px-3 py-2 rounded-lg md:col-span-2" placeholder="Video URL (hoặc chọn file ở dưới)" value={uploadForm.video_url} onChange={(e) => setUploadForm((s) => ({ ...s, video_url: e.target.value }))} />
              <input type="file" accept="video/*" className="glass-input px-3 py-2 rounded-lg md:col-span-2" onChange={(e) => setUploadFiles((s) => ({ ...s, video: e.target.files?.[0] || null }))} />

              <input className="glass-input px-3 py-2 rounded-lg md:col-span-2" placeholder="Thumbnail URL (hoặc chọn file ở dưới)" value={uploadForm.thumbnail_url} onChange={(e) => setUploadForm((s) => ({ ...s, thumbnail_url: e.target.value }))} />
              <input type="file" accept="image/*" className="glass-input px-3 py-2 rounded-lg md:col-span-2" onChange={(e) => setUploadFiles((s) => ({ ...s, thumbnail: e.target.files?.[0] || null }))} />

              <input className="glass-input px-3 py-2 rounded-lg" placeholder="Subtitle CN URL" value={uploadForm.subtitle_cn_url} onChange={(e) => setUploadForm((s) => ({ ...s, subtitle_cn_url: e.target.value }))} />
              <input type="file" accept=".vtt,.srt,.txt" className="glass-input px-3 py-2 rounded-lg" onChange={(e) => setUploadFiles((s) => ({ ...s, subtitleCn: e.target.files?.[0] || null }))} />

              <input className="glass-input px-3 py-2 rounded-lg" placeholder="Subtitle VI URL" value={uploadForm.subtitle_vi_url} onChange={(e) => setUploadForm((s) => ({ ...s, subtitle_vi_url: e.target.value }))} />
              <input type="file" accept=".vtt,.srt,.txt" className="glass-input px-3 py-2 rounded-lg" onChange={(e) => setUploadFiles((s) => ({ ...s, subtitleVi: e.target.files?.[0] || null }))} />

              <input className="glass-input px-3 py-2 rounded-lg" placeholder="Subtitle Pinyin URL" value={uploadForm.subtitle_pinyin_url} onChange={(e) => setUploadForm((s) => ({ ...s, subtitle_pinyin_url: e.target.value }))} />
              <input type="file" accept=".vtt,.srt,.txt" className="glass-input px-3 py-2 rounded-lg" onChange={(e) => setUploadFiles((s) => ({ ...s, subtitlePinyin: e.target.files?.[0] || null }))} />

              <SlangEditor
                entries={uploadSlangEntries}
                onAdd={() => addSlangEntry(setUploadSlangEntries)}
                onRemove={removeSlangEntry(setUploadSlangEntries)}
                onFieldChange={updateSlangField(setUploadSlangEntries)}
              />

              <button disabled={uploading} className="md:col-span-2 px-4 py-3 rounded-xl glass-btn glass-btn-primary font-semibold disabled:opacity-70">
                {uploading ? 'Đang upload Cloudflare...' : 'Thêm video'}
              </button>
            </form>
          </section>
        )}

        {activeTab === 'youtube' && (
          <section className="glass-surface rounded-2xl border border-white/70 p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-inner bg-gradient-to-br from-white/10 to-transparent">
            <div className="glass-section-head mb-0">
              <h2 className="glass-section-title">
                 <span className="material-symbols-outlined text-red-500">smart_display</span>
                 Thêm Video Từ YouTube (Tích hợp AI)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-glass-subtle">Chỉ cần dán link YouTube, hệ thống sẽ tự động bóc tách video, âm thanh, kéo phụ đề và dùng trí tuệ nhân tạo (Gemini) để đồng bộ & dịch song ngữ.</p>
            
            <div className="flex flex-col md:flex-row gap-4">
               <input 
                 className="glass-input flex-1 px-4 py-3 rounded-xl border border-white/30 text-sm sm:text-lg shadow-sm" 
                 placeholder="Dán link YouTube (VD: https://www.youtube.com/watch?v=...)" 
                 value={ytUrl} 
                 onChange={(e) => setYtUrl(e.target.value)} 
               />
            </div>

            <div className="grid grid-cols-1 min-[520px]:grid-cols-2 gap-3 sm:gap-4">
              <button 
                disabled={isYtProcessing} 
                onClick={() => processYoutube('chinese')} 
                className="w-full px-4 sm:px-6 py-3 rounded-xl glass-btn glass-btn-primary font-bold disabled:opacity-50 text-white bg-red-600/80 hover:bg-red-600/100 border border-red-500/50 shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all text-sm sm:text-base"
              >
                {isYtProcessing ? 'Đang xử lý...' : 'Tải Lên Video Trung (Chinese)'}
              </button>
              
              <button 
                disabled={isYtProcessing} 
                onClick={() => processYoutube('english')} 
                className="w-full px-4 sm:px-6 py-3 rounded-xl glass-btn font-bold disabled:opacity-50 text-blue-900 bg-blue-400/80 hover:bg-blue-400/100 border border-blue-400/70 shadow-[0_0_15px_rgba(96,165,250,0.3)] transition-all text-sm sm:text-base"
              >
                {isYtProcessing ? 'Đang xử lý...' : 'Tải Lên Video English (Anh)'}
              </button>
            </div>
            
            {ytStatus && (
               <div className="mt-4 p-4 rounded-xl font-semibold bg-white/20 border border-white/50 text-blue-900 shadow-sm animate-pulse">
                 {ytStatus}
               </div>
            )}
            
            <div className="mt-2 text-xs text-amber-700 font-medium">
               ⚠️ Lưu ý: Quá trình AI dịch sub có thể kéo dài từ 30 giây đến vài phút tùy theo độ dài video!
            </div>

            {/* --- Dịch lại phụ đề bị lỗi --- */}
            <div className="mt-6 pt-5 border-t border-white/20 space-y-4">
              <div className="glass-section-head mb-0">
                <h3 className="glass-section-title text-base">
                  <span className="material-symbols-outlined text-amber-500">translate</span>
                  Dịch lại phụ đề "Chưa dịch"
                </h3>
              </div>
              <p className="text-xs text-glass-subtle">Chọn video đã upload để dịch lại các câu phụ đề còn bị lỗi <strong>(Chưa dịch)</strong> mà không cần cào lại YouTube.</p>

              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                <select
                  className="glass-input flex-1 px-4 py-3 rounded-xl border border-white/30 text-sm shadow-sm"
                  value={ytRetranslateId}
                  onChange={(e) => setYtRetranslateId(e.target.value)}
                  disabled={isRetranslating}
                >
                  <option value="">-- Chọn video cần dịch lại --</option>
                  {videos.map((v) => (
                    <option key={v.id} value={v.id}>#{v.id} — {v.title}</option>
                  ))}
                </select>

                <button
                  disabled={isRetranslating || !ytRetranslateId}
                  onClick={retranslateSubtitles}
                  className="w-full md:w-auto px-6 py-3 rounded-xl glass-btn font-bold disabled:opacity-50 text-amber-900 bg-amber-400/80 hover:bg-amber-500/90 border border-amber-400/70 shadow-[0_0_15px_rgba(251,191,36,0.3)] transition-all whitespace-nowrap"
                >
                  {isRetranslating ? '⏳ Đang dịch...' : '🔄 Dịch lại ngay'}
                </button>
              </div>

              {retranslateStatus && (
                <div className={`p-4 rounded-xl font-semibold border text-sm shadow-sm ${
                  retranslateStatus.startsWith('✅')
                    ? 'bg-green-50/40 border-green-300/50 text-green-800'
                    : retranslateStatus.startsWith('❌')
                    ? 'bg-red-50/40 border-red-300/50 text-red-800'
                    : 'bg-white/20 border-white/50 text-blue-900 animate-pulse'
                }`}>
                  {retranslateStatus}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ══════════════ IMDB MOVIE TAB ══════════════ */}
        {activeTab === 'movie' && (
          <section className="glass-surface-strong rounded-2xl border border-white/70 p-4 sm:p-6 space-y-6">
            <div className="glass-section-head">
              <h2 className="glass-section-title">
                <span className="material-symbols-outlined text-purple-500">theaters</span>
                Thêm Phìm Dài (IMDB + OpenSubtitles)
              </h2>
            </div>

            {/* Bước 1: Thông tin phìm */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-purple-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                Thông tin phìm
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-blue-800 mb-1 block">IMDB URL *</label>
                  <input
                    id="movie-imdb-url"
                    className="glass-input px-3 py-2.5 rounded-xl w-full text-sm"
                    placeholder="https://www.imdb.com/title/tt12042730/"
                    value={movieForm.imdb_url}
                    onChange={(e) => setMovieForm((p) => ({ ...p, imdb_url: e.target.value }))}
                  />
                  <p className="text-xs text-glass-subtle mt-1">Dán link IMDB — hệ thống sẽ tự lấy ID (tt12042730)</p>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-blue-800 mb-1 block">Tiêu đề tiếng Việt *</label>
                  <input
                    className="glass-input px-3 py-2.5 rounded-xl w-full text-sm"
                    placeholder="Tên phìm tiếng Việt"
                    value={movieForm.title}
                    onChange={(e) => setMovieForm((p) => ({ ...p, title: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-blue-800 mb-1 block">Tiêu đề gốc (EN)</label>
                  <input
                    className="glass-input px-3 py-2.5 rounded-xl w-full text-sm"
                    placeholder="Original title"
                    value={movieForm.title_en}
                    onChange={(e) => setMovieForm((p) => ({ ...p, title_en: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-blue-800 mb-1 block">Category</label>
                  <select
                    className="glass-input px-3 py-2.5 rounded-xl w-full text-sm"
                    value={movieForm.category_id}
                    onChange={(e) => setMovieForm((p) => ({ ...p, category_id: e.target.value }))}
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-blue-800 mb-1 block">Level</label>
                  <select
                    className="glass-input px-3 py-2.5 rounded-xl w-full text-sm"
                    value={movieForm.hsk_level}
                    onChange={(e) => setMovieForm((p) => ({ ...p, hsk_level: e.target.value }))}
                  >
                    {[1,2,3,4,5,6].map((l) => <option key={l} value={l}>Level {l}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-blue-800 mb-1 block">Thumbnail URL</label>
                  <input
                    className="glass-input px-3 py-2.5 rounded-xl w-full text-sm"
                    placeholder="https://... (URL ảnh poster)"
                    value={movieForm.thumbnail_url}
                    onChange={(e) => setMovieForm((p) => ({ ...p, thumbnail_url: e.target.value }))}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-blue-800 mb-1 block">Mô tả</label>
                  <textarea
                    className="glass-input px-3 py-2.5 rounded-xl w-full text-sm"
                    rows={3}
                    placeholder="Nội dung tóm tắt phìm..."
                    value={movieForm.description}
                    onChange={(e) => setMovieForm((p) => ({ ...p, description: e.target.value }))}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" className="w-4 h-4" checked={movieForm.is_published}
                      onChange={(e) => setMovieForm((p) => ({ ...p, is_published: e.target.checked }))} />
                    <span>Xuất bản</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" className="w-4 h-4" checked={movieForm.is_free}
                      onChange={(e) => setMovieForm((p) => ({ ...p, is_free: e.target.checked }))} />
                    <span>Miễn phí</span>
                  </label>
                </div>
              </div>

              <button
                id="movie-save-btn"
                disabled={isMovieProcessing || !movieForm.imdb_url || !movieForm.title}
                onClick={async () => {
                  setIsMovieProcessing(true);
                  setMovieStatus('Đang lưu phìm...');
                  setSavedMovieId(null);
                  setSubCandidates([]);
                  try {
                    const res = await fetch(`${API_BASE}/movie/process`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                      body: JSON.stringify({
                        ...movieForm,
                        category_id: movieForm.category_id ? Number(movieForm.category_id) : null,
                        hsk_level: Number(movieForm.hsk_level),
                      }),
                    });
                    const data = await res.json();
                    if (!data.success) throw new Error(data.message);
                    setSavedMovieId(data.data.id);
                    setMovieStatus(`✅ Đã lưu phìm ID #${data.data.id} (${data.data.imdb_id}) — bước tiếp theo: tải phụ đề!`);
                    fetchVideos();
                  } catch (err) {
                    setMovieStatus(`❌ Lỗi: ${err.message}`);
                  } finally {
                    setIsMovieProcessing(false);
                  }
                }}
                className="px-6 py-3 rounded-xl font-bold disabled:opacity-50 text-white bg-purple-600/90 hover:bg-purple-700 border border-purple-500/50 shadow-[0_0_15px_rgba(147,51,234,0.3)] transition-all text-sm"
              >
                {isMovieProcessing ? '⏳ Đang lưu...' : '🎥 Lưu Phìm vào DB'}
              </button>

              {movieStatus && (
                <div className={`p-3 rounded-xl text-sm font-semibold border ${
                  movieStatus.startsWith('✅') ? 'bg-green-50/40 border-green-300/50 text-green-800'
                  : movieStatus.startsWith('❌') ? 'bg-red-50/40 border-red-300/50 text-red-800'
                  : 'bg-white/20 border-white/50 text-blue-900 animate-pulse'
                }`}>{movieStatus}</div>
              )}
            </div>

            {/* Bước 2: Tải phụ đề */}
            <div className={`space-y-4 pt-5 border-t border-white/20 transition-opacity ${!savedMovieId ? 'opacity-40 pointer-events-none' : ''}`}>
              <h3 className="text-sm font-bold text-purple-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                Tải Phụ Đề Từ OpenSubtitles
                {!savedMovieId && <span className="text-xs text-glass-subtle font-normal">(hoàn thành bước 1 trước)</span>}
              </h3>

              <p className="text-xs text-glass-subtle">
                Hệ thống sẽ tìm phụ đề tiếng Anh <strong>và tiếng Việt</strong> — chọn bản khớp thời lượng phìm (±15%), gộp vào cùng dòng theo timestamp.
              </p>

              {/* Preview candidates */}
              <button
                disabled={isSearchingSubs || !savedMovieId}
                onClick={async () => {
                  setIsSearchingSubs(true);
                  setSubCandidates([]);
                  try {
                    const res = await fetch(`${API_BASE}/movie/search-subtitles?imdb_id=${encodeURIComponent(movieForm.imdb_url)}`, {
                      headers: getAuthHeaders(),
                    });
                    const data = await res.json();
                    if (!data.success) throw new Error(data.message);
                    setSubCandidates({ en: data.en || [], vi: data.vi || [] });
                  } catch (err) {
                    setSubImportStatus(`❌ Không tìm được phụ đề: ${err.message}`);
                  } finally {
                    setIsSearchingSubs(false);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-100/60 text-purple-700 hover:bg-purple-200/60 border border-purple-300/50 transition disabled:opacity-50"
              >
                {isSearchingSubs ? '⏳ Đang tìm...' : '🔍 Xem trước danh sách phụ đề'}
              </button>

              {subCandidates && (subCandidates.en?.length > 0 || subCandidates.vi?.length > 0) && (
                <div className="rounded-xl border border-purple-200/50 overflow-hidden space-y-0">
                  {/* EN */}
                  {subCandidates.en?.length > 0 && (
                    <>
                      <div className="px-3 py-2 bg-purple-50/60 text-xs font-semibold text-purple-700 flex items-center gap-2">
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">EN</span>
                        {subCandidates.en.length} phụ đề tiếng Anh
                      </div>
                      <div className="max-h-36 overflow-y-auto divide-y divide-white/20">
                        {subCandidates.en.map((c, i) => (
                          <div key={i} className="px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-blue-50/30">
                            <span className="text-blue-400 font-mono w-5">#{i+1}</span>
                            <span className="flex-1 truncate text-blue-900">{c.release || c.file_name}</span>
                            <span className="text-glass-subtle shrink-0">{c.download_count?.toLocaleString()} dl</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {/* VI */}
                  {subCandidates.vi?.length > 0 ? (
                    <>
                      <div className="px-3 py-2 bg-amber-50/60 text-xs font-semibold text-amber-700 flex items-center gap-2 border-t border-white/20">
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold">VI</span>
                        {subCandidates.vi.length} phụ đề tiếng Việt
                      </div>
                      <div className="max-h-36 overflow-y-auto divide-y divide-white/20">
                        {subCandidates.vi.map((c, i) => (
                          <div key={i} className="px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-amber-50/30">
                            <span className="text-amber-400 font-mono w-5">#{i+1}</span>
                            <span className="flex-1 truncate text-blue-900">{c.release || c.file_name}</span>
                            <span className="text-glass-subtle shrink-0">{c.download_count?.toLocaleString()} dl</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="px-3 py-2 text-xs text-amber-600 italic border-t border-white/20">
                      ⚠️ Không tìm thấy phụ đề tiếng Việt — sẽ chỉ lưu EN
                    </div>
                  )}
                </div>
              )}

              <button
                id="movie-import-sub-btn"
                disabled={isSubImporting || !savedMovieId}
                onClick={async () => {
                  setIsSubImporting(true);
                  setSubImportStatus('Đang tải phụ đề từ OpenSubtitles...');
                  try {
                    const res = await fetch(`${API_BASE}/movie/subtitles/import`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                      body: JSON.stringify({ video_id: savedMovieId, imdb_id: movieForm.imdb_url }),
                    });
                    const data = await res.json();
                    if (!data.success) throw new Error(data.message);
                    setSubImportStatus(`✅ Đã lưu ${data.count} dòng phụ đề — “${data.subtitle_name}”`);
                  } catch (err) {
                    setSubImportStatus(`❌ Lỗi: ${err.message}`);
                  } finally {
                    setIsSubImporting(false);
                  }
                }}
                className="w-full px-6 py-3 rounded-xl font-bold disabled:opacity-50 text-white bg-emerald-600/90 hover:bg-emerald-700 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all text-sm"
              >
                {isSubImporting ? '⏳ Đang tải phụ đề EN + VI...' : '⬇️ Tải Phụ Đề EN + VI Từ OpenSubtitles'}
              </button>

              {subImportStatus && (
                <div className={`p-3 rounded-xl text-sm font-semibold border ${
                  subImportStatus.startsWith('✅') ? 'bg-green-50/40 border-green-300/50 text-green-800'
                  : subImportStatus.startsWith('❌') ? 'bg-red-50/40 border-red-300/50 text-red-800'
                  : 'bg-white/20 border-white/50 text-blue-900 animate-pulse'
                }`}>{subImportStatus}</div>
              )}

              {subImportStatus.startsWith('✅') && savedMovieId && (
                <a
                  href={`/player/${savedMovieId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/15 text-blue-700 hover:bg-blue-500/25 text-sm font-semibold transition border border-blue-300/30"
                >
                  <span className="material-symbols-outlined text-base">open_in_new</span>
                  Mở Player xem phìm #
                  {savedMovieId}
                </a>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Admin;

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import VideoThumbnail from '../components/ui/VideoThumbnail';
import { API_BASE } from '../utils/apiBase';

const EMPTY_UPLOAD_FORM = {
  title: '',
  title_cn: '',
  description: '',
  category_id: '1',
  hsk_level: '1',
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

const toPayload = (form, slangEntries = []) => ({
  ...form,
  category_id: Number(form.category_id),
  hsk_level: Number(form.hsk_level),
  duration: Number(form.duration || 0),
  is_free: Boolean(form.is_free),
  is_published: Boolean(form.is_published),
  slang_entries: normalizeSlangEntries(slangEntries),
});

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

  const userCountText = useMemo(() => `${users.length} người dùng`, [users.length]);
  const adminTabs = [
    { key: 'dashboard', label: 'Tổng quan', icon: 'dashboard' },
    { key: 'videos', label: 'Video', icon: 'movie' },
    { key: 'users', label: 'Người dùng', icon: 'groups' },
    { key: 'upload', label: 'Đăng nội dung', icon: 'cloud_upload' },
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

      setUploadForm({ ...EMPTY_UPLOAD_FORM });
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

  const startEditVideo = async (video) => {
    setEditVideoId(video.id);
    setEditForm({
      title: video.title || '',
      title_cn: video.title_cn || '',
      description: video.description || '',
      category_id: String(video.category_id || categories[0]?.id || 1),
      hsk_level: String(video.hsk_level || 1),
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
    <div className="min-h-screen text-glass-main pb-8 relative">
      <div className="absolute top-24 left-[-5rem] w-52 h-52 bg-blue-300/35 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-6 right-[-5rem] w-56 h-56 bg-cyan-300/35 blur-3xl rounded-full pointer-events-none" />

      <header className="sticky top-3 z-20 px-3 sm:px-4">
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

      <main className="max-w-7xl mx-auto p-4 space-y-4">
        {error && (
          <div className="glass-surface rounded-xl border border-rose-200/70 text-rose-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="glass-surface rounded-2xl border border-white/70 p-2 flex flex-wrap gap-2">
          {adminTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition inline-flex items-center gap-2 ${activeTab === tab.key ? 'glass-chip-active' : 'glass-chip'}`}
            >
              <span className="material-symbols-outlined text-base">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <section className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-sequence">
              <div className="stagger-item glass-kpi-card">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm text-glass-subtle">Tổng video</div>
                  <span className="glass-kpi-icon">
                    <span className="material-symbols-outlined text-base">movie</span>
                  </span>
                </div>
                <div className="text-3xl font-bold text-blue-950 mt-2">{stats?.total_videos ?? '-'}</div>
                <div className="text-xs text-glass-subtle mt-1">+{stats?.videos_this_week ?? 0} tuần này</div>
              </div>
              <div className="stagger-item glass-kpi-card">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm text-glass-subtle">Video đã đăng</div>
                  <span className="glass-kpi-icon">
                    <span className="material-symbols-outlined text-base">public</span>
                  </span>
                </div>
                <div className="text-3xl font-bold text-blue-950 mt-2">{stats?.published_videos ?? '-'}</div>
                <div className="text-xs text-glass-subtle mt-1">Sẵn sàng cho học viên</div>
              </div>
              <div className="stagger-item glass-kpi-card">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm text-glass-subtle">Tổng users</div>
                  <span className="glass-kpi-icon">
                    <span className="material-symbols-outlined text-base">groups</span>
                  </span>
                </div>
                <div className="text-3xl font-bold text-blue-950 mt-2">{stats?.total_users ?? '-'}</div>
                <div className="text-xs text-glass-subtle mt-1">+{stats?.users_today ?? 0} hôm nay</div>
              </div>
              <div className="stagger-item glass-kpi-card">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm text-glass-subtle">Tổng giờ xem</div>
                  <span className="glass-kpi-icon">
                    <span className="material-symbols-outlined text-base">schedule</span>
                  </span>
                </div>
                <div className="text-3xl font-bold text-blue-950 mt-2">{stats?.total_watch_hours ?? '-'}h</div>
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
                      <div className="flex flex-wrap gap-2 mt-1 text-xs text-glass-subtle">
                        <span>HSK {video.hsk_level}</span>
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
                      </td>
                      <td className="font-medium text-blue-900">HSK {video.hsk_level}</td>
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
                      <td colSpan="6">
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
                <p className="text-xs text-glass-subtle">Chọn file để upload lên Cloudflare R2, hoặc giữ nguyên URL cũ nếu không muốn thay đổi.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input className="glass-input px-3 py-2 rounded-lg" placeholder="Tiêu đề" value={editForm.title} onChange={(e) => setEditForm((s) => ({ ...s, title: e.target.value }))} />
                  <input className="glass-input px-3 py-2 rounded-lg" placeholder="Tiêu đề Trung" value={editForm.title_cn} onChange={(e) => setEditForm((s) => ({ ...s, title_cn: e.target.value }))} />

                  <textarea className="glass-input px-3 py-2 rounded-lg md:col-span-2" placeholder="Mô tả" value={editForm.description} onChange={(e) => setEditForm((s) => ({ ...s, description: e.target.value }))} />

                  <select className="glass-input px-3 py-2 rounded-lg" value={editForm.category_id} onChange={(e) => setEditForm((s) => ({ ...s, category_id: e.target.value }))}>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>

                  <select className="glass-input px-3 py-2 rounded-lg" value={editForm.hsk_level} onChange={(e) => setEditForm((s) => ({ ...s, hsk_level: e.target.value }))}>
                    {[1, 2, 3, 4, 5, 6].map((h) => <option key={h} value={h}>HSK {h}</option>)}
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

              <select className="glass-input px-3 py-2 rounded-lg" value={uploadForm.category_id} onChange={(e) => setUploadForm((s) => ({ ...s, category_id: e.target.value }))}>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
                {!categories.length && <option value="1">Category 1</option>}
              </select>

              <select className="glass-input px-3 py-2 rounded-lg" value={uploadForm.hsk_level} onChange={(e) => setUploadForm((s) => ({ ...s, hsk_level: e.target.value }))}>
                {[1, 2, 3, 4, 5, 6].map((h) => <option key={h} value={h}>HSK {h}</option>)}
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
      </main>
    </div>
  );
};

export default Admin;

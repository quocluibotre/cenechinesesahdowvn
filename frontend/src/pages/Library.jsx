import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import UserPanelDrawer from '../components/layout/UserPanelDrawer';
import VideoThumbnail from '../components/ui/VideoThumbnail';

const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

const formatDuration = (seconds) => {
  const safe = Math.max(0, Math.floor(Number(seconds || 0)));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
};

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const Library = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  const [savedWords, setSavedWords] = useState([]);
  const [stats, setStats] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isUserPanelOpen, setIsUserPanelOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [hskFilter, setHskFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [page, setPage] = useState(1);
  const [perPage] = useState(8);

  const syncCurrentUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setCurrentUser(null);
      return false;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: authHeaders(),
        cache: 'no-store',
      });
      const data = await response.json();

      if (response.ok && data.success && data.user) {
        setCurrentUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        return true;
      }
    } catch (error) {
      console.error('Error syncing current user:', error);
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
    navigate('/login', { replace: true });
    return false;
  };

  const getCategorySlug = (categoryId) => {
    const match = categories.find((c) => Number(c.id) === Number(categoryId));
    return match?.slug || '';
  };

  const filteredVideos = useMemo(() => {
    let data = [...videos];

    if (hskFilter !== 'all') {
      data = data.filter((v) => Number(v.hsk_level) === Number(hskFilter));
    }

    if (categoryFilter !== 'all') {
      data = data.filter((v) => getCategorySlug(v.category_id) === categoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      data = data.filter((v) =>
        String(v.title || '').toLowerCase().includes(q)
        || String(v.title_cn || '').toLowerCase().includes(q)
      );
    }

    if (sortBy === 'popular') {
      data.sort((a, b) => Number(b.view_count || 0) - Number(a.view_count || 0));
    } else if (sortBy === 'az') {
      data.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'vi'));
    } else if (sortBy === 'duration') {
      data.sort((a, b) => Number(a.duration || 0) - Number(b.duration || 0));
    } else {
      data.sort((a, b) => Number(b.id) - Number(a.id));
    }

    return data;
  }, [videos, hskFilter, categoryFilter, searchQuery, sortBy, categories]);

  const pagedVideos = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredVideos.slice(start, start + perPage);
  }, [filteredVideos, page, perPage]);

  const totalPages = Math.max(1, Math.ceil(filteredVideos.length / perPage));

  const loadVideos = async () => {
    const response = await fetch(`${API_BASE}/product?status=published&limit=500`);
    const data = await response.json();
    setVideos(data.data || []);
  };

  const loadCategories = async () => {
    const response = await fetch(`${API_BASE}/category`);
    const data = await response.json();
    setCategories(data.data || []);
  };

  const loadContinueWatching = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setContinueWatching([]);
      return;
    }

    const response = await fetch(`${API_BASE}/user/progress`, { headers: authHeaders() });
    const data = await response.json();
    setContinueWatching(data.success ? data.data || [] : []);
  };

  const loadStats = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setStats(null);
      return;
    }

    const response = await fetch(`${API_BASE}/user/stats/me`, { headers: authHeaders() });
    const data = await response.json();
    if (data.success) {
      setStats(data.data);
      if (data.data?.user) {
        setCurrentUser(data.data.user);
        localStorage.setItem('user', JSON.stringify(data.data.user));
      }
    }
  };

  const handleLogout = () => {
    setIsUserPanelOpen(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  };

  const closeUserPanel = () => setIsUserPanelOpen(false);
  const toggleUserPanel = () => setIsUserPanelOpen((prev) => !prev);

  const loadSavedWords = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setSavedWords([]);
      return;
    }

    const response = await fetch(`${API_BASE}/blog/saved_words`, { headers: authHeaders() });
    const data = await response.json();
    setSavedWords(data.success ? data.data || [] : []);
  };

  const removeWord = async (id) => {
    try {
      await fetch(`${API_BASE}/blog/saved_words/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      loadSavedWords();
      loadStats();
    } catch (error) {
      console.error('Error removing word:', error);
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const isValidSession = await syncCurrentUser();
        if (!isValidSession) {
          return;
        }
        await Promise.all([
          loadCategories(),
          loadVideos(),
          loadContinueWatching(),
          loadStats(),
          loadSavedWords(),
        ]);
      } catch (error) {
        console.error('Error loading library:', error);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === 'token' || event.key === 'user') {
        if (!localStorage.getItem('token')) {
          setCurrentUser(null);
          navigate('/login', { replace: true });
          return;
        }
        syncCurrentUser();
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [navigate]);

  useEffect(() => {
    setPage(1);
  }, [hskFilter, categoryFilter, searchQuery, sortBy]);

  return (
    <div className="min-h-screen pb-10 text-glass-main relative">
      <div className="absolute top-20 left-[-4rem] w-44 h-44 bg-blue-300/35 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-8 right-[-4rem] w-52 h-52 bg-cyan-300/35 blur-3xl rounded-full pointer-events-none" />

      <header className="sticky top-3 z-40 px-3 sm:px-4">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 flex flex-wrap items-center gap-2 sm:gap-3 glass-surface rounded-2xl border border-white/70">
          <Link to="/home" className="order-1 flex items-center gap-2 min-w-fit">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/25">
              <span className="material-symbols-outlined text-white">movie_edit</span>
            </div>
            <span className="font-bold text-xl hidden sm:block text-blue-900">Cineshadow <span className="text-blue-600">Chinese</span></span>
          </Link>

          <div className="order-3 w-full sm:order-2 sm:flex-1 sm:max-w-xl">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                type="text"
                placeholder="Tìm kiếm..."
                className="glass-input w-full pl-10 pr-4 py-2 sm:py-2.5 transition text-sm"
              />
            </div>
          </div>

          <div className="order-2 ml-auto sm:order-3 flex items-center gap-2">
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

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-8">
        <section className="glass-surface-strong rounded-3xl p-4 sm:p-6 border border-white/75">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1 text-blue-950">Chào mừng trở lại!</h1>
              <p className="text-glass-subtle">Tiếp tục hành trình học tiếng Trung của bạn</p>
            </div>

            <div className="grid grid-cols-3 gap-3 w-full md:w-auto md:min-w-[420px]">
              <div className="glass-kpi-card p-3 sm:p-4">
                <div className="text-xs text-glass-subtle">Video đã xem</div>
                <div className="text-2xl sm:text-3xl font-bold text-blue-900 mt-1">{stats?.videos_watched ?? '-'}</div>
              </div>
              <div className="glass-kpi-card p-3 sm:p-4">
                <div className="text-xs text-glass-subtle">Từ vựng lưu</div>
                <div className="text-2xl sm:text-3xl font-bold text-blue-900 mt-1">{stats?.saved_words ?? '-'}</div>
              </div>
              <div className="glass-kpi-card p-3 sm:p-4">
                <div className="text-xs text-glass-subtle">Ngày liên tục</div>
                <div className="text-2xl sm:text-3xl font-bold text-blue-900 mt-1">{stats?.streak ?? '-'}</div>
              </div>
            </div>
          </div>
        </section>

        {continueWatching.length > 0 && (
          <section>
            <div className="glass-section-head">
              <h2 className="glass-section-title text-xl">
                <span className="material-symbols-outlined text-blue-600">history</span>
                Tiếp tục xem
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-sequence">
              {continueWatching.map((item) => (
                <Link key={`${item.video_id}-${item.progress_id}`} to={`/player/${item.video_id}`} className="stagger-item glass-surface rounded-2xl p-4 border border-white/70 flex gap-4 glass-hover-lift">
                  <div className="relative w-32 h-20 flex-shrink-0">
                    <VideoThumbnail
                      thumbnailUrl={item.thumbnail_url}
                      videoUrl={item.video_url}
                      className="w-full h-full object-cover rounded-lg"
                      alt={item.title}
                    />
                    <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">{formatDuration(item.duration || 0)}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-blue-950 line-clamp-1">{item.title}</h3>
                    <p className="text-sm text-glass-subtle line-clamp-1">{item.title_cn || ''}</p>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-glass-subtle mb-1">
                        <span>Đã xem {Math.round(Number(item.watch_percentage || 0))}%</span>
                        <span>{item.remaining_formatted} còn lại</span>
                      </div>
                      <div className="h-1.5 bg-white/70 rounded-full">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full" style={{ width: `${Number(item.watch_percentage || 0)}%` }} />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="glass-section-title text-xl mb-4">
            <span className="material-symbols-outlined text-blue-600">category</span>
            Danh mục
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 stagger-sequence">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`stagger-item category-card rounded-2xl p-4 text-center border transition glass-hover-lift ${categoryFilter === 'all' ? 'glass-surface-strong border-blue-500/40' : 'glass-surface border-white/70 hover:border-blue-300/50'}`}
            >
              <span className="material-symbols-outlined text-3xl text-blue-600 mb-1">apps</span>
              <div className="font-medium text-blue-900">Tất cả</div>
              <div className="text-xs text-glass-subtle mt-1">{videos.length} video</div>
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.slug)}
                className={`stagger-item category-card rounded-2xl p-4 text-center border transition glass-hover-lift ${categoryFilter === cat.slug ? 'glass-surface-strong border-blue-500/40' : 'glass-surface border-white/70 hover:border-blue-300/50'}`}
              >
                <span className="material-symbols-outlined text-3xl text-blue-600 mb-1">{cat.icon || 'folder'}</span>
                <div className="font-medium text-blue-900">{cat.name}</div>
                <div className="text-xs text-glass-subtle mt-1">{cat.video_count} video</div>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="glass-section-title text-xl">
              <span className="material-symbols-outlined text-blue-600">video_library</span>
              Thư viện Video
            </h2>

            <div className="flex items-center gap-2">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg border transition ${viewMode === 'grid' ? 'glass-chip-active border-blue-400/40' : 'glass-chip text-glass-subtle'}`}>
                <span className="material-symbols-outlined text-lg">grid_view</span>
              </button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg border transition ${viewMode === 'list' ? 'glass-chip-active border-blue-400/40' : 'glass-chip text-glass-subtle'}`}>
                <span className="material-symbols-outlined text-lg">view_list</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <button onClick={() => setHskFilter('all')} className={`px-4 py-2 border rounded-full text-sm font-medium transition ${hskFilter === 'all' ? 'glass-chip-active border-blue-400/40' : 'glass-chip'}`}>Tất cả cấp độ</button>
            {[1, 2, 3, 4, 5, 6].map((hsk) => (
              <button key={hsk} onClick={() => setHskFilter(String(hsk))} className={`px-4 py-2 border rounded-full text-sm font-medium transition ${hskFilter === String(hsk) ? 'glass-chip-active border-blue-400/40' : 'glass-chip'}`}>HSK {hsk}</button>
            ))}

            <div className="ml-auto">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="glass-input px-3 py-2 rounded-lg text-sm">
                <option value="newest">Mới nhất</option>
                <option value="popular">Phổ biến nhất</option>
                <option value="az">A-Z</option>
                <option value="duration">Thời lượng</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-52 glass-surface rounded-2xl animate-pulse" />)}
            </div>
          ) : (
            <>
              <div className={viewMode === 'grid' ? 'stagger-sequence grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'stagger-sequence grid grid-cols-1 gap-3'}>
                {pagedVideos.map((video) => (
                  <Link
                    to={`/player/${video.id}`}
                    key={video.id}
                    className={`stagger-item video-card glass-surface rounded-2xl border border-white/70 overflow-hidden glass-hover-lift ${viewMode === 'list' ? 'flex' : ''}`}
                  >
                    <div className={`relative overflow-hidden ${viewMode === 'list' ? 'w-56 h-36 shrink-0' : ''}`}>
                      <VideoThumbnail
                        thumbnailUrl={video.thumbnail_url}
                        videoUrl={video.video_url}
                        alt={video.title}
                        className="w-full h-full aspect-video object-cover"
                      />
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">{formatDuration(video.duration)}</div>
                      <div className="absolute top-2 left-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold px-2 py-1 rounded">HSK {video.hsk_level}</div>
                    </div>

                    <div className="p-4 min-w-0">
                      <h3 className="font-medium text-blue-950 line-clamp-2 mb-1">{video.title}</h3>
                      <p className="text-sm text-glass-subtle line-clamp-1 mb-2">{video.title_cn || ''}</p>
                      <div className="text-xs text-glass-subtle/80 flex items-center gap-2">
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">visibility</span>{Number(video.view_count || 0).toLocaleString()}</span>
                        <span>{video.category_name || '-'}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {!pagedVideos.length && (
                <div className="glass-empty py-10">
                  <span className="material-symbols-outlined text-4xl">search_off</span>
                  <p className="mt-2">Không tìm thấy video nào phù hợp.</p>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg glass-chip disabled:opacity-50"
                >
                  Trước
                </button>
                <span className="text-sm text-glass-subtle">Trang {page}/{totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg glass-chip disabled:opacity-50"
                >
                  Sau
                </button>
              </div>
            </>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="glass-section-title text-xl">
              <span className="material-symbols-outlined text-blue-600">bookmark</span>
              Từ vựng đã lưu <span className="text-sm font-normal text-glass-subtle">({savedWords.length})</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger-sequence">
            {savedWords.slice(0, 8).map((word) => (
              <div key={word.id} className="stagger-item glass-surface rounded-2xl p-4 border border-white/70">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xl font-medium text-blue-950">{word.word_cn || ''}</div>
                    <div className="text-blue-600 text-sm mt-0.5">{word.pinyin || ''}</div>
                  </div>
                  <button onClick={() => removeWord(word.id)} className="text-glass-subtle hover:text-red-500 transition">
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>
                <div className="text-glass-subtle text-sm mt-2">{word.meaning || ''}</div>
                {word.video_title && <div className="text-xs text-glass-subtle/80 mt-2 truncate">Video: {word.video_title}</div>}
              </div>
            ))}

            {!savedWords.length && (
              <div className="col-span-full glass-empty py-8">
                <span className="material-symbols-outlined text-4xl">bookmark_border</span>
                <p className="mt-2">Chưa có từ vựng nào được lưu</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <UserPanelDrawer
        isOpen={isUserPanelOpen}
        onClose={closeUserPanel}
        onLogout={handleLogout}
        currentUser={currentUser}
      />
    </div>
  );
};

export default Library;
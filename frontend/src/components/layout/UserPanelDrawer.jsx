import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import VideoThumbnail from '../ui/VideoThumbnail';
import { API_BASE } from '../../utils/apiBase';

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const resumeUrl = (item) => {
  const t = Math.floor(Number(item?.last_position || 0));
  return t > 0 ? `/player/${item.video_id}?t=${t}` : `/player/${item.video_id}`;
};

const UserPanelDrawer = ({
  isOpen,
  onClose,
  onLogout,
  currentUser,
}) => {
  const [mobileView, setMobileView] = useState('overview');
  const [savedWords, setSavedWords] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  const [stats, setStats] = useState(null);

  const profileUser = useMemo(() => {
    if (currentUser) {
      return currentUser;
    }

    if (stats?.user) {
      return stats.user;
    }

    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [currentUser, stats]);

  const loadPanelData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setSavedWords([]);
      setContinueWatching([]);
      setStats(null);
      return;
    }

    try {
      const [savedRes, progressRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/blog/saved_words`, { headers: authHeaders() }),
        fetch(`${API_BASE}/user/progress`, { headers: authHeaders() }),
        fetch(`${API_BASE}/user/stats/me`, { headers: authHeaders() }),
      ]);

      if (
        savedRes.status === 401
        || savedRes.status === 403
        || progressRes.status === 401
        || progressRes.status === 403
        || statsRes.status === 401
        || statsRes.status === 403
      ) {
        onLogout();
        return;
      }

      const [savedData, progressData, statsData] = await Promise.all([
        savedRes.json(),
        progressRes.json(),
        statsRes.json(),
      ]);

      setSavedWords(savedData.success ? savedData.data || [] : []);
      setContinueWatching(progressData.success ? progressData.data || [] : []);
      setStats(statsData.success ? statsData.data || null : null);
    } catch (error) {
      console.error('Error loading user panel data:', error);
    }
  };

  const removeWord = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/blog/saved_words/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (response.status === 401 || response.status === 403) {
        onLogout();
        return;
      }

      setSavedWords((prev) => prev.filter((item) => Number(item.id) !== Number(id)));
      setStats((prev) => {
        if (!prev) {
          return prev;
        }

        return {
          ...prev,
          saved_words: Math.max(0, Number(prev.saved_words || 0) - 1),
        };
      });
    } catch (error) {
      console.error('Error removing saved word from panel:', error);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    setMobileView('overview');
    loadPanelData();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const panelContent = (
    <div className={`fixed inset-0 z-[70] overflow-hidden transition ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <button
        aria-label="Đóng panel người dùng"
        className={`absolute inset-0 bg-slate-900/35 backdrop-blur-[1px] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
        type="button"
      />

      <aside className={`fixed inset-y-0 right-0 left-auto h-[100dvh] max-h-[100dvh] w-[98vw] max-w-[500px] sm:w-full sm:max-w-md overflow-hidden glass-surface-strong border-l border-white/75 shadow-2xl transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full min-h-0 flex flex-col">
          <div className="pl-[max(0.625rem,env(safe-area-inset-left))] pr-[max(0.625rem,env(safe-area-inset-right))] sm:px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 sm:pb-4 border-b border-blue-200/40 flex items-start justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={profileUser?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileUser?.full_name || profileUser?.username || 'User')}&background=3b82f6&color=fff`}
                alt="avatar"
                className="w-12 h-12 rounded-full ring-2 ring-white/70"
              />
              <div className="min-w-0 flex-1 pr-1">
                <p className="font-bold text-blue-950 leading-tight break-words">{profileUser?.full_name || profileUser?.username || 'Người dùng'}</p>
                <p className="text-xs text-glass-subtle break-all">@{profileUser?.username || 'student'}</p>
                <p className="hidden sm:block text-xs text-glass-subtle truncate">{profileUser?.email || 'Tài khoản học viên'}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="glass-chip rounded-full p-2 text-glass-subtle">
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>

          <div className="hidden sm:grid px-4 py-3 grid-cols-3 gap-2 border-b border-blue-200/35">
            <div className="glass-surface rounded-xl border border-white/65 p-2 text-center">
              <p className="text-[11px] text-glass-subtle">Video đã xem</p>
              <p className="text-lg font-bold text-blue-900">{stats?.videos_watched ?? continueWatching.length}</p>
            </div>
            <div className="glass-surface rounded-xl border border-white/65 p-2 text-center">
              <p className="text-[11px] text-glass-subtle">Từ đã lưu</p>
              <p className="text-lg font-bold text-blue-900">{savedWords.length}</p>
            </div>
            <div className="glass-surface rounded-xl border border-white/65 p-2 text-center">
              <p className="text-[11px] text-glass-subtle">Streak</p>
              <p className="text-lg font-bold text-blue-900">{stats?.streak ?? 0}</p>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] glass-scroll pt-2.5 pb-2.5 pl-[max(0.625rem,env(safe-area-inset-left))] pr-[max(0.625rem,env(safe-area-inset-right))] sm:p-4 space-y-4 sm:space-y-5">
            <div className="sm:hidden space-y-3">
              <div className="sticky top-0 z-10 -mx-0.5 px-0.5">
                <div className="glass-surface rounded-2xl p-1.5 border border-white/75 grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMobileView('overview')}
                    title="Tổng quan"
                    className={`min-w-0 px-1 py-2 rounded-xl text-[11px] leading-tight font-semibold text-center transition ${mobileView === 'overview' ? 'glass-chip-active' : 'glass-chip text-blue-700'}`}
                  >
                    Tổng quan
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileView('saved')}
                    title="Từ đã lưu"
                    className={`min-w-0 px-1 py-2 rounded-xl text-[11px] leading-tight font-semibold text-center transition ${mobileView === 'saved' ? 'glass-chip-active' : 'glass-chip text-blue-700'}`}
                  >
                    Từ lưu
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileView('history')}
                    title="Video đã xem"
                    className={`min-w-0 px-1 py-2 rounded-xl text-[11px] leading-tight font-semibold text-center transition ${mobileView === 'history' ? 'glass-chip-active' : 'glass-chip text-blue-700'}`}
                  >
                    Đã xem
                  </button>
                </div>
              </div>

              {mobileView === 'overview' && (
                <section className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="glass-surface rounded-xl border border-white/70 p-2.5 text-center">
                      <p className="text-[10px] text-glass-subtle truncate">Đã xem</p>
                      <p className="text-base font-bold text-blue-900">{stats?.videos_watched ?? continueWatching.length}</p>
                    </div>
                    <div className="glass-surface rounded-xl border border-white/70 p-2.5 text-center">
                      <p className="text-[10px] text-glass-subtle truncate">Đã lưu</p>
                      <p className="text-base font-bold text-blue-900">{savedWords.length}</p>
                    </div>
                    <div className="glass-surface rounded-xl border border-white/70 p-2.5 text-center">
                      <p className="text-[10px] text-glass-subtle truncate">Streak</p>
                      <p className="text-base font-bold text-blue-900">{stats?.streak ?? 0}</p>
                    </div>
                  </div>

                  <div className="glass-surface rounded-xl border border-white/70 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-glass-subtle">Thành tích hôm nay</p>
                      <span className="text-[11px] text-blue-700 font-semibold">{stats?.streak ?? 0} ngày</span>
                    </div>
                    <p className="mt-1.5 text-sm font-semibold text-blue-900 break-words">
                      Hoàn thành {stats?.videos_completed ?? 0} video
                    </p>
                  </div>

                  <div className="glass-surface rounded-xl border border-white/70 p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold text-blue-900 min-w-0 truncate">Từ mới lưu</p>
                      <button
                        type="button"
                        onClick={() => setMobileView('saved')}
                        className="text-[11px] font-semibold text-blue-700"
                      >
                        Xem hết
                      </button>
                    </div>
                    {savedWords.slice(0, 3).map((word) => (
                      <div key={`m-overview-word-${word.id}`} className="py-1.5 border-b border-blue-100/45 last:border-0">
                        <p className="text-sm font-semibold text-blue-950 break-words">{word.word_cn || ''}</p>
                        <p className="text-xs text-glass-subtle line-clamp-2 break-words">{word.meaning || ''}</p>
                      </div>
                    ))}
                    {!savedWords.length && <p className="text-xs text-glass-subtle">Chưa có từ đã lưu.</p>}
                  </div>

                  <div className="glass-surface rounded-xl border border-white/70 p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-sm font-semibold text-blue-900 min-w-0 truncate">Xem gần đây</p>
                      <button
                        type="button"
                        onClick={() => setMobileView('history')}
                        className="text-[11px] font-semibold text-blue-700"
                      >
                        Xem hết
                      </button>
                    </div>
                    {continueWatching.slice(0, 3).map((item) => (
                      <Link
                        key={`m-overview-video-${item.video_id}-${item.progress_id}`}
                        to={resumeUrl(item)}
                        onClick={onClose}
                        className="block py-1.5 border-b border-blue-100/45 last:border-0"
                      >
                        <p className="text-sm font-semibold text-blue-950 line-clamp-2 break-words">{item.title}</p>
                        <p className="text-xs text-glass-subtle">{Math.round(Number(item.watch_percentage || 0))}% đã xem</p>
                      </Link>
                    ))}
                    {!continueWatching.length && <p className="text-xs text-glass-subtle">Chưa có video đã xem.</p>}
                  </div>
                </section>
              )}

              {mobileView === 'saved' && (
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="glass-section-title text-sm min-w-0 flex-1">
                      <span className="material-symbols-outlined text-blue-600">bookmark</span>
                      <span className="truncate">Danh sách từ đã lưu</span>
                    </h3>
                    <span className="glass-status glass-status-neutral">{savedWords.length}</span>
                  </div>

                  <div className="space-y-2">
                    {savedWords.slice(0, 12).map((word) => (
                      <div key={`m-word-${word.id}`} className="glass-surface rounded-xl border border-white/70 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-base font-semibold text-blue-950 break-words">{word.word_cn || ''}</div>
                            <div className="text-xs text-blue-600 truncate">{word.pinyin || ''}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeWord(word.id)}
                            className="shrink-0 glass-chip rounded-lg px-2 py-1 text-xs text-rose-600"
                          >
                            Xóa
                          </button>
                        </div>
                        <p className="text-xs text-glass-subtle mt-1 line-clamp-2 break-words">{word.meaning || ''}</p>
                      </div>
                    ))}

                    {!savedWords.length && (
                      <div className="glass-empty py-6">
                        <span className="material-symbols-outlined text-3xl">bookmark_border</span>
                        <p className="mt-1 text-sm">Bạn chưa lưu từ vựng nào.</p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {mobileView === 'history' && (
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="glass-section-title text-sm min-w-0 flex-1">
                      <span className="material-symbols-outlined text-blue-600">history</span>
                      <span className="truncate">Danh sách đã xem</span>
                    </h3>
                    <span className="glass-status glass-status-neutral">{continueWatching.length}</span>
                  </div>

                  <div className="space-y-2">
                    {continueWatching.slice(0, 10).map((item) => (
                      <Link
                        key={`m-video-${item.video_id}-${item.progress_id}`}
                        to={resumeUrl(item)}
                        onClick={onClose}
                        className="glass-surface rounded-xl border border-white/70 p-2.5 flex gap-2 hover:bg-white/65 transition"
                      >
                        <VideoThumbnail
                          thumbnailUrl={item.thumbnail_url}
                          videoUrl={item.video_url}
                          className="w-20 h-12 shrink-0 rounded object-cover"
                          alt={item.title}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-blue-950 line-clamp-2 break-words">{item.title}</p>
                          <p className="text-xs text-glass-subtle line-clamp-1">{Math.round(Number(item.watch_percentage || 0))}% đã xem</p>
                        </div>
                      </Link>
                    ))}

                    {!continueWatching.length && (
                      <div className="glass-empty py-6">
                        <span className="material-symbols-outlined text-3xl">movie_off</span>
                        <p className="mt-1 text-sm">Chưa có video đã xem.</p>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>

            <div className="hidden sm:block space-y-5">
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="glass-section-title text-base">
                    <span className="material-symbols-outlined text-blue-600">bookmark</span>
                    Từ vựng đã lưu
                  </h3>
                  <span className="glass-status glass-status-neutral">{savedWords.length}</span>
                </div>

                <div className="space-y-2">
                  {savedWords.slice(0, 10).map((word) => (
                    <div key={word.id} className="glass-surface rounded-xl border border-white/70 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-base font-semibold text-blue-950">{word.word_cn || ''}</div>
                          <div className="text-xs text-blue-600">{word.pinyin || ''}</div>
                        </div>
                        <button onClick={() => removeWord(word.id)} className="glass-chip rounded-lg px-2 py-1 text-xs text-rose-600">
                          Xóa
                        </button>
                      </div>
                      <p className="text-xs text-glass-subtle mt-1 line-clamp-2">{word.meaning || ''}</p>
                    </div>
                  ))}

                  {!savedWords.length && (
                    <div className="glass-empty py-6">
                      <span className="material-symbols-outlined text-3xl">bookmark_border</span>
                      <p className="mt-1 text-sm">Bạn chưa lưu từ vựng nào.</p>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="glass-section-title text-base">
                    <span className="material-symbols-outlined text-blue-600">history</span>
                    Video đã xem
                  </h3>
                  <span className="glass-status glass-status-neutral">{continueWatching.length}</span>
                </div>

                <div className="space-y-2">
                  {continueWatching.slice(0, 8).map((item) => (
                    <Link
                      key={`${item.video_id}-${item.progress_id}`}
                      to={resumeUrl(item)}
                      onClick={onClose}
                      className="glass-surface rounded-xl border border-white/70 p-2.5 flex gap-2 hover:bg-white/65 transition"
                    >
                      <VideoThumbnail
                        thumbnailUrl={item.thumbnail_url}
                        videoUrl={item.video_url}
                        className="w-20 h-12 rounded object-cover"
                        alt={item.title}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-blue-950 line-clamp-1">{item.title}</p>
                        <p className="text-xs text-glass-subtle line-clamp-1">{Math.round(Number(item.watch_percentage || 0))}% đã xem</p>
                      </div>
                    </Link>
                  ))}

                  {!continueWatching.length && (
                    <div className="glass-empty py-6">
                      <span className="material-symbols-outlined text-3xl">movie_off</span>
                      <p className="mt-1 text-sm">Chưa có video đã xem.</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>

          <div className="pl-[max(0.875rem,env(safe-area-inset-left))] pr-[max(0.875rem,env(safe-area-inset-right))] sm:px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-blue-200/35">
            <button
              type="button"
              onClick={onLogout}
              className="w-full glass-btn rounded-xl px-4 py-3 text-rose-600 font-semibold flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              Đăng xuất
            </button>
          </div>
        </div>
      </aside>
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(panelContent, document.body);
};

export default UserPanelDrawer;

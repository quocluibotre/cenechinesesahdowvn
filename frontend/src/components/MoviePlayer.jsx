import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

/**
 * MoviePlayer — nhúng phim qua playimdb.com với phụ đề tự động.
 *
 * Cơ chế sync thời gian:
 *  1. Ưu tiên: lắng nghe postMessage từ iframe player (nếu player có hỗ trợ)
 *  2. Fallback:  khi user nhấn nút Play overlay, đồng hồ nội bộ bắt đầu cùng lúc với iframe
 *
 * Props:
 *   imdbId       string  — "tt12042730"
 *   subtitles    array   — [{id, start_time, end_time, en_text, vn_text}]
 *   title        string
 *   showEn       bool
 *   showVi       bool
 *   onTimeChange fn(seconds)
 */
const MoviePlayer = ({ imdbId, subtitles = [], title = '', showEn = true, showVi = true, onTimeChange }) => {
  const [started, setStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [offset, setOffset] = useState(0);
  const [usingPostMsg, setUsingPostMsg] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const intervalRef = useRef(null);
  const lastPostMsgTime = useRef(0);

  const [showDebug, setShowDebug] = useState(false);
  const [debugMsgs, setDebugMsgs] = useState([]); // log postMessages để debug

  const effectiveTime = elapsed + offset;

  // ── postMessage listener — thử 20+ format khác nhau ──────────────────────
  useEffect(() => {
    const handler = (event) => {
      const d = event.data;

      // Bản ghi vào debug log (chỉ lưu 20 mắn nhất)
      if (d !== undefined && d !== null) {
        const preview = typeof d === 'string'
          ? d.slice(0, 120)
          : JSON.stringify(d).slice(0, 120);
        setDebugMsgs((prev) => [
          { ts: new Date().toISOString().slice(11, 23), msg: preview },
          ...prev.slice(0, 19),
        ]);
      }

      // Phân tích để lấy currentTime từ nhiều format:
      let t = null;

      if (typeof d === 'number' && d >= 0) {
        t = d;
      } else if (typeof d === 'string') {
        try {
          const parsed = JSON.parse(d);
          t = parsed.currentTime ?? parsed.position ?? parsed.time
            ?? parsed.data?.currentTime ?? parsed.data?.position
            ?? parsed.playbackData?.currentTime ?? parsed.detail?.currentTime
            ?? null;
        } catch { /* not JSON */ }
      } else if (d && typeof d === 'object') {

        // ✅ playimdb.com format (đã confirm):
        // {type:"STORAGE_SET", key:"watch_ttXXX", value:"{\"time\":144.8,\"duration\":...}"}
        if (d.type === 'STORAGE_SET' && typeof d.value === 'string' && String(d.key || '').startsWith('watch_')) {
          try {
            const v = JSON.parse(d.value);
            if (typeof v.time === 'number' && v.time >= 0) t = v.time;
          } catch { /* ignore */ }
        }

        // ✅ PLAYER_EVENT từ playimdb.com
        if (t === null && d.type === 'PLAYER_EVENT' && d.data) {
          t = d.data.currentTime ?? d.data.position ?? d.data.time ?? null;
        }

        // Các format khác
        if (t === null) {
          t = d.currentTime ?? d.position ?? d.time ?? d.playbackTime
            ?? d.data?.currentTime ?? d.data?.position ?? d.data?.time
            ?? d.detail?.currentTime ?? d.detail?.position
            ?? d.info?.currentTime ?? d.seconds
            ?? d.playbackData?.currentTime ?? null;
        }
        if (t === null && d.event === 'timeupdate' && typeof d.data === 'object') {
          t = d.data?.seconds ?? d.data?.currentTime ?? null;
        }
        if (t === null && (d.type === 'time' || d.type === 'timeupdate')) {
          t = d.position ?? d.currentTime ?? d.time ?? null;
        }
        if (t === null && d.event?.type === 'timeupdate') {
          t = d.event?.currentTime ?? null;
        }
      }


      if (typeof t === 'number' && Number.isFinite(t) && t >= 0) {
        // Recalibrate clock về đúng timestamp từ player
        baseElapsedRef.current = t;
        startTimeRef.current = performance.now();
        setElapsed(t);
        onTimeChange?.(t);
        lastPostMsgTime.current = Date.now();
        setUsingPostMsg(true);
        setStarted(true); // luôn set — không có hại gì nếu đã true rồi

        // Nếu clock chưa chạy → khởi động
        if (!intervalRef.current) {
          intervalRef.current = setInterval(() => {
            if (startTimeRef.current !== null) {
              const nowElapsed = baseElapsedRef.current + (performance.now() - startTimeRef.current) / 1000;
              setElapsed(nowElapsed);
              onTimeChange?.(nowElapsed);
            }
          }, 100);
          setRunning(true);
        }
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onTimeChange]); // ← bỏ 'started' ra khỏi deps để tránh effect re-run xóa interval

  // Kiểm tra nếu postMessage ngừng gửi (player paused / không hỗ trợ)
  // Sau 3 giây không nhận → chuyển về đồng hồ nội bộ nếu đang running
  useEffect(() => {
    if (!usingPostMsg) return;
    const check = setInterval(() => {
      if (Date.now() - lastPostMsgTime.current > 3000) {
        setUsingPostMsg(false);
      }
    }, 2000);
    return () => clearInterval(check);
  }, [usingPostMsg]);

  // ── Đồng hồ nội bộ dùng performance.now() — không bị drift sau nhiều giờ ──────────────
  const startTimeRef = useRef(null); // performance.now() khi bắt đầu
  const baseElapsedRef = useRef(0);  // elapsed khi pause → resume từ điểm này

  const startClock = useCallback((fromSeconds = null) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const base = fromSeconds !== null ? fromSeconds : baseElapsedRef.current;
    baseElapsedRef.current = base;
    startTimeRef.current = performance.now();

    intervalRef.current = setInterval(() => {
      const nowElapsed = base + (performance.now() - startTimeRef.current) / 1000;
      setElapsed(nowElapsed);
      onTimeChange?.(nowElapsed);
    }, 100); // 100ms interval — mượt hơn, chính xác hơn
    setRunning(true);
  }, [onTimeChange]);

  const pauseClock = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // Lưu lại elapsed hiện tại để resume đúng chỗ
    baseElapsedRef.current = startTimeRef.current
      ? baseElapsedRef.current + (performance.now() - startTimeRef.current) / 1000
      : baseElapsedRef.current;
    startTimeRef.current = null;
    setRunning(false);
  }, []);

  // Nhảy tới một giây cụ thể
  const seekTo = useCallback((seconds) => {
    const t = Math.max(0, Number(seconds));
    baseElapsedRef.current = t;
    startTimeRef.current = performance.now();
    setElapsed(t);
    onTimeChange?.(t);
    // Nếu đang chạy thì restart clock từ giây mới
    if (running) startClock(t);
  }, [running, startClock, onTimeChange]);

  // Shift offset — căn chỉnh khoảng lệch
  const shiftOffset = useCallback((delta) => {
    setOffset((o) => +((o + delta).toFixed(2)));
  }, []);

  // ── Bắt đầu phim: click Play overlay ────────────────────────────────────────
  const handlePlayClick = useCallback(() => {
    setStarted(true);
    setElapsed(0);
    setOffset(0);
    baseElapsedRef.current = 0;
    startTimeRef.current = null;

    // Thử gửi play command tới iframe
    try {
      const cmds = [
        { method: 'play' },
        { event: 'command', func: 'playVideo' },
        'play',
      ];
      cmds.forEach((cmd) => {
        iframeRef.current?.contentWindow?.postMessage(
          typeof cmd === 'string' ? cmd : JSON.stringify(cmd),
          '*'
        );
      });
    } catch { /* ignore cross-origin */ }

    // Khởi động đồng hồ từ giây 0
    startClock(0);
  }, [startClock]);

  // Cleanup
  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  // ── Fullscreen ───────────────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  useEffect(() => {
    const onFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFSChange);
    return () => document.removeEventListener('fullscreenchange', onFSChange);
  }, []);

  // ── Phụ đề hiện tại ─────────────────────────────────────────────────────────
  const currentSub = useMemo(() => {
    if (!subtitles.length) return null;
    return subtitles.find(
      (s) => effectiveTime >= Number(s.start_time) && effectiveTime <= Number(s.end_time)
    ) || null;
  }, [subtitles, effectiveTime]);

  // ── Format time ─────────────────────────────────────────────────────────────
  const fmt = (sec) => {
    const s = Math.max(0, Math.floor(Number(sec || 0)));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
      : `${m}:${String(ss).padStart(2, '0')}`;
  };

  const embedUrl = `https://www.playimdb.com/title/${imdbId}/`;

  return (
    <div className="flex flex-col gap-3">
      {/* ── iframe + overlay + subtitle ──────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="relative w-full rounded-xl overflow-hidden bg-black shadow-xl"
        style={{ paddingTop: isFullscreen ? '0' : '56.25%', height: isFullscreen ? '100vh' : undefined }}
      >
        <iframe
          ref={iframeRef}
          src={embedUrl}
          className="absolute inset-0 w-full h-full border-0"
          title={title || imdbId}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          referrerPolicy="origin"
        />

        {/* Play overlay — hiện trước khi user bắt đầu */}
        {!started && (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center cursor-pointer bg-black/40 backdrop-blur-[2px] transition-opacity"
            onClick={handlePlayClick}
          >
            <div className="w-20 h-20 rounded-full bg-blue-600/90 flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.7)] hover:bg-blue-500 hover:scale-110 transition-all duration-200">
              <span className="material-symbols-outlined text-white text-5xl ml-1.5">play_arrow</span>
            </div>
            <p className="mt-4 text-white/90 text-sm font-semibold drop-shadow text-center px-4">
              Nhấn để bắt đầu phim &amp; đồng bộ phụ đề
            </p>
          </div>
        )}

        {/* Subtitle overlay */}
        {started && (showEn || showVi) && currentSub && (
          <div className={`absolute left-0 right-0 px-4 pointer-events-none flex flex-col items-center gap-1 z-10 ${isFullscreen ? 'bottom-16' : 'bottom-10'}`}>
            {showEn && currentSub.en_text && (
              <div className="inline-block max-w-[90%] text-center">
                <span className={`bg-black/75 text-white font-bold leading-snug px-3 py-1 rounded-md drop-shadow-lg ${isFullscreen ? 'text-xl sm:text-2xl md:text-3xl' : 'text-sm sm:text-base md:text-lg lg:text-xl'}`}>
                  {currentSub.en_text}
                </span>
              </div>
            )}
            {showVi && currentSub.vn_text && (
              <div className="inline-block max-w-[90%] text-center">
                <span className={`bg-black/65 text-yellow-300 font-semibold leading-snug px-3 py-0.5 rounded-md drop-shadow-lg ${isFullscreen ? 'text-base sm:text-lg md:text-xl' : 'text-xs sm:text-sm md:text-base'}`}>
                  {currentSub.vn_text}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Nút Fullscreen góc phải trên */}
        {started && (
          <button
            onClick={toggleFullscreen}
            className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-lg bg-black/50 text-white hover:bg-black/70 transition"
            title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
          >
            <span className="material-symbols-outlined text-lg">
              {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </button>
        )}
      </div>

      {!started && subtitles.length === 0 && (
        <div className="px-3 py-2 rounded-xl bg-amber-50/60 border border-amber-200/50 text-xs text-amber-700">
          ⚠️ Chưa có phụ đề — Admin vào tab <strong>Thêm Phim (IMDB)</strong> để tải phụ đề từ OpenSubtitles.
        </div>
      )}

    </div>
  );
};

export default MoviePlayer;

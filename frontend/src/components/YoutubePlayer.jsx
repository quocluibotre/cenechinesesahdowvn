import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';

const YoutubePlayer = ({ 
  videoId, 
  subtitles = [], 
  onDictionaryLookup 
}) => {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const frameRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentSub, setCurrentSub] = useState(null);
  const [isMuted, setIsMuted] = useState(false);

  // Khởi tạo Youtube Iframe API
  useEffect(() => {
    if (!videoId) return;

    const loadYoutubeAPI = () => {
      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        
        window.onYouTubeIframeAPIReady = () => {
          initPlayer();
        };
      } else {
        initPlayer();
      }
    };

    const initPlayer = () => {
      // Dọn dẹp iframe cũ nếu có
      if (playerRef.current) {
        playerRef.current.destroy();
      }

      playerRef.current = new window.YT.Player('yt-player-container', {
        videoId: videoId,
        playerVars: {
          controls: 0,
          modestbranding: 1,
          rel: 0,
          disablekb: 1,
          iv_load_policy: 3
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange
        }
      });
    };

    loadYoutubeAPI();

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [videoId]);

  const onPlayerReady = (event) => {
    setDuration(event.target.getDuration());
    if (isMuted) event.target.mute();
  };

  const onPlayerStateChange = (event) => {
    if (event.data === window.YT.PlayerState.PLAYING) {
      setIsPlaying(true);
      startSyncLoop();
    } else {
      setIsPlaying(false);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    }
  };

  // Vòng lặp đồng bộ phụ đề bằng requestAnimationFrame
  const startSyncLoop = useCallback(() => {
    const updateLoop = () => {
      if (!playerRef.current || !playerRef.current.getCurrentTime) return;

      const currentTime = playerRef.current.getCurrentTime();
      setProgress((currentTime / duration) * 100);

      // Tìm phụ đề khớp với thời gian hiện tại
      // Chú ý: timestamps của mình đang là giây!
      const activeSub = subtitles.find(
        sub => currentTime >= sub.start_time && currentTime <= sub.end_time
      );
      
      setCurrentSub(activeSub || null);
      frameRef.current = requestAnimationFrame(updateLoop);
    };
    
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(updateLoop);
  }, [duration, subtitles]);

  // Các nút bấm điều khiển Custom
  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleSeek = (e) => {
    if (!playerRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    
    playerRef.current.seekTo(newTime, true);
    setProgress(percentage * 100);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen();
    }
  };

  const handleWordClick = (word) => {
    // Tạm dừng video để người dùng xem từ điển
    if (playerRef.current && isPlaying) {
      playerRef.current.pauseVideo();
    }
    // Gạn lọc các ký tự đặc biệt dính ở rìa của từ
    const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
    if (cleanWord && onDictionaryLookup) {
      onDictionaryLookup(cleanWord);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full max-w-4xl mx-auto bg-black rounded-xl overflow-hidden shadow-2xl group"
    >
      {/* Khung chứa Youtube iframe */}
      <div className="relative pt-[56.25%]"> {/* Aspect ratio 16:9 */}
        <div 
          id="yt-player-container" 
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
        ></div>
        
        {/* Lớp bắt sự kiện click lên giữa màn hình để chặn youtube mặc định */}
        <div 
          className="absolute top-0 left-0 w-full h-full cursor-pointer opacity-0"
          onClick={togglePlay}
        ></div>
      </div>

      {/* Overlay phụ đề */}
      <div className="absolute top-[60%] left-0 right-0 flex flex-col items-center justify-center pointer-events-none px-8 text-center drop-shadow-lg">
        {currentSub && (
          <div className="bg-black/60 backdrop-blur-sm px-6 py-4 rounded-xl border border-white/10 max-w-3xl pointer-events-auto">
            <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-2 leading-relaxed">
              {currentSub.en_text.split(' ').map((word, idx) => (
                <span 
                  key={idx} 
                  className="inline-block mr-[0.25em] cursor-pointer hover:text-[#5ce1e6] hover:-translate-y-1 transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleWordClick(word);
                  }}
                >
                  {word}
                </span>
              ))}
            </h2>
            <p className="text-lg sm:text-xl text-[#f1c40f] font-medium opacity-90 mx-auto">
              {currentSub.vn_text}
            </p>
          </div>
        )}
      </div>

      {/* Thanh điều khiển tuỳ chỉnh (hiện lên khi di chuột) */}
      <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        
        {/* Progress bar */}
        <div 
          className="w-full h-1.5 bg-white/30 rounded-full mb-4 cursor-pointer relative overflow-hidden group/progress"
          onClick={handleSeek}
        >
          <div 
            className="absolute top-0 left-0 h-full bg-[#ff0000] relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -mt-1.5 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover/progress:opacity-100 transform translate-x-1/2"></div>
          </div>
        </div>

        {/* Buttons Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <button 
              onClick={togglePlay}
              className="text-white hover:text-[#5ce1e6] transition-colors focus:outline-none"
            >
              {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
            </button>
            
            <button 
              onClick={toggleMute}
              className="text-white hover:text-[#5ce1e6] transition-colors focus:outline-none"
            >
              {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>
          </div>

          <div className="flex justify-end">
            <button 
              onClick={toggleFullscreen}
              className="text-white hover:text-[#5ce1e6] transition-colors focus:outline-none"
            >
              <Maximize size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YoutubePlayer;

const fs = require('fs');
const FILE = 'src/pages/Player.jsx';
let content = fs.readFileSync(FILE, 'utf8');

// 1. Add states & refs
content = content.replace('const ytPlayerRef = useRef(null);', 'const ytPlayerRef = useRef(null);\n  const playerContainerRef = useRef(null);\n  const [isPlaying, setIsPlaying] = useState(false);\n  const [showControls, setShowControls] = useState(true);');

// 2. Add togglePlay & toggleFullscreen
const toggleFunctions = `
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
`;
content = content.replace('  const jumpToSentence = (index) => {', toggleFunctions + '\n  const jumpToSentence = (index) => {');

// 3. Modifying Youtube onReady & onStateChange
content = content.replace(
  'events: { onReady: startPolling }',
  'events: { onReady: startPolling, onStateChange: (e) => setIsPlaying(e.data === 1) }'
);

// 4. Modifying native video events
content = content.replace(
  'node.addEventListener(\'timeupdate\', onTimeUpdate);',
  'node.addEventListener(\'timeupdate\', onTimeUpdate);\n    const pPlay = () => setIsPlaying(true);\n    const pPause = () => setIsPlaying(false);\n    node.addEventListener(\'play\', pPlay);\n    node.addEventListener(\'pause\', pPause);'
);
content = content.replace(
  'node.removeEventListener(\'timeupdate\', onTimeUpdate);',
  'node.removeEventListener(\'timeupdate\', onTimeUpdate);\n      node.removeEventListener(\'play\', pPlay);\n      node.removeEventListener(\'pause\', pPause);'
);

// 5. Replace player block
const newPlayerBlock = `<div 
            ref={playerContainerRef}
            className="rounded-2xl overflow-hidden bg-black relative shadow-lg group aspect-video"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => isPlaying && setShowControls(false)}
            onMouseMove={() => { setShowControls(true); clearTimeout(window.controlsTimeout); window.controlsTimeout = setTimeout(() => isPlaying && setShowControls(false), 2500); }}
          >
            {extractYouTubeId(videoData.video_url) ? (
              <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
                <iframe
                  id="yt-iframe-player"
                  className="w-[110%] h-[110%] -ml-[5%] -mt-[5%]" 
                  src={\`https://www.youtube.com/embed/\${extractYouTubeId(videoData.video_url)}?enablejsapi=1&rel=0&modestbranding=1&controls=0&disablekb=1&fs=0&iv_load_policy=3&playsinline=1\`}
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

            {/* Overlay phụ đề 2 dòng chung */}
            <div className={\`absolute bottom-12 md:bottom-16 left-0 right-0 px-4 pb-4 pt-8 pointer-events-none text-center z-20 transition-opacity duration-300 \${(!showControls && isPlaying) ? 'opacity-100' : ''}\`}>
              {showCn && currentCnSubtitle && (
                <div className="inline-block max-w-[94%] text-white font-bold text-2xl md:text-3xl lg:text-4xl leading-snug break-words drop-shadow-[0_2px_5px_rgba(0,0,0,1)] mb-1">
                  {extractYouTubeId(videoData.video_url) && currentCnSubtitle.words ? (
                     <WordHighlight text={currentCnSubtitle.text} words={currentCnSubtitle.words} currentTime={currentTime} />
                  ) : sanitizeSubtitleText(currentCnSubtitle.text)}
                </div>
              )}
              {showVi && currentViSubtitle && (
                <div className="block w-full max-w-[94%] mx-auto text-[#f1c40f] font-semibold text-lg md:text-2xl mt-1.5 leading-snug break-words drop-shadow-[0_2px_5px_rgba(0,0,0,1)]">
                  {sanitizeSubtitleText(currentViSubtitle.text, 170)}
                </div>
              )}
              {showPinyin && currentPinyinSubtitle && (
                  <div className="block w-full max-w-[94%] mx-auto text-blue-200 font-medium text-base md:text-xl mt-1 leading-snug break-words drop-shadow-[0_2px_5px_rgba(0,0,0,1)]">{sanitizeSubtitleText(currentPinyinSubtitle.text, 170)}</div>
              )}
            </div>

            {/* Custom Control Bar */}
            <div className={\`absolute bottom-0 left-0 right-0 p-3 pt-12 bg-gradient-to-t from-black/90 to-transparent z-30 transition-opacity duration-300 \${showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'}\`}>
               <div className="flex items-center gap-4 text-white px-2">
                 <button onClick={togglePlay} className="hover:text-blue-400 transition">
                   <span className="material-symbols-outlined text-3xl">{isPlaying ? 'pause' : 'play_arrow'}</span>
                 </button>
                 <div className="flex-1 h-1.5 bg-white/30 rounded-full cursor-pointer relative group/progress" onClick={(e) => {
                     const rect = e.currentTarget.getBoundingClientRect();
                     const percent = (e.clientX - rect.left) / rect.width;
                     const newTime = percent * duration;
                     if (extractYouTubeId(videoData.video_url) && ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
                        ytPlayerRef.current.seekTo(newTime, true);
                     } else if (videoRef.current) {
                        videoRef.current.currentTime = newTime;
                     }
                 }}>
                    <div className="absolute top-0 left-0 h-full bg-[#ff0000] rounded-full relative" style={{ width: \`\${(currentTime/duration)*100 || 0}%\` }}>
                        <div className="absolute right-0 top-1/2 -mt-1.5 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover/progress:opacity-100 transform translate-x-1/2"></div>
                    </div>
                 </div>
                 <div className="text-sm font-medium tabular-nums">{toDuration(currentTime)} / {toDuration(duration)}</div>
                 <button onClick={toggleFullscreen} className="hover:text-blue-400 transition">
                   <span className="material-symbols-outlined text-2xl">{!document.fullscreenElement?'fullscreen':'fullscreen_exit'}</span>
                 </button>
               </div>
            </div>
          </div>`;

const startIdx = content.indexOf('<div className="rounded-2xl overflow-hidden bg-black relative shadow-lg">');
const endIdx = content.indexOf('<div className="glass-surface rounded-2xl p-4 border border-white/70">');

if (startIdx > -1 && endIdx > -1) {
    content = content.substring(0, startIdx) + newPlayerBlock + '\n\n          ' + content.substring(endIdx);
} else {
    console.error('FAILED TO REPLACE PLAYER BLOCK', startIdx, endIdx);
}

// 6. Sidebar Subtitle list design
const oldSidebarLine = '<div className="text-xs text-glass-subtle mb-1">{toDuration(entry.start)}</div>';
const newSidebarLine = '<div className="text-[11px] text-blue-500 font-semibold mb-1 tabular-nums">{toDuration(entry.start)}</div>';
content = content.split(oldSidebarLine).join(newSidebarLine);

const oldSidebarText = '<div className="text-sm text-blue-950">{entry.text}</div>';
const newSidebarText = '<div className="text-[15px] text-slate-800 font-bold leading-snug">{entry.text}</div>';
content = content.split(oldSidebarText).join(newSidebarText);

const oldSidebarVi = '{subVi[idx] && subVi[idx].text !== entry.text && <div className="text-xs text-glass-subtle mt-1">{subVi[idx].text}</div>}';
const newSidebarVi = '{(dbSubtitles.length ? dbSubtitles[idx]?.vn_text : subVi[idx]?.text) != entry.text && (dbSubtitles.length ? dbSubtitles[idx]?.vn_text : subVi[idx]?.text) && <div className="text-[13.5px] text-slate-500 font-medium mt-1 leading-snug">{dbSubtitles.length ? dbSubtitles[idx]?.vn_text : subVi[idx]?.text}</div>}';
content = content.split(oldSidebarVi).join(newSidebarVi);

fs.writeFileSync(FILE, content, 'utf8');
console.log('Player updated!');

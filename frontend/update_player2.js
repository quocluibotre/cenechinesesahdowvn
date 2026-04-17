const fs = require('fs');
const FILE = 'src/pages/Player.jsx';
let content = fs.readFileSync(FILE, 'utf8');

// The marker where we insert our pre-play overlay is right after:
// {extractYouTubeId(videoData.video_url) && (
//   <div className="absolute inset-0 z-10 cursor-pointer" onClick={togglePlay}></div>
// )}

const searchStr = '{extractYouTubeId(videoData.video_url) && (\n              <div className="absolute inset-0 z-10 cursor-pointer" onClick={togglePlay}></div>\n            )}';

const overlayHTML = `{extractYouTubeId(videoData.video_url) && (
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
            )}`;

if (content.includes(searchStr)) {
   content = content.replace(searchStr, overlayHTML);
} else {
   // Fallback using split if spacing is slightly different
   const fallbackSearch = '<div className="absolute inset-0 z-10 cursor-pointer" onClick={togglePlay}></div>\n            )}';
   if (content.includes(fallbackSearch)) {
        content = content.replace(fallbackSearch, fallbackSearch + '\n\n' + `{extractYouTubeId(videoData.video_url) && !isPlaying && currentTime === 0 && (
              <div className="absolute inset-0 z-[15] bg-black cursor-pointer flex flex-col items-center justify-center transition-opacity duration-300 pointer-events-auto" onClick={togglePlay}>
                <img src={videoData.thumbnail_url} alt="Cover" className="absolute inset-0 w-full h-full object-cover opacity-70" />
                <div className="relative z-20 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.7)] hover:bg-blue-500 hover:scale-105 transition-transform duration-200">
                  <span className="material-symbols-outlined text-white text-4xl ml-1">play_arrow</span>
                </div>
              </div>
            )}`);
   }
}

fs.writeFileSync(FILE, content, 'utf8');
console.log('Player updated with Thumbnail Overlay!');

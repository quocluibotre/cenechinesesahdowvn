import React, { useRef } from 'react';

const VideoThumbnail = ({
  thumbnailUrl,
  videoUrl,
  alt,
  className = '',
  fallbackText = 'Video',
}) => {
  const videoRef = useRef(null);

  const seekPreviewFrame = () => {
    const node = videoRef.current;
    if (!node || !Number.isFinite(node.duration) || node.duration <= 0) {
      return;
    }

    const targetTime = Math.min(1.2, Math.max(0.1, node.duration * 0.03));
    if (Math.abs(node.currentTime - targetTime) > 0.05) {
      node.currentTime = targetTime;
    }
  };

  if (thumbnailUrl) {
    return <img src={thumbnailUrl} alt={alt} className={className} loading="lazy" />;
  }

  if (videoUrl) {
    return (
      <video
        ref={videoRef}
        src={videoUrl}
        className={className}
        muted
        playsInline
        preload="metadata"
        onLoadedMetadata={seekPreviewFrame}
        onCanPlay={seekPreviewFrame}
      />
    );
  }

  return (
    <div className={`${className} bg-slate-200/80 text-slate-500 text-xs flex items-center justify-center`}>
      {fallbackText}
    </div>
  );
};

export default VideoThumbnail;
import { useState, useEffect, useRef, useCallback } from 'react';

function TimelinePlayer({ 
  snapshots = [], 
  currentSnapshotIndex, 
  onSnapshotChange,
  onPlayStateChange,
  isPlaying = false
}) {
  const [localIsPlaying, setLocalIsPlaying] = useState(isPlaying);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(currentSnapshotIndex || 0);
  const [isDragging, setIsDragging] = useState(false);
  const timelineRef = useRef(null);
  const animationRef = useRef(null);
  const lastUpdateRef = useRef(Date.now());

  const speeds = [0.25, 0.5, 1, 2, 4];
  const totalSnapshots = snapshots.length;

  useEffect(() => {
    setCurrentIndex(currentSnapshotIndex || 0);
  }, [currentSnapshotIndex]);

  useEffect(() => {
    if (onPlayStateChange) {
      onPlayStateChange(localIsPlaying);
    }
  }, [localIsPlaying, onPlayStateChange]);

  useEffect(() => {
    if (!localIsPlaying || totalSnapshots === 0) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const animate = () => {
      const now = Date.now();
      const delta = now - lastUpdateRef.current;
      const interval = 1000 / playbackSpeed;

      if (delta >= interval) {
        lastUpdateRef.current = now;
        setCurrentIndex(prev => {
          const next = (prev + 1) % totalSnapshots;
          if (onSnapshotChange) {
            onSnapshotChange(next);
          }
          return next;
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [localIsPlaying, playbackSpeed, totalSnapshots, onSnapshotChange]);

  const handleTimelineClick = useCallback((e) => {
    if (!timelineRef.current || totalSnapshots === 0) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newIndex = Math.min(Math.max(Math.floor(percentage * totalSnapshots), 0), totalSnapshots - 1);

    setCurrentIndex(newIndex);
    if (onSnapshotChange) {
      onSnapshotChange(newIndex);
    }
  }, [totalSnapshots, onSnapshotChange]);

  const handleMouseDown = useCallback((e) => {
    setIsDragging(true);
    handleTimelineClick(e);
  }, [handleTimelineClick]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      handleTimelineClick(e);
    }
  }, [isDragging, handleTimelineClick]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const togglePlay = () => {
    setLocalIsPlaying(!localIsPlaying);
  };

  const stepForward = () => {
    if (totalSnapshots === 0) return;
    const next = (currentIndex + 1) % totalSnapshots;
    setCurrentIndex(next);
    if (onSnapshotChange) {
      onSnapshotChange(next);
    }
  };

  const stepBackward = () => {
    if (totalSnapshots === 0) return;
    const prev = (currentIndex - 1 + totalSnapshots) % totalSnapshots;
    setCurrentIndex(prev);
    if (onSnapshotChange) {
      onSnapshotChange(prev);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = totalSnapshots > 0 ? (currentIndex / (totalSnapshots - 1)) * 100 : 0;
  const estimatedDuration = totalSnapshots > 0 ? totalSnapshots / playbackSpeed : 0;
  const currentTime = currentIndex / playbackSpeed;

  return (
    <div className="timeline-player">
      <div className="timeline-header">
        <div className="timeline-info">
          <span className="timeline-label">⏱️ 时间轴</span>
          <span className="timeline-count">
            {totalSnapshots} 个快照 | 时长: {formatTime(estimatedDuration)}
          </span>
        </div>
        <div className="speed-selector">
          <span className="speed-label">速度:</span>
          {speeds.map(speed => (
            <button
              key={speed}
              className={`speed-btn ${playbackSpeed === speed ? 'active' : ''}`}
              onClick={() => setPlaybackSpeed(speed)}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      <div className="timeline-track-container">
        <div
          ref={timelineRef}
          className="timeline-track"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div className="timeline-progress" style={{ width: `${progressPercentage}%` }}>
            <div className="timeline-handle"></div>
          </div>
          
          {snapshots.map((snapshot, index) => (
            <div
              key={snapshot.id || index}
              className={`timeline-marker ${index <= currentIndex ? 'active' : ''}`}
              style={{ left: `${(index / Math.max(totalSnapshots - 1, 1)) * 100}%` }}
              title={`快照 #${index + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="timeline-controls">
        <button className="control-btn" onClick={stepBackward} title="上一帧">
          ⏮
        </button>
        <button className="control-btn play-btn" onClick={togglePlay} title={localIsPlaying ? '暂停' : '播放'}>
          {localIsPlaying ? '⏸' : '▶'}
        </button>
        <button className="control-btn" onClick={stepForward} title="下一帧">
          ⏭
        </button>
        
        <div className="time-display">
          <span>{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(estimatedDuration)}</span>
        </div>

        <div className="frame-display">
          <span>帧: {currentIndex + 1} / {totalSnapshots}</span>
        </div>
      </div>
    </div>
  );
}

export default TimelinePlayer;

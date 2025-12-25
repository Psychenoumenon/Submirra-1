import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  isMine?: boolean;
}

export default function AudioPlayer({ src, isMine = false }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showVolume, setShowVolume] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newVolume = parseFloat(e.target.value);
    audio.volume = newVolume;
    setVolume(newVolume);
  };

  
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`flex items-center gap-3 p-2 rounded-xl min-w-[200px] ${
      isMine 
        ? 'bg-white/10 backdrop-blur-sm' 
        : 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 backdrop-blur-sm'
    }`}>
      <audio ref={audioRef} src={src} preload="metadata" />
      
      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
          isMine
            ? 'bg-white/20 hover:bg-white/30 text-white'
            : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-lg shadow-pink-500/30'
        }`}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>

      {/* Slider and Time */}
      <div className="flex-1 flex flex-col gap-1">
        {/* Custom Slider */}
        <div className="relative w-full h-1.5 group">
          <div className={`absolute inset-0 rounded-full ${
            isMine ? 'bg-white/20' : 'bg-slate-600/50'
          }`} />
          <div 
            className={`absolute left-0 top-0 h-full rounded-full transition-all ${
              isMine 
                ? 'bg-white/70' 
                : 'bg-gradient-to-r from-pink-500 to-purple-500'
            }`}
            style={{ width: `${progress}%` }}
          />
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSliderChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          {/* Slider Thumb */}
          <div 
            className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full transition-all opacity-0 group-hover:opacity-100 ${
              isMine ? 'bg-white' : 'bg-white shadow-lg'
            }`}
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>

        {/* Time Display */}
        <div className="flex justify-between text-[10px]">
          <span className={isMine ? 'text-white/60' : 'text-slate-400'}>
            {formatTime(currentTime)}
          </span>
          <span className={isMine ? 'text-white/60' : 'text-slate-400'}>
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Volume Control */}
      <div className="relative">
        <button
          onClick={() => setShowVolume(!showVolume)}
          className={`flex-shrink-0 p-1.5 rounded-full transition-all ${
            isMine
              ? 'hover:bg-white/20 text-white/70 hover:text-white'
              : 'hover:bg-slate-600/50 text-slate-400 hover:text-white'
          }`}
        >
          {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        
        {showVolume && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowVolume(false)}
            />
            <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 p-2 rounded-lg z-50 ${
              isMine ? 'bg-slate-800/90' : 'bg-slate-800/90'
            } backdrop-blur-sm shadow-xl`}>
              <div className="flex flex-col items-center gap-2 h-20">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-1.5 h-16 appearance-none bg-slate-600 rounded-full cursor-pointer"
                  style={{
                    writingMode: 'vertical-lr',
                    direction: 'rtl',
                  }}
                />
                <span className="text-[10px] text-slate-400">{Math.round(volume * 100)}%</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

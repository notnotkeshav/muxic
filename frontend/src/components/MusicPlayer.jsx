import React, { useEffect, useRef, useState, useCallback } from 'react'
import { 
  FiPlay, 
  FiPause, 
  FiSkipForward, 
  FiVolume2, 
  FiVolumeX, 
  FiVolume1 
} from 'react-icons/fi'
import { useWebSocket } from '../context/WebSocketContext'

const MusicPlayer = ({ currentTrack, isPlaying, onPlayStateChange }) => {
  const audioRef = useRef(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(50)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const lastSyncTime = useRef(0)
  
  const { 
    play: wsPlay, 
    pause: wsPause, 
    seek: wsSeek, 
    setVolume: wsSetVolume,
    nextTrack: wsNextTrack,
    roomState
  } = useWebSocket()

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadStart = () => setIsLoading(true)
    const handleCanPlay = () => setIsLoading(false)
    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
      setIsLoading(false)
    }
    
    const handleTimeUpdate = () => {
      if (!isSyncing) {
        setCurrentTime(audio.currentTime)
      }
    }
    
    const handleEnded = () => {
      onPlayStateChange?.(false)
      wsNextTrack()
    }
    
    const handleError = (e) => {
      console.error('Audio error:', e)
      setIsLoading(false)
      onPlayStateChange?.(false)
    }

    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
    }
  }, [currentTrack, isSyncing, onPlayStateChange, wsNextTrack])

  // Handle WebSocket sync events
  useEffect(() => {
    const handleSyncPlay = (event) => {
      const { position, timestamp } = event.detail
      const audio = audioRef.current
      if (!audio) return

      setIsSyncing(true)
      const now = Date.now()
      const networkDelay = Math.max(0, now - timestamp)
      const targetTime = position + (networkDelay / 1000)
      
      audio.currentTime = targetTime
      audio.play().then(() => {
        setCurrentTime(targetTime)
        onPlayStateChange?.(true)
        setTimeout(() => setIsSyncing(false), 100)
      }).catch(console.error)
    }

    const handleSyncPause = (event) => {
      const audio = audioRef.current
      if (!audio) return

      setIsSyncing(true)
      audio.pause()
      onPlayStateChange?.(false)
      setTimeout(() => setIsSyncing(false), 100)
    }

    const handleSyncSeek = (event) => {
      const { position, timestamp } = event.detail
      const audio = audioRef.current
      if (!audio) return

      setIsSyncing(true)
      const now = Date.now()
      const networkDelay = Math.max(0, now - timestamp)
      const targetTime = position + (networkDelay / 1000)
      
      audio.currentTime = targetTime
      setCurrentTime(targetTime)
      setTimeout(() => setIsSyncing(false), 100)
    }

    const handleSyncVolume = (event) => {
      const { volume: newVolume } = event.detail
      setVolume(newVolume)
      if (audioRef.current) {
        audioRef.current.volume = newVolume / 100
      }
    }

    const handleSyncTrackNext = (event) => {
      const { track } = event.detail
      // Track change will be handled by parent component updating currentTrack prop
      setCurrentTime(0)
      onPlayStateChange?.(true)
    }

    window.addEventListener('ws:sync:play', handleSyncPlay)
    window.addEventListener('ws:sync:pause', handleSyncPause)
    window.addEventListener('ws:sync:seek', handleSyncSeek)
    window.addEventListener('ws:sync:volume', handleSyncVolume)
    window.addEventListener('ws:sync:track_next', handleSyncTrackNext)

    return () => {
      window.removeEventListener('ws:sync:play', handleSyncPlay)
      window.removeEventListener('ws:sync:pause', handleSyncPause)
      window.removeEventListener('ws:sync:seek', handleSyncSeek)
      window.removeEventListener('ws:sync:volume', handleSyncVolume)
      window.removeEventListener('ws:sync:track_next', handleSyncTrackNext)
    }
  }, [onPlayStateChange])

  // Update audio source when track changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack?.url) return

    if (audio.src !== currentTrack.url) {
      audio.src = currentTrack.url
      audio.load()
      setCurrentTime(0)
    }
  }, [currentTrack])

  // Update volume
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    
    audio.volume = isMuted ? 0 : volume / 100
  }, [volume, isMuted])

  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return

    const now = Date.now()
    // Prevent rapid sync events
    if (now - lastSyncTime.current < 500) return
    lastSyncTime.current = now

    if (isPlaying) {
      wsPause()
    } else {
      wsPlay(audio.currentTime)
    }
  }, [isPlaying, currentTrack, wsPlay, wsPause])

  const handleSeek = useCallback((e) => {
    const audio = audioRef.current
    if (!audio || !duration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const newTime = (clickX / rect.width) * duration
    
    wsSeek(newTime)
  }, [duration, wsSeek])

  const handleVolumeChange = useCallback((e) => {
    const newVolume = parseInt(e.target.value)
    setVolume(newVolume)
    wsSetVolume(newVolume)
  }, [wsSetVolume])

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted)
  }, [isMuted])

  const formatTime = (time) => {
    if (!time || !isFinite(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return FiVolumeX
    if (volume < 50) return FiVolume1
    return FiVolume2
  }

  const VolumeIcon = getVolumeIcon()
  const progress = duration ? (currentTime / duration) * 100 : 0

  if (!currentTrack) {
    return (
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-6 border border-white/20 dark:border-gray-700/50">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <FiPlay className="mx-auto mb-2 text-2xl" />
          <p>No track selected</p>
          <p className="text-sm">Add a track to start playing</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-6 border border-white/20 dark:border-gray-700/50">
      <audio
        ref={audioRef}
        preload="metadata"
        crossOrigin="anonymous"
      />
      
      {/* Track Info */}
      <div className="flex items-center mb-4">
        {currentTrack.thumbnail && (
          <img
            src={currentTrack.thumbnail}
            alt={currentTrack.title}
            className="w-16 h-16 rounded-lg object-cover mr-4 border border-white/20 dark:border-gray-700/50"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {currentTrack.title || 'Unknown Title'}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 truncate">
            {currentTrack.artist || 'Unknown Artist'}
          </p>
          {currentTrack.album && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {currentTrack.album}
            </p>
          )}
        </div>
        {isLoading && (
          <div className="ml-2">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent"></div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div 
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer relative overflow-hidden"
          onClick={handleSeek}
        >
          <div 
            className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
          {isSyncing && (
            <div className="absolute inset-0 bg-emerald-300/50 animate-pulse rounded-full" />
          )}
        </div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Play/Pause Button */}
          <button
            onClick={handlePlayPause}
            disabled={!currentTrack || isLoading}
            className="w-12 h-12 rounded-full bg-emerald-500 dark:bg-emerald-600 hover:bg-emerald-600 dark:hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            ) : isPlaying ? (
              <FiPause className="text-xl" />
            ) : (
              <FiPlay className="text-xl ml-0.5" />
            )}
          </button>

          {/* Next Button */}
          <button
            onClick={wsNextTrack}
            disabled={!roomState?.queue?.length}
            className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-gray-700 dark:text-gray-300 transition-colors"
          >
            <FiSkipForward className="text-lg" />
          </button>
        </div>

        {/* Volume Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleMute}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
          >
            <VolumeIcon className="text-lg" />
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-20 h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <span className="text-sm text-gray-500 dark:text-gray-400 w-8 text-right">
            {Math.round(isMuted ? 0 : volume)}
          </span>
        </div>
      </div>

      {/* Sync Status Indicator */}
      {isSyncing && (
        <div className="mt-3 text-center">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200">
            <div className="animate-pulse w-2 h-2 bg-emerald-500 rounded-full mr-1"></div>
            Syncing...
          </span>
        </div>
      )}
    </div>
  )
}

export default MusicPlayer
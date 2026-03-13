import React, { useState } from 'react'
import { 
  FiMusic, 
  FiPlus, 
  FiSearch, 
  FiTrash2, 
  FiPlay,
  FiX,
  FiLoader,
  FiExternalLink
} from 'react-icons/fi'
import { useWebSocket } from '../context/WebSocketContext'
import { toast } from 'react-toastify'

const MusicQueue = () => {
  const { roomState, addToQueue, removeFromQueue, clearQueue, nextTrack } = useWebSocket()
  const [showAddTrack, setShowAddTrack] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [trackInput, setTrackInput] = useState({
    url: '',
    title: '',
    artist: '',
    album: '',
    duration: 0
  })

  const queue = roomState?.queue || []

  const handleAddTrack = async (e) => {
    e.preventDefault()
    if (!trackInput.url.trim() || !trackInput.title.trim()) {
      toast.error('URL and title are required')
      return
    }

    setIsLoading(true)
    try {
      const track = {
        url: trackInput.url.trim(),
        title: trackInput.title.trim(),
        artist: trackInput.artist.trim() || 'Unknown Artist',
        album: trackInput.album.trim() || '',
        duration: parseInt(trackInput.duration) || 0,
        source: detectSource(trackInput.url)
      }

      // Try to extract metadata from URL if possible
      if (isYouTubeUrl(track.url)) {
        track.thumbnail = getYouTubeThumbnail(track.url)
      }

      const success = addToQueue(track)
      if (success) {
        setTrackInput({
          url: '',
          title: '',
          artist: '',
          album: '',
          duration: 0
        })
        setShowAddTrack(false)
        toast.success('Track added to queue!')
      } else {
        toast.error('Failed to add track to queue')
      }
    } catch (error) {
      console.error('Error adding track:', error)
      toast.error('Failed to add track to queue')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveTrack = (trackId, trackTitle) => {
    const success = removeFromQueue(trackId)
    if (success) {
      toast.info(`Removed: ${trackTitle}`)
    }
  }

  const handleClearQueue = () => {
    if (queue.length === 0) return
    
    if (window.confirm('Are you sure you want to clear the entire queue?')) {
      const success = clearQueue()
      if (success) {
        toast.info('Queue cleared')
      }
    }
  }

  const detectSource = (url) => {
    if (isYouTubeUrl(url)) return 'youtube'
    if (url.includes('soundcloud.com')) return 'soundcloud'
    if (url.includes('spotify.com')) return 'spotify'
    return 'other'
  }

  const isYouTubeUrl = (url) => {
    return url.includes('youtube.com') || url.includes('youtu.be')
  }

  const getYouTubeThumbnail = (url) => {
    const videoId = extractYouTubeVideoId(url)
    return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null
  }

  const extractYouTubeVideoId = (url) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    const match = url.match(regex)
    return match ? match[1] : null
  }

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '?:??'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getSourceIcon = (source) => {
    switch (source) {
      case 'youtube':
        return '📺'
      case 'spotify':
        return '🎵'
      case 'soundcloud':
        return '☁️'
      default:
        return '🎶'
    }
  }

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 border border-white/20 dark:border-gray-700/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <FiMusic className="text-lg text-gray-600 dark:text-gray-400 mr-2" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Queue ({queue.length})
          </h3>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAddTrack(true)}
            className="p-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
            title="Add track"
          >
            <FiPlus className="text-sm" />
          </button>
          
          {queue.length > 0 && (
            <button
              onClick={handleClearQueue}
              className="p-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
              title="Clear queue"
            >
              <FiTrash2 className="text-sm" />
            </button>
          )}
        </div>
      </div>

      {/* Add Track Modal */}
      {showAddTrack && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                Add Track to Queue
              </h4>
              <button
                onClick={() => setShowAddTrack(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleAddTrack} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL *
                </label>
                <input
                  type="url"
                  value={trackInput.url}
                  onChange={(e) => setTrackInput({ ...trackInput, url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={trackInput.title}
                  onChange={(e) => setTrackInput({ ...trackInput, title: e.target.value })}
                  placeholder="Song title"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Artist
                  </label>
                  <input
                    type="text"
                    value={trackInput.artist}
                    onChange={(e) => setTrackInput({ ...trackInput, artist: e.target.value })}
                    placeholder="Artist name"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Duration (sec)
                  </label>
                  <input
                    type="number"
                    value={trackInput.duration}
                    onChange={(e) => setTrackInput({ ...trackInput, duration: e.target.value })}
                    placeholder="180"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Album
                </label>
                <input
                  type="text"
                  value={trackInput.album}
                  onChange={(e) => setTrackInput({ ...trackInput, album: e.target.value })}
                  placeholder="Album name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTrack(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center"
                >
                  {isLoading ? (
                    <FiLoader className="animate-spin" />
                  ) : (
                    <>
                      <FiPlus className="mr-1" />
                      Add Track
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Queue List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {queue.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <FiMusic className="mx-auto mb-2 text-2xl opacity-50" />
            <p className="text-sm">Queue is empty</p>
            <p className="text-xs">Add some tracks to get started!</p>
          </div>
        ) : (
          queue.map((track, index) => (
            <div
              key={track._id || index}
              className="flex items-center p-3 rounded-lg bg-gray-50/50 dark:bg-gray-700/30 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors group"
            >
              {/* Queue Position */}
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  {index + 1}
                </span>
              </div>

              {/* Track Thumbnail */}
              {track.thumbnail ? (
                <img
                  src={track.thumbnail}
                  alt={track.title}
                  className="w-12 h-12 rounded-lg object-cover mr-3 flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center mr-3 flex-shrink-0">
                  <FiMusic className="text-gray-400" />
                </div>
              )}

              {/* Track Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center">
                  <h4 className="font-medium text-gray-900 dark:text-white truncate">
                    {track.title}
                  </h4>
                  <span className="ml-2 text-xs">
                    {getSourceIcon(track.source)}
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <span className="truncate">{track.artist}</span>
                  {track.duration > 0 && (
                    <>
                      <span className="mx-2">•</span>
                      <span className="flex-shrink-0">{formatDuration(track.duration)}</span>
                    </>
                  )}
                </div>
                {track.album && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                    {track.album}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {track.url && (
                  <a
                    href={track.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400"
                    title="Open in new tab"
                  >
                    <FiExternalLink className="text-sm" />
                  </a>
                )}
                
                <button
                  onClick={() => handleRemoveTrack(track._id, track.title)}
                  className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400"
                  title="Remove from queue"
                >
                  <FiTrash2 className="text-sm" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Queue Info */}
      {queue.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700/50">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{queue.length} tracks in queue</span>
            <span>
              Total: {formatDuration(queue.reduce((acc, track) => acc + (track.duration || 0), 0))}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default MusicQueue
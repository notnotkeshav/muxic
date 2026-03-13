import React from 'react'
import { FiUser, FiSmartphone, FiMonitor, FiHeadphones, FiWifi, FiWifiOff } from 'react-icons/fi'
import { useWebSocket } from '../context/WebSocketContext'

const ParticipantList = () => {
  const { participants, connectionStatus, isConnected } = useWebSocket()

  const getDeviceIcon = (deviceType) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
      case 'phone':
        return FiSmartphone
      case 'desktop':
      case 'computer':
        return FiMonitor
      case 'tablet':
        return FiMonitor
      default:
        return FiHeadphones
    }
  }

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-emerald-500'
      case 'connecting':
        return 'text-yellow-500'
      case 'error':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected'
      case 'connecting':
        return 'Connecting...'
      case 'error':
        return 'Connection Error'
      default:
        return 'Disconnected'
    }
  }

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-4 border border-white/20 dark:border-gray-700/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <FiUser className="text-lg text-gray-600 dark:text-gray-400 mr-2" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Participants ({participants.length})
          </h3>
        </div>
        
        {/* Connection Status */}
        <div className="flex items-center text-sm">
          {isConnected ? (
            <FiWifi className={`mr-1 ${getConnectionStatusColor()}`} />
          ) : (
            <FiWifiOff className={`mr-1 ${getConnectionStatusColor()}`} />
          )}
          <span className={getConnectionStatusColor()}>
            {getConnectionStatusText()}
          </span>
        </div>
      </div>

      {/* Connection Status Info */}
      {!isConnected && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50">
          <div className="flex items-center">
            <FiWifiOff className="text-yellow-600 dark:text-yellow-400 mr-2" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Connection {connectionStatus === 'error' ? 'Error' : 'Lost'}
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                {connectionStatus === 'connecting' 
                  ? 'Attempting to reconnect...' 
                  : 'Real-time sync is unavailable'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Participants List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {participants.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <FiUser className="mx-auto mb-2 text-2xl opacity-50" />
            <p className="text-sm">No other participants</p>
            <p className="text-xs">Invite friends to join!</p>
          </div>
        ) : (
          participants.map((participant, index) => {
            const DeviceIcon = getDeviceIcon(participant.deviceType)
            const joinedTime = participant.joinedAt 
              ? new Date(participant.joinedAt).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })
              : 'Unknown'

            return (
              <div
                key={`${participant.userId}-${participant.deviceId}-${index}`}
                className="flex items-center p-3 rounded-lg bg-gray-50/50 dark:bg-gray-700/30 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mr-3 flex-shrink-0">
                  <FiUser className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>

                {/* Participant Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      User {participant.userId?.slice(-8) || 'Unknown'}
                    </p>
                    {/* Online Indicator */}
                    <div className="ml-2 w-2 h-2 bg-emerald-400 rounded-full flex-shrink-0"></div>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <DeviceIcon className="mr-1 flex-shrink-0" />
                    <span className="truncate">
                      {participant.deviceType || 'Unknown Device'}
                    </span>
                    <span className="mx-2">•</span>
                    <span className="flex-shrink-0">
                      {joinedTime}
                    </span>
                  </div>
                </div>

                {/* Sync Status */}
                <div className="ml-2 flex-shrink-0">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" title="In sync"></div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Room Info Footer */}
      {participants.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700/50">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            All participants are synced in real-time
          </p>
        </div>
      )}
    </div>
  )
}

export default ParticipantList
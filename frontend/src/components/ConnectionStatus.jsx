import React from 'react'
import { FiWifi, FiWifiOff, FiAlertCircle } from 'react-icons/fi'
import { useWebSocket } from '../context/WebSocketContext'

const ConnectionStatus = ({ className = '' }) => {
  const { isConnected, connectionStatus } = useWebSocket()

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: FiWifi,
          text: 'Connected',
          className: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-200',
          iconColor: 'text-emerald-500'
        }
      case 'connecting':
        return {
          icon: FiWifi,
          text: 'Connecting...',
          className: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/50 text-yellow-800 dark:text-yellow-200',
          iconColor: 'text-yellow-500'
        }
      case 'error':
        return {
          icon: FiAlertCircle,
          text: 'Connection Error',
          className: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-200',
          iconColor: 'text-red-500'
        }
      default:
        return {
          icon: FiWifiOff,
          text: 'Disconnected',
          className: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700/50 text-gray-800 dark:text-gray-200',
          iconColor: 'text-gray-500'
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full border text-sm font-medium ${config.className} ${className}`}>
      <Icon className={`mr-2 h-4 w-4 ${config.iconColor} ${connectionStatus === 'connecting' ? 'animate-pulse' : ''}`} />
      {config.text}
    </div>
  )
}

export default ConnectionStatus
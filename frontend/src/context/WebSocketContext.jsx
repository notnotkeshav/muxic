import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { toast } from 'react-toastify'

const WebSocketContext = createContext()

export const useWebSocket = () => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}

export const WebSocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false)
  const [roomState, setRoomState] = useState(null)
  const [participants, setParticipants] = useState([])
  const [connectionStatus, setConnectionStatus] = useState('disconnected') // disconnected, connecting, connected, error
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const heartbeatIntervalRef = useRef(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5
  const isConnectingRef = useRef(false)

  const getAuthToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('auth')
  }

  const connect = useCallback((roomId = null) => {
    const token = getAuthToken()
    if (!token) {
      toast.error('Authentication required to connect')
      return
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected')
      return
    }

    if (isConnectingRef.current) {
      console.log('Connection already in progress')
      return
    }

    isConnectingRef.current = true
    setConnectionStatus('connecting')
    
    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:3000'}/ws?token=${encodeURIComponent(token)}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket connected')
      isConnectingRef.current = false
      setIsConnected(true)
      setConnectionStatus('connected')
      reconnectAttempts.current = 0
      
      // Start heartbeat
      startHeartbeat()
      
      // Join room if specified and we have a stable connection
      if (roomId) {
        setTimeout(() => {
          sendMessage('room', 'join', { roomId })
        }, 100)
      }
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        handleMessage(message)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason)
      isConnectingRef.current = false
      setIsConnected(false)
      setConnectionStatus('disconnected')
      stopHeartbeat()
      
      // Only attempt to reconnect if not a clean closure and we're not manually disconnecting
      if (event.code !== 1000 && event.code !== 1001 && reconnectAttempts.current < maxReconnectAttempts) {
        console.log(`Connection lost (code: ${event.code}). Scheduling reconnect...`)
        scheduleReconnect()
      } else if (event.code === 1006) {
        console.error('WebSocket connection failed - server may not be running')
        if (reconnectAttempts.current === 0) { // Only show error once
          toast.error('Unable to connect to server. Please check if the server is running.')
        }
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      isConnectingRef.current = false
      setConnectionStatus('error')
      // Don't show toast for every error to avoid spam
      if (reconnectAttempts.current === 0) {
        toast.error('Connection error occurred')
      }
    }
  }, [])

  const disconnect = useCallback(() => {
    console.log('Manually disconnecting WebSocket')
    isConnectingRef.current = false
    reconnectAttempts.current = maxReconnectAttempts // Prevent reconnect attempts
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected')
      wsRef.current = null
    }
    stopHeartbeat()
    clearReconnectTimeout()
    setIsConnected(false)
    setConnectionStatus('disconnected')
    setRoomState(null)
    setParticipants([])
  }, [])

  const scheduleReconnect = () => {
    clearReconnectTimeout()
    reconnectAttempts.current++
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000) // Exponential backoff, max 30s
    
    console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`)
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connect(roomState?.roomId)
    }, delay)
  }

  const clearReconnectTimeout = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }

  const startHeartbeat = () => {
    stopHeartbeat()
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        sendMessage('presence', 'heartbeat')
      }
    }, 30000) // 30 seconds
  }

  const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
  }

  const sendMessage = useCallback((type, action, data = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = {
        type,
        action,
        data,
        timestamp: Date.now()
      }
      wsRef.current.send(JSON.stringify(message))
      return true
    } else {
      console.warn('WebSocket not connected, cannot send message:', { type, action, data })
      return false
    }
  }, [])

  const handleMessage = (message) => {
    console.log('WebSocket message received:', message)
    
    switch (message.type) {
      case 'room:state':
        setRoomState(message.data)
        break
        
      case 'room:participant_joined':
        setParticipants(prev => {
          const exists = prev.find(p => p.userId === message.data.userId)
          if (!exists) {
            return [...prev, {
              userId: message.data.userId,
              deviceId: message.data.deviceId,
              deviceType: message.data.deviceType,
              joinedAt: message.data.timestamp
            }]
          }
          return prev
        })
        toast.success(`User joined the room`)
        break
        
      case 'room:participant_left':
        setParticipants(prev => prev.filter(p => p.userId !== message.data.userId))
        toast.info(`User left the room`)
        break
        
      case 'presence:list':
        setParticipants(message.data.participants || [])
        break
        
      case 'sync:play':
        // Emit custom event for music player to handle
        window.dispatchEvent(new CustomEvent('ws:sync:play', { detail: message.data }))
        break
        
      case 'sync:pause':
        window.dispatchEvent(new CustomEvent('ws:sync:pause', { detail: message.data }))
        break
        
      case 'sync:seek':
        window.dispatchEvent(new CustomEvent('ws:sync:seek', { detail: message.data }))
        break
        
      case 'sync:volume':
        window.dispatchEvent(new CustomEvent('ws:sync:volume', { detail: message.data }))
        break
        
      case 'sync:track_next':
        setRoomState(prev => ({
          ...prev,
          currentTrack: message.data.track,
          queue: prev?.queue?.slice(1) || []
        }))
        window.dispatchEvent(new CustomEvent('ws:sync:track_next', { detail: message.data }))
        toast.success(`Playing: ${message.data.track?.title || 'Next track'}`)
        break
        
      case 'sync:queue_add':
        setRoomState(prev => ({
          ...prev,
          queue: [...(prev?.queue || []), message.data.track]
        }))
        toast.success(`Added to queue: ${message.data.track?.title || 'Track'}`)
        break
        
      case 'sync:queue_remove':
        setRoomState(prev => ({
          ...prev,
          queue: prev?.queue?.filter(track => track._id !== message.data.trackId) || []
        }))
        break
        
      case 'sync:queue_clear':
        setRoomState(prev => ({
          ...prev,
          queue: []
        }))
        toast.info('Queue cleared')
        break
        
      case 'error':
        console.error('WebSocket error:', message.message)
        toast.error(message.message || 'An error occurred')
        break
        
      default:
        console.log('Unhandled message type:', message.type)
    }
  }

  // Room actions
  const joinRoom = useCallback((roomId) => {
    return sendMessage('room', 'join', { roomId })
  }, [])

  const leaveRoom = useCallback(() => {
    return sendMessage('room', 'leave')
  }, [])

  // Sync actions
  const play = (position = 0) => {
    return sendMessage('sync', 'play', { position })
  }

  const pause = () => {
    return sendMessage('sync', 'pause')
  }

  const seek = (position) => {
    return sendMessage('sync', 'seek', { position })
  }

  const setVolume = (volume) => {
    return sendMessage('sync', 'volume', { volume })
  }

  const nextTrack = () => {
    return sendMessage('sync', 'track_next')
  }

  const addToQueue = (track) => {
    return sendMessage('sync', 'queue_add', { track })
  }

  const removeFromQueue = (trackId) => {
    return sendMessage('sync', 'queue_remove', { trackId })
  }

  const clearQueue = () => {
    return sendMessage('sync', 'queue_clear')
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [])

  const value = {
    // Connection state
    isConnected,
    connectionStatus,
    
    // Room state
    roomState,
    participants,
    
    // Connection methods
    connect,
    disconnect,
    
    // Room methods
    joinRoom,
    leaveRoom,
    
    // Sync methods
    play,
    pause,
    seek,
    setVolume,
    nextTrack,
    addToQueue,
    removeFromQueue,
    clearQueue,
    
    // Utility
    sendMessage
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}
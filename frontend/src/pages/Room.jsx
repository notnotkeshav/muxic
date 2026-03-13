import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import {
  FiSettings,
  FiShare2,
  FiCopy,
  FiMusic,
  FiWifiOff,
  FiMenu,
  FiX,
  FiUser,
  FiLogOut,
  FiPlus,
} from 'react-icons/fi';

import { useWebSocket } from '../context/WebSocketContext';
import MusicPlayer from '../components/MusicPlayer';
import ParticipantList from '../components/ParticipantList';
import MusicQueue from '../components/MusicQueue';
import ConnectionStatus from '../components/ConnectionStatus';
import LoadingSpinner from '../components/LoadingSpinner';

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' or 'participants'
  const [user, setUser] = useState(null);

  const {
    roomState,
    isConnected,
    connectionStatus,
    connect,
    disconnect,
    leaveRoom,
  } = useWebSocket();

  // Effect to load user from localStorage
  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem('user'));
    setUser(savedUser);
  }, []);

  // Effect to handle WebSocket connection and room joining
  useEffect(() => {
    if (!roomId) {
      toast.error('Invalid room ID');
      navigate('/lobby');
      return;
    }

    let isMounted = true;
    let hasInitialized = false;

    const connectAndJoin = async () => {
      if (!isMounted || hasInitialized || connectionStatus === 'connected' || connectionStatus === 'connecting') return;
      hasInitialized = true;
      try {
        await connect(roomId);
      } catch (error) {
        console.error('Failed to connect to room:', error);
        if (isMounted) {
          toast.error('Failed to connect to room');
          navigate('/lobby');
        }
      }
    };

    connectAndJoin();

    return () => {
      isMounted = false;
      if (!location.pathname.startsWith(`/room/${roomId}`)) {
        leaveRoom();
        disconnect();
      }
    };
  }, [roomId, connectionStatus, connect, disconnect, leaveRoom, navigate]);

  // Effect to sync playback state
  useEffect(() => {
    if (roomState?.playback?.isPlaying !== undefined) {
      setIsPlaying(roomState.playback.isPlaying);
    }
  }, [roomState?.playback?.isPlaying]);

  const handleLeaveRoom = () => {
    if (window.confirm('Are you sure you want to leave this room?')) {
      leaveRoom();
      disconnect();
      navigate('/lobby');
    }
  };

  const copyToClipboard = (text, successMessage) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(successMessage);
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  };

  const roomLink = `${window.location.origin}/room/${roomId}`;

  // Loading state
  if (!roomState && isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <LoadingSpinner size="lg" text="Entering room..." />
      </div>
    );
  }

  // Connection failed state
  if (!isConnected && connectionStatus !== 'connecting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <div className="text-center p-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-200/50 dark:border-gray-700/50 max-w-sm w-full">
          <FiWifiOff className="text-5xl text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Connection Failed</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Could not connect to the room. Please check your network and try again.</p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors"
            >
              Retry Connection
            </button>
            <button
              onClick={() => navigate('/lobby')}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex bg-gradient-to-br from-white to-gray-100 text-gray-900 dark:from-gray-900 dark:to-gray-800 dark:text-white">
      {/* --- LEFT SIDEBAR (GLOBAL) --- */}
      <aside className="hidden lg:flex w-64 flex-col p-4 border-r border-gray-200 dark:border-gray-700/50">
        <div className="flex items-center mb-8">
          <div className="p-2 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 mr-3">
            <FiMusic className="text-xl text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Muxic</h2>
        </div>
        <div className="flex items-center mb-8 p-3 rounded-xl bg-gray-200/30 dark:bg-gray-700/30">
          {user?.avatar ? (
            <img src={user.avatar} alt="User" className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500/30 dark:border-emerald-500/50" />
          ) : (
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-100/50 dark:bg-emerald-900/50 border-2 border-emerald-500/30 dark:border-emerald-500/50">
              <FiUser className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          )}
          <div className="ml-3 min-w-0">
            <h1 className="font-semibold truncate text-gray-800 dark:text-white">{user?.fullName || 'Guest'}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user?.email || '...'}</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/lobby')}
          className="mb-4 flex items-center justify-center py-3 px-4 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-semibold"
        >
          <FiPlus className="mr-2" />
          New Room
        </button>
        <div className="mt-auto space-y-2">
          <button
            onClick={() => navigate('/profile')}
            className="w-full flex items-center px-4 py-3 rounded-lg hover:bg-gray-200/50 text-gray-700 dark:hover:bg-gray-700/50 dark:text-gray-300 transition-colors"
          >
            <FiUser className="mr-3" />
            <span>Profile</span>
          </button>
          <button
            onClick={() => { /* Logout logic */ }}
            className="w-full flex items-center px-4 py-3 rounded-lg hover:bg-gray-200/50 text-gray-700 dark:hover:bg-gray-700/50 dark:text-gray-300 transition-colors"
          >
            <FiLogOut className="mr-3" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT (CENTER) --- */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{roomState?.name || 'Loading Room...'}</h2>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <ConnectionStatus />
              <button onClick={() => copyToClipboard(roomId, 'Room ID copied!')} className="flex items-center gap-1 hover:text-black dark:hover:text-white">
                <FiCopy />
                <span>{roomId?.slice(0, 8)}...</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowShareModal(true)}
              className="px-4 py-2 flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-semibold text-white transition-colors"
            >
              <FiShare2 />
              <span>Share</span>
            </button>
            <button className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700/50 rounded-lg text-gray-600 dark:text-gray-300">
              <FiSettings />
            </button>
            <button 
              onClick={handleLeaveRoom}
              className="p-2 hover:bg-red-500/10 dark:hover:bg-red-500/20 text-red-500 rounded-lg">
              <FiLogOut />
            </button>
            <button
              onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
              className="p-2 md:hidden hover:bg-gray-200 dark:hover:bg-gray-700/50 rounded-lg"
            >
              {rightSidebarOpen ? <FiX /> : <FiMenu />}
            </button>
          </div>
        </header>

        <div className="flex-grow flex items-center justify-center">
          <div className="w-full max-w-2xl">
            <MusicPlayer
              currentTrack={roomState?.currentTrack}
              isPlaying={isPlaying}
              onPlayStateChange={setIsPlaying}
            />
          </div>
        </div>
      </main>

      {/* --- RIGHT SIDEBAR (CONTEXTUAL) --- */}
      <aside className={`
        flex-shrink-0 flex flex-col bg-white/80 backdrop-blur-lg border-l border-gray-200/50 dark:bg-gray-800/50 dark:border-gray-700/50
        transition-all duration-300 ease-in-out
        ${rightSidebarOpen ? 'w-full md:w-80 lg:w-96' : 'w-0'}
        fixed md:static right-0 top-0 h-full md:h-auto z-40
      `}>
        <div className={`p-4 flex flex-col h-full overflow-hidden ${!rightSidebarOpen && 'hidden'}`}>
            <div className="flex items-center border-b border-gray-200 dark:border-gray-700/50 mb-4">
              <button
                onClick={() => setActiveTab('queue')}
                className={`py-3 px-4 text-sm font-semibold flex-1 ${activeTab === 'queue' ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}
              >
                Queue
              </button>
              <button
                onClick={() => setActiveTab('participants')}
                className={`py-3 px-4 text-sm font-semibold flex-1 ${activeTab === 'participants' ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}
              >
                Participants ({roomState?.participants?.length || 0})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {activeTab === 'queue' ? <MusicQueue /> : <ParticipantList />}
            </div>
        </div>
      </aside>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-200 dark:border-gray-700/50">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white">Share Room</h4>
              <button onClick={() => setShowShareModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <FiX className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Copy Room Link</label>
                <div className="flex">
                  <input type="text" value={roomLink} readOnly className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm" />
                  <button onClick={() => copyToClipboard(roomLink, 'Link copied!')} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-r-lg">
                    <FiCopy />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Or Copy Room ID</label>
                <div className="flex">
                  <input type="text" value={roomId} readOnly className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm" />
                  <button onClick={() => copyToClipboard(roomId, 'Room ID copied!')} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-r-lg">
                    <FiCopy />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Room;

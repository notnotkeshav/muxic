import { FiUser, FiLogOut, FiMusic, FiPlus, FiMenu, FiX } from 'react-icons/fi'
import { PiSealWarningFill } from "react-icons/pi"
import { useNavigate } from 'react-router'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../context/AuthContext'

const Lobby = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeForm, setActiveForm] = useState('join') // 'join' or 'create'
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    roomId: '',
    password: '',
    name: '',
    description: '',
    isPublic: true,
    maxParticipants: 10
  })

  const { isAuth, setIsAuth } = useContext(AuthContext)

  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem('user'))
    if (isAuth.authenticated && isAuth.user) {
      setUser(isAuth.user)
    } else {
      setUser(savedUser)
    }
  }, [isAuth])

  const handleLogout = async () => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/auth/logout`,
        {},
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )

      if (response.data.success) {
        localStorage.removeItem('auth')
        localStorage.removeItem('user')
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        setIsAuth({ authenticated: false, user: null })
        toast.success('Logged out successfully')
        navigate('/login')
      }
    } catch (error) {
      console.error('Logout error:', error)
      toast.error(error.response?.data?.error || 'Failed to logout. Please try again.')
      navigate('/login')
    }
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleJoinRoom = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const { roomId, password } = formData
      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/rooms/join`,
        { roomId, password },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.data.success) {
        toast.success('Successfully joined the room!')
        navigate(`/room/${roomId}`)
      }
    } catch (error) {
      console.error('Join room error:', error)
      toast.error(error.response?.data?.message || 'Failed to join room. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateRoom = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const { name, description, isPublic, maxParticipants } = formData
      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/rooms`,
        { 
          name, 
          description, 
          settings: { 
            isPublic, 
            maxParticipants 
          } 
        },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.data.success) {
        toast.success('Room created successfully!')
        navigate(`/room/${response.data.room.roomId}`)
      }
    } catch (error) {
      console.error('Create room error:', error)
      toast.error(error.response?.data?.message || 'Failed to create room. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-gradient-to-br from-white/50 to-emerald-50/30 dark:from-gray-900/50 dark:to-emerald-900/10">
      {/* Mobile Menu Button */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-white/20 dark:border-gray-700/50 shadow-lg"
      >
        {sidebarOpen ? (
          <FiX className="text-xl text-gray-800 dark:text-white" />
        ) : (
          <FiMenu className="text-xl text-gray-800 dark:text-white" />
        )}
      </button>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar (unchanged from your original) */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-80 lg:w-85 
        transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 transition-transform duration-300 ease-in-out
        min-h-screen p-4 lg:p-6 flex flex-col 
        backdrop-blur-lg bg-white/30 dark:bg-gray-800/50 
        border-r border-white/20 dark:border-gray-700/50
      `}>
        {/* App Logo */}
        <div className="flex items-center mb-6 lg:mb-8 mt-12 lg:mt-0">
          <div className="p-2 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 mr-3">
            <FiMusic className="text-xl text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Muxic</h2>
        </div>

        {/* User Profile */}
        <div className="flex items-center mb-6 lg:mb-8 p-3 lg:p-4 rounded-xl bg-white/40 dark:bg-gray-700/30">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={`${user.fullName}'s avatar`}
              className="w-10 h-10 lg:w-12 lg:h-12 rounded-full object-cover border-2 border-emerald-500/30 flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center bg-emerald-100/50 dark:bg-emerald-900/20 border-2 border-emerald-500/30 flex-shrink-0">
              <FiUser className="w-5 h-5 lg:w-6 lg:h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          )}
          <div className="ml-3 lg:ml-4 min-w-0 flex-1">
            <h1 className="text-base lg:text-lg font-semibold text-gray-800 dark:text-white truncate">
              {user?.fullName || 'Guest User'}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
              {user?.email || 'No email'}
            </p>
          </div>
        </div>

        {/* Create Room Button */}
        <button
          onClick={() => {
            setActiveForm('create')
            setSidebarOpen(false)
          }}
          className="mb-6 lg:mb-8 flex items-center justify-center py-3 px-4 rounded-lg bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors"
        >
          <FiPlus className="mr-2" />
          Create Room
        </button>

        {/* Bottom Actions */}
        <div className="mt-auto pt-4 space-y-3">
          <button
            onClick={() => {
              navigate('/profile')
              setSidebarOpen(false)
            }}
            className="w-full flex items-center px-3 lg:px-4 py-3 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 transition-colors"
          >
            <FiUser className="mr-3 flex-shrink-0" />
            <span>Profile Settings</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 lg:px-4 py-3 rounded-lg hover:bg-red-500/10 text-red-500 dark:text-red-400 transition-colors"
          >
            <FiLogOut className="mr-3 flex-shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex h-screen justify-center items-center p-4 sm:p-6 lg:p-8 overflow-y-auto lg:ml-0">
        {/* Email Verification Notice */}
        {user && !user.verified && (
          <div className="mb-4 p-4 w-full lg:w-1/2 rounded-lg backdrop-blur-md bg-yellow-500/10 dark:bg-yellow-600/10 border border-yellow-500/30 dark:border-yellow-600/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <PiSealWarningFill className={'text-2xl text-yellow-400'} />
              <p className="text-sm text-yellow-800 dark:text-yellow-200 flex-1">
                Please verify your email to unlock all features.
              </p>
              <button
                onClick={() => navigate(`/verify?userId=${user.id}`)}
                className="px-3 py-1.5 text-sm font-medium bg-yellow-500 text-white rounded hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 flex-shrink-0"
              >
                Verify
              </button>
            </div>
          </div>
        )}

        {/* Welcome Section */}
        <div className="mb-8 lg:mb-10 p-6 lg:p-8 rounded-xl backdrop-blur-lg bg-white/30 dark:bg-gray-800/30 border border-white/20 dark:border-gray-700/50">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 dark:text-white mb-4">
            Welcome back, {user?.fullName?.split(' ')[0] || 'Friend'}!
          </h1>
          <p className="text-base lg:text-lg text-gray-600 dark:text-gray-300 mb-6">
            Ready to sync some music with your friends? Join an existing room or create your own.
          </p>
          
          {/* Form Toggle Buttons */}
          <div className="flex mb-6 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveForm('join')}
              className={`px-4 py-2 font-medium text-sm focus:outline-none ${activeForm === 'join' 
                ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              Join Room
            </button>
            <button
              onClick={() => setActiveForm('create')}
              className={`px-4 py-2 font-medium text-sm focus:outline-none ${activeForm === 'create' 
                ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              Create Room
            </button>
          </div>

          {/* Join Room Form */}
          {activeForm === 'join' && (
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label htmlFor="roomId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Room ID
                </label>
                <input
                  type="text"
                  id="roomId"
                  name="roomId"
                  value={formData.roomId}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:focus:ring-emerald-500 dark:focus:border-emerald-500"
                  placeholder="Enter room ID"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password (if required)
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:focus:ring-emerald-500 dark:focus:border-emerald-500"
                  placeholder="Enter password"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-6 py-3 rounded-lg bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Joining...' : 'Join Room'}
              </button>
            </form>
          )}

          {/* Create Room Form */}
          {activeForm === 'create' && (
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Room Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  minLength={3}
                  maxLength={50}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:focus:ring-emerald-500 dark:focus:border-emerald-500"
                  placeholder="Enter room name"
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  maxLength={200}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:focus:ring-emerald-500 dark:focus:border-emerald-500"
                  placeholder="Enter room description"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  name="isPublic"
                  checked={formData.isPublic}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-emerald-600 dark:text-emerald-500 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Public Room (visible to everyone)
                </label>
              </div>
              <div>
                <label htmlFor="maxParticipants" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max Participants
                </label>
                <input
                  type="number"
                  id="maxParticipants"
                  name="maxParticipants"
                  value={formData.maxParticipants}
                  onChange={handleInputChange}
                  min={2}
                  max={50}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:focus:ring-emerald-500 dark:focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-6 py-3 rounded-lg bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating...' : 'Create Room'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}

export default Lobby
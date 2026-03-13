import React from 'react'
import { FiMusic } from 'react-icons/fi'

const LoadingSpinner = ({ 
  size = 'md', 
  text = 'Loading...', 
  className = '',
  showIcon = true 
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  }

  return (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      {showIcon && (
        <div className="relative">
          <div className={`animate-spin rounded-full border-4 border-emerald-200 dark:border-emerald-800 border-t-emerald-500 dark:border-t-emerald-400 ${sizeClasses[size]}`} />
          {size === 'lg' || size === 'xl' ? (
            <FiMusic className="absolute inset-0 m-auto text-emerald-500 dark:text-emerald-400 opacity-60" />
          ) : null}
        </div>
      )}
      
      {text && (
        <p className={`text-gray-600 dark:text-gray-400 font-medium ${textSizeClasses[size]}`}>
          {text}
        </p>
      )}
    </div>
  )
}

// Full screen loading overlay
export const LoadingOverlay = ({ text = 'Loading...' }) => {
  return (
    <div className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50">
      <LoadingSpinner size="lg" text={text} />
    </div>
  )
}

// Inline loading for components
export const InlineLoading = ({ text = 'Loading...', className = '' }) => {
  return (
    <div className={`flex items-center justify-center py-8 ${className}`}>
      <LoadingSpinner size="md" text={text} />
    </div>
  )
}

export default LoadingSpinner
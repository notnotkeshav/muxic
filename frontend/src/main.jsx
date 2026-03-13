import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter as Router } from "react-router"
import { ToastContainer } from 'react-toastify'
import AuthProvider from './context/AuthContext.jsx'
import { WebSocketProvider } from "./context/WebSocketContext"
import ErrorBoundary from "./components/ErrorBoundary"

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <WebSocketProvider>
        <ErrorBoundary>
          <Router>
            <App />
            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={true}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="dark"
              toastStyle={{
                background: '#1e293b',
                color: '#f8fafc',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              }}
              progressStyle={{
                background: '#3b82f6',
              }}
              limit={1}
            />
          </Router>
        </ErrorBoundary>
      </WebSocketProvider>
    </AuthProvider>
  </StrictMode >,
)

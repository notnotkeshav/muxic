import { useEffect, useState } from "react"
import RoutesWrapper from "./routes"

function App() {
  const getInitialTheme = () => {
    const savedTheme = localStorage.getItem('theme')
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    if (savedTheme) return savedTheme
    else if (systemPrefersDark) return systemPrefersDark
  }

  const [theme, setTheme] = useState(getInitialTheme)


  useEffect(() => {
    const html = document.documentElement
    html.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <button
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        className="absolute z-10 bottom-6 right-6 p-2 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transitions-colors "
      >
        {
          theme === 'light' ? (
            <span className="text-yellow-300 text-xl">⚫</span>
          ) : (
            <span className="text-gray-700 text-xl">⚪</span>
          )
        }
      </button>
      <div className="fixed inset-0 -z-10 h-full w-full bg-white dark:bg-[#222] bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#333_1px,transparent_1px),linear-gradient(to_bottom,#333_1px,transparent_1px)] bg-[size:6rem_4rem]">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_500px_at_50%_200px,#a5d8a7,transparent)] dark:bg-[radial-gradient(circle_500px_at_50%_200px,#2a5c2e,transparent)]"></div>
      </div>
      <RoutesWrapper />
    </div>
  )
}

export default App
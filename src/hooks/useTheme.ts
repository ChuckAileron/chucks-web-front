import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    let stored: string | null = null
    try {
      stored = localStorage.getItem('marea-theme')
    } catch {
      stored = null
    }
    if (stored === 'light' || stored === 'dark') {
      return stored
    }
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    return 'light'
  })

  const [manualTheme, setManualTheme] = useState<boolean>(() => {
    let stored: string | null = null
    try {
      stored = localStorage.getItem('marea-theme')
    } catch {
      stored = null
    }
    return stored === 'light' || stored === 'dark'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('marea-theme', theme)
    } catch {
      // ignore
    }
  }, [theme])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      if (!manualTheme) {
        setTheme(e.matches ? 'dark' : 'light')
      }
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [manualTheme])

  const toggleTheme = () => {
    setManualTheme(true)
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return { theme, toggleTheme }
}
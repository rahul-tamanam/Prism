import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'prism-theme'

function readStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null
  const v = localStorage.getItem(STORAGE_KEY)
  return v === 'dark' || v === 'light' ? v : null
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const stored = readStoredTheme()
  if (stored) return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

type ThemeContextValue = {
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [theme, toggleTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

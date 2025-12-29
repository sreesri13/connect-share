import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'theme-preference';

// Detect system preference
const getSystemPreference = (): ThemeMode => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
};

// Get initial theme from localStorage or system preference
const getInitialTheme = (): ThemeMode => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  }
  return getSystemPreference();
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [mode, setModeState] = useState<ThemeMode>(getInitialTheme);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem(STORAGE_KEY);
      // Only update if user hasn't set a preference
      if (!stored) {
        setModeState(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Sync with document class for Tailwind
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(mode);
  }, [mode]);

  const toggleTheme = () => {
    setModeState((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      localStorage.setItem(STORAGE_KEY, newMode);
      return newMode;
    });
  };

  const setMode = (newMode: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, newMode);
    setModeState(newMode);
  };

  // Create MUI theme based on mode
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === 'dark'
            ? {
                // Dark mode palette
                primary: {
                  main: 'hsl(175, 80%, 50%)',
                  contrastText: 'hsl(220, 20%, 4%)',
                },
                secondary: {
                  main: 'hsl(280, 70%, 60%)',
                  contrastText: 'hsl(210, 40%, 98%)',
                },
                background: {
                  default: 'hsl(220, 20%, 4%)',
                  paper: 'hsl(220, 18%, 8%)',
                },
                text: {
                  primary: 'hsl(210, 40%, 98%)',
                  secondary: 'hsl(215, 20%, 55%)',
                },
                divider: 'hsl(220, 14%, 18%)',
                error: {
                  main: 'hsl(0, 72%, 51%)',
                },
              }
            : {
                // Light mode palette
                primary: {
                  main: 'hsl(175, 80%, 40%)',
                  contrastText: 'hsl(0, 0%, 100%)',
                },
                secondary: {
                  main: 'hsl(280, 70%, 50%)',
                  contrastText: 'hsl(0, 0%, 100%)',
                },
                background: {
                  default: 'hsl(0, 0%, 100%)',
                  paper: 'hsl(210, 20%, 98%)',
                },
                text: {
                  primary: 'hsl(220, 20%, 10%)',
                  secondary: 'hsl(215, 15%, 45%)',
                },
                divider: 'hsl(220, 14%, 90%)',
                error: {
                  main: 'hsl(0, 72%, 51%)',
                },
              }),
        },
        typography: {
          fontFamily: '"Plus Jakarta Sans", sans-serif',
        },
        shape: {
          borderRadius: 12,
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                scrollbarWidth: 'thin',
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                fontWeight: 600,
              },
            },
          },
          MuiSwitch: {
            styleOverrides: {
              root: {
                width: 52,
                height: 32,
                padding: 0,
              },
              switchBase: {
                padding: 4,
                '&.Mui-checked': {
                  transform: 'translateX(20px)',
                },
              },
              thumb: {
                width: 24,
                height: 24,
              },
              track: {
                borderRadius: 16,
              },
            },
          },
        },
      }),
    [mode]
  );

  const value = useMemo(
    () => ({
      mode,
      toggleTheme,
      setMode,
    }),
    [mode]
  );

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

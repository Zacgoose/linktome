import { createTheme as createMuiTheme } from '@mui/material/styles';

interface ThemeConfig {
  direction?: 'ltr' | 'rtl';
  paletteMode?: 'light' | 'dark';
  colorPreset?: string;
  contrast?: string;
}

export const createTheme = (config: ThemeConfig) => {
  const isDark = config.paletteMode === 'dark';
  const theme = createMuiTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: {
        main: isDark ? '#90caf9' : '#667eea', // Vibrant blue for dark
      },
      secondary: {
        main: isDark ? '#ce93d8' : '#764ba2', // Vibrant purple for dark
      },
      background: {
        default: isDark ? '#181a20' : '#f7f7fa', // Deeper dark
        paper: isDark ? '#23272f' : '#fff',
      },
      text: {
        primary: isDark ? '#e3e3e3' : '#222',
        secondary: isDark ? '#b0b0b0' : '#666',
      },
      divider: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#23272f' : '#fff',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#23272f' : '#fff',
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
    },
  });
  return theme;
};
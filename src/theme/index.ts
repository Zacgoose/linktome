import { createTheme as createMuiTheme } from '@mui/material/styles';

interface ThemeConfig {
  direction?: 'ltr' | 'rtl';
  paletteMode?: 'light' | 'dark';
  colorPreset?: string;
  contrast?: string;
}

export const createTheme = (config: ThemeConfig) => {
  const theme = createMuiTheme({
    palette: {
      mode: config.paletteMode || 'light',
      primary: {
        main: '#667eea',
      },
      secondary: {
        main: '#764ba2',
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
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
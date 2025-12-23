import { CacheProvider, EmotionCache } from '@emotion/react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { AppProps } from 'next/app';
import Head from 'next/head';

import { createTheme } from '@/theme';
import { createEmotionCache } from '@/utils/create-emotion-cache';

import { AuthProvider } from '@/providers/AuthProvider';
import { RbacProvider } from '@/context/RbacContext';
import '@/styles/globals.css';

import { createContext, useEffect, useState, useMemo } from 'react';

// UI Theme Context for admin UI
export const UiThemeContext = createContext({
  uiTheme: 'light',
  setUiTheme: (_: 'light' | 'dark') => {},
});


const clientSideEmotionCache = createEmotionCache();
const queryClient = new QueryClient();

interface MyAppProps extends AppProps {
  emotionCache?: EmotionCache;
}

export default function App(props: MyAppProps) {
  const { Component, emotionCache = clientSideEmotionCache, pageProps } = props;

  // UI theme state (sync with localStorage)
  const [uiTheme, setUiTheme] = useState<'light' | 'dark'>(
    typeof window !== 'undefined' && localStorage.getItem('uiTheme') === 'dark' ? 'dark' : 'light'
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('uiTheme', uiTheme);
    }
  }, [uiTheme]);

  // Memoize theme to avoid recreation on every render
  const theme = useMemo(() => createTheme({
    direction: 'ltr',
    paletteMode: uiTheme,
    colorPreset: 'purple',
    contrast: 'normal',
  }), [uiTheme]);

  return (
    <CacheProvider value={emotionCache}>
      <Head>
        <title>LinkToMe</title>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
      </Head>
      <QueryClientProvider client={queryClient}>
        <UiThemeContext.Provider value={{ uiTheme, setUiTheme }}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <AuthProvider>
              <RbacProvider>
                <Component {...pageProps} />
              </RbacProvider>
            </AuthProvider>
          </ThemeProvider>
        </UiThemeContext.Provider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </CacheProvider>
  );
}
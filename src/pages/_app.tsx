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
import { useRouter } from 'next/router';

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

function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // UI theme state (sync with localStorage)
  const [uiTheme, setUiTheme] = useState<'light' | 'dark'>(
    typeof window !== 'undefined' && localStorage.getItem('uiTheme') === 'dark' ? 'dark' : 'light'
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('uiTheme', uiTheme);
    }
  }, [uiTheme]);

  // Determine if current route is admin (user pages)
  const isAdminRoute = router.pathname.startsWith('/admin');

  // Only apply user-selected theme to admin pages, otherwise always use light
  const theme = useMemo(() => createTheme({
    direction: 'ltr',
    paletteMode: isAdminRoute ? uiTheme : 'light',
    colorPreset: 'purple',
    contrast: 'normal',
  }), [uiTheme, isAdminRoute]);

  return (
    <UiThemeContext.Provider value={{ uiTheme, setUiTheme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </UiThemeContext.Provider>
  );
}

export default function App(props: MyAppProps) {
  const { Component, emotionCache = clientSideEmotionCache, pageProps } = props;

  return (
    <CacheProvider value={emotionCache}>
      <Head>
        <title>LinkToMe</title>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
      </Head>
      <QueryClientProvider client={queryClient}>
        <ThemeWrapper>
          <AuthProvider>
            <RbacProvider>
              <Component {...pageProps} />
            </RbacProvider>
          </AuthProvider>
        </ThemeWrapper>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </CacheProvider>
  );
}
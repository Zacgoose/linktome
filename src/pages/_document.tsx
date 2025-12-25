import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
        />
        {/* Prevent white flash on page load - override all default backgrounds */}
        <style dangerouslySetInnerHTML={{
          __html: `
            html, body, #__next {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
              background-attachment: fixed !important;
              margin: 0;
              padding: 0;
            }
            /* Override globals.css background variables */
            :root {
              --background: transparent !important;
            }
          `
        }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
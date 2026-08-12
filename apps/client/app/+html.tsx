import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Custom HTML shell for the static web export (expo-router +html).
 *
 * Carries everything the PWA needs: manifest, icons, iOS standalone tags,
 * theme-color for both color schemes, safe-area-aware viewport, mobile
 * polish CSS (no tap highlight, no overscroll bounce, no iOS text inflation),
 * and service-worker registration.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <title>CMUnify</title>
        <meta
          name="description"
          content="Every CMU event from Slack, Discord, and campus feeds in one calendar."
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#FAFAF9" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0C0E12" />
        <meta name="application-name" content="CMUnify" />

        {/* iOS installed-app behavior */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="CMUnify" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        <ScrollViewStyleReset />

        {/* Mobile polish: paint the root in the right scheme, kill tap
            flashes and rubber-band overscroll, respect notches */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body { height: 100%; }
              body {
                overflow: hidden;
                background-color: #FAFAF9;
                overscroll-behavior: none;
                -webkit-tap-highlight-color: transparent;
                -webkit-text-size-adjust: 100%;
                text-size-adjust: 100%;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
                touch-action: manipulation;
                padding: env(safe-area-inset-top) 0 0 0;
              }
              @media (prefers-color-scheme: dark) {
                body { background-color: #0C0E12; }
              }
            `,
          }}
        />

        {/* Service worker: offline shell + cached assets */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                  navigator.serviceWorker.register('/sw.js').catch(function () {});
                });
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

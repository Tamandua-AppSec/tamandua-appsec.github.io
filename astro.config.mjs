// @ts-check
import { defineConfig, fontProviders } from 'astro/config'
import { loadEnv } from 'vite'

const env = loadEnv('production', '.', '')

// Where it's published: the deploy workflow sets both for GitHub Pages; locally it's served at the root.
export default defineConfig({
  site: env.SITE_URL ?? 'https://tamandua.dev',
  base: env.BASE_PATH ?? '/',
  output: 'static',
  trailingSlash: 'ignore',
  i18n: { locales: ['en', 'es'], defaultLocale: 'en', routing: { prefixDefaultLocale: false } },
  // Self-hosted, subset and preloaded at build time: no request to Google from the visitor's browser.
  fonts: [
    { provider: fontProviders.google(), name: 'Instrument Serif', cssVariable: '--font-display', weights: [400], styles: ['normal', 'italic'],
      subsets: ['latin', 'latin-ext'], fallbacks: ['Georgia', 'serif'] },
    { provider: fontProviders.google(), name: 'Instrument Sans', cssVariable: '--font-body', weights: ['400 700'], styles: ['normal'],
      subsets: ['latin', 'latin-ext'], fallbacks: ['system-ui', 'sans-serif'] },
    { provider: fontProviders.google(), name: 'Caveat', cssVariable: '--font-hand', weights: ['400 700'], styles: ['normal'],
      subsets: ['latin', 'latin-ext'], fallbacks: ['cursive'] },
    { provider: fontProviders.google(), name: 'JetBrains Mono', cssVariable: '--font-mono', weights: [400, 600], styles: ['normal'],
      subsets: ['latin'], fallbacks: ['ui-monospace', 'monospace'] },
  ],
})

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  experimental: {
    buildCache: true,
  },
  vite: {
    build: {
      // emit the SVG as a file instead of inlining it as a data URL
      assetsInlineLimit: 0,
    },
  },
})

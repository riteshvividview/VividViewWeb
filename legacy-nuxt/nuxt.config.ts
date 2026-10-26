// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@tresjs/nuxt'],

  css: [
    '@fontsource-variable/inter/opsz.css',
    '@fontsource/newsreader/400.css',
    '@fontsource/newsreader/400-italic.css',
    '~/assets/css/main.css'
  ],

  app: {
    head: {
      title: 'Vivid View',
      htmlAttrs: { lang: 'en' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ]
    }
  }
})

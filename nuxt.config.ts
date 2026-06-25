export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },
  srcDir: 'app',
  css: ['~/assets/main.css'],
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  },
  nitro: { preset: process.env.NITRO_PRESET || undefined },

})

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },
  css: ['~/assets/main.css'],
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || 'file:./prisma/dev.db',
  },
  nitro: { preset: process.env.NITRO_PRESET || undefined },
})

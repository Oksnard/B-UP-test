export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },
  // Nuxt 4 layout: app/ holds client code (pages/components/composables/app.vue),
  // server/ stays at the project root. Avoids a fragile app/server symlink.
  future: { compatibilityVersion: 4 },
  css: ['~/assets/main.css'],
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  },
  nitro: { preset: process.env.NITRO_PRESET || undefined },

})

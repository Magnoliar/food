// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: process.env.NUXT_DEVTOOLS === 'true' },
  devServer: { port: 4789 },

  future: {
    compatibilityVersion: 4,
  },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/google-fonts',
  ],

  googleFonts: {
    families: {
      'Playfair Display': [400, 500, 600, 700],
      'Noto Serif SC': [400, 500, 600, 700],
      'Noto Sans SC': [400, 500, 600],
      'Caveat': [400, 500, 600, 700],
      'JetBrains Mono': [400],
    },
    display: 'swap',
  },

  css: [
    '~/styles/main.css',
    '~/styles/textures.css',
  ],

  app: {
    head: {
      title: '猪猪家的厨房',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#C06030' },
      ],
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'icon', href: '/pwa-icon.svg', type: 'image/svg+xml' },
      ],
    },
    pageTransition: false,
  },

  tailwindcss: {
    cssPath: false,
  },

  components: [
    {
      path: '~/components',
      pathPrefix: false,
    },
  ],

  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    aiBaseUrl1: process.env.AI_BASE_URL_1 || '',
    aiApiKey1: process.env.AI_API_KEY_1 || '',
    aiModel1: process.env.AI_MODEL_1 || 'gpt-4o',
    aiModelLight1: process.env.AI_MODEL_LIGHT_1 || 'gpt-4o-mini',
    aiBaseUrl2: process.env.AI_BASE_URL_2 || '',
    aiApiKey2: process.env.AI_API_KEY_2 || '',
    aiModel2: process.env.AI_MODEL_2 || '',
    aiModelLight2: process.env.AI_MODEL_LIGHT_2 || '',
    aiBaseUrl3: process.env.AI_BASE_URL_3 || '',
    aiApiKey3: process.env.AI_API_KEY_3 || '',
    aiModel3: process.env.AI_MODEL_3 || '',
    aiModelLight3: process.env.AI_MODEL_LIGHT_3 || '',
    xyqAccessKey: process.env.XYQ_ACCESS_KEY || '',
    xyqBaseUrl: process.env.XYQ_BASE_URL || 'https://xyq.jianying.com',
    adminUser: process.env.ADMIN_USER || 'zhuzhu',
    adminPassword: process.env.ADMIN_PASSWORD || 'zhuzhu',
    partnerUser: process.env.PARTNER_USER || 'zhubao',
    partnerPassword: process.env.PARTNER_PASSWORD || 'zhubao',
    authSecret: process.env.AUTH_SECRET || '',
    public: {
      dev: process.env.NODE_ENV !== 'production',
    },
  },
})

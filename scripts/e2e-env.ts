export const E2E_ENV = Object.freeze({
  ADMIN_USER: 'e2e-admin',
  ADMIN_PASSWORD: 'e2e-admin-password',
  PARTNER_USER: 'e2e-member',
  PARTNER_PASSWORD: 'e2e-member-password',
  AUTH_SECRET: 'e2e-local-auth-secret-at-least-32-chars',
  APP_SETTINGS_PATH: 'test-results/e2e-settings.json',
  AI_BASE_URL_1: '',
  AI_API_KEY_1: '',
  AI_BASE_URL_2: '',
  AI_API_KEY_2: '',
  AI_BASE_URL_3: '',
  AI_API_KEY_3: '',
  XYQ_ACCESS_KEY: '',
  XYQ_BASE_URL: '',
})

export const E2E_ADMIN = { username: E2E_ENV.ADMIN_USER, password: E2E_ENV.ADMIN_PASSWORD }
export const E2E_MEMBER = { username: E2E_ENV.PARTNER_USER, password: E2E_ENV.PARTNER_PASSWORD }

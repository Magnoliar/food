export default defineEventHandler((event) => {
  return verifyAuthToken(getCookie(event, 'auth_token'))
})

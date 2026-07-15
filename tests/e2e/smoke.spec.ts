import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { E2E_ADMIN as admin, E2E_MEMBER as member } from '../../scripts/e2e-env'

type E2EEntity = { id: string; name?: string | null }

const cleanupE2EArtifacts = async (request: APIRequestContext) => {
  await request.post('/api/auth/login', { data: admin })

  const recipesResponse = await request.get('/api/recipes')
  if (recipesResponse.ok()) {
    const recipes = await recipesResponse.json() as E2EEntity[]
    for (const recipe of recipes.filter(item => String(item.name || '').toLowerCase().includes('e2e'))) {
      await request.delete(`/api/recipes/${recipe.id}`)
    }
  }

  const ingredientsResponse = await request.get('/api/ingredients')
  if (ingredientsResponse.ok()) {
    const ingredients = await ingredientsResponse.json() as E2EEntity[]
    for (const ingredient of ingredients.filter(item => String(item.name || '').toLowerCase().includes('e2e'))) {
      await request.delete(`/api/ingredients/${ingredient.id}`)
    }
  }

  const tagsResponse = await request.get('/api/tags')
  if (tagsResponse.ok()) {
    const groupedTags = await tagsResponse.json()
    const tags = Object.values(groupedTags).flat() as Array<{ id: string; name: string }>
    for (const tag of tags.filter(item => String(item.name || '').toLowerCase().includes('e2e'))) {
      await request.delete(`/api/tags/${tag.id}`)
    }
  }
}

const loginViaUi = async (page: Page, user: { username: string; password: string } = admin) => {
  await page.goto('/login')
  await page.getByTestId('login-username').fill(user.username)
  await page.getByTestId('login-password').fill(user.password)
  await page.getByTestId('login-submit').click()
  await expect(page).toHaveURL('/')
}

test('health endpoint responds', async ({ request }) => {
  const response = await request.get('/api/health')
  expect(response.ok()).toBeTruthy()
})

test('login page renders', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: '登录' })).toBeVisible()
  await expect(page.getByText('猪猪家的厨房')).toBeVisible()
  await expect(page.getByText('默认账号')).toHaveCount(0)
})

test('unauthenticated app routes and APIs are protected', async ({ page, request }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login\?redirect=/)
  await expect(page.getByRole('navigation', { name: '主导航' })).toHaveCount(0)

  expect((await request.get('/api/recipes')).status()).toBe(401)
  expect((await request.get('/api/ingredients')).status()).toBe(401)
  expect((await request.get('/api/week-plans/current')).status()).toBe(401)
})

test('auth and main API flow works', async ({ request }) => {
  const anonymousWrite = await request.post('/api/cook-logs', {
    data: { recipeId: 'r1', selfScore: 8 },
  })
  expect(anonymousWrite.status()).toBe(401)

  const memberLogin = await request.post('/api/auth/login', { data: member })
  expect(memberLogin.ok()).toBeTruthy()
  const memberUser = await memberLogin.json()
  expect(memberUser).toMatchObject({ id: 'user-partner', name: '猪宝', role: 'member' })

  const memberAdmin = await request.get('/api/admin/config')
  expect(memberAdmin.status()).toBe(403)

  await request.post('/api/auth/logout')

  const adminLogin = await request.post('/api/auth/login', { data: admin })
  expect(adminLogin.ok()).toBeTruthy()
  const adminUser = await adminLogin.json()
  expect(adminUser).toMatchObject({ id: 'user-momo', name: '猪猪', role: 'admin' })

  const me = await request.get('/api/auth/me')
  expect(await me.json()).toMatchObject({ id: 'user-momo', name: '猪猪', role: 'admin' })

  const recipesResponse = await request.get('/api/recipes')
  expect(recipesResponse.ok()).toBeTruthy()
  const recipes = await recipesResponse.json()
  expect(Array.isArray(recipes)).toBeTruthy()
  expect(recipes.length).toBeGreaterThan(0)
  expect(recipes[0]).toEqual(expect.objectContaining({
    id: expect.any(String),
    name: expect.any(String),
    steps: expect.any(Array),
    tags: expect.any(Array),
    ingredients: expect.any(Array),
  }))

  const recommendationsResponse = await request.post('/api/recommendations', {
    data: { count: 3, profile: 'balanced' },
  })
  expect(recommendationsResponse.ok()).toBeTruthy()
  const recommendations = await recommendationsResponse.json()
  expect(Array.isArray(recommendations)).toBeTruthy()
  expect(recommendations.length).toBeGreaterThan(0)
  expect(recommendations[0].reason).toBeTruthy()

  const weekPlanResponse = await request.get('/api/week-plans/current')
  expect(weekPlanResponse.ok()).toBeTruthy()
  const weekPlan = await weekPlanResponse.json()
  expect(weekPlan.id).toBeTruthy()
  expect(weekPlan.meals.length).toBeGreaterThan(0)

  const shoppingResponse = await request.post('/api/shopping-lists/from-week-plan', {
    data: { weekPlanId: weekPlan.id },
  })
  expect(shoppingResponse.ok()).toBeTruthy()
  const shoppingList = await shoppingResponse.json()
  expect(shoppingList.id).toBeTruthy()

  const cookLogResponse = await request.post('/api/cook-logs', {
    data: {
      recipeId: recipes[0].id,
      selfScore: 8,
      partnerScore: 9,
      notes: 'e2e smoke cook log',
    },
  })
  expect(cookLogResponse.ok()).toBeTruthy()
  const cookLog = await cookLogResponse.json()
  expect(cookLog.recipeId).toBe(recipes[0].id)
  expect(cookLog.photos).toEqual([])
})

test('login UI authenticates, remembers session, and shows app shell', async ({ page }) => {
  await loginViaUi(page)
  await expect(page.getByRole('navigation', { name: '主导航' })).toBeVisible()
  await expect(page.getByText('猪猪家的厨房')).toBeVisible()
  await expect(page.getByText('默认账号')).toHaveCount(0)
  await expect(page.getByText('Demo:')).toHaveCount(0)

  await page.reload()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('navigation', { name: '主导航' })).toBeVisible()
  await expect(page.getByTestId('home-next-step')).toBeVisible()
})

test('member UI cannot access admin page', async ({ page }) => {
  await loginViaUi(page, member)
  await page.goto('/admin')
  await expect(page.getByTestId('admin-forbidden')).toBeVisible()
})

test('planner UI saves, generates shopping list, and toggles an item', async ({ page }) => {
  await loginViaUi(page)
  await cleanupE2EArtifacts(page.request)
  const recipesResponse = await page.request.get('/api/recipes')
  const recipes = await recipesResponse.json()
  const firstRecipe = recipes[0]
  expect(firstRecipe?.name).toBeTruthy()

  await page.goto('/planner')
  await expect(page.getByTestId('planner-save')).toBeEnabled()
  await expect(page.getByTestId('planner-ai-fill')).toHaveText('补空位')
  const firstMealInput = page.locator('[data-testid^="week-meal1-"]').first()
  await firstMealInput.focus()
  await firstMealInput.pressSequentially(firstRecipe.name, { delay: 20 })

  await page.getByTestId('planner-save').click()
  await expect(page.getByTestId('planner-save')).toBeEnabled()
  await expect(page.getByTestId('planner-message')).toBeVisible()

  // savePlan 现在自动同步购物清单，无需单独点击
  await expect(page.getByTestId('shopping-list')).toBeVisible()
  const shoppingItems = page.locator('[data-testid^="shopping-toggle-"]')
  await expect(shoppingItems.first()).toBeVisible()
  expect(await shoppingItems.count()).toBeGreaterThan(0)

  const firstToggle = page.locator('[data-shopping-pending="true"]').first()
  await expect(firstToggle).toBeVisible()
  const firstToggleTestId = await firstToggle.getAttribute('data-testid')
  expect(firstToggleTestId).toBeTruthy()
  await firstToggle.click()
  await expect(page.getByTestId(firstToggleTestId!)).toHaveAttribute('data-shopping-checked', 'true')

  await page.reload()
  await expect(page.getByTestId('shopping-list')).toBeVisible()
  await expect(page.getByTestId(firstToggleTestId!)).toHaveAttribute('data-shopping-checked', 'true')
})

test('cook mode UI completes and creates a cook log', async ({ page, request }) => {
  const login = await request.post('/api/auth/login', { data: admin })
  expect(login.ok()).toBeTruthy()

  const recipesResponse = await request.get('/api/recipes')
  const recipes = await recipesResponse.json()
  const recipe = recipes[0]
  expect(recipe?.id).toBeTruthy()

  const beforeResponse = await request.get('/api/cook-logs')
  const beforeLogs = await beforeResponse.json()

  await loginViaUi(page)
  await page.goto(`/cook/${recipe.id}`)
  await expect(page.getByTestId('cook-finish')).toBeVisible()
  await page.getByTestId('cook-finish').click()
  await expect(page).toHaveURL(/\/cook-logs\?editLog=/)
  await expect(page.getByText('补完整这顿')).toBeVisible()

  const afterResponse = await request.get('/api/cook-logs')
  const afterLogs = await afterResponse.json()
  expect(afterLogs.length).toBeGreaterThan(beforeLogs.length)
})

test('cook log UI uploads a photo and keeps it after reload', async ({ page }) => {
  await loginViaUi(page)
  await page.goto('/cook-logs')

  const note = `e2e photo cook log ${Date.now()}`
  await page.getByTestId('cooklog-open-create').click()

  const recipeSelect = page.getByTestId('cooklog-recipe-select')
  const firstRecipeId = await recipeSelect.locator('option').nth(1).getAttribute('value')
  expect(firstRecipeId).toBeTruthy()
  await recipeSelect.selectOption(firstRecipeId!)
  await page.getByTestId('cooklog-notes').fill(note)

  const png1x1 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
    'base64',
  )
  await page.getByTestId('cooklog-photo-input').setInputFiles({
    name: 'cook-log-e2e.png',
    mimeType: 'image/png',
    buffer: png1x1,
  })

  await expect(page.getByTestId('cooklog-photo-preview')).toHaveCount(1)
  await page.getByTestId('cooklog-save').click()

  const createdCard = page.getByTestId('cooklog-card').filter({ hasText: note }).first()
  await expect(createdCard).toBeVisible()
  await expect(createdCard.getByTestId('cooklog-photo')).toHaveCount(1)

  await page.reload()
  const persistedCard = page.getByTestId('cooklog-card').filter({ hasText: note }).first()
  await expect(persistedCard).toBeVisible()
  await expect(persistedCard.getByTestId('cooklog-photo')).toHaveCount(1)
})

test('mobile viewport keeps primary navigation and cook mode usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await loginViaUi(page)

  const bottomNav = page.getByRole('navigation', { name: '底部导航' })
  await expect(bottomNav).toBeVisible()
  await expect(bottomNav.locator('a')).toHaveCount(5)
  await expect(bottomNav.getByText('首页')).toBeVisible()
  await expect(bottomNav.getByText('计划')).toBeVisible()
  await expect(bottomNav.getByText('菜谱')).toBeVisible()
  await expect(bottomNav.getByText('食材')).toBeVisible()
  await expect(bottomNav.getByText('打卡')).toBeVisible()
  await expect(bottomNav.getByText('购物')).toHaveCount(0)
  await expect(bottomNav.getByText('记录')).toHaveCount(0)
  await expect(bottomNav.getByText('图谱')).toHaveCount(0)
  await expect(bottomNav.getByText('成就')).toHaveCount(0)
  await expect(bottomNav.getByText('管理')).toHaveCount(0)

  await page.goto('/planner')
  await expect(page.getByTestId('shopping-list')).toBeVisible()
  const plannerOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)
  expect(plannerOverflow).toBe(false)

  await page.goto('/ingredients')
  await expect(page.getByTestId('mobile-storage-summary')).toBeVisible()
  await expect(page.getByText('家里现有')).toBeVisible()

  const recipesResponse = await page.request.get('/api/recipes')
  const recipes = await recipesResponse.json()
  const recipe = recipes[0]
  await page.goto(`/cook/${recipe.id}`)
  await expect(page.getByTestId('cook-finish')).toBeVisible()
  await expect(page.getByRole('heading', { name: '步骤', exact: true })).toBeVisible()
})

test('poster page uses real data and daily check-in templates', async ({ page }) => {
  await loginViaUi(page)
  await page.goto('/posters')

  await expect(page.getByTestId('poster-page')).toBeVisible()
  await expect(page.getByRole('heading', { name: '打卡生成' })).toBeVisible()
  await expect(page.getByRole('button', { name: '今日打卡 成品实拍 + 食材小圆卡' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '食材准备 食材速览 + 做法步骤' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '饭后复盘 饭后照片和一点复盘' })).toHaveCount(0)
  await expect(page.getByTestId('poster-template-dots')).toBeVisible()
  await page.getByRole('button', { name: '切换到饭后复盘' }).click()
  await expect(page.getByText('After Dinner')).toBeVisible()
  await expect(page.getByTestId('poster-prev-template')).toBeVisible()
  await expect(page.getByTestId('poster-next-template')).toBeVisible()
  await page.getByTestId('poster-next-template').click()
  await expect(page.getByText('Today')).toBeVisible()
  await expect(page.getByTestId('poster-edit-actions')).toBeVisible()
  await expect(page.getByTestId('poster-edit-recipe')).toBeVisible()
  await expect(page.getByTestId('poster-export')).toBeVisible()
  await expect(page.getByText('Demo:')).toHaveCount(0)
  await expect(page.getByText('默认账号')).toHaveCount(0)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/posters')
  await expect(page.getByText('今日打卡 · 左右滑动切换')).toBeVisible()
  await page.locator('.poster-preview-shell').dragTo(page.locator('.poster-preview-shell'), {
    sourcePosition: { x: 320, y: 300 },
    targetPosition: { x: 80, y: 300 },
  })
  await expect(page.getByText('Ingredients')).toBeVisible()

  await page.getByTestId('poster-edit-recipe').click()
  await expect(page).toHaveURL(/\/recipes\/[^/?]+$/)
})

test('pwa manifest and offline shell are available', async ({ request }) => {
  const manifest = await request.get('/manifest.webmanifest')
  expect(manifest.ok()).toBeTruthy()
  const manifestJson = await manifest.json()
  expect(manifestJson).toMatchObject({
    name: '猪猪家的厨房',
    display: 'standalone',
    start_url: '/',
  })
  expect(manifestJson.icons?.length).toBeGreaterThan(0)

  const offline = await request.get('/offline.html')
  expect(offline.ok()).toBeTruthy()
  const offlineHtml = await offline.text()
  expect(offlineHtml).toContain('暂时离线')

  const serviceWorker = await request.get('/sw.js')
  expect(serviceWorker.ok()).toBeTruthy()
  expect(await serviceWorker.text()).toContain('CACHE_NAME')
})

test('recipe detail UI edits name and persists cover upload', async ({ page, request }) => {
  const login = await request.post('/api/auth/login', { data: admin })
  expect(login.ok()).toBeTruthy()
  await cleanupE2EArtifacts(request)

  const createResponse = await request.post('/api/recipes', {
    data: {
      name: `e2e recipe ${Date.now()}`,
      description: 'temporary e2e recipe',
      steps: ['测试步骤'],
      ingredients: [{ name: `e2e ingredient ${Date.now()}`, amount: '1', unit: '份' }],
      tags: ['e2e'],
    },
  })
  expect(createResponse.ok()).toBeTruthy()
  const recipe = await createResponse.json()
  const updatedName = `${recipe.name} updated`

  try {
    await loginViaUi(page)
    await page.goto(`/recipes/${recipe.id}`)
    await expect(page.getByTestId('recipe-title')).toBeVisible()

    await page.getByTestId('recipe-title-edit').click()
    await page.getByTestId('recipe-title-input').fill(updatedName)
    await page.getByTestId('recipe-title-input').press('Enter')
    await expect(page.getByTestId('recipe-title')).toHaveText(updatedName)

    const png1x1 = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
      'base64',
    )
    await page.getByTestId('recipe-cover-input').setInputFiles({
      name: 'recipe-cover-e2e.png',
      mimeType: 'image/png',
      buffer: png1x1,
    })
    await expect(page.getByTestId('recipe-cover-image')).toBeVisible()

    await page.reload()
    await expect(page.getByTestId('recipe-title')).toHaveText(updatedName)
    await expect(page.getByTestId('recipe-cover-image')).toBeVisible()

    const fetched = await request.get(`/api/recipes/${recipe.id}`)
    const fetchedRecipe = await fetched.json()
    expect(fetchedRecipe.name).toBe(updatedName)
    expect(fetchedRecipe.coverPhotoUrl).toContain('/uploads/')
  } finally {
    await request.delete(`/api/recipes/${recipe.id}`)
    await cleanupE2EArtifacts(request)
  }
})

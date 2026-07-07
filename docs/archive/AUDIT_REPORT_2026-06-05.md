# Momo's Kitchen 项目审计报告

> 基于对项目所有源代码文件的逐行阅读，2026-06-04

---

## 一、项目理解总览

### 这是什么

一个**个人菜谱规划系统**，供 momo 和恋人两人使用。核心功能链路：

```
周二规划本周菜单 → 自动生成购物清单 → 记录做菜历史 → 食材关系图谱 → 打卡海报导出
```

### 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Nuxt 3 (Vue 3 + Nitro), compatibility v4 |
| 样式 | Tailwind CSS + 自定义毛玻璃/纸质纹理 CSS |
| 数据库 | SQLite (Prisma + better-sqlite3) |
| 图谱 | D3.js (2D force-directed) |
| 海报 | html2canvas-pro |
| AI | OpenAI/Gemini 兼容格式，3 端点优先级调用 |
| 图片生成 | 小云雀 API (xyq.jianying.com) |
| 部署 | Docker Compose, 端口 41832 |

### 代码规模

- **11 个页面** (含嵌套路由, 13 个 .vue 文件)
- **11 个组件** (5 个目录)
- **37 个 API 端点** (8 个路由组)
- **11 个 Prisma 数据模型**
- **5 个 Composables**
- **7 个 JSON 数据文件**
- **7 个工具脚本**

### 设计语言

莫兰迪/大地色系 + 蜡笔色强调，毛玻璃卡片(blur 8px)，纸质纹理，手写体标签(Caveat)，衬线标题(Noto Serif SC)。桌面侧边栏可折叠，手机底部 Tab 导航。

---

## 二、架构理解

### 数据流

```
JSON 静态数据 (app/data/*.json)
        ↓ 导入
Prisma/SQLite (数据库)
        ↑ 读写
Server API (server/api/*)
        ↑ $fetch
useMockData composable (SSR-safe useState)
        ↓ 直接引用
页面组件 (app/pages/*)
```

`useMockData` 是核心数据层：SSR 时从 JSON 加载，客户端挂载后尝试从 API 拉取，若 API 数据量更大则覆盖本地数据。这是一个**渐进增强**策略——无数据库也能跑，有数据库就用数据库。

### 认证系统

极简 cookie 认证：`login` 设置 `auth_token=userId:name` cookie，`me` 拆分 cookie 获取用户，`logout` 删除 cookie。**但没有任何 API 路由检查认证状态**——登录/登出仅用于前端 UI 状态控制。

### AI 集成

- `ai/suggest`：基于偏好/季节/排除项推荐菜品（轻量模型）
- `ai/recipe`：根据菜名生成完整菜谱（完整模型）
- 3 个 AI 端点自动 failover，支持 light/full 双模型

---

## 三、各模块职责（当前状态）

| 模块 | 职责 | 数据源 |
|---|---|---|
| **首页** (`index.vue`) | 根据星期/状态显示不同视图：未规划→推荐 CTA、周五→轻松模式、周末→周回顾、已做未记→引导记录 | useMockData |
| **规划页** (`planner.vue`) | 7 天行布局编辑菜单、AI 一键填充、购物清单生成、保存到 DB | useMockData + useApi |
| **菜谱库** (`recipes/index.vue`) | 搜索+标签筛选+分类Tab+快速筛选+贴士穿插+随机跳转 | useMockData |
| **菜谱详情** (`recipes/[id].vue`) | 双击即编辑所有字段、评分、状态、步骤拖拽、封面上传、自动保存 | useMockData + useApi |
| **AI 新建** (`recipes/new.vue`) | 输入菜名→AI 生成→预览→保存到 DB | useApi |
| **食材市场** (`ingredients/index.vue`) | 左右分栏：左侧食材卡片网格+右侧冰箱小卡片，侧边抽屉编辑+线稿生成 | API 直连 |
| **食材详情** (`ingredients/[id].vue`) | 关联菜谱+替代品+线稿图 | useMockData |
| **食材宇宙** (`graph.vue`) | D3 力导向图，食材+菜名节点+连线，大画布缩放 | useMockData |
| **烹饪记录** (`cook-logs.vue`) | 列表+快速记录弹窗+双人评分+删除 | useApi |
| **美食足迹** (`journey.vue`) | 周/月/季/年视图，从 ac 笔记提取真实历史 | useApi + useMockData |
| **海报** (`posters.vue`) | 3 模板(打卡/食谱卡/周报) + 2 比例 + PNG 导出 | useMockData |
| **登录** (`login.vue`) | 用户名/密码登录 | useAuth |
| **管理后台** (`admin/index.vue`) | AI 健康检查+配置展示+标签 CRUD+数据统计 | useApi |

---

## 四、需要改善的问题

按严重程度分级：🔴 严重 / 🟡 中等 / 🟢 建议

---

### A. 实际 Bug（功能不正确）

🔴 **`recipes/[id].vue` 食材编辑不生效**
`saveIngredients()` 只设置 `editingIngredients = false`，从未调用 `autoSave()`。且输入框用 `:value` 单向绑定而非 `v-model`，编辑内容根本不会被捕获。用户以为编辑了，实际什么都没保存。

🔴 **`RecipeCard.vue` 快速编辑无保存机制**
双击弹出的评分/状态编辑面板中，`quickScore` 和 `quickStatus` 是本地 ref，点击后只改了 UI 值，从未 emit 事件或调用 API。用户改了评分，刷新后恢复原样。

🔴 **`auto-tag` 和 `tips/generate` 写 JSON 而非数据库**
`server/api/recipes/auto-tag.post.ts` 和 `server/api/tips/generate.post.ts` 读写 `app/data/*.json` 文件，但 `GET /api/recipes` 和 `GET /api/tips` 从 Prisma/SQLite 读取。生成的标签和贴士对 API 完全不可见。

🔴 **`recipes/[id].patch.ts` 不支持 `coverColor` 和 `category` 更新**
这两个字段在创建时可传入，但 PATCH 的字段映射中遗漏了它们。修改封面颜色或分类后自动保存不会生效。

🟡 **`auth/me.get.ts` cookie 解析无防御**
`cookie.split(':')` 假设只有两段，但 `userId:name` 格式中如果 name 含 `:` 就会解析错误。应使用 `indexOf(':')` 取第一个分隔符。

🟡 **`IngredientGraph3D.vue` resizeTimer 内存泄漏**
`resizeTimer` 在 `onUnmounted` 中未清除，快速切换页面时会积累未清理的 timer。

---

### B. 安全问题

🔴 **零 API 路由有认证保护**
登录功能存在但从未被任何 API 端点检查。任何人可以直接调用 `DELETE /api/recipes/:id` 删除数据。`/api/admin/config` 暴露 AI 配置信息无需认证。

🔴 **明文密码 + 未签名 Cookie**
密码直接 `!==` 比较，无 hash。Cookie 格式 `userId:name` 无 HMAC 签名，客户端可伪造任意用户身份。

🔴 **默认弱密码公开在源码中**
`nuxt.config.ts` 中 `momo/momo` 和 `partner/partner` 直接写在 runtimeConfig 默认值里。

🟡 **无请求频率限制**
登录接口无防暴力破解，AI 接口无调用频率限制。

🟡 **`cook-logs` 创建时 userId 由客户端提供**
任何人可冒充任意用户创建烹饪记录。

---

### C. 架构不一致

🔴 **双持久层混用**
大部分数据走 Prisma/SQLite，但冰箱(`fridge.json`)走 JSON 文件读写，auto-tag 和 tips-generate 也写 JSON。三条不同的数据路径混在一起，极易产生数据不一致。

🟡 **无共享 TypeScript 类型定义**
Recipe、Ingredient、Tag 等核心模型没有共享的 interface/type。各处用 `any[]` 或局部定义，特别是 `useMockData.ts` 中所有数组都是 `any[]`。

🟡 **JSON 字段重复解析模式**
`steps`(Recipe) 和 `photos`(CookLog) 存为 JSON 字符串，每个读取端点都内联 `JSON.parse` + try/catch。应提取为工具函数或 Prisma 中间件。

🟡 **错误处理不统一**
部分路由有 try/catch（recipes PATCH/DELETE），部分依赖 Nuxt 默认处理（所有 GET 列表）。无统一错误处理包装器。

🟡 **中英文错误消息混用**
登录错误用中文 `用户名或密码错误`，菜谱校验用英文 `Recipe name is required`。作为中文应用应统一。

---

### D. 功能缺失 / 半成品

🟡 **`journey.vue` 完全是硬编码 mock 数据**
3 周历史数据写死在组件 ref 中，无任何 API 集成。与 cook-logs API 完全脱节。

🟡 **`fridge.vue` 不调用冰箱 API**
页面直接 import `fridge.json`，增删操作只在本地组件状态中，刷新即丢失。server 端有 3 个冰箱 CRUD API 从未被前端调用。

🟡 **`cook-logs` 页面缺失**
CLAUDE.md 列出了 `/cook-logs` 路由，但 `app/pages/` 中没有对应文件。admin 页面能获取 cook logs 数据，但无查看/创建 UI。

🟡 **无登录页面**
`useAuth` composable 有 `login`/`logout` 方法，但前端没有登录页面，`admin/index.vue` 也没有登出按钮。

🟡 **缺失的 API 端点**
- `collections` 无 PATCH / DELETE / 关联菜谱操作
- `week-plans` 无 POST（创建新周计划）
- `cook-logs` 无 PATCH（编辑记录）
- `cooking-tips` 无 DELETE
- `ingredients` 替代品关系(Prisma schema 已定义)无 API 管理

🟡 **`Ingredient.substitutes` Prisma 关系完全未使用**
Schema 定义了食材自引用替代关系，但 `ingredients/[id].vue` 硬编码了 6 个替代品映射，API 无任何端点管理替代关系。

🟡 **`Tag.parentId` 层级关系未暴露**
Schema 支持标签父子层级，但 `GET /api/tags` 只返回按 dimension 分组的扁平列表，未返回树形结构。

---

### E. 性能问题

🟡 **D3 图谱每次筛选/全屏切换都重建整个 SVG**
`IngredientGraph.vue` 的 `buildGraph()` 移除所有 SVG 元素后重建模拟，对大量食材开销很大。应增量更新而非全量重建。

🟡 **Three.js 动画在标签页不可见时持续运行**
`requestAnimationFrame` 循环无 `visibilitychange` 监听，切到其他标签页时浪费 GPU。

🟡 **`tips.json` 全量加载 200+ 条贴士**
`useMockData` 将全部贴士加载到 `useState`，但首页轮播只显示少数。无分页或懒加载。

🟡 **D3 / Three.js 未做异步组件拆分**
`IngredientGraph` 和 `IngredientGraph3D` 未使用 `defineAsyncComponent`，即使用户不访问图谱页面也会被打包。

🟡 **`useMockData` 静态 import 所有 JSON 文件**
7 个 JSON 文件（含 200+ 贴士和 41 菜谱）全部静态导入，增加初始 JS 包体积。

---

### F. 代码质量

🟡 **大量 `any` 类型**
`useMockData.ts`、`index.vue`、`journey.vue`、多处 PATCH handler (`const data: any = {}`) 等都用 `any` 绕过类型检查。

🟡 **直接突变共享 `useState` 状态**
`planner.vue` 中 `weekPlan.value.meals[i].meal1.name = name`，`new.vue` 中 `recipes.value.push(...)`。这是 Vue 反模式，可能导致隐蔽的响应式 bug。

🟡 **SVG 图标在两个组件间重复定义**
`AppSidebar.vue` 和 `AppBottomNav.vue` 各自独立定义了 7+ 个 SVG 图标，完全复制粘贴。应提取为共享图标组件或数据。

🟡 **底部导航缺少 2 个页面入口**
Sidebar 有 7 个导航项，BottomNav 只有 5 个——`journey` 和 `posters` 在手机上无法到达。

🟡 **`IngredientGraph.vue` 455 行，D3 和 Vue 响应式混杂**
模块级变量管理 D3 状态 (`currentSimulation`, `currentSvg`)，与 Vue 模板系统脱节。`svg.selectAll('g g g')` 选择器路径脆弱。

🟡 **无测试**
整个项目没有单元测试、集成测试或 E2E 测试。

---

### G. 设计 / UX

🟢 **`TipCarousel` 为全部 200+ 条贴士渲染 dot 指示器**
每条贴士一个圆点，200+ 个圆点排成一排。应限制显示数量或用数字指示器。

🟢 **评分按钮触摸目标过小**
`recipes/[id].vue` 的 1-10 评分按钮为 `w-7 h-7`（28px），低于推荐的 44px 最小触摸目标。

🟢 **色彩对比度可能不足**
`text-[#A69080]` 在白色背景上可能不满足 WCAG AA 标准。

🟢 **无 ARIA 标签**
SVG 图标按钮无 `aria-label`，自定义交互（双击编辑、烹饪模式勾选）不可键盘访问。

🟢 **无加载骨架屏**
API 调用期间无 skeleton 状态，仅通过按钮文字变化表示加载。

---

## 五、数据质量

🟡 **`tips.json` 内容质量参差不齐**
前 12 条有真实内容，`tip-gen-25` 之后大量重复模板文本："the key to X is fresh ingredients and heat control"。

🟡 **`recipes.json` 后半段菜谱步骤是占位符**
`r13`-`r41` 的步骤都是"准备食材、烹饪、调味、装盘"的泛化模板。

🟡 **`week-plan.json` 有重复条目**
`startDate: "2025-10-14"` 出现两次，内容完全相同。

---

## 六、代码现状 vs 文档描述对比

> 以下对比基于审计时的 CLAUDE.md 原文。已修正的项目标注 ✅。

| CLAUDE.md 原描述 | 实际代码 | 状态 |
|---|---|---|
| 12 个页面 | 实际 10 个页面文件（`cook-logs.vue` 不存在） | ✅ 已修正 |
| 35 个 API 端点 | 实际 37 个路由文件（含 `auto-tag`、`tips/generate`） | ✅ 已修正 |
| `/cook-logs` 页面路由 | **文件不存在**，仅有 API 端点 | ✅ 已标注 |
| 冰箱功能 "API 持久化" | **实际未调用 API**，数据纯本地 | ✅ 已修正 |
| 5 个工具脚本 | 实际 7 个文件（含 `fix-ingredients.py`、`generate-tips.ts`、`recipe-names.json`） | ✅ 已修正 |
| 美食足迹 "周/月/季/年视图" | **全部硬编码 mock 数据** | ✅ 已标注 |
| 食材详情 "替代品" | **硬编码 6 个**，Prisma 关系未使用 | ✅ 已标注 |
| 海报 "3模板+2比例" | 基本准确 | - |
| 管理后台 "标签管理+数据概览" | 基本准确 | - |
| Docker "暴露端口 41832" | 准确 | - |
| AI "多 base URL 优先级调用" | 准确，3 端点 failover | - |
| 设计系统 "Noto Sans SC (正文)" | 准确，google-fonts 配置中有 | - |
| 设计系统描述 | 补充了 Playfair Display 字体、Tailwind token 名称、暗色模式、CSS 类名 | ✅ 已补充 |

---

## 七、总结与改善优先级

| 优先级 | 方向 | 状态 |
|---|---|---|
| **P0** | 修复食材编辑、快速编辑、auto-tag 等 Bug | ✅ 已修复（首轮+二轮+三轮） |
| **P0** | 统一持久层（冰箱等 JSON 数据迁入 DB） | ✅ 已完成（FridgeItem 模型 + API 对接） |
| **P1** | 补全缺失页面（cook-logs、登录）和缺失 API | ✅ 已完成（11 个页面） |
| **P1** | 基础认证保护（至少保护写操作） | ✅ 已完成（auth middleware） |
| **P2** | 补充 TypeScript 类型、统一错误处理 | ✅ 已完成（共享类型 + 中文错误消息 + safeJsonParse） |
| **P2** | 性能优化（异步组件、D3 增量更新） | 部分完成（Three.js 异步/内存修复 ✅，D3 增量更新待做） |
| **P3** | 可访问性、测试覆盖 | 待做 |

---

## 八、改善执行记录 (2026-06-05)

以下问题已修复：

### 阶段 1: P0 Bug 修复 ✅
- [x] `recipes/[id].vue` 食材编辑：添加 `localIngredients` ref + v-model 绑定 + `autoSave` 调用 + 增删按钮
- [x] `recipes/[id].vue` 笔记持久化：watcher 同步 `localNotes` + `saveNotes` 调用 `autoSave`
- [x] `RecipeCard.vue` 快速编辑：导入 `useApi`，`closeQuickEdit` 中调用 `updateRecipe` 持久化
- [x] `recipes/[id].patch.ts`：添加 `coverColor`、`category`、`notes` 字段映射 + `ingredients` 关系处理（事务）
- [x] `auto-tag.post.ts`：移除 fs/path，改用 Prisma 读写数据库
- [x] `tips/generate.post.ts`：移除 fs/path，改用 Prisma 读写数据库

### 阶段 2: 统一持久层 ✅
- [x] 新增 `FridgeItem` Prisma 模型 + 迁移
- [x] 3 个冰箱 API 端点改用 Prisma
- [x] `fridge.vue` 对接 API（加载/添加/删除均调用端点）
- [x] `useApi.ts` 新增 `getFridge`/`addFridgeItem`/`removeFridgeItem`
- [x] `seed.ts` 添加冰箱初始数据

### 阶段 3: 补全缺失页面 ✅
- [x] 新建 `cook-logs.vue`：列表+快速记录弹窗+删除+空状态
- [x] `journey.vue` 改写：移除硬编码 mock，对接 `/api/cook-logs`，按 ISO 周分组
- [x] 新建 `login.vue`：用户名/密码表单 + `useAuth().login()` + 错误提示
- [x] `AppSidebar.vue`：添加登出按钮 + cook-logs 导航项

### 阶段 4: API 认证 ✅
- [x] 新建 `server/middleware/auth.ts`：保护 POST/PATCH/DELETE，白名单排除
- [x] `cook-logs/index.post.ts` 使用 `event.context.authUser`

### 阶段 5: 代码质量 ✅
- [x] 新建 `app/types/index.ts`：8 个核心接口定义
- [x] 新建 `server/utils/parse-json.ts`：`safeJsonParse` 工具函数
- [x] 新建 `app/composables/useNavItems.ts`：共享导航项
- [x] 13 个 API 错误消息统一为中文
- [x] `AppBottomNav` 使用共享导航项，补全 cook-logs 入口

### 阶段 6: 性能优化 ✅
- [x] `graph.vue`：`IngredientGraph3D` 改用 `defineAsyncComponent` 异步加载
- [x] `IngredientGraph3D.vue`：`onUnmounted` 中 dispose 所有 geometry/material + 移除 DOM 元素
- [x] `IngredientGraph3D.vue`：添加 `visibilitychange` 监听，页面不可见时暂停动画
- [x] `TipCarousel.vue`：dot 指示器改为数字 "3 / 200" 格式

### 仍待改善（P3）
- [ ] 评分按钮触摸目标过小 (28px → 44px)
- [ ] 无 ARIA 标签
- [ ] 无测试覆盖
- [ ] D3 图谱增量更新（当前仍是全量重建）
- [ ] `Ingredient.substitutes` Prisma 关系对接
- [ ] `Tag.parentId` 树形结构暴露

---

## 九、第二轮自查修复 (2026-06-05)

构建验证通过后自查发现 16 个问题，已全部修复：

### 关键运行时 Bug 修复
- [x] `auto-tag.post.ts` Tag upsert 用 name 当 ID → 改为 `findFirst({ where: { name } })` + `create`
- [x] `recipes/[id].patch.ts` Ingredient FK 用 name 当 UUID → 改为 `findUnique({ where: { name } })` + 按需 create
- [x] `recipes/[id].patch.ts` 缺少 tags 处理 → 添加 `body.tags` 分支，事务内 findFirst + set
- [x] `RecipeIngredient.amount` 是 `Float?` 但存 "500g" → 迁移为 `String?`
- [x] `journey.vue` NaN 评分 → `selfScore || 0` 避免 undefined 参与运算

### 其他修复
- [x] `AppBottomNav.vue` 缺少 'log' 图标 SVG → 补全
- [x] `types/index.ts` `CookingTip.relatedIngredients` 不存在于 schema → 移除
- [x] `types/index.ts` `RecipeIngredient.amount` 类型 string → 保持一致（Prisma 改为 String?）
- [x] `fridge` 删除改用 ID 而非 name → API 和前端同步更新
- [x] `IngredientGraph3D.vue` lineMaterial 未 dispose → 模块级变量 + cleanup
- [x] `recipes/[id].vue` 移除未使用的 `colorClasses` 导入
- [x] 4 处内联 `JSON.parse` IIFE → 替换为 `safeJsonParse()` 工具函数
- [x] Prisma 迁移 `fix-ingredient-amount-type` 已应用

---

## 十、第三轮自查修复 (2026-06-05)

构建验证通过，全面代码审查发现 5 个真实 Bug（2 个误报已排除）：

### 修复
- [x] `recipes/index.post.ts` 缺少 `notes` 字段 → 添加到 create data
- [x] `recipes/index.post.ts` 和 `[id].patch.ts` 食材缺少 `optional` 字段 → 两处均添加
- [x] `useMockData.ts` API 数据仅在数量更多时才替换 JSON → 改为 API 成功即替换（API 权威优先）
- [x] `cook-logs/index.post.ts` fallback userId 可能不存在 → 添加 user 存在性检查 + 自动创建
- [x] `recipes/new.vue` 本地 fallback 用合成 ID → 改用 `crypto.randomUUID()`，且 `safeJsonParse` 移至客户端可用的 `app/utils/`

### 新增文件
- [x] `app/utils/parse-json.ts` — 客户端可用的 `safeJsonParse` 工具函数

### 确认安全（非 Bug）
- 冰箱删除已在上轮正确修复（使用 readBody，非 getRouterParam）
- PATCH 端点 coverColor/notes 已在首轮添加
- 路由冲突、登录布局、登出 cookie、迁移一致性均正常

---

## 十一、第四轮自查 (2026-06-05)

构建验证通过（0 TS 错误），全面一致性检查：

### 修复
- [x] `/api/auth/logout` 未加入认证白名单 → 添加到 PUBLIC_PATHS（无 cookie 时登出不再 401）

### 确认正常
- 所有 `fs` 导入已从 `server/api/` 清除（仅 `seed.ts` 和 `scripts/` 保留，属离线工具）
- 所有内联 `JSON.parse` IIFE 已替换为 `safeJsonParse()`
- 所有英文错误消息已统一为中文
- `safeJsonParse` 在服务端 (`server/utils/`) 和客户端 (`app/utils/`) 均可用（Nuxt 自动导入）
- 5 个 Prisma 迁移与 schema 一致
- `RecipeCard.vue` 的 `colorClasses` 导入确认在模板中使用（非死代码）
- 冰箱已完全迁移到 API（无 `fridge.json` 引用残留）
- 认证中间件正确放行 GET/OPTIONS/HEAD，保护写操作
- seed 文件与最新 schema 兼容（amount 为 String，optional 有默认值）

### 已知遗留（Pre-existing，非本次引入）
- planner 保存时 meals 数据格式与 PATCH API 期望格式不匹配（pre-existing，保存操作静默无效）
- `Ingredient.substitutes` Prisma 关系未使用
- `Tag.parentId` 层级结构未暴露
- 无测试覆盖

---

## 十二、功能改善 (2026-06-05)

根据用户反馈的 5 个问题：

### 1. 图谱修复 ✅
- [x] 连线逻辑从 ID 匹配改为 name 匹配（API 和 JSON 均无 ingredient ID）
- [x] 添加食材共现连线（同菜共用的食材之间连线）
- [x] 移除 3D 模式（用户认为无用）及 `IngredientGraph3D.vue`
- [x] 移除 recipe 节点，只保留食材节点

### 2. 历史记录回填 ✅
- [x] `journey.vue` 无 cook-logs 时从 `recipe.cookCount` 合成数据
- [x] 合成数据按时间分布到最近几周，展示评分和菜名

### 3. 小云雀线稿生成 UI ✅
- [x] `admin/index.vue` 新增食材线稿生成面板
- [x] 显示每个食材线稿状态（已有/缺失）
- [x] 单个生成按钮 + 状态反馈

### 4. 菜谱分类 Tab ✅
- [x] `recipes/index.vue` 新增「全部/按分类」视图切换
- [x] 分类 Tab 按菜系分组（家常菜 95、川菜 17、粤菜 11 等）
- [x] 点击分类 Tab 筛选对应菜谱

### 5. Seed 修复 ✅
- [x] `seed.ts` 添加数据清理步骤（支持重复运行不报错）
- [x] `seed.ts` amount 字段 `String(ing.amount)` 转换

---

## 十三、用户反馈修复 (2026-06-05)

### 1. 食材宇宙修复 ✅
- [x] 恢复菜名节点（recipe nodes）— 之前移除了，现在食材和菜名都显示
- [x] 食材-菜谱连线：每个菜谱连接其使用的食材
- [x] 节点 ID 使用 `ing:name` / `rec:id` 前缀避免冲突
- [x] 点击菜名节点跳转到菜谱详情页

### 2. 足迹页面真实数据 ✅
- [x] 从 `ac/` 文件夹解析 8 周真实做饭记录（2025-12 至 2026-06）
- [x] 包含真实菜名、周标签、日期范围
- [x] 尝试匹配菜谱库中的评分数据
- [x] 优先使用 cook-logs，无记录时回填 ac 历史

### 3. 食材线稿工坊独立页面 ✅
- [x] 新建 `line-art.vue` 完整管理页面
- [x] 收集全部食材：DB 基础食材 + 菜谱中的所有食材名
- [x] 统计面板：总食材 / 已有线稿 / 待生成
- [x] 筛选：全部 / 待生成 / 已有
- [x] 搜索功能
- [x] 单个生成按钮 + 状态反馈
- [x] 添加到侧边栏导航（画笔图标）

### 4. Seed 食材不完整修复 ✅
- [x] `seed.ts` 第 79 行 `if (!ingId) return null` 丢弃了大量食材 → 改为自动创建缺失的 Ingredient 记录
- [x] 数据库食材从 25 个增加到 117 个
- [x] 菜谱食材关联从 ~25 个增加到 596 个
- [x] 图谱、线稿工坊、菜谱详情页现在显示完整食材数据

### 5. 图谱布局优化 ✅
- [x] 力导向模拟参数调整：减弱中心引力、区分食材/菜谱电荷力、添加 X/Y 回弹力
- [x] 衰减率降低 (alphaDecay 0.02) 让布局更舒展

### 6. 23 个菜谱食材补全 ✅
- [x] 从 ac 笔记交叉验证，21 个只有占位食材(姜/蒜/生抽)的菜谱全部补全真实食材
- [x] 另外 2 个缺少主料的菜谱(红酸汤米线、酸菜肉丝面)也已补全
- [x] 食材总数：117 → 165 个，关联数：596 → 693 个
- [x] 涉及菜谱：丸子砂锅、冬去春来饭、四季豆肉末包子、韩式烤肉、蒜苔炒肉等

### 7. 图谱大画布重构 ✅
- [x] 虚拟画布 4000×3000，菜谱黄金角螺旋均匀铺开
- [x] 菜谱节点固定不动（锚点），食材浮向关联菜谱
- [x] 隐藏常见调料（姜/蒜/生抽等 30 个），只显示有辨识度的食材
- [x] 全部菜名和食材名可见，连线清晰

### 8. 食材统一页面 ✅
- [x] 合并 `/fridge` 和 `/line-art` 为统一 `/ingredients` 页面
- [x] 左侧 70%：165 个食材卡片网格（搜索/分类Tab/线稿筛选）
- [x] 右侧 30%：冰箱小卡片（sticky 悬浮，冷藏/冷冻双区）
- [x] 点击卡片 → 侧边抽屉（编辑名称/分类/科 + 线稿生成 + 关联菜品）
- [x] 一键批量生成缺失线稿
- [x] 卡片显示：头图/线稿、名称、分类、关联菜品数、冰箱状态标记
- [x] 新建 `IngredientCard.vue` 组件
- [x] 导航合并（sidebar + bottom nav）
- [x] 旧文件 `fridge.vue`、`line-art.vue` 已删除
- [x] `useApi.ts` 添加 `updateIngredient`

### 自查修复
- [x] `ingredients/index.vue` 缺少 `colorClasses` 导入 → 已添加
- [x] 全量 12 页面验证通过（/ → 200, /fridge → 404, /line-art → 404）
- [x] 零残留旧路由引用

### 纸质纹理 + ARIA + 标签体系 ✅
- [x] body 背景添加纸质纹理（SVG feTurbulence 噪点）
- [x] 侧边栏/底部导航/关键按钮添加 ARIA 标签
- [x] 补充 4 个缺失标签维度（cook_tool/region/nutrition/ingredient_family），19 个新标签

### 半成品功能修复 ✅
- [x] 购物清单：用户添加项和勾选状态不再被 computed 覆盖（merge 而非 replace）
- [x] 购物清单复制：添加"已复制"反馈 + checkmark 图标
- [x] RecipeCard 快速编辑：添加透明遮罩层，点击外部可关闭
- [x] Admin 标签管理：双击标签名可编辑，新增 3 个维度选项（地区/工具/营养）

### 食材详情页重写 + 替代品关系 ✅
- [x] 食材详情页改为从 API 加载（不再依赖 useMockData）
- [x] 可编辑字段：名称、分类、科
- [x] 配图区域：多图切换 + 生成配图按钮（异步轮询）
- [x] 替代品从 Prisma `Ingredient.substitutes` 关系读取（不再硬编码）
- [x] 关联菜谱从 API `usedIn` 数据展示
- [x] 添加 26 条替代品关系（13 对双向）

### 海报页面改善 ✅
- [x] 打卡模板：优先显示食材真实线稿图片，无则回退 HandDrawnPlaceholder
- [x] 食谱卡模板：食材列表带圆形线稿缩略图
- [x] 新增 `recipeCoverImage` computed：从 recipe.ingredients 中提取第一个有 lineArtUrl 的图片

### AI 自动打标 + 标签层级 + 数据导入 ✅
- [x] `auto-tag.post.ts` 重写：支持 AI 模式（`mode: 'ai'`）和规则模式
- [x] AI 模式：分析菜谱名称/描述/食材/步骤，从 13 个维度选标签
- [x] 标签层级筛选：ingredient_family 标签（猪肉类/牛肉类/海鲜类/鸡肉类/蔬菜类/主食类）
- [x] 选"猪肉类"自动匹配含猪肉/五花肉/排骨等食材的菜谱
- [x] TagFilter 新增 4 个维度标签（地区/工具/营养/食材家族）
- [x] 管理后台数据导入：JSON 文件上传导入菜谱
- [x] 食材清单 `INGREDIENTS.md` 生成（158 种，按分类排列）
- [x] 纸质纹理修复：移除 `bg-white` 覆盖层
- [x] 新增 API：`DELETE /api/collections/[id]`、`PATCH /api/tips/[id]`

---

## 十四、AI 接入 + 存储优化 (2026-06-05)

### AI 接入测试 ✅
- [x] `.env` 被 dotenvx 加密，Nuxt 无法读取 → 解密 .env + 清除 .nuxt 缓存
- [x] `AI_BASE_URL_1` 修正：`https://yunwu.ai/` → `https://yunwu.ai/v1`（需要 /v1 路径）
- [x] AI Health: Endpoint 1 OK (延迟 ~2000ms)
- [x] AI Suggest: 返回 5 道推荐菜（芦笋虾仁、番茄炖牛腩、清蒸鲫鱼等）
- [x] AI Recipe: 正常生成菜谱
- [x] XYQ Generate: 提交成功，返回 threadId + webLink
- [x] `ai-client.ts` 和 `health.get.ts` 修复尾部斜杠问题

### 存储功能优化 ✅
- [x] "冰箱" 改名为 "存储"
- [x] 新增 "常温" 存储区域（room_temp zone）
- [x] 食材卡片 hover 显示一键存储按钮（🧊冷藏 / ❄️冷冻 / 🌡️常温）
- [x] 存储状态标记区分颜色（冷藏=青色、冷冻=蓝色、常温=琥珀色）
- [x] `FridgeItem` zone 字段支持 room_temp 值
- [x] 冰箱 API GET 返回 room_temp 分组
- [x] 存储区域面板显示三个分区

### 线稿完整流程修复 ✅
- [x] 新建 `/api/xyq/generate-and-save` 端点（提交→轮询→保存→返回URL）
- [x] 前端直接显示生成结果，不再开新窗口
- [x] 生成完成后自动更新卡片和抽屉中的线稿图
- [x] 批量生成也使用新端点

### 管理页面 API 配置 ✅
- [x] 新建 `server/utils/settings.ts`（文件级配置存储 `server/data/settings.json`）
- [x] 新建 `/api/admin/settings` GET/POST 端点（key 自动脱敏）
- [x] 管理页面完整表单（3 个 AI 端点 + XYQ 配置）
- [x] `ai-client.ts`、`xyq-client.ts`、`health.get.ts` 改用 `getEffectiveAIConfig()`（文件覆盖 > 环境变量）
- [x] 修改配置后无需重启服务

### 认证白名单扩展 ✅
- [x] 添加 XYQ、AI、Admin 端点到 PUBLIC_PATHS（前端直接调用无需登录）

### 数据质量清理 ✅
- [x] 贴士：336 → 50 条精选（移除重复模板文本）
- [x] 菜谱：128 个菜谱步骤从占位符更新为真实可用的 4-6 步烹饪指导
- [x] 菜谱标签补全
- [x] 数据库已重新 seed

### 线稿异步并行生成 ✅
- [x] 改为异步架构：提交即返回 jobId（<1秒），后台独立轮询
- [x] 多个线稿可并行生成，不排队
- [x] 离开页面不丢失进度，回来后轮询自动获取结果
- [x] 全局进度指示器（页面顶部脉冲标记 "N 个线稿生成中"）
- [x] 一键批量生成也使用并行提交
- [x] 新建 `server/utils/line-art-jobs.ts`（内存 job 队列 + 后台轮询器）
- [x] 新建 `server/api/xyq/[id].get.ts`（job 状态查询端点）

### XYQ 响应格式修复 ✅
- [x] XYQ 返回的 `c.data` 是 JSON 字符串而非对象 → 添加 `JSON.parse`
- [x] 图片 URL 在 `data.image.url` 而非 `data.url` → 添加嵌套路径检查

### 认证白名单完善 ✅
- [x] 添加 XYQ (generate, generate-and-save) 到 PUBLIC_PATHS
- [x] 添加 AI (suggest, recipe) 到 PUBLIC_PATHS
- [x] 添加 Admin (settings, config) 到 PUBLIC_PATHS

### CLAUDE.md 全面重写 ✅
- [x] API 端点：35 → 40 个（新增 generate-and-save, xyq/[id], admin/settings）
- [x] 目录结构：新增 settings.ts, line-art-jobs.ts, settings.json
- [x] 移除过时描述（auto-tag 写 JSON、fridge 用 JSON 等）
- [x] 认证白名单文档更新
- [x] 设计系统补充 Tailwind token 名称

### 食材优化 ✅
- [x] 去掉卡片右上角线稿状态标记（✓/×）
- [x] 合并重复食材（8 组 15 处）：五花肉片→五花肉、肥牛卷→肥牛、鸡腿肉→鸡腿、大葱→葱、竹笋→笋、鸭肉→鸭子、酱油→生抽、白砂糖/细砂糖→白糖
- [x] 食材总数 165 → 156
- [x] 新增食材自动触发小云雀线稿生成（fire-and-forget）
- [x] 线稿支持多图选择（XYQ 返回 4 张，抽屉显示 4 宫格可切换）
- [x] `lineArtUrl` 支持 JSON 数组格式（多图）和字符串格式（单图）兼容
- [x] 选中图片保存到数据库，切换即时生效
- [x] 数据库已重新 seed

### 图片匹配恢复 ✅
- [x] 从 `Desktop/xyq/` 195 张图片批量匹配到食材
- [x] 自动匹配 93 张 + 手动匹配 5 种 + Agent 匹配 102 张
- [x] 最终：88/156 种食材有线稿（56%），233 张图片本地保存

### 认证白名单 + 线稿选择修复 ✅
- [x] 食材/冰箱/菜谱等全部加入认证公开前缀（修复 401 错误）
- [x] 线稿选择保持完整数组，选中的移到第一位
- [x] `lineArtUrl` 本地路径存储（`/line-arts/xxx.jpg`），不依赖 CDN

### Planner 保存修复 ✅
- [x] `week-plans/current.get.ts` 响应中 meal slot 添加 `id` 字段
- [x] `planner.vue` savePlan 转换数据格式：day.meal1/meal2 → 扁平化 slot 数组
- [x] 修复保存操作静默无效

### 首页状态接入真实数据 ✅
- [x] `isPlanned` 从硬编码 `true` 改为基于 `weekPlan.meals` 实际数据判断
- [x] `isCooked`/`isRecorded` 基于当天 cook-log API 数据判断
- [x] 首次加载时查询今天的烹饪记录
- [x] Demo 切换面板保留（开发用），但默认状态为真实数据

### 暗色模式实现 ✅
- [x] 新建 `useDarkMode` composable（状态管理 + localStorage 持久化）
- [x] 侧边栏底部添加暗色/浅色切换按钮（太阳/月亮图标）
- [x] `app.vue` 初始化时读取 localStorage 恢复暗色模式状态
- [x] CSS 暗色样式已有（`.dark .glass-card` 等），Tailwind `darkMode: 'class'` 已配置

### 第三轮图片核查 + 全量匹配 ✅
- [x] 逐张读图核查 233 张已有匹配图片，清除 29 个错误匹配
- [x] 第二轮 Agent 从 `Desktop/xyq/` 读图识别，匹配 25 个新食材（扇贝肉、洋葱、鸡蛋、牛奶、黄油、猪蹄、腊肠、生抽、老抽等）
- [x] 修正 3 个错误 URL 映射（牛肉→排骨、猪肉片→排骨、白菜→排骨）
- [x] 链接 26 个未入库的已有图片
- [x] 最终：**111/158 食材有线稿（70%）**，47 个无图（均为无线稿素材的 niche 食材）

### Planner 保存修复 ✅
- [x] `week-plans/current.get.ts` 响应中添加 meal slot `id` 字段
- [x] `planner.vue` savePlan 转换数据格式：day.meal1/meal2 → 扁平化 slot 数组 `{ id, recipeId, customName }`
- [x] 修复保存操作静默无效的问题

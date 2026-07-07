# 架构说明

更新时间：2026-06-12（本轮更新）

## 技术栈

- 前端与服务端：Nuxt 3、Vue 3、Nitro Server
- 样式：Tailwind CSS、自定义纸感视觉、Google Fonts
- 数据库：SQLite、Prisma 7、better-sqlite3 adapter
- 校验：zod schemas + 轻量 parse helper
- 媒体：Sharp 压缩、原图备份、安全路径删除
- 可视化：D3 食材图谱
- 导出：html2canvas-pro 打卡 PNG
- AI：OpenAI 兼容接口，最多 3 组端点 failover
- 图片生成：小云雀 / XYQ 食材线稿
- 部署：Docker、Docker Compose，默认端口 `41832`

## 运行时数据流

```text
Prisma SQLite
  -> server/api/*
  -> server/schemas + server/services + server/serializers
  -> app/composables/useApi
  -> app/pages + app/components
```

`app/data/*.json` 仍可作为 seed 和离线 fallback，但正式使用时 SQLite 是权威数据源。首页、计划、记录、打卡等日常页面应优先读取 API，避免旧静态数据污染真实状态。购物清单属于计划页的一部分，不作为独立日常页面。

## 数据模型

当前 Prisma 模型覆盖：

- `User`
- `Recipe`
- `RecipeIngredient`
- `Ingredient`
- `Tag`
- `CookLog`
- `Collection`
- `CookingTip`
- `WeekPlan`
- `MealSlot`
- `FridgeItem`
- `MediaAsset`
- `ShoppingList`
- `ShoppingListItem`
- `Achievement`
- `UserAchievement`
- `AchievementEvent`
- `LineArtJob`

仍建议后续增强：

- 将 `server/data/settings.json` 迁入数据库，或至少对敏感项做加密存储。
- 为购物分类增加用户自定义 override，减少自动分类不准时的修正成本。

## API 分层

服务端按四层约束：

1. `server/middleware/auth.ts`
   - 签名 cookie 验证。
   - 除认证和健康检查外，业务 API 默认要求登录。
   - `/api/admin/*` 仅 admin。
   - 高成本 AI / XYQ 接口收紧权限。
2. `server/schemas/*`
   - 统一解析 body、query、params。
   - 覆盖 recipe、ingredient、cook-log、week-plan、shopping-list、media 等入口。
3. `server/serializers/*`
   - 统一 DB model 到前端 DTO。
   - 避免前端分散 `JSON.parse` 和字段兼容逻辑。
4. `server/utils/*`
   - `week-plan-helpers.ts`：周计划日期计算（周二起始）、空计划创建、plan 查询，被 `current.get.ts`、`by-date.get.ts`、`copy.post.ts` 等多个端点复用。
   - `ai-client.ts`：LLM 客户端，多端点 failover。
   - `xyq-client.ts` + `line-art-jobs.ts`：小云雀线稿生成。
5. `server/services/*`
   - `recommendation.ts`：推荐评分、近期去重、库存/profile 加权、reason；可选 LLM 增强推荐理由（`enrichWithAI`）。
   - `shopping-list.ts`：从周计划生成清单、合并用量、对比冰箱库存自动标记 inStock、重建时清理过期项、保留手动项；已标记"不安排"的天自动跳过。
   - `achievement.ts`：事件记录和成就解锁。

## 关键业务节奏

- 计划周期按周二到下周一。
- 周五只保留晚餐，不强调次日便当。
- 周六、周日按午餐再晚餐展示。
- 计划页支持左右箭头切换上/下周，未来周自动创建空计划，过去周显示"已过去"标识但仍可编辑。
- 每天可标记"不安排"（MealSlot.status = "skipped"），记录跳过原因（MealSlot.skipReason），AI 推荐和购物清单自动跳过已标记天。
- 新增 `GET /api/week-plans/by-date?date=YYYY-MM-DD` 端点，支持按任意日期查/建所属周计划，用于前后周导航。
- AI 智能编排考虑荤素搭配、口味多样性，不只独立补空位；跳过天不会被 AI 填充。
- 计划页保存自动同步购物清单，输入实时保存（800ms 防抖）。
- 购物清单保留在计划页内，和周计划同屏使用；已标记"不安排"的天不产生购物项。
- 首页卡片结构：今日晚餐→次日便当→今晚食材→备餐提醒→过期→统计。
- 做饭模式为一屏全览（非逐步点击），食材+全部步骤+AI提示一目了然。

## AI 集成架构

### LLM 客户端

`server/utils/ai-client.ts` 导出 `aiChat()` 函数，支持：
- 最多 3 组 OpenAI 兼容端点，顺序 failover
- `light` / heavy 两档模型
- 可选参数：`temperature`、`maxTokens`、`timeoutMs`（默认 30s）
- 配置优先级：`server/data/settings.json` > 环境变量 > 硬编码默认

### AI 端点一览

| 端点 | 用途 | 模型档位 |
|---|---|---|
| `POST /api/ai/recipe` | 菜谱生成（从菜名） | heavy |
| `POST /api/ai/suggest` | 菜谱建议 | light |
| `POST /api/ai/step-tips` | 做饭步骤提示 | light |
| `POST /api/ai/review-draft` | 做饭记录复盘草稿 | light |
| `POST /api/ai/substitute` | 食材替代建议 | light |
| `POST /api/ai/week-plan` | 周计划智能编排 | light |
| `POST /api/ai/ingredient-insights` | 食材搭配分析 | light |
| `GET /api/ai/daily-tip` | 个性化今日贴士 | light |
| `POST /api/recipes/auto-tag` | 自动标签（AI+规则降级） | light |
| `GET /api/ai/health` | 端点健康检查 | — |

### XYQ 线稿生成

`server/utils/xyq-client.ts` + `server/utils/line-art-jobs.ts`：
- 小云雀 API（Seedream 5.0 Lite，2K，1:1）
- 异步任务流：提交 → 轮询（10s 间隔，120s 超时）→ 下载到 `public/line-arts/`
- prompt 集中管理：`lineArtPrompt()` 函数

### AI 调用缓存

`aiChat` 内置 LRU 内存缓存：
- 200 条上限，10 分钟 TTL
- key = 前缀 + messages + system prompt + temperature 的内容摘要（前 200 字符 + 总长度）
- 通过 `options.cache` 控制（默认开启），`recipe` 生成和 `week-plan` 编排禁用缓存
- 适用：daily-tip、ingredient-insights、substitute、step-tips 等高重复场景

### AI 错误处理

所有 AI 端点均对 `aiChat` 调用做了 try/catch：
- `recipe.post.ts`：AI 不可用时返回 502
- `suggest.post.ts`：AI 不可用时返回空数组 `[]`
- `step-tips/substitute/ingredient-insights/review-draft/week-plan/daily-tip`：AI 失败时返回安全默认值（空数组或空字符串）
- 所有 JSON 解析失败均返回 422 或降级默认值

### 自定义错误页

`app/error.vue` 提供统一的 404/500 页面，使用项目视觉风格（暖色系、中文文案）。

## 鉴权模型

项目按家庭自托管双账号设计：

- 猪猪：admin，可访问管理后台和高成本生成能力。
- 猪宝：member，可使用日常功能。
- 历史 `user-momo`、`user-partner` ID 保留，用来兼容已有 CookLog、成就、媒体记录。
- cookie 内容为 `base64(payload).hmac`，由 `AUTH_SECRET` 签名。
- 生产环境缺少强 `AUTH_SECRET` 或继续使用默认弱密码时拒绝启动或明确报错。

## 媒体模型

```text
multipart file
  -> MIME / size validation
  -> public/uploads/YYYY/MM/DD/
  -> uploads_backup/YYYY/MM/DD/
  -> MediaAsset
  -> Recipe.coverPhotoUrl / CookLog.photos
```

当前实现支持 jpg/png/webp，保留原图备份，使用 Sharp 旋转校正和压缩。删除时只允许删除受控目录内文件，避免路径越权。

## Docker 数据目录

Docker Compose 的持久数据挂载为：

```text
./docker-data/data/dev.db        -> /app/data/dev.db
./docker-data/public/uploads/    -> /app/public/uploads/
./docker-data/uploads_backup/    -> /app/uploads_backup/
./docker-data/server/data/       -> /app/server/data/
./docker-data/manifest.json      -> 迁移包校验清单
```

容器启动时 `docker-entrypoint.sh` 会先执行 `prisma migrate deploy`，再启动 Nitro。迁移项目时使用 `npm run export:docker-data` 可以把当前 SQLite、上传图、原图备份和 server data 整理到 `docker-data/`，目标机器整包复制这个目录即可。

`manifest.json` 是迁移包的验收依据：它记录所有业务表行数、上传目录文件数、菜谱封面 / CookLog 照片 / MediaAsset 引用数，并要求缺失媒体为空。`npm run docker:smoke` 会用 manifest 复核导出的 SQLite 与文件目录；有 Docker CLI 时还会临时启动 `docker-compose.smoke.yml` 做运行态健康检查。

`docker-compose.yml` 在容器内固定覆盖 `DATABASE_URL=file:/app/data/dev.db`，避免本地开发 `.env` 的 `file:./dev.db` 被带入容器导致数据库路径漂移。

`docker-compose.smoke.yml` 专门用于迁移包验收：它直接挂载 `docker-data/`，并映射到本机 `41833`，避免和正式 `41832` 服务冲突。

Linux bind mount 如遇到写入权限问题，通过 `.env` 的 `PUID` / `PGID` 对齐 `docker-data` 所有者。

## 线稿任务模型

`LineArtJob` 是小云雀线稿生成任务的权威存储：

```text
XYQ submit
  -> LineArtJob(pending)
  -> background polling
  -> LineArtJob(done/failed)
  -> Ingredient.lineArtUrl
  -> server/data/line-art-history.json
```

前端刷新后可通过 `/api/xyq/jobs` 恢复任务状态。超过 10 分钟仍未完成的 pending/polling 任务会标记为 failed，避免中断后长期卡住。

## 文档与编码约定

- 中文文件保持 UTF-8。
- 在本机读取中文文件优先使用 PowerShell 7；如果终端显示可疑，用 Node 以 UTF-8 复核。
- `docs/source/ac/` 和 `docs/archive/` 是历史资料，不作为当前产品状态的权威来源。

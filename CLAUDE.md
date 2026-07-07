# 猪猪家的厨房 - Agent 快速上下文

本文档给后续开发代理快速理解项目。更完整的人类文档见 [docs/README.md](docs/README.md)。

## 项目定位

猪猪家的厨房 / Zhuzhu's Home Kitchen 是 Nuxt 3 全栈家庭厨房应用，服务两个人日常做饭：

```text
计划这周吃什么 -> 整理购物清单 -> 照着菜谱做饭 -> 做完记录 -> 需要时生成打卡卡片
```

目标是家庭自托管长期使用，不做公网注册、多租户、支付或公开社区。

## 当前重点

当前目标是按照 `docs/product/PRODUCT_DESIGN_GUIDE.md` 和 `docs/product/PRODUCT_REAL_USE_REVIEW.md` 继续把项目从可运行推进到好用、可迁移、可长期维护。

已完成的近期改造：

- 首页卡片结构重构：今日晚餐→次日便当→今晚食材→备餐提醒（明天晚餐+后天便当）→过期→统计。晚餐已记录后便当递补为主体，全部完成后备餐提醒升级为主角。
- 首页时区安全：`tomorrowMeal` 用本地时间方法构造，不再依赖 `toISOString()`。
- 做饭模式从逐步点击重构为一屏滚动全览：食材速览 + 全部步骤高亮 + AI 提示 + 当前步骤标记。
- 首页后台加载 AI 今日贴士和冰箱过期提醒。
- 冰箱库存支持保质期管理，过期/即将过期自动提醒。
- 计划页支持 AI 智能编排（考虑荤素搭配、口味多样性），周二到下周一节奏，周末午餐优先。
- 计划页保存和生成购物清单合并为一个操作，输入实时保存（800ms 防抖），未完成输入自动匹配菜谱。
- 购物清单并入计划页，自动对比冰箱库存标记已有食材，每项显示来源菜谱，重建时清理过期项。
- 计划页支持左右箭头切换上/下周，未来周自动创建空计划，过去周显示"已过去"徽章但仍可编辑。
- 每天可一键标记"不安排"（外出就餐/旅游/放假/自定义原因），AI 推荐和购物清单自动跳过已标记天。
- 冰箱库存支持保质期管理，过期/即将过期自动提醒。
- 菜谱新建页支持 AI 生成后可编辑，AI 不可用时可手动填写完整表单。
- 做饭模式一屏全览，每步显示 AI 智能提示，做饭记录弹窗支持 AI 复盘草稿。
- 做饭记录照片支持全屏灯箱查看，左右切换。
- 菜谱详情食材新增支持自动联想，悬停获取 AI 替代建议。
- 食材详情页新增 AI 搭配分析。
- AI 调用层加 LRU 缓存（200 条、10 分钟），缓存 key 包含 system prompt + temperature，菜谱生成和周计划除外。
- 暗色模式全局适配（CSS 覆盖 + 系统偏好检测）。
- 自定义错误页（error.vue），404/500 统一视觉风格。
- 管理后台前端路由加 admin 角色守卫，非 admin 自动跳转首页。
- 做饭记录照片灯箱支持键盘导航（Escape 关闭、左右箭头切换）。
- 冰箱添加食材支持保质期（桌面端和移动端均已支持）。
- Prisma schema 加 ShoppingListItem 唯一约束（shoppingListId + name），防止重复项。
- 删除未使用依赖 three.js。
- E2E 测试已同步更新：购物清单按钮、做饭模式断言。
- 打卡页菜谱选择改为可搜索输入。
- 全站文案改为日常温暖风格。
- 移动端底栏保留首页、计划、菜谱、食材、打卡，移动端食材页优先显示库存状态。
- Docker 启动前自动执行 Prisma migration，数据挂载目录已整理。
- 新增 `npm run export:docker-data` 用于迁移当前数据到 Docker 目录结构。

## 技术栈

- Nuxt 3 + Vue 3 + Nitro Server
- Tailwind CSS + 自定义纸感视觉
- Prisma 7 + better-sqlite3 + SQLite
- zod 输入校验
- Sharp 媒体压缩
- D3 食材图谱
- html2canvas-pro 打卡导出
- OpenAI 兼容 AI 端点，最多 3 组 failover
- 小云雀 / XYQ 食材线稿生成
- Docker Compose 部署，默认端口 `41832`

## 主要目录

```text
app/
  pages/
  components/
  composables/
  generated/prisma/
server/
  api/
  middleware/
  schemas/
  serializers/
  services/
  utils/
    week-plan-helpers.ts  # 周计划日期计算、空计划创建、plan 查询
prisma/
  schema.prisma
  migrations/
  seed.ts
scripts/
  backup-data.ts
  export-docker-data.ts
  restore-drill.ts
  verify-backup.ts
docs/
  engineering/
  operations/
  product/
  reference/
```

## 核心路由

- `/` 首页
- `/planner` 周计划（支持切换上/下周、标记不安排日）和计划内购物清单
- `/recipes` 菜谱库
- `/recipes/[id]` 菜谱详情
- `/cook/[recipeId]` 做饭模式
- `/ingredients` 食材与库存
- `/graph` 食材图谱
- `/cook-logs` 做饭记录
- `/posters` 打卡生成
- `/achievements` 成就
- `/login` 登录
- `/admin` 管理后台

## 数据与部署

Docker Compose 持久数据目录：

```text
data/dev.db
public/uploads/
uploads_backup/
server/data/
```

迁移当前本机数据到 Docker 前运行：

```bash
npm.cmd run backup
npm.cmd run verify:backup
npm.cmd run restore:drill
npm.cmd run export:docker-data
npm.cmd run docker:smoke
```

## 工作约定

- 中文文件保持 UTF-8。
- 在 Windows 上读中文文件优先使用 PowerShell 7。Windows 自带 PowerShell 可能显示中文乱码，不能仅凭它的输出判断文件坏了。
- 如果终端输出可疑，用 Node 按 UTF-8 读取复核。
- `app/generated/prisma/` 是生成产物，通常不要手改。
- `docs/source/ac/` 是历史原始资料，不代表当前产品状态。
- 修改 Prisma schema 后运行 `npm.cmd exec prisma generate` 和迁移流程。
- 面向用户的页面文案要日常、有温度，避免出现默认账号、环境变量、生产部署、正式态等开发说明。

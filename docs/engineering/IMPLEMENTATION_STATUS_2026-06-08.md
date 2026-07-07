# 成品化实现状态

更新时间：2026-06-12（本轮更新）

## 总体状态

猪猪家的厨房已经具备家庭自托管日常使用的主链路：登录、计划、购物、菜谱、做饭、记录、打卡、备份和恢复演练均已落地。当前工作重点从”补齐功能”转向”真实使用时少绕路、迁移时不丢数据、文档能交接”。

## 已落地能力

- 签名 cookie 登录，同一设备可保持登录。
- 固定双账号显示为猪猪 / 猪宝，旧 `user-momo` / `user-partner` ID 继续兼容历史数据。
- 业务页面和业务 API 默认要求登录，admin/member 权限已分层。
- Prisma 已新增媒体、购物清单、成就、线稿任务等模型。
- Recipe、Ingredient、CookLog、WeekPlan、ShoppingList、Media 等入口已有 schema validation 和 serializer。
- 媒体上传支持 MIME 校验、大小限制、Sharp 压缩、原图备份和安全删除。
- 购物清单已落库并保留在计划页内，支持从周计划生成、对比冰箱库存自动标记 inStock、重建时清理过期项；清单分类可折叠，每项显示来源菜谱；清单和保存合并为一个操作。
- 计划页输入实时保存（800ms 防抖），未完成输入自动匹配第一个菜谱。
- 移动端底栏固定为：首页、计划、菜谱、食材、打卡。
- 当前周计划按周二到下周一；周五不安排次日便当；周末按午餐、晚餐。
- 计划页支持左右箭头切换上/下周，未来周自动创建空计划，过去周显示"已过去"标识但仍可编辑。
- 每天可标记"不安排"（外出就餐/旅游/放假/自定义原因），AI 推荐和购物清单自动跳过已标记天。
- 新增 `GET /api/week-plans/by-date` 端点支持按日期查/建周计划；公共日期计算逻辑提取到 `server/utils/week-plan-helpers.ts`。
- AI 智能编排考虑荤素搭配、口味多样性，不只独立补空位。
- 首页推荐区域独立后台加载不阻塞渲染，推荐理由可选 LLM 增强；首页加载个性化 AI 今日贴士。
- 做饭模式每步显示 AI 智能提示（火候/技巧/翻车点）。
- 做饭记录弹窗支持 AI 自动生成复盘草稿。
- 菜谱详情食材新增支持自动联想已有食材，悬停问号获取 AI 替代建议。
- 打卡页菜谱选择改为可搜索输入。
- 全站文案从机械直述改为日常温暖风格。
- 做饭模式完成后创建 CookLog，并跳转到记录编辑入口补照片、评分和复盘。
- 做饭模式在同一设备保存当前步骤和随手备注，刷新或离开后再回来可恢复进度。
- CookLog 支持照片上传和刷新后持久展示。
- 打卡页使用真实菜谱和 CookLog 数据，保留点点、箭头和移动滑动切换。
- 成就 API、PWA manifest、离线页和基础缓存已落地。
- Docker 启动会执行 `prisma migrate deploy`，正式 compose 直接挂载 `docker-data` 迁移包。
- `npm run export:docker-data` 会把当前数据库、上传图、原图备份和 server data 整理成 Docker 迁移目录，并生成 `manifest.json`。
- `manifest.json` 已增强为全表行数 + 媒体引用清单：迁移包会校验所有业务表计数，并确认菜谱封面、CookLog 照片、MediaAsset 压缩图和原图备份文件都存在。
- `npm run docker:smoke` 可校验 Docker 迁移数据包和 manifest；有 Docker CLI 的机器会使用 `docker-compose.smoke.yml` 直接挂载 `docker-data` 执行 Compose runtime smoke。

## 质量门

最近一次完整回归：2026-06-09 18:44-18:49。

- `npm.cmd run check:mojibake`：通过，未发现疑似中文乱码。
- `npm.cmd run lint`：通过。
- `npm.cmd run typecheck`：通过。
- `npm.cmd run test`：通过，3 个测试文件、15 个单测全绿。
- `npm.cmd run test:e2e`：通过，13 个 Playwright 场景全绿，覆盖登录、权限、计划购物、做饭、记录、打卡、PWA 和菜谱封面上传。
- `npm.cmd run build`：通过。
- `npm.cmd run backup`：通过，最新备份为 `backups/2026-06-09T10-46-23-705Z`。
- `npm.cmd run verify:backup -- backups/2026-06-09T10-46-23-705Z`：通过。
- `npm.cmd run restore:drill`：通过，检查 15 个媒体资产、30 个媒体文件。
- `npm.cmd run export:docker-data`：通过。
- `npm.cmd run docker:smoke`：数据级校验通过；本机没有 Docker CLI，Compose runtime smoke 需要在目标 Docker 机器执行。

常规发布前应运行：

```bash
npm.cmd run check:mojibake
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run test:e2e
npm.cmd run build
npm.cmd run backup
npm.cmd run verify:backup
npm.cmd run restore:drill
npm.cmd run docker:smoke
```

Docker 迁移前额外运行：

```bash
npm.cmd run export:docker-data
npm.cmd run docker:smoke
```

## 当前剩余增强

- 真实手机上继续微调计划、购物清单、做饭和打卡的触控体验。
- 管理设置仍在 `server/data/settings.json`，后续可迁入数据库或加密敏感项。
- Docker 镜像目前为迁移可靠保留完整 `node_modules`，后续可做体积优化。
- 暗色模式已通过全局 CSS 覆盖适配，部分组件细节仍可逐页精调。
- D3 图谱可改为细粒度 import 以减小 bundle 体积。
- E2E 测试可补充 AI 推荐、做饭提示、复盘草稿、食材联想等场景。
- 单元测试可覆盖推荐引擎评分逻辑和 AI 端点实际 handler。

## 可用度判断

- 核心日常闭环：高。
- 数据持久化和备份恢复：高，仍需周期性演练。
- Docker 迁移准备：迁移包导出、全表 manifest 校验、媒体引用校验和 compose smoke 脚本已具备；Compose runtime smoke 仍需在有 Docker CLI 的目标机器执行。
- 移动端日用体验：已改善计划页宽度、购物清单、食材库存入口和做饭进度恢复，仍建议真实设备继续走查。

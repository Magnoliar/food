# 成品与迁移完成审计

审计时间：2026-06-09 18:44-18:49

本审计用于判断当前项目是否已经满足“按产品指导继续改造、解决主要真实使用痛点、更新文档、准备带当前数据迁移到 Docker”的目标。结论只基于当前代码、文档、脚本和已运行命令。

## 总体结论

当前版本已达到第一版家庭自托管成品要求：主链路可用，移动端高频入口收敛，购物清单回到计划页，打卡页使用真实数据，备份恢复和 Docker 数据迁移包已具备可验证路径。

唯一未在本机完成的是 Docker Compose 运行态 smoke，因为本机没有 Docker CLI。数据级迁移校验已通过；目标 Docker 机器上仍需执行一次 `npm.cmd run docker:smoke`，确认容器实际启动和健康检查。

## 产品痛点对照

| 要求 | 当前证据 | 状态 |
|---|---|---|
| 首页使用真实当前周和真实购物清单，不展示 Demo 或旧周静态数据 | `app/pages/index.vue` 使用 API；E2E 断言登录后首页 shell 与 `home-next-step`；文案扫描未发现 `DEMO` 残留于 `app/server/public` | 已完成 |
| 未登录不闪现业务内容 | `app/middleware/auth.global.ts` 全局守卫；`server/middleware/auth.ts` 保护业务 API；E2E 断言未登录访问 `/` 跳 `/login?redirect=` 且无主导航 | 已完成 |
| 移动底栏固定为：首页、计划、菜谱、食材、打卡 | `app/components/layout/AppBottomNav.vue` 固定 5 个路径；E2E 断言无购物、记录、图谱、成就、管理 | 已完成 |
| 购物清单和计划合并，不新增购物子页面 | `app/pages` 无 shopping 页面；`app/pages/planner.vue` 内嵌 `ShoppingList`；E2E 断言移动底栏无购物 | 已完成 |
| 计划页移动端不横向溢出 | `app/components/planner/WeekCalendar.vue` 使用三列自适应小卡片；E2E 检查 `documentElement.scrollWidth <= window.innerWidth + 2` | 已完成 |
| AI 推荐只补空位，不覆盖手填内容 | `app/pages/planner.vue` 只收集空 slot；`usedRecipeIds` 排除已用菜 | 已完成 |
| 生成购物清单后自动到清单区 | `app/pages/planner.vue` `shoppingSectionRef.scrollIntoView()` | 已完成 |
| 购物清单勾选、家里有、手动项刷新不丢 | `server/services/shopping-list.ts` 落库合并；`app/components/planner/ShoppingList.vue` 更新后刷新；E2E 勾选后 reload 仍保持 | 已完成 |
| 移动端食材页能看库存 | `app/pages/ingredients/index.vue` 有 `mobile-storage-summary`，冷藏/冷冻/常温切换和增删；E2E 断言移动端可见 | 已完成 |
| 做饭模式大字、少干扰、完成后记录 | `app/pages/cook/[recipeId].vue` 全屏布局、进度条、倒计时、完成后创建 CookLog 并跳转编辑 | 已完成 |
| 做饭进度同设备恢复 | `app/pages/cook/[recipeId].vue` 使用 `localStorage` 保存 `currentStep` 和 `notes`，完成后清理 | 已完成 |
| 打卡页使用真实数据和实拍优先 | `app/pages/posters.vue` 使用 `getRecipes` / `getCookLogs`，图片优先级为 CookLog 照片、菜谱封面、占位 | 已完成 |
| 打卡模板保留点点、箭头、移动滑动，删除右侧文字模板按钮 | `app/pages/posters.vue` 有 `poster-template-dots`、`poster-prev-template`、`poster-next-template` 和 pointer swipe；E2E 断言右侧文字按钮不存在 | 已完成 |
| 打卡缺信息可快速回补 | `app/pages/posters.vue` `completionActions` 指向菜谱封面、食材、步骤和记录编辑/创建 | 已完成 |
| 前端文案避免开发说明 | `rg` 扫描 `app/server/public` 未发现默认账号、生产部署、环境变量、正式态、Demo 等硬词 | 已完成 |

## 数据与迁移对照

| 要求 | 当前证据 | 状态 |
|---|---|---|
| 当前数据可一起迁移到 Docker | `scripts/export-docker-data.ts` 导出 `docker-data/data/dev.db`、`public/uploads`、`uploads_backup`、`server/data`、`manifest.json` | 已完成 |
| manifest 覆盖业务表计数 | `docker-data/manifest.json` 记录 22 张业务/关联表计数，含 Recipe 141、Ingredient 158、WeekPlan 3、ShoppingList 2、ShoppingListItem 31、MediaAsset 15、User 2 | 已完成 |
| 媒体引用不丢 | manifest 记录 public upload refs 15、original refs 15，missing arrays 均为空；`docker:smoke` 二次验证文件存在 | 已完成 |
| Docker 启动自动迁移 | `docker-entrypoint.sh` 执行 `npx prisma migrate deploy`；`Dockerfile` 以 entrypoint 启动 | 已完成 |
| Compose 挂载迁移包 | `docker-compose.yml` 挂载 `./docker-data/data`、`./docker-data/public/uploads`、`./docker-data/uploads_backup`、`./docker-data/server/data` | 已完成 |
| 目标机可做 runtime smoke | `docker-compose.smoke.yml` 使用 41833 端口；`scripts/docker-smoke.ts` 有 Docker CLI 时启动临时 compose 并检查 `/api/health` | 已准备，本机未执行 |

## 最新命令证据

已通过：

```bash
npm.cmd run check:mojibake
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run test:e2e
npm.cmd run build
npm.cmd run backup
npm.cmd run verify:backup -- backups/2026-06-09T10-46-23-705Z
npm.cmd run restore:drill
npm.cmd run export:docker-data
npm.cmd run docker:smoke
```

说明：

- `test`：3 个测试文件、15 个单测通过。
- `test:e2e`：13 个 Playwright 场景通过。
- `restore:drill`：最新备份恢复演练通过，检查 15 个媒体资产、30 个媒体文件。
- `docker:smoke`：数据级校验通过；本机没有 Docker CLI，跳过 Compose runtime smoke。

## 迁移前操作顺序

1. 在当前机器运行：

```bash
npm.cmd run backup
npm.cmd run verify:backup
npm.cmd run restore:drill
npm.cmd run export:docker-data
npm.cmd run docker:smoke
```

2. 把以下内容复制到目标机器项目根目录：

```text
docker-compose.yml
Dockerfile
docker-entrypoint.sh
.env
docker-data/
```

3. 在目标 Docker 机器运行：

```bash
npm.cmd run docker:smoke
docker compose up -d --build
docker compose logs -f app
```

4. 访问 `http://目标机器:41832`，登录后检查首页、计划、购物清单、菜谱封面、做饭记录照片和上传保存。

## 剩余建议

- Docker Compose 运行态 smoke 迁移到目标机器后必须跑一次。
- 上线后第一周重点观察真实手机上的计划、购物清单、食材库存和做饭模式触控手感。
- 后续继续打磨文案和空状态，但不要再新增高频导航入口。

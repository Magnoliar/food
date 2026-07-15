# 猪猪家的厨房

Zhuzhu's Home Kitchen 是给家里两个人长期使用的小厨房应用。它把一周想吃什么、需要买什么、今晚怎么做，以及做完后的照片和感受，安静地收在同一本“厨房小本子”里。

当前版本已完成面向日常使用的深度打磨：暖色浅色设计系统、移动端核心动线、统一状态反馈、无障碍与触控优化、类型化数据层、独立 E2E 环境，以及可验证、可持久化的 Docker 部署链路均已落地。

## 当前能力

- 首页：围绕今天的安排、下一步和缺少的食材提供清晰状态与主操作。
- 菜谱：搜索、筛选、随机一道、新建、编辑、封面上传和做过记录。
- 计划与购物：一周晚餐/便当安排、AI 补空位、购物清单生成、勾选和库存确认。
- 食材与库存：分类浏览、库存状态、临期提示、关联菜谱和线稿管理。
- 做饭与记录：全屏步骤、计时与进度恢复，完成后快速记录、上传照片和打卡。
- 回顾：旅程、成就、图谱和海报导出等低频能力按需呈现。
- 运维：登录权限、SQLite 迁移、健康检查、备份恢复、Docker smoke 和完整质量检查。

## 本地启动

```powershell
npm.cmd install
npm.cmd exec prisma generate
npm.cmd exec prisma migrate deploy
npm.cmd exec prisma db seed
npm.cmd run dev
```

本地开发地址：[http://localhost:4789](http://localhost:4789)。

## Docker 快速启动

首次部署先创建独立生产配置，并确保密码不是示例默认值：

```powershell
Copy-Item .env.example .env
# 编辑 .env：填写 AUTH_SECRET（至少 32 位）、两个账号密码和可选 AI 配置
npm.cmd run export:docker-data
npm.cmd run docker:smoke
docker compose config
docker compose up -d --build
docker compose ps
```

Linux / NAS 可将 `Copy-Item` 换成 `cp`，将 `npm.cmd` 换成 `npm`。默认端口为 `41832`，可通过 `.env` 中的 `APP_PORT` 修改。

`docker-data/` 是完整持久化目录，包含 SQLite、上传图、原图、运行时线稿和服务端设置。上传图片与运行时线稿由显式服务端路由提供，不依赖构建时的 `.output/public`。

## 常用命令

```powershell
npm.cmd run check:mojibake
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run test:e2e
npm.cmd run build
npm.cmd run backup
npm.cmd run verify:backup
npm.cmd run restore:drill
npm.cmd run export:docker-data
npm.cmd run docker:smoke
```

账号、密钥、权限、迁移、备份和回滚步骤见 [部署与运维](docs/operations/DEPLOYMENT.md)。

## 文档入口

- [文档索引](docs/README.md)
- [产品说明](docs/product/PRODUCT_BRIEF.md)
- [产品与设计指导](docs/product/PRODUCT_DESIGN_GUIDE.md)
- [架构说明](docs/engineering/ARCHITECTURE.md)
- [成品化与运维方案](docs/engineering/PRODUCTIONIZATION_PLAN.md)
- [部署与运维](docs/operations/DEPLOYMENT.md)
- [部署方式选择](docs/operations/HOSTING_OPTIONS.md)

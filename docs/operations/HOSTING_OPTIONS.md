# Hosting Options

更新时间：2026-07-07

## 当前结论

这个项目目前不适合直接部署到 GitHub Pages 或纯 Vercel 免费部署：

- GitHub Pages 只适合静态 HTML/CSS/JS，不运行服务端 API，也不提供数据库或文件上传后端。
- 当前应用依赖 Nuxt server API、Prisma SQLite、`better-sqlite3`、本地上传目录和 `server/data/settings.json`。
- Vercel 能运行 serverless functions，但当前 SQLite 文件、上传图片写入本地磁盘、运行时配置写文件都不是持久化模型。

因此，当前最稳且改造最小的方案仍然是 Docker 部署到 NAS/VPS。

## 如果要改成 Vercel

需要先做架构迁移：

- 数据库：从 SQLite 改为 Postgres，例如 Neon、Supabase 或其他 Vercel Marketplace 数据库。
- Prisma：把 schema provider 改成 `postgresql`，替换 SQLite adapter，并重建迁移流程。
- 图片上传：从 `public/uploads` / `uploads_backup` 改为对象存储，例如 Vercel Blob、S3、Cloudflare R2 或 Supabase Storage。
- 运行时配置：从 `server/data/settings.json` 改为环境变量、数据库表或托管配置服务。
- 备份恢复：从复制 SQLite 和目录，改为数据库 dump + 对象存储同步。

这条路线可行，但不是“一键白嫖部署”；改造后也要接受外部数据库和对象存储的免费额度限制。

## GitHub Pages 可选用途

GitHub Pages 可以做一个只读演示站或项目介绍页，但不能承载当前完整厨房应用。若以后需要，可以单独生成静态 demo，不接入登录、上传、AI、数据库写入和周计划编辑。

## 推荐路线

短期：

- 保持 Docker Compose 部署到 NAS。
- GitHub Actions 的 CI 只做构建和测试。
- VPS/NAS 部署改为手动触发 `Deploy to VPS` workflow，避免未配置 secrets 时每次 push 都失败。

中期：

- 如果确实想免服务器维护，再迁移到 Postgres + 对象存储，之后部署到 Vercel。

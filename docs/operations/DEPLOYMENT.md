# 部署与运行

更新时间：2026-07-15

## 1. 部署模型

当前推荐将应用通过 Docker Compose 部署到 NAS 或 VPS。运行时依赖以下持久化数据：

- SQLite 数据库：`docker-data/data/dev.db`
- 公开上传图：`docker-data/public/uploads/`
- 上传原图：`docker-data/uploads_backup/`
- 运行时线稿：`docker-data/public/line-arts/`
- 管理设置与线稿历史：`docker-data/server/data/`

公开上传图由 `/uploads/**` 服务端路由读取，运行时线稿由 `/line-arts/**` 路由优先读取持久化目录并回退到镜像内置素材。因此容器更新后不会因为 Nitro 的构建期静态目录而丢失新上传内容。

## 2. 本地开发

```powershell
npm.cmd install
npm.cmd exec prisma generate
npm.cmd exec prisma migrate deploy
npm.cmd exec prisma db seed
npm.cmd run dev
```

开发地址：`http://localhost:4789`。生产容器默认对外端口为 `41832`。

## 3. 生产环境配置

复制示例文件：

```powershell
Copy-Item .env.example .env
```

至少填写：

- `AUTH_SECRET`：不少于 32 个字符的随机值。
- `ADMIN_USER` / `ADMIN_PASSWORD`：管理员账号。
- `PARTNER_USER` / `PARTNER_PASSWORD`：普通成员账号。
- AI 与线稿服务密钥：可选；未配置时不影响手动计划、菜谱、购物和记录主流程。

禁止使用 `momo`、`partner`、`zhuzhu`、`zhubao` 作为生产密码。容器入口会在迁移数据库前校验这些配置并快速失败。

Docker 常用环境变量：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `APP_PORT` | `41832` | 宿主机公开端口 |
| `TZ` | `Asia/Shanghai` | “今天”、周计划和上传日期使用的时区 |
| `PUID` / `PGID` | `1001` | 容器进程访问 bind mount 时使用的用户与组 |
| `DATABASE_URL` | `file:/app/data/dev.db` | Compose 固定的容器内数据库地址 |
| `APP_UPLOADS_PATH` | `/app/public/uploads` | 公开上传图目录 |
| `APP_UPLOADS_BACKUP_PATH` | `/app/uploads_backup` | 原图目录，不对外公开 |
| `APP_LINE_ARTS_PATH` | `/app/runtime-line-arts` | 运行时线稿目录 |
| `APP_SETTINGS_PATH` | `/app/server/data/settings.json` | 管理设置文件 |
| `APP_LINE_ART_HISTORY_PATH` | `/app/server/data/line-art-history.json` | 线稿历史文件 |

Compose 已设置所有 `APP_*` 路径，通常无需在 `.env` 重复配置。请保留正确时区，否则跨午夜时首页和计划页可能出现日期偏差。

## 4. 从现有本地数据迁移

在源机器执行：

```powershell
npm.cmd run backup
npm.cmd run verify:backup
npm.cmd run export:docker-data
npm.cmd run docker:smoke
```

导出脚本会使用 SQLite 在线备份 API 创建一致性数据库副本，复制上传图、原图、线稿和 `server/data`，并生成 `docker-data/manifest.json`。脚本会核对所有业务表行数与媒体引用；存在缺失文件时导出失败。

完整目录结构：

```text
项目根目录/
  docker-compose.yml
  .env
  docker-data/
    data/dev.db
    public/uploads/
    public/line-arts/
    uploads_backup/
    server/data/
    manifest.json
```

迁移时复制整个 `docker-data/`，不要只复制数据库。

## 5. 首次启动

```bash
docker compose config --quiet
docker compose build --pull app
docker compose up -d app
docker compose ps
docker compose logs --tail=200 app
```

访问健康接口：

```bash
curl -fsS http://127.0.0.1:41832/api/health
```

健康响应只有在下列检查全部正常时才返回 HTTP 200：生产认证配置、数据库查询、上传目录、原图目录、线稿目录和设置目录。任一项失败会返回 HTTP 503，响应只公开检查名称，不泄漏绝对路径或密钥。

## 6. Docker smoke

`npm run docker:smoke` 首先校验导出清单和 Compose 安全/持久化契约。本机有 Docker 时，还会：

1. 将 `docker-data` 复制到 `test-results` 临时目录。
2. 使用固定且独立的 smoke 账号、密钥和空 AI 配置启动 Compose。
3. 验证完整健康检查和管理员登录。
4. 上传 PNG，确认转换后的 JPEG 能从 `/uploads/**` 访问且已写入宿主目录。
5. 写入管理设置，重启容器，确认图片和设置仍存在。
6. 删除测试媒体并清理临时容器与临时数据。

`docker-compose.smoke.yml` 不读取本地 `.env`，也不挂载真实 `docker-data`，因此不会污染家庭账号、AI 密钥或生产数据。本机没有 Docker CLI 时会明确跳过容器阶段；CI 会执行完整运行时 smoke。

## 7. Linux / NAS 权限

先查询数据目录所有者应使用的 UID/GID：

```bash
id -u
id -g
```

将结果写入 `.env` 的 `PUID` 和 `PGID`，并修正目录所有权：

```bash
chown -R "$PUID:$PGID" docker-data
```

入口脚本会逐个检查数据库、上传、原图、线稿和设置目录是否可写。若失败，日志会提示检查 bind mount 与 `PUID/PGID`。Windows Docker Desktop 一般可保留 `1001:1001`。

## 8. 更新与回滚

更新时先构建，再替换运行容器，避免构建失败时提前停止旧服务：

```bash
set -eu
git pull --ff-only
docker compose config --quiet
docker compose build --pull app
docker compose up -d --no-deps --remove-orphans app
docker compose ps
```

不要在更新前直接执行 `docker compose down`。GitHub 的手动 `Deploy to VPS` workflow 已使用相同顺序，并在替换后循环检查容器健康。

升级前建议创建一致性备份并记录当前提交：

```bash
git rev-parse HEAD
npm run backup
npm run verify:backup
```

回滚步骤：

1. 保留当前失败容器日志：`docker compose logs --tail=200 app`。
2. 切回已知正常的 Git 提交或镜像。
3. 若新版本已执行不兼容的数据写入，停止应用并恢复同一时点的数据库、上传、原图、线稿和 `server/data`。
4. 执行 `docker compose build app && docker compose up -d app`。
5. 检查健康接口、登录、菜谱封面、购物勾选、设置和上传。

当前迁移仅使用向前兼容的 Prisma migration，但数据库与文件目录仍应作为同一备份单元恢复。

## 9. 备份与恢复演练

```powershell
npm.cmd run backup
npm.cmd run verify:backup
npm.cmd run restore:drill
```

备份包含 SQLite、公开上传图、原图、运行时线稿和服务端数据。恢复演练会在隔离目录验证数据库完整性、运行 migration，并核对媒体引用，不会覆盖当前数据。

## 10. 发布检查

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

## 11. Windows 中文文件

项目文本统一使用 UTF-8。Windows 上执行文件操作优先使用 PowerShell，并在读取或写入文本时显式指定 UTF-8；若终端显示异常，应先用 Node 或编辑器确认文件内容，不要直接覆盖源文件。

# 部署与运维

更新时间：2026-06-17

## 本地开发

```bash
npm install
npm.cmd exec prisma generate
npm.cmd exec prisma migrate deploy
npm run dev
```

开发地址：http://localhost:3000

## 环境变量

| 变量 | 说明 |
|---|---|
| `DATABASE_URL` | SQLite 地址。本地可用 `file:./dev.db`，Docker 默认 `file:/app/data/dev.db` |
| `PUID` / `PGID` | Docker bind mount 写入用户，默认 `1001/1001`；Linux 目标机可改成持有 `docker-data` 的用户 |
| `AUTH_SECRET` | 登录 cookie 签名密钥，生产环境至少 32 位 |
| `ADMIN_USER` / `ADMIN_PASSWORD` | 猪猪账号登录名和密码 |
| `PARTNER_USER` / `PARTNER_PASSWORD` | 猪宝账号登录名和密码 |
| `AI_BASE_URL_1` / `AI_API_KEY_1` | OpenAI 兼容主端点 |
| `AI_MODEL_1` / `AI_MODEL_LIGHT_1` | 标准模型和轻量模型 |
| `XYQ_ACCESS_KEY` / `XYQ_BASE_URL` | 小云雀图片生成配置 |

运行在家用服务器上时会校验 `AUTH_SECRET` 和弱密码。账号、密码、密钥这些内容只写在运维文档里，不放到用户页面。

## 数据库迁移

开发和生产统一使用已提交迁移：

```bash
npm.cmd exec prisma generate
npm.cmd exec prisma migrate deploy
```

不要在生产环境使用 `prisma migrate dev`。

## Docker Compose 部署

1. 准备 `.env`：

```env
AUTH_SECRET=replace-with-a-long-random-secret
ADMIN_USER=zhuzhu
ADMIN_PASSWORD=replace-with-strong-password
PARTNER_USER=zhubao
PARTNER_PASSWORD=replace-with-strong-password
```

`docker-compose.yml` 会在容器内固定使用 `DATABASE_URL=file:/app/data/dev.db`。即使本地 `.env` 里仍保留 `file:./dev.db` 供开发使用，容器也会读取挂载的 `./docker-data/data/dev.db`。

2. 准备持久化目录。

已有本机数据时优先运行导出脚本：

```bash
npm.cmd run export:docker-data
```

全新空库部署时也需要先创建目录：

```bash
mkdir docker-data
mkdir docker-data\data
mkdir docker-data\public
mkdir docker-data\public\uploads
mkdir docker-data\uploads_backup
mkdir docker-data\server
mkdir docker-data\server\data
```

3. 启动：

```bash
docker compose up -d --build
```

容器启动时会先执行 `prisma migrate deploy`，再启动 Nuxt/Nitro。默认访问地址为 `http://localhost:41832`。

## 迁移当前数据到 Docker

在当前本机项目目录先做备份和恢复演练：

```bash
npm.cmd run backup
npm.cmd run verify:backup
npm.cmd run restore:drill
```

导出 Docker 挂载目录结构：

```bash
npm.cmd run export:docker-data
```

脚本会生成：

```text
docker-data/
  data/dev.db
  public/uploads/
  uploads_backup/
  server/data/
  manifest.json
```

`manifest.json` 会记录导出时间、数据库来源、所有业务表行数、目录文件数和媒体引用数量。导出脚本会同时校验菜谱封面、CookLog 照片、MediaAsset 压缩图和原图备份是否都已进入 `docker-data`；若有引用文件缺失，导出会失败。

把整个 `docker-data/` 目录复制到目标机器项目根目录，不要拆到旧的 `data/`、`public/uploads/`、`uploads_backup/` 目录：

```text
项目根目录/
  docker-compose.yml
  .env
  docker-data/
    data/dev.db
    public/uploads/
    uploads_backup/
    server/data/
    manifest.json
```

然后在目标机器运行：

```bash
npm.cmd run docker:smoke
docker compose up -d --build
docker compose logs -f app
```

`npm.cmd run docker:smoke` 会先校验 `docker-data` 里的 SQLite、uploads、原图备份和 server data：所有业务表行数必须与 manifest 一致，所有图片引用必须能在迁移目录中找到。若目标机器已安装 Docker CLI，它会使用 `docker-compose.smoke.yml` 直接挂载 `docker-data` 临时启动容器，等待 `http://127.0.0.1:41833/api/health` 正常，再自动清理临时容器。

Linux 目标机如果保存、上传失败，通常是 bind mount 权限不匹配。处理方式：

```bash
id -u
id -g
```

把结果写入 `.env` 的 `PUID` 和 `PGID`，并确保 `docker-data` 属于该用户：

```bash
chown -R "$PUID:$PGID" docker-data
```

验收：

- `/api/health` 返回正常。
- 登录后能看到首页。
- 菜谱、周计划、购物清单、做饭记录存在。
- 菜谱封面和 CookLog 照片能打开。
- 购物清单勾选后刷新不丢。
- `docker-data/manifest.json` 中所有业务表行数和目标库一致。
- `docker-data/manifest.json` 的媒体缺失项为空数组。

## 备份与恢复

创建备份：

```bash
npm.cmd run backup
```

备份包含 SQLite 数据库、`public/uploads`、`uploads_backup` 和 `server/data`。

验证备份：

```bash
npm.cmd run verify:backup
```

恢复演练：

```bash
npm.cmd run restore:drill
```

手动恢复时：

1. 停止服务。
2. 恢复数据库文件和上传目录。
3. 运行 `prisma migrate deploy`，Docker 环境重启容器即可自动执行。
4. 启动服务。
5. 检查健康接口、登录、菜谱、周计划、购物清单和图片。

## 发布检查

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
```

迁移或换机器前额外运行：

```bash
npm.cmd run export:docker-data
npm.cmd run docker:smoke
```

当前本机已导出的迁移包位于 `docker-data/`。最近一次导出已包含当前 `dev.db`、`public/uploads`、`uploads_backup`、`server/data`，并通过本地 `docker:smoke` 数据校验；本机未安装 Docker CLI 时，Compose runtime smoke 会在目标 Docker 机器上继续执行。

2026-06-17 最新迁移前校验：

- 最新备份：`backups/2026-06-17T02-37-52-699Z`
- 最新备份验证：已通过
- Docker 迁移包导出：已通过（含 MealSlot.status/skipReason 新字段迁移）
- 本次新增：周导航（左右箭头切换上/下周）、不安排日标记（跳过原因）、资源限制（768M 内存 / 2 CPU）、健康检查、日志轮转
- Compose runtime smoke：需在目标机器执行

## Windows 中文文件注意

本项目中文文档为 UTF-8。Windows 自带 PowerShell 可能把中文显示成乱码；读取中文文件优先使用 PowerShell 7。若输出可疑，用 Node 按 UTF-8 复核，不要直接判断文件损坏。

# NiniMenu 借鉴报告

参考项目：[TryHarder-L/NiniMenu](https://github.com/TryHarder-L/NiniMenu)

更新时间：2026-06-09

## 一句话总结

NiniMenu 更像一个面向普通用户安装使用的菜单应用；猪猪家的厨房更偏个人化家庭记录和日常做饭闭环。我们应该借鉴它的正式化工程实践和产品拆分方式，而不是迁移它的技术栈或复制界面。

## 已吸收的实践

### 1. 权限分层

NiniMenu 把普通 App 能力和 Admin 能力分开。本项目已吸收为：

- 普通成员可看菜谱、计划、购物、做饭、记录和打卡。
- admin 可访问管理后台、批量维护和高成本生成能力。
- 业务 API 默认要求登录。
- `/api/admin/*` 仅 admin。

### 2. 推荐规则

NiniMenu 的推荐服务包含近期去重、profile、收藏/偏好加权和降级策略。本项目已吸收为：

- `server/services/recommendation.ts` 统一首页、计划填充和冰箱清理推荐。
- 支持 `balanced`、`quick`、`light`、`bento` 等 profile。
- 返回推荐理由 `reason`。
- AI 补空位只填空格，不覆盖手动填写的菜。

仍可继续增强：

- 加入更细的“最近 N 天做过”窗口配置。
- 加入更明确的“这周已经出现过”去重。
- 支持用户手动指定临时偏好，例如“今晚想清淡一点”。

### 3. 周计划缓存和复用

NiniMenu 用当前周 key 判断是否复用计划。本项目已改为更适合长期记录的 WeekPlan 模型：

- 当前计划周期按周二到下周一。
- `weekKey` 使用周期开始日期。
- 支持复制、归档、重新生成。
- 首页只使用当前周期真实计划，避免旧数据污染。

### 4. 购物清单落库

NiniMenu 将购物勾选、家中已有、分类修正拆成持久状态。本项目已吸收为：

- `ShoppingList` / `ShoppingListItem` 落库。
- 从周计划生成清单。
- 重新生成保留勾选、家里已有和手动添加项。
- 计划页内保留购物清单。

仍可继续增强：

- 分类手动修正。
- 分类折叠。
- 按超市动线排序。

### 5. 图片上传和备份

NiniMenu 的上传链路值得借鉴：大小限制、原图备份、EXIF 修正、压缩和明确错误。本项目已吸收为：

- 图片 MIME 和大小校验。
- 原图写入 `uploads_backup`。
- 压缩图写入 `public/uploads`。
- `MediaAsset` 记录。
- Recipe 封面和 CookLog 照片持久化。
- 删除时限制在受控目录内。

### 6. 成就系统

NiniMenu 的成就系统强调事件记录不阻塞主流程。本项目已吸收为：

- `Achievement`
- `UserAchievement`
- `AchievementEvent`
- CookLog、购物完成、上传照片等事件可触发成就。

后续应保持轻量，避免让家用工具变成任务榜。

### 7. PWA 和发布文档

NiniMenu 的 PWA、构建说明和用户/开发文档分层值得保留。本项目已吸收为：

- `manifest.webmanifest`
- PWA 图标
- 离线页
- 基础 service worker
- `docs/operations/DEPLOYMENT.md`
- Docker Compose 部署说明

## 不建议照搬

- 技术栈：NiniMenu 是 Go + Gin + Gorm + React，本项目已经是 Nuxt 全栈，不需要重写。
- 通用菜谱数据包：本项目更重视真实家庭历史和个人偏好。
- 大量成就一次性上线：应先保护日常主流程。
- App token 放在 localStorage：本项目继续使用 httpOnly 签名 cookie 更合适。

## 当前落地状态

| 借鉴点 | 状态 |
|---|---|
| 权限分层 | 已落地 |
| 推荐服务 | 已落地，仍可微调 |
| 周计划 key / 复用 | 已落地为 WeekPlan |
| 购物清单落库 | 已落地 |
| 购物和计划同屏 | 已落地 |
| 图片上传压缩备份 | 已落地 |
| 成就事件 | 已落地 |
| PWA | 已落地 |
| Docker 迁移说明 | 已落地 |

## 后续优先级

P0：

1. 真实手机检查计划页内购物清单的勾选密度和按钮大小。
2. 真实备份包迁移到 Docker 机器并验证图片、记录、购物状态。
3. 继续清理页面中不够日常的文案。

P1：

1. 购物分类手动修正。
2. 推荐 profile 的用户可见偏好入口。
3. 上传失败和 AI 失败的统一反馈。

P2：

1. 成就规则细化。
2. PWA 缓存策略细化。
3. 图谱和足迹作为增强层继续打磨。

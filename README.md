# 猪猪家的厨房

Zhuzhu's Home Kitchen 是给家里两个人长期使用的小厨房应用。它不追求把功能堆得很满，而是把一周想吃什么、需要买什么、今晚怎么做、做完有什么感受这些日常小事收在一起。

当前版本已经完成第一轮成品化收尾：登录保护、签名会话、双人固定账号、菜谱、食材、周计划内购物清单、做饭模式、做饭记录、图片上传、推荐、成就、PWA、备份恢复和测试流程都已经落地。后续重点会转向真实日用后的文案、动线、移动端体验和长期维护。

## 当前能力

- 菜谱：搜索、筛选、随机一道、新建、编辑、封面图上传。
- 计划：按当前周安排晚餐和便当，支持切换上/下周、标记不安排日，计划页内可生成购物清单。
- 购物：合并食材、勾选、标记家里已有、临时添加，和计划待在同一页。
- 做饭：全屏步骤、进度、倒计时，完成后生成记录。
- 记录：评分、备注、多图上传、历史回看，做过次数保持一致。
- 食材：分类、库存、线稿图、关联菜谱和替代关系。
- 推荐：结合近期重复、评分、库存、耗时和偏好给出推荐理由。
- PWA：manifest、图标、离线页和基础缓存。
- 维护：备份、恢复演练、健康检查、权限控制和质量检查脚本。

## 本地启动

```bash
npm install
npm.cmd exec prisma generate
npm.cmd exec prisma migrate deploy
npm.cmd exec prisma db seed
npm run dev
```

本地地址：[http://localhost:3000](http://localhost:3000)

账号、密钥和迁移步骤见 [部署与运维](docs/operations/DEPLOYMENT.md)。放到家用服务器前请设置自己的密码和 `AUTH_SECRET`。

## 常用命令

```bash
npm run check:mojibake
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run backup
npm run verify:backup
npm run restore:drill
npm run export:docker-data
npm run docker:smoke
```

迁移到 Docker 时，`docker-data/` 是完整搬家目录。导出脚本会把当前数据库、上传图、原图备份和 server data 放进去，并用 manifest 记录全表行数和媒体引用，`docker:smoke` 会先做数据级校验。

## 文档入口

- [文档索引](docs/README.md)
- [产品说明](docs/product/PRODUCT_BRIEF.md)
- [产品与设计指导](docs/product/PRODUCT_DESIGN_GUIDE.md)
- [架构说明](docs/engineering/ARCHITECTURE.md)
- [成品化与运维方案](docs/engineering/PRODUCTIONIZATION_PLAN.md)
- [部署与运维](docs/operations/DEPLOYMENT.md)
- [NiniMenu 借鉴报告](docs/reference/NINIMENU_BENCHMARK.md)
- [代码与文档综合观察](CODE_REVIEW_DISCOVERY.md)

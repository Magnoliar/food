# 审计与观察

当前权威审计入口：

- [代码与文档综合观察](../../CODE_REVIEW_DISCOVERY.md)
- [成品与迁移完成审计](./PRODUCTION_READINESS_AUDIT_2026-06-09.md)
- [当前实现状态](../engineering/IMPLEMENTATION_STATUS_2026-06-08.md)
- [产品与设计指导](../product/PRODUCT_DESIGN_GUIDE.md)
- [历史审计归档](../archive/AUDIT_REPORT_2026-06-05.md)

## 当前高优先级风险

1. 首页、菜谱详情、购物清单、做饭模式等复杂页面可按产品设计指导继续微调体验。
2. 备份结构校验和含 uploads 恢复演练已通过；长期使用中仍需持续运行。
3. 首页推荐已接入推荐服务；后续只需继续打磨推荐理由的视觉优先级和移动端呈现。
4. 管理设置仍在 JSON 文件；后续可迁入数据库或加密敏感项。

## 已从 P0 移出的风险

- 写接口和管理接口裸露：已通过签名 cookie 与权限中间件收紧。
- 购物清单仅前端临时状态：已落库。
- 图片上传不持久：菜谱封面已走媒体上传和 MediaAsset。
- CookLog 删除不回滚 cookCount：已在事务中维护。
- 源码中文乱码：新增 `check:mojibake`，当前检查通过。
- 工程检查缺失：`lint`、`typecheck`、unit tests、production build、Playwright smoke、backup verify 已通过。
- ESLint warning 堆积：当前 `npm run lint` 为 0 error / 0 warning。
- 媒体上传未压缩：已接入 Sharp 旋转校正、最大 1200px、JPEG 85 压缩。
- 生产依赖漏洞：`npm audit --omit=dev` 当前 0 vulnerabilities。
- 线稿任务仅内存保存：已新增 `LineArtJob` 模型和迁移，任务状态落库，重复运行检测和超时释放已覆盖单元测试。
- 线稿任务刷新后状态不可见：已新增 `/api/xyq/jobs`，食材页和食材详情页可恢复生成中/失败/完成状态并提示重试。
- 备份只做结构校验：已新增 `scripts/restore-drill.ts`，可把备份恢复到临时目录、对临时 SQLite 执行迁移，并验证关键表、public uploads 和原图备份文件。
- CookLog 照片体验缺口：已支持多图上传、预览、刷新展示，并有 Playwright 覆盖。
- 菜谱详情编辑/封面上传缺少 e2e：已新增 Playwright 覆盖并通过。

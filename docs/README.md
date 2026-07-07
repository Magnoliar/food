# 猪猪家的厨房文档索引

本文档体系整理于 2026-06-09。当前项目名为“猪猪家的厨房”，英文辅助名为 “Zhuzhu's Home Kitchen”。归档文档只作为历史资料，当前决策以本索引列出的文档为准。

## 当前文档

- [产品说明](product/PRODUCT_BRIEF.md)  
  项目定位、核心场景、功能边界和成品标准。

- [产品与设计指导](product/PRODUCT_DESIGN_GUIDE.md)  
  从日常使用出发约束页面排序、主流程聚焦、动效克制和视觉气质。

- [架构说明](engineering/ARCHITECTURE.md)  
  技术栈、目录结构、数据流、API、数据模型和关键风险。

- [成品化与运维方案](engineering/PRODUCTIONIZATION_PLAN.md)  
  从开发态到可长期使用的分阶段工程方案和当前完成情况。

- [部署与运维](operations/DEPLOYMENT.md)  
  本地启动、Docker 部署、环境变量、备份恢复、当前数据迁移到 Docker、发布检查。

- [NiniMenu 借鉴报告](reference/NINIMENU_BENCHMARK.md)  
  对 TryHarder-L/NiniMenu 的产品和工程实践分析。

- [成品与迁移完成审计](audit/PRODUCTION_READINESS_AUDIT_2026-06-09.md)  
  对照产品痛点、代码证据、测试结果和 Docker 迁移包的完成审计。

- [历史资料说明](reference/SOURCES.md)  
  `docs/source/ac/`、`app/data/`、线稿资产、归档文档的定位和使用方式。

- [代码观察报告](../CODE_REVIEW_DISCOVERY.md)  
  结合代码、文档和参考项目的观察报告。

## 当前账号模型

- 显示名：猪猪，角色 admin。
- 显示名：猪宝，角色 member。
- 旧 `momo/partner` 仅作为兼容别名保留，不再出现在用户页面。

具体用户名、密码和生产安全要求请看 [部署与运维](operations/DEPLOYMENT.md)。

## 文档维护规则

1. 面向用户的文案优先写成家里日常会说的话，避免“系统、平台、操作系统”等硬术语。
2. 新功能先更新产品或实施文档，再改代码。
3. API、数据模型、部署和备份变更必须同步更新架构和部署文档。
4. 阶段性审计、临时计划、外部参考放入对应子目录，不堆在根目录。
5. `docs/source/ac/` 是历史原始资料区，保留其原始内容。

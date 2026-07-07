# 资料来源说明

## `docs/source/ac/`

`docs/source/ac/` 下有 124 个 Markdown 历史笔记，内容混合：

- 周菜单计划
- 次日便当安排
- 盒马/购物清单
- 菜谱做法
- 做饭复盘
- 私人笔记
- 技术资料
- 旅行和其他非菜谱内容

当前脚本 `scripts/import-data.ts` 读取 `docs/source/ac/` 目录。正式化后建议把导入能力产品化：

1. 上传历史 Markdown。
2. 自动分类：周计划/菜谱/复盘/购物清单/无关资料。
3. AI 辅助结构化。
4. 人工确认。
5. 入库并保留来源链接。

## `app/data/`

这里是种子数据与导入报告：

- `recipes.json`
- `ingredients.json`
- `tips.json`
- `tags.json`
- `week-plan.json`
- `fridge.json`
- `import-report.json`

正式运行数据应以 SQLite 为准，JSON 只作为 seed/offline fallback。

## `public/line-arts/`

食材线稿资产目录。部分文件来自小云雀/XYQ 生成，部分为早期 SVG。  
建议后续将图片元信息写入数据库，例如生成来源、候选图、选中图、审核状态。

## `tmp-line-art-sheets/`

线稿核查临时目录，用于生成编号 sheet、重命名计划和人工校验。  
不属于正式产品资产，可在确认无用后清理，但清理前先确认没有未迁移的映射表。

## `docs/archive/`

历史文档归档。它们记录了项目在不同日期的判断和修复过程，可能与当前代码事实不完全一致。新开发请以 `docs/` 当前文档和实际代码为准。

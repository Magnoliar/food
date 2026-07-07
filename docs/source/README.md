# 原始资料区

这里存放尚未完全产品化的历史资料和导入来源。

## `ac/`

历史 Markdown 笔记目录，共 124 篇。内容包括周菜单、菜谱、做饭复盘、购物清单，也混有技术资料、旅行资料和私人笔记。

当前导入脚本：

```bash
npx tsx scripts/import-data.ts
```

脚本会读取 `docs/source/ac/`，输出 `app/data/import-report.json`。后续可再用：

```bash
npx tsx scripts/import-to-db.ts
```

把导入报告写入数据库。

注意：不要直接把这里的所有 Markdown 当作产品文档，它们是历史原料，需要分类、清洗和人工确认。


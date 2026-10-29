# 数据目录

课程快照与研究核查截至 **2026-10-29**，当前开课范围为 **Spring 2027 / 202701 的 1009 个课号**。大纲来源覆盖的是历史学期，不能代替当前考试政策。

| 位置 | 用途 | Git |
| --- | --- | --- |
| [`raw/`](raw/) | QUACS 固定提交的课程、分班、简介、许可与哈希 | 提交 |
| [`syllabi/`](syllabi/README.md) | 18,510 份清理后的 Markdown、34 学期索引、2,055 个历史课号索引 | **按用户要求提交** |
| [`evidence.json`](evidence.json) | 原有人工审核的考核证据 | 提交 |
| [`research/syllabus-reviews.json`](research/syllabus-reviews.json) | 468 门课程的考核条目复核；`verdict: null` 仅作补充，不改变分类 | 提交 |
| [`evidence-syllabi.json`](evidence-syllabi.json) | 由人工复核记录派生的大纲证据，勿直接修改 | 提交 |
| [`research/course-classification.json`](research/course-classification.json)、[可读表格](research/course-classification.md) | 全部 1009 门的最终归类、依据说明、逐班结论 | 提交 |
| [`research/classification-review-summary.json`](research/classification-review-summary.json) | 本轮 446 门前后归类变化与统计 | 提交 |
| [`research/syllabus-analysis.jsonl`](research/syllabus-analysis.jsonl) | 当前 1009 门逐课匹配、所有匹配历史文档、规则检出的条款与拒绝原因 | 提交 |
| [`research/syllabus-analysis-summary.json`](research/syllabus-analysis-summary.json) | 匹配覆盖及机器扫描汇总 | 提交 |
| [`research/syllabus-title-mismatches.json`](research/syllabus-title-mismatches.json) | 同课号但标题/班型不符的待核实清单 | 提交 |
| [`excluded.json`](excluded.json)、`research/` 中其他文件 | 既有排除依据、人工/初步搜索、期末表及项目事实 | 提交 |
| `aefis.local/`、其他 `*.local` | 原始 HTML、下载与转换缓存、诊断、会话等本地资料 | 忽略 |
| `../public/data/` | 网页使用的 JSON/CSV；由构建生成，不包含完整大纲正文 | 提交派生结果 |

日常检索与大纲库字段见 [`syllabi/README.md`](syllabi/README.md)。无需 RPI 登录、PageSift 服务或密钥即可读取已提交的 Markdown、重跑分析与构建网页。

修改原文或标题别名后执行 `bun run syllabi:analyze`；修改人工复核后执行 `bun run data:build`。完成数据修改必须执行 `bun run data:audit`、`bun test`。代码变更另执行 `bun run check` 和 `bun run build`。

自动检出的考试/测验语句只供排查，不能直接升格为考核分类。网页的考核分类来自人工审核证据；自动检出只留在研究数据中，网页的测验提醒采用已复核证据。不得以课程名称、上课地点、空页面或没有搜索结果推断免考。

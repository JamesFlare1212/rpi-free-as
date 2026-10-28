<img src="assets/icon.svg" width="64" height="64" alt="">

# Course Atlas · RPI 选课研究室

Spring 2027 课程目录与考试形式研究网页。使用 **Svelte 5 + Vite 8 + TypeScript 6 + Tailwind CSS 4 + shadcn-svelte + Bun**；全部数据在浏览器本地筛选，无需 API Key 或后台。

```bash
bun install --frozen-lockfile
bun run dev
```

打开终端显示的本地地址。生产构建运行 `bun run build`，可把 `dist/` 部署到任意静态托管平台；`bun run preview` 可查看构建结果。

## 目前的研究覆盖

核查日期：**2026-10-28**。QUACS 快照来自固定提交 `a3977a08f9c19acd20023658d0b43d3300b8ca7d` 的 `semester_data/202701/courses.json`。

| 内容 | 数量 |
| --- | ---: |
| 本学期开课的唯一课号 | 1,009 |
| 班次 | 2,994 |
| 学科 | 45 |
| 附可归属依据的课程 | 24 |
| 证据记录（一个来源可关联交叉课号） | 22 |
| 候选线索课程（含历史项目制、线上及 take-home） | 18 |
| 本学期考试政策已确认 | **0** |
| 考试形式未知 | 985 |
| 已检索但拒绝关联的线索 | 9 |

**已完成全量课程导入，但没有完成 1,009 门课程的逐门穷尽检索。** 24 门附有依据不等于 24 门免考。公开检索涵盖 RPI 教师主页、课程大纲、课程网站、RCOS 手册和 r/RPI 学生讨论。Spring 2027 尚未开始，当前没有找到能确认该学期考试政策的公开大纲。没有证据的课程保持未知。

本学期官方 [CSCI 专题说明](https://www.cs.rpi.edu/~goldsd/docs/s27-topics-courses.txt)明确提到 CSCI-4968 / 6968 的评分主要由作业和小组研究项目组成；这是本学期项目制线索，原文没有承诺免考。

代表性线索包括 Platts 的 Chemistry of the Environment 学生回忆、Greene 的经济学课程线上考核线索、Program Analysis 的历史 take-home 期末信息，以及 RCOS 的完整项目评分表。每条记录均附原文短摘、来源 URL、学期、教师、核查日期和限制条件。证据不足的推断会明确标注。

不能把 Online 上课地点、网上交卷、未排期末考试、项目课名称或搜索不到考试条款当成线上考试 / 免考证明。Take-home、无期末、项目制、完全无考试也分别分类。Network Programming 保留了 2021 学生“无考试”与 2025 正式大纲“20% 期中考试”的冲突；旧 Graph Mining 大纲不会套到 2027 同课号的 Deep Learning on Graphs。

## 网页功能

- 全部课程、候选线索、来源库、浏览器本地收藏；支持课号 / 标题 / 教师组合搜索。
- 按考核形式、学科、本科 / 研究生、来源类型筛选；可排除已知有测验的记录。
- 证据抽屉展示原文摘录、历史教师、适用班次、CRN、上课时间和名额快照。
- CSV 导出当前筛选结果及来源，完整 JSON 下载；URL 保留筛选与课程详情，便于分享。
- 移动端布局、键盘操作及自托管开源中英文字体，无字体服务请求。

## 数据与维护

```bash
# 获取最新 QUACS 数据：先解析提交，再用同一个提交拉取全部文件
bun run data:refresh
bun run data:build
bun run data:audit
# 可选：检查证据链接是否仍可访问（不自动改写考核结论）
bun run sources:check

# 应用和证据规则验证
bun run check
bun run test
bun run build

# 浏览器测试（初次需安装 Chromium）
bunx playwright install chromium
bun run test:browser
```

`data/raw/` 保留完整上游课程、目录、院系、MIT 许可及 SHA-256 清单。`data/evidence.json` 是人工审核的证据源；`data/excluded.json` 保留拒绝匹配的线索；`data/research-log.json` 记录代表性检索式及研究边界；`data/source-checks.json` 保存所有证据 URL 的 HTTP 可访问性。`public/data/` 由构建脚本生成。修改证据后必须重建派生数据。

新增证据需要给出实际读取的来源、原文短摘、适用学期、教师及标题匹配规则。`matchInstructor` 可以限定同课号内的班次。`scope: current` 仅允许确认为 Spring 2027 的政策；历史记录不能升格为当前保证。学分、名额和时间均为快照，选课前需回 QUACS / SIS 核对。

## 官方 Skill 与项目 MCP

官方入口：[shadcn-svelte llms.txt](https://www.shadcn-svelte.com/llms.txt)。官方 [Skills 文档](https://shadcn-svelte.com/docs/skills) 指向 `huntabyte/shadcn-svelte`。

官方 Skill 已安装至 `.claude/skills/shadcn-svelte/`，含 `SKILL.md`、规则与 CLI 参考。此环境的 `.agents/` 与 `.codex/` 为只读目录，因此使用可写的项目级目录，并在 `AGENTS.md` 中明确要求读取该 Skill；后续会话可按该入口使用。

**官方 llms.txt 未列出独立 MCP 安装入口。** 检索到的第三方 shadcn-svelte 文档 MCP 返回 Cloudflare 522，未将失效服务冒充为安装成功。项目改为实现一个本地、只读的文档 MCP：

- 服务源码：`scripts/shadcn-mcp.ts`；基于 Model Context Protocol 官方 SDK，通过 stdio 运行。
- 内容：从官方仓库固定提交缓存的 135 份文档，记录在 `data/integrations/shadcn-manifest.json`，附上游 MIT 许可。
- 工具：`list_docs`、`read_doc`、`get_project_context`。只读白名单中的官方文档及本项目组件配置 / Skill，不安装包或写入文件。
- 编辑器配置：`.mcp.json`（支持该格式的客户端）与 `.vscode/mcp.json`。客户端重载配置后连接；本会话工具清单不会自动变化。
- 本地服务由本项目维护，**不是 shadcn-svelte 官方发布的 MCP**。运行 `bun run mcp:check` 可验证握手、读取组件文档、项目上下文和路径白名单限制。已通过验证，结果存于 `data/integrations/mcp-check.json`。

如果客户端要求绝对路径，将配置中的 `scripts/shadcn-mcp.ts` 解析到当前项目。其他客户端可使用命令 `bun`、参数 `["/项目绝对路径/scripts/shadcn-mcp.ts"]`，无需令牌。

上游：[QUACS](https://quacs.org/spring2027/#/)、[QUACS 数据](https://github.com/quacs/quacs-data)、[shadcn-svelte](https://github.com/huntabyte/shadcn-svelte)。本项目与 RPI / QUACS 无隶属关系，不承诺课程难度或成绩。

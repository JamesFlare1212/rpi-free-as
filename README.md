<img src="assets/icon.svg" width="64" height="64" alt="">

# Course Atlas · RPI 选课研究室

Spring 2027 课程目录与考试形式研究网页。使用 **Svelte 5 + Vite 8 + TypeScript 6 + Tailwind CSS 4 + shadcn-svelte + Bun**；全部数据在浏览器本地筛选，无需 API Key 或后台。

```bash
bun install --frozen-lockfile
bun run dev
```

打开终端显示的本地地址。生产构建运行 `bun run build`，可把 `dist/` 部署到任意静态托管平台；`bun run preview` 可查看构建结果。

## 目前的研究覆盖

核查日期：**2026-10-29**。QUACS 快照来自固定提交 `a3977a08f9c19acd20023658d0b43d3300b8ca7d` 的 `semester_data/202701/courses.json`。

| 内容 | 数量 |
| --- | ---: |
| 本学期开课的唯一课号 / 班次 / 学科 | 1,009 / 2,994 / 45 |
| AEFIS 历史 Markdown 页面 / 源站可见学期 | 18,510 / 34 |
| 历史库课号（不局限于当前开课） | 2,055 |
| 当前课程匹配到历史正文 | 596 |
| 当前课程只匹配到空大纲页面 | 29 |
| 同课号但分班标题或班型不符，未套用 | 147 |
| 历史库未收录课号 | 237 |
| 本轮读取匹配历史正文 / 人工复核考核说明 | 8,520 / 468 门 |
| 附有经审核考核资料的课程 / 证据记录 | 554 / 658 |
| 候选线索（含项目、平时考核及部分班次线索） | 248 |
| 人工公开搜索后仍未确认 / 公开搜索仅初步阶段 | 7 / 448 |
| 考试形式未明（含仅历史排期） | 468 |
| 本学期考试政策已确认 | **0** |

**全部 1009 门已重新逐课归类，446 门改变分组。** 对可匹配的历史资料核对考核条目，并结合既有来源；468 门形成大纲条目复核，其他课程按可归属证据或不足状态裁决。全部课号、分班及未确认项均保留，不把“已复核”写成“本学期政策已确认”。逐课结果见 [course-classification.md](data/research/course-classification.md)，前后变化见 [classification-review-summary.json](data/research/classification-review-summary.json)。

本轮归类：有考试 279、项目／作品评分 131、作业／平时考核 69、无考试线索 32、线上线索 1、take-home 7、仅无期末 5、仅期末项目 3、历史排期但形式未知 13、按教师／班次区分 10、冲突 4、无充分依据 455，合计 1009。以上均按各自来源学期解读，未新增 Spring 2027 考试政策确认。

重点修正：CSCI-2300 的 Gao 大纲明确考试现场进行；Greene 的 INQR-1200 / ECON-4130 均含课堂纸笔考试；Manipulator Kinematics 系列与 PHYS-2210 虽有期末项目，仍有学期内考试。Midterm Paper、Design Review、Peer Evaluation 不按考试关键词误收。项目或作业评分独立归类，保留测验；同课号不同教师、H／校内班以逐班结论呈现，未知班次不继承其他班次政策。

大纲仅作为网页内容的支撑。页面已移除归档状态筛选、大纲库面板、Markdown 路径和哈希展示；保留简短考核事实、来源、教师／学期限制与测验警告。

可提交的完整 Markdown、索引及查询说明见 [data/syllabi/README.md](data/syllabi/README.md)，全部数据结构见 [data/README.md](data/README.md)。原始 HTML 和转换缓存仍留在忽略的本地目录；网页部署只包含短摘和轻量研究结果。

此前的人工研究还使用以下来源：

- 教务处公开的 [Fall 2026 期末考试 / 项目表](https://registrar.rpi.edu/services/class-scheduling/final-exam-schedule)：按历史 CRN 和课名核对，可关联 108 门当前课程。REMOTE 只表示历史期末远程，FINAL PROJECT / PAPER 只表示期末项目 / 论文，TBA 不证明考试形式。排除课号复用及单导师研究班次。
- [建筑学院 2025 APR](https://www.arch.rpi.edu/wp-content/uploads/2025_RPI_APR_two_programs.pdf)：读取 761 页报告中的历史大纲，为 21 门当前课程补充完整评分或明确考试条款，并记录 PDF 页码。数字建构、设计工作室与作品集的项目线索，以及 Structures / Professional Practice 的考试反例分别保留。
- [RPI at Work](https://rpiatwork.rpi.edu/single-course)：30 门课程通过项目清单、逐课预览 PDF 和 RPIStudio 通用无 tests / quizzes 政策交叉对应。**仅匹配 H 班，在职项目有准入要求；不适用于同课号校内班，也不是 Spring 2027 逐门政策确认。** 校内班筛选会剔除 H 班证据并重新计算结论。
- Rate My Professors：仅使用明确考核描述，核对学校、教师、课号和评论日期。新增 MGMT 2430 的 Jain take-home、MGMT 4100 的 Hekimoglu 两次 take-home、CHME 4010 的 Baysal 线上 tests，以及 PHYS 1150 的“只有期末线上、另有两次线下考试”等经验；不以评分高低证明免考。
- [Data Analytics Fall 2026](https://tw.rpi.edu/classes/data-analytics-fall-2026) 与同年春季页：6 个交叉课号的完整作业 / 项目评分及无期末说明；[ITWS 4500](https://web.biggermatrix.com/syllabus.html) 项目制但 quizzes 占 30%；CSCI 4440 的 Sturman 历史 take-home 回复；MATH 4840 的 Holmes 大纲明确无期末、其他考试仍占 75%。

本学期官方 [CSCI 专题说明](https://www.cs.rpi.edu/~goldsd/docs/s27-topics-courses.txt)也提到 CSCI-4968 / 6968 的作业和研究项目评分；原文未保证免考。Spring 2027 尚未开始，历史和未注明学期的政策均不能升格为本学期保证。

不能把 Online 上课地点、网上交卷、未排考试、项目课名或搜索不到条款当成线上考试 / 免考证明。Network Programming 保留学生经验与正式期中考试大纲的冲突；旧 Graph Mining 不套用到同课号的 Deep Learning on Graphs。

## 网页功能

- 全部课程、候选线索、来源库、逐学科检索覆盖、浏览器本地收藏；支持课号 / 标题 / 教师组合搜索。
- 按考核形式、学科、本科 / 研究生、来源类型、在职 H 班 / 校内班筛选。
- 证据抽屉展示原文短摘、历史教师、适用班次、CRN、逐班考核线索、测验警告、上课时间和名额快照。
- CSV 导出当前筛选结果、来源定位和证据适用 CRN，完整 JSON 与查询记录下载；URL 保留筛选与课程详情，便于分享。
- 移动端布局、键盘操作及自托管开源中英文字体，无字体服务请求。

## 数据与维护

```bash
# 获取最新 QUACS 数据：先解析提交，再用同一个提交拉取全部文件
bun run data:refresh
bun run data:build
bun run data:audit
# 可选：检查证据链接是否仍可访问（不自动改写考核结论）
bun run sources:check

# 本地历史库：无需登录或 PageSift 服务
bun run syllabi:query --course=CSCI-4220
bun run syllabi:analyze

# 应用和证据规则验证
bun run check
bun run test
bun run build

# 浏览器测试（初次需安装 Chromium）
bunx playwright install chromium
bun run test:browser
```

`data/raw/` 保留完整上游课程、目录、院系、MIT 许可及 SHA-256 清单。`data/evidence.json` 是既有人工审核证据；`data/research/syllabus-reviews.json` 是本轮逐项大纲复核源，构建派生出 `data/evidence-syllabi.json`；`data/excluded.json` 保留拒绝匹配的线索；`data/research-log.json` 保留首轮代表性检索；`data/research/searches.json` 保存人工定向查询与排除说明，`initial-searches.json` 保存 792 门实际执行的初步查询；同目录下保存期末表、在职项目及建筑大纲的来源哈希和匹配事实；`data/source-checks.json` 保存所有证据 URL 的 HTTP 可访问性。`data/syllabi/` 保存按用户要求提交 Git 的清理 Markdown 与完整索引；`data/research/syllabus-analysis.jsonl` 保存全部 1009 门的逐文档匹配与规则线索，`course-classification.json` / `.md` 保存完整归类裁决；这些研究资料作为后台支撑，不作为面向选课的归档功能展示。`public/data/` 由构建脚本生成，包含逐课轻量匹配结果，不包含完整大纲正文。修改原文/别名后先重跑分析，修改人工证据后必须重建派生数据。

新增证据需要给出实际读取的来源、短摘或精确来源定位、适用学期、教师及标题匹配规则。`matchInstructor` 限定教师，`sectionPattern` 限定班次（例如 `^H`）。本轮用户明确授权的 Markdown 提交到 `data/syllabi/`；原始 HTML/PDF、下载缓存、会话和密钥保持忽略。网页只发布短摘、事实和来源哈希。`scope: current` 仅允许确认为 Spring 2027 的政策；历史记录不能升格为当前保证。学分、名额和时间均为快照，选课前需回 QUACS / SIS 核对。

## 官方 Skill 与项目 MCP

官方入口：[shadcn-svelte llms.txt](https://www.shadcn-svelte.com/llms.txt)。官方 [Skills 文档](https://shadcn-svelte.com/docs/skills) 指向 `huntabyte/shadcn-svelte`。

官方 Skill 安装在标准项目级目录 [`.agents/skills/shadcn-svelte/`](.agents/skills/shadcn-svelte/SKILL.md)，保留完整 `SKILL.md`、规则、CLI 参考和资源。Codex 会自动扫描 `.agents/skills/`；其他代理可通过 `AGENTS.md` 的统一入口读取，文档 MCP 的 `get_project_context` 也读取同一份内容。技能随仓库提交，只保留这一份副本，不使用 Claude 专属目录。

**官方 llms.txt 未列出独立 MCP 安装入口。** 检索到的第三方 shadcn-svelte 文档 MCP 返回 Cloudflare 522，未将失效服务冒充为安装成功。项目改为实现一个本地、只读的文档 MCP：

- 服务源码：`scripts/shadcn-mcp.ts`；基于 Model Context Protocol 官方 SDK，通过 stdio 运行。
- 内容：从官方仓库固定提交缓存的 135 份文档，记录在 `data/integrations/shadcn-manifest.json`，附上游 MIT 许可。
- 工具：`list_docs`、`read_doc`、`get_project_context`。只读白名单中的官方文档及本项目组件配置 / Skill，不安装包或写入文件。
- 编辑器配置：`.mcp.json`（支持该格式的客户端）与 `.vscode/mcp.json`。客户端重载配置后连接；本会话工具清单不会自动变化。
- 本地服务由本项目维护，**不是 shadcn-svelte 官方发布的 MCP**。运行 `bun run mcp:check` 可验证握手、读取组件文档、项目上下文和路径白名单限制。已通过验证，结果存于 `data/integrations/mcp-check.json`。

如果客户端要求绝对路径，将配置中的 `scripts/shadcn-mcp.ts` 解析到当前项目。其他客户端可使用命令 `bun`、参数 `["/项目绝对路径/scripts/shadcn-mcp.ts"]`，无需令牌。

上游：[QUACS](https://quacs.org/spring2027/#/)、[QUACS 数据](https://github.com/quacs/quacs-data)、[shadcn-svelte](https://github.com/huntabyte/shadcn-svelte)。本项目与 RPI / QUACS 无隶属关系，不承诺课程难度或成绩。

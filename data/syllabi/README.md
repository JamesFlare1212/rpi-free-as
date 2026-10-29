# AEFIS 历史大纲库

采集日期：**2026-10-29**。来源为 [RPI AEFIS Course Section Manager](https://assessment.rpi.edu/index.cfm/page/AefisCourseSection.Manager) 中未按学期过滤的学术课程目录（`CoCurricular=false`），共 **34 个源站可见学期、18,510 个唯一 courseSectionId、2,055 个课号**。范围从 2020 夏季到 2026 秋季，学期名称和代码保持源站原值。这里的“全部”限于采集时入口列出的学期及分班，不声称包含隐藏、未发布或尚未出现的学期。

其中 **3,014** 个页面明确显示没有默认大纲，其他 **15,496** 个页面未出现该提示；空大纲页仍保留以便审计。`hasSyllabus` 是这一页面级标记，不是对教学内容完整性的保证。

用户已明确要求把这些 Markdown 放入 `data/` 并提交 Git。Markdown 正文约 **235.8 MB**（十进制）；原始 HTML、PDF、登录会话、下载中间文件、PageSift 二进制和密钥均不放入此提交目录。网站只发布短摘、研究事实和来源定位，不将全部 Markdown 复制到 `public/`。

## 目录与查阅

```text
data/syllabi/
  README.md
  TERMS.md                         # 34 学期的数量和目录入口
  manifest.json                    # 范围、数量、索引哈希
  index.jsonl                      # 每个分班一行，按学期/课号/标题/班次排序
  title-aliases.json                # 人工核准的精确标题缩写，非模糊匹配
  by-course/ECSE/ECSE-2010.md       # 按课号查全部历史分班
  markdown/202609/ECSE/ECSE-2010/
    02--19481.md                   # 班次号--courseSectionId.md
```

按学期从 [`TERMS.md`](TERMS.md) 开始；按课号查看 `by-course/<学科>/<课号>.md`。同一课号可能包含不同专题，索引同时显示标题、教师和学期，不能仅凭课号合并政策。

```bash
# 元数据检索，默认按最近学期排序；所有参数可组合
bun run syllabi:query --course=CSCI-4220
bun run syllabi:query --subject=ECSE --term=202609 --limit=50
bun run syllabi:query --course=MGMT-6140 --keyword=quiz --json
bun run syllabi:query --title=Network --keyword=exam

# 直接用 ripgrep 搜正文
rg -n -i 'no exams|take.home|quizzes' data/syllabi/markdown/202601/ECSE/
```

检索空页面用 `index.jsonl` 的 `hasSyllabus: false`；当前课程的匹配结果在 [`../research/syllabus-analysis.jsonl`](../research/syllabus-analysis.jsonl)。两者分开：历史库含 2,055 个课号，网页仅显示当前开课的 1009 个课号。

## 元数据与来源

Markdown 文件开头的 YAML 包含 `courseSectionId`、`courseId`、`title`、`section`、`sourceTerm`、`sourceTermCode`、`sourceUrl`、`sourceHtmlSha256` 和转换检查标记。正文由 **PageSift 0.81.0 本地引擎**提取课程主区域，去除登录、导航和站点外壳；修复部分源 HTML 的列表容器和词间空格，不要求逐字还原版式。原始 HTML 保持在忽略的本地缓存中。

`index.jsonl` 每行的主要字段：

| 字段 | 含义 |
| --- | --- |
| `id`, `courseId`, `title`, `section` | 源站分班 ID、课号、分班标题、班次 |
| `termCode`, `term`, `subject`, `instructors` | 源站学期、学科和历史教师 |
| `path` | 相对本目录的 Markdown 路径 |
| `url`, `canonicalUrl` | 实际读取入口和标准 `SyllabusForm?courseSectionId=...` 入口；原站可能需登录 |
| `sha256`, `bytes` | 该 Markdown 的 SHA-256 和字节数 |
| `htmlSha256` | 未修改的源 HTML 的 SHA-256 |
| `hasSyllabus` | 原页面未显示“无默认大纲”提示 |
| `formattingReview`, `conversion` | 转换检查提示及版本；不是政策可靠性评分 |

源站的登记学期可能与正文中的沿用日历不一致；两者应保留，不能凭“Last updated”或采集日期把旧政策改为当前政策。正文中的通用学术诚信条款也不能当作本课安排考试的依据。

## 分析与维护

```bash
# 已提交的 Markdown 即可独立重跑，无需下载/转换服务
bun run syllabi:audit
bun run syllabi:analyze
bun run data:build
bun run data:audit
bun test

# 仅维护者从本地转换缓存重新导入时使用
bun run syllabi:import --source=data/aefis.local
```

分析要求课号和规范化分班标题同时相符，H / 校内班分开。规范化仅处理大小写、标点、`&`、`AND`、`THE`；已核准的明确缩写以精确对照写入 `title-aliases.json`，每条必须说明理由。不同专题、泛称 TOPICS、教师指导研究课不能靠模糊相似度强行关联。

本轮匹配结果：**596** 门有历史正文、**29** 门仅空大纲、**147** 门标题或班型不符、**237** 门历史库未收录，合计 **1009** 门；读取匹配正文 **8,520** 份。已逐课完成 1009 门的归类裁决，468 门的考核条目复核另存 `data/research/syllabus-reviews.json`，共 469 条记录（468 条分类证据、1 条历史补充）。没有可归属证据的保留未知；这不等于对所有课程穷尽互联网调查。所有新证据均为历史范围，本学期考试政策新增确认数为 **0**。

`data/research/syllabus-analysis.jsonl` 保留规则检出语句、行号、标题、源文档及拒绝原因。`observed` 和 `findings` 不能直接当作结论；例如单次 take-home、仅无期末、条件性的远程备用方案，以及 midterm presentation 都不足以证明整门课免考或全远程。规则结果只作后台研究线索，不作为网页的大纲库功能；网页分类和测验提醒采用已复核的条目。

人工复核记录需包含原文短摘（最多 25 个词）、Markdown 行号、原学期与教师、评分事实、矛盾及限制。`verdict: null` 表示只补充事实，不改变现有分类。修改后重建网页；不能直接编辑 `data/evidence-syllabi.json` 或 `public/data/`。

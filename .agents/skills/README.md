# 项目共享 Skills

项目级技能保存在标准目录 `.agents/skills/`，随仓库提交。Codex 会扫描这个目录；其他代理可通过根目录 [`AGENTS.md`](../../AGENTS.md) 的显式入口读取。项目文档 MCP 的 `get_project_context` 也读取同一份技能。

| Skill | 入口 | 来源 |
| --- | --- | --- |
| shadcn-svelte | [SKILL.md](shadcn-svelte/SKILL.md) | 官方 `huntabyte/shadcn-svelte` 技能包 |

`shadcn-svelte/` 保留官方技能包原有的相对目录、规则、CLI 文档、代理元数据和图片资源。迁移逐文件校验 SHA-256，内容保持原样。编辑 UI 前读取该入口；升级时审查上游变更并保留相关资源和相对链接。

运行 `bun run mcp:check` 可验证 MCP 读取与路径白名单。

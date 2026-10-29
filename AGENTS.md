# Course Atlas

Use Bun for dependencies and scripts. This is a Svelte 5 + Vite + TypeScript + Tailwind 4 project.

The official shadcn-svelte skill is installed at [.agents/skills/shadcn-svelte/SKILL.md](.agents/skills/shadcn-svelte/SKILL.md). Read it before editing UI components. This is the shared repository copy in Codex's standard project discovery directory, `.agents/skills/`. Other agents and the project's documentation MCP read the same copy. Keep skill references independent of any vendor-specific configuration directory and maintain only this canonical copy.

Never infer exam modality from an online classroom, an absent final-exam slot, a course name, or lack of evidence. Preserve unknowns. Match course ID AND section title; topics course IDs are reused. Historical and undated evidence must never be promoted to Spring 2027 confirmation. Retain contradictions and quiz warnings. Source quotes must remain short. Do not commit complete (large) third-party syllabi into git, like PDFs.

The user explicitly approved the cleaned Markdown archive in `data/syllabi/` for Git. See `data/README.md` and `data/syllabi/README.md` for its structure, query commands, matching rules and maintenance. Keep original HTML/PDF, session data, API keys and `*.local` conversion/download caches out of Git and `public/`. After changing archive text, metadata or title aliases, run `bun run syllabi:analyze` before rebuilding data. Automatic extraction is a research lead; only manually reviewed records in `data/research/syllabus-reviews.json` may add verdict evidence. `verdict: null` records only add historical context. Do not edit generated `data/evidence-syllabi.json` directly.

Syllabi are background support for course classification. Do not expose archive-status filters, archive panels, Markdown paths or hashes as product features. Keep assessment facts, short source citations, quiz warnings and teacher/section boundaries visible. Do not reintroduce quiz-exclusion controls, filter logic or URL options. Every offered course must retain a classification decision in `data/research/course-classification.json`; use unknown when support is insufficient. Resolve differing teacher or H/campus policies by section instead of assigning one section's conclusion to the entire course.

After data changes run `bun run data:build`, `bun run data:audit`, and `bun test`. After code changes run `bun run check` and `bun run build`.

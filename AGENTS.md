# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## Agent Skills (addyosmani/agent-skills)

This project uses the [Agent Skills](https://github.com/addyosmani/agent-skills) pack — 24 production-grade engineering workflow skills organized by development phase.

### Core Rules
- If a task matches a skill, invoke it. Skills are in `.agents/skills/<skill-name>/SKILL.md`.
- Never implement directly if a skill applies.
- Always follow the skill instructions exactly (do not partially apply them).

### Lifecycle Mapping

- **DEFINE** → `spec-driven-development`, `interview-me`, `idea-refine`
- **PLAN** → `planning-and-task-breakdown`
- **BUILD** → `incremental-implementation`, `test-driven-development`, `frontend-ui-engineering`, `api-and-interface-design`, `context-engineering`, `source-driven-development`
- **VERIFY** → `debugging-and-error-recovery`, `browser-testing-with-devtools`
- **REVIEW** → `code-review-and-quality`, `code-simplification`, `security-and-hardening`, `performance-optimization`
- **SHIP** → `shipping-and-launch`, `git-workflow-and-versioning`, `ci-cd-and-automation`, `documentation-and-adrs`, `observability-and-instrumentation`, `deprecation-and-migration`

### Agent Personas
Use `@code-reviewer`, `@test-engineer`, `@security-auditor`, `@web-performance-auditor` in Copilot Chat for targeted reviews.

### Reference Checklists
Available in `.agents/references/`: definition-of-done, testing-patterns, security, performance, accessibility, observability, orchestration-patterns.

---

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

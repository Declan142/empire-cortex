---
name: scout-report
description: "Dispatch Scout agent to research a topic and deliver a structured report. Use when user needs research, investigation, codebase exploration, or information gathering before implementation."
argument-hint: "[research-topic]"
context: fork
agent: scout
allowed-tools: Read, Grep, Glob, WebFetch, WebSearch, Write, Edit
---

# /scout-report — Research Mission

Research the topic: $ARGUMENTS

## Process

1. Check agent memory first — have we researched this before?
2. Search the codebase for existing relevant files
3. Search the web for current best practices and solutions
4. Write findings to `.claude/artifacts/tasks/{id}/research.md`

## Output Format

Use the template at: ${CLAUDE_SKILL_DIR}/references/research-template.md

## Rules

- Use file references as `path:line` — never paste large code blocks
- Max 50 lines in the report body
- Include sources with links
- End with clear recommendation for Lead/Builder
- Compress observations, preserve decisions (ACON principle)

## Gotchas

- WebFetch fails on Twitter/X — use WebSearch instead
- Large repos: use Grep with head_limit, don't read entire files
- If research exceeds 20 tool calls, summarize what you have — don't burn tokens
- Always check if someone already researched this in artifacts/tasks/
- WebFetch may fail on authenticated pages — note the gap and move on

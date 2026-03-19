---
name: interview
description: "Conduct a deep requirements interview before building anything. Use when planning a feature, designing architecture, or when requirements are unclear and the user needs help thinking through the problem."
model: opus
argument-hint: "[plan-file-or-topic]"
---

# /interview — Deep Requirements Interview

Read the spec, plan file, or topic provided: $ARGUMENTS

If no file given, ask "What are we building?" first.

## Process

1. **Read the codebase first** — understand existing patterns, stack, conventions
2. **Interview using AskUserQuestionTool** — ask 3 questions at a time
3. **Cover these angles systematically:**
   - Technical implementation (data models, API design, state management)
   - UI & UX decisions (layout, interactions, error states)
   - Edge cases and error handling
   - Performance and scaling concerns
   - Security implications
   - Tradeoffs between approaches
   - Integration with existing code
4. **Continue until** user says "done" or all angles covered
5. **Write spec** to `.claude/artifacts/tasks/{id}/spec.md`

## Rules

- Ask NON-OBVIOUS questions only — skip anything you already know from the codebase
- Never ask "what language/framework?" — read the project and figure it out
- Group related questions (3 at a time max)
- If user gives one-word answers, probe deeper with follow-ups
- The spec must be detailed enough for a fresh Builder session to execute without questions

## Gotchas

- Don't assume the user has thought through everything — that's why they're using /interview
- Complex features can take 30-40 questions — don't rush to finish
- Always read existing code patterns before asking about architecture
- Write the spec in imperative form ("Add X to Y") not descriptive ("X should be added")
- Include file paths in the spec so Builder knows exactly where to work

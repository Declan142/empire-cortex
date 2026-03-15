---
name: scout-report
description: Send Scout to research a topic and deliver a structured report.
user_invocable: true
---

# /scout-report — Research Mission

Dispatch Scout to investigate a topic.

## Instructions
When the user runs `/scout-report`:

1. Ask: "What should Scout investigate?"
2. Spawn the Scout agent with the research task
3. Scout writes findings to `.claude/artifacts/tasks/{task-id}/research.md`
4. Display Scout's findings to the user
5. Update progress.json with the completed research task

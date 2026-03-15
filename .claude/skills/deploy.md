---
name: deploy
description: Run the full deployment pipeline — Scout researches changes, Builder implements, Critic reviews, then push.
user_invocable: true
---

# /deploy — Full Pipeline Deployment

Run the Empire deployment pipeline for the current task.

## Steps
1. **Scout phase**: Research what needs to change, gather context
2. **Builder phase**: Implement changes in a feature branch
3. **Critic phase**: Review the implementation
4. **Ship**: If Critic approves, create PR

## Instructions
When the user runs `/deploy`, execute this sequence:

1. Ask the user: "What are we deploying? (describe the task)"
2. Spawn Scout agent to research the codebase and gather context for the task
3. Read Scout's research from artifacts
4. Spawn Builder agent with the research context to implement
5. Read Builder's implementation summary
6. Spawn Critic agent to review Builder's changes
7. If Critic says APPROVE → create PR via `gh pr create`
8. If Critic says REQUEST_CHANGES → send issues back to Builder for one more round
9. If Critic says BLOCK → stop and report to user

Update progress.json after each phase.

# Git Workflow

- All implementation happens in feature branches
- Branch naming: `{agent}/{task-id}-{slug}` (e.g., `builder/42-add-auth`)
- Commits include `Co-Authored-By` for the agent that wrote them
- PRs require Critic review before merge
- Never push to main/master without CI passing
- Never force-push, ever
- Never delete branches you didn't create

---
name: git-ops
description: "Safe git operations — branch cleanup, stale branch detection, merge conflict resolution. Use when user asks about branch management, cleanup, or git maintenance."
disable-model-invocation: true
argument-hint: "[cleanup | branches | conflicts]"
---

# /git-ops — Safe Git Operations

Perform git maintenance operations safely.

## Commands

### `/git-ops cleanup`
- List merged branches that can be safely deleted
- Show stale branches (no commits in 30+ days)
- Ask user for confirmation before deleting anything
- NEVER delete `main`, `master`, or current branch

### `/git-ops branches`
- Show all branches with last commit date and author
- Highlight branches ahead/behind main
- Show which branches have open PRs

### `/git-ops conflicts`
- Check current branch for merge conflicts with main
- Show conflicting files
- Suggest resolution strategy

## Safety Rules

- NEVER force-push
- NEVER delete branches you didn't create (check author)
- ALWAYS ask for confirmation before destructive operations
- NEVER operate on main/master branch

## Gotchas

- `git branch -d` fails on unmerged branches — use it, don't use `-D`
- Remote branches need `git fetch --prune` first to see accurate state
- Worktree branches can't be deleted while worktree exists
- `git branch --merged` may include branches merged to non-main branches — verify target

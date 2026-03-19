# Deploy Gotchas — Observed Failures

## Git Issues
- Branch already exists → `git checkout` instead of `git checkout -b`
- Forgot to pull → merge conflicts on PR
- Worktree confusion → `git rev-parse --show-toplevel` to verify location

## Test Issues
- Tests pass locally but CI fails → check node version, env vars
- Pre-existing test failures → document, don't fix in the deploy PR
- Test timeout → increase timeout or skip flaky tests with note

## PR Issues
- `gh` not authenticated → `gh auth status` first
- PR description too long → keep under 500 chars, use body for details
- Forgot to push branch → `git push -u origin {branch}` before `gh pr create`

## Critic Issues
- Critic blocks for style issues → fix and retry once
- Critic finds security issue → stop pipeline, report to user
- Critic and Scout disagree → user makes final call

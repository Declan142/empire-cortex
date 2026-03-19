---
name: careful
description: "Activate production safety mode — blocks destructive commands like rm -rf, DROP TABLE, force-push, and kubectl delete. Use when working with production systems or sensitive data."
disable-model-invocation: true
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/scripts/block-destructive.sh"
---

# Production Safety Mode — ACTIVE

The following commands are now **blocked** via PreToolUse hook:

- `rm -rf` / `del /s /q` / `Remove-Item -Recurse -Force`
- `DROP TABLE` / `TRUNCATE` / `DELETE FROM` (without WHERE)
- `git push --force` / `git reset --hard` / `git clean -fd`
- `kubectl delete` / `docker rm -f` / `docker system prune`

This is enforced **deterministically** via shell script — Claude cannot override it.

Start a new session to deactivate.

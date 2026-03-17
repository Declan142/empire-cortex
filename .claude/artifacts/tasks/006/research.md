# Research: Task 006 — Express Rate Limiter Middleware

## Findings

### Requirements
- Track requests per IP using an in-memory `Map`
- Return HTTP 429 (Too Many Requests) when limit exceeded
- Auto-reset counters every 15 minutes via `setInterval`
- Standard Express middleware signature `(req, res, next)`

### Key Design Decisions
- Use `req.ip` for client identification (respects `trust proxy` setting)
- Store `{ count, firstRequest }` per IP in the Map
- Use a sliding window per-IP (reset 15min after that IP's first request) vs. global reset
- Recommendation: **per-IP window** is more fair; global reset causes burst edges
- Include `Retry-After` header in 429 responses (RFC 6585 compliance)
- Include `X-RateLimit-Remaining` and `X-RateLimit-Limit` headers for client visibility

### Risks
- In-memory Map won't scale across multiple processes/servers (acceptable for task scope)
- No cleanup of stale entries could cause memory growth — mitigate with the 15-min reset

### Recommendation
Builder should implement a configurable middleware factory with defaults: 100 requests per 15-minute window per IP. Global `setInterval` clears the entire Map every 15 minutes as specified.

# Twitter Nuke

Bulk-delete all tweets from a Twitter/X account. Two approaches included:

## 1. `twitter_nuke_browser.py` — Browser Automation (Recommended)

Uses Playwright to log into Twitter and delete tweets directly through the UI. No API keys needed — just your username and password.

**Why this over the API?**
- No developer account required
- No 3,200 tweet limit
- Deletes replies, quote tweets, everything
- Free — services like Redact charge $7-15/month for the same thing

### Requirements

```
pip install playwright python-dotenv
playwright install chromium
```

### Setup

Create a `.env` file in the `tools/` directory:

```
TWITTER_USERNAME=your_handle
TWITTER_PASSWORD=your_password
```

### Usage

```bash
# Delete all tweets (live)
python twitter_nuke_browser.py

# Delete tweets for a specific handle
python twitter_nuke_browser.py --handle myhandle

# Preview without deleting
python twitter_nuke_browser.py --dry-run
```

### How It Works

1. Launches a Chromium browser and logs into Twitter
2. Navigates to your profile's "Replies" tab (`/with_replies`)
3. For each tweet: clicks the `...` menu → Delete → Confirm
4. Logs every deletion to `twitter_nuke_log.jsonl`
5. Anti-detection: random delays, pauses every 20/100 deletions
6. Reloads the page if stuck to surface more tweets
7. Resumable — re-run anytime, skips already-deleted tweets

### Anti-Detection

- Random delays between actions (2-5s)
- 30-60s pause every 20 deletions
- 2-3 min pause every 100 deletions
- Uses a fresh browser profile each run
- `--disable-blink-features=AutomationControlled` flag

---

## 2. `twitter_nuke.py` — API Mode

Uses Twitter API v2 via Tweepy. Requires a developer account with Read+Write access. Limited to 3,200 most recent tweets unless you provide a Twitter archive.

```bash
# API mode
python twitter_nuke.py

# Archive mode (unlimited)
python twitter_nuke.py --archive /path/to/data/tweets.js

# Dry run
python twitter_nuke.py --dry-run
```

Requires API credentials in `.env`:
```
API_KEY=...
API_SECRET=...
ACCESS_TOKEN=...
ACCESS_TOKEN_SECRET=...
```

Rate limit: 50 deletes per 15 minutes (free tier). Handled automatically.

---

## Log Format

Both scripts log to `twitter_nuke_log.jsonl`:

```json
{"id": "1234567890", "preview": "tweet text here", "deleted_at": "2026-03-18T10:00:00+00:00"}
```

The log acts as a resume checkpoint. Safe to interrupt and re-run.

---

## Troubleshooting

**Browser script: Login fails** — Check your `.env` credentials. If Twitter asks for email/phone verification, the script handles it automatically using your handle.

**Browser script: Gets stuck on one tweet** — The script reloads the page after 15 empty scrolls and resets. If a tweet has no Delete option (e.g., someone else's tweet in your feed), it's skipped.

**API script: 403 Forbidden** — App permissions are Read Only. Set to Read+Write in the developer portal and regenerate tokens.

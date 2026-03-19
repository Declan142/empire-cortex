---
name: tweet-nuke
description: "Delete tweets and replies from Twitter/X using browser automation. Use when user wants to clean up their Twitter account, delete old tweets, or remove replies."
disable-model-invocation: true
argument-hint: "[--replies-only | --dry-run]"
---

# /tweet-nuke — Twitter Cleanup Tool

Delete tweets from Twitter/X using Playwright browser automation.

## Usage

- `/tweet-nuke` — delete all tweets and replies
- `/tweet-nuke --replies-only` — only delete replies, keep original posts
- `/tweet-nuke --dry-run` — preview count without deleting

## How It Works

1. Launch Chromium via Playwright (NOT headless — Twitter detects it)
2. Log into Twitter using .env credentials
3. Navigate to profile's /with_replies tab
4. For each tweet: click ... menu → Delete → Confirm
5. Log every deletion to `twitter_nuke_log.jsonl`

## Prerequisites

- `.env` file in `D:/~Claude/tools/` with:
  - `TWITTER_USERNAME`
  - `TWITTER_PASSWORD`
- Python packages: `playwright`, `python-dotenv`
- Chromium installed: `playwright install chromium`

## Gotchas

- Twitter may ask for phone/email verification mid-login — script handles it
- Anti-detection pauses: random delay per tweet, bigger pause every 20/100 deletions
- If stuck on one tweet, reloads page after 15 empty scroll rounds
- Browser must NOT be headless — set `headless=False`
- `filter:replies` search operator no longer works — use /with_replies tab instead
- Login requires clicking "Log in" button, not pressing Enter (Twitter changed this)
- Rate limiting: Twitter may temporarily block after ~500 deletions — wait 30 min

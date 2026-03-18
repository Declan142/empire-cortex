# twitter_nuke.py

Bulk-delete all tweets from a Twitter/X account using the Twitter API v2.

Supports two modes:
- **API mode** (default): fetches up to 3,200 recent tweet IDs via the v2 timeline API
- **Archive mode** (`--archive`): reads all tweet IDs from a downloaded Twitter archive (no 3,200 limit)

Automatically respects the 50-deletes-per-15-minutes rate limit, logs every deletion, and can be safely resumed after interruption.

---

## Requirements

```
pip install tweepy python-dotenv
```

---

## Setup

### 1. Create a Twitter Developer App

1. Go to [developer.x.com](https://developer.x.com) and sign in.
2. Click **Projects & Apps** in the sidebar, then **+ Add App** (or create a new project first if prompted).
3. Give the app a name, e.g. `my-tweet-nuke`.
4. On the app settings page, go to **User authentication settings** and click **Edit**.
   - Set **App permissions** to **Read and write** (delete requires write).
   - Set **Type of App** to **Web App, Automated App or Bot**.
   - Enter any valid callback URL (e.g. `https://localhost/`) and website URL — these are required fields but not actually used here.
   - Save.
5. Go to the **Keys and tokens** tab.
   - Copy your **API Key** and **API Key Secret** (also called Consumer Key / Consumer Secret).
   - Under **Authentication Tokens**, click **Generate** next to **Access Token and Secret**.
   - Copy the **Access Token** and **Access Token Secret**.

> Important: the Access Token must be generated **after** you set permissions to Read and Write. If you generated it before, regenerate it.

### 2. Store credentials

Create a `.env` file in the same directory you run the script from:

```
API_KEY=your_api_key_here
API_SECRET=your_api_key_secret_here
ACCESS_TOKEN=your_access_token_here
ACCESS_TOKEN_SECRET=your_access_token_secret_here
```

Or export them as environment variables:

```bash
export API_KEY=...
export API_SECRET=...
export ACCESS_TOKEN=...
export ACCESS_TOKEN_SECRET=...
```

---

## Usage

### API mode (default) — up to 3,200 tweets

```bash
python twitter_nuke.py
```

### Archive mode — all tweets, including older than 3,200

```bash
python twitter_nuke.py --archive /path/to/twitter-archive/data/tweets.js
```

### Dry run — see what would be deleted without deleting anything

```bash
python twitter_nuke.py --dry-run
python twitter_nuke.py --archive tweets.js --dry-run
```

### Custom log file path

```bash
python twitter_nuke.py --log /path/to/my_log.jsonl
```

### Resume after interruption

Just run the same command again. The script reads the log file and skips any tweet IDs already recorded there.

---

## How to download your Twitter archive

1. Go to [x.com/settings/download_your_data](https://x.com/settings/download_your_data).
2. Click **Request archive** and confirm with your password.
3. Twitter will email you a download link (usually within a few minutes to a few hours).
4. Download and unzip the archive.
5. The file you need is at: `data/tweets.js` inside the unzipped folder.

Pass the path to that file with `--archive`:

```bash
python twitter_nuke.py --archive ~/Downloads/twitter-archive/data/tweets.js
```

---

## Log file format

Each line in `twitter_nuke_log.jsonl` is a JSON object:

```json
{"tweet_id": "1234567890", "timestamp": "2026-03-18T10:00:00+00:00", "dry_run": false}
```

The log doubles as the resume checkpoint. If the script is interrupted, re-run the same command and it will skip already-deleted tweets.

---

## Rate limits

Twitter's API v2 allows **50 tweet deletions per 15 minutes** under the free tier. The script handles this automatically: after every 50 deletes it prints a message and sleeps until the window resets.

Example output:

```
Authenticated as @yourhandle (id: 123456789)
Resuming: 150 tweet(s) already in log, will skip them.
Found 1622 tweets via API.
Deleting 1472 tweets...
  Deleted 1789012345  (1/1472)
  Deleted 1789012346  (2/1472)
  ...
Deleted 50/1472 tweets... sleeping 15.0 min (rate limit)
  ...
Done. 1472/1472 tweets deleted.
Log written to: /path/to/twitter_nuke_log.jsonl
```

---

## Troubleshooting

**"Missing credentials"** — Check that your `.env` file is in the current directory, or that the environment variables are exported in your shell.

**"403 Forbidden"** — Your app's permission level is set to Read Only. Go to the developer portal, set it to Read and Write, and regenerate your Access Token and Secret.

**"401 Unauthorized"** — Your credentials are wrong or expired. Regenerate the Access Token and Secret from the developer portal.

**"404 Not Found" for a tweet** — The tweet was already deleted (possibly by a previous run). The script logs it and moves on.

**Tweets older than 3,200 not found in API mode** — Use `--archive` mode. The v2 timeline endpoint only returns the 3,200 most recent tweets.

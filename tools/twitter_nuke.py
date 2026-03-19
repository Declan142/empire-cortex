#!/usr/bin/env python3
"""
twitter_nuke.py — Bulk-delete all tweets for a Twitter/X account.

Modes:
  API mode (default): fetches tweet IDs via GET /2/users/:id/tweets
  Archive mode (--archive): reads tweet IDs from a Twitter archive tweets.js

Rate limit: 50 deletes per 15 minutes (handled automatically).
Resumable: skips tweet IDs already recorded in the log file.
"""

import os
import sys
import json
import time
import argparse
import re
from datetime import datetime, timezone
from pathlib import Path

try:
    import tweepy
except ImportError:
    sys.exit("tweepy is not installed. Run: pip install tweepy")

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv is optional; fall back to real env vars


# ── Constants ────────────────────────────────────────────────────────────────

RATE_LIMIT_WINDOW = 15 * 60   # 15 minutes in seconds
RATE_LIMIT_DELETES = 50       # max deletes per window
LOG_FILE = Path("twitter_nuke_log.jsonl")


# ── Credentials ──────────────────────────────────────────────────────────────

def load_credentials() -> dict:
    keys = ["API_KEY", "API_SECRET", "ACCESS_TOKEN", "ACCESS_TOKEN_SECRET"]
    creds = {k: os.environ.get(k, "").strip() for k in keys}
    missing = [k for k, v in creds.items() if not v]
    if missing:
        sys.exit(
            f"Missing credentials: {', '.join(missing)}\n"
            "Set them as environment variables or add them to a .env file."
        )
    return creds


# ── Log helpers ───────────────────────────────────────────────────────────────

def load_already_deleted(log_path: Path) -> set:
    """Return tweet IDs already recorded in the log (for resumption)."""
    deleted = set()
    if not log_path.exists():
        return deleted
    with log_path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
                deleted.add(str(entry["tweet_id"]))
            except (json.JSONDecodeError, KeyError):
                pass
    return deleted


def log_deletion(log_path: Path, tweet_id: str, dry_run: bool) -> None:
    entry = {
        "tweet_id": tweet_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "dry_run": dry_run,
    }
    with log_path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")


# ── Tweet ID sources ──────────────────────────────────────────────────────────

def fetch_tweet_ids_from_api(client: tweepy.Client, user_id: str) -> list:
    """Fetch up to 3,200 tweet IDs via the v2 timeline endpoint."""
    tweet_ids = []
    pagination_token = None

    print("Fetching tweet IDs from API (max 3,200)...")

    while True:
        kwargs = {
            "id": user_id,
            "max_results": 100,
            "tweet_fields": ["id"],
        }
        if pagination_token:
            kwargs["pagination_token"] = pagination_token

        try:
            response = client.get_users_tweets(**kwargs)
        except tweepy.TweepyException as exc:
            sys.exit(f"API error while fetching tweets: {exc}")

        if response.data:
            for tweet in response.data:
                tweet_ids.append(str(tweet.id))

        # Check for next page
        meta = getattr(response, "meta", None) or {}
        pagination_token = meta.get("next_token") if isinstance(meta, dict) else getattr(meta, "next_token", None)
        if not pagination_token:
            break

        # Respect the timeline read rate limit (brief pause)
        time.sleep(1)

    print(f"Found {len(tweet_ids)} tweets via API.")
    return tweet_ids


def fetch_tweet_ids_from_archive(archive_path: Path) -> list:
    """
    Read tweet IDs from a Twitter archive tweets.js file.
    The file looks like:  window.YTD.tweets.part0 = [ {...}, ... ]
    """
    if not archive_path.exists():
        sys.exit(f"Archive file not found: {archive_path}")

    raw = archive_path.read_text(encoding="utf-8")

    # Strip the JS variable assignment prefix so we can parse JSON
    # Pattern: window.YTD.tweets.part0 = [...]
    match = re.search(r"=\s*(\[.*)", raw, re.DOTALL)
    if not match:
        sys.exit(
            "Could not parse tweets.js — expected format:\n"
            "  window.YTD.tweets.part0 = [ ... ]"
        )

    try:
        data = json.loads(match.group(1))
    except json.JSONDecodeError as exc:
        sys.exit(f"JSON parse error in tweets.js: {exc}")

    tweet_ids = []
    for item in data:
        # Archive wraps each tweet: {"tweet": {"id": "...", ...}}
        tweet = item.get("tweet", item)
        tid = str(tweet.get("id") or tweet.get("id_str", ""))
        if tid:
            tweet_ids.append(tid)

    print(f"Found {len(tweet_ids)} tweets in archive.")
    return tweet_ids


# ── Deletion engine ───────────────────────────────────────────────────────────

def delete_tweets(
    client: tweepy.Client,
    tweet_ids: list,
    already_deleted: set,
    log_path: Path,
    dry_run: bool,
) -> None:
    pending = [tid for tid in tweet_ids if tid not in already_deleted]

    if not pending:
        print("Nothing to delete — all tweets already processed.")
        return

    total = len(pending)
    deleted_count = 0
    window_count = 0   # deletes in the current 15-min window
    window_start = time.monotonic()

    print(f"{'[DRY RUN] Would delete' if dry_run else 'Deleting'} {total} tweets...")

    for i, tweet_id in enumerate(pending, start=1):
        # Rate-limit gate: 50 deletes per 15-minute window
        if window_count >= RATE_LIMIT_DELETES:
            elapsed = time.monotonic() - window_start
            wait = RATE_LIMIT_WINDOW - elapsed
            if wait > 0:
                print(
                    f"Deleted {deleted_count}/{total} tweets... "
                    f"sleeping {wait/60:.1f} min (rate limit)"
                )
                time.sleep(wait)
            window_count = 0
            window_start = time.monotonic()

        if dry_run:
            print(f"  [dry-run] would delete {tweet_id}  ({i}/{total})")
            log_deletion(log_path, tweet_id, dry_run=True)
            deleted_count += 1
            window_count += 1
            continue

        try:
            response = client.delete_tweet(tweet_id)
            deleted = getattr(response, "data", {})
            if isinstance(deleted, dict):
                success = deleted.get("deleted", False)
            else:
                success = getattr(deleted, "deleted", False)

            if success:
                log_deletion(log_path, tweet_id, dry_run=False)
                deleted_count += 1
                window_count += 1
                print(f"  Deleted {tweet_id}  ({deleted_count}/{total})")
            else:
                print(f"  Unexpected response for {tweet_id}: {deleted}")

        except tweepy.errors.NotFound:
            # Already gone — log it so we don't retry
            print(f"  Not found (already deleted?): {tweet_id}")
            log_deletion(log_path, tweet_id, dry_run=False)
            window_count += 1

        except tweepy.errors.Forbidden as exc:
            print(f"  Forbidden for {tweet_id}: {exc} — skipping")

        except tweepy.TweepyException as exc:
            print(f"  Error deleting {tweet_id}: {exc} — skipping")

    print(f"\nDone. {deleted_count}/{total} tweets {'would be ' if dry_run else ''}deleted.")
    print(f"Log written to: {log_path.resolve()}")


# ── Main ──────────────────────────────────────────────────────────────────────

def build_client(creds: dict) -> tweepy.Client:
    return tweepy.Client(
        consumer_key=creds["API_KEY"],
        consumer_secret=creds["API_SECRET"],
        access_token=creds["ACCESS_TOKEN"],
        access_token_secret=creds["ACCESS_TOKEN_SECRET"],
        wait_on_rate_limit=False,  # we manage rate limits ourselves
    )


def get_authenticated_user_id(client: tweepy.Client) -> str:
    try:
        response = client.get_me()
    except tweepy.TweepyException as exc:
        sys.exit(f"Could not authenticate: {exc}")
    if not response.data:
        sys.exit("Authentication succeeded but could not retrieve user info.")
    user = response.data
    print(f"Authenticated as @{user.username} (id: {user.id})")
    return str(user.id)


def main():
    parser = argparse.ArgumentParser(
        description="Bulk-delete all tweets for a Twitter/X account.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--archive",
        metavar="PATH",
        help="Path to tweets.js from a Twitter archive (enables archive mode).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List tweets that would be deleted without actually deleting them.",
    )
    parser.add_argument(
        "--log",
        metavar="FILE",
        default=str(LOG_FILE),
        help=f"Path to the JSONL log file (default: {LOG_FILE}).",
    )
    args = parser.parse_args()

    log_path = Path(args.log)

    # Load credentials and build client
    creds = load_credentials()
    client = build_client(creds)

    # Authenticate and get user ID (needed for API mode)
    user_id = get_authenticated_user_id(client)

    # Load already-processed tweet IDs for resumption
    already_deleted = load_already_deleted(log_path)
    if already_deleted:
        print(f"Resuming: {len(already_deleted)} tweet(s) already in log, will skip them.")

    # Collect tweet IDs
    if args.archive:
        tweet_ids = fetch_tweet_ids_from_archive(Path(args.archive))
    else:
        tweet_ids = fetch_tweet_ids_from_api(client, user_id)

    if not tweet_ids:
        print("No tweets found. Nothing to do.")
        return

    # Delete (or dry-run)
    delete_tweets(
        client=client,
        tweet_ids=tweet_ids,
        already_deleted=already_deleted,
        log_path=log_path,
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    main()

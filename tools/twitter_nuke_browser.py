"""
twitter_nuke_browser.py — Delete all tweets via browser automation.
Logs into Twitter/X, then deletes all tweets one by one.

Usage:
    python twitter_nuke_browser.py
    python twitter_nuke_browser.py --dry-run
    python twitter_nuke_browser.py --handle aditya14
"""

import argparse
import json
import os
import random
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from playwright.sync_api import sync_playwright, TimeoutError as PwTimeout

load_dotenv(Path(__file__).parent / ".env")

LOG_FILE = Path(__file__).parent / "twitter_nuke_log.jsonl"

# Credentials from .env
TWITTER_USERNAME = os.getenv("TWITTER_USERNAME", "")
TWITTER_PASSWORD = os.getenv("TWITTER_PASSWORD", "")


def random_delay(low=2.0, high=5.0):
    time.sleep(random.uniform(low, high))


def log_deletion(log_path, tweet_id, text_preview):
    with open(log_path, "a", encoding="utf-8") as f:
        entry = {
            "id": tweet_id,
            "preview": text_preview[:80],
            "deleted_at": datetime.now(timezone.utc).isoformat(),
        }
        f.write(json.dumps(entry) + "\n")


def login_to_twitter(page, username, password):
    """Log into Twitter/X via the login page."""
    print("Logging into Twitter/X...")
    page.goto("https://x.com/i/flow/login", wait_until="domcontentloaded", timeout=60000)
    random_delay(3, 5)

    # Step 1: Enter username
    print("  Entering username...")
    try:
        # Try multiple selectors for the username field
        username_input = None
        for selector in [
            'input[autocomplete="username"]',
            'input[name="text"]',
            'input[type="text"]',
        ]:
            username_input = page.query_selector(selector)
            if username_input:
                break

        if not username_input:
            # Last resort: find any visible input
            username_input = page.wait_for_selector('input', timeout=15000)

        username_input.click()
        random_delay(0.5, 1)
        username_input.fill(username)
        random_delay(1, 2)

        # Click the "Next" button instead of pressing Enter
        next_btn = page.query_selector('button:has-text("Next")') or \
                   page.query_selector('[role="button"]:has-text("Next")')
        if next_btn:
            next_btn.click()
        else:
            page.keyboard.press("Enter")
        random_delay(2, 4)
    except PwTimeout:
        print("ERROR: Could not find username field.")
        return False

    # Step 1b: Check for unusual activity / phone/email verification
    try:
        challenge_input = page.wait_for_selector(
            'input[data-testid="ocfEnterTextTextInput"]', timeout=5000
        )
        print("  Twitter is asking for verification (phone/email).")
        print(f"  Entering handle: {username}")
        challenge_input.fill(username)
        random_delay(1, 2)
        page.keyboard.press("Enter")
        random_delay(2, 3)
    except PwTimeout:
        pass  # No challenge, continue normally

    # Debug: screenshot after username step
    debug_path = Path(__file__).parent / "login_debug_step1.png"
    page.screenshot(path=str(debug_path))
    print(f"  Screenshot after username step: {debug_path}")

    # Step 2: Enter password
    print("  Looking for password field...")
    try:
        password_input = page.wait_for_selector(
            'input[type="password"]', timeout=15000
        )
        password_input.fill(password)
        random_delay(1, 2)
        # Click the Log in button instead of pressing Enter
        login_btn = page.query_selector('[data-testid="LoginForm_Login_Button"]') or \
                    page.query_selector('button:has-text("Log in")') or \
                    page.query_selector('[role="button"]:has-text("Log in")')
        if login_btn:
            login_btn.click()
        else:
            page.keyboard.press("Enter")
        random_delay(3, 5)
    except PwTimeout:
        print("ERROR: Could not find password field.")
        return False

    # Step 3: Verify login succeeded — wait longer and check multiple indicators
    random_delay(5, 8)

    # Save a debug screenshot
    debug_path = Path(__file__).parent / "login_debug.png"
    page.screenshot(path=str(debug_path))
    print(f"  Debug screenshot saved to: {debug_path}")

    # Check multiple indicators of success
    logged_in = (
        page.query_selector('[data-testid="SideNav_NewTweet_Button"]')
        or page.query_selector('[data-testid="AppTabBar_Home_Link"]')
        or page.query_selector('[aria-label="Home"]')
        or page.query_selector('[data-testid="primaryColumn"]')
    )

    if logged_in:
        print("  Login successful!\n")
        return True

    # Maybe we're on the home page already
    if "home" in page.url.lower():
        print("  Login successful (redirected to home)!\n")
        return True

    # Check for error messages
    error = page.query_selector('[data-testid="inline_error"]')
    if error:
        print(f"  Login failed: {error.inner_text()}")
    else:
        print(f"  Login status unclear. Current URL: {page.url}")
        print("  Check login_debug.png to see what happened.")
    return False


def delete_tweets(handle, username, password, dry_run=False, log_path=LOG_FILE):
    deleted = 0
    errors = 0

    with sync_playwright() as p:
        tmp_profile = tempfile.mkdtemp(prefix="twitter_nuke_")
        print(f"Using temp profile: {tmp_profile}")
        print("Launching browser...\n")

        context = p.chromium.launch_persistent_context(
            user_data_dir=tmp_profile,
            headless=False,
            viewport={"width": 1280, "height": 900},
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-first-run",
                "--no-default-browser-check",
            ],
        )

        page = context.pages[0] if context.pages else context.new_page()

        # Login first
        if not login_to_twitter(page, username, password):
            print("Aborting — login failed.")
            context.close()
            return

        # Go to profile's Replies tab
        replies_url = f"https://x.com/{handle}/with_replies"

        print(f"\n{'='*40}")
        print(f"  Nuking replies from /{handle}/with_replies")
        print(f"{'='*40}\n")

        page.goto(replies_url, wait_until="domcontentloaded", timeout=60000)
        random_delay(3, 5)

        try:
            page.wait_for_selector('[data-testid="primaryColumn"]', timeout=15000)
        except PwTimeout:
            print("ERROR: Could not load profile. Aborting.")
            context.close()
            return

        print("Profile loaded. Starting deletion...\n")

        round_num = 0
        consecutive_empty = 0
        max_empty = 30  # much more patient — 1400 replies to go through
        skipped_ids = set()  # track tweets we can't delete to avoid loops

        while consecutive_empty < max_empty:
            round_num += 1
            random_delay(2, 4)

            tweets = page.query_selector_all('article[data-testid="tweet"]')

            if not tweets:
                print(f"Round {round_num}: No tweets found. Scrolling...")
                page.evaluate("window.scrollBy(0, 800)")
                random_delay(2, 3)
                consecutive_empty += 1
                continue

            found_deletable = False

            for tweet in tweets:
                try:
                    # Get tweet ID first to check if we already skipped it
                    time_link = tweet.query_selector(f'a[href*="/{handle}/status/"]')
                    tweet_id = "unknown"
                    if time_link:
                        href = time_link.get_attribute("href")
                        tweet_id = href.split("/status/")[-1].split("?")[0].split("/")[0]

                    if tweet_id in skipped_ids:
                        continue

                    # No filtering — nuke everything that has a Delete option

                    found_deletable = True

                    # Get tweet text for logging
                    text_el = tweet.query_selector('[data-testid="tweetText"]')
                    tweet_text = text_el.inner_text() if text_el else "(no text)"

                    if dry_run:
                        deleted += 1
                        print(f"[DRY RUN] Would delete reply {tweet_id}: {tweet_text[:60]}")
                        skipped_ids.add(tweet_id)
                        continue

                    # Click the three-dot menu
                    more_btn = tweet.query_selector('[data-testid="caret"]')
                    if not more_btn:
                        skipped_ids.add(tweet_id)
                        continue

                    more_btn.click()
                    random_delay(1, 2)

                    # Find and click Delete
                    menu_items = page.query_selector_all('[role="menuitem"]')
                    delete_clicked = False

                    for item in menu_items:
                        item_text = item.inner_text().lower()
                        if "delete" in item_text:
                            item.click()
                            delete_clicked = True
                            break

                    if not delete_clicked:
                        page.keyboard.press("Escape")
                        random_delay(1, 2)
                        print(f"  No Delete option for {tweet_id} — skipping")
                        skipped_ids.add(tweet_id)
                        errors += 1
                        continue

                    random_delay(1, 2)

                    # Confirm deletion
                    confirm_btn = page.query_selector('[data-testid="confirmationSheetConfirm"]')
                    if confirm_btn:
                        confirm_btn.click()
                        random_delay(2, 4)
                        deleted += 1
                        log_deletion(log_path, tweet_id, tweet_text)
                        print(f"  Deleted [{deleted}]: {tweet_text[:60]}")
                    else:
                        page.keyboard.press("Escape")
                        print(f"  No confirmation for {tweet_id} — skipping")
                        skipped_ids.add(tweet_id)
                        errors += 1

                    # DOM changed, re-query from top
                    break

                except Exception as exc:
                    print(f"  Error: {exc}")
                    errors += 1
                    skipped_ids.add(tweet_id)
                    try:
                        page.keyboard.press("Escape")
                    except:
                        pass
                    random_delay(1, 2)
                    continue

            if dry_run:
                page.evaluate("window.scrollBy(0, 800)")
                random_delay(1, 2)
                if round_num > 10:
                    print(f"\n[DRY RUN] Found {deleted} replies to delete.")
                    break
            elif not found_deletable:
                page.evaluate("window.scrollBy(0, 800)")
                random_delay(2, 3)
                consecutive_empty += 1
            else:
                consecutive_empty = 0

            # Anti-detection pauses
            if deleted > 0 and deleted % 20 == 0 and not dry_run:
                pause = random.uniform(30, 60)
                print(f"\n  --- Pausing {pause:.0f}s after {deleted} deletions ---\n")
                time.sleep(pause)

            if deleted > 0 and deleted % 100 == 0 and not dry_run:
                pause = random.uniform(120, 180)
                print(f"\n  === Long pause {pause:.0f}s after {deleted} deletions ===\n")
                time.sleep(pause)

            # If we've scrolled a lot without finding replies, reload page
            # This resets the feed and may surface more replies
            if consecutive_empty >= 15:
                print(f"  Reloading page to find more replies...")
                page.goto(replies_url, wait_until="domcontentloaded", timeout=60000)
                random_delay(3, 5)
                try:
                    page.wait_for_selector('[data-testid="primaryColumn"]', timeout=15000)
                except PwTimeout:
                    pass
                consecutive_empty = 0
                skipped_ids.clear()  # reset skips — page reloaded

        print(f"\nDone. Deleted: {deleted}")

        print(f"\nFinished. Deleted: {deleted}, Errors: {errors}")
        print(f"Log: {log_path.resolve()}")
        context.close()


def main():
    parser = argparse.ArgumentParser(description="Delete all tweets via browser automation.")
    parser.add_argument("--handle", default="aditya14", help="Twitter handle (default: aditya14)")
    parser.add_argument("--dry-run", action="store_true", help="Preview without deleting")
    parser.add_argument("--log", default=str(LOG_FILE), help="Log file path")
    args = parser.parse_args()

    username = TWITTER_USERNAME
    password = TWITTER_PASSWORD

    if not username or not password:
        print("ERROR: Set TWITTER_USERNAME and TWITTER_PASSWORD in .env")
        return

    print("=" * 60)
    print("  Twitter Nuke — Browser Automation")
    print("=" * 60)
    print(f"  Handle:  @{args.handle}")
    print(f"  Mode:    {'DRY RUN' if args.dry_run else 'LIVE DELETE'}")
    print(f"  Log:     {args.log}")
    print("=" * 60)

    if not args.dry_run:
        print("\n  WARNING: This will PERMANENTLY delete all your tweets!")
        print("  Press Ctrl+C within 5 seconds to cancel...\n")
        time.sleep(5)

    delete_tweets(args.handle, username, password,
                  dry_run=args.dry_run, log_path=Path(args.log))


if __name__ == "__main__":
    main()

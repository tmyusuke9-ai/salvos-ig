#!/usr/bin/env python3
"""
Fetch Instagram metadata (thumbnail URL and caption) using Instaloader.

The script prints a JSON blob to stdout with the following shape:
{"thumbnail": "...", "caption": "..."}.
"""

from __future__ import annotations

import json
import re
import sys
import os
from typing import NoReturn, Optional


def error(payload: str) -> NoReturn:
    print(json.dumps({"error": payload}))
    sys.exit(1)


try:
    import instaloader
except ImportError:  # pragma: no cover - handled gracefully
    error("instaloader module not installed")


def extract_shortcode(url: str) -> Optional[str]:
    patterns = [
        r"instagram\.com/(?:p|reel|tv)/([A-Za-z0-9_-]+)/?",
        r"instagr\.am/(?:p|reel|tv)/([A-Za-z0-9_-]+)/?",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    segments = [segment for segment in url.split("/") if segment]
    for segment in reversed(segments):
        if re.fullmatch(r"[A-Za-z0-9_-]{5,}", segment):
            return segment
    return None


def is_image_url(value: str) -> bool:
    return bool(re.search(r"\.(?:jpe?g|png|webp)(?:\?|$)", value, re.IGNORECASE))


def login_if_possible(loader: "instaloader.Instaloader") -> None:
    username = os.environ.get("IG_USERNAME")
    password = os.environ.get("IG_PASSWORD")
    if not username or not password:
        return

    try:
        loader.context.login(username, password)
    except Exception as exc:  # pragma: no cover - authentication failure at runtime
        print(f"Warning: failed to login with provided credentials: {exc}", file=sys.stderr)


def main() -> None:
    if len(sys.argv) < 2:
        error("missing url argument")

    url = sys.argv[1]
    shortcode = extract_shortcode(url)
    if not shortcode:
        error("unable to extract shortcode from url")

    loader = instaloader.Instaloader(download_pictures=False, download_videos=False)
    loader.quiet = True
    login_if_possible(loader)

    try:
        post = instaloader.Post.from_shortcode(loader.context, shortcode)
    except Exception as exc:  # pragma: no cover - runtime failure
        error(f"failed to load post: {exc}")

    thumbnail: Optional[str] = None

    thumb_candidates = [
        getattr(post, "thumbnail_url", None),
        getattr(post, "url", None),
    ]

    for candidate in thumb_candidates:
        if isinstance(candidate, str):
            candidate_str = candidate.strip()
            if candidate_str and is_image_url(candidate_str):
                thumbnail = candidate_str
                break

    if not thumbnail:
        try:
            sidecar = next(post.get_sidecar_nodes(), None)
        except Exception:
            sidecar = None

        if sidecar is not None:
            sidecar_thumb = (
                getattr(sidecar, "thumbnail_url", None)
                or getattr(sidecar, "display_url", None)
            )
            if isinstance(sidecar_thumb, str):
                candidate_str = sidecar_thumb.strip()
                if candidate_str and is_image_url(candidate_str):
                    thumbnail = candidate_str

    caption = getattr(post, "caption", None)

    result = {
        "thumbnail": thumbnail,
        "caption": caption.strip() if isinstance(caption, str) else None,
    }
    print(json.dumps(result))


if __name__ == "__main__":
    main()

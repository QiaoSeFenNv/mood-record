#!/usr/bin/env python3
"""Submit or resume one l0veyou image task without persisting its auth token."""

from __future__ import annotations

import argparse
from io import BytesIO
import json
import os
from pathlib import Path
import struct
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.request import ProxyHandler, Request, build_opener


API_ROOT = "https://l0veyou.com"
USER_AGENT = "Mozilla/5.0 (compatible; l0veyou-imagegen/1.0)"


def fail(message: str) -> None:
    raise RuntimeError(message)


def request_json(opener, url: str, token: str, payload: dict | None = None) -> dict:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload else None
    request = Request(
        url,
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "User-Agent": USER_AGENT,
            **({"Content-Type": "application/json; charset=utf-8"} if body else {}),
        },
        method="POST" if body else "GET",
    )
    try:
        with opener.open(request, timeout=45) as response:
            result = json.load(response)
    except HTTPError as error:
        try:
            result = json.loads(error.read(4096))
            message = result.get("message", "request rejected")
            code = result.get("code", error.code)
        except (ValueError, AttributeError):
            message, code = "request rejected", error.code
        fail(f"API HTTP {error.code}: {code}: {message}")
    except (URLError, TimeoutError) as error:
        fail(f"Network error: {error.reason if isinstance(error, URLError) else error}")
    if not isinstance(result, dict):
        fail("API returned a non-object response")
    if result.get("code") not in (0, "0"):
        fail(f"API error: {result.get('code')}: {result.get('message', 'unknown error')}")
    data = result.get("data")
    if not isinstance(data, dict):
        fail("API response has no task data")
    return data


def image_type(content: bytes) -> str:
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if content.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if content.startswith(b"RIFF") and content[8:12] == b"WEBP":
        return "webp"
    fail("Downloaded data is not a supported PNG, JPEG, or WebP image")


def alpha_status(content: bytes, kind: str) -> str:
    if kind == "jpg":
        return "none"
    if kind == "png":
        if len(content) < 26:
            fail("Downloaded PNG is truncated")
        width, height, _, color_type = struct.unpack(">IIBB", content[16:26])
        if width == 0 or height == 0:
            fail("Downloaded PNG has invalid dimensions")
        if color_type in (0, 2) and b"tRNS" not in content:
            return "none"
        if color_type not in (0, 2, 3, 4, 6):
            fail(f"Downloaded PNG has unsupported color type {color_type}")
    try:
        from PIL import Image

        with Image.open(BytesIO(content)) as image:
            image.load()
            minimum, _ = image.convert("RGBA").getchannel("A").getextrema()
            return "real" if minimum < 255 else "none"
    except ImportError:
        return "unknown"


def download(opener, url: str) -> bytes:
    request = Request(
        url,
        headers={"Accept": "image/png,image/webp,image/jpeg,*/*", "User-Agent": USER_AGENT},
    )
    try:
        with opener.open(request, timeout=90) as response:
            content = response.read(30 * 1024 * 1024 + 1)
    except (HTTPError, URLError, TimeoutError) as error:
        fail(f"Image download failed: {error}")
    if len(content) > 30 * 1024 * 1024:
        fail("Downloaded image exceeds 30 MB safety limit")
    return content


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--prompt", help="Image-generation prompt")
    source.add_argument("--prompt-file", type=Path, help="UTF-8 prompt file")
    source.add_argument("--task-id", help="Resume an accepted task without a new POST")
    parser.add_argument("--model", default="gpt-image-2-5-full")
    parser.add_argument("--aspect-ratio", help="Target ratio, such as 9:16 or 1:1")
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--proxy", help="Optional HTTP proxy, e.g. http://127.0.0.1:7897")
    parser.add_argument("--auth-env", default="L0VEYOU_AUTH", help="Token environment variable name")
    parser.add_argument("--interval", type=float, default=5, help="Polling interval in seconds")
    parser.add_argument("--timeout", type=float, default=300, help="Maximum poll duration in seconds")
    parser.add_argument("--require-alpha", action="store_true", help="Reject output without verified transparent pixels")
    parser.add_argument("--force", action="store_true", help="Replace an existing output file")
    parser.add_argument("--dry-run", action="store_true", help="Validate inputs without API calls or credentials")
    args = parser.parse_args()

    if args.interval <= 0 or args.timeout <= 0:
        parser.error("interval and timeout must be positive")
    if not args.task_id and not args.aspect_ratio:
        parser.error("--aspect-ratio is required when submitting a prompt")
    if args.output.exists() and not args.force:
        fail(f"Output already exists: {args.output}; choose another path or explicitly use --force")

    prompt = None
    if args.prompt_file:
        prompt = args.prompt_file.read_text(encoding="utf-8").strip()
    elif args.prompt:
        prompt = args.prompt.strip()
    if prompt is not None and not prompt:
        fail("Prompt is empty")

    if args.dry_run:
        print(f"dry-run: {'resume ' + args.task_id if args.task_id else 'generate'}")
        print(f"model={args.model} aspect_ratio={args.aspect_ratio} prompt_chars={len(prompt or '')}")
        print(f"output={args.output} proxy={'set' if args.proxy else 'system/default'}")
        return 0

    token = os.environ.get(args.auth_env, "").strip()
    if token.lower().startswith("bearer "):
        token = token[7:].strip()
    if not token:
        fail(f"Set {args.auth_env} locally with your l0veyou authorization token; do not add it to the command line")

    opener = build_opener(ProxyHandler({"http": args.proxy, "https": args.proxy} if args.proxy else None))
    task_id = args.task_id
    if not task_id:
        data = request_json(
            opener,
            f"{API_ROOT}/api/v1/images/generate",
            token,
            {"prompt": prompt, "model": args.model, "aspect_ratio": args.aspect_ratio},
        )
        task_id = data.get("id")
        if not isinstance(task_id, str) or not task_id:
            fail("API accepted generation but returned no task ID")
        print(f"Task accepted: {task_id}", flush=True)

    deadline = time.monotonic() + args.timeout
    while True:
        data = request_json(opener, f"{API_ROOT}/api/v1/images/tasks/{task_id}", token)
        status = data.get("status")
        if status == "failed":
            fail(f"Task {task_id} failed: {data.get('error') or 'no reason supplied'}")
        if status == "completed":
            break
        if status not in ("pending", "queued", "processing", "running", "in_progress"):
            fail(f"Task {task_id} has unknown status: {status}")
        if time.monotonic() >= deadline:
            fail(f"Task {task_id} is still {status}; resume later with --task-id {task_id}")
        time.sleep(min(args.interval, max(0, deadline - time.monotonic())))

    urls = data.get("image_urls")
    if not isinstance(urls, list) or not urls or not isinstance(urls[0], str):
        fail(f"Task {task_id} completed without an image URL")
    content = download(opener, urls[0])
    kind = image_type(content)
    suffix = args.output.suffix.lower().lstrip(".")
    if suffix == "jpeg":
        suffix = "jpg"
    if suffix != kind:
        fail(f"Downloaded image is {kind}, but output path ends in .{suffix or '[none]'}")
    alpha = alpha_status(content, kind)
    if args.require_alpha and alpha != "real":
        fail(f"Task {task_id} returned an image without verified transparency (alpha={alpha}); no file saved")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_name(args.output.name + ".part")
    try:
        temporary.write_bytes(content)
        temporary.replace(args.output)
    finally:
        temporary.unlink(missing_ok=True)
    print(f"Saved {args.output} ({len(content)} bytes, {kind}, alpha={alpha}, task={task_id})")
    if len(urls) > 1:
        print(f"Note: task returned {len(urls)} images; only the first was downloaded")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (RuntimeError, OSError, ValueError) as error:
        print(f"Error: {error}", file=sys.stderr)
        sys.exit(1)

---
name: l0veyou-imagegen
description: Generate and download raster images through the l0veyou.com asynchronous image API when the user chooses this provider. Use for new illustrations or image assets, not for editing an existing image or generating video.
---

# l0veyou ImageGen

Use `scripts/generate.py` to submit one image prompt, poll the returned task ID, download the result, and validate the file. This is a third-party, potentially billable API. Run it only for an image the user asked to generate or explicitly approved; do not retry a failed generation automatically.

## Authentication

The API uses a user authorization token, **not** the earlier OpenAI-style `sk-...` key. If `L0VEYOU_AUTH` is absent, ask the user to provide authorization for this run, preferably by setting `L0VEYOU_AUTH` in their local environment and confirming it is ready. Accept either a raw token or a `Bearer `-prefixed value. Never store a token in this skill, a project file, a URL, a saved command, or a log; never echo it. If one is pasted into chat, use it only for the requested call and recommend rotating it afterward. Do not attempt to refresh or obtain an account token yourself.

## Generate

Choose a prompt and aspect ratio from the actual asset need. The observed model is `gpt-image-2-5-full`, but its supported ratios and alpha behavior are not documented here. A prompt asking for transparency does **not** guarantee transparent pixels. For a square cutout request, use `1:1` rather than a portrait ratio, but note that one observed `1:1` task failed with a generic service error; do not silently switch ratios or models after a failure.

```powershell
py -3 scripts/generate.py --prompt-file prompt.txt --model gpt-image-2-5-full --aspect-ratio 9:16 --output image.png --proxy http://127.0.0.1:7897
```

Use `--require-alpha` for assets that must be composited over a scene. It requires Pillow and rejects opaque output. The service has previously returned a PNG whose checkerboard background was painted into RGB pixels; never call that transparent. If an image fails validation, report the failure and keep it out of shipping assets.

The script prints a task ID after acceptance. If polling or download is interrupted, resume with `--task-id ID --output PATH` rather than submitting the prompt again. A completed file should be visually inspected for subject, framing, text and background before it is placed in a project. Respect existing files; `--force` is only for an explicitly approved replacement.

The API endpoints observed on 2026-09-23 are `POST /api/v1/images/generate` and `GET /api/v1/images/tasks/{id}`. A successful POST means the task was accepted, **not** that an image exists. On `failed`, surface the service error and stop. Do not use the broad task-list endpoint; it may return unrelated account history.

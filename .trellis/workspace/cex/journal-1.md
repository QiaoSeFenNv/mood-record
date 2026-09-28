# Journal - cex (Part 1)

> AI development session journal
> Started: 2026-09-22

---


## Session 1: Miniapp scene redesign and asset delivery
<!-- trellis-session: v=2 fp=996d090e991a454e -->

**Date**: 2026-09-24
**Task**: Miniapp scene redesign and asset delivery
**Branch**: `master`

### Summary

Redesigned the miniapp around a layered meadow scene with selectable animal and plant artwork, explicit mood confirmation, resilient state handling, review and settings polish; verified tests, types, lint, H5 and WeChat builds. Added API maintenance and deployment tooling from existing workspace work.

### Git Commits

| Hash | Message |
|------|---------|
| `0a038e1` | feat: redesign miniapp mood scene and recording flow |
| `d0ee567` | feat: add API maintenance and deployment tooling |

### Status

[OK] **Completed**


## Session 2: Review insights + WeChat CSV sharing
<!-- trellis-session: v=2 fp=5b85d7118c9bd1b7 -->

**Date**: 2026-09-28
**Task**: Review insights + WeChat CSV sharing
**Branch**: `master`

### Summary

Added time-of-day and same-day-change weekly insights to ReviewService with unit tests; switched WeChat CSV export to shareFileMessage since CSV is not an openDocument-supported format; refresh calendar on every onShow; updated spec/design docs.

### Git Commits

| Hash | Message |
|------|---------|
| `7613c31` | feat(review): enrich weekly insights and WeChat CSV sharing |

### Status

[OK] **Completed**


## Session 3: Persist real record time (occurredAt) + H5 preview running
<!-- trellis-session: v=2 fp=d7564782197be0f9 -->

**Date**: 2026-09-28
**Task**: Persist real record time (occurredAt) + H5 preview running
**Branch**: `master`

### Summary

Added occurredAt to CreateMoodRequest contract; MoodService.create now stores client-supplied time instead of server-side new Date(). Frontend submits current local ISO time. Added 5min/1yr skew guards. Verified E2E with offset -480: 03:15+08:00 → 凌晨 insight, 12:00+08:00 → 下午. H5 dev server running on http://127.0.0.1:5174 proxying to API at :3000. Cleared preview-user-a records via DELETE /v1/me/moods.

### Git Commits

| Hash | Message |
|------|---------|
| `2ebe6f8` | fix(api): accept client-supplied occurredAt and persist real record time |

### Status

[OK] **Completed**

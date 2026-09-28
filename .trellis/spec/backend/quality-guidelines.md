# Quality Guidelines

> Code quality standards for backend development.

---

## Overview

<!--
Document your project's quality standards here.

Questions to answer:
- What patterns are forbidden?
- What linting rules do you enforce?
- What are your testing requirements?
- What code review standards apply?
-->

(To be filled by the team)

---

## Forbidden Patterns

<!-- Patterns that should never be used and why -->

(To be filled by the team)

---

## Required Patterns

<!-- Patterns that must always be used -->

(To be filled by the team)

---

## Testing Requirements

<!-- What level of testing is expected -->

(To be filled by the team)

---

## Code Review Checklist

<!-- What reviewers should check -->

(To be filled by the team)

## Scenario: Weekly factual insights

### 1. Scope / Trigger

- Applies to `GET /v1/review/weekly` and the `ReviewService.weekly` aggregation path.
- Use when adding review insights derived from private mood records.

### 2. Signatures

- `ReviewService.weekly(userId, timezoneOffsetMinutes, anchorDate?): Promise<WeeklyResponse>`.
- The response keeps the existing `insights: string[]` contract; no raw records or user identifiers are exposed.

### 3. Contracts

- The seven-day record count and active-day count remain factual.
- Low values are `torque <= -21`; high values are `torque >= 21`; calm values do not enter either direction insight.
- Time-of-day buckets use each record's stored timezone offset: `凌晨` 00:00–05:59, `上午` 06:00–11:59, `下午` 12:00–17:59, and `晚上` 18:00–23:59.
- When a day has at least two records, same-day change compares the first and last records in stored chronological order.

### 4. Validation & Error Matrix

- Empty seven-day window -> neutral no-record insight; do not invent a trend or time period.
- Records with only calm torque -> count insight only; do not label them low or high.
- Missing or invalid request timezone -> reject at the contracts/controller boundary before the service runs.

### 5. Good/Base/Bad Cases

- Good: derive every insight from the current user's repository result and the record's saved offset.
- Base: ties between time buckets resolve in the fixed `凌晨`, `上午`, `下午`, `晚上` order.
- Bad: use server local time, classify every record as positive/negative, or expose raw record timestamps in the public insight payload.

### 6. Tests Required

- Unit-test record count, low/high time buckets, same-day first-to-last change, calm-only data, and an empty week.
- Keep API e2e coverage for the seven-day response shape and user isolation.

### 7. Wrong vs Correct

#### Wrong

```typescript
const hour = record.occurredAtUtc.getHours();
```

#### Correct

```typescript
const localHour = new Date(
  record.occurredAtUtc.getTime() - record.timezoneOffsetMinutes * 60_000,
).getUTCHours();
```

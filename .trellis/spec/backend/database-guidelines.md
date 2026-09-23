# Database Guidelines

> Database patterns and conventions for this project.

---

## Overview

<!--
Document your project's database conventions here.

Questions to answer:
- What ORM/query library do you use?
- How are migrations managed?
- What are the naming conventions for tables/columns?
- How do you handle transactions?
-->

(To be filled by the team)

---

## Query Patterns

<!-- How should queries be written? Batch operations? -->

(To be filled by the team)

---

## Migrations

<!-- How to create and run migrations -->

(To be filled by the team)

---

## Naming Conventions

<!-- Table names, column names, index names -->

(To be filled by the team)

---

## Common Mistakes

<!-- Database-related mistakes your team has made -->

(To be filled by the team)

## Scenario: Mood records on single-instance SQLite

### 1. Scope / Trigger

- Applies to the MVP mood write, delete, review, export, and resonance paths.
- SQLite is supported only on local persistent disk with one API writer; do not place the database on a network share or start multiple API replicas against one file.

### 2. Signatures

- `POST /v1/moods` creates or replays one idempotent record.
- `DELETE /v1/moods/:id` physically deletes an owned record and reverses its mutation receipt.
- Tables: `users`, `mood_records`, and `mutation_receipts`; migrations are explicit TypeORM migrations.

### 3. Contracts

- Store event time in UTC and the submitted timezone offset separately.
- Enforce `UNIQUE(user_id, client_mutation_id)` and torque range `-100..100` in the database as well as at the API boundary.
- Enable `journal_mode=WAL`, `foreign_keys=ON`, and `busy_timeout=5000` at startup.
- A reversed receipt remains for up to 24 hours and must not contain the deleted mood value.

### 4. Validation & Error Matrix

- Invalid torque, UUID, timezone, or time-range enum -> `400`.
- Reuse of a reversed mutation id -> `409 MUTATION_REVERSED`.
- Missing/invalid identity -> `401`; a record owned by another identity is never deleted.
- SQLite lock beyond `busy_timeout` -> return a retryable failure, never report a successful save.

### 5. Good/Base/Bad Cases

- Good: retrying the same mutation id returns the original record.
- Base: deleting an already absent or non-owned id returns `deleted: false` without revealing ownership.
- Bad: deleting a record and allowing a delayed duplicate `POST` to recreate it.

### 6. Tests Required

- Integration test migration completion plus all three PRAGMA values.
- E2E test duplicate save, reversal, delayed retry, two-user isolation, and distinct-user resonance.
- Assert delete/clear/account deletion immediately removes records from online reads and aggregation.

### 7. Wrong vs Correct

#### Wrong

```typescript
await moodRepository.delete(recordId);
```

#### Correct

```typescript
await dataSource.transaction(async (manager) => {
  await deleteOwnedRecord(manager, userId, recordId);
  await reverseMutationReceipt(manager, userId, clientMutationId);
});
```

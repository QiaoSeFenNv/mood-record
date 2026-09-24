# Quality Guidelines

> Code quality standards for frontend development.

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

### Common Mistake: uni-app plugin export under Node 24

**Symptom**: `uni build -p mp-weixin` fails with `uni is not a function` while loading `vite.config.ts`.

**Cause**: Node 24 can expose the CommonJS package as an object whose callable factory is the nested `default` export.

**Fix**: Resolve either a directly callable export or a callable `default`, validate it at runtime, and return a typed Vite `PluginOption`.

**Prevention**: Keep `pnpm build` in the required quality gate; type-check alone does not execute Vite configuration loading.

## Scenario: Miniapp component tests without the uni-app compiler

### 1. Scope / Trigger

- Use for Vue component and today-page tests under `apps/miniapp/src/**/*.test.ts`.

### 2. Signatures

- `pnpm --filter @mood-record/miniapp test` runs Vitest with `apps/miniapp/vitest.config.ts`.
- `pnpm test` also runs these tests and the deployment SQLite operations suite.

### 3. Contracts

- Vitest uses jsdom and `@vitejs/plugin-vue`, not the uni-app build plugin; declare platform tags such as `slider` as custom elements.
- Mock `uni` platform calls at their boundary. Trigger `changing` and `change` separately; only release may emit one `commit`.
- Use fake timers for the five-second UndoBar, and reset timers/globals between tests.
- A failed POST retry must reuse `clientMutationId`; a new local day must clear old resonance, and an existing current-day record must fetch its resonance on first visit.

### 4. Validation & Error Matrix

- Disabled torque or a release without a preceding gesture -> no commit.
- Save failure -> visible retry, no success UI; retry uses the same mutation ID.
- Empty current day -> no stale resonance; current day with records -> use latest mood band/name.

### 5. Good/Base/Bad Cases

- Good: tests assert emitted events and page-visible recovery states, not private implementation refs.
- Base: reduced motion keeps a static tree trace and recording usable.
- Bad: `--passWithNoTests` makes an untested miniapp appear green.

### 6. Tests Required

- `MoodTorque.test.ts`, `UndoBar.test.ts`, `MoodTree.test.ts`, `ResonanceCard.test.ts`, and `pages/today/index.test.ts` cover those boundaries.
- Still run `pnpm --filter @mood-record/miniapp build:mp-weixin`; jsdom does not verify the WeChat runtime.

### 7. Wrong vs Correct

#### Wrong

```text
vitest run --passWithNoTests
```

#### Correct

```text
vitest run --config vitest.config.ts
```

## Scenario: Browser preview of the uni-app pages

### 1. Scope / Trigger

- Use when validating page layout and flows in a desktop/mobile browser before WeChat device testing.

### 2. Signatures

- `pnpm dev:h5` serves `http://127.0.0.1:5173/` after building shared packages.
- `pnpm build:h5` builds the H5 target; `pnpm build` still validates `mp-weixin`.

### 3. Contracts

- `apps/miniapp/index.html` is the H5 entry and loads `src/main.ts`; both targets use the same uni-app pages and shared API client.
- During H5 development, the API client defaults to same-origin `/v1`; `apps/miniapp/vite.config.ts` proxies it to `http://127.0.0.1:3000`. This supports the default `5173` and custom local preview ports such as `62613` without widening the API CORS list. `VITE_API_BASE_URL` remains an explicit override. WeChat builds retain the direct `http://127.0.0.1:3000/v1` development default; never expose development identity publicly.
- Browser CSV export uses a Blob download; the Mini Program retains `uni.downloadFile` and `uni.openDocument`.

### 4. Validation & Error Matrix

- Missing H5 entry -> `uni build -p h5` fails to resolve `index.html`.
- Direct cross-origin requests from an unlisted custom H5 port -> browser preflight fails even when the API login endpoint returns 201; use the same-origin development proxy.
- H5 preview success does not prove WeChat slider, storage, vibration, download or tab behavior.

### 5. Good/Base/Bad Cases

- Good: H5 and `mp-weixin` both build from one Vue codebase.
- Base: unsupported vibration still leaves the torque interaction usable.
- Bad: replacing `uni` calls with browser-only globals in shared pages without a platform branch.

### 6. Tests Required

- Run `pnpm build:h5`, `pnpm build`, typecheck, tests, and a POST to `<preview-origin>/v1/auth/dev/session`; verify the returned session can read `/v1/moods/today` through the same preview origin.
- Confirm browser layout/interaction visually when a browser surface is available; later repeat in WeChat Developer Tools and on a device.

### 7. Wrong vs Correct

#### Wrong

```text
Browser build passed, so WeChat acceptance is complete.
```

#### Correct

```text
Browser preview passed; run a separate mp-weixin build and device acceptance before release.
```

## Scenario: Layered mood scene under repeated records and asset errors

- Derive the five visible mood marks from the current `MoodRecord[]` by `moodBand`. Show the exact count on a mark when a band has more than one record, so repeated records remain legible without occupying the same coordinates.
- On deletion or day refresh, recompute these counts from the returned records. A preview mark is separate and must not increase a saved count.
- Handle `image` load errors for the background, plant, and companion. Keep the recording control functional, retain the scene's base color, and show a short status message so a broken asset path is diagnosable.
- Test a many-record same-band case and an image error event in `MoodTree.test.ts`; verify the WeChat build separately because jsdom does not exercise native image loading.

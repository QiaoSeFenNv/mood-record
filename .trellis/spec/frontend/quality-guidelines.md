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

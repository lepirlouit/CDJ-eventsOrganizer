# Maintenance & Sustainability ("langdurig")

The meeting decision: **if we build this ourselves, it must be built for the long
term (langdurig)** — sustainable to run and maintain by a small volunteer team.
This note records the practices that keep it that way.

## Environments

| Stage  | Purpose | Deploy | Teardown |
|--------|---------|--------|----------|
| `dev`  | Local live-Lambda development | `npm run dev` | `sst remove --stage dev` |
| `test` | Shared staging for QA before prod | `npm run deploy:test` | `npm run remove:test` |
| `prod` | Production (`cdj.pirlou.it`) | `npm run deploy` | protected (`protect: true`) |

`sst.config.ts` parameterizes everything by stage: non-prod stages use
`removal: "remove"` (clean teardown) and are unprotected; `prod` is `retain` +
`protect`. Seed a non-prod stage with `npm run seed:test`.

> Note: outgoing-email links (`WEB_URL` in `infra/api.ts`) point to the prod domain
> for `prod` and to `localhost` otherwise. If `test` becomes a long-lived hosted
> QA env, set its `WEB_URL` to the test CloudFront URL.

## Long-term maintainability practices

- **One source of truth per concern**: entities in `packages/core/src/entities`,
  auth helpers in `packages/core/src/types`, email in `packages/core/src/lib`.
- **DB-based authorization only** for per-dojo roles — never trust JWT claims.
- **Additive schema changes**: DynamoDB attributes are added optionally so existing
  records keep working (see `gender`, `canCheckIn`, `tracks`, `customAnswers`).
  Cognito attributes are permanent — schema changes require destroy + redeploy of
  the environment.
- **i18n**: every user-facing string has keys in all three locales
  (`en`/`fr`/`nl`); keep them in sync.
- **No silent PII growth**: new personal fields must be reflected in `GDPR.md`, the
  data-export, and the erasure handler.

## Recurring data-security audit

A defensive auditor agent lives at `.claude/agents/data-security-auditor.md`. It
reviews the codebase for unauthenticated endpoints, PII leaks, missing dojo-role
checks, and consent bypass — and only reports (it never edits code).

Run it on demand:

```
claude "Use the data-security-auditor agent to audit the codebase and report findings."
```

To run it on a schedule, use the `/schedule` skill in Claude Code (e.g. weekly) so
regressions are caught before they reach production. See `GDPR.md` for the data
protection obligations the audit guards.

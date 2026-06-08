# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies (root — npm workspaces)
npm install

# Start dev environment (live Lambda reload via SST dev mode)
npm run dev            # sst dev --stage dev

# Type-check all packages
npm run typecheck

# Type-check web only
cd packages/web && npm run typecheck

# Seed the database with real Belgian dojo data
npm run seed           # sst shell --stage dev npx tsx scripts/seed.ts

# Deploy to production
npm run deploy         # sst deploy --stage prod

# Destroy dev environment (needed before re-deploy when Cognito schema changes)
npm run remove         # sst remove --stage dev

# Refresh SST state from live AWS (reconcile drift)
npm run refresh
```

There are no automated tests. Verification is done by running the app.

## Architecture

### Monorepo layout

```
infra/          — Pulumi/SST resource definitions (storage, auth, api, web, email)
packages/
  core/         — @coderdojo/core: shared entities, types, business logic, email
  functions/    — @coderdojo/functions: Lambda handlers (one file per endpoint)
  web/          — @coderdojo/web: React/Vite frontend
scripts/
  seed.ts       — populates DynamoDB with Belgian dojo fixtures
```

### Infrastructure (SST Ion v4 / Pulumi)

Resources are defined in `infra/` and wired together in `sst.config.ts`. Dependency order: `storage → email → auth → api → web`.

- **DynamoDB** (`infra/storage.ts`): single table `coderdojo-{stage}-main` with PK/SK + GSI1 + GSI2.
- **SES** (`infra/email.ts`): domain identity for `cdj.pirlou.it` with Custom MAIL FROM `mail.cdj.pirlou.it`.
- **Cognito** (`infra/auth.ts`): passwordless CUSTOM_AUTH flow via 5 Lambda triggers (pre-signup, define/create/verify-auth-challenge, post-confirmation). Only `custom:role` is stored in the JWT; dojo-specific roles live in DynamoDB.
- **API Gateway** (`infra/api.ts`): all routes are created via the `route()` helper which also attaches the shared `SesSendEmailPolicy` to each function's role. The `fnDefaults` object sets the runtime, links, and environment for every function. **Do not use `transform.role` to add policies** — it conflicts with SST's AppSync EventConnect policy for dev mode; use `aws.iam.RolePolicyAttachment` instead.
- **Frontend** (`infra/web.ts`): CloudFront + S3 static site. Custom domain `cdj.pirlou.it` is commented out until the ACM cert CNAME is added to DNS.

### Core package (`packages/core/`)

- **Entities** (`src/entities/`): seven ElectroDB entities sharing a single DynamoDB table. Each entity file imports `DocumentClient` and `table` from `client.ts` (not from `table.ts`) to avoid a circular ESM import. `table.ts` composes all entities into an ElectroDB `Service` (`db`).
- **Capacity logic** (`src/lib/capacity.ts`): `registerParticipant()` handles the dual-pool capacity split (general vs. coach-reserved seats) and falls through to the waitlist. Uses an explicit `RegistrationBase` type and casts `db.entities.registration.put` to `any` because ElectroDB v3's overloaded `put()` causes TypeScript to infer the array-batch overload.
- **Types** (`src/types/index.ts`): `getDojoRole()`, `requireDojoCoach()`, `requireDojoLeadCoach()` — DB-based auth helpers used by all Lambda handlers. Role checks never trust JWT claims for dojo-specific authorization.

### Data model — key relationships

- A **User** has a global role (`parent` | `super_admin`) only. Dojo roles (`coach` | `lead_coach`) live in **DojoMembership** records — one per user×dojo pair. This allows a person to be lead coach at one dojo and plain coach at another.
- **Event** has two capacity counters: `registrationCount` (general pool) and `coachRegistrationCount` (reserved pool). The reserved pool opens to all parents after `releaseAt` (defaults to `registrationCloseAt`).
- **Registration** has `isCoachChild` (set by the backend from the caller's JWT role, never by the client) and `checkedIn` / `checkedInAt` / `checkedInBy`.

### Lambda handlers (`packages/functions/src/`)

One file per endpoint, grouped by domain. Every handler:
1. Calls `getClaims(event)` to extract the JWT.
2. For coach/lead_coach actions, calls `requireDojoCoach()` or `requireDojoLeadCoach()` which does a DB lookup — **not** a JWT claim check.
3. Returns via `ok(body)` or `err(message, statusCode)` from `@coderdojo/core`.

The `route()` function in `infra/api.ts` defines which handler file maps to which HTTP method + path.

### Auth flow (passwordless OTP)

1. Frontend calls `ensureUserExists(email)` — a silent Cognito `Pool.signUp()` with a dummy password. The `PreSignUp` Lambda auto-confirms users so no verification email is sent.
2. Frontend calls `initiateAuth(email)` — triggers the CUSTOM_AUTH challenge chain.
3. `CreateAuthChallenge` Lambda generates a 6-digit OTP, HMACs it, and sends it via SES. It guards against `userNotFound: true` (Cognito passes a random UUID as `event.userName` in that case — do not send to it).
4. `VerifyAuthChallenge` does a timing-safe HMAC comparison.
5. `PostConfirmation` creates the DynamoDB User record on first login.
6. `CognitoUser` instance is stored in a module-level variable in `packages/web/src/lib/auth.ts` (not in router state — it can't be serialized by the History API's structured-clone algorithm).

### Frontend (`packages/web/src/`)

- **Auth context** (`hooks/useAuth.ts`): `AuthUser` has `globalRole` (not `role`) and `memberships: DojoMembership[]`. Memberships are fetched from `/users/me/memberships` after login. Use `isAnyCoach(user)`, `isAnyLeadCoach(user)`, `roleInDojo(user, dojoId)` helpers — never read `user.role` for dojo authorization.
- **i18n**: translations are bundled inline (not HTTP-loaded). Add new keys to all three files in `src/i18n/locales/{en,fr,nl}/common.json`. Language choice is persisted in `localStorage` under key `cdj-lang`.
- **Map** (`components/map/`): uses `react-leaflet` + OpenStreetMap. Marker icons are `L.divIcon` (no asset files needed). Import `leaflet/dist/leaflet.css` in `main.tsx`.
- **`global` polyfill**: `vite.config.ts` defines `global: "globalThis"` — required by `amazon-cognito-identity-js`.

### Known gotchas

- **Cognito schema attributes are permanent**: once deployed, attributes cannot be removed. Destroy and redeploy the environment to change the schema.
- **`sst-env.d.ts` files** are auto-generated by SST and must be committed. They are referenced in `packages/core/tsconfig.json` and `packages/web/tsconfig.json`. The web tsconfig also includes `../core/sst-env.d.ts` because the web's `tsc` resolves `@coderdojo/core` source files which reference `Resource.MainTable`.
- **ElectroDB circular import**: entities import `DocumentClient`/`table` from `client.ts`. `table.ts` imports from entities. Never have entities import from `table.ts`.
- **SES permissions**: the `SesSendEmailPolicy` managed IAM policy is attached to every API Lambda via `RolePolicyAttachment` in `route()`. Auth Lambdas (CreateAuthChallenge) have a separate inline `RolePolicy` in `infra/auth.ts`.

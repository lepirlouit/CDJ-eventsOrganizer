# CoderDojo Belgium — Event Registration App

## Context

CoderDojo Belgium needs a web app to let parents register their children (ninjas) for dojo events. Lead coaches create and manage events; registrations fill slots or land on a waitlist. The app serves multiple dojos across Belgium, supports three languages (FR/NL/EN), and is built entirely on AWS serverless infrastructure managed by SST Ion.

---

## Tech Stack

| Layer | Choice |
|---|---|
| IaC | **SST Ion v3** (latest) — `npx sst@latest` |
| Frontend | React + TypeScript + Vite, hosted on CloudFront/S3 via SST |
| UI Library | **Material UI v6** (MUI) |
| Backend | AWS Lambda (Node.js TypeScript) + API Gateway HTTP API |
| Database | DynamoDB single-table via **ElectroDB** |
| Auth | AWS Cognito — passwordless **CUSTOM_AUTH** flow (email OTP via SES) |
| Email | **AWS SES** — magic link OTP, registration confirmation, waitlist notifications |
| i18n | `react-i18next` — EN / FR / NL |
| Forms | React Hook Form + Zod |
| Server state | TanStack Query v5 |

---

## Monorepo Layout

```
CoderDojo-Event-Organizer/
├── package.json              # root npm workspaces ["packages/*"]
├── tsconfig.base.json
├── sst.config.ts             # SST entry point
├── infra/
│   ├── storage.ts            # DynamoDB table + S3 export bucket
│   ├── email.ts              # SES domain identity + config set
│   ├── auth.ts               # Cognito User Pool + Lambda triggers
│   ├── api.ts                # API Gateway HTTP API + all Lambda functions
│   └── web.ts                # CloudFront + S3 static site
└── packages/
    ├── core/                 # @coderdojo/core — shared types, entities, business logic
    ├── functions/            # @coderdojo/functions — Lambda handlers
    └── web/                  # @coderdojo/web — React/Vite frontend
```

**Package names:**
- `packages/core/package.json` → `"name": "@coderdojo/core"`
- `packages/functions/package.json` → `"name": "@coderdojo/functions"`, depends on `@coderdojo/core`
- `packages/web/package.json` → `"name": "@coderdojo/web"`, depends on `@coderdojo/core`

---

## SST Infrastructure (`sst.config.ts` + `infra/`)

Resources declared in dependency order:

1. **`infra/storage.ts`** — `sst.aws.Dynamo` (single table `MainTable`, pk+sk, GSI1+GSI2) + `aws.s3.Bucket` (CSV exports)
2. **`infra/email.ts`** — `aws.ses.DomainIdentity` + `aws.ses.ConfigurationSet`
3. **`infra/auth.ts`** — `aws.cognito.UserPool` (CUSTOM_AUTH, no password policy) + `aws.cognito.UserPoolClient` + three SST Lambda triggers: `define-auth-challenge`, `create-auth-challenge`, `verify-auth-challenge`; custom attributes `custom:role`, `custom:dojoId`
4. **`infra/api.ts`** — `sst.aws.ApiGatewayV2` with Cognito JWT authorizer; one `sst.aws.Function` per Lambda handler; all functions `link: [table, exportBucket, userPool]`
5. **`infra/web.ts`** — `sst.aws.StaticSite` (Vite build) with `environment: { VITE_API_URL, VITE_COGNITO_USER_POOL_ID, VITE_COGNITO_CLIENT_ID }`

Use `$app.stage` for per-stage resource naming (e.g. `coderdojo-${$app.stage}-main`).

---

## DynamoDB Single-Table Design (ElectroDB)

**Table**: `coderdojo-{stage}-main` | PK + SK | GSI1 (gsi1pk+gsi1sk) | GSI2 (gsi2pk+gsi2sk)

### Entities & Key Patterns

#### Dojo
```
PK: DOJO#{dojoId}   SK: #META
GSI1PK: DOJOS       GSI1SK: DOJO#{dojoId}
```
Attributes: `dojoId`, `name`, `city`, `address`, `waitlistMode` (`"auto"|"manual"`), `active`

#### User
```
PK: USER#{userId}   SK: #META
GSI1PK: DOJO#{dojoId}  GSI1SK: USER#{userId}    (users by dojo)
GSI2PK: {email}         GSI2SK: #USER            (email lookup)
```
Attributes: `userId`, `email`, `name`, `phone`, `role` (`"parent"|"coach"|"lead_coach"|"super_admin"`), `dojoId`, `cognitoSub`, `preferredLang`

#### Event
```
PK: DOJO#{dojoId}       SK: EVENT#{eventId}
GSI1PK: EVENTS           GSI1SK: {date}#{eventId}    (all upcoming events, sortable)
GSI2PK: EVENT#{eventId}  GSI2SK: #META               (get event by id without dojoId)
```
Attributes: `eventId`, `dojoId`, `title`, `description`, `date`, `location` (map), `maxCapacity`, `registrationOpenAt`, `registrationCloseAt`, `ateliers` (list of `{atelierId, name, isCustom, maxSeats?}`), `status`, `registrationCount`, `waitlistCount`

#### Registration
```
PK: EVENT#{eventId}       SK: REG#{registrationId}
GSI1PK: DOJO#{dojoId}     GSI1SK: REG#{registrationId}
GSI2PK: USER#{userId}     GSI2SK: REG#{registrationId}
```
Attributes: `registrationId`, `eventId`, `dojoId`, `userId`, `ninjaName`, `ninjaBirthdate`, `parentName`, `parentEmail`, `parentPhone`, `atelierId`, `needsComputer`, `previousVisits`, `heardAbout`, `consentPhotos`, `consentContact`, `status` (`"confirmed"|"waitlisted"|"cancelled"`)

#### WaitlistEntry
```
PK: EVENT#{eventId}    SK: WAIT#{positionPadded}#{waitlistId}    (zero-padded → lexicographic order)
GSI1PK: USER#{userId}  GSI1SK: WAIT#{waitlistId}
```
Attributes: same registration fields + `position`, `positionPadded`, `status` (`"waiting"|"promoted"|"expired"|"cancelled"`)

### `packages/core/src/entities/table.ts`

Exports `DocumentClient` (DynamoDBDocumentClient) and an ElectroDB `Service` composing all five entities, bound to `Resource.MainTable.name` (SST link).

---

## Cognito Passwordless Auth Flow

**CUSTOM_AUTH with Lambda triggers** (not USER_AUTH EMAIL_OTP — CUSTOM_AUTH is portable and gives full control over OTP delivery).

### Lambda Triggers

**`define-auth-challenge.ts`**
- Session empty → issue `CUSTOM_CHALLENGE`
- Last answer correct → `issueTokens: true`
- 3+ failed attempts → `failAuthentication: true`
- Otherwise → retry `CUSTOM_CHALLENGE`

**`create-auth-challenge.ts`**
- Generate 6-digit OTP
- Send via SES (language-aware email template)
- Store `hmac(otp)` in `privateChallengeParameters` (never plaintext)

**`verify-auth-challenge.ts`**
- `answerCorrect = hmac(answer) === privateChallengeParameters.otpHash` (timing-safe compare)

**PostConfirmation trigger**: creates DynamoDB User record on first successful auth.

### Token Storage
- `AccessToken` + `IdToken`: React state + `sessionStorage` (page-refresh resilience)
- `RefreshToken`: Lambda `/auth/session` endpoint sets as `HttpOnly; Secure; SameSite=Strict` cookie — frontend never sees it
- On mount: `useAuth` calls `GET /auth/session` (sends cookie), Lambda returns fresh access/id tokens

---

## API Routes

All under `sst.aws.ApiGatewayV2`. Protected routes use Cognito JWT authorizer. Role enforcement in Lambda reads `event.requestContext.authorizer.jwt.claims["custom:role"]`.

### Public (no auth)
| Method | Path | Handler |
|---|---|---|
| GET | `/dojos` | `dojos/list` |
| GET | `/dojos/{dojoId}` | `dojos/get` |
| GET | `/dojos/{dojoId}/events` | `events/list` |
| GET | `/events/{eventId}` | `events/get` |

### Parent (auth required)
| Method | Path | Handler |
|---|---|---|
| POST | `/events/{eventId}/registrations` | `registrations/create` |
| GET | `/users/me` | `users/me` |
| PUT | `/users/me` | `users/update-me` |
| GET | `/users/me/registrations` | `registrations/list-mine` |
| DELETE | `/registrations/{registrationId}` | `registrations/cancel` |

### Coach / Lead Coach (admin routes)
| Method | Path | Handler |
|---|---|---|
| GET | `/admin/events/{eventId}/registrations` | `registrations/list` |
| GET | `/admin/events/{eventId}/registrations/export` | `registrations/export-csv` (returns S3 presigned URL) |
| GET | `/admin/events/{eventId}/waitlist` | `waitlist/list` |
| POST | `/admin/dojos/{dojoId}/events` | `events/create` |
| PUT | `/admin/events/{eventId}` | `events/update` |
| DELETE | `/admin/events/{eventId}` | `events/delete` |
| PUT | `/admin/registrations/{registrationId}` | `registrations/update` |
| POST | `/admin/events/{eventId}/waitlist/{id}/promote` | `waitlist/promote` |
| PUT | `/admin/dojos/{dojoId}/waitlist-mode` | `waitlist/update-mode` |
| POST | `/admin/events/{eventId}/ateliers` | `ateliers/create` |
| DELETE | `/admin/events/{eventId}/ateliers/{id}` | `ateliers/delete` |

### Super Admin
| Method | Path | Handler |
|---|---|---|
| POST | `/admin/dojos` | `dojos/create` |
| PUT | `/admin/dojos/{dojoId}` | `dojos/update` |
| GET | `/admin/ateliers` | `ateliers/list` |
| POST | `/admin/users/{userId}/role` | `users/assign-role` |

---

## Registration Capacity Logic (`packages/core/src/lib/capacity.ts`)

`registrations/create` Lambda uses a DynamoDB **transaction**:

1. `ConditionCheck` on Event item: `registrationCount < maxCapacity`
2. **If passes**: `Put` Registration (`status: "confirmed"`) + `Update` Event `registrationCount += 1` → send confirmation email
3. **If fails** (TransactionCanceledException): `Put` WaitlistEntry at next position + `Update` Event `waitlistCount += 1` → send waitlist confirmation email

**On cancellation** (`registrations/cancel`):
1. Set Registration `status: "cancelled"`, `registrationCount -= 1`
2. Query waitlist for first `status: "waiting"` entry (sorted by positionPadded)
3. If `waitlistMode === "auto"`: transactionally promote → create confirmed Registration → send promotion email
4. If `waitlistMode === "manual"`: notify lead coach only

---

## Frontend Structure (`packages/web/`)

### Pages & Routing (`react-router-dom` v7)
```
/                             → HomePage (dojo list + upcoming events)
/dojos/:dojoId/events         → EventListPage
/events/:eventId              → EventDetailPage
/register/:eventId            → RegisterPage (auth required)
/login                        → LoginPage
/login/verify                 → VerifyOtpPage
/dashboard/registrations      → MyRegistrationsPage (parent)
/dashboard/admin              → AdminDashboardPage (coach/lead_coach)
/dashboard/admin/events       → AdminEventsPage
/dashboard/admin/events/:id   → AdminEventEditPage
/dashboard/admin/events/:id/registrants  → AdminRegistrantsPage
/dashboard/admin/events/:id/waitlist     → AdminWaitlistPage
/dashboard/superadmin         → SuperAdminDojosPage
```

`<ProtectedRoute role={[...]}>` wrapper redirects unauthenticated/unauthorized users.

### MUI Setup
- Install `@mui/material @emotion/react @emotion/styled @mui/x-date-pickers`
- Use `ThemeProvider` with custom CoderDojo palette (orange primary `#E64626`, white)
- MUI components: `DataGrid` for registration tables, `DatePicker` for event dates, `Stepper` for registration form, `AppBar`/`Drawer` for admin shell

### Key Libraries
- **Forms**: `react-hook-form` + `zod` + `@hookform/resolvers`
- **Server state**: `@tanstack/react-query` v5
- **Auth client**: `amazon-cognito-identity-js`
- **HTTP**: `axios` with request interceptor (attaches Bearer token), response interceptor (handles 401 → refresh)
- **i18n**: `react-i18next` + `i18next-http-backend` + `i18next-browser-languagedetector`

### Translation Key Structure
```
auth.{enter_email, check_email, enter_code, invalid_code}
nav.{home, events, login, dashboard, logout}
events.{title, date, location, capacity, register, full, waitlist}
registration.{ninja_name, birthdate, atelier, needs_computer, previous_visits, heard_about, consent_photos, consent_contact}
admin.{dashboard, registrants, waitlist, export, promote, event_create}
```

---

## Predefined Ateliers (`packages/core/src/lib/ateliers.ts`)

```typescript
export const GLOBAL_ATELIERS = [
  { id: "scratch",   name: "Scratch",    ageGroup: "7-12" },
  { id: "lego",      name: "Lego WeDo",  ageGroup: "7-10" },
  { id: "microbit",  name: "Micro:bit",  ageGroup: "10-14" },
  { id: "python",    name: "Python",     ageGroup: "12-17" },
  { id: "minecraft", name: "Minecraft",  ageGroup: "8-14" },
  { id: "html",      name: "HTML/CSS",   ageGroup: "10-17" },
  { id: "arduino",   name: "Arduino",    ageGroup: "12-17" },
];
```

Per-event ateliers stored in `Event.ateliers[]` — merges global + custom. Admins add custom ateliers via `POST /admin/events/{id}/ateliers`.

---

## Email Templates (SES, `packages/core/src/lib/email-templates.ts`)

Four templates as TS functions returning `{ subject, html, text }`, language-aware via `preferredLang`:

1. **OTP** — "Your CoderDojo login code: {code} (expires in 10 min)"
2. **Registration confirmed** — event details, atelier, date/location, cancellation link
3. **Waitlisted** — position number, "we'll notify you if a spot opens"
4. **Promoted from waitlist** — "Good news! Your spot is confirmed"

All sent via `@aws-sdk/client-ses` `SendEmailCommand`.

---

## Scaffold Commands

```bash
# 1. Init SST (latest Ion)
cd /home/dojonl/code/CoderDojo-Event-Organizer
npx sst@latest init
# Choose: AWS, TypeScript

# 2. Configure root workspaces in package.json
# Add: "workspaces": ["packages/*"]

# 3. Create directory structure
mkdir -p infra
mkdir -p packages/core/src/{entities,types,lib}
mkdir -p packages/functions/src/{auth,dojos,events,registrations,waitlist,users,ateliers}
mkdir -p packages/web/src/{pages/{public,auth,parent,admin,superadmin},components/{layout,auth,events,registrations,admin},hooks,lib,i18n/locales/{en,fr,nl}}

# 4. Init packages
for pkg in core functions web; do
  cd packages/$pkg && npm init -y && cd ../..
done

# 5. Core deps
cd packages/core
npm install electrodb @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb @aws-sdk/client-ses ulid
npm install -D typescript @types/node

# 6. Functions deps
cd ../functions
npm install @aws-sdk/client-cognito-identity-provider @aws-sdk/client-ses
npm install -D typescript @types/node @types/aws-lambda esbuild

# 7. Web deps
cd ../web
npm create vite@latest . -- --template react-ts
npm install @mui/material @mui/x-date-pickers @emotion/react @emotion/styled
npm install react-router-dom @tanstack/react-query react-hook-form zod @hookform/resolvers
npm install i18next react-i18next i18next-http-backend i18next-browser-languagedetector
npm install amazon-cognito-identity-js axios dayjs

# 8. Deploy to dev
cd ../..
npx sst dev --stage dev
```

---

## Phased Delivery

### Phase 1 — MVP
- SST infra (DynamoDB, API GW, Cognito, SES, CloudFront)
- Passwordless auth (full OTP flow)
- Public: Home, Event Detail, Register pages
- Registration form with all required fields
- Capacity logic: confirmed vs waitlist
- Emails: OTP, confirmation, waitlist acknowledgment
- Admin: event list + read-only registrant list
- EN only (FR/NL i18n stubs ready)

### Phase 2 — Admin Management
- Event CRUD, atelier management
- Waitlist UI (auto/manual toggle, promote button)
- CSV export (S3 presigned URL)
- Registration cancellation by parent + auto-promote

### Phase 3 — Multi-Dojo + Super Admin
- Super Admin UI (dojo CRUD, role assignment)
- Multi-dojo routing

### Phase 4 — Polish
- FR/NL translations
- Stats dashboard (MUI charts or recharts)
- CoderDojo-branded email templates
- Custom domain (`events.coderdojo.be`) + ACM cert
- EventBridge Scheduler for event reminder emails

---

## Verification

1. `npx sst dev --stage dev` — live Lambda reload, confirms infra deploys cleanly
2. Trigger auth flow: enter email → receive OTP in inbox → paste code → get JWT
3. Submit registration form → verify DynamoDB item created with `status: confirmed` or `waitlisted`
4. Cancel a confirmed registration → verify waitlist entry promoted (auto mode) and email received
5. Admin dashboard: see registrant list, export CSV (verify presigned URL opens valid file)
6. `npm run typecheck` in root — zero TypeScript errors across all three packages

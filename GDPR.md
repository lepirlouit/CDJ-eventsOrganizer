# GDPR & Data Protection

This document records how the CoderDojo event organizer handles personal data and
how it meets core GDPR obligations.

## Personal data we store

| Entity | Personal data | Lawful basis |
|--------|---------------|--------------|
| `User` | name, email, phone, parent profile, consent flags | Account / contract |
| `Child` | child name, birthdate, gender (optional), notes | Consent (parent) |
| `Registration` / `WaitlistEntry` | child + parent name, email, phone, gender, custom answers | Contract (event participation) |
| `EventVolunteer` | coach name, email, skills | Consent |
| `DojoMembership` | role, check-in permission | Legitimate interest (org admin) |

## Consent

- `consentPhotos` and `consentContact` are captured at registration time.
- **Contact consent is enforced**: all promotional / mailing-list sends
  (`dojos/broadcast`) filter recipients to `consentContact === true`. Transactional
  email (registration confirmation, waitlist, OTP) is sent regardless, as it is
  necessary to fulfil the registration.
- Photo consent (`consentPhotos`) must be respected by any downstream photo use.

## Data subject rights

- **Access / portability** — `GET /users/me/data-export` returns the caller's full
  personal dataset (profile, children, registrations, waitlist, volunteer records)
  as JSON. Exposed in the UI as "Download my data" on the My Registrations page.
- **Erasure** — `DELETE /users/me` (`users/erase`) pseudonymizes the caller's data:
  registration/waitlist/volunteer records are retained for event history and
  capacity integrity but stripped of identifying fields (`[erased]`), child profiles
  are deleted, and the user profile is cleared. Exposed in the UI as "Erase my data".
  - **Manual follow-up**: removing the Cognito identity (so the email can no longer
    sign in) is an admin step — delete the user from the Cognito user pool. This is
    intentionally not automated to avoid accidental irreversible account loss.

## Retention

- Registrations are retained as event records. Recommended policy: pseudonymize or
  hard-delete personal fields on registrations older than **24 months** that are no
  longer needed for reporting. This is **not yet automated** — implement as a
  scheduled job (e.g. an SST cron) that scans `registration`/`waitlistEntry` by date
  and applies the same anonymization as `users/erase`.
- The CSV export (`registrations/export-csv`) returns a short-lived (5-minute)
  pre-signed S3 URL; exported files in the bucket should have an S3 lifecycle rule to
  expire after a few days (recommended — confirm the bucket policy in `infra/storage.ts`).

## Security

- All dojo-specific authorization is DB-based (`requireDojoCoach` /
  `requireDojoLeadCoach` / `requireCheckInCoach`), never trusting JWT claims for
  per-dojo roles.
- The scheduled security-audit agent (see README / `.claude`) reviews the codebase
  for regressions: unauthenticated endpoints, PII in logs/exports, missing role
  checks, and consent bypass.

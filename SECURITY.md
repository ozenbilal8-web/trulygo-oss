# Security policy and implementation notes

## Report a vulnerability privately

Use [GitHub private vulnerability reporting](https://github.com/ozenbilal8-web/trulygo-oss/security/advisories/new)
when the repository offers **Report a vulnerability**. This file does not
itself enable that feature. If unavailable, request a private contact channel
through a minimal issue without exploit details, credentials, or personal
data. Wait for that channel before sending the full report.

Include the affected commit/version, impact, minimal reproduction steps, and
your preferred contact method. Use synthetic data and redact tokens, cookies,
passwords, and personal information. Do not attach a full database export or
environment file. For a leaked key, identify the provider and location without
repeating the key value.

Do not open a public issue or pull request containing exploit details before
maintainers can investigate. Test only systems and accounts you are authorized
to use. This policy does not authorize testing the hosted TrulyGo service,
accessing another user's data, disruption, or third-party targets.

Maintainers will assess reports and coordinate a fix and disclosure as capacity
allows. There is no guaranteed response time, paid bounty, or support SLA.

## Supported code

Security fixes target the current `main` branch. There is no commitment to
backport fixes to old commits or independently deployed forks. Operators are
responsible for updating their code, migrations, Edge Functions, and provider
configuration together. A source change does not update a hosted installation.

## Current security boundaries

TrulyGo is designed around authenticated link creation, review before public
redirects, immutable approved destinations, and owner/admin authorization.
These are defense-in-depth controls, not a guarantee that every approved URL
remains safe. A remote destination can change after approval.

### Authentication, ownership, and database access

- Supabase Auth supplies user identity. `src/lib/auth/` and route/action checks
  protect the application; database policies and grants provide a separate
  access boundary.
- User data tables use RLS and ownership policies in `supabase/migrations/`.
  Verify the final policies and grants on the deployed database; migration
  files are not evidence that those migrations were applied.
- Admin operations require an admin profile. Ordinary users can update only
  granted profile fields, not their role. Do not use user-editable metadata to
  assign privileges.
- `src/lib/supabase/admin.ts` is `server-only`. Its service credential bypasses
  RLS, so every caller must establish its own authorization and input boundary.

### Trusted link creation and approval

- `src/lib/link-request-command.ts` supplies server-attested safety results to
  the service-role-only V2 RPC. The V2 path does not fall back to legacy INSERT
  when credentials, transport, or RPC execution fail.
- `20260712120000_contract_trusted_link_request_v2.sql` closes direct browser
  INSERT into `link_requests`. A fully migrated installation needs
  `TRULYGO_TRUSTED_LINK_CREATE_V2=true` and the server credential. See
  [self-hosting](docs/SELF_HOSTING.md) for the fresh-install/upgrade distinction.
- Web Risk classifies only the expected clean response as clean. Missing keys,
  blocked results, malformed responses, and lookup errors prevent automatic
  approval and leave requests for admin review.
- Pending, rejected, and suspended links must not produce public redirects.
  Database constraints/triggers enforce destination immutability after approval.
- HTTP/HTTPS validation, route reservations, and slug constraints are enforced
  at relevant application and database boundaries. Sources include
  `src/lib/urls.ts`, `src/lib/slugs.ts`, and the migrations.

### Auto-approval Edge Function

`supabase/functions/auto-approve-link-request/` is separately deployed. The
database trigger invokes it with `x-trulygo-webhook-secret`, which is compared
against the configured secret using a constant-time check.

The function checks URL parsing, credentials in URLs, hostnames, local/private
addresses, known shorteners, forbidden keywords, redirect hops, and reachability.
It resolves A/AAAA records and rejects known non-public address ranges. It
also has bot-block/reachability fallback behavior; review the source before
changing policy. Failed DNS resolution currently falls through to subsequent
checks. DNS checking is not a network-level guarantee against SSRF or rebinding.

`REQUIRE_LINK_SAFETY_ATTESTATION=true` requires trusted V2 clean attestation.
Existing deployments require a reviewed upgrade plan; this edition documents fresh isolated setup in [SELF_HOSTING.md](docs/SELF_HOSTING.md). Missing
Vault/`pg_net` configuration makes the trigger a no-op; it does not prove
automatic review took place. Never treat a missing worker as an approval.

### Rate limiting

`src/lib/rate-limit.ts` calls the database-backed fixed-window limiter.
`public.rate_limits` stores a hash of the action/key rather than the raw key.
Only the server service role may call the limiter RPC. Public and signed-in
clients cannot choose or consume another account's rate-limit bucket directly.
The server credential is required for authentication rate limiting as well as
trusted link creation; missing credentials make authentication fail closed.
Existing limits include:

| Action | Limit | RPC failure behavior |
| --- | --- | --- |
| Login by IP / email | 10 per 5 min / 8 per 10 min | Fail closed |
| Registration by IP / email | 5 per 10 min / 3 per 30 min | Fail closed |
| Password reset by IP / email | 5 per 15 min / 3 per 60 min | Fail closed |
| Link request by user / IP | 10 per 10 min / 20 per 10 min | Fail open |
| Channel creation by user / link | 20 per 10 min / 10 per 10 min | Fail open |
| Vitrine save by user / IP | 15 per 5 min / 30 per 5 min | Fail open |
| Vitrine upload by user / IP | 10 per 30 min / 20 per 30 min | Fail open |

Uploads consume limits when a real avatar/banner file is submitted. Global
rate limiting is not applied to every public route. The limiter is not
a substitute for trusted safety attestation, RLS, or admin review. Consider
these explicit fail-open cases when evaluating abuse risk.

### Analytics, uploads, and email

- `CLICK_VISITOR_HASH_SECRET` derives visitor/deduplication and collaboration
  keys. It must be private and unique to the environment. Development-only
  fallback constants in source are not production credentials.
- If this secret is missing in production, navigation can continue while
  visitor deduplication is degraded; profile-view recording and collaboration
  paths that require secure hashing do not proceed normally.
- Public short-link GETs can record click analytics. Profile views and survey
  interactions can write data. Use isolated projects even for browsing tests.
- Upload handling restricts accepted formats and updates storage/database
  state in a deliberate order. Storage policies and deployed bucket settings
  must be verified separately.
- Auth SMTP, application Resend email, and notification sender configuration
  are distinct. Use controlled recipients for tests; do not invoke the privacy
  notification route against a production user list as a smoke test.
- Hashing is a data minimization measure, not a blanket claim of anonymity or
  compliance. Operators must evaluate their actual data and retention behavior.

## Credentials and incident handling

`.env.example` contains placeholders; real `.env` files must stay outside Git.
The `NEXT_PUBLIC_` prefix is only for values that may be delivered to browsers.
Never use it for service credentials, API secrets, webhook secrets, or visitor
hash secrets. Keep GitHub Actions and contributor checks free of production
credentials.

If a real credential enters the repository:

1. Keep a private repository private while the incident is assessed. If already
   public, assume the credential may have been copied.
2. Identify its scope and consumers without publishing its value. Create and
   deploy a replacement through the owning provider, then revoke the old key
   with a sequence that preserves required service availability.
3. Remove it from current files and relevant history/refs using a reviewed
   cleanup plan. A new commit deleting a key does not remove old exposure;
   rewriting history does not revoke a key or remove others' copies.
4. Review access/audit evidence, forks, PR refs, artifacts, logs, and caches as
   applicable. Coordinate any provider or GitHub cleanup needed.
5. Re-scan the final repository and verify consumers use the replacement
   before declaring the incident resolved or making the repository public.

Automatic scans can miss secrets, personal data, and sensitive business
material. A clean scan is one input to release review, not proof of absence.

## Verification boundaries

Unit tests, source-contract tests, lint, and a build validate only their stated
scope. They do not prove live RLS, mail delivery, Storage policies, migration
state, current provider settings, or the absence of vulnerabilities. Use the
isolated integration checks in [DEVELOPMENT.md](docs/DEVELOPMENT.md) and document
unrun checks explicitly.

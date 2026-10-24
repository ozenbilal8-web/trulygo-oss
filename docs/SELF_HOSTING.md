# Self-hosting and isolated local setup

The application needs Supabase Auth, Postgres, and Storage. A plain PostgreSQL
server does not supply those schemas and services. Start with the dedicated
local setup below; no hosted account is needed for the manual-review flow.

## Prerequisites

- Node.js 24 and npm.
- Docker with a running Linux container engine.
- Supabase CLI 2.98.2. The commands below use the pinned project dependency without downloading a different version.

The clean install disables lifecycle scripts; `npm rebuild supabase` installs
the pinned official CLI binary through that package's installer.

Run all commands from this repository root. Read any tool installation prompt
before accepting it; use the official Supabase CLI distribution. The first
backend startup downloads container images and needs network access.

The committed configuration uses project ID `trulygo-oss-local`, API port
58421, database 58422, Studio 58423, and local email inbox 58424. Check that
these ports are available and belong to this instance before operating it.
Do not link the checkout to a hosted project for these steps.

## Start an empty local backend

```sh
npm ci --ignore-scripts
npm rebuild supabase
npx --no-install supabase start
node scripts/setup-local.mjs
npm run dev
```

The setup script reads local CLI status and writes an ignored `.env.local`
with the local URL and keys, a random local visitor-hash secret, and trusted
V2 link creation enabled. It rejects a non-loopback backend and refuses to
overwrite an existing environment file. Keep generated values out of logs,
commits, screenshots, and issue reports.

Open the application at <http://localhost:3000>, local Studio at
<http://127.0.0.1:58423>, and the captured Auth email inbox at
<http://127.0.0.1:58424>. The local inbox does not prove external email delivery.

Supabase startup applies `supabase/migrations/` in filename order. For a
clean integration rerun, `npx --no-install supabase db reset --local` discards this
local instance's data and reapplies migrations. Only use that command after
checking the current directory/project and accepting the loss of synthetic
local data. Never use a linked or remote reset as part of this procedure.

To stop this local backend, run `npx --no-install supabase stop`. Check the CLI's
current help before requesting deletion of saved local data.

## Register and review links

Register synthetic accounts through the application and confirm their emails
using the local inbox. The app does not ship an administrator password. To
appoint a local reviewer, first register and confirm that synthetic account,
then run:

```sh
node scripts/local-admin.mjs admin@example.invalid
```

Replace the example with the exact address of that existing local account.
The helper uses the generated local server key, requires the dedicated
loopback backend on port 58421, and promotes exactly that profile. It must
not be used against another deployment.

Normal user sessions must not be able to update their role. Use a second
ordinary account to create link requests, then the admin account to review
them. Without optional screening credentials, new requests remain pending
until reviewed. Approved destinations cannot be edited.

With the application running, execute the dedicated integration script:

```sh
npm run test:local
```

Stop your development server first. This runner refuses an occupied port 3000,
rebuilds with the verified local backend and disabled external integrations,
starts its own application server, and stops only that server when finished.
Do not invoke the lower-level `scripts/test-local.mjs` directly.

Read its output and scope, then perform the browser checks in
[DEVELOPMENT.md](DEVELOPMENT.md). It is separate from `npm test`.

## Environment reference

[`.env.example`](../.env.example) is the authoritative list of variables.
Use a different secret and backend for each environment.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your instance's Auth/API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe publishable or legacy anon key |
| `NEXT_PUBLIC_APP_URL` | Your instance's canonical origin; local default is `http://localhost:3000` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key required for authentication rate limits, trusted link creation and privileged operations |
| `TRULYGO_TRUSTED_LINK_CREATE_V2` | Exact value `true` for a fully migrated fresh instance |
| `CLICK_VISITOR_HASH_SECRET` | Private random value for visitor/deduplication hashes |
| `GOOGLE_WEB_RISK_API_KEY` | Optional Google Web Risk screening credential |
| `RESEND_API_KEY` | Optional application-email API credential |
| `RESEND_FROM` | Required verified sender when application email is enabled |
| `SUPPORT_EMAIL` | Optional server-side transactional email support contact |
| `NEXT_PUBLIC_OPERATOR_NAME` | Independent operator identity shown by legal pages |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Public support contact for your instance |
| `NEXT_PUBLIC_PRIVACY_EMAIL` | Public privacy contact for your instance |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | Explicit `true` to enable optional Vercel analytics |

Only public configuration belongs in a `NEXT_PUBLIC_` variable. Never put a
service-role key, API credential, webhook secret, or hash secret there.
The fully migrated database closes direct client INSERT into link requests;
setting the trusted V2 flag to `false` is not a supported fresh-install fix.

Slug writes require PostgreSQL's default READ COMMITTED isolation (the mode
used by PostgREST). Namespace triggers serialize conflicting main/channel slug
writes and check rows independently of caller visibility. The hardening
migration refuses any pre-existing cross-table collision for an operator to
resolve; it never deletes or renames existing links automatically.

## Optional integrations

**Auth email:** Local Auth mail is captured by the local inbox. For an
independent hosted instance, configure your own Auth Site URL, allowed
redirects, and SMTP separately. The templates in
[email-templates/](email-templates/README.md) use the configured Site URL and
single-use token hashes. The application has no UI for initiating email-address
changes; that template needs separate flow validation if you add one.

**Resend:** Application collaboration/notification email is separate from Auth
SMTP. Configure both the API key and a sender verified by your own account.
Absent configuration must not be treated as a successful send. Test only
controlled recipients, and verify actual delivery/bounce behavior separately.

**Web Risk and auto-approval:** Manual review is the default without a Google
Web Risk key or the worker's configuration. The optional Edge Function and
Vault webhook secrets require separate installation and validation. Consult
[the backend guide](../supabase/README.md) and the function source. Never bypass
pending review or weaken the trusted attestation boundary to make an
unconfigured integration appear functional.

**Analytics and legal content:** Review actual cookies, visitor hashes,
retention, and third-party requests before enabling analytics or publishing.
Configure operator/contact fields and adapt the legal templates to your own
service. The repository does not provide legal advice or certify compliance.

## Preparing an independent deployment

Build and test against a separate backend owned by the operator. Run all
checks in [DEVELOPMENT.md](DEVELOPMENT.md), including access-control and core
user flows. Keep unverified integrations clearly documented. Never reuse
local test credentials or a local visitor-hash secret for an exposed service.

```sh
npm run build
npm start
```

Public variables can be embedded at build time. Configure the correct origin
and public backend values before building; keep server secrets in the hosting
provider's secret store. There is no deployment workflow in this repository.
Applying code does not apply hosted migrations, Auth settings, Storage
policies, worker configuration, or email settings automatically.

Existing installations need a reviewed upgrade plan and backup strategy.
Do not replay the fresh-install procedure against user data. Files under
`supabase/post_deploy/` and `supabase/rollbacks/` are not part of bootstrap.

# Development and verification

Use Node.js 24 and the committed npm lockfile. The application is built with
Next.js App Router, React, TypeScript, Tailwind CSS, and Supabase. Start with
[SELF_HOSTING.md](SELF_HOSTING.md) for a dedicated local backend.

## Clean install and static checks

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run lint
npm test
npm run build
npm run typecheck
npm run audit
npm run licenses
```

The build generates Next.js route types used by the typecheck. Run these from
an empty checkout for release verification, not only from a developer's warm
cache. Do not supply production environment values to a build or test process.

`npm test` runs Node's test runner. Some tests execute pure functions; others
assert contracts in route, component, or migration source. A passing source
assertion does not establish behavior of a deployed database or integration.

After building, run the public browser suite with the pinned Playwright
installation:

```sh
npx --no-install playwright install chromium
npm run test:e2e
```

It uses a dedicated loopback server and blocks non-loopback browser requests.
It covers public UTM, validation, copying, and signup handoff; it does not
establish that a database-backed signup or external integration works.

CI installs the exact lockfile with lifecycle scripts disabled, then runs
lint, tests, build, TypeScript, dependency audit, and license checks. A separate
workflow scans the working tree and fetched Git history with redacted output.
Dependabot proposes npm and GitHub Actions updates. Review updates and their
licenses before merging.

## Isolated integration checks

Use the local instance and synthetic test accounts only. Record the exact
commit, commands, environment, and results. Mark checks not executed as
**not run**; do not infer external delivery from a mock or database test.

1. Apply all migrations to an empty database and verify Auth/Storage startup.
2. Register a synthetic user, confirm the local email, log in, and log out.
   Check an incorrect password and a logged-out dashboard request.
3. Create a second user and verify cross-user reads/updates fail. Check that
   browser roles cannot promote themselves to admin or directly insert a link.
4. Submit an HTTP/HTTPS destination through the application. With no Web Risk
   key, verify it stays pending. Check invalid URLs and reserved slugs.
5. Promote a dedicated local account to admin. Approve the test request,
   verify its redirect and destination, and confirm the approved destination
   cannot be changed. Rejected or suspended requests must not redirect.
6. Check QR/UTM output, channel links, and analytics using synthetic traffic.
7. Verify link profiles, upload ownership, and surveys separately if changed.
8. Exercise password recovery with the local email inbox. External Auth SMTP,
   Resend delivery, Google Web Risk, and Edge Function networking require their
   own controlled integration checks; they are optional and separate from the
   local manual-review flow.

## Data and code boundaries

Ordinary clients use Supabase Auth plus RLS. Server actions must verify user
identity and ownership before privileged work. `src/lib/supabase/admin.ts`
contains the service-role adapter and must remain server-only. A service key
bypasses RLS; the caller must enforce authorization. Public redirect and
analytics RPCs must expose only the intended minimum data.

The trusted V2 link-creation path and the final contract migration must be
configured together. A fully migrated database requires
`TRULYGO_TRUSTED_LINK_CREATE_V2=true`; do not re-enable direct client inserts to
work around configuration errors.

Add a forward migration for an existing deployment. Do not edit a previously
applied migration in place or replay bootstrap against a database with user
data. `supabase/post_deploy/` and `supabase/rollbacks/` are not bootstrap files.

## Screenshots and documentation

Capture screenshots from a local instance with synthetic data. Never include
tokens, personal account details, real link destinations, or provider consoles.
Describe the displayed state honestly, including unavailable integrations.

Keep new assets' provenance and license in
[THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md). Update documentation with the
final behavior and commands actually tested.

## Dependency compatibility notes

Scoped overrides update ExcelJS's `uuid` and `unzipper` dependencies and the
Supabase CLI's `tar` dependency to address audit findings. They do not change
the original dependency licenses. Keep regression checks for the application's
XLSX export and ZIP paths when updating them. ExcelJS streaming import is not
an application feature; a successful export check is not a claim of support
for every upstream reader/streaming API.

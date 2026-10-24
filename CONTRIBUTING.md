# Contributing to TrulyGo OSS

Contributions to documentation, tests, accessibility, bug fixes, and the
application are welcome. Please follow the [Code of Conduct](CODE_OF_CONDUCT.md).
For a vulnerability or leaked credential, use the private reporting process in
[SECURITY.md](SECURITY.md), not a public issue or pull request.

## Before changing code

1. Read the [development guide](docs/DEVELOPMENT.md) and relevant source/tests.
2. Search existing issues and pull requests. For a substantial feature or data
   model change, explain the problem and proposed scope in an issue first.
3. Create a branch from the current `main`. Keep each change focused.
4. Use synthetic data and the dedicated local Supabase setup. Even a
   short-link GET can record analytics data.

Use English or Turkish in issues and pull requests. Keep user-facing Turkish
copy consistent with the surrounding interface.

## Implementation expectations

- Preserve existing Auth, ownership checks, RLS, service-role boundaries,
  immutable destinations, and approval behavior.
- Keep service credentials on the server. Never put a secret in a
  `NEXT_PUBLIC_` variable, log, screenshot, fixture, or issue attachment.
- Add a regression test for a behavior change where it would catch the bug;
  documentation-only changes do not need artificial tests.
- Explain schema and API compatibility. Do not rewrite an already deployed
  migration to change a live database; add an ordered forward migration with
  a rollout and recovery plan.
- Do not run hosted migrations, send real user email, or deploy from a
  contribution without authorization from the deployment owner.
- Add dependencies only when needed; explain why and retain their license
  notices. Commit intentional lockfile changes and avoid unrelated upgrades.
- Contribute only material you have the right to license. Do not copy private
  customer data, proprietary code, or unlicensed assets into the repository.

## Validate and submit

```sh
npm ci
npm run lint
npm test
npm run build
npm run typecheck
npm run audit
npm run licenses
```

Use the pull request template to describe the behavior, verification, and any
remaining limitations. Include redacted before/after screenshots for visible
interface changes where useful. Mark live integration checks as not run when
you did not execute them; a passing source test is not live service evidence.

Maintainers review scope, correctness, security, and compatibility before
merging. A review may request changes, defer a feature, or decline a proposal.
There is no guaranteed response time. Keep fixes on the same branch while a
pull request is open and avoid rewriting other contributors' work.

Unless explicitly agreed otherwise, contributions to original project code
are provided under the repository's [MIT License](LICENSE). Third-party
material keeps its original license and attribution requirements.

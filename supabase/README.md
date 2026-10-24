# Local backend and optional auto-approval

For a fresh development instance, follow
[the isolated local setup](../docs/SELF_HOSTING.md). `config.toml` declares the
`trulygo-oss-local` stack. Migrations depend on Supabase Auth and Storage;
they are not a generic PostgreSQL bootstrap.

The default development flow uses manual administrator review. Local setup
requires no hosted project, Web Risk account, or deployed Edge Function.
The Edge runtime is disabled in the default configuration.

## Migration boundaries

Apply all files in `migrations/` in ascending filename order to an empty
instance. The final contract migration disables direct client INSERT into
`link_requests`; configure `TRULYGO_TRUSTED_LINK_CREATE_V2=true` and the local
server credential. Do not reopen the old client INSERT path.

`post_deploy/` and `rollbacks/` contain narrowly scoped operational SQL and are
not bootstrap files. An existing deployment needs a reviewed migration and
recovery plan. Never replay or reset an unrelated database to test this code.

## Optional Edge Function

`functions/auto-approve-link-request/` is a separate worker. Its environment
example is `functions/.env.example`. Do not enable it until the manually
reviewed flow, trusted safety attestation, and worker authorization have been
tested in an isolated instance.

The worker can approve a pending request only after its checks. Failed checks
leave the request pending for a human reviewer; absence of a worker is not an
approval. Its update sets the approval status, reviewer UUID, and review time.

| Setting | Meaning |
| --- | --- |
| `SUPABASE_URL` | The worker's own isolated backend API |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged server-only credential for that backend |
| `LINK_REQUEST_AUTO_APPROVE_WEBHOOK_SECRET` | Secret shared by the trigger and worker |
| `LINK_REQUEST_AUTO_APPROVER_USER_ID` | Exact Auth UUID of a dedicated reviewer account in the same backend |
| `REQUIRE_LINK_SAFETY_ATTESTATION` | Keep `true` for a fresh fully migrated instance |

The database trigger uses Supabase Vault and `pg_net`. It expects Vault values
named `project_url` and `link_request_auto_approve_webhook_secret`. The latter
must match the worker's secret; the worker authenticates the
`x-trulygo-webhook-secret` header with a constant-time comparison. Missing
extensions or Vault configuration make the trigger a no-op. They do not
establish that any URL was reviewed.

Before enabling the worker, the operator must configure their own extensions,
Vault values, and runtime, then verify rejection of unauthorized calls and the
clean, blocked, malformed, and transport-error cases. The worker performs its
own shared-secret authorization; any decision to disable platform JWT checks
must be paired with validation of that boundary. No deployment is performed
by repository CI or by the local manual-review setup.

## Review and network limitations

The worker validates HTTP/HTTPS URLs, credentials in URLs, hostnames,
shorteners, keywords, redirect targets, DNS answers, and reachability. It
rejects known non-public IP ranges in successful DNS results. It also has
bot-block and reachability fallbacks; read the implementation before choosing
it as your moderation policy.

Failed DNS resolution can fall through to subsequent checks. These checks
are not a network-level guarantee against SSRF or DNS rebinding. Destination
content can change after approval. Restrict worker network access where
appropriate and retain the manual review path.

Next.js Web Risk screening is separate from the worker's checks. A missing,
failed, or non-clean Web Risk result does not provide trusted clean attestation.
Never lower the worker's strict attestation flag to work around an unconfigured
provider. Consult [SECURITY.md](../SECURITY.md) for additional boundaries.

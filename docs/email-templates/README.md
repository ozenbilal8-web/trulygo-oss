# Auth email templates

These are source templates for an independent Supabase Auth installation.
They do not modify any provider settings by being committed. Configure them
only on a backend you own, with its Site URL and allowed redirects.

| File | Auth template | Purpose |
| --- | --- | --- |
| `supabase-confirm-signup.html` | Confirm sign up | Verify a new account |
| `supabase-reset-password.html` | Reset password | Start password recovery |
| `supabase-change-email.html` | Change email address | Reference for a separately validated email-change flow |

Adjacent `.txt` files are plain-text reference copies. Where the provider
accepts only HTML, use the HTML file. The interface and email copy are Turkish.

The templates use `{{ .SiteURL }}` for the instance's origin and
`{{ .TokenHash }}` for the single-use token hash. The email-change template uses
`{{ .NewEmail }}`, escaped by the provider's template engine. Do not disable
escaping or add tracking parameters to authentication links.

```text
signup:   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/dashboard
recovery: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
email:    {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard
```

HTML uses `&amp;` in attributes. `/auth/confirm` exchanges the hash with Auth;
password recovery then continues at `/reset-password`. The application does
not currently provide an account-email-change initiation screen. Validate
that flow separately before enabling it in a fork.

The templates contain no production sender, contact address, or external logo
URL. Keep any branding you add within your redistribution rights and use a
public asset hosted on your own origin if required. Configure a real support
contact in your instance rather than copying another operator's address.

Auth SMTP is independent of the application's `RESEND_API_KEY`. Locally,
use the captured inbox described in [SELF_HOSTING.md](../SELF_HOSTING.md).
For external delivery, consult current [Supabase Auth template guidance](https://supabase.com/docs/guides/auth/auth-email-templates)
and [SMTP guidance](https://supabase.com/docs/guides/auth/auth-smtp), then test
with controlled recipients. An HTML source test or local captured message
cannot establish external delivery or rendering in Gmail/Outlook.

Check sign-up, expired/reused tokens, password recovery, destination URLs,
mobile rendering, and sender authentication. Email security scanners may
prefetch single-use links; test this behavior with your actual provider.
Keep user data and tokens out of published screenshots and logs.

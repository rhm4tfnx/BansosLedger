# Operational Runbook — BansosLedger

## 1. Host reconciliation cron

Reconciliation is scheduled on the host, not Vercel. Install the following in root's crontab:

```cron
SHELL=/bin/bash
BASH_ENV=/etc/bansos/cron.env
*/5 * * * * flock -n /tmp/bansos-reconcile.lock /opt/bansos/scripts/cron/reconcile.sh >> /var/log/bansos-cron.log 2>&1
```

`/etc/bansos/cron.env` must be a root-only shell environment file (owner `root:root`, mode `0600`) exporting `APP_BASE_URL` and `CRON_SECRET`. Bash reads it through `BASH_ENV`; the script consumes the exported environment. Use the canonical HTTPS application URL without a trailing slash. Never commit this file, put the secret in the crontab, or enable shell tracing.

Deploy the executable script at `/opt/bansos/scripts/cron/reconcile.sh`. Keep the script and its parent directories root-owned and not writable by other users. Pre-create `/tmp/bansos-reconcile.lock` as a root-owned regular file with mode `0600` after each reboot, and keep `/var/log/bansos-cron.log` root-owned with mode `0600`; configure log rotation. The lock prevents overlapping host runs. The endpoint also enforces its existing lease, Bearer secret and execution deadline. Requests use POST only; curl fails on HTTP errors and times out after 70 seconds without retrying.

This repository change does not install the crontab, create the secret file, or invoke reconciliation. Those are host-administrator deployment steps.

---

## 2. Reverse proxy query-string logging (UU PDP)

Per UU PDP privacy rules, a NIK (or any other personal identifier) must never be persisted in access logs. Although the application rejects 16-digit query values with HTTP 400 `NIK_IN_QUERY`, the reverse proxy (**Caddy**, deployed in front of Next.js on VPS-1 per PRD §7.6) must also strip query strings for `/api/**` before writing access logs so accidental client requests never record raw query parameters on disk.

Include the following `log` filter inside the site block in `/etc/caddy/Caddyfile`:

```caddyfile
bansos.example.go.id {
    log {
        output file /var/log/caddy/access.log {
            roll_size 50MiB
            roll_keep 10
        }
        format filter {
            wrap json
            fields {
                request>uri regexp {
                    find "^(/api(?:/[^?]*)?)\\?.*$"
                    replace "$1"
                }
            }
        }
    }

    reverse_proxy 127.0.0.1:3000
}
```

Reload Caddy (`systemctl reload caddy`) after validating the configuration with `caddy validate --config /etc/caddy/Caddyfile`.

---

## 3. Boot-time environment validation & standalone deployment

1. **Fail-fast boot validation (`src/instrumentation.ts`)**:
   - When the Next.js server starts in production (`NODE_ENV=production` on the Node.js runtime, outside `next build`), `register()` calls `validateServerEnvironment()` from `src/lib/env.ts`.
   - If any required environment variable (`APP_BASE_URL`, `MONGODB_URI`, `NIK_ENC_KEY`, `NIK_INDEX_KEY`, `COMMITMENT_PEPPER`, `MFA_ENC_KEY`) is missing or malformed, the server throws an error listing the invalid variable names (never their values) and refuses to start.
   - `NEXT_PUBLIC_ENABLE_UI_ROLE_PREVIEW` must never be set to `'true'` in production; `next.config.mjs` aborts the production build if it is enabled.
2. **Standalone output (`output: 'standalone'`)**:
   - `pnpm build` produces `.next/standalone/server.js`.
   - Copy `public/` to `.next/standalone/public` and `.next/static/` to `.next/standalone/.next/static` when packaging the release artifact or container image, then start with `NODE_ENV=production node .next/standalone/server.js`.

---

## 4. Nonce-based Content-Security-Policy (Report-Only vs Enforce)

1. `src/proxy.ts` generates a unique base64 cryptographic nonce per request (`x-nonce`) and attaches a nonce-based CSP header to every page response.
2. By default (`CSP_ENFORCE` unset or `'false'`), the header is emitted as `Content-Security-Policy-Report-Only` so any unexpected third-party or inline resource is reported without breaking page rendering.
3. After verifying zero CSP violations across all public pages with Playwright (`pnpm test:e2e`), set `CSP_ENFORCE=true` in the production environment to switch the response header to enforced `Content-Security-Policy`.

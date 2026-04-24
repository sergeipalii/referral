# Paddle integration — operator setup

One-time dashboard work to go from "Paddle code is merged" to "real
customers can pay". Three tracks run in parallel:

1. **Sandbox** — no KYC, immediate. Unblocks local end-to-end smoke testing.
2. **Production application** — 1–3 day wait on Paddle business
   verification. Submit first, iterate on sandbox while they review.
3. **Website Verification (domain approval)** — separate from business
   verification. Required in prod before `refledger.io` can open the
   checkout overlay.

Paddle's dashboard menu labels shift between releases; prefer the
breadcrumb hints below ("Developer Tools → …") over exact click paths.

---

## 1. Sandbox (do first, no KYC)

Sandbox is a fully isolated playground. Test cards work, no KYC, but
**objects do NOT migrate to prod** — products, prices, and webhook
destinations are re-created from scratch when flipping environments.

### 1.1. Register

1. Open **https://sandbox-login.paddle.com/signup** — separate origin from
   the prod login. Don't confuse the two.
2. Email + password. Email verification is standard.
3. On the first onboarding screen pick **Paddle Billing** (NOT "Paddle
   Classic"). Our `@paddle/paddle-node-sdk` only works with v4 Billing.
4. "What kind of business?" — answer truthfully (SaaS, solo). Sandbox
   metadata is non-binding.

### 1.2. Website Verification — skip in sandbox

**In sandbox Test mode, domain approval is not enforced.** Paddle.js
identifies a sandbox client-side token and bypasses the domain check, so
`http://localhost:3000/billing` opens the overlay fine without any
domain list entry.

The Website Approval screen (**Checkout → Website Approval**) actively
rejects `localhost` as "Invalid domain name" — it only accepts
FQDNs.

Webhook destinations (ngrok URL in 1.7) also do NOT need domain
approval — that screen is purely about where the checkout **overlay**
loads from (customer browser), not where webhooks **land** (our server).

Domain approval is a **production-only** step — come back to it in
`refledger.io` prod dashboard after KYC (section 3).

### 1.3. Create Products + Prices

Each of the three paid tiers = one Product + one Price.

1. Dashboard → **Catalog** → **Products** → **New product**.
2. Create three:
   - **Starter** — tax category "Standard digital goods" (or "SaaS"
     if the dashboard offers it as a preset).
   - **Pro**
   - **Business**
3. For each product → **Add price**:

   | Plan     | Amount       | Billing period | Trial    |
   |----------|--------------|----------------|----------|
   | Starter  | `19.00 USD`  | Monthly        | 14 days  |
   | Pro      | `49.00 USD`  | Monthly        | 14 days  |
   | Business | `199.00 USD` | Monthly        | 14 days  |

4. After saving each, copy the Price ID (format `pri_01abc…`). Stash
   somewhere — you paste them into `.env` at 1.6.

### 1.4. API key (backend)

1. **Developer Tools** → **Authentication** → **API keys** → **Generate**.
2. Scopes: full access to `subscriptions`, `customers`, `transactions` is
   the minimum. Without them `paddle.customers.create(...)` 403s.
3. Copy the key — **shown once only**. Format `pdl_sdbx_apikey_01abc…`.
4. Goes into `.env` as `PADDLE_API_KEY`.

### 1.5. Client-side token (frontend)

1. **Developer Tools** → **Client-side Tokens** → **Generate**.
2. Default scopes are fine.
3. Format `test_…` (sandbox) or `live_…` (prod); long. Safe to expose to
   the browser — that's the whole point of a separate artefact from the
   server API key.
4. Goes into `.env` as `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`.

### 1.6. Populate `.env`

In the repo root (next to `.env.example`):

```env
PADDLE_ENVIRONMENT=sandbox
PADDLE_API_KEY=pdl_sdbx_apikey_01abc...
PADDLE_WEBHOOK_SECRET=                 # filled in step 1.7
PADDLE_PRICE_STARTER=pri_01...
PADDLE_PRICE_PRO=pri_01...
PADDLE_PRICE_BUSINESS=pri_01...
NEXT_PUBLIC_PADDLE_ENV=sandbox
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=test_...
```

### 1.7. Webhook destination + secret

Paddle POSTs webhooks to a public URL. Local backend behind NAT → need a
tunnel.

1. Run ngrok against the backend port:

   ```bash
   ngrok http 3001
   ```

   Copy the generated `https://abc123.ngrok-free.app`.

2. Sandbox dashboard → **Developer Tools** → **Notifications** →
   **New destination**.

3. Fill:
   - **URL**: `https://abc123.ngrok-free.app/api/webhooks/paddle`
   - **Description**: "Local dev"
   - **Events** (check the ones `handlePaddleEvent` in
     `billing.service.ts` actually handles):
     - `subscription.created`
     - `subscription.activated`
     - `subscription.updated`
     - `subscription.canceled`
     - `subscription.past_due`
     - `subscription.paused`
     - `subscription.resumed`
     - `subscription.trialing`
     - `transaction.completed`
     - `transaction.billed`
     - `transaction.paid`
     - `transaction.payment_failed`

4. Save → Paddle shows the **Secret key** (format `pdl_ntfset_…`). Goes
   into `.env` as `PADDLE_WEBHOOK_SECRET`.

### 1.8. Run migration + smoke test

```bash
docker compose up -d postgres
npm -w @referral-system/backend run migration:run   # applies SwitchStripeToPaddle1776700000000
npm run dev:backend
npm run dev:frontend
```

Register a new user, open `/billing`, click **Upgrade to Pro**. In the
overlay use test card `4242 4242 4242 4242`, any future expiry, any CVC.

Expected:
- Overlay closes on completion.
- Within ~2s `/billing` refetch shows Pro + trial badge.
- Backend logs: `subscription.created` and `transaction.completed`
  processed successfully.
- Paddle dashboard → **Notifications** → **Deliveries** — all events with
  200 OK.

Troubleshooting:
- Webhook returning 400 → signature mismatch. Double-check
  `PADDLE_WEBHOOK_SECRET` matches the one in Paddle dashboard.
- Webhook returning 500 → look at backend logs and `handlePaddleEvent`.
- Overlay refusing to open → domain not approved in 1.2, OR
  `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` missing from the build (Docker build
  args must match the env).

---

## 2. Production application (1–3 day wait)

Submit in parallel with sandbox work. You can develop + test against
sandbox while Paddle reviews the business.

### 2.1. Register

1. **https://login.paddle.com/signup** — different origin from sandbox.
2. Email + password **separate** from the sandbox account. Paddle
   deliberately isolates them.
3. Onboarding → pick **Paddle Billing**.

### 2.2. Business verification (KYC)

Paddle will ask for:

1. **Company details**
   - Legal entity name (as on official documents — sole proprietor / LLC / etc.)
   - Country of incorporation
   - Business registration number / Tax ID
   - Trading name: `Refledger`
2. **Business activity description**
   - One sentence: "SaaS platform for SaaS companies to run affiliate /
     referral programs" works.
   - Industry: **Software / SaaS**.
3. **Billing address** (legal company address)
4. **Banking info** — IBAN / routing + account for payouts. Paddle holds
   funds ~30 days + net-30 payout cycle by default; it takes its fee,
   remits the rest.
5. **ID verification** — passport or driver's license of the beneficial
   owner. Paddle redirects to Persona (or similar KYC provider) for the
   upload.
6. **Refund policy URL** and **Terms URL** — `/privacy` and `/terms` on
   refledger.io (launch-readiness #1).

### 2.3. Product approval

Paddle also reviews the product itself (fraud / chargeback risk). For a
clear-value SaaS this is usually quick, but may require:

- Demo screenshots / direct links — point them at `/system-overview`.
- A monitored support email — confirm `hello@refledger.io` actually
  answers (launch-readiness #5 still pending).
- Supported countries — "worldwide except sanctioned" is fine; Paddle
  maintains the exclusion list.

### 2.4. Wait

- Typically 1–3 business days.
- They may email for additional documents — respond promptly, the review
  pauses until you reply.
- Partial approvals happen: checkout-enabled, payouts blocked until full
  verification. OK for a smoke test with a real card.

---

## 3. Website Verification (production)

Separate step after business approval. Without it the checkout overlay on
refledger.io will refuse to open with `Domain not approved`.

### 3.1. Add the domain

1. Prod dashboard → **Checkout** (or **Developer Tools**) →
   **Website Verification** → **Add Domain**.
2. Enter `refledger.io` (no `https://`, no `www`).
3. Paddle offers one of two verification methods:

### 3.2. Ownership proof — pick one

**Option A — Meta tag** (simplest, recommended):
1. Paddle provides `<meta name="paddle-verification" content="abc123..." />`.
2. Insert into `<head>` of `apps/frontend/src/app/layout.tsx`.
3. Deploy. Click **Verify** in Paddle — they'll HEAD / GET the root and
   look for the tag.

**Option B — DNS TXT record** (if you don't want a code change):
1. Paddle provides a TXT record value like `paddle-verification=abc123...`.
2. Namecheap (or current registrar) → Advanced DNS → New record:
   - Type: **TXT Record**
   - Host: `@`
   - Value: `paddle-verification=abc123...`
   - TTL: Automatic
3. DNS propagates in 5–10 minutes, then **Verify**.

Meta tag is faster — no DNS change, single commit, no propagation wait.

### 3.3. After domain approval

1. Create Products + Prices in the **prod** dashboard from scratch —
   sandbox objects don't migrate. Same amounts, same trials. Capture new
   prod Price IDs.
2. Generate **prod** API key, **prod** client-side token, **prod**
   webhook destination → `https://refledger.io/api/webhooks/paddle`.
   Capture the new webhook secret.
3. On the VPS, update `.env`:

   ```env
   PADDLE_ENVIRONMENT=production
   PADDLE_API_KEY=<prod api key>
   PADDLE_WEBHOOK_SECRET=<prod secret>
   PADDLE_PRICE_STARTER=<prod price id>
   PADDLE_PRICE_PRO=<prod price id>
   PADDLE_PRICE_BUSINESS=<prod price id>
   NEXT_PUBLIC_PADDLE_ENV=production
   NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=<prod client token>
   ```

4. Rebuild the frontend — client token + env are baked into the browser
   bundle at build time:

   ```bash
   docker compose up -d --build frontend
   ```

   Backend reads `.env` on restart — no rebuild needed:

   ```bash
   docker compose restart backend
   ```

5. Smoke: register a throwaway account on refledger.io, upgrade to
   Starter ($19) with a **real card**. Cheapest way to verify prod end-to-end.
   Refund from Paddle dashboard afterwards.
6. Update `docs/launch-readiness.md` — mark item #3 fully done with the
   prod-verification date.

---

## Timing checklist

| Stage                           | Time          | Can parallel with |
|---------------------------------|---------------|-------------------|
| 1.1–1.8 Sandbox setup + smoke   | 30–60 min     | (2) and (3)       |
| 2.1–2.3 Prod application        | 30 min to fill | —                |
| Paddle reviews the business     | 1–3 workdays  | ⏳ wait           |
| 3.1–3.2 Domain approval         | 10 min (meta tag) | — after (2)   |
| 3.3 Prod smoke                  | 15 min        | — final step      |

---

## Common pitfalls

- **Two different login URLs** (sandbox vs prod). If you enter
  sandbox credentials on the prod page it'll just redirect and confuse.
  Label your browser tabs.
- **Paddle Billing vs Paddle Classic**. We integrate with Billing (v4).
  If the account lands on Classic, the API is incompatible with our SDK.
  Switch via the account menu.
- **Sandbox `PADDLE_PRICE_*` don't work in prod**. Price IDs are
  environment-specific. Forget to re-create them and the overlay will
  open, then fail with "price not found".
- **Meta tag must be served from the domain root**. Our `/` = the landing
  page; `layout.tsx` sets `<head>` for it — fine.
- **Client token expiry**. Prod tokens usually don't expire, but sandbox
  tokens can invalidate after ~90 days. If checkout suddenly breaks,
  regenerate the client token first.
- **`PADDLE_WEBHOOK_SECRET` mismatch**. Every `400` on the webhook
  endpoint is almost certainly this. Copy-paste the secret again; Paddle
  lets you re-reveal it from the dashboard.

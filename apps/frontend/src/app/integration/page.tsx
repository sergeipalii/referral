'use client';

import Link from 'next/link';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card, CardHeader, CardBody } from '@/components/ui/card';

export default function IntegrationPage() {
  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold mb-2">Integration Guide</h1>
      <p className="text-gray-500 mb-6">
        Track conversions by sending events from your backend server. Works with
        any stack — direct server integration, webhooks from MMP
        (AppsFlyer, Adjust), or any other server-side source.
      </p>

      {/* Overview */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-lg font-semibold">How It Works</h2>
        </CardHeader>
        <CardBody>
          <div className="text-sm text-gray-600 space-y-3">
            <p>
              All conversion events are sent to our API from your backend
              server. This ensures that credentials never leave a trusted
              environment and that every event is validated by your business
              logic before being tracked.
            </p>
            <div className="bg-gray-50 border rounded-lg p-4 font-mono text-xs">
              <p className="text-gray-500 mb-2">
                Scenario 1: Direct server integration
              </p>
              <p>
                User action &rarr; Your backend processes it &rarr;{' '}
                <strong>POST /api/conversions/track</strong>
              </p>
              <p className="text-gray-500 mt-4 mb-2">
                Scenario 2: Mobile app installs via MMP
              </p>
              <p>
                App install &rarr; AppsFlyer/Adjust attributes &amp; validates
                &rarr; Postback to your server &rarr;{' '}
                <strong>POST /api/conversions/track</strong>
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Step 1 */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-lg font-semibold">1. Create an API Key</h2>
        </CardHeader>
        <CardBody>
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              Go to{' '}
              <Link
                href="/api-keys"
                className="text-indigo-600 underline font-medium"
              >
                API Keys
              </Link>{' '}
              and create a new key. You will receive:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <strong>API Key</strong> — identifies your account, sent in
                every request
              </li>
              <li>
                <strong>Signing Secret</strong> — used to sign request body with
                HMAC-SHA256
              </li>
            </ul>
            <p className="text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2">
              Both values are shown only once at creation. Store them in your
              server&apos;s environment variables — never in client-side code,
              mobile apps, or version control.
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Step 2 */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-lg font-semibold">2. API Reference</h2>
        </CardHeader>
        <CardBody>
          <div className="text-sm space-y-4">
            <code className="block bg-gray-900 text-green-400 rounded-lg p-4 text-xs">
              POST /api/conversions/track
            </code>

            <div>
              <p className="font-medium text-gray-700 mb-2">Headers</p>
              <div className="bg-gray-50 border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-gray-100">
                      <th className="text-left p-2 font-medium">Header</th>
                      <th className="text-left p-2 font-medium">Required</th>
                      <th className="text-left p-2 font-medium">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-2">
                        <code>X-API-Key</code>
                      </td>
                      <td className="p-2">Yes</td>
                      <td className="p-2">Your API key</td>
                    </tr>
                    <tr>
                      <td className="p-2">
                        <code>X-Signature</code>
                      </td>
                      <td className="p-2">Yes</td>
                      <td className="p-2">
                        HMAC-SHA256 signature:{' '}
                        <code>sha256=&lt;hex&gt;</code>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2">
                        <code>Content-Type</code>
                      </td>
                      <td className="p-2">Yes</td>
                      <td className="p-2">application/json</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <p className="font-medium text-gray-700 mb-2">Request Body</p>
              <div className="bg-gray-50 border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-gray-100">
                      <th className="text-left p-2 font-medium">Field</th>
                      <th className="text-left p-2 font-medium">Type</th>
                      <th className="text-left p-2 font-medium">Required</th>
                      <th className="text-left p-2 font-medium">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-2">
                        <code>partnerCode</code>
                      </td>
                      <td className="p-2">string</td>
                      <td className="p-2">Yes</td>
                      <td className="p-2">Partner referral code</td>
                    </tr>
                    <tr>
                      <td className="p-2">
                        <code>eventName</code>
                      </td>
                      <td className="p-2">string</td>
                      <td className="p-2">Yes</td>
                      <td className="p-2">
                        Event type (e.g. &quot;install&quot;,
                        &quot;subscribe&quot;)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2">
                        <code>eventDate</code>
                      </td>
                      <td className="p-2">string</td>
                      <td className="p-2">No</td>
                      <td className="p-2">
                        ISO date (YYYY-MM-DD). Defaults to today
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2">
                        <code>count</code>
                      </td>
                      <td className="p-2">integer</td>
                      <td className="p-2">No</td>
                      <td className="p-2">Number of events. Defaults to 1</td>
                    </tr>
                    <tr>
                      <td className="p-2">
                        <code>revenue</code>
                      </td>
                      <td className="p-2">number</td>
                      <td className="p-2">No</td>
                      <td className="p-2">
                        Revenue amount for percentage rules. Defaults to 0
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2">
                        <code>idempotencyKey</code>
                      </td>
                      <td className="p-2">string</td>
                      <td className="p-2">No</td>
                      <td className="p-2">
                        Unique key to prevent duplicate processing (max 255
                        chars)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2">
                        <code>externalUserId</code>
                      </td>
                      <td className="p-2">string</td>
                      <td className="p-2">No</td>
                      <td className="p-2">
                        Stable identifier of the end-user in your system —
                        required for recurring rules; enables first-touch
                        attribution (see below)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2">
                        <code>partnerCode</code>
                      </td>
                      <td className="p-2">string</td>
                      <td className="p-2">Conditional</td>
                      <td className="p-2">
                        Required on first event for a user. Subsequent events
                        for the same <code>externalUserId</code> can omit it —
                        the stored attribution takes over
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <p className="font-medium text-gray-700 mb-2">
                Success Response (201)
              </p>
              <pre className="bg-gray-50 border rounded-lg p-4 text-xs overflow-x-auto">
{`{
  "success": true,
  "partnerId": "550e8400-e29b-41d4-a716-446655440000",
  "eventName": "subscribe",
  "eventDate": "2026-04-11",
  "count": 1,
  "revenue": 9.99,
  "accrualAmount": "1.500000",
  "accrualRuleId": "660e8400-e29b-41d4-a716-446655440000"
}`}
              </pre>
            </div>

            <div>
              <p className="font-medium text-gray-700 mb-2">Error Responses</p>
              <div className="bg-gray-50 border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-gray-100">
                      <th className="text-left p-2 font-medium">Status</th>
                      <th className="text-left p-2 font-medium">Meaning</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-2">
                        <code>401</code>
                      </td>
                      <td className="p-2">
                        Invalid API key or HMAC signature
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2">
                        <code>404</code>
                      </td>
                      <td className="p-2">
                        Partner code not found or inactive
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2">
                        <code>429</code>
                      </td>
                      <td className="p-2">
                        Rate limit exceeded (100 requests/minute per API key)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Step 3: HMAC */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-lg font-semibold">3. Request Signing (HMAC)</h2>
        </CardHeader>
        <CardBody>
          <div className="text-sm space-y-4">
            <p className="text-gray-600">
              Every request must be signed with HMAC-SHA256 using your signing
              secret. Compute the signature over the raw JSON body and send it in
              the <code className="bg-gray-100 px-1 rounded">X-Signature</code>{' '}
              header. The server verifies the signature to ensure the request was
              not tampered with.
            </p>

            <div>
              <p className="font-medium text-gray-700 mb-1">Node.js</p>
              <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-x-auto">
{`const crypto = require('crypto');

const body = JSON.stringify({
  partnerCode: 'ACME_2024',
  eventName: 'subscribe',
  revenue: 9.99,
});

const signature = crypto
  .createHmac('sha256', process.env.SIGNING_SECRET)
  .update(body)
  .digest('hex');

const res = await fetch('https://your-api.example.com/api/conversions/track', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.API_KEY,
    'X-Signature': \`sha256=\${signature}\`,
  },
  body,
});`}
              </pre>
            </div>

            <div>
              <p className="font-medium text-gray-700 mb-1">Python</p>
              <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-x-auto">
{`import hmac, hashlib, json, os, requests

body = json.dumps({
    "partnerCode": "ACME_2024",
    "eventName": "subscribe",
    "revenue": 9.99,
})

signature = hmac.new(
    os.environ["SIGNING_SECRET"].encode(),
    body.encode(),
    hashlib.sha256,
).hexdigest()

resp = requests.post(
    "https://your-api.example.com/api/conversions/track",
    headers={
        "Content-Type": "application/json",
        "X-API-Key": os.environ["API_KEY"],
        "X-Signature": f"sha256={signature}",
    },
    data=body,
)`}
              </pre>
            </div>

            <div>
              <p className="font-medium text-gray-700 mb-1">curl</p>
              <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-x-auto">
{`BODY='{"partnerCode":"ACME_2024","eventName":"subscribe","revenue":9.99}'
SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SIGNING_SECRET" | awk '{print $2}')

curl -X POST https://your-api.example.com/api/conversions/track \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: $API_KEY" \\
  -H "X-Signature: sha256=$SIG" \\
  -d "$BODY"`}
              </pre>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Recurring commissions */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-lg font-semibold">
            Recurring commissions (SaaS subscriptions)
          </h2>
        </CardHeader>
        <CardBody>
          <div className="text-sm text-gray-600 space-y-3">
            <p>
              For subscription products you typically want to pay the partner
              on every renewal, not just the initial signup. That&apos;s what
              recurring rule types are for. The flow:
            </p>

            <div className="bg-gray-50 border rounded-lg p-4 font-mono text-xs space-y-1">
              <p>
                1. Create a rule with{' '}
                <code>ruleType = &quot;recurring_percentage&quot;</code> (or{' '}
                <code>recurring_fixed</code>) and optionally{' '}
                <code>recurrenceDurationMonths</code> (null = forever).
              </p>
              <p>
                2. On the <strong>first</strong> conversion for a given user,
                send both <code>partnerCode</code> and{' '}
                <code>externalUserId</code>. We store the attribution{' '}
                <code>externalUserId → partnerCode</code> (first-touch).
              </p>
              <p>
                3. On every <strong>subsequent</strong> event (e.g.
                subscription renewal) for the same <code>externalUserId</code>
                , the rule pays the originally attributed partner as long as
                the window is still open.
              </p>
              <p>
                4. After the window closes (or if none was set and the user
                stops converting), no more payouts.
              </p>
            </div>

            <div>
              <p className="font-medium text-gray-700 mb-1">
                Example: pay 20% of each monthly renewal for 12 months
              </p>
              <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-x-auto">
{`// First conversion — signup
await trackConversion({
  partnerCode: 'alice_q4',
  externalUserId: 'user_1234',
  eventName: 'subscription_start',
  revenue: 29.99,
  idempotencyKey: 'sub_start_1234',
});

// Every monthly renewal — no partnerCode needed
await trackConversion({
  externalUserId: 'user_1234',
  eventName: 'subscription_renewal',
  revenue: 29.99,
  idempotencyKey: 'renewal_1234_2026-04',
});`}
              </pre>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-800 text-xs">
                <strong>First-touch wins.</strong> Once an{' '}
                <code>externalUserId</code> is attributed to a partner, the
                attribution never moves — even if you pass a different{' '}
                <code>partnerCode</code> on a later event. If you need to
                re-attribute, delete the user attribution record out of band.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Step 4: Idempotency */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-lg font-semibold">4. Idempotency</h2>
        </CardHeader>
        <CardBody>
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              Include an{' '}
              <code className="bg-gray-100 px-1 rounded">idempotencyKey</code>{' '}
              to safely retry requests without double-counting conversions. If
              the same key is sent again within 24 hours, the server returns the
              original response without reprocessing.
            </p>
            <p>
              Use a unique identifier for each event — a transaction ID, order
              number, or UUID. This is especially important when processing
              webhooks, which may be delivered more than once.
            </p>
            <pre className="bg-gray-50 border rounded-lg p-4 text-xs overflow-x-auto">
{`{
  "partnerCode": "ACME_2024",
  "eventName": "subscribe",
  "revenue": 9.99,
  "idempotencyKey": "order_12345"
}`}
            </pre>
          </div>
        </CardBody>
      </Card>

      {/* Step 5: Rate Limits */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-lg font-semibold">5. Rate Limits</h2>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-gray-600">
            The tracking endpoint is rate-limited to{' '}
            <strong>100 requests per minute</strong> per API key. If you exceed
            this limit, the server responds with{' '}
            <code className="bg-gray-100 px-1 rounded">429 Too Many Requests</code>.
            Retry with exponential backoff. For batch imports, spread requests
            over time and use idempotency keys for safe retries.
          </p>
        </CardBody>
      </Card>

      {/* Scenario: Direct Integration */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-lg font-semibold">
            Scenario: Direct Server Integration
          </h2>
        </CardHeader>
        <CardBody>
          <div className="text-sm text-gray-600 space-y-3">
            <p>
              The most common setup. Your backend tracks conversions as part
              of its business logic — when a user signs up, makes a purchase,
              or completes any action that should be attributed to a referral
              partner.
            </p>
            <div>
              <p className="font-medium text-gray-700 mb-1">Example: tracking signups in Express.js</p>
              <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-x-auto">
{`app.post('/register', async (req, res) => {
  const user = await createUser(req.body);

  // Track the conversion if user came from a referral
  if (req.body.partnerCode) {
    await trackConversion({
      partnerCode: req.body.partnerCode,
      eventName: 'signup',
      idempotencyKey: \`signup_\${user.id}\`,
    });
  }

  res.json(user);
});`}
              </pre>
            </div>
            <p className="text-gray-500 text-xs">
              The conversion is tracked from a trusted server-side handler, not
              from the client. The partner code is passed through your signup
              form (originally captured from a UTM link).
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Scenario: MMP */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-lg font-semibold">
            Scenario: Mobile Attribution via MMP
          </h2>
        </CardHeader>
        <CardBody>
          <div className="text-sm text-gray-600 space-y-3">
            <p>
              For tracking mobile app installs and in-app events (subscriptions,
              purchases), use a Mobile Measurement Partner (MMP) like{' '}
              <strong>AppsFlyer</strong>, <strong>Adjust</strong>, or{' '}
              <strong>Branch</strong>. The MMP handles attribution, fraud
              detection, and receipt validation.
            </p>

            <p>
              We support two integration shapes. Pick based on whether you
              already run a server that can forward postbacks:
            </p>

            <div className="bg-gray-50 border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-gray-100">
                    <th className="text-left p-2 font-medium">&nbsp;</th>
                    <th className="text-left p-2 font-medium">
                      A. Direct webhook
                    </th>
                    <th className="text-left p-2 font-medium">
                      B. Forward via your server
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="p-2 font-medium">Hops</td>
                    <td className="p-2">MMP → us</td>
                    <td className="p-2">MMP → your server → us</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Auth</td>
                    <td className="p-2">Per-key webhook token in URL</td>
                    <td className="p-2">X-API-Key + HMAC signature</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Needs your server?</td>
                    <td className="p-2">No</td>
                    <td className="p-2">Yes</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Custom mapping</td>
                    <td className="p-2">
                      Fixed (media_source → partnerCode, etc.)
                    </td>
                    <td className="p-2">
                      Arbitrary — you control the transform
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Best for</td>
                    <td className="p-2">
                      Mobile-only teams, quick setup
                    </td>
                    <td className="p-2">
                      Filtering / enrichment / existing backend
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* MMP Option A: Direct webhook */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-lg font-semibold">
            MMP Option A — Direct webhook (no proxy)
          </h2>
        </CardHeader>
        <CardBody>
          <div className="text-sm text-gray-600 space-y-3">
            <p>
              Point AppsFlyer&apos;s Push API directly at our endpoint. The
              per-key webhook token in the URL authenticates the request — no
              HMAC, no server of your own.
            </p>

            <div>
              <p className="font-medium text-gray-700 mb-1">Webhook URL</p>
              <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-x-auto">
{`POST https://your-api.example.com/api/webhooks/mmp/appsflyer/<webhookToken>`}
              </pre>
              <p className="text-xs text-gray-500 mt-1">
                The exact URL for your account is shown on the{' '}
                <Link
                  href="/api-keys"
                  className="text-indigo-600 underline"
                >
                  API Keys
                </Link>{' '}
                page when you create a key.
              </p>
            </div>

            <div>
              <p className="font-medium text-gray-700 mb-1">
                AppsFlyer dashboard setup
              </p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Dashboard → your app → Integration → Push API</li>
                <li>Add a new endpoint, paste the URL above</li>
                <li>
                  Enable events you care about: <code>install</code>,{' '}
                  <code>af_purchase</code>, <code>af_subscribe</code>, etc.
                </li>
                <li>
                  Use JSON payload format — the endpoint expects a JSON body
                </li>
                <li>
                  Make sure your OneLink passes the partner code as{' '}
                  <code>pid=&lt;code&gt;</code>; we read{' '}
                  <code>media_source</code> as the partnerCode
                </li>
              </ol>
            </div>

            <div>
              <p className="font-medium text-gray-700 mb-1">
                Field mapping (fixed)
              </p>
              <div className="bg-gray-50 border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-gray-100">
                      <th className="text-left p-2 font-medium">
                        AppsFlyer field
                      </th>
                      <th className="text-left p-2 font-medium">Our field</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-2">
                        <code>media_source</code>
                      </td>
                      <td className="p-2">
                        <code>partnerCode</code>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2">
                        <code>event_name</code>
                      </td>
                      <td className="p-2">
                        <code>eventName</code>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2">
                        <code>event_revenue</code>
                      </td>
                      <td className="p-2">
                        <code>revenue</code> (parsed as float, 0 on miss)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2">
                        <code>event_time</code>
                      </td>
                      <td className="p-2">
                        <code>eventDate</code> (YYYY-MM-DD, UTC)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2">
                        <code>event_id</code> ?? <code>appsflyer_id</code>
                      </td>
                      <td className="p-2">
                        <code>idempotencyKey</code>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-gray-50 border rounded-lg p-3 text-xs space-y-1">
              <p>
                <strong>Behavior:</strong> organic installs (empty{' '}
                <code>media_source</code>) are silently skipped. We always
                respond <code>200</code> so AppsFlyer never retries on our
                errors — check the{' '}
                <Link
                  href="/conversions"
                  className="text-indigo-600 underline"
                >
                  conversions
                </Link>{' '}
                page to verify events landed. Retries with the same{' '}
                <code>event_id</code> are deduplicated for 24 hours.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
              <strong>Security trade-off.</strong> The webhook token is a bearer
              secret in the URL — anyone with it can send events to your
              account. If AppsFlyer logs URLs or the token leaks, rotate by
              revoking the API key and creating a new one.
            </div>
          </div>
        </CardBody>
      </Card>

      {/* MMP Option B: Forward via own server */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-lg font-semibold">
            MMP Option B — Forward via your server
          </h2>
        </CardHeader>
        <CardBody>
          <div className="text-sm text-gray-600 space-y-3">
            <p>
              If you already run a backend, point AppsFlyer at it, run your own
              validation or enrichment, and forward to{' '}
              <code>/api/conversions/track</code> with HMAC. You get full
              control over mapping and the signing secret never travels in
              request URLs.
            </p>

            <div className="bg-gray-50 border rounded-lg p-4 font-mono text-xs space-y-1">
              <p>1. Partner shares a tracking link (OneLink / Adjust link)</p>
              <p className="text-gray-400 ml-4">
                https://app.appsflyer.com/com.example?pid=partner_code
              </p>
              <p>2. User clicks link &rarr; installs app from store</p>
              <p>3. MMP SDK in app reports install to MMP server</p>
              <p>
                4. MMP validates attribution + runs fraud detection (Protect360)
              </p>
              <p>
                5. MMP sends postback to <strong>your</strong> server
              </p>
              <p>
                6. Your server calls{' '}
                <strong>POST /api/conversions/track</strong>
              </p>
            </div>

            <div>
              <p className="font-medium text-gray-700 mb-1">
                Example: handling an AppsFlyer postback
              </p>
              <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-x-auto">
{`// AppsFlyer sends postbacks to your webhook endpoint
app.post('/webhooks/appsflyer', async (req, res) => {
  const event = req.body;

  // event.media_source contains the partner code (pid parameter)
  // event.event_name: "install", "af_subscribe", "af_purchase", etc.
  if (event.media_source) {
    await trackConversion({
      partnerCode: event.media_source,
      eventName: event.event_name,
      revenue: parseFloat(event.event_revenue) || 0,
      idempotencyKey: event.event_id || event.appsflyer_id,
    });
  }

  res.sendStatus(200);
});`}
              </pre>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-800 text-xs">
                <strong>Why use an MMP?</strong> App Store and Google Play don&apos;t
                pass UTM parameters directly to your app. MMPs solve this by
                using platform APIs (SKAdNetwork, Google Install Referrer) to
                reliably attribute installs. They also detect fraudulent installs
                (bots, device farms, click injection) before sending postbacks —
                so you only pay partners for real conversions.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* AI-Assisted Integration */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-lg font-semibold">
            AI-Assisted Integration
          </h2>
        </CardHeader>
        <CardBody>
          <div className="text-sm text-gray-600 space-y-4">
            <p>
              Copy one of the prompts below into ChatGPT, Claude, Cursor, or any
              other coding assistant to generate a ready-to-use integration for
              your stack. Paste the relevant sections of this guide (API
              reference + HMAC signing) alongside the prompt so the model has
              full context.
            </p>

            <div>
              <p className="font-medium text-gray-700 mb-1">
                Prompt: Direct server integration (Node.js / Express)
              </p>
              <pre className="bg-gray-50 border rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap">
{`You are integrating a referral tracking API into my Node.js/Express backend.

Endpoint: POST https://your-api.example.com/api/conversions/track
Auth: X-API-Key header + X-Signature: sha256=<hmac> (HMAC-SHA256 of the raw JSON body using SIGNING_SECRET)
Body: { partnerCode, eventName, eventDate?, count?, revenue?, idempotencyKey? }

Tasks:
1. Create a reusable trackConversion(payload) helper that reads API_KEY and SIGNING_SECRET from env, computes the HMAC signature over the exact serialized body, and POSTs it with fetch.
2. Use it inside my POST /register route: after a user is created, if req.body.partnerCode is set, track an event with eventName "signup" and idempotencyKey \`signup_\${user.id}\`.
3. Handle 429 with exponential backoff (max 3 retries), and log 4xx errors without throwing so signup never fails because of tracking.
4. Do not send the signing secret or API key in responses or logs.

Return a single self-contained module and the updated route.`}
              </pre>
            </div>

            <div>
              <p className="font-medium text-gray-700 mb-1">
                Prompt: MMP postback handler (AppsFlyer / Adjust)
              </p>
              <pre className="bg-gray-50 border rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap">
{`Build a webhook endpoint that receives AppsFlyer (or Adjust) postbacks and forwards them to my referral tracking API.

Forward target: POST https://your-api.example.com/api/conversions/track
Auth: X-API-Key + X-Signature (HMAC-SHA256 over raw JSON body with SIGNING_SECRET).

Mapping from AppsFlyer postback fields:
- partnerCode <- media_source (or pid)
- eventName  <- event_name (pass through: install, af_subscribe, af_purchase, ...)
- revenue    <- parseFloat(event_revenue) || 0
- eventDate  <- event_time (ISO date, YYYY-MM-DD, UTC)
- idempotencyKey <- event_id || appsflyer_id

Requirements:
- Skip forwarding if media_source is empty (organic install).
- Always respond 200 OK to AppsFlyer, even if our tracking call fails (log the error).
- Treat 409/idempotency conflicts as success.
- Add a minimal unit test using a mock fetch that asserts the signature header is computed over the exact body string sent.

Language: TypeScript on Node 20, no external deps beyond what's strictly needed.`}
              </pre>
            </div>

            <div>
              <p className="font-medium text-gray-700 mb-1">
                Prompt: Port the client to another language
              </p>
              <pre className="bg-gray-50 border rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap">
{`Port the following reference integration to <Go | Python | PHP | Ruby | Java | C#>.

Reference (Node.js):
<paste the Node.js snippet from section 3 of the Integration Guide>

Must preserve:
- The HMAC-SHA256 is computed over the EXACT byte sequence of the request body that is sent on the wire. Do not re-serialize the JSON after signing.
- X-Signature header format is literally "sha256=<lowercase hex>".
- API_KEY and SIGNING_SECRET come from environment variables.
- Network errors and non-2xx responses are surfaced to the caller (do not swallow them).

Output a single idiomatic file with a trackConversion function plus a short usage example. No frameworks beyond the standard library and an HTTP client.`}
              </pre>
            </div>

            <p className="text-gray-500 text-xs">
              Tip: always review generated code before shipping. In particular,
              verify the signature is computed over the exact body bytes you
              send (not a re-serialized object) and that secrets are only read
              from environment variables.
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Setup Checklist */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Setup Checklist</h2>
        </CardHeader>
        <CardBody>
          <div className="text-sm text-gray-600">
            <ol className="list-decimal list-inside space-y-2">
              <li>
                Create{' '}
                <Link
                  href="/partners"
                  className="text-indigo-600 underline"
                >
                  partners
                </Link>{' '}
                with unique referral codes
              </li>
              <li>
                Set up{' '}
                <Link
                  href="/rules"
                  className="text-indigo-600 underline"
                >
                  accrual rules
                </Link>{' '}
                for each event type (fixed amount or percentage of revenue)
              </li>
              <li>
                Create an{' '}
                <Link
                  href="/api-keys"
                  className="text-indigo-600 underline"
                >
                  API key
                </Link>{' '}
                and store both the key and signing secret on your server
              </li>
              <li>
                Integrate the tracking call into your server-side event handlers
                or MMP webhook processor
              </li>
              <li>
                Send a test event and verify it appears on the{' '}
                <Link
                  href="/conversions"
                  className="text-indigo-600 underline"
                >
                  conversions
                </Link>{' '}
                page
              </li>
            </ol>
          </div>
        </CardBody>
      </Card>
    </DashboardShell>
  );
}

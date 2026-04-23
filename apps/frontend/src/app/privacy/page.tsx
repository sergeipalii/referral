import type { Metadata } from 'next';
import Link from 'next/link';

// Starter Privacy Policy for a solo-operator SaaS. Reflects what the current
// codebase actually stores and the third parties it integrates with. Have a
// lawyer review before material changes or enterprise sales.

export const metadata: Metadata = {
  title: 'Privacy Policy — Refledger',
  description:
    'How Refledger collects, uses, and protects personal data. GDPR and CCPA rights included.',
};

const LAST_UPDATED = 'April 23, 2026';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-indigo-600">
            Refledger
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-gray-600">
            <Link href="/terms" className="hover:text-gray-900">
              Terms
            </Link>
            <Link href="/" className="hover:text-gray-900">
              Home
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Last updated: {LAST_UPDATED}
        </p>

        <div className="prose prose-gray mt-10 max-w-none text-gray-700 leading-relaxed">
          <p>
            This Privacy Policy explains how Refledger (&ldquo;we&rdquo;,
            &ldquo;us&rdquo;) collects, uses, and discloses personal data
            when you use the Refledger platform and related websites (the
            &ldquo;Service&rdquo;). It applies to visitors to our
            marketing website, customers who register an account, and
            partners who use the partner portal.
          </p>
          <p>
            It does <em>not</em> cover the separate processing that our
            customers perform when they use the Service to run their own
            referral programs — in that context we act as a processor on
            the customer&rsquo;s behalf and the customer is the
            controller.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            1. Who is the controller
          </h2>
          <p>
            Refledger is the controller of personal data about visitors,
            account holders (our direct customers), and partners invited
            into the Service.
          </p>
          <p>
            For data submitted through the conversion-tracking API,
            attribution webhooks (such as AppsFlyer), or entered by our
            customers about their own partners and end-users, our customer
            is the controller and we act as processor on their
            instructions, as further described in our Terms.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            2. What personal data we collect
          </h2>
          <p>
            <strong>Account data.</strong> When you register, we collect
            your email address, your name (optional), and a bcrypt hash of
            the password you choose. We never store your password in
            plaintext.
          </p>
          <p>
            <strong>API credentials.</strong> When you create an API key,
            we store a SHA-256 hash of the key and an HMAC signing secret
            associated with that key. The raw key is shown to you once at
            creation and never again.
          </p>
          <p>
            <strong>Billing data.</strong> Subscription, plan, and invoice
            metadata needed to provide the Service. Payment card details
            are handled entirely by our payment processor and never touch
            our servers.
          </p>
          <p>
            <strong>Customer Data you submit.</strong> Partners you create,
            their contact details, tracking codes, conversion events,
            accrual rules, and payout records. This may contain personal
            data about individuals who are not themselves our customers.
          </p>
          <p>
            <strong>Partner portal data.</strong> If you are invited as a
            partner, we collect the email and name your program owner
            shares, the password hash you set on acceptance, and any
            payout details you provide.
          </p>
          <p>
            <strong>Technical data.</strong> Server logs containing IP
            address, user agent, request path, timestamps, and error
            traces — needed to operate and secure the Service.
          </p>
          <p>
            <strong>Website usage.</strong> The marketing site currently
            sets only functional cookies (session, CSRF). If we add
            analytics or marketing tools, this policy will be updated and
            a consent banner introduced where required.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            3. Why we use it, and the legal basis
          </h2>
          <p>
            Under the EU / UK GDPR, we rely on the following legal bases:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Performance of a contract</strong> — to create and
              operate your account, process subscriptions, deliver the
              Service, and provide support.
            </li>
            <li>
              <strong>Legitimate interests</strong> — to secure the
              Service (rate limiting, abuse detection, fraud prevention),
              keep backups, improve the product, and communicate about
              material service changes. Where we rely on legitimate
              interests, we have balanced them against your rights.
            </li>
            <li>
              <strong>Legal obligation</strong> — to retain invoicing and
              tax records, and to respond to lawful requests.
            </li>
            <li>
              <strong>Consent</strong> — for any optional communications
              or non-essential cookies, where applicable. You can withdraw
              consent at any time.
            </li>
          </ul>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            4. Who we share personal data with
          </h2>
          <p>
            We share personal data only with sub-processors that help us
            run the Service. Current sub-processors include:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Payment processor</strong> — processes subscription
              payments and, where applicable, acts as merchant of record
              for sales tax / VAT. Receives billing email, plan, and
              payment method details.
            </li>
            <li>
              <strong>Infrastructure / hosting provider</strong> — stores
              the application database and runs our servers.
            </li>
            <li>
              <strong>Error monitoring</strong> — receives server and
              client error traces including IP and a limited request
              context, to help us detect and fix bugs.
            </li>
            <li>
              <strong>Email delivery</strong> — transactional email for
              invitations, password resets, and receipts (when enabled).
            </li>
          </ul>
          <p>
            We do <strong>not</strong> sell personal data and we do not
            share it for third-party advertising. We may disclose data
            when required by law, to enforce our Terms, or to protect the
            rights, property, or safety of Refledger, our users, or
            others.
          </p>
          <p>
            For an up-to-date list of sub-processors, email{' '}
            <a
              href="mailto:hello@refledger.io"
              className="text-indigo-600 hover:text-indigo-500"
            >
              hello@refledger.io
            </a>
            .
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            5. International transfers
          </h2>
          <p>
            Some of our sub-processors are located outside your country of
            residence, including in the United States. Where we transfer
            personal data out of the EEA or UK, we rely on appropriate
            safeguards such as Standard Contractual Clauses or the
            recipient&rsquo;s equivalent certification.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            6. How long we keep it
          </h2>
          <p>
            We keep account data for as long as your account is active.
            After termination or at your request, account and Customer
            Data are deleted within 90 days, except where we are required
            to retain specific records (for example, invoices for tax
            purposes — typically 7 to 10 years depending on jurisdiction).
          </p>
          <p>
            Server logs are retained for up to 30 days for security and
            debugging, then rotated. Database backups are retained on a
            rolling 7-to-30-day schedule.
          </p>
          <p>
            Idempotency keys for the tracking API are deleted 24 hours
            after creation.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            7. Security
          </h2>
          <p>
            We apply reasonable technical and organizational measures
            appropriate to the risk, including: HTTPS in transit, bcrypt
            for password hashing, SHA-256 for API key storage, HMAC-signed
            tracking requests, rate limiting on authenticated endpoints,
            database backups, and access controls on our infrastructure.
          </p>
          <p>
            No system is perfectly secure. If we discover a breach
            affecting your personal data, we will notify you and the
            relevant authorities as required by applicable law.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            8. Your rights
          </h2>
          <p>
            Depending on where you live, you may have the right to:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Access</strong> the personal data we hold about you.
            </li>
            <li>
              <strong>Correct</strong> inaccurate or incomplete data.
            </li>
            <li>
              <strong>Delete</strong> your data (&ldquo;right to be
              forgotten&rdquo;), subject to legal retention requirements.
            </li>
            <li>
              <strong>Export</strong> your data in a portable format.
            </li>
            <li>
              <strong>Restrict or object to</strong> certain processing,
              including processing based on legitimate interests.
            </li>
            <li>
              <strong>Withdraw consent</strong> at any time, where
              processing is based on consent.
            </li>
            <li>
              <strong>Lodge a complaint</strong> with your local data
              protection authority.
            </li>
          </ul>
          <p>
            California residents have additional rights under the CCPA,
            including the right to know what personal information is
            collected and the right to request deletion. We do not sell
            personal information as defined under the CCPA.
          </p>
          <p>
            To exercise any of these rights, email{' '}
            <a
              href="mailto:hello@refledger.io"
              className="text-indigo-600 hover:text-indigo-500"
            >
              hello@refledger.io
            </a>
            . We will respond within the timeframes required by applicable
            law.
          </p>
          <p>
            If the data concerned was submitted by one of our customers
            about you (for example, you are a partner or end-user tracked
            through the Service), we will forward your request to the
            relevant customer and assist them in responding.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            9. Cookies
          </h2>
          <p>
            Our marketing site currently uses only strictly necessary
            cookies — for authentication sessions and for preserving form
            state. These do not require consent under the ePrivacy
            Directive.
          </p>
          <p>
            If we add analytics, heatmaps, or marketing cookies in the
            future, we will introduce a consent banner that asks for your
            permission before any non-essential cookie is set, and update
            this policy.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            10. Children
          </h2>
          <p>
            The Service is not directed to children under 16. We do not
            knowingly collect personal data from children. If you believe
            a child has provided us with personal data, contact us and we
            will delete it.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            11. Changes to this Policy
          </h2>
          <p>
            We may update this Policy from time to time. Material changes
            will be announced by email or in the Service at least 14 days
            before they take effect. The &ldquo;Last updated&rdquo; date
            at the top reflects the latest revision.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            12. Contact
          </h2>
          <p>
            Privacy questions or requests? Email{' '}
            <a
              href="mailto:hello@refledger.io"
              className="text-indigo-600 hover:text-indigo-500"
            >
              hello@refledger.io
            </a>
            . If you are in the EEA or UK and cannot resolve an issue with
            us, you have the right to lodge a complaint with your local
            supervisory authority.
          </p>
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
          <span>Refledger &copy; {new Date().getFullYear()}</span>
          <nav className="flex gap-6">
            <Link href="/terms" className="hover:text-gray-900">
              Terms
            </Link>
            <Link href="/" className="hover:text-gray-900">
              Home
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

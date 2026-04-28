import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Refund Policy — Refledger',
  description:
    'Refund and cancellation terms for Refledger subscriptions. Refunds are governed by Paddle Buyer Terms.',
};

const LAST_UPDATED = 'April 28, 2026';

export default function RefundPolicyPage() {
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
            <Link href="/privacy" className="hover:text-gray-900">
              Privacy
            </Link>
            <Link href="/" className="hover:text-gray-900">
              Home
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">
          Refund Policy
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Last updated: {LAST_UPDATED}
        </p>

        <div className="prose prose-gray mt-10 max-w-none text-gray-700 leading-relaxed">
          <p>
            Refledger is operated by Serpa Software LLC, a limited liability
            company organized under the laws of the Kyrgyz Republic
            (&ldquo;we&rdquo;, &ldquo;us&rdquo;). This Refund Policy
            describes how refunds work for subscriptions to Refledger.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            1. Paddle as Merchant of Record
          </h2>
          <p>
            All payments for Refledger are processed by Paddle.com Market
            Limited (&ldquo;Paddle&rdquo;), which acts as the merchant of
            record for your purchase. Because Paddle is the seller of
            record, refunds are governed by the{' '}
            <a
              href="https://www.paddle.com/legal/buyer-terms"
              target="_blank"
              rel="noreferrer noopener"
              className="text-indigo-600 hover:text-indigo-500"
            >
              Paddle Buyer Terms
            </a>
            , which apply to your purchase and prevail over anything
            inconsistent in this policy.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            2. How to request a refund
          </h2>
          <p>You can request a refund in either of these ways:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Contact Paddle directly using the link in the receipt Paddle
              emailed you when the charge occurred. This is normally the
              fastest route.
            </li>
            <li>
              Email us at{' '}
              <a
                href="mailto:refund@sepia.software"
                className="text-indigo-600 hover:text-indigo-500"
              >
                refund@sepia.software
              </a>{' '}
              from the email address on your Refledger account, including
              your Paddle transaction or invoice reference and the reason
              for the request. We will forward your request to Paddle and
              support you through the process.
            </li>
          </ul>
          <p>
            Approved refunds are issued by Paddle to the original payment
            method. The time for funds to appear depends on your bank or
            card issuer.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            3. Cancellation
          </h2>
          <p>
            You can cancel a paid subscription at any time from your
            billing settings or by contacting us. Cancellation takes effect
            at the end of the current billing period; you retain access
            until then.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            4. Statutory rights
          </h2>
          <p>
            Nothing in this policy removes statutory consumer rights you
            may have under applicable law, including any cooling-off or
            withdrawal rights available to consumers in your country.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            5. Contact
          </h2>
          <p>
            Questions about refunds or billing? Email{' '}
            <a
              href="mailto:refund@sepia.software"
              className="text-indigo-600 hover:text-indigo-500"
            >
              refund@sepia.software
            </a>
            .
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
            <Link href="/privacy" className="hover:text-gray-900">
              Privacy
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

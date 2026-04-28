import type { Metadata } from 'next';
import Link from 'next/link';

// Starter Refund Policy for a solo-operator SaaS. Mirrors and expands on the
// refund clause in the Terms of Service. Have a lawyer review before material
// changes or before signing enterprise customers.

export const metadata: Metadata = {
  title: 'Refund Policy — Refledger',
  description:
    'Refund and cancellation terms for Refledger subscriptions, including statutory rights for EU/UK consumers.',
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
            This Refund Policy explains when and how you may obtain a refund
            for paid subscriptions to Refledger (the &ldquo;Service&rdquo;).
            It supplements, and should be read together with, our{' '}
            <Link
              href="/terms"
              className="text-indigo-600 hover:text-indigo-500"
            >
              Terms of Service
            </Link>
            . Capitalized terms not defined here have the meaning given in
            the Terms.
          </p>
          <p>
            Payments are processed by our merchant of record, Paddle.com
            Market Limited (&ldquo;Paddle&rdquo;). Refunds, where granted,
            are issued by Paddle to the original payment method.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            1. Free trial and free tier
          </h2>
          <p>
            Refledger offers a free tier and may from time to time offer
            free trials of paid plans. You will not be charged during a free
            trial; if you do not cancel before the trial ends, your
            subscription converts to a paid plan and the standard billing
            terms in section 3 apply from that point on. Free-tier usage is
            never billed and therefore is not refundable.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            2. Subscription billing
          </h2>
          <p>
            Paid plans are billed in advance on a recurring monthly cycle.
            By subscribing you authorize recurring charges to the payment
            method you provide until you cancel. Fees are quoted exclusive
            of taxes; applicable sales tax or VAT is added at checkout and
            collected by Paddle as merchant of record.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            3. Cancellation and standard refund policy
          </h2>
          <p>
            You may cancel a paid subscription at any time from your
            billing settings. Cancellation takes effect at the end of the
            current billing period; you retain access to paid features
            until then, and you will not be charged again unless you
            re-subscribe.
          </p>
          <p>
            Because cancellation always takes effect at the end of the
            already-paid period, <strong>we do not offer pro-rated
            refunds</strong> for the unused portion of a billing period,
            and we do not refund fees for prior billing periods. This is
            subject to the statutory and discretionary exceptions in the
            following sections.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            4. EU and UK consumer right of withdrawal
          </h2>
          <p>
            If you are a consumer resident in the European Union, the
            European Economic Area, or the United Kingdom, you have a
            statutory right to withdraw from a distance-purchased
            subscription within fourteen (14) days of the initial purchase,
            without giving any reason.
          </p>
          <p>
            By starting to use the Service during the withdrawal period —
            for example, by signing in to a paid feature or sending a
            tracking event under a paid plan — you expressly request that
            we begin performance immediately and acknowledge that you will
            lose the right of withdrawal once the Service has been fully
            performed. If you withdraw before full performance, you may be
            charged a proportionate amount for the part of the Service
            already supplied.
          </p>
          <p>
            To exercise your right of withdrawal, email{' '}
            <a
              href="mailto:refund@sepia.software"
              className="text-indigo-600 hover:text-indigo-500"
            >
              refund@sepia.software
            </a>{' '}
            with the email address on your account, the subscription
            transaction reference, and a statement that you wish to
            withdraw. We will forward the request to Paddle and the
            refund will be issued to the original payment method, normally
            within 14 days.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            5. Discretionary refunds
          </h2>
          <p>
            Outside the cases above, we may at our reasonable discretion
            grant a full or partial refund where, for example:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              you were charged due to a clear billing error on our side
              (e.g. duplicate charge, charge after a confirmed
              cancellation);
            </li>
            <li>
              the Service experienced a sustained outage that materially
              prevented you from using a paid feature for a significant
              portion of a billing period;
            </li>
            <li>
              you upgraded to a higher plan and immediately ran into a
              defect that prevented use of the upgraded capability and
              that we were unable to resolve within a reasonable time.
            </li>
          </ul>
          <p>
            Discretionary refunds are decided case-by-case and are not a
            waiver of section 3 for future requests.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            6. Situations not eligible for a refund
          </h2>
          <p>The following are generally not refundable:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              forgetting to cancel before the next renewal, where you had
              continued access to the paid plan during the period;
            </li>
            <li>
              not using the Service during a paid period;
            </li>
            <li>
              changes in your business needs, internal projects, or team
              structure;
            </li>
            <li>
              dissatisfaction with features that are accurately described
              on our marketing pages or in our documentation;
            </li>
            <li>
              accounts terminated by us for breach of the Terms of Service
              (including fraudulent referral schemes, abuse, or
              non-payment).
            </li>
          </ul>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            7. Chargebacks
          </h2>
          <p>
            If you believe a charge is incorrect, please contact us before
            initiating a chargeback with your bank or card issuer — we can
            usually resolve billing disputes faster than the chargeback
            process. Initiating a chargeback for a charge that was
            authorized and delivered may result in suspension of your
            account pending resolution.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            8. How to request a refund
          </h2>
          <p>
            Send refund requests to{' '}
            <a
              href="mailto:refund@sepia.software"
              className="text-indigo-600 hover:text-indigo-500"
            >
              refund@sepia.software
            </a>{' '}
            from the email address on your Refledger account. Please
            include:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>the email on your account;</li>
            <li>
              the Paddle transaction or invoice reference (visible on the
              receipt Paddle emailed you and in your{' '}
              <Link
                href="/billing"
                className="text-indigo-600 hover:text-indigo-500"
              >
                billing page
              </Link>
              );
            </li>
            <li>the reason you are requesting a refund.</li>
          </ul>
          <p>
            We aim to respond within 5 business days. Approved refunds are
            processed by Paddle to the original payment method; the time
            for funds to appear depends on your bank or card issuer.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            9. Changes to this policy
          </h2>
          <p>
            We may update this Refund Policy from time to time. Material
            changes will be communicated by email or through the Service
            and will not apply retroactively to charges that occurred
            before the effective date.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            10. Contact
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

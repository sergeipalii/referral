import type { Metadata } from 'next';
import Link from 'next/link';

// Starter ToS template for a solo-operator SaaS. Have a lawyer review before
// material changes or before signing enterprise customers.

export const metadata: Metadata = {
  title: 'Terms of Service — Refledger',
  description:
    'Terms of Service governing use of Refledger, a referral and affiliate tracking platform.',
};

const LAST_UPDATED = 'April 28, 2026';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-indigo-600">
            Refledger
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-gray-600">
            <Link href="/privacy" className="hover:text-gray-900">
              Privacy
            </Link>
            <Link href="/refund-policy" className="hover:text-gray-900">
              Refunds
            </Link>
            <Link href="/" className="hover:text-gray-900">
              Home
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Last updated: {LAST_UPDATED}
        </p>

        <div className="prose prose-gray mt-10 max-w-none text-gray-700 leading-relaxed">
          <p>
            These Terms of Service (&ldquo;Terms&rdquo;) are a legal agreement
            between you (&ldquo;Customer&rdquo;, &ldquo;you&rdquo;) and
            Serpa Software LLC, a limited liability company organized under
            the laws of the Kyrgyz Republic, doing business as Refledger
            (&ldquo;Refledger&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;,
            &ldquo;our&rdquo;), governing your access to and use of the
            Refledger software-as-a-service platform and related websites,
            APIs, and documentation (collectively, the &ldquo;Service&rdquo;).
            By creating an account, accessing, or using the Service, you
            agree to be bound by these Terms. If you do not agree, do not
            use the Service.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            1. Eligibility and accounts
          </h2>
          <p>
            You must be at least 18 years old and legally capable of
            entering into a binding contract to use the Service. If you
            register on behalf of an organization, you represent that you
            are authorized to bind that organization to these Terms, and
            &ldquo;you&rdquo; refers to that organization.
          </p>
          <p>
            You are responsible for the accuracy of the information you
            provide at registration, for maintaining the confidentiality of
            your credentials and API keys, and for all activity that occurs
            under your account. Notify us promptly at{' '}
            <a
              href="mailto:info@sepia.software"
              className="text-indigo-600 hover:text-indigo-500"
            >
              info@sepia.software
            </a>{' '}
            of any suspected unauthorized use.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            2. The Service
          </h2>
          <p>
            The Service helps you operate a referral or affiliate program:
            manage partners, track conversion events via API or third-party
            integrations, compute commission accruals, and record payouts.
            We may add, modify, or remove features over time. Material
            changes that reduce functionality you are paying for will be
            communicated in advance where practicable.
          </p>
          <p>
            The Service is provided on a subscription basis. A free tier is
            offered subject to usage limits described on our pricing page,
            which we may revise from time to time on reasonable notice.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            3. Subscriptions, fees, and refunds
          </h2>
          <p>
            Paid plans are billed in advance on a recurring monthly cycle
            through Paddle.com Market Limited (&ldquo;Paddle&rdquo;), which
            acts as the merchant of record for your purchase. By
            subscribing, you authorize recurring charges to the payment
            method you provide until you cancel. Fees are quoted exclusive
            of taxes; applicable sales tax or VAT is added at checkout and
            collected by Paddle.
          </p>
          <p>
            You may cancel a paid subscription at any time from your
            billing settings. Cancellation takes effect at the end of the
            current billing period; you retain access until then. Refunds
            are processed by Paddle as merchant of record and are governed
            by the{' '}
            <a
              href="https://www.paddle.com/legal/buyer-terms"
              target="_blank"
              rel="noreferrer noopener"
              className="text-indigo-600 hover:text-indigo-500"
            >
              Paddle Buyer Terms
            </a>
            ; how to request one is described in our{' '}
            <Link
              href="/refund-policy"
              className="text-indigo-600 hover:text-indigo-500"
            >
              Refund Policy
            </Link>
            .
          </p>
          <p>
            We may change subscription pricing on at least 30 days&rsquo;
            notice. Changes take effect at the start of your next billing
            period after the notice window.
          </p>
          <p>
            If a payment fails, we may suspend or downgrade your account
            until the balance is resolved. Data is retained for a
            reasonable grace period before being subject to the retention
            terms below.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            4. Your data and content
          </h2>
          <p>
            &ldquo;Customer Data&rdquo; means any data you or your
            end-users submit to the Service — including partner records,
            conversion events, payout information, and account profile
            data. As between the parties, you own all Customer Data. You
            grant us a limited, worldwide, royalty-free license to
            process, store, display, transmit, and otherwise use Customer
            Data solely as necessary to provide and improve the Service
            and to comply with legal obligations.
          </p>
          <p>
            You represent that you have all rights and consents necessary
            to submit Customer Data to the Service, that the data does not
            violate applicable law, and that your collection and use of
            data about your partners and their end-users complies with
            applicable privacy laws, including the GDPR, UK GDPR, and
            CCPA where applicable.
          </p>
          <p>
            Our handling of personal data is described in the{' '}
            <Link
              href="/privacy"
              className="text-indigo-600 hover:text-indigo-500"
            >
              Privacy Policy
            </Link>
            .
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            5. Acceptable use
          </h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Use the Service to violate any law, regulation, or the rights
              of others.
            </li>
            <li>
              Reverse engineer, decompile, or attempt to extract source
              code, except where such restriction is prohibited by
              applicable law.
            </li>
            <li>
              Circumvent rate limits, authentication, or usage caps; submit
              forged or tampered conversion events; or use the tracking
              API to attribute activity you did not originate.
            </li>
            <li>
              Upload malicious code, interfere with the Service&rsquo;s
              integrity, or probe for vulnerabilities without prior written
              authorization.
            </li>
            <li>
              Resell, sublicense, or expose the Service as a competing
              product.
            </li>
            <li>
              Use the Service to operate illegal or fraudulent referral
              schemes, or to process data you are not lawfully permitted to
              process.
            </li>
          </ul>
          <p>
            We may suspend or terminate accounts that violate these rules,
            particularly where continued use poses a risk to other
            customers, to the integrity of the Service, or to us.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            6. Intellectual property
          </h2>
          <p>
            The Service, including all software, designs, text,
            documentation, and trademarks, is owned by Refledger or its
            licensors and is protected by intellectual property laws.
            Except for the limited right to access and use the Service
            granted under these Terms, no rights are transferred to you.
          </p>
          <p>
            If you provide feedback, suggestions, or ideas about the
            Service, you grant us a perpetual, irrevocable, royalty-free
            license to use them without obligation to you.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            7. Third-party services
          </h2>
          <p>
            The Service integrates with third-party providers, including
            our payment processor, attribution providers such as AppsFlyer,
            and infrastructure providers. Your use of those integrations
            may be subject to the third party&rsquo;s own terms and
            privacy policies. We are not responsible for third-party
            services, but we select sub-processors with reasonable care;
            see the Privacy Policy for the current list.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            8. Disclaimer of warranties
          </h2>
          <p>
            The Service is provided &ldquo;as is&rdquo; and &ldquo;as
            available&rdquo; without warranties of any kind, whether
            express, implied, or statutory, including merchantability,
            fitness for a particular purpose, non-infringement, and any
            warranty arising out of course of dealing or usage of trade.
            We do not warrant that the Service will be uninterrupted,
            error-free, or meet your specific requirements, nor that
            tracking data will be complete or entirely accurate —
            attribution involves third-party signals and inherent
            measurement uncertainty.
          </p>
          <p>
            Some jurisdictions do not allow the exclusion of implied
            warranties, so some of the above exclusions may not apply to
            you.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            9. Limitation of liability
          </h2>
          <p>
            To the maximum extent permitted by applicable law, in no event
            will Refledger be liable for any indirect, incidental, special,
            consequential, exemplary, or punitive damages, including lost
            profits, lost revenue, lost data, or business interruption,
            arising out of or relating to these Terms or the Service, even
            if advised of the possibility of such damages.
          </p>
          <p>
            Our total aggregate liability arising out of or relating to
            these Terms or the Service will not exceed the amount you paid
            us for the Service during the twelve (12) months immediately
            preceding the event giving rise to the claim, or one hundred
            US dollars (USD 100), whichever is greater.
          </p>
          <p>
            Nothing in these Terms excludes or limits liability that cannot
            be excluded or limited under applicable law, including
            liability for gross negligence, wilful misconduct, or death or
            personal injury caused by negligence.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            10. Indemnification
          </h2>
          <p>
            You will defend, indemnify, and hold harmless Refledger and
            its officers, employees, and agents from and against any
            third-party claims, damages, liabilities, costs, and expenses
            (including reasonable attorneys&rsquo; fees) arising out of or
            related to (a) your Customer Data, (b) your use of the Service
            in violation of these Terms or applicable law, or (c) your
            referral or affiliate program, including any dispute between
            you and your partners or end-users.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            11. Term and termination
          </h2>
          <p>
            These Terms remain in effect while you use the Service. You
            may terminate at any time by cancelling your subscription and
            closing your account. We may suspend or terminate your account
            for material breach of these Terms, non-payment, or if
            required by law. On termination, your right to use the
            Service ends immediately. Sections that by their nature should
            survive termination (including data ownership, disclaimers,
            limitations of liability, indemnification, and governing law)
            will survive.
          </p>
          <p>
            You may export your Customer Data prior to termination using
            available export features. After termination, Customer Data
            may be deleted as described in the Privacy Policy.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            12. Changes to these Terms
          </h2>
          <p>
            We may update these Terms from time to time. If we make
            material changes, we will notify you by email or through the
            Service at least 14 days before they take effect. Continued
            use after the effective date constitutes acceptance. If you do
            not agree, you may cancel your subscription before the
            effective date.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            13. Governing law and disputes
          </h2>
          <p>
            These Terms are governed by the laws of the Kyrgyz Republic,
            excluding its conflict-of-laws rules. The parties agree to the
            exclusive jurisdiction of the courts located in the Kyrgyz
            Republic for any dispute that cannot be resolved informally,
            unless a mandatory consumer-protection law of your residence
            provides otherwise.
          </p>
          <p>
            Before filing a claim, you agree to contact us at{' '}
            <a
              href="mailto:info@sepia.software"
              className="text-indigo-600 hover:text-indigo-500"
            >
              info@sepia.software
            </a>{' '}
            and attempt in good faith to resolve the dispute for at least
            30 days.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            14. Miscellaneous
          </h2>
          <p>
            These Terms are the entire agreement between you and Refledger
            regarding the Service and supersede any prior agreements on
            the same subject. If any provision is found unenforceable, the
            remainder will remain in effect. Our failure to enforce a
            right is not a waiver. You may not assign these Terms without
            our written consent; we may assign them in connection with a
            merger, acquisition, or sale of assets.
          </p>

          <h2 className="mt-10 text-2xl font-semibold text-gray-900">
            15. Contact
          </h2>
          <p>
            Questions about these Terms? Email{' '}
            <a
              href="mailto:info@sepia.software"
              className="text-indigo-600 hover:text-indigo-500"
            >
              info@sepia.software
            </a>
            .
          </p>
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
          <span>Refledger &copy; {new Date().getFullYear()}</span>
          <nav className="flex gap-6">
            <Link href="/privacy" className="hover:text-gray-900">
              Privacy
            </Link>
            <Link href="/refund-policy" className="hover:text-gray-900">
              Refunds
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

const IS_SANDBOX = process.env.NEXT_PUBLIC_PADDLE_ENV === 'sandbox';

export function SandboxCheckoutHint() {
  if (!IS_SANDBOX) return null;
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">
        Sandbox checkout — use a test card, not a real one
      </p>
      <p className="mt-2">
        Card number:{' '}
        <code className="font-mono">4242 4242 4242 4242</code> · Expiry: any
        future date · CVC: any 3 digits · Name: any
      </p>
      <p className="mt-2 text-xs">
        Real cards will be rejected. Subscriptions created here are not real
        and will not exist after the production switch-over.
      </p>
    </div>
  );
}

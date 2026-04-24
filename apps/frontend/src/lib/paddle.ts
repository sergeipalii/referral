import {
  initializePaddle,
  CheckoutEventNames,
  type Paddle,
  type PaddleEventData,
} from '@paddle/paddle-js';

type Handler = (event: PaddleEventData) => void;

let cached: Paddle | null = null;
let pending: Promise<Paddle> | null = null;
const listeners = new Set<Handler>();

/**
 * Returns a singleton Paddle.js client. `eventCallback` is wired once at
 * init and dispatches to every subscriber — call `onCheckoutEvent` to add
 * one. Paddle.js would otherwise let only a single global callback exist.
 *
 * Env vars are baked into the client bundle at build time; missing them is
 * a deploy bug, not a runtime one — we throw loudly so the `/billing` page
 * surfaces the misconfiguration rather than silently leaving upgrade
 * buttons broken.
 */
export async function getPaddle(): Promise<Paddle> {
  if (cached) return cached;
  if (pending) return pending;

  const environment =
    (process.env.NEXT_PUBLIC_PADDLE_ENV as
      | 'sandbox'
      | 'production'
      | undefined) ?? 'sandbox';
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  if (!token) {
    throw new Error(
      'NEXT_PUBLIC_PADDLE_CLIENT_TOKEN missing — Paddle checkout cannot open',
    );
  }

  pending = initializePaddle({
    environment,
    token,
    eventCallback: (event) => {
      for (const l of listeners) {
        try {
          l(event);
        } catch {
          // Don't let a buggy subscriber kill delivery to the next one.
        }
      }
    },
  }).then((p) => {
    if (!p) {
      throw new Error('Paddle.js returned an empty client instance');
    }
    cached = p;
    pending = null;
    return p;
  });
  return pending;
}

/**
 * Subscribe to Paddle overlay events (e.g. `checkout.completed`,
 * `checkout.closed`). Returns an unsubscribe function — always call it in
 * a React effect cleanup.
 */
export function onCheckoutEvent(handler: Handler): () => void {
  listeners.add(handler);
  return () => {
    listeners.delete(handler);
  };
}

export { CheckoutEventNames };

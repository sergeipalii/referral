'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api';
import { getPaddle } from '@/lib/paddle';
import type { PlanKey } from '@/lib/types';

/**
 * Shape of the 402 body our PlanLimitGuard emits. Kept loose — unknown fields
 * land in metadata so we can surface them verbatim to the user without
 * piling on new code per gate.
 */
export interface PlanLimitError {
  error: 'plan_limit';
  reason: 'capability' | 'count';
  message?: string;
  requiredPlan: PlanKey | null;
  capability?: string;
  limit?: string;
  used?: number;
  cap?: number;
  currentPlan?: PlanKey;
}

type Listener = (err: PlanLimitError) => void;
const listeners = new Set<Listener>();

/**
 * Global hook into the ApiClient — any 402 dispatched below opens the shared
 * UpgradeModalHost regardless of where the call was made. Keeps upgrade CTAs
 * out of every component's error-handling path.
 */
export function emitPlanLimit(err: PlanLimitError) {
  for (const l of listeners) l(err);
}

/**
 * Mount once (in the root/owner layout) so any 402 emission pops a modal.
 * Invisible when idle; shows a plan-aware upgrade prompt when triggered.
 */
export function UpgradeModalHost() {
  const router = useRouter();
  const [current, setCurrent] = useState<PlanLimitError | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const listener: Listener = (err) => setCurrent(err);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (!current) return null;

  const close = () => {
    setCurrent(null);
    setError('');
    setCheckoutBusy(false);
  };

  const goBilling = () => {
    close();
    router.push('/billing');
  };

  const required = current.requiredPlan;
  const upgradable =
    required === 'starter' || required === 'pro' || required === 'business';

  const startCheckout = async () => {
    if (!upgradable) return;
    setCheckoutBusy(true);
    setError('');
    try {
      // Free → paid: overlay (Paddle collects a card).
      // Paid → paid: update the existing subscription via API so Paddle
      // prorates instead of creating a duplicate subscription.
      if (current.currentPlan && current.currentPlan !== 'free') {
        await api.changePlan(required);
        close();
        // Hint the user to refresh — we can't refetch here without
        // pulling more state into the global modal host.
        setError('');
      } else {
        const ctx = await api.createCheckout(required);
        const paddle = await getPaddle();
        paddle.Checkout.open({
          items: [{ priceId: ctx.priceId, quantity: 1 }],
          customer: { id: ctx.customerId },
          customData: ctx.customData,
        });
        // Overlay is open client-side — close the modal so the user sees it.
        close();
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not change plan',
      );
      setCheckoutBusy(false);
    }
  };

  return (
    <Modal open onClose={close} title="Upgrade required">
      <div className="space-y-4 text-sm">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-red-700">{error}</div>
        )}
        <p className="text-gray-700">
          {current.message ??
            'This action needs a plan that includes the requested feature.'}
        </p>
        {current.reason === 'count' &&
          typeof current.used === 'number' &&
          typeof current.cap === 'number' && (
            <p className="text-xs text-gray-500">
              Used {current.used} of {current.cap} on the current plan.
            </p>
          )}
        {required && (
          <p className="text-xs text-gray-500">
            Unlocks on the{' '}
            <span className="font-semibold text-gray-700">{required}</span>{' '}
            plan.
          </p>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={close}>
            Not now
          </Button>
          <Button variant="secondary" onClick={goBilling}>
            See plans
          </Button>
          {upgradable && (
            <Button loading={checkoutBusy} onClick={startCheckout}>
              Upgrade to {required}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

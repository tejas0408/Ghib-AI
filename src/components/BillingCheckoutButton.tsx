'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { getCheckoutSessionUrl } from '@/actions/billing';

type BillingCheckoutButtonProps = {
  variantId?: string;
  disabled?: boolean;
  label: string;
};

export function BillingCheckoutButton({ variantId, disabled, label }: BillingCheckoutButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (!variantId) {
      setError('Checkout is not configured for this plan.');
      return;
    }

    setPending(true);
    setError(null);

    try {
      const { url } = await getCheckoutSessionUrl(variantId);
      window.location.assign(url);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Unable to start checkout.');
      setPending(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        disabled={disabled || pending}
        onClick={handleCheckout}
        className="focus-ring inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-medium text-background transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {label}
      </button>
      {error ? <p className="mt-3 text-xs text-rose">{error}</p> : null}
    </div>
  );
}

'use client';

import { useCallback, useState } from 'react';

/**
 * Tracks the last failed row/page action (delete, convert, inline status change…)
 * so the server's error message (403 / 400) can be shown instead of being swallowed.
 */
export function useActionError() {
  const [error, setError] = useState<string | null>(null);
  /** Runs `fn`; on failure stores the error message and resolves to false. */
  const run = useCallback(async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, []);
  return { error, setError, run };
}

export function ActionErrorBanner({ error, onDismiss }: { error: string | null; onDismiss: () => void }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="mx-6 mt-4 flex items-start justify-between gap-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      <span>{error}</span>
      <button onClick={onDismiss} className="text-lg leading-none text-red-400 hover:text-red-700" aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}

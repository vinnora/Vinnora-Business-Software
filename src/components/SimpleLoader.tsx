/**
 * Lightweight loading spinner. Reused across module loading screens.
 * No characters, no heavy animation — just a small spinning ring + label.
 */
export function SimpleLoader({
  color = '#0096C7',
  background = '#F8FBFD',
  message = 'Loading…',
}: {
  color?: string;
  background?: string;
  message?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ background }}
    >
      <div
        className="w-10 h-10 rounded-full animate-spin"
        style={{
          border: `3px solid ${color}22`,
          borderTopColor: color,
        }}
      />
      <div
        className="mt-4 text-xs uppercase tracking-[0.2em]"
        style={{ color }}
      >
        {message}
      </div>
    </div>
  );
}

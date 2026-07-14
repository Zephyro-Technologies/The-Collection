// Quiet, on-brand async states for the live-data pages — subtle skeletons and a
// calm error, never a jarring spinner. Loading shimmer is disabled under
// reduced motion, matching the rest of the site.

/** Placeholder grid shown while the collection loads. */
export function CollectionSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse motion-reduce:animate-none">
          <div className="aspect-[4/3] w-full rounded-[3px] bg-[var(--surface-raised)]" />
          <div className="pt-5">
            <div className="h-2.5 w-24 rounded-full bg-[var(--surface-raised)]" />
            <div className="mt-3 h-4 w-44 rounded-full bg-[var(--surface-raised)]" />
            <div className="mt-2.5 h-3 w-28 rounded-full bg-[var(--surface-raised)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Calm, editorial error with an optional retry. */
export function LoadError({
  onRetry,
  title = "Unable to load",
  message = "The collection could not be reached just now. Please try again in a moment.",
}: {
  onRetry?: () => void;
  title?: string;
  message?: string;
}) {
  return (
    <div className="py-24 text-center">
      <span className="text-[0.66rem] uppercase tracking-[0.16em] text-[var(--accent)]">{title}</span>
      <p className="mx-auto mt-4 max-w-md text-[var(--text-body)]" style={{ lineHeight: 1.7 }}>
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-8 border border-[var(--text-muted)] px-6 py-3 text-[0.72rem] uppercase tracking-[0.14em] transition-colors hover:bg-[var(--text-primary)] hover:text-[var(--surface-page)]"
        >
          Try again
        </button>
      )}
    </div>
  );
}



interface SkeletonProps {
  /** Number of skeleton lines */
  lines?: number;
  /** Height of each line (Tailwind class) */
  height?: string;
  /** Optional class name */
  className?: string;
  /** Card style skeleton with avatar placeholder */
  card?: boolean;
  /** Children count for card list */
  cardCount?: number;
}

/** Skeleton loading placeholder for data-fetching views */
export function Skeleton({ lines = 3, height = 'h-4', className = '', card = false, cardCount = 1 }: SkeletonProps) {
  if (card && cardCount > 1) {
    return (
      <div className={`space-y-4 ${className}`} role="status" aria-label="Loading content">
        {Array.from({ length: cardCount }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-5/6" />
            </div>
          </div>
        ))}
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (card) {
    return (
      <div className={`bg-white rounded-xl p-4 shadow-sm animate-pulse ${className}`} role="status" aria-label="Loading content">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={`${height} bg-gray-200 rounded ${i === lines - 1 ? 'w-4/6' : 'w-full'}`}
            />
          ))}
        </div>
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  return (
    <div className={`animate-pulse p-4 ${className}`} role="status" aria-label="Loading content">
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${height} bg-gray-200 rounded ${i === lines - 1 ? 'w-3/4' : i === 0 ? 'w-full' : 'w-5/6'}`}
          />
        ))}
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

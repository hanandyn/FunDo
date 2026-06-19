interface EmptyStateProps {
  /** Emoji or icon for the empty state */
  icon?: string;
  /** Main title */
  title: string;
  /** Description text */
  description?: string;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Additional CSS class */
  className?: string;
}

/** Beautiful empty state placeholder with emoji illustration */
export function EmptyState({ icon = '📭', title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`text-center py-12 px-4 ${className}`} role="status">
      <div className="text-6xl mb-4" aria-hidden="true">{icon}</div>
      <h3 className="text-xl font-bold text-gray-400 mb-2">{title}</h3>
      {description && <p className="text-gray-500 max-w-md mx-auto">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/** Pre-configured empty states for common use cases */
export const EmptyStates = {
  noTasks: (action?: () => void) => (
    <EmptyState
      icon="🏰"
      title="No tasks yet!"
      description="Your quest board is empty. Ask a parent to create some tasks for you."
      action={action ? { label: 'Go to Dashboard', onClick: action } : undefined}
    />
  ),
  noRewards: () => (
    <EmptyState
      icon="🎁"
      title="No rewards in the shop"
      description="Save up your stars and gems — new rewards will appear here when parents add them."
    />
  ),
  noAchievements: () => (
    <EmptyState
      icon="🏆"
      title="No achievements yet"
      description="Complete tasks and build streaks to unlock achievements!"
    />
  ),
  noNotifications: () => (
    <EmptyState
      icon="🔔"
      title="All caught up!"
      description="You have no new notifications right now."
    />
  ),
  noResults: (query?: string) => (
    <EmptyState
      icon="🔍"
      title={query ? `No results for "${query}"` : 'No results found'}
      description="Try adjusting your search or filters."
    />
  ),
  serverError: (onRetry?: () => void) => (
    <EmptyState
      icon="⚠️"
      title="Something went wrong"
      description="We couldn't load this content. Please try again."
      action={onRetry ? { label: 'Try Again', onClick: onRetry } : undefined}
    />
  ),
};

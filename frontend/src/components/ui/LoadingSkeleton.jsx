export const LoadingSkeleton = ({
  lines = 3,
  className = ''
}) => {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 rounded skeleton-shimmer" />
      ))}
    </div>
  );
};

export default LoadingSkeleton;

// Dev: Mohiuzzaman Anik - 2026-03-19

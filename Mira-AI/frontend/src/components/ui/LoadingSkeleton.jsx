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

// Updated by Shanjoy Kanti on 2026-06-14
// Added: New feature implementation

// Dev: Mohiuzzaman Anik - 2026-04-27

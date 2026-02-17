export const Card = ({ children, className = '', hover = false, onClick, ...rest }) => {
  return (
    <div
      className={`card ${hover || onClick ? 'card-interactive' : ''} ${className}`}
      onClick={onClick}
      {...rest}
    >
      {children}
    </div>
  );
};

// Updated by Shanjoy Kanti on 2026-02-21
// Added: New feature implementation

// Updated by Mohiuzzaman Anik on 2026-03-18
// Added: New feature implementation

// Updated by Moshiur Rahman on 2026-05-01
// Added: New feature implementation

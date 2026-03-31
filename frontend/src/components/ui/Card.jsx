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

// Dev: Shanjoy Kanti - 2026-03-31

export const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  return (
    <div className={`inline-block ${sizes[size]} ${className}`}>
      <div className="animate-spin rounded-full border-4 border-gray-200 border-t-primary-600 h-full w-full" />
    </div>
  );
};

// Alias for Spinner
export const Loading = Spinner;

export const LoadingScreen = ({ message = 'Loading...', steps = [] }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <Spinner size="xl" className="mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{message}</h2>
        {steps.length > 0 && (
          <div className="mt-6 text-left max-w-md mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center mb-3">
                <div className={`mr-3 ${step.completed ? 'text-green-500' : 'text-gray-400'}`}>
                  {step.completed ? '✓' : '○'}
                </div>
                <span className={`text-sm ${step.active ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

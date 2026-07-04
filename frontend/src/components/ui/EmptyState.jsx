import { Inbox } from 'lucide-react';

export const EmptyState = ({
  title = 'No items yet',
  description = 'There are no items to display right now. Use the action below to get started.',
  action = null,
  icon: Icon = Inbox,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-6 bg-white border-2 border-dashed border-gray-200 rounded-2xl ${className}`}>
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-50 to-violet-50 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-primary-500" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-4 max-w-sm">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;

// Dev: Moshiur Rahman - 2026-07-04

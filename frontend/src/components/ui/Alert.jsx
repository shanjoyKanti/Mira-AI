import { Info, CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';

const safeString = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.map((d) => d?.msg || JSON.stringify(d)).join('; ');
  if (typeof val === 'object') return val.msg || val.detail || JSON.stringify(val);
  return String(val);
};

export const Alert = ({ type = 'info', title, message, children, onClose, variant, className = '' }) => {
  const resolvedType = variant || type;
  const types = {
    info:    { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-800',   Icon: Info },
    success: { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-800',  Icon: CheckCircle2 },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', Icon: AlertTriangle },
    error:   { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-800',    Icon: XCircle },
  };

  const style = types[resolvedType] || types.info;
  const { Icon } = style;
  const safeMessage = safeString(message);
  const isUrgent = resolvedType === 'error' || resolvedType === 'warning';

  return (
    <div
      role={isUrgent ? 'alert' : 'status'}
      className={`${style.bg} ${style.border} border rounded-lg p-4 ${className}`}
    >
      <div className="flex items-start">
        <Icon className={`flex-shrink-0 w-5 h-5 mt-0.5 ${style.text}`} aria-hidden="true" />
        <div className="ml-3 flex-1 min-w-0">
          {title && <h3 className={`text-sm font-semibold ${style.text}`}>{title}</h3>}
          {safeMessage && (
            <p className={`text-sm ${style.text} ${title ? 'mt-1' : ''}`}>{safeMessage}</p>
          )}
          {children && (
            <div className={`text-sm ${style.text} ${title || safeMessage ? 'mt-1' : ''}`}>{children}</div>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Dismiss"
            className={`flex-shrink-0 ml-3 p-1 rounded-md ${style.text} hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 transition-colors`}
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};

import { AlertCircle, X } from 'lucide-react';
import { useState } from 'react';

interface ErrorMessageProps {
  message: string;
  details?: string[];
  onDismiss?: () => void;
  className?: string;
}

export default function ErrorMessage({
  message,
  details,
  onDismiss,
  className = '',
}: ErrorMessageProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className} animate-fadeIn`}
    >
      <div className="flex items-start">
        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-800 mb-1">{message}</h3>
          {details && details.length > 0 && (
            <ul className="list-disc list-inside text-sm text-red-700 mt-2 space-y-1">
              {details.map((detail, index) => (
                <li key={index}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={handleDismiss}
            className="ml-4 text-red-600 hover:text-red-800 transition-colors"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

interface SuccessMessageProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function SuccessMessage({
  message,
  onDismiss,
  className = '',
}: SuccessMessageProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className} animate-fadeIn`}
    >
      <div className="flex items-start">
        <div className="flex-1">
          <p className="text-sm font-medium text-green-800">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={handleDismiss}
            className="ml-4 text-green-600 hover:text-green-800 transition-colors"
            aria-label="Dismiss message"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
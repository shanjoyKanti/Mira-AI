import React from 'react';
import { Check } from 'lucide-react';
import { useWizard } from './WizardProvider';

export const Stepper = ({ compact = false, className = '' }) => {
  const { steps = [], currentIndex } = useWizard();

  return (
    <nav aria-label="Progress" className={`w-full ${className}`}>
      <ol className="flex items-center gap-2">
        {steps.map((step, idx) => {
          const isActive    = idx === currentIndex;
          const isCompleted = idx < currentIndex;

          return (
            <li key={step.id || idx} className="flex items-center gap-2">
              {/* Pill step */}
              <div
                aria-current={isActive ? 'step' : undefined}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
                  transition-all duration-200 select-none
                  ${isCompleted
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                      : 'bg-gray-100 text-gray-400 border border-gray-200'}
                `}
              >
                {/* Icon / number */}
                <span className={`
                  flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold
                  ${isCompleted
                    ? 'bg-green-500 text-white'
                    : isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-300 text-gray-500'}
                `}>
                  {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : idx + 1}
                </span>

                {!compact && (
                  <span>{step.title}</span>
                )}
              </div>

              {/* Connector */}
              {idx < steps.length - 1 && (
                <div
                  className="w-8 flex-shrink-0"
                  style={{
                    borderTop: '2px dashed',
                    borderColor: isCompleted ? '#86efac' : '#e5e7eb',
                  }}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Stepper;

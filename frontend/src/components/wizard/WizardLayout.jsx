import React from 'react';
import { useWizard } from './WizardProvider';
import { Button } from '../ui/Button';

export const WizardLayout = ({ children, hideStepper = false, showNumbers = true, className = '', onFinish }) => {
  const { steps = [], currentIndex, next, back, data, errors } = useWizard();

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === steps.length - 1;

  const handleNext = async () => {
    const res = await next();
    if (res && res.finished) onFinish && onFinish(data);
  };

  return (
    <div className={`w-full ${className}`}>
      {!hideStepper && <div className="mb-6"><slot name="stepper" /></div>}

      <div className="mb-6">{children}</div>

      <div className="flex items-center justify-between space-x-3">
        <div>
          <Button variant="ghost" onClick={back} disabled={isFirst}>
            Back
          </Button>
        </div>
        <div className="ml-auto flex items-center space-x-3">
          {errors && Object.keys(errors).length > 0 && (
            <div className="text-sm text-red-600">{errors[steps[currentIndex]?.id || currentIndex]}</div>
          )}
          <Button variant="primary" onClick={handleNext}>
            {isLast ? 'Finish' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WizardLayout;

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LoadingScreen } from '../components/ui/Loading';

export const AnalyzingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { label: 'Cloning repository', completed: false, active: false },
    { label: 'Analyzing dependencies', completed: false, active: false },
    { label: 'Detecting architecture', completed: false, active: false },
    { label: 'Analyzing database', completed: false, active: false },
    { label: 'Generating report', completed: false, active: false }
  ];

  const [loadingSteps, setLoadingSteps] = useState(steps);

  useEffect(() => {
    // Mock analysis process
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        const next = prev + 1;
        
        if (next < steps.length) {
          setLoadingSteps((prevSteps) =>
            prevSteps.map((step, index) => ({
              ...step,
              completed: index < next,
              active: index === next
            }))
          );
          return next;
        } else {
          clearInterval(timer);
          // Navigate to report page after completion
          setTimeout(() => {
            navigate(`/analysis/${id}/report`);
          }, 1000);
          return prev;
        }
      });
    }, 2000); // Each step takes 2 seconds

    return () => clearInterval(timer);
  }, [id, navigate]);

  return (
    <LoadingScreen
      message="Analyzing your legacy project..."
      steps={loadingSteps}
    />
  );
};

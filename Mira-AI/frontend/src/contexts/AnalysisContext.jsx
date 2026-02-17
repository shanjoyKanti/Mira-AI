import { createContext, useContext, useState } from 'react';

const AnalysisContext = createContext(null);

export const useAnalysis = () => {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used within AnalysisProvider');
  }
  return context;
};

export const AnalysisProvider = ({ children }) => {
  const [currentAnalysis, setCurrentAnalysis] = useState(null);

  const saveStackSelection = async (analysisId, stackData) => {
    setCurrentAnalysis(prev => ({
      ...prev,
      selectedStack: stackData.stack,
      integrations: stackData.integrations,
      databaseFile: stackData.databaseFile
    }));
    return { success: true };
  };

  const value = {
    currentAnalysis,
    setCurrentAnalysis,
    saveStackSelection,
  };

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
};

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const WizardContext = createContext(null);

export const useWizard = () => {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard must be used within a WizardProvider');
  return ctx;
};

/**
 * WizardProvider
 * - steps: [{ id, title, validate?: async (data) => boolean|string }]
 * - initialData: initial shared data object
 * - storageKey: optional localStorage key to persist state
 */
export const WizardProvider = ({ steps = [], initialData = {}, storageKey = null, children, onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [data, setData] = useState(initialData);
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});

  // hydrate from storage if available, but let initialData win for any fields it provides
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.currentIndex === 'number') setCurrentIndex(parsed.currentIndex);
        if (parsed.data) {
          // initialData fields always take precedence over stale localStorage values
          setData(prev => ({ ...parsed.data, ...prev }));
        }
      }
    } catch (e) {
      // ignore
    }
  }, [storageKey]);

  // persist
  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ currentIndex, data }));
    } catch (e) {
      // ignore quota errors
    }
  }, [storageKey, currentIndex, data]);

  const currentStep = steps[currentIndex] || null;

  const setStepData = (patch) => {
    setData((d) => ({ ...d, ...patch }));
  };

  const validateStep = async (index = currentIndex) => {
    const step = steps[index];
    if (!step || !step.validate) return { ok: true };
    try {
      const res = await step.validate(data);
      if (res === true) {
        setErrors((e) => ({ ...e, [step.id || index]: null }));
        return { ok: true };
      }
      const message = typeof res === 'string' ? res : 'Invalid';
      setErrors((e) => ({ ...e, [step.id || index]: message }));
      return { ok: false, message };
    } catch (err) {
      const message = err && err.message ? err.message : 'Validation failed';
      setErrors((e) => ({ ...e, [step.id || index]: message }));
      return { ok: false, message };
    }
  };

  const next = async () => {
    const v = await validateStep(currentIndex);
    if (!v.ok) return { ok: false, ...v };
    if (currentIndex >= steps.length - 1) {
      // finish
      onFinish && onFinish(data);
      return { ok: true, finished: true };
    }
    setTouched((t) => ({ ...t, [steps[currentIndex].id || currentIndex]: true }));
    setCurrentIndex((i) => Math.min(steps.length - 1, i + 1));
    return { ok: true };
  };

  const back = () => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  };

  const goTo = async (indexOrId) => {
    let idx = -1;
    if (typeof indexOrId === 'number') idx = indexOrId;
    else idx = steps.findIndex((s) => s.id === indexOrId);
    if (idx < 0 || idx >= steps.length) return false;
    setCurrentIndex(idx);
    return true;
  };

  const reset = () => {
    setCurrentIndex(0);
    setData(initialData);
    setTouched({});
    setErrors({});
    if (storageKey) localStorage.removeItem(storageKey);
  };

  const value = useMemo(
    () => ({
      steps,
      currentIndex,
      currentStep,
      data,
      setStepData,
      next,
      back,
      goTo,
      reset,
      touched,
      errors,
      validateStep
    }),
    [steps, currentIndex, currentStep, data, touched, errors]
  );

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
};

export default WizardProvider;

// Updated by Shanjoy Kanti on 2026-06-01
// Added: New feature implementation

// Dev: Mohiuzzaman Anik - 2026-03-17

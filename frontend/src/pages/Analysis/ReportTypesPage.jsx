import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { REPORT_TYPES } from '../../utils/languageConfig';

export const ReportTypesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const prevData = location.state || {};
  const [selected, setSelected] = useState(['generic_security']);

  const toggle = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if (selected.length === 0) {
      toast.error('Please select at least one report type');
      return;
    }
    navigate('/analysis/security-scan', {
      state: { ...prevData, reportTypes: selected },
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Select Report Types</h1>
          <p className="text-gray-500 mt-1">Choose one or more analyses to run on your project.</p>
        </div>

        <div className="space-y-3">
          {REPORT_TYPES.map(rt => (
            <div
              key={rt.id}
              onClick={() => toggle(rt.id)}
              className={`border-2 rounded-xl p-4 cursor-pointer transition-colors ${
                selected.includes(rt.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected.includes(rt.id)}
                  onChange={() => toggle(rt.id)}
                  className="mt-1 accent-blue-600"
                  onClick={e => e.stopPropagation()}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{rt.icon}</span>
                    <h3 className="font-semibold text-gray-900">{rt.label}</h3>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{rt.description}</p>
                  <p className="text-xs text-gray-400 mt-1 font-mono">{rt.id}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
          <Button onClick={handleSubmit} disabled={selected.length === 0}>
            Continue to Scan ({selected.length} selected)
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

// Dev: Shanjoy Kanti - 2026-03-31


import React, { useState } from 'react';

interface AssessmentFormProps {
  onSubmit: (symptoms: string, days: number, region: string) => void;
  onCancel: () => void;
}

const AssessmentForm: React.FC<AssessmentFormProps> = ({ onSubmit, onCancel }) => {
  const [symptoms, setSymptoms] = useState('');
  const [days, setDays] = useState(3);
  const [region, setRegion] = useState('Pan-India');
  

  return (
    <div className="w-full max-w-2xl bg-white dark:bg-[#15292c] rounded-xl shadow-lg border border-[#e7f1f3] dark:border-[#2a3a3d] p-8">
      <h2 className="text-2xl font-bold mb-6">New Medical Assessment</h2>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
            What symptoms are you experiencing?
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            This assessment is text-only. No photos or camera access are used.
          </p>
          <textarea
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            placeholder="Please describe your symptoms in detail (e.g., duration, severity, location)..."
            className="w-full min-h-[150px] p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
              Number of days
            </label>
            <input
              type="number"
              min={1}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full h-12 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
              Region
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full h-12 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            >
              <option value="Pan-India">Pan-India</option>
              <option value="North India">North India</option>
              <option value="South India">South India</option>
              <option value="Urban India">Urban India</option>
              <option value="Rural India">Rural India</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            onClick={() => onSubmit(symptoms, days, region)}
            disabled={!symptoms.trim() || days <= 0}
            className="flex-1 h-12 bg-primary text-black font-bold rounded-lg disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            Start Analysis
          </button>
          <button
            onClick={onCancel}
            className="px-6 h-12 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssessmentForm;

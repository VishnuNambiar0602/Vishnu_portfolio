
import React from 'react';
import { Assessment } from '../types';

interface AssessmentHistoryProps {
  history: Assessment[];
}

const AssessmentHistory: React.FC<AssessmentHistoryProps> = ({ history }) => {
  return (
    <div className="w-full max-w-4xl space-y-4">
      <h2 className="text-2xl font-bold mb-6">Assessment History</h2>
      {history.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#15292c] rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
          <span className="material-symbols-outlined !text-6xl text-slate-300 mb-4">history</span>
          <p className="text-slate-500">No assessments found yet.</p>
        </div>
      ) : (
        history.map((item) => (
          <div key={item.id} className="bg-white dark:bg-[#15292c] p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{item.date}</span>
                <h3 className="text-lg font-bold mt-1 line-clamp-1">{item.symptoms}</h3>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                item.riskLevel === 'Low' ? 'bg-green-100 text-green-700' :
                item.riskLevel === 'Moderate' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {item.riskLevel} Risk
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-2">{item.summary}</p>
          </div>
        ))
      )}
    </div>
  );
};

export default AssessmentHistory;

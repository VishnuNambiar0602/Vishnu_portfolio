import React from 'react';

interface FeatureImportance {
  symptom: string;
  importance: number;
  contribution: 'High' | 'Medium' | 'Low';
}

interface XAIExplanationProps {
  disease: string;
  confidence: number;
  explanation: string;
  importantFeatures: FeatureImportance[];
}

const XAIExplanation: React.FC<XAIExplanationProps> = ({
  disease,
  confidence,
  explanation,
  importantFeatures,
}) => {
  const getContributionColor = (contribution: string) => {
    switch (contribution) {
      case 'High':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Low':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getImportanceBar = (importance: number) => {
    const width = Math.min(importance * 1000, 100); // Scale for visualization
    return width;
  };

  return (
    <div className="space-y-6">
      {/* XAI Explanation */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">lightbulb</span>
          </div>
          <h3 className="text-xl font-bold">Why This Diagnosis?</h3>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{explanation}</p>
        </div>
      </section>

      {/* Feature Importance Analysis */}
      {importantFeatures.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">analytics</span>
            </div>
            <h3 className="text-xl font-bold">Symptom Importance Analysis</h3>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            These symptoms are key indicators for <strong>{disease}</strong>. Higher bar length means stronger influence on the diagnosis.
          </p>

          <div className="space-y-4">
            {importantFeatures.slice(0, 5).map((feature, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-900 dark:text-white">{feature.symptom}</span>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${getContributionColor(feature.contribution)}`}>
                    {feature.contribution} Impact
                  </span>
                </div>

                {/* Importance Bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden mb-2">
                  <div
                    className="bg-primary h-full transition-all duration-500"
                    style={{ width: `${getImportanceBar(feature.importance)}%` }}
                  />
                </div>

                {/* Importance Score */}
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Importance Score: {(feature.importance * 100).toFixed(3)}%
                </p>
              </div>
            ))}
          </div>

          {importantFeatures.length > 5 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 text-center">
              +{importantFeatures.length - 5} more symptoms analysed...
            </p>
          )}
        </section>
      )}

      {/* Interpretation Guide */}
      <section>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <strong>How to Read This:</strong> The model analyzed 230 different symptoms to make this prediction. 
            The symptoms shown above had the strongest statistical association with <strong>{disease}</strong> in the training data. 
            A "High Impact" symptom means it's a strong indicator, but this is probabilistic—always consult a healthcare professional.
          </p>
        </div>
      </section>
    </div>
  );
};

export default XAIExplanation;

import React from 'react';
import { DifferentialDiagnosis } from '../services/prediction';

interface DifferentialDiagnosisSectionProps {
  differentialDiagnosis: DifferentialDiagnosis | null | undefined;
  className?: string;
}

export const DifferentialDiagnosisSection: React.FC<DifferentialDiagnosisSectionProps> = ({
  differentialDiagnosis,
  className = ''
}) => {
  if (!differentialDiagnosis || !differentialDiagnosis.is_differential) {
    return null;
  }

  const [primaryDisease, alternativeDisease] = differentialDiagnosis.diseases_compared || ['Unknown', 'Unknown'];

  return (
    <div className={`differential-diagnosis-section ${className}`}>
      <div className="card-content">
        <div className="section-header">
          <h3>Similar Diagnoses Detected</h3>
          <p className="section-subtitle">
            The top two conditions have similar symptom profiles
          </p>
        </div>

        {/* Score Comparison */}
        <div className="score-comparison">
          <div className="disease-score">
            <div className="disease-name">{primaryDisease}</div>
            <div className="score-bar">
              <div 
                className="score-fill primary"
                style={{ width: `${(differentialDiagnosis.score_1 ?? 0) * 100}%` }}
              />
            </div>
            <div className="score-value">{((differentialDiagnosis.score_1 ?? 0) * 100).toFixed(1)}%</div>
          </div>

          <div className="score-gap">
            <div className="gap-label">Difference</div>
            <div className="gap-value">{((differentialDiagnosis.score_difference ?? 0) * 100).toFixed(1)}%</div>
          </div>

          <div className="disease-score">
            <div className="disease-name">{alternativeDisease}</div>
            <div className="score-bar">
              <div 
                className="score-fill alternative"
                style={{ width: `${(differentialDiagnosis.score_2 ?? 0) * 100}%` }}
              />
            </div>
            <div className="score-value">{((differentialDiagnosis.score_2 ?? 0) * 100).toFixed(1)}%</div>
          </div>
        </div>

        {/* Clarification Explanation */}
        {differentialDiagnosis.clarification_explanation && (
          <div className="clarification-box">
            <h4>What Distinguishes These Conditions?</h4>
            <p>{differentialDiagnosis.clarification_explanation}</p>
          </div>
        )}

        {/* Shared Symptoms */}
        {differentialDiagnosis.shared_symptoms && differentialDiagnosis.shared_symptoms.length > 0 && (
          <div className="symptoms-group">
            <h4>Shared Symptoms</h4>
            <div className="symptoms-list">
              {differentialDiagnosis.shared_symptoms.map((symptom: string, idx: number) => (
                <span key={idx} className="symptom-badge shared">
                  {symptom}
                </span>
              ))}
            </div>
            <p className="symptoms-description">
              Both conditions can present with these symptoms, making differentiation challenging
            </p>
          </div>
        )}

        {/* Distinguishing Symptoms for Primary Disease */}
        {differentialDiagnosis.distinguishing_for_top && 
         differentialDiagnosis.distinguishing_for_top.length > 0 && (
          <div className="symptoms-group">
            <h4>Symptoms Favoring {primaryDisease}</h4>
            <div className="symptoms-list">
              {differentialDiagnosis.distinguishing_for_top.map((symptom: string, idx: number) => (
                <span key={idx} className="symptom-badge primary">
                  {symptom}
                </span>
              ))}
            </div>
            <p className="symptoms-description">
              If you experience these symptoms more prominently, it suggests {primaryDisease}
            </p>
          </div>
        )}

        {/* Distinguishing Symptoms for Alternative Disease */}
        {differentialDiagnosis.distinguishing_for_alternative && 
         differentialDiagnosis.distinguishing_for_alternative.length > 0 && (
          <div className="symptoms-group">
            <h4>Symptoms Favoring {alternativeDisease}</h4>
            <div className="symptoms-list">
              {differentialDiagnosis.distinguishing_for_alternative.map((symptom: string, idx: number) => (
                <span key={idx} className="symptom-badge alternative">
                  {symptom}
                </span>
              ))}
            </div>
            <p className="symptoms-description">
              If these symptoms are more prominent, {alternativeDisease} becomes more likely
            </p>
          </div>
        )}

        {/* Clarification Symptoms */}
        {differentialDiagnosis.clarification_symptoms && 
         differentialDiagnosis.clarification_symptoms.length > 0 && (
          <div className="symptoms-group">
            <h4>Key Questions to Help Differentiate</h4>
            <div className="clarification-symptoms">
              <p className="info-text">
                Additional information about these symptoms would help narrow down the diagnosis:
              </p>
              <ul className="symptoms-checklist">
                {differentialDiagnosis.clarification_symptoms.map((symptom: string, idx: number) => (
                  <li key={idx}>{symptom}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="action-notice">
          <p>
            <strong>Next Step:</strong> Consult with a healthcare professional who can perform 
            additional tests to distinguish between {primaryDisease} and {alternativeDisease}.
          </p>
        </div>
      </div>

      <style>{`
        .differential-diagnosis-section {
          width: 100%;
          margin-top: 20px;
        }

        .card-content {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          padding: 24px;
          color: white;
          box-shadow: 0 8px 24px rgba(102, 126, 234, 0.2);
        }

        .section-header {
          margin-bottom: 24px;
          border-bottom: 2px solid rgba(255, 255, 255, 0.2);
          padding-bottom: 16px;
        }

        .section-header h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 600;
        }

        .section-subtitle {
          margin: 0;
          font-size: 14px;
          opacity: 0.9;
        }

        .score-comparison {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 20px;
          margin-bottom: 24px;
          align-items: center;
        }

        .disease-score {
          background: rgba(255, 255, 255, 0.1);
          padding: 16px;
          border-radius: 8px;
          backdrop-filter: blur(10px);
        }

        .disease-name {
          font-weight: 600;
          margin-bottom: 8px;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .score-bar {
          height: 24px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .score-fill {
          height: 100%;
          border-radius: 12px;
          transition: width 0.3s ease;
        }

        .score-fill.primary {
          background: linear-gradient(90deg, #4CAF50, #45a049);
        }

        .score-fill.alternative {
          background: linear-gradient(90deg, #FF9800, #F57C00);
        }

        .score-value {
          font-size: 16px;
          font-weight: 700;
          text-align: center;
        }

        .score-gap {
          background: rgba(255, 255, 255, 0.1);
          padding: 16px;
          border-radius: 8px;
          text-align: center;
          backdrop-filter: blur(10px);
          border: 2px dashed rgba(255, 255, 255, 0.3);
        }

        .gap-label {
          font-size: 12px;
          opacity: 0.8;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .gap-value {
          font-size: 20px;
          font-weight: 700;
        }

        .clarification-box {
          background: rgba(255, 255, 255, 0.15);
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          border-left: 4px solid rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(10px);
        }

        .clarification-box h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
        }

        .clarification-box p {
          margin: 0;
          font-size: 14px;
          line-height: 1.6;
          opacity: 0.95;
        }

        .symptoms-group {
          margin-bottom: 24px;
        }

        .symptoms-group h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          opacity: 0.9;
        }

        .symptoms-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 8px;
        }

        .symptom-badge {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          transition: all 0.3s ease;
        }

        .symptom-badge.primary {
          background: rgba(76, 175, 80, 0.3);
          border-color: rgba(76, 175, 80, 0.5);
        }

        .symptom-badge.alternative {
          background: rgba(255, 152, 0, 0.3);
          border-color: rgba(255, 152, 0, 0.5);
        }

        .symptom-badge.shared {
          background: rgba(255, 255, 255, 0.25);
          border-color: rgba(255, 255, 255, 0.4);
        }

        .symptom-badge:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }

        .symptoms-description {
          margin: 0;
          font-size: 13px;
          opacity: 0.85;
          line-height: 1.5;
        }

        .clarification-symptoms {
          background: rgba(255, 255, 255, 0.1);
          padding: 12px;
          border-radius: 8px;
          backdrop-filter: blur(10px);
        }

        .info-text {
          margin: 0 0 8px 0;
          font-size: 13px;
          opacity: 0.9;
        }

        .symptoms-checklist {
          margin: 0;
          padding-left: 20px;
          list-style-type: none;
        }

        .symptoms-checklist li {
          font-size: 13px;
          margin: 4px 0;
          position: relative;
          padding-left: 16px;
        }

        .symptoms-checklist li:before {
          content: "✓";
          position: absolute;
          left: 0;
          opacity: 0.7;
        }

        .action-notice {
          background: rgba(255, 255, 255, 0.15);
          padding: 12px;
          border-radius: 8px;
          margin-top: 20px;
          border-left: 4px solid rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(10px);
        }

        .action-notice p {
          margin: 0;
          font-size: 13px;
          line-height: 1.6;
          opacity: 0.95;
        }

        @media (max-width: 768px) {
          .card-content {
            padding: 16px;
          }

          .score-comparison {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .score-gap {
            display: none;
          }

          .disease-score {
            padding: 12px;
          }

          .symptoms-list {
            gap: 6px;
          }

          .symptom-badge {
            padding: 5px 10px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};

import React, { useState } from 'react';
import { ConfidenceCheck, ClarifyingQuestion } from '../services/prediction';

interface ClarifyingQuestionsSectionProps {
  confidenceCheck: (ConfidenceCheck | any) | null | undefined;
  onSubmitAnswers?: (answers: Record<string, any>) => void;
  isLoading?: boolean;
  className?: string;
}

export const ClarifyingQuestionsSection: React.FC<ClarifyingQuestionsSectionProps> = ({
  confidenceCheck,
  onSubmitAnswers,
  isLoading = false,
  className = ''
}) => {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [expanded, setExpanded] = useState(true);

  if (!confidenceCheck || !confidenceCheck.needs_clarification) {
    return null;
  }

  const handleAnswerChange = (questionIndex: number, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [`question_${questionIndex}`]: value
    }));
  };

  const handleSubmit = () => {
    if (onSubmitAnswers) {
      onSubmitAnswers(answers);
    }
  };

  const renderQuestion = (question: any, index: number) => {
    // Handle both old question types and new text_input types
    if (question.type === 'text_input') {
      return (
        <div key={index} className="question-card text-input">
          <div className="question-header">
            <div className="question-badge">{index + 1}</div>
            <label htmlFor={`field_${question.field_name}`} className="question-label">
              {question.question}
            </label>
          </div>
          <input
            id={`field_${question.field_name}`}
            type="text"
            className="text-input-field"
            placeholder={`Enter ${question.field_name.replace(/_/g, ' ')}...`}
            value={answers[question.field_name] || ''}
            onChange={(e) => setAnswers(prev => ({
              ...prev,
              [question.field_name]: e.target.value
            }))}
            disabled={isLoading}
          />
        </div>
      );
    }

    // Legacy question types for backward compatibility
    switch (question.type) {
      case 'symptom_confirmation':
        return (
          <div key={index} className="question-card symptom-confirmation">
            <div className="question-header">
              <div className="question-badge">{index + 1}</div>
              <h5>{question.question}</h5>
            </div>
            {question.symptoms && question.symptoms.length > 0 && (
              <div className="symptoms-context">
                {question.symptoms.map((symptom: string, idx: number) => (
                  <span key={idx} className="symptom-pill">{symptom}</span>
                ))}
              </div>
            )}
            <div className="answer-options">
              <button 
                className="option-btn yes-btn"
                onClick={() => handleAnswerChange(index, 'yes')}
                data-selected={answers[`question_${index}`] === 'yes'}
              >
                Yes
              </button>
              <button 
                className="option-btn no-btn"
                onClick={() => handleAnswerChange(index, 'no')}
                data-selected={answers[`question_${index}`] === 'no'}
              >
                No
              </button>
              <button 
                className="option-btn unsure-btn"
                onClick={() => handleAnswerChange(index, 'unsure')}
                data-selected={answers[`question_${index}`] === 'unsure'}
              >
                Not Sure
              </button>
            </div>
          </div>
        );

      case 'severity':
        return (
          <div key={index} className="question-card severity">
            <div className="question-header">
              <div className="question-badge">{index + 1}</div>
              <h5>{question.question}</h5>
            </div>
            {question.explanation && (
              <p className="question-explanation">{question.explanation}</p>
            )}
            <div className="severity-scale">
              {['Mild', 'Moderate', 'Severe'].map((level, idx) => (
                <button
                  key={idx}
                  className={`severity-btn level-${idx}`}
                  onClick={() => handleAnswerChange(index, level.toLowerCase())}
                  data-selected={answers[`question_${index}`] === level.toLowerCase()}
                >
                  <div className="level-indicator"></div>
                  <span>{level}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 'timeline':
        return (
          <div key={index} className="question-card timeline">
            <div className="question-header">
              <div className="question-badge">{index + 1}</div>
              <h5>{question.question}</h5>
            </div>
            {question.explanation && (
              <p className="question-explanation">{question.explanation}</p>
            )}
            <div className="timeline-options">
              <button
                className="timeline-btn"
                onClick={() => handleAnswerChange(index, 'sudden')}
                data-selected={answers[`question_${index}`] === 'sudden'}
              >
                <div className="timeline-icon sudden">⚡</div>
                <span>Sudden (Minutes/Hours)</span>
              </button>
              <button
                className="timeline-btn"
                onClick={() => handleAnswerChange(index, 'gradual_hours')}
                data-selected={answers[`question_${index}`] === 'gradual_hours'}
              >
                <div className="timeline-icon gradual">📈</div>
                <span>Gradual (Hours)</span>
              </button>
              <button
                className="timeline-btn"
                onClick={() => handleAnswerChange(index, 'gradual_days')}
                data-selected={answers[`question_${index}`] === 'gradual_days'}
              >
                <div className="timeline-icon slow">📅</div>
                <span>Gradual (Days)</span>
              </button>
            </div>
          </div>
        );

      case 'differential':
        return (
          <div key={index} className="question-card differential">
            <div className="question-header">
              <div className="question-badge">{index + 1}</div>
              <h5>{question.question}</h5>
            </div>
            {question.explanation && (
              <p className="question-explanation">{question.explanation}</p>
            )}
            <div className="differential-options">
              <button 
                className="option-btn yes-btn"
                onClick={() => handleAnswerChange(index, 'yes')}
                data-selected={answers[`question_${index}`] === 'yes'}
              >
                ✓ Yes
              </button>
              <button 
                className="option-btn no-btn"
                onClick={() => handleAnswerChange(index, 'no')}
                data-selected={answers[`question_${index}`] === 'no'}
              >
                ✗ No
              </button>
              <button 
                className="option-btn unsure-btn"
                onClick={() => handleAnswerChange(index, 'unsure')}
                data-selected={answers[`question_${index}`] === 'unsure'}
              >
                ❓ Unsure
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const answeredCount = Object.keys(answers).filter(key => answers[key] && answers[key].toString().trim() !== '').length;
  const totalQuestions = confidenceCheck.clarifying_questions?.length || 0;

  return (
    <div className={`clarifying-questions-section ${className}`}>
      <div className="card-content">
        <div className="section-header">
          <div className="header-top">
            <h3>📋 Patient Information Form</h3>
            <button 
              className="toggle-btn"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? '−' : '+'}
            </button>
          </div>
          
          <p className="section-subtitle">
            Please provide additional information to complete your health report
          </p>

          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%` }}
            />
            <span className="progress-text">
              {answeredCount} of {totalQuestions} fields completed
            </span>
          </div>
        </div>

        {expanded && (
          <>
            <div className="message-box">
              <div className="message-icon">ℹ️</div>
              <div className="message-content">
                <p>
                  Diagnosis: <strong>{confidenceCheck.primary_candidate?.disease}</strong> 
                  ({(confidenceCheck.primary_candidate?.confidence || 0).toFixed(1)}% confidence)
                </p>
                {confidenceCheck.alternatives && confidenceCheck.alternatives.length > 0 && (
                  <p className="alternatives-text">
                    Other possibilities: {confidenceCheck.alternatives
                      .map((alt: any) => `${alt.name} (${alt.confidence}%)`)
                      .join(', ')}
                  </p>
                )}
              </div>
            </div>

            {confidenceCheck.clarifying_questions && 
             confidenceCheck.clarifying_questions.length > 0 && (
              <div className="questions-container">
                {confidenceCheck.clarifying_questions.map((question: any, index: number) => 
                  renderQuestion(question, index)
                )}
              </div>
            )}

            <div className="action-section">
              <button
                className="submit-btn"
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    Generate Report
                    {answeredCount > 0 && <span className="badge">{answeredCount} filled</span>}
                  </>
                )}
              </button>

              {confidenceCheck.next_step && (
                <p className="next-step-info">
                  <strong>Note:</strong> {confidenceCheck.next_step}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        .clarifying-questions-section {
          width: 100%;
          margin-top: 20px;
        }

        .card-content {
          background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
          border-radius: 12px;
          padding: 24px;
          color: white;
          box-shadow: 0 8px 32px rgba(8, 145, 178, 0.25);
        }

        .section-header {
          margin-bottom: 24px;
          border-bottom: 2px solid rgba(255, 255, 255, 0.2);
          padding-bottom: 16px;
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .section-header h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .toggle-btn {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.4);
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          font-size: 20px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .toggle-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.6);
          transform: scale(1.05);
        }

        .section-subtitle {
          margin: 0 0 16px 0;
          font-size: 14px;
          opacity: 0.95;
          font-weight: 500;
        }

        .progress-bar {
          height: 7px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%);
          border-radius: 4px;
          transition: width 0.5s ease;
          box-shadow: 0 0 8px rgba(251, 191, 36, 0.5);
        }

        .progress-text {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 11px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.9);
          letter-spacing: 0.5px;
        }

        .message-box {
          background: rgba(255, 255, 255, 0.12);
          border-left: 4px solid #fbbf24;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          display: flex;
          gap: 12px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .message-icon {
          font-size: 24px;
          flex-shrink: 0;
          line-height: 1;
        }

        .message-content {
          flex: 1;
        }

        .message-content p {
          margin: 0 0 8px 0;
          font-size: 13px;
          line-height: 1.5;
          font-weight: 500;
        }

        .message-content p:last-child {
          margin-bottom: 0;
        }

        .alternatives-text {
          opacity: 0.9;
          font-size: 12px;
        }

        .questions-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
        }

        .question-card {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 16px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: all 0.3s ease;
        }

        .question-card:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .question-header {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .question-badge {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          color: #1a1a1a;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
        }

        .question-header h5 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          line-height: 1.4;
        }

        .question-label {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          line-height: 1.4;
          cursor: pointer;
        }

        .text-input-field {
          width: 100%;
          padding: 12px 14px;
          margin-left: 40px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.12);
          color: white;
          font-size: 13px;
          font-family: inherit;
          transition: all 0.3s ease;
          box-sizing: border-box;
        }

        .text-input-field::placeholder {
          color: rgba(255, 255, 255, 0.6);
        }

        .text-input-field:focus {
          outline: none;
          background: rgba(255, 255, 255, 0.18);
          border-color: rgba(251, 191, 36, 0.8);
          box-shadow: 0 0 12px rgba(251, 191, 36, 0.3);
        }

        .text-input-field:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .question-explanation {
          margin: 8px 0 12px 40px;
          font-size: 12px;
          opacity: 0.8;
          line-height: 1.5;
        }

        .symptoms-context {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 12px;
          margin-left: 40px;
        }

        .symptom-pill {
          background: rgba(255, 255, 255, 0.2);
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .answer-options {
          display: flex;
          gap: 8px;
          margin-left: 40px;
          flex-wrap: wrap;
        }

        .option-btn {
          flex: 1;
          min-width: 70px;
          padding: 10px 12px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .option-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.5);
          transform: translateY(-2px);
        }

        .option-btn[data-selected="true"] {
          background: rgba(255, 255, 255, 0.35);
          border-color: rgba(255, 255, 255, 0.7);
          box-shadow: 0 0 12px rgba(255, 255, 255, 0.2);
        }

        .yes-btn[data-selected="true"] {
          background: rgba(76, 175, 80, 0.5);
          border-color: rgba(76, 175, 80, 0.8);
        }

        .no-btn[data-selected="true"] {
          background: rgba(244, 67, 54, 0.5);
          border-color: rgba(244, 67, 54, 0.8);
        }

        .unsure-btn[data-selected="true"] {
          background: rgba(255, 193, 7, 0.5);
          border-color: rgba(255, 193, 7, 0.8);
        }

        .severity-scale {
          display: flex;
          gap: 8px;
          margin-left: 40px;
        }

        .severity-btn {
          flex: 1;
          padding: 12px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          transition: all 0.3s ease;
        }

        .severity-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.5);
        }

        .severity-btn[data-selected="true"] {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.7);
          box-shadow: 0 0 12px rgba(255, 255, 255, 0.2);
        }

        .level-indicator {
          width: 24px;
          height: 6px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 3px;
          position: relative;
        }

        .severity-btn.level-0 .level-indicator {
          width: 8px;
        }

        .severity-btn.level-1 .level-indicator {
          width: 16px;
        }

        .severity-btn.level-2 .level-indicator {
          width: 24px;
        }

        .timeline-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-left: 40px;
        }

        .timeline-btn {
          padding: 12px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.3s ease;
        }

        .timeline-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.5);
        }

        .timeline-btn[data-selected="true"] {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.7);
          box-shadow: 0 0 12px rgba(255, 255, 255, 0.2);
        }

        .timeline-icon {
          font-size: 20px;
        }

        .differential-options {
          display: flex;
          gap: 8px;
          margin-left: 40px;
        }

        .action-section {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
        }

        .submit-btn {
          width: 100%;
          padding: 14px 16px;
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          color: #1a1a1a;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          letter-spacing: 0.5px;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(251, 191, 36, 0.4);
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .badge {
          background: rgba(26, 26, 26, 0.3);
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2.5px solid rgba(26, 26, 26, 0.2);
          border-top-color: #1a1a1a;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .next-step-info {
          margin-top: 12px;
          padding: 12px 14px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          border-left: 3px solid #fbbf24;
          font-size: 12px;
          line-height: 1.5;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .card-content {
            padding: 16px;
          }

          .header-top {
            flex-direction: column;
            gap: 8px;
            align-items: flex-start;
          }

          .answer-options,
          .severity-scale,
          .timeline-options,
          .differential-options {
            margin-left: 0;
          }

          .severity-scale {
            flex-direction: column;
          }

          .severity-btn {
            flex-direction: row;
          }

          .timeline-options {
            gap: 6px;
          }

          .message-box {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

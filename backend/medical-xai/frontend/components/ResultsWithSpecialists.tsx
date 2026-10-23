import React, { useRef, useState } from 'react';
import html2pdf from 'html2pdf.js';
import { DifferentialDiagnosisSection } from './DifferentialDiagnosisSection';
import { ClarifyingQuestionsSection } from './ClarifyingQuestionsSection';

interface SpecialistRecommendation {
  disease: string;
  specialist: string;
  description: string;
  confidence: number;
}

interface FeatureImportance {
  symptom: string;
  importance: number;
  contribution: 'High' | 'Medium' | 'Low';
  explanation?: string;
}

interface XAIScoringBreakdown {
  tfidf_component: number;
  tfidf_weight: number;
  match_component: number;
  match_weight: number;
  final_score: number;
  tfidf_details: {
    tfidf_similarity: number;
    matched_symptoms_count: number;
    total_disease_symptoms: number;
    match_bonus: number;
    unmatched_disease_symptoms: string[];
  };
  match_ratio: number;
  matched_count: number;
  unmatched_disease_symptoms: string[];
}

interface XAIExplanation {
  title: string;
  main_reason: string;
  scoring_components: {
    text_similarity: {
      label: string;
      score: number;
      explanation: string;
      weight: string;
    };
    symptom_match: {
      label: string;
      score: number;
      explanation: string;
      weight: string;
    };
  };
  matched_symptoms: string[];
  unmatched_disease_symptoms: string[];
  overall_confidence: number;
  confidence_level: string;
  summary: string;
}

interface SymptomAnalysis {
  reported_and_match: {
    count: number;
    symptoms: string[];
    description: string;
  };
  disease_expects_but_not_reported: {
    count: number;
    symptoms: string[];
    more_count: number;
    description: string;
  };
  coverage: {
    percentage: number;
    text: string;
  };
}

interface XAIData {
  scoring_breakdown: XAIScoringBreakdown;
  explanation: XAIExplanation;
  symptom_analysis: SymptomAnalysis;
  feature_importance: FeatureImportance[];
}

interface PatientInfo {
  patient_id?: string;
  name?: string;
  age?: string | number;
  gender?: string;
  blood_type?: string;
  contact?: string;
  email?: string;
  allergies?: string | string[];
  current_medications?: string[];
  medical_history?: string[];
  // Health assessment form fields
  last_meal_time?: string;
  last_meal_type?: string;
  water_intake?: string;
  weight?: string;
  past_conditions?: string;
}


// Re-export types from prediction service for component use
type DifferentialDiagnosis = {
  is_differential: boolean;
  diseases_compared?: string[];
  score_1?: number;
  score_2?: number;
  score_difference?: number;
  explanation?: string;
  shared_symptoms?: string[];
  distinguishing_for_top?: string[];
  distinguishing_for_alternative?: string[];
  clarification_symptoms?: string[];
  clarification_explanation?: string;
}

type ClarifyingQuestion = {
  type: 'symptom_confirmation' | 'severity' | 'timeline' | 'differential';
  question: string;
  symptoms?: string[];
  explanation?: string;
}

type ConfidenceCheck = {
  needs_clarification: boolean;
  reason?: string;
  confidence?: number;
  message?: string;
  primary_candidate?: { disease: string; confidence: number };
  alternatives?: Array<{ disease?: string; name?: string; confidence: number }>;
  clarifying_questions?: ClarifyingQuestion[];
  next_step?: string;
}

interface ResultsWithSpecialistsProps {
  disease: string;
  confidence: number;
  topPredictions: Array<{ disease: string; confidence: number }>;
  specialistRecommendations: SpecialistRecommendation[];
  explanation: string;
  importantFeatures: FeatureImportance[];
  matchedSymptoms: string[];
  days: number;
  region: string;
  date?: string;
  patientInfo?: PatientInfo | null;
  xaiData?: XAIData | null;
  analysisType?: 'standard' | 'clarification_needed';
  differentialDiagnosis?: DifferentialDiagnosis | null;
  confidenceCheck?: ConfidenceCheck | null;
  durationWarning?: string | null;
  isLoadingClarifyingAnswers?: boolean;
  onSubmitClarifyingAnswers?: (answers: Record<string, any>) => void;
  onClose?: () => void;
}

const ResultsWithSpecialists: React.FC<ResultsWithSpecialistsProps> = ({
  disease,
  confidence,
  topPredictions,
  specialistRecommendations,
  explanation,
  importantFeatures,
  matchedSymptoms,
  days,
  region,
  date,
  patientInfo,
  xaiData,
  analysisType,
  differentialDiagnosis,
  confidenceCheck,
  durationWarning,
  isLoadingClarifyingAnswers = false,
  onSubmitClarifyingAnswers,
  onClose
}) => {
  const pdfRef = useRef<HTMLDivElement>(null);

  const downloadPDF = () => {
    if (!pdfRef.current) return;

    const element = pdfRef.current;
    const opt = {
      margin: [6, 6, 6, 6],
      filename: `health-assessment-${Date.now()}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.95 },
      html2canvas: { scale: 1.5, useCORS: true, logging: false, allowTaint: true, backgroundColor: '#ffffff' },
      jsPDF: { orientation: 'portrait' as const, unit: 'mm' as const, format: 'a4', compress: true }
    };

    (html2pdf() as any).set(opt).from(element).save();
  };

  return (
    <div className="w-full max-w-4xl">
      {/* PDF Content - Professional Medical Report */}
      <div 
        ref={pdfRef}
        style={{ 
          width: '210mm',
          minHeight: '297mm',
          padding: '15mm',
          margin: '0',
          backgroundColor: '#ffffff',
          color: '#1a1a1a',
          fontFamily: '"Segoe UI", Tahoma, Geneva, sans-serif',
          fontSize: '10pt',
          lineHeight: '1.5'
        }}
      >
        {/* Header Section */}
        <div style={{
          marginBottom: '12mm',
          borderBottom: '3px solid #0891b2',
          paddingBottom: '8mm'
        }}>
          {/* Top Row - Title and Confidence */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '8mm'
          }}>
            <div>
              <div style={{
                fontSize: '9pt',
                fontWeight: '700',
                color: '#0891b2',
                letterSpacing: '1.2px',
                marginBottom: '4mm',
                textTransform: 'uppercase'
              }}>
                ⚕️ Health Intelligence Report
              </div>
              <h1 style={{
                fontSize: '22pt',
                fontWeight: '900',
                margin: '0',
                color: '#0f172a',
                lineHeight: '1.2',
                textTransform: 'capitalize'
              }}>
                {disease}
              </h1>
            </div>
            <div style={{
              backgroundColor: '#0891b2',
              color: '#ffffff',
              padding: '10mm 12mm',
              borderRadius: '4px',
              textAlign: 'center',
              minWidth: '60mm'
            }}>
              <div style={{
                fontSize: '8pt',
                fontWeight: '600',
                marginBottom: '3mm',
                opacity: 0.9,
                textTransform: 'uppercase'
              }}>
                Confidence Level
              </div>
              <div style={{
                fontSize: '20pt',
                fontWeight: '900'
              }}>
                {(confidence * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Metadata Row */}
          <div style={{
            display: 'flex',
            gap: '10mm',
            fontSize: '9pt'
          }}>
            <div style={{
              flex: '1',
              backgroundColor: '#f0f9fa',
              padding: '6mm 8mm',
              borderLeft: '3px solid #0891b2',
              borderRadius: '2px'
            }}>
              <div style={{
                fontSize: '7pt',
                fontWeight: '700',
                color: '#666',
                marginBottom: '2mm',
                textTransform: 'uppercase'
              }}>Date Assessed</div>
              <div style={{
                fontWeight: '600',
                color: '#0f172a'
              }}>
                {date || new Date().toLocaleDateString()}
              </div>
            </div>
            <div style={{
              flex: '1',
              backgroundColor: '#f0f9fa',
              padding: '6mm 8mm',
              borderLeft: '3px solid #0891b2',
              borderRadius: '2px'
            }}>
              <div style={{
                fontSize: '7pt',
                fontWeight: '700',
                color: '#666',
                marginBottom: '2mm',
                textTransform: 'uppercase'
              }}>Duration</div>
              <div style={{
                fontWeight: '600',
                color: '#0f172a'
              }}>
                {days} day{days !== 1 ? 's' : ''}
              </div>
            </div>
            <div style={{
              flex: '1',
              backgroundColor: '#f0f9fa',
              padding: '6mm 8mm',
              borderLeft: '3px solid #0891b2',
              borderRadius: '2px'
            }}>
              <div style={{
                fontSize: '7pt',
                fontWeight: '700',
                color: '#666',
                marginBottom: '2mm',
                textTransform: 'uppercase'
              }}>Region</div>
              <div style={{
                fontWeight: '600',
                color: '#0f172a'
              }}>
                {region}
              </div>
            </div>
          </div>
        </div>

        {/* Patient Information Section */}
        {patientInfo && (
          <div style={{
            marginBottom: '10mm',
            backgroundColor: '#f9fafb',
            padding: '8mm',
            borderRadius: '3px',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{
              fontSize: '9pt',
              fontWeight: '700',
              color: '#0891b2',
              margin: '0 0 5mm 0',
              textTransform: 'uppercase',
              letterSpacing: '0.8px'
            }}>
              👤 Patient Information
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8mm',
              fontSize: '8.5pt'
            }}>
              <div>
                <p style={{ color: '#666', fontSize: '7.5pt', margin: '0 0 1mm 0', fontWeight: '600' }}>Name</p>
                <p style={{ color: '#0f172a', fontWeight: '600', margin: '0' }}>{patientInfo.name || 'N/A'}</p>
              </div>
              <div>
                <p style={{ color: '#666', fontSize: '7.5pt', margin: '0 0 1mm 0', fontWeight: '600' }}>Age / DOB</p>
                <p style={{ color: '#0f172a', fontWeight: '600', margin: '0' }}>{patientInfo.age || 'N/A'} years</p>
              </div>
              <div>
                <p style={{ color: '#666', fontSize: '7.5pt', margin: '0 0 1mm 0', fontWeight: '600' }}>Gender</p>
                <p style={{ color: '#0f172a', fontWeight: '600', margin: '0' }}>{patientInfo.gender || 'N/A'}</p>
              </div>
              <div>
                <p style={{ color: '#666', fontSize: '7.5pt', margin: '0 0 1mm 0', fontWeight: '600' }}>Blood Type</p>
                <p style={{ color: '#0f172a', fontWeight: '600', margin: '0' }}>{patientInfo.blood_type || 'N/A'}</p>
              </div>
              <div>
                <p style={{ color: '#666', fontSize: '7.5pt', margin: '0 0 1mm 0', fontWeight: '600' }}>Email</p>
                <p style={{ color: '#0f172a', fontWeight: '600', margin: '0', fontSize: '7.5pt' }}>{patientInfo.email || 'N/A'}</p>
              </div>
              <div>
                <p style={{ color: '#666', fontSize: '7.5pt', margin: '0 0 1mm 0', fontWeight: '600' }}>Contact</p>
                <p style={{ color: '#0f172a', fontWeight: '600', margin: '0' }}>{patientInfo.contact || 'N/A'}</p>
              </div>

              {patientInfo.allergies && (typeof patientInfo.allergies === 'string' ? patientInfo.allergies.length > 0 : patientInfo.allergies.length > 0) && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ color: '#666', fontSize: '7.5pt', margin: '0 0 1mm 0', fontWeight: '600' }}>⚠️ Allergies</p>
                  <p style={{ color: '#dc2626', fontWeight: '600', margin: '0', fontSize: '8pt' }}>
                    {typeof patientInfo.allergies === 'string' ? patientInfo.allergies : patientInfo.allergies.join(', ')}
                  </p>
                </div>
              )}
              {patientInfo.current_medications && patientInfo.current_medications.length > 0 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ color: '#666', fontSize: '7.5pt', margin: '0 0 1mm 0', fontWeight: '600' }}>💊 Current Medications</p>
                  <p style={{ color: '#0f172a', fontWeight: '500', margin: '0', fontSize: '8pt' }}>
                    {patientInfo.current_medications.join(', ')}
                  </p>
                </div>
              )}
              {patientInfo.medical_history && patientInfo.medical_history.length > 0 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ color: '#666', fontSize: '7.5pt', margin: '0 0 1mm 0', fontWeight: '600' }}>📋 Medical History</p>
                  <p style={{ color: '#0f172a', fontWeight: '500', margin: '0', fontSize: '8pt' }}>
                    {patientInfo.medical_history.join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lifestyle & Health Information Section */}
        {patientInfo && (
          <div style={{
            marginBottom: '10mm',
            backgroundColor: '#fffbeb',
            padding: '8mm',
            borderRadius: '3px',
            border: '1px solid #fbbf24'
          }}>
            <h3 style={{
              fontSize: '9pt',
              fontWeight: '700',
              color: '#d97706',
              margin: '0 0 5mm 0',
              textTransform: 'uppercase',
              letterSpacing: '0.8px'
            }}>
              🏥 Lifestyle & Health Information
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8mm',
              fontSize: '8.5pt'
            }}>
              {patientInfo.last_meal_time && (
                <div>
                  <p style={{ color: '#92400e', fontSize: '7.5pt', margin: '0 0 1mm 0', fontWeight: '600' }}>Last Meal Time</p>
                  <p style={{ color: '#0f172a', fontWeight: '500', margin: '0' }}>{patientInfo.last_meal_time}</p>
                </div>
              )}
              {patientInfo.last_meal_type && (
                <div>
                  <p style={{ color: '#92400e', fontSize: '7.5pt', margin: '0 0 1mm 0', fontWeight: '600' }}>Meal Type</p>
                  <p style={{ color: '#0f172a', fontWeight: '500', margin: '0' }}>{patientInfo.last_meal_type}</p>
                </div>
              )}
              {patientInfo.water_intake && (
                <div>
                  <p style={{ color: '#92400e', fontSize: '7.5pt', margin: '0 0 1mm 0', fontWeight: '600' }}>Water Intake</p>
                  <p style={{ color: '#0f172a', fontWeight: '500', margin: '0' }}>{patientInfo.water_intake}</p>
                </div>
              )}
              {patientInfo.age && (
                <div>
                  <p style={{ color: '#92400e', fontSize: '7.5pt', margin: '0 0 1mm 0', fontWeight: '600' }}>Age</p>
                  <p style={{ color: '#0f172a', fontWeight: '500', margin: '0' }}>{patientInfo.age} years</p>
                </div>
              )}
              {patientInfo.weight && (
                <div>
                  <p style={{ color: '#92400e', fontSize: '7.5pt', margin: '0 0 1mm 0', fontWeight: '600' }}>Weight</p>
                  <p style={{ color: '#0f172a', fontWeight: '500', margin: '0' }}>{patientInfo.weight} kg</p>
                </div>
              )}
              {patientInfo.past_conditions && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ color: '#92400e', fontSize: '7.5pt', margin: '0 0 1mm 0', fontWeight: '600' }}>Past Medical Conditions</p>
                  <p style={{ color: '#0f172a', fontWeight: '500', margin: '0', fontSize: '8pt' }}>{patientInfo.past_conditions}</p>
                </div>
              )}
              {patientInfo.allergies && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ color: '#92400e', fontSize: '7.5pt', margin: '0 0 1mm 0', fontWeight: '600' }}>⚠️ Allergies</p>
                  <p style={{ color: '#dc2626', fontWeight: '600', margin: '0', fontSize: '8pt' }}>{typeof patientInfo.allergies === 'string' ? patientInfo.allergies : patientInfo.allergies?.join(', ')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Analysis Section */}
        <div style={{
          marginBottom: '8mm',
          backgroundColor: '#f8fafb',
          padding: '10mm',
          borderLeft: '4px solid #0891b2',
          borderRadius: '3px'
        }}>
          <h2 style={{
            fontSize: '10pt',
            fontWeight: '700',
            color: '#0891b2',
            margin: '0 0 5mm 0',
            textTransform: 'uppercase',
            letterSpacing: '0.8px'
          }}>
            📊 AI Analysis & Explanation
          </h2>
          <p style={{
            margin: '0',
            fontSize: '9pt',
            lineHeight: '1.6',
            color: '#404040',
            textAlign: 'justify'
          }}>
            {explanation}
          </p>
        </div>

        {/* XAI Scoring Breakdown Section - SIMPLIFIED */}
        {xaiData?.explanation && (
          <div style={{
            marginBottom: '8mm',
            backgroundColor: '#f0f9fa',
            padding: '10mm',
            border: '2px solid #0891b2',
            borderRadius: '3px'
          }}>
            <h2 style={{
              fontSize: '10pt',
              fontWeight: '700',
              color: '#0891b2',
              margin: '0 0 5mm 0',
              textTransform: 'uppercase',
              letterSpacing: '0.8px'
            }}>
              🔍 How We Arrived at This Diagnosis
            </h2>
            
            <div style={{
              marginBottom: '5mm',
              backgroundColor: '#ffffff',
              padding: '8mm',
              borderRadius: '3px',
              border: '1px solid #ddd'
            }}>
              <p style={{
                margin: '0',
                fontSize: '9pt',
                lineHeight: '1.6',
                color: '#404040'
              }}>
                <strong>What We Found:</strong><br/>
                {xaiData.explanation.main_reason}
              </p>
            </div>

            {/* Simple Match Explanation */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6mm',
              marginBottom: '5mm'
            }}>
              {/* Symptom Match */}
              <div style={{
                backgroundColor: '#ffffff',
                padding: '8mm',
                borderRadius: '3px',
                border: '1px solid #ddd'
              }}>
                <p style={{
                  margin: '0 0 4mm 0',
                  fontSize: '9pt',
                  fontWeight: '600',
                  color: '#0891b2'
                }}>
                  Your Symptoms
                </p>
                <p style={{
                  margin: '0',
                  fontSize: '8.5pt',
                  lineHeight: '1.5',
                  color: '#404040'
                }}>
                  {xaiData.symptom_analysis.reported_and_match.count} of your symptoms match what we typically see with this condition. This is a strong indicator.
                </p>
              </div>

              {/* Coverage Explanation */}
              <div style={{
                backgroundColor: '#ffffff',
                padding: '8mm',
                borderRadius: '3px',
                border: '1px solid #ddd'
              }}>
                <p style={{
                  margin: '0 0 4mm 0',
                  fontSize: '9pt',
                  fontWeight: '600',
                  color: '#0891b2'
                }}>
                  Symptom Completeness
                </p>
                <p style={{
                  margin: '0',
                  fontSize: '8.5pt',
                  lineHeight: '1.5',
                  color: '#404040'
                }}>
                  {xaiData.symptom_analysis.coverage.percentage.toFixed(0)}% of common symptoms for this condition are present. The more symptoms match, the more confident we are in the diagnosis.
                </p>
              </div>
            </div>

            {/* Simple Summary */}
            <div style={{
              backgroundColor: '#ecf8f9',
              padding: '8mm',
              borderRadius: '3px',
              border: '1px solid #0891b2'
            }}>
              <p style={{
                margin: '0',
                fontSize: '8.5pt',
                lineHeight: '1.6',
                color: '#0f172a',
                fontStyle: 'italic'
              }}>
                <strong>In Plain Language:</strong> The AI examined your symptoms and found they closely match {disease}. The match is based on your reported symptoms and typical presentation patterns for this condition.
              </p>
            </div>
          </div>
        )}

        {/* Symptoms and Key Indicators Row */}
        <div style={{
          display: 'flex',
          gap: '8mm',
          marginBottom: '8mm'
        }}>
          {/* Recognized Symptoms */}
          <div style={{ flex: '1' }}>
            <h3 style={{
              fontSize: '9pt',
              fontWeight: '700',
              color: '#0891b2',
              margin: '0 0 4mm 0',
              textTransform: 'uppercase',
              letterSpacing: '0.8px'
            }}>
              ✓ Recognized Symptoms ({matchedSymptoms.length})
            </h3>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4mm'
            }}>
              {matchedSymptoms.slice(0, 15).map((symptom, idx) => (
                <span
                  key={idx}
                  style={{
                    display: 'inline-block',
                    padding: '4mm 6mm',
                    backgroundColor: '#dcfce7',
                    color: '#15803d',
                    fontSize: '8pt',
                    border: '1px solid #86efac',
                    borderRadius: '3px',
                    fontWeight: '500'
                  }}
                >
                  {symptom}
                </span>
              ))}
              {matchedSymptoms.length > 15 && (
                <span style={{
                  display: 'inline-block',
                  padding: '4mm 6mm',
                  fontSize: '8pt',
                  color: '#666',
                  fontWeight: '500'
                }}>
                  +{matchedSymptoms.length - 15} more
                </span>
              )}
            </div>
          </div>

          {/* Top Impact Symptoms */}
          {importantFeatures.length > 0 && (
            <div style={{ flex: '1' }}>
              <h3 style={{
                fontSize: '9pt',
                fontWeight: '700',
                color: '#0891b2',
                margin: '0 0 4mm 0',
                textTransform: 'uppercase',
                letterSpacing: '0.8px'
              }}>
                ⭐ Most Important Symptoms for This Diagnosis
              </h3>
              <p style={{
                margin: '0 0 4mm 0',
                fontSize: '8pt',
                color: '#666',
                lineHeight: '1.5'
              }}>
                These symptoms were the strongest indicators of {disease}. <strong>High impact</strong> means this symptom heavily contributed to the diagnosis.
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '4mm'
              }}>
                {importantFeatures.slice(0, 4).map((feature, idx) => (
                  <div key={idx} style={{
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    padding: '5mm',
                    borderRadius: '3px',
                    fontSize: '8pt'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '3mm',
                      gap: '4mm'
                    }}>
                      <strong style={{
                        color: '#0f172a',
                        fontSize: '8pt'
                      }}>
                        {feature.symptom}
                      </strong>
                      <span style={{
                        fontSize: '7pt',
                        fontWeight: '600',
                        padding: '2mm 4mm',
                        borderRadius: '2px',
                        backgroundColor: feature.contribution === 'High' ? '#fca5a5' :
                                          feature.contribution === 'Medium' ? '#fde047' : '#bbf7d0',
                        color: feature.contribution === 'High' ? '#7f1d1d' :
                               feature.contribution === 'Medium' ? '#713f12' : '#166534',
                        whiteSpace: 'nowrap'
                      }}>
                        {feature.contribution}
                      </span>
                    </div>
                    <div style={{
                      backgroundColor: '#e5e7eb',
                      height: '3mm',
                      borderRadius: '1.5mm',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        backgroundColor: '#0891b2',
                        height: '100%',
                        width: `${Math.min(feature.importance * 900, 100)}%`,
                        transition: 'width 0.3s'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Diagnoses Table */}
        <div style={{ marginBottom: '8mm' }}>
          <h2 style={{
            fontSize: '10pt',
            fontWeight: '700',
            color: '#0891b2',
            margin: '0 0 5mm 0',
            textTransform: 'uppercase',
            letterSpacing: '0.8px'
          }}>
            🏥 Top 5 Diagnoses & Specialist Recommendations
          </h2>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '2px solid #0891b2',
            fontSize: '8.5pt',
            backgroundColor: '#ffffff'
          }}>
            <thead>
              <tr style={{
                backgroundColor: '#0f172a',
                color: '#ffffff'
              }}>
                <th style={{
                  padding: '6mm',
                  border: '1px solid #0891b2',
                  textAlign: 'center',
                  fontWeight: '700',
                  fontSize: '8pt',
                  width: '8%'
                }}>
                  #
                </th>
                <th style={{
                  padding: '6mm',
                  border: '1px solid #0891b2',
                  textAlign: 'left',
                  fontWeight: '700',
                  fontSize: '8pt'
                }}>
                  Disease / Indication
                </th>
                <th style={{
                  padding: '6mm',
                  border: '1px solid #0891b2',
                  textAlign: 'left',
                  fontWeight: '700',
                  fontSize: '8pt'
                }}>
                  Recommended Specialist
                </th>
                <th style={{
                  padding: '6mm',
                  border: '1px solid #0891b2',
                  textAlign: 'center',
                  fontWeight: '700',
                  fontSize: '8pt',
                  width: '15%'
                }}>
                  Confidence
                </th>
              </tr>
            </thead>
            <tbody>
              {specialistRecommendations.slice(0, 5).map((rec, idx) => (
                <tr key={idx} style={{
                  backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <td style={{
                    padding: '6mm',
                    border: '1px solid #ddd',
                    textAlign: 'center',
                    fontWeight: '700',
                    color: '#0891b2',
                    fontSize: '9pt'
                  }}>
                    {idx + 1}
                  </td>
                  <td style={{
                    padding: '6mm',
                    border: '1px solid #ddd',
                    textAlign: 'left'
                  }}>
                    <div style={{
                      fontWeight: '700',
                      color: '#0f172a',
                      marginBottom: '2mm',
                      fontSize: '8.5pt'
                    }}>
                      {rec.disease}
                    </div>
                    <div style={{
                      fontSize: '7.5pt',
                      color: '#666',
                      fontStyle: 'italic'
                    }}>
                      {rec.description.substring(0, 50)}
                    </div>
                  </td>
                  <td style={{
                    padding: '6mm',
                    border: '1px solid #ddd',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#0f172a'
                  }}>
                    {rec.specialist}
                  </td>
                  <td style={{
                    padding: '6mm',
                    border: '1px solid #ddd',
                    textAlign: 'center',
                    fontWeight: '700',
                    color: '#0891b2',
                    backgroundColor: '#f0f9fa',
                    fontSize: '9pt'
                  }}>
                    {(rec.confidence * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Important Disclaimer */}
        <div style={{
          backgroundColor: '#fffbeb',
          border: '2px solid #f59e0b',
          padding: '8mm',
          borderRadius: '4px',
          fontSize: '8pt',
          color: '#78350f',
          lineHeight: '1.6'
        }}>
          <p style={{
            margin: '0 0 3mm 0',
            fontWeight: '700',
            fontSize: '9pt'
          }}>
            ⚠️ IMPORTANT MEDICAL DISCLAIMER
          </p>
          <p style={{
            margin: '0'
          }}>
            This AI-generated assessment is for informational purposes only and does NOT constitute professional medical advice, diagnosis, treatment, or consultation. It should never be used as a substitute for advice from licensed healthcare professionals. Always consult with qualified physicians for medical concerns. In case of medical emergencies, contact emergency services immediately.
          </p>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '8mm',
          paddingTop: '6mm',
          borderTop: '1px solid #e5e7eb',
          fontSize: '8pt',
          color: '#999',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span>Health Assessment System v1.0</span>
          <span>{new Date().toLocaleDateString()} • {new Date().toLocaleTimeString()}</span>
          <span>Ref: {Date.now().toString().slice(-8)}</span>
        </div>
      </div>

      {/* Download Buttons */}
      <div className="mt-8 flex flex-col gap-6">
        {/* Duration Warning */}
        {durationWarning && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-700 rounded-xl p-5 animate-in fade-in slide-in-from-top-4">
            <div className="flex gap-3 items-start">
              <div className="text-2xl">⚠️</div>
              <div className="flex-1">
                <h3 className="font-bold text-amber-900 dark:text-amber-200 mb-2">Duration Alert</h3>
                <p className="text-amber-800 dark:text-amber-300 text-sm leading-relaxed">
                  {durationWarning}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Differential Diagnosis Section */}
        <DifferentialDiagnosisSection differentialDiagnosis={differentialDiagnosis} />

        {/* Clarifying Questions Section */}
        <ClarifyingQuestionsSection 
          confidenceCheck={confidenceCheck}
          onSubmitAnswers={onSubmitClarifyingAnswers}
          isLoading={isLoadingClarifyingAnswers}
        />

        {/* Action Buttons */}
        <div className="flex gap-4 flex-col sm:flex-row">
        <button
          onClick={downloadPDF}
          className="flex-1 h-14 bg-cyan-500 hover:bg-cyan-600 text-black font-bold rounded-2xl transition-all shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-3 active:scale-95"
        >
          <span className="material-symbols-outlined">download</span>
          Download as PDF
        </button>
        <button
          onClick={() => {
            const text = `${disease}\nConfidence: ${(confidence * 100).toFixed(1)}%\n\n${explanation}`;
            navigator.clipboard.writeText(text).then(() => {
              alert('Report copied to clipboard!');
            });
          }}
          className="flex-1 h-14 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
        >
          <span className="material-symbols-outlined">content_copy</span>
          Copy Report
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="h-14 px-6 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">close</span>
            Close
          </button>
        )}
        </div>
      </div>
    </div>
  );
};

export default ResultsWithSpecialists;

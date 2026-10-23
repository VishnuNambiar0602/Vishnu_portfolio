// Type definitions for API responses

type XAIScoringBreakdown = {
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
};

// Export BASE URL for use in components
export const API_BASE_URL = (import.meta.env as any).VITE_API_BASE_URL || 'http://localhost:5000';

type XAIExplanation = {
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
};

type SymptomAnalysis = {
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
};

type FeatureImportance = {
  symptom: string;
  importance: number;
  contribution: 'High' | 'Medium' | 'Low';
  explanation: string;
};

type XAIData = {
  scoring_breakdown: XAIScoringBreakdown;
  explanation: XAIExplanation;
  symptom_analysis: SymptomAnalysis;
  feature_importance: FeatureImportance[];
};

type Disease = {
  name: string;
  disease_id: string;
  confidence: number;
  confidence_level: string;
  explanation: string;
  matched_symptoms: string[];
  all_symptoms: string[];
  duration_warning?: string;
  xai: XAIData;
};

// New types for differential diagnosis and confidence checks
export type DistinguishingSymptoms = {
  for_top: string[];
  for_alternative: string[];
};

export type DifferentialDiagnosis = {
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
};

export type ClarifyingQuestion = {
  type: 'symptom_confirmation' | 'severity' | 'timeline' | 'differential' | 'text_input';
  question: string;
  symptoms?: string[];
  explanation?: string;
  field_name?: string; // NEW: For text_input type
  required?: boolean; // NEW: For text_input type
};

export type ConfidenceCheck = {
  needs_clarification: boolean;
  reason?: string;
  confidence?: number;
  message?: string;
  primary_candidate?: {
    disease: string;
    confidence: number;
  };
  alternatives?: Array<{
    name: string;
    confidence: number;
  }>;
  clarifying_questions?: ClarifyingQuestion[];
  next_step?: string;
};

type DiagnoseResponse = {
  input_symptoms: string[];
  total_matches: number;
  days: number;
  diseases: Disease[];
  analysis_type: 'standard' | 'clarification_needed';
  differential_diagnosis: DifferentialDiagnosis;
  confidence_check: ConfidenceCheck;
};

type ApiPrediction = {
  disease: string;
  confidence: number;
};

type FeatureImportanceOld = {
  symptom: string;
  importance: number;
  contribution: 'High' | 'Medium' | 'Low';
};

type ApiResponse = {
  disease: string;
  confidence: number;
  top_predictions: ApiPrediction[];
  specialist_recommendations: any[];
  matched_symptoms: string[];
  unmatched_symptoms: string[];
  days: number;
  region: string;
  important_features: FeatureImportanceOld[];
  explanation: string;
  xai_data?: XAIData;
  all_diseases?: Disease[];
  analysis_type?: 'standard' | 'clarification_needed';
  differential_diagnosis?: DifferentialDiagnosis;
  confidence_check?: ConfidenceCheck;
  duration_warning?: string;
  patient_info?: Record<string, any>; // NEW: Patient information form data
};

const getRiskLevel = (confidence: number) => {
  if (confidence >= 0.7) return 'High';
  if (confidence >= 0.4) return 'Moderate';
  return 'Low';
};

/**
 * Enhanced symptom analysis with XAI integration
 * Connects to the Medical-XAI backend for diagnosis and explainability
 */
export const analyzeSymptoms = async (symptoms: string, days: number, region: string) => {
  const baseUrl = (import.meta.env as any).VITE_API_BASE_URL || 'http://localhost:5000';
  
  console.log('Analyzing symptoms:', { symptoms, days, region, baseUrl });
  
  const symptomsList = symptoms.split(',').map((item) => item.trim()).filter(Boolean);
  
  const payload = {
    symptoms: symptomsList.join(', '),
    days: days
  };

  console.log('Sending payload:', payload);

  try {
    // Call the /diagnose endpoint which returns XAI-formatted data
    const response = await fetch(`${baseUrl}/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const detail = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('API error detail:', detail);
      const message = detail?.error || 'Unknown error from API';
      throw new Error(message);
    }

    const result: DiagnoseResponse = await response.json();
    console.log('API result:', result);
    
    if (!result.diseases || result.diseases.length === 0) {
      throw new Error('No diseases matched. Please try different symptoms.');
    }
    
    const topDisease = result.diseases[0];
    const riskLevel = getRiskLevel(topDisease.confidence / 100);

    // Format top predictions
    const topPredictions = result.diseases.slice(0, 5).map(d => ({
      disease: d.name,
      confidence: d.confidence / 100
    }));

    // Extract XAI feature importance
    const importantFeatures = topDisease.xai?.feature_importance || [];
    
    // Generate specialist recommendations based on disease
    const specialistMap: { [key: string]: string } = {
      'pneumonia': 'Pulmonologist',
      'covid': 'Infectious Disease Specialist',
      'covid-19': 'Infectious Disease Specialist',
      'influenza': 'General Practitioner',
      'flu': 'General Practitioner',
      'asthma': 'Pulmonologist',
      'high blood pressure': 'Cardiologist',
      'hypertension': 'Cardiologist'
    };
    
    const getSpecialist = (diseaseName: string): string => {
      const lower = diseaseName.toLowerCase();
      for (const [key, specialist] of Object.entries(specialistMap)) {
        if (lower.includes(key)) return specialist;
      }
      return 'General Practitioner';
    };
    
    // Create specialist recommendations for all diseases
    const specialistRecommendations = result.diseases.slice(0, 5).map((disease, idx) => ({
      disease: disease.name,
      specialist: getSpecialist(disease.name),
      description: disease.explanation || 'Consult the recommended specialist for proper diagnosis and treatment.',
      confidence: disease.confidence / 100
    }));

    const recommendations = [
      `Primary match: ${topDisease.name} (${topDisease.confidence}%)`,
      `You reported ${result.input_symptoms.length} symptom(s): ${result.input_symptoms.join(', ')}`,
      `${topDisease.matched_symptoms.length} of your symptoms match ${topDisease.name}`
    ];

    return {
      summary: `${topDisease.name} (${topDisease.confidence}% confidence)`,
      riskLevel,
      recommendations,
      
      // Enhanced data for detailed display
      apiResponse: {
        disease: topDisease.name,
        confidence: topDisease.confidence / 100,
        top_predictions: topPredictions,
        specialist_recommendations: specialistRecommendations,
        matched_symptoms: topDisease.matched_symptoms,
        unmatched_symptoms: topDisease.all_symptoms.filter(s => !topDisease.matched_symptoms.includes(s)),
        days: days,
        region: region,
        important_features: importantFeatures,
        explanation: topDisease.explanation,
        duration_warning: topDisease.duration_warning,
        
        // Add complete XAI data
        xai_data: topDisease.xai,
        all_diseases: result.diseases,
        
        // NEW: Add differential diagnosis and confidence checks
        analysis_type: result.analysis_type,
        differential_diagnosis: result.differential_diagnosis,
        confidence_check: result.confidence_check
      }
    };
  } catch (error) {
    console.error('Error in analyzeSymptoms:', error);
    throw error;
  }
};

/**
 * Get detailed XAI explanation for a specific disease
 */
export const getDiseaseExplanation = async (diseaseId: string) => {
  const baseUrl = (import.meta.env as any).VITE_API_BASE_URL || 'http://localhost:5000';
  
  try {
    const response = await fetch(`${baseUrl}/xai/diagnosis/${diseaseId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error('Failed to get explanation');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting explanation:', error);
    throw error;
  }
};

/**
 * Get comparative analysis between diagnoses
 */
export const getComparativeAnalysis = async (symptoms: string) => {
  const baseUrl = (import.meta.env as any).VITE_API_BASE_URL || 'http://localhost:5000';
  
  const payload = {
    symptoms: symptoms
  };

  try {
    const response = await fetch(`${baseUrl}/xai/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('Failed to get comparative analysis');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting comparison:', error);
    throw error;
  }
};

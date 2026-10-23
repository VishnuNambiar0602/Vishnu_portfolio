"""
XAI Formatter Module - Converts model outputs to human-readable explanations
Formats explainability data for UI consumption
"""

from typing import Dict, List, Any
import json


class XAIFormatter:
    """Formats medical diagnosis explanations for human readability"""
    
    # Map diseases to medical specialists
    DISEASE_SPECIALIST_MAP = {
        "common_cold": ("General Practitioner", "No specialist visit usually needed"),
        "flu": ("General Practitioner", "Consult for severe cases"),
        "covid_19": ("Infectious Disease Specialist", "COVID-19 management and monitoring"),
        "allergies": ("Allergist/Immunologist", "Allergy testing and management"),
        "asthma": ("Pulmonologist", "Respiratory function testing and management"),
        "bronchitis": ("Pulmonologist", "Airways inflammation treatment"),
        "pneumonia": ("Pulmonologist", "Chest imaging and antibiotics"),
        "migraine": ("Neurologist", "Headache management and prevention"),
        "hypertension": ("Cardiologist", "Blood pressure control and cardiovascular health"),
        "diabetes": ("Endocrinologist", "Blood glucose management and complications"),
        "gastroenteritis": ("Gastroenterologist", "GI infection treatment"),
        "urinary_tract_infection": ("Urologist", "Urinary system infection treatment"),
        "anxiety": ("Psychiatrist/Psychologist", "Mental health evaluation and therapy"),
        "depression": ("Psychiatrist/Psychologist", "Mental health evaluation and therapy"),
        "dermatitis": ("Dermatologist", "Skin condition diagnosis and treatment"),
        "thyroiditis": ("Endocrinologist", "Thyroid function testing and management"),
    }
    
    @staticmethod
    def validate_disease_duration(possible_diseases: List[Dict], symptom_days: int, knowledge_base: Dict) -> List[Dict]:
        """
        Validate if symptom duration makes sense for the diagnosed diseases.
        Apply penalty to confidence score if duration is unrealistic.
        
        Args:
            possible_diseases: List of diagnosed diseases with scores
            symptom_days: How many days symptoms have lasted
            knowledge_base: Medical knowledge base with disease duration data
            
        Returns:
            List of diseases with adjusted confidence scores based on duration validation
        """
        diseases = knowledge_base.get("diseases", {})
        
        for disease in possible_diseases:
            disease_id = disease.get("disease_id")
            disease_data = diseases.get(disease_id, {})
            
            # Get typical duration range for this disease
            min_duration = disease_data.get("typical_duration_min", 1)
            max_duration = disease_data.get("typical_duration_max", 365)
            is_chronic = disease_data.get("is_chronic", False)
            
            # Check if duration is reasonable
            original_confidence = disease.get("confidence_score", 0)
            
            if symptom_days < min_duration:
                # Symptoms came too fast - disease usually takes longer to develop
                penalty = 0.15 * (min_duration - symptom_days) / max(1, min_duration)
                duration_warning = f"⚠️ Symptoms developed very quickly. {disease_data.get('name')} typically develops over {min_duration}+ days."
                
            elif symptom_days > max_duration and not is_chronic:
                # Symptoms lasted way too long for an acute illness
                penalty = 0.25  # Large penalty for acute conditions lasting months
                duration_warning = f"⚠️ Symptoms lasting {symptom_days} days is unusual for {disease_data.get('name')} (typically {max_duration} days max). Consider chronic condition re-evaluation."
                
            elif symptom_days > (max_duration * 2) and not is_chronic:
                # Symptoms lasted VERY long
                penalty = 0.35  # Major penalty
                duration_warning = f"⚠️ These symptoms have persisted for {symptom_days} days, which is far longer than typical for {disease_data.get('name')}. Please consult specialist."
                
            else:
                penalty = 0.0
                duration_warning = None
            
            # Apply penalty
            adjusted_confidence = max(0.0, original_confidence - penalty)
            
            disease["confidence_score"] = adjusted_confidence
            disease["duration_validation"] = {
                "symptom_days": symptom_days,
                "typical_duration_min": min_duration,
                "typical_duration_max": max_duration,
                "is_chronic": is_chronic,
                "penalty_applied": round(penalty, 3),
                "original_confidence": round(original_confidence, 3),
                "adjusted_confidence": round(adjusted_confidence, 3),
                "warning": duration_warning
            }
        
        return possible_diseases
    
    @staticmethod
    def format_scoring_explanation(diagnosis: Dict) -> Dict:
        """
        Convert scoring breakdown to human-readable explanation
        
        Args:
            diagnosis: Disease diagnosis dict with scoring_breakdown
            
        Returns:
            Human-readable explanation dict
        """
        sb = diagnosis.get("scoring_breakdown", {})
        disease_name = diagnosis.get("disease_name", "Unknown")
        confidence = diagnosis.get("confidence_score", 0)
        
        explanation = {
            "title": f"Why {disease_name}?",
            "main_reason": XAIFormatter._generate_main_reason(diagnosis),
            "scoring_components": {
                "text_similarity": {
                    "label": "Text/Semantic Similarity",
                    "score": round(sb.get("tfidf_component", 0) * 100, 1),
                    "explanation": XAIFormatter._explain_text_similarity(sb),
                    "weight": "60%"
                },
                "symptom_match": {
                    "label": "Symptom Overlap",
                    "score": round(sb.get("match_component", 0) * 100, 1),
                    "explanation": XAIFormatter._explain_symptom_match(sb),
                    "weight": "40%"
                }
            },
            "matched_symptoms": diagnosis.get("matched_symptoms", []),
            "unmatched_disease_symptoms": sb.get("tfidf_details", {}).get("unmatched_disease_symptoms", [])[:3],
            "overall_confidence": round(confidence * 100, 1),
            "confidence_level": XAIFormatter._get_confidence_level(confidence),
            "summary": XAIFormatter._generate_summary(diagnosis)
        }
        
        return explanation
    
    @staticmethod
    def _generate_main_reason(diagnosis: Dict) -> str:
        """Generate the main reason for the diagnosis"""
        sb = diagnosis.get("scoring_breakdown", {})
        matched = sb.get("matched_count", 0)
        total = sb.get("total_disease_symptoms", 1)
        tfidf_sim = sb.get("tfidf_details", {}).get("tfidf_similarity", 0)
        
        reasons = []
        
        # Check semantic similarity
        if tfidf_sim > 0.6:
            reasons.append(f"Strong semantic match (your symptoms closely match the description of this disease)")
        elif tfidf_sim > 0.3:
            reasons.append(f"Moderate semantic match (your symptoms are somewhat similar to this disease)")
        
        # Check exact matches
        if matched >= total * 0.7:
            reasons.append(f"Most of the key symptoms match ({matched}/{total})")
        elif matched >= total * 0.4:
            reasons.append(f"Several key symptoms match ({matched}/{total})")
        
        return " and ".join(reasons) if reasons else "Symptoms show similarity to this disease"
    
    @staticmethod
    def _explain_text_similarity(sb: Dict) -> str:
        """Explain the text/semantic similarity component"""
        tfidf_sim = sb.get("tfidf_details", {}).get("tfidf_similarity", 0)
        
        if tfidf_sim > 0.7:
            return "Your symptom description closely matches the medical terms used for this disease"
        elif tfidf_sim > 0.4:
            return "Your symptom description is moderately similar to how this disease is typically described"
        else:
            return "Your symptom description has some similarity to this disease"
    
    @staticmethod
    def _explain_symptom_match(sb: Dict) -> str:
        """Explain the symptom matching component"""
        matched = sb.get("matched_count", 0)
        total = sb.get("total_disease_symptoms", 1)
        ratio = sb.get("match_ratio", 0)
        
        if ratio > 0.7:
            return f"Most symptoms match: {matched} out of {total} key symptoms are present in your report"
        elif ratio > 0.4:
            return f"Good overlap: {matched} out of {total} key symptoms match your symptoms"
        else:
            return f"Partial match: {matched} out of {total} key symptoms are present"
    
    @staticmethod
    def _get_confidence_level(confidence: float) -> str:
        """Determine confidence level description"""
        if confidence >= 0.8:
            return "Very High"
        elif confidence >= 0.6:
            return "High"
        elif confidence >= 0.4:
            return "Moderate"
        elif confidence >= 0.2:
            return "Low"
        else:
            return "Very Low"
    
    @staticmethod
    def _generate_summary(diagnosis: Dict) -> str:
        """Generate a natural language summary"""
        name = diagnosis.get("disease_name", "this condition")
        confidence = diagnosis.get("confidence_score", 0)
        matched = diagnosis.get("matched_symptoms", [])
        explanation = diagnosis.get("explanation", "")
        
        summary = f"{name} appears to match your symptoms with {confidence*100:.0f}% confidence.\n\n"
        
        if matched:
            summary += f"You reported {len(matched)} symptoms that are typical of {name}: "
            summary += ", ".join(matched[:3])
            if len(matched) > 3:
                summary += f", and {len(matched)-3} more.\n\n"
            else:
                summary += ".\n\n"
        
        summary += f"{explanation}"
        
        return summary
    
    @staticmethod
    def format_comparative_analysis(top_diseases: List[Dict]) -> Dict:
        """
        Format comparative analysis between top diseases
        
        Args:
            top_diseases: List of top disease predictions
            
        Returns:
            Formatted comparison
        """
        if len(top_diseases) < 2:
            return {"message": "Only one disease detected"}
        
        comparison = {
            "top_choice": {
                "name": top_diseases[0]["disease_name"],
                "confidence": round(top_diseases[0]["confidence_score"] * 100, 1),
                "reason": top_diseases[0].get("explanation", "Best match for reported symptoms")
            },
            "alternatives": []
        }
        
        for disease in top_diseases[1:]:
            score_diff = top_diseases[0]["confidence_score"] - disease["confidence_score"]
            comparison["alternatives"].append({
                "name": disease["disease_name"],
                "confidence": round(disease["confidence_score"] * 100, 1),
                "why_lower": f"{round(score_diff*100, 1)}% less likely than {top_diseases[0]['disease_name']}"
            })
        
        return comparison
    
    @staticmethod
    def format_symptom_analysis(matched: List[str], unmatched: List[str], 
                               disease_symptoms: List[str]) -> Dict:
        """
        Format detailed symptom analysis
        
        Args:
            matched: Symptoms that match
            unmatched: Disease symptoms not reported
            disease_symptoms: All disease symptoms
            
        Returns:
            Formatted symptom analysis
        """
        return {
            "reported_and_match": {
                "count": len(matched),
                "symptoms": matched,
                "description": f"These {len(matched)} symptoms from your report are key indicators of this disease"
            },
            "disease_expects_but_not_reported": {
                "count": len(unmatched),
                "symptoms": unmatched[:5],
                "more_count": max(0, len(unmatched) - 5),
                "description": "Other symptoms commonly associated with this disease (but you didn't mention them)"
            },
            "coverage": {
                "percentage": round((len(matched) / len(disease_symptoms) * 100) if disease_symptoms else 0, 1),
                "text": f"You reported {round((len(matched) / len(disease_symptoms) * 100) if disease_symptoms else 0, 1)}% of the typical symptoms"
            }
        }
    
    @staticmethod
    def format_feature_importance(diagnosis: Dict) -> List[Dict]:
        """
        Generate feature importance from diagnosis breakdown
        
        Args:
            diagnosis: Disease diagnosis dict
            
        Returns:
            List of important features (symptoms) with importance scores
        """
        matched_symptoms = diagnosis.get("matched_symptoms", [])
        sb = diagnosis.get("scoring_breakdown", {})
        
        # Create feature importance based on matched symptoms
        features = []
        
        if matched_symptoms:
            # Distribute importance among matched symptoms
            base_importance = 1.0 / len(matched_symptoms)
            
            for symptom in matched_symptoms:
                importance_score = base_importance
                
                # Boost importance for high-confidence diagnoses
                if diagnosis.get("confidence_score", 0) > 0.7:
                    contribution = "High"
                    importance_score *= 1.2
                elif diagnosis.get("confidence_score", 0) > 0.4:
                    contribution = "Medium"
                else:
                    contribution = "Low"
                
                features.append({
                    "symptom": symptom,
                    "importance": min(importance_score, 1.0),  # Cap at 1.0
                    "contribution": contribution,
                    "explanation": f"Present in your symptoms and is a key indicator for this diagnosis"
                })
        
        # Sort by importance
        features.sort(key=lambda x: x["importance"], reverse=True)
        return features
    
    @staticmethod
    def format_complete_diagnosis(diagnosis: Dict) -> Dict:
        """
        Format complete diagnosis with all XAI information
        
        Args:
            diagnosis: Raw diagnosis from model
            
        Returns:
            Formatted diagnosis with XAI explanations
        """
        return {
            "disease_id": diagnosis.get("disease_id"),
            "disease_name": diagnosis.get("disease_name"),
            "confidence": round(diagnosis.get("confidence_score", 0) * 100, 1),
            "confidence_level": XAIFormatter._get_confidence_level(diagnosis.get("confidence_score", 0)),
            
            # XAI Components
            "xai_explanation": XAIFormatter.format_scoring_explanation(diagnosis),
            "symptom_analysis": XAIFormatter.format_symptom_analysis(
                diagnosis.get("matched_symptoms", []),
                diagnosis.get("scoring_breakdown", {}).get("tfidf_details", {}).get("unmatched_disease_symptoms", []),
                diagnosis.get("disease_symptoms", [])
            ),
            "feature_importance": XAIFormatter.format_feature_importance(diagnosis),
            
            # Medical info
            "medical_explanation": diagnosis.get("explanation", ""),
            "matched_symptoms": diagnosis.get("matched_symptoms", []),
            "rank": diagnosis.get("rank", 0)
        }
    
    @staticmethod
    def format_counterfactual_analysis(top_diseases: List[Dict]) -> Dict:
        """
        Generate counterfactual analysis comparing top 2 diagnoses.
        Explains exactly which missing symptoms kept the #2 result lower.
        
        Args:
            top_diseases: List of top disease predictions (at least 2)
            
        Returns:
            Counterfactual analysis explaining symptom gaps
        """
        if len(top_diseases) < 2:
            return {
                "available": False,
                "message": "Only one disease detected"
            }
        
        top_1 = top_diseases[0]
        top_2 = top_diseases[1]
        
        top_1_name = top_1.get("disease_name", "Unknown")
        top_2_name = top_2.get("disease_name", "Unknown")
        top_1_conf = top_1.get("confidence_score", 0)
        top_2_conf = top_2.get("confidence_score", 0)
        confidence_gap = top_1_conf - top_2_conf
        
        # Get symptoms
        top_1_matched = set(top_1.get("matched_symptoms", []))
        top_2_matched = set(top_2.get("matched_symptoms", []))
        top_2_disease_symptoms = set(top_2.get("disease_symptoms", []))
        
        # Find missing symptoms - symptoms that disease #2 expects but weren't in user input
        # AND that are in disease #1's profile
        top_2_unmatched = top_2_disease_symptoms - top_2_matched
        top_1_disease_symptoms = set(top_1.get("disease_symptoms", []))
        
        # Symptoms that would boost #2 scores (present in #2 disease but not reported by user)
        critical_missing = list(top_2_unmatched)[:5]
        
        # Calculate how much each missing symptom would help
        symptom_impact = []
        if critical_missing:
            # Estimate impact - each missing symptom typically adds 10-15% to score
            impact_per_symptom = min(confidence_gap / len(critical_missing) if critical_missing else 0, 0.15)
            
            for symptom in critical_missing:
                # Add more weight to symptoms that are also in top_1
                is_in_top_1 = symptom in top_1_disease_symptoms
                
                symptom_impact.append({
                    "symptom": symptom,
                    "estimated_impact": round(impact_per_symptom * 100, 1),
                    "also_in_top_choice": is_in_top_1,
                    "explanation": (
                        f"If you had reported {symptom}, it would strengthen the case for {top_2_name}"
                    )
                })
        
        # Generate natural language explanation
        if not critical_missing:
            counterfactual_text = (
                f"{top_2_name} scored lower ({top_2_conf*100:.1f}%) compared to {top_1_name} ({top_1_conf*100:.1f}%) "
                f"primarily because the scoring algorithms gave higher weight to semantic similarity and "
                f"pattern matching that favors {top_1_name}. Both diseases have similar symptom profiles, "
                f"but {top_1_name} has a closer match to your specific symptom description."
            )
        else:
            missing_list = ", ".join(critical_missing[:3])
            if len(critical_missing) > 3:
                missing_list += f", and {len(critical_missing)-3} others"
            
            gap_percentage = round(confidence_gap * 100, 1)
            
            counterfactual_text = (
                f"{top_2_name} received a lower score ({top_2_conf*100:.1f}%) than {top_1_name} ({top_1_conf*100:.1f}%) "
                f"by {gap_percentage}% because key symptoms are missing. Specifically, if you had reported: "
                f"{missing_list}, the confidence in {top_2_name} would increase significantly. "
                f"These symptoms are hallmark indicators of {top_2_name}, and their absence lowered its ranking."
            )
        
        # Additional context about differential diagnosis
        symptom_overlap = top_1_matched & top_2_matched
        unique_to_top_1 = top_1_matched - top_2_matched
        unique_to_top_2 = top_2_matched - top_1_matched
        
        analysis = {
            "available": True,
            "top_choice": {
                "name": top_1_name,
                "confidence": round(top_1_conf * 100, 1)
            },
            "alternative": {
                "name": top_2_name,
                "confidence": round(top_2_conf * 100, 1),
                "gap_from_top": round(confidence_gap * 100, 1)
            },
            "counterfactual_explanation": counterfactual_text,
            "critical_missing_symptoms": [
                {
                    "symptom": s["symptom"],
                    "impact_if_present": f"+{s['estimated_impact']}% confidence"
                }
                for s in symptom_impact[:3]
            ],
            "symptom_comparison": {
                "shared_with_top_choice": sorted(list(symptom_overlap)),
                "unique_to_top_choice": sorted(list(unique_to_top_1)),
                "unique_to_alternative": sorted(list(unique_to_top_2)),
                "symptom_overlap_percentage": round(
                    (len(symptom_overlap) / max(len(top_1_matched | top_2_matched), 1)) * 100, 1
                )
            },
            "differential_diagnosis_note": (
                f"Both {top_1_name} and {top_2_name} share several symptoms, but {top_1_name} "
                f"has {len(unique_to_top_1)} distinguishing symptoms that better match your report, "
                f"while {top_2_name} is missing {len(critical_missing)} key symptoms."
            )
        }
        
        return analysis
    
    @staticmethod
    def get_specialist_recommendation(disease_key: str) -> tuple:
        """
        Get specialist recommendation for a disease
        
        Args:
            disease_key: Disease identifier (key from knowledge base)
            
        Returns:
            Tuple of (specialist_name, recommendation_text)
        """
        disease_lower = disease_key.lower().replace(" ", "_")
        return XAIFormatter.DISEASE_SPECIALIST_MAP.get(
            disease_lower,
            ("General Practitioner", "Consult with your primary care physician")
        )
    
    @staticmethod
    def get_all_specialist_mappings() -> Dict[str, Dict[str, str]]:
        """
        Get all disease-to-specialist mappings
        
        Returns:
            Dictionary mapping disease keys to specialist info
        """
        return {
            disease_key: {
                "specialist": specialist,
                "reason": reason
            }
            for disease_key, (specialist, reason) in XAIFormatter.DISEASE_SPECIALIST_MAP.items()
        }
    
    @staticmethod
    def check_differential_diagnosis(top_diseases: List[Dict], threshold: float = 0.05) -> Dict:
        """
        Check if top diseases have similar scores within threshold (5% by default).
        Returns differential diagnosis information explaining what distinguishes them.
        
        Args:
            top_diseases: List of top disease predictions
            threshold: Score difference threshold (0.05 = 5%)
            
        Returns:
            Dict with differential diagnosis analysis or empty if clear winner
        """
        if len(top_diseases) < 2:
            return {"is_differential": False}
        
        top_1 = top_diseases[0]
        top_2 = top_diseases[1]
        
        score_1 = top_1.get("confidence_score", 0)
        score_2 = top_2.get("confidence_score", 0)
        score_diff = score_1 - score_2
        
        # Check if scores are too close (differential diagnosis territory)
        if score_diff <= threshold:
            name_1 = top_1.get("disease_name", "Disease 1")
            name_2 = top_2.get("disease_name", "Disease 2")
            
            matched_1 = set(top_1.get("matched_symptoms", []))
            matched_2 = set(top_2.get("matched_symptoms", []))
            
            disease_symptoms_1 = set(top_1.get("disease_symptoms", []))
            disease_symptoms_2 = set(top_2.get("disease_symptoms", []))
            
            # Find distinguishing symptoms
            unique_to_1 = disease_symptoms_1 - disease_symptoms_2
            unique_to_2 = disease_symptoms_2 - disease_symptoms_1
            
            # Find unmatched symptoms that would help distinguish
            unmatched_1 = disease_symptoms_1 - matched_1
            unmatched_2 = disease_symptoms_2 - matched_2
            
            distinguishing_symptoms_1 = (unique_to_1 & unmatched_1) or (unique_to_1)
            distinguishing_symptoms_2 = (unique_to_2 & unmatched_2) or (unique_to_2)
            
            distinguishing_1 = list(distinguishing_symptoms_1)[:2]
            distinguishing_2 = list(distinguishing_symptoms_2)[:2]
            
            shared_symptoms = sorted(list(matched_1 & matched_2))
            
            explanation = (
                f"While {name_1} is listed first ({score_1*100:.1f}%), {name_2} has an equal or very similar score "
                f"({score_2*100:.1f}%) because of shared symptoms: {', '.join(shared_symptoms[:3]) if shared_symptoms else 'similar presentation'}. "
            )
            
            clarification_needed = []
            if distinguishing_1:
                explanation += (
                    f"The presence of {', '.join(distinguishing_1)} would clearly point to {name_1}. "
                )
                clarification_needed.extend(distinguishing_1)
            
            if distinguishing_2:
                explanation += (
                    f"Conversely, {', '.join(distinguishing_2)} would indicate {name_2}."
                )
                clarification_needed.extend(distinguishing_2)
            
            return {
                "is_differential": True,
                "diseases_compared": [name_1, name_2],
                "score_1": round(score_1 * 100, 1),
                "score_2": round(score_2 * 100, 1),
                "score_difference": round(score_diff * 100, 1),
                "shared_symptoms": shared_symptoms,
                "distinguishing_for_top": distinguishing_1,
                "distinguishing_for_alternative": distinguishing_2,
                "clarification_explanation": explanation,
                "clarification_symptoms": list(set(clarification_needed))[:4]
            }
        
        return {"is_differential": False}
    
    @staticmethod
    def generate_confidence_questions(top_diseases: List[Dict], 
                                     confidence_threshold: float = 0.50) -> Dict:
        """
        Generate generic patient information form for all diagnoses.
        Collects lifestyle and medical history data regardless of confidence level.
        
        Args:
            top_diseases: List of disease predictions
            confidence_threshold: Minimum acceptable confidence (default 50%)
            
        Returns:
            Dict with patient information form fields
        """
        if not top_diseases:
            return {"needs_clarification": False}
        
        top_disease = top_diseases[0]
        top_confidence = top_disease.get("confidence_score", 0)
        
        disease_name = top_disease.get("disease_name", "this condition")
        
        # Get alternative diagnoses
        alternatives = []
        if len(top_diseases) > 1:
            for alt_disease in top_diseases[1:3]:
                alt_name = alt_disease.get("disease_name", "Unknown")
                alt_conf = alt_disease.get("confidence_score", 0)
                alternatives.append({
                    "name": alt_name,
                    "confidence": round(alt_conf * 100, 1)
                })
        
        # Generic patient information questions - always shown regardless of confidence
        patient_info_fields = [
            {
                "type": "text_input",
                "field_name": "last_meal_time",
                "question": "When did you last eat food? (e.g., 2 hours ago, morning)",
                "required": False
            },
            {
                "type": "text_input",
                "field_name": "last_meal_type",
                "question": "What did you eat? (e.g., rice, bread, fruits)",
                "required": False
            },
            {
                "type": "text_input",
                "field_name": "water_intake",
                "question": "Are you having proper water intake? (Yes/No/How much per day)",
                "required": False
            },
            {
                "type": "text_input",
                "field_name": "age",
                "question": "What is your age? (in years)",
                "required": False
            },
            {
                "type": "text_input",
                "field_name": "weight",
                "question": "What is your weight? (in kg - optional if you don't know)",
                "required": False
            },
            {
                "type": "text_input",
                "field_name": "past_conditions",
                "question": "Do you have any past medical conditions? (e.g., diabetes, asthma, hypertension)",
                "required": False
            },
            {
                "type": "text_input",
                "field_name": "allergies",
                "question": "Do you have any allergies? (e.g., peanuts, penicillin, shellfish)",
                "required": False
            }
        ]
        
        # ALWAYS return needs_clarification=True to collect patient information
        analysis = {
            "needs_clarification": True,
            "is_high_confidence": top_confidence >= confidence_threshold,
            "confidence_score": round(top_confidence * 100, 1),
            "threshold": round(confidence_threshold * 100, 1),
            "reason": "Collect patient information for comprehensive report",
            "primary_candidate": {
                "disease": disease_name,
                "confidence": round(top_confidence * 100, 1)
            },
            "alternatives": alternatives,
            "clarifying_questions": patient_info_fields,  # Now contains patient info fields
            "next_step": "Please provide the following information for your health report"
        }
        
        return analysis
    
    @staticmethod
    def format_diagnosis_with_confidence_check(top_diseases: List[Dict],
                                              differential_threshold: float = 0.05,
                                              confidence_threshold: float = 0.50) -> Dict:
        """
        Format diagnosis with both differential diagnosis and confidence checks.
        
        Args:
            top_diseases: List of disease predictions
            differential_threshold: Score difference for differential diagnosis
            confidence_threshold: Minimum confidence level
            
        Returns:
            Comprehensive diagnosis with all checks
        """
        if not top_diseases:
            return {"error": "No predictions available"}
        
        result = {
            "primary_diagnosis": top_diseases[0].get("disease_name", "Unknown"),
            "confidence": round(top_diseases[0].get("confidence_score", 0) * 100, 1),
        }
        
        # Check differential diagnosis
        differential = XAIFormatter.check_differential_diagnosis(top_diseases, differential_threshold)
        if differential.get("is_differential"):
            result["differential_diagnosis"] = differential
        
        # Check confidence threshold
        confidence_check = XAIFormatter.generate_confidence_questions(top_diseases, confidence_threshold)
        if confidence_check.get("needs_clarification"):
            result["confidence_check"] = confidence_check
            result["analysis_type"] = "clarification_needed"
        else:
            result["analysis_type"] = "standard"
        
        return result

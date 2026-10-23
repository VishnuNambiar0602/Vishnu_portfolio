from flask import Flask, request, jsonify
from flask_cors import CORS
from model import initialize_model
from xai_formatter import XAIFormatter
import logging
import os

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize model on startup
try:
    model = initialize_model()
    logger.info("Medical XAI model initialized successfully")
except Exception as e:
    logger.error(f"Error initializing model: {e}")
    model = None


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "model_loaded": model is not None
    }), 200


@app.route('/diagnose', methods=['POST'])
def diagnose():
    """
    Diagnose possible diseases based on symptoms
    Expected JSON: {"symptoms": "symptom1, symptom2, ...", "days": 3}
    Returns detailed XAI formatted explanation with differential diagnosis and confidence checks
    """
    if model is None:
        return jsonify({"error": "Model not initialized"}), 500
    
    try:
        data = request.get_json()
        symptoms = data.get('symptoms', '').strip()
        days = data.get('days', 3)  # Default to 3 days if not provided
        
        if not symptoms:
            return jsonify({"error": "Please provide symptoms"}), 400
        
        # Get diagnosis
        result = model.diagnose(symptoms)
        
        if result.get("error"):
            return jsonify(result), 400
        
        possible_diseases = result.get("possible_diseases", [])
        
        # Validate duration against diagnosed diseases
        possible_diseases = XAIFormatter.validate_disease_duration(
            possible_diseases,
            days,
            model.knowledge_base
        )
        
        # Run confidence checks
        confidence_check = XAIFormatter.generate_confidence_questions(
            possible_diseases, 
            confidence_threshold=0.50
        )
        
        # Run differential diagnosis check
        differential_diagnosis = XAIFormatter.check_differential_diagnosis(
            possible_diseases,
            threshold=0.05
        )
        
        # Format response with XAI explanations
        response = {
            "input_symptoms": result.get("input_symptoms", []),
            "total_matches": result.get("total_matched", 0),
            "days": days,
            "analysis_type": "standard" if not confidence_check.get("needs_clarification") else "clarification_needed",
            "diseases": []
        }
        
        for disease in possible_diseases:
            # Format complete diagnosis with XAI
            formatted_diagnosis = XAIFormatter.format_complete_diagnosis(disease)
            
            disease_obj = {
                "name": disease.get("disease_name"),
                "disease_id": disease.get("disease_id"),
                "confidence": round(disease.get("confidence_score", 0) * 100, 1),
                "confidence_level": formatted_diagnosis.get("confidence_level"),
                "explanation": disease.get("explanation"),
                "matched_symptoms": disease.get("matched_symptoms", []),
                "all_symptoms": disease.get("all_symptoms", []),
                
                # XAI Data
                "xai": {
                    "scoring_breakdown": disease.get("scoring_breakdown", {}),
                    "explanation": formatted_diagnosis.get("xai_explanation", {}),
                    "symptom_analysis": formatted_diagnosis.get("symptom_analysis", {}),
                    "feature_importance": formatted_diagnosis.get("feature_importance", []),
                }
            }
            
            # Add duration validation warning if present
            if "duration_validation" in disease:
                duration_val = disease.get("duration_validation", {})
                disease_obj["duration_warning"] = duration_val.get("warning")
                disease_obj["xai"]["duration_impact"] = {
                    "symptom_days": duration_val.get("symptom_days"),
                    "typical_duration_max": duration_val.get("typical_duration_max"),
                    "penalty_applied": duration_val.get("penalty_applied")
                }
            
            response["diseases"].append(disease_obj)
        
        # Add differential diagnosis if applicable
        if differential_diagnosis.get("is_differential"):
            response["differential_diagnosis"] = {
                "is_differential": True,
                "diseases_compared": differential_diagnosis.get("diseases_compared"),
                "score_1": differential_diagnosis.get("score_1"),
                "score_2": differential_diagnosis.get("score_2"),
                "score_difference": differential_diagnosis.get("score_difference"),
                "explanation": differential_diagnosis.get("clarification_explanation"),
                "shared_symptoms": differential_diagnosis.get("shared_symptoms"),
                "distinguishing_for_top": differential_diagnosis.get("distinguishing_for_top"),
                "distinguishing_for_alternative": differential_diagnosis.get("distinguishing_for_alternative"),
                "clarification_symptoms": differential_diagnosis.get("clarification_symptoms")
            }
        else:
            response["differential_diagnosis"] = {"is_differential": False}
        
        # Add confidence check with clarifying questions if needed
        if confidence_check.get("needs_clarification"):
            response["confidence_check"] = {
                "needs_clarification": True,
                "reason": confidence_check.get("reason"),
                "primary_candidate": confidence_check.get("primary_candidate"),
                "alternatives": confidence_check.get("alternatives"),
                "clarifying_questions": confidence_check.get("clarifying_questions"),
                "next_step": confidence_check.get("next_step")
            }
        else:
            response["confidence_check"] = {
                "needs_clarification": False,
                "confidence": confidence_check.get("confidence"),
                "message": f"Diagnosis confidence is above the {50}% threshold"
            }
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error in diagnose endpoint: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/recommend', methods=['POST'])
def get_recommendation():
    """
    Get recommendation based on symptoms
    Expected JSON: {"symptoms": "symptom1, symptom2, ..."}
    """
    if model is None:
        return jsonify({"error": "Model not initialized"}), 500
    
    try:
        data = request.get_json()
        symptoms = data.get('symptoms', '').strip()
        
        if not symptoms:
            return jsonify({"error": "Please provide symptoms"}), 400
        
        recommendation = model.get_recommendation(symptoms)
        return jsonify(recommendation), 200
        
    except Exception as e:
        logger.error(f"Error in recommend endpoint: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/xai/diagnosis/<disease_id>', methods=['GET'])
def xai_explain_diagnosis(disease_id):
    """
    Get detailed XAI explanation for a specific diagnosis
    Includes scoring breakdown, feature importance, and comparative analysis
    """
    if model is None:
        return jsonify({"error": "Model not initialized"}), 500
    
    try:
        explanation = model.explain_diagnosis(disease_id)
        
        if explanation.get("error"):
            return jsonify(explanation), 404
        
        return jsonify(explanation), 200
        
    except Exception as e:
        logger.error(f"Error in xai explain endpoint: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/xai/compare', methods=['POST'])
def xai_compare_diagnoses():
    """
    Get detailed comparison between multiple diagnosis results
    Shows why one disease is more likely than another
    Expected JSON: {"disease_ids": ["id1", "id2", ...]}
    """
    if model is None:
        return jsonify({"error": "Model not initialized"}), 500
    
    try:
        data = request.get_json()
        symptoms = data.get('symptoms', '').strip()
        
        if not symptoms:
            return jsonify({"error": "Please provide symptoms"}), 400
        
        result = model.diagnose(symptoms)
        
        if result.get("error") or not result.get("possible_diseases"):
            return jsonify({"error": "No diseases found to compare"}), 400
        
        # Format comparative analysis
        top_diseases = result.get("possible_diseases", [])[:5]
        comparison = XAIFormatter.format_comparative_analysis(top_diseases)
        
        # Add detailed scoring comparison
        comparison["detailed_scores"] = []
        for i, disease in enumerate(top_diseases):
            comparison["detailed_scores"].append({
                "rank": i + 1,
                "disease": disease.get("disease_name"),
                "confidence": round(disease.get("confidence_score", 0) * 100, 1),
                "main_reason": XAIFormatter._generate_main_reason(disease),
                "scoring_breakdown": disease.get("scoring_breakdown", {})
            })
        
        return jsonify(comparison), 200
        
    except Exception as e:
        logger.error(f"Error in xai compare endpoint: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/explain/<disease_id>', methods=['GET'])
def explain_disease(disease_id):
    """
    Get detailed explanation for a disease
    """
    if model is None:
        return jsonify({"error": "Model not initialized"}), 500
    
    try:
        explanation = model.explain_diagnosis(disease_id)
        
        if explanation.get("error"):
            return jsonify(explanation), 404
        
        return jsonify(explanation), 200
        
    except Exception as e:
        logger.error(f"Error in explain endpoint: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/symptoms', methods=['GET'])
def get_all_symptoms():
    """Get list of all recognized symptoms"""
    if model is None:
        return jsonify({"error": "Model not initialized"}), 500
    
    try:
        symptom_keywords = model.knowledge_base.get("symptom_keywords", {})
        symptoms = list(symptom_keywords.keys())
        return jsonify({
            "total_symptoms": len(symptoms),
            "symptoms": sorted(symptoms)
        }), 200
    except Exception as e:
        logger.error(f"Error in symptoms endpoint: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/diseases', methods=['GET'])
def get_all_diseases():
    """Get list of all diseases in knowledge base"""
    if model is None:
        return jsonify({"error": "Model not initialized"}), 500
    
    try:
        diseases = model.knowledge_base.get("diseases", {})
        disease_list = [
            {
                "id": disease_id,
                "name": disease_info.get("name", disease_id),
                "symptom_count": len(disease_info.get("symptoms", []))
            }
            for disease_id, disease_info in diseases.items()
        ]
        return jsonify({
            "total_diseases": len(disease_list),
            "diseases": sorted(disease_list, key=lambda x: x["name"])
        }), 200
    except Exception as e:
        logger.error(f"Error in diseases endpoint: {e}")
        return jsonify({"error": str(e)}), 500


@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)

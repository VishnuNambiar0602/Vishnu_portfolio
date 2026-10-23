"""Export the Medical XAI model (knowledge base + fitted TF-IDF) and reference outputs
so the browser port in js/medical.js can be checked against the Python original."""
import json, random, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECTS = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / "backend"
BACKEND = PROJECTS / "medical-xai/Medical-XAI/backend"
sys.path.insert(0, str(BACKEND))
from model import initialize_model  # noqa: E402

m = initialize_model()
kb = m.knowledge_base
vec = m.vectorizer
vocab = {t: int(i) for t, i in vec.vocabulary_.items()}
out = {
    "diseases": kb["diseases"],
    "symptom_keywords": kb["symptom_keywords"],
    "vocab": vocab,
    "idf": [float(x) for x in vec.idf_],
}
(ROOT / "data/medical_model.json").write_text(json.dumps(out, separators=(",", ":")))

rng = random.Random(11)
all_syms = sorted({s for d in kb["diseases"].values() for s in d["symptoms"]})
cases = ["fever, cough, sore throat, fatigue", "I have a headache and feel tired", "Nausea,  VOMITING", "xyz123", "chest pain, shortness of breath"]
for _ in range(60):
    cases.append(", ".join(rng.sample(all_syms, rng.randint(1, 6))))
ref = []
for c in cases:
    r = m.diagnose(c)
    ref.append({"input": c, "symptoms": r.get("input_symptoms"),
                "top": [(d["disease_id"], d["confidence_score"], d["matched_symptoms"]) for d in r.get("possible_diseases", [])]})
(ROOT / "data/medical_reference.json").write_text(json.dumps(ref))
print(len(vocab), "terms;", len(ref), "reference cases")

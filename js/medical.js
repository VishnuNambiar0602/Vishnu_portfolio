// Browser port of projects/medical-xai/Medical-XAI/backend/model.py (MedicalXAIModel.diagnose).
// Same scoring: 0.6 * (TF-IDF cosine + 0.3 * exact-match bonus, capped at 1) + 0.4 * symptom overlap.
// scripts/check_medical_parity.mjs compares this file with the Python output.

export class MedicalModel {
  constructor(data) {
    this.diseases = data.diseases;
    this.keywords = data.symptom_keywords;
    this.vocab = data.vocab;
    this.idf = data.idf;
  }

  // Mirrors sklearn TfidfVectorizer(lowercase=True, stop_words="english") after fit:
  // stop words are already absent from the vocabulary, so unknown tokens are simply dropped.
  vectorize(text) {
    const counts = new Map();
    for (const tok of text.toLowerCase().match(/\b\w\w+\b/g) || []) {
      const i = this.vocab[tok];
      if (i !== undefined) counts.set(i, (counts.get(i) || 0) + 1);
    }
    let norm = 0;
    const vec = new Map();
    for (const [i, c] of counts) {
      const w = c * this.idf[i];
      vec.set(i, w);
      norm += w * w;
    }
    norm = Math.sqrt(norm);
    if (norm > 0) for (const [i, w] of vec) vec.set(i, w / norm);
    return vec;
  }

  static cosine(a, b) {
    let s = 0;
    for (const [i, w] of a) if (b.has(i)) s += w * b.get(i);
    return s;
  }

  preprocess(input) {
    const out = [];
    for (let raw of input.toLowerCase().split(",")) {
      raw = raw.trim();
      if (!raw) continue;
      let matched = false;
      for (const [key, kws] of Object.entries(this.keywords)) {
        if (kws.some((kw) => raw.includes(kw))) {
          if (!out.includes(key)) out.push(key);
          matched = true;
          break;
        }
      }
      if (!matched) out.push(raw);
    }
    return out;
  }

  diagnose(input) {
    const symptoms = this.preprocess(input);
    if (!symptoms.length) return { error: "No valid symptoms provided", possible_diseases: [] };

    const lower = input.toLowerCase();
    const inputVec = this.vectorize(lower);
    const results = [];

    for (const [id, info] of Object.entries(this.diseases)) {
      const ds = info.symptoms;
      const tfidf = MedicalModel.cosine(inputVec, this.vectorize(ds.join(" ")));
      const exact = ds.filter((s) => lower.includes(s.toLowerCase())).length;
      const bonus = ds.length ? (exact / ds.length) * 0.3 : 0;
      const similarity = Math.min(1, tfidf + bonus);

      const matched = symptoms.filter((s) => ds.includes(s));
      const unmatched = ds.filter((s) => !symptoms.includes(s));
      const ratio = ds.length ? matched.length / ds.length : 0;

      const tfidfPart = similarity * 0.6;
      const matchPart = ratio * 0.4;
      const score = tfidfPart + matchPart;
      if (score > 0.1) {
        results.push({
          disease_id: id,
          disease_name: info.name || id,
          confidence_score: score,
          matched_symptoms: matched,
          unmatched_symptoms: unmatched,
          explanation: info.explanation || "",
          specialists: info.specialists || [],
          icd10_code: info.icd10_code || null,
          breakdown: { tfidf, bonus, similarity, tfidfPart, ratio, matchPart },
        });
      }
    }
    results.sort((a, b) => b.confidence_score - a.confidence_score);
    return { input_symptoms: symptoms, possible_diseases: results.slice(0, 5) };
  }
}

// Verifies js/medical.js reproduces the Python model on the cases exported by export_medical.py.
import { readFileSync } from "node:fs";
import { MedicalModel } from "../js/medical.js";

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const model = new MedicalModel(read("../data/medical_model.json"));
const ref = read("../data/medical_reference.json");

let bad = 0;
for (const c of ref) {
  const got = model.diagnose(c.input).possible_diseases || [];
  const ok =
    got.length === c.top.length &&
    got.every((g, i) => g.disease_id === c.top[i][0] && Math.abs(g.confidence_score - c.top[i][1]) < 1e-9 &&
      JSON.stringify(g.matched_symptoms) === JSON.stringify(c.top[i][2]));
  if (!ok) { bad++; console.log("MISMATCH", c.input); }
}
console.log(`${ref.length - bad}/${ref.length} cases identical to Python`);
process.exit(bad ? 1 : 0);

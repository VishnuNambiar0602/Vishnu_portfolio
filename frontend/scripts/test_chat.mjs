// Checks that visitor questions retrieve the right fact, and that unknown questions are declined.
import { readFileSync } from "node:fs";
import { buildIndex, reply } from "../js/chat/brain.js";

const faq = JSON.parse(readFileSync(new URL("../data/faq.json", import.meta.url)));
const index = buildIndex(faq);
const id = (q) => { const r = reply(index, q); return r.hits[0]?.f.id ?? (r.text.startsWith("Hi.") ? "greeting" : "none"); };

const cases = [
  ["What's his tech stack?", "skills"], ["Does he know PyTorch?", "skills"], ["which programming languages", "skills"],
  ["Tell me about the medical project", "medical"], ["how accurate is the symptom checker", "medical"],
  ["what is the harness", "harness"], ["explain the transformer you built", "tinylm"], ["has he trained a language model from scratch", "tinylm"], ["do the agents loop forever", "harness"],
  ["explain the MLOps agent", "mlops"], ["can it deploy with docker", "mlops"],
  ["restaurant sales forecasting", "forecast"], ["what is MAPE for SARIMA", "forecast"],
  ["what is Prahar", "none"], ["government schemes assistant", "none"],
  ["where has he worked", "experience"], ["any internships done?", "experience"],
  ["did he lead a team", "leadership"], ["how many interns did he manage", "leadership"],
  ["what is his CGPA", "education"], ["which university", "education"],
  ["any certifications", "certs"], ["how can I contact him", "contact"], ["what's his email", "contact"],
  ["is he available for hire", "hire"], ["is he looking for internships", "hire"],
  ["where can I download the resume", "resume"], ["where is he based", "location"],
  ["what languages does he speak", "languages"], ["are the numbers verified", "approach"],
  ["hello", "greeting"],
  ["what's the capital of France", "none"], ["what is his salary expectation", "none"], ["favourite football team?", "none"],
];
let bad = 0;
for (const [q, want] of cases) { const got = id(q); if (got !== want) { bad++; console.log(`MISS  "${q}" -> ${got} (want ${want})`); } }
console.log(`${cases.length - bad}/${cases.length} retrieval cases correct`);

console.log(bad ? "FAILED" : "all ok");
process.exit(bad ? 1 : 0);

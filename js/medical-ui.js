import { el, clear, loadJSON } from "./dom.js";
import { MedicalModel } from "./medical.js";

const COMMON = ["fever", "cough", "headache", "fatigue", "sore throat", "nausea", "vomiting", "chest pain",
  "shortness of breath", "runny nose", "dizziness", "itching"];
const EXAMPLES = [
  ["Flu-like", "fever, cough, sore throat, fatigue, chills"],
  ["Migraine-like", "severe headache, nausea, sensitivity to light"],
  ["Allergy-like", "sneezing, itchy eyes, runny nose"],
  ["Vague", "fatigue, headache"],
];
const CONFIDENCE_THRESHOLD = 50; // the full app asks clarifying questions below this

const pct = (x) => (x * 100).toFixed(1);

export async function mount() {
  const [data, bench] = await Promise.all([loadJSON("data/medical_model.json"), loadJSON("data/medical_benchmark.json")]);
  const model = new MedicalModel(data);
  const input = document.getElementById("med-input");
  const chips = document.getElementById("med-chips");
  const out = document.getElementById("med-results");

  const current = () => new Set(model.preprocess(input.value));

  function renderChips() {
    const active = current();
    clear(chips);
    for (const s of COMMON) {
      chips.append(el("li", {}, el("button", {
        class: "chip", type: "button", "aria-pressed": String(active.has(s)), text: s,
        onclick: () => toggle(s),
      })));
    }
  }

  function toggle(symptom) {
    const parts = input.value.split(",").map((p) => p.trim()).filter(Boolean);
    const key = model.preprocess(symptom)[0];
    const kept = parts.filter((p) => model.preprocess(p)[0] !== key);
    if (kept.length === parts.length) kept.push(symptom);
    input.value = kept.join(", ");
    run();
  }

  function breakdownTable(r) {
    const b = r.breakdown;
    const rows = [
      ["Text similarity", `${b.similarity.toFixed(2)} x 0.6`, (b.tfidfPart).toFixed(3)],
      ["Symptom overlap", `${r.matched_symptoms.length} of ${r.matched_symptoms.length + r.unmatched_symptoms.length} x 0.4`, b.matchPart.toFixed(3)],
    ];
    return el("table", {},
      el("thead", {}, el("tr", {}, el("th", { text: "Part" }), el("th", { text: "Calculation" }), el("th", { class: "num", text: "Score" }))),
      el("tbody", {}, rows.map(([a, b2, c]) => el("tr", {}, el("td", { text: a }), el("td", { class: "mono", text: b2 }), el("td", { class: "num", text: c })))),
      el("tfoot", {}, el("tr", {}, el("th", { text: "Total" }), el("td"), el("th", { class: "num", text: r.confidence_score.toFixed(3) }))));
  }

  function run() {
    renderChips();
    clear(out);
    const res = model.diagnose(input.value);
    const list = res.possible_diseases || [];
    if (!list.length) {
      out.append(el("li", { class: "result" }, input.value.trim()
        ? "No condition scored above the 10% floor. Try common terms such as fever, cough or headache."
        : "Enter at least one symptom."));
      return;
    }
    list.slice(0, 3).forEach((r, i) => {
      const score = r.confidence_score * 100;
      const next = list[i + 1];
      const why = next
        ? `${r.disease_name} leads ${next.disease_name} by ${(score - next.confidence_score * 100).toFixed(1)} points (${r.matched_symptoms.length} matched symptoms against ${next.matched_symptoms.length}).`
        : "";
      out.append(el("li", { class: "result" },
        el("div", { class: "result-top" },
          el("span", { class: "result-name", text: `${i + 1}. ${r.disease_name}${r.icd10_code ? ` (${r.icd10_code})` : ""}` }),
          el("span", { class: "result-score", text: `${pct(r.confidence_score)}%` }),
          el("div", { class: "bar", role: "presentation" }, el("span", { style: `width:${Math.min(100, score)}%` }))),
        el("details", i === 0 ? { open: true } : {},
          el("summary", { text: "How this score was built" }),
          el("div", { style: "margin-top:12px" },
            breakdownTable(r),
            el("p", { style: "margin:12px 0 4px" }, "Reported and matching:"),
            el("div", {}, r.matched_symptoms.length ? r.matched_symptoms.map((s) => el("span", { class: "tag hit", text: s })) : el("span", { class: "muted", text: "none" })),
            el("p", { style: "margin:8px 0 4px" }, "Expected for this condition, not reported:"),
            el("div", {}, r.unmatched_symptoms.map((s) => el("span", { class: "tag miss", text: s }))),
            why && el("p", { style: "margin:12px 0 0", text: why }),
            r.specialists.length ? el("p", { class: "muted", style: "margin:8px 0 0", text: `Specialists: ${r.specialists.join(", ")}` }) : null))));
    });
    if (list[0].confidence_score * 100 < CONFIDENCE_THRESHOLD) {
      out.append(el("li", { class: "result muted", text: "Top score is under 50%. The full app would ask clarifying questions here. Add more symptoms to narrow it down." }));
    }
  }

  const examples = document.getElementById("med-examples");
  EXAMPLES.forEach(([label, text]) => examples.append(el("button", { class: "chip", type: "button", text: label, onclick: () => { input.value = text; run(); } })));

  input.addEventListener("input", run);
  run();
  renderBench(bench);
}

function renderBench(bench) {
  const label = (r) => {
    const base = `${r.symptoms} symptoms${r.synonyms ? " as synonyms" : ""}`;
    return r.distractors ? `${base}, plus ${r.distractors} unrelated` : base;
  };
  const t = document.getElementById("med-bench");
  clear(t).append(
    el("thead", {}, el("tr", {}, el("th", { text: "Simulated case" }), el("th", { class: "num", text: "Cases" }), el("th", { class: "num", text: "Top 1" }), el("th", { class: "num", text: "Top 3" }))),
    el("tbody", {}, bench.rows.map((r) => el("tr", {}, el("td", { text: label(r) }), el("td", { class: "num", text: r.cases.toLocaleString("en") }), el("td", { class: "num", text: `${r.top1_pct.toFixed(1)}%` }), el("td", { class: "num", text: `${r.top3_pct.toFixed(1)}%` })))));
}

// Machine-readable view: the whole site as structured plain text, shown in the page and downloadable as .txt.
// The prose comes from the page itself (so it never drifts from what visitors read); the numbers behind
// each demo come from the same data files the demos use, because the demos only load when opened.
import { loadJSON } from "./dom.js";

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "SVG", "CANVAS", "INPUT", "SELECT", "TEXTAREA", "BUTTON", "OPTION", "OUTPUT", "NAV", "LABEL", "FIELDSET", "FORM"]);
const SKIP_CLASS = ["examples", "chips", "ctrl", "scenarios", "pipeline", "budgets", "log", "tl-controls", "tl-grid", "gen", "deps", "files", "fc", "tablist", "actions", "table-wrap", "chart-scroll", "legend", "readout"];
const squash = (s) => s.replace(/\s+/g, " ").trim();
const hasClass = (el, names) => names.some((n) => el.classList.contains(n));

function inline(el) {
  let out = "";
  for (const n of el.childNodes) {
    if (n.nodeType === 3) { out += n.textContent; continue; }
    if (n.nodeType !== 1 || SKIP_TAGS.has(n.tagName.toUpperCase()) && n.tagName !== "BUTTON") continue;
    if (n.tagName === "BR") { out += " "; continue; }
    const t = inline(n);
    if (n.tagName === "CODE") out += "`" + squash(t) + "`";
    else if (n.tagName === "A") {
      const href = n.getAttribute("href") || "";
      out += /^(https?:|mailto:)/.test(href) && squash(t) !== href.replace(/^mailto:/, "") ? `${t} (${href.replace(/^mailto:/, "")})` : t;
    } else if (["B", "SPAN", "DT", "DD", "H4"].includes(n.tagName)) out += ` ${t} `;
    else out += t;
  }
  return squash(out);
}

const BLOCK = new Set(["DIV", "P", "UL", "OL", "DL", "H1", "H2", "H3", "H4", "H5", "TABLE", "SECTION", "ARTICLE", "ASIDE", "HEADER", "FOOTER", "PRE"]);
const hasBlockChild = (el) => [...el.children].some((c) => BLOCK.has(c.tagName));

function list(el, lines) {
  const ordered = el.tagName === "OL";
  [...el.children].forEach((li, i) => {
    if (li.tagName !== "LI") return;
    const mark = ordered ? `${i + 1}.` : "-";
    if (!hasBlockChild(li)) { lines.push(`${mark} ${inline(li)}`); return; }
    const sub = [];
    blocks(li, sub, true); // headings inside a list item are plain lines, not document headings
    const body = sub.filter((l) => l !== "");
    body.forEach((l, k) => lines.push(k === 0 ? `${mark} ${l}` : `   ${l}`));
  });
}

function blocks(root, lines, plain = false) {
  for (const el of root.children) {
    const tag = el.tagName;
    if (SKIP_TAGS.has(tag) || hasClass(el, SKIP_CLASS) || el.id === "chat-panel") continue;
    if (/^H[1-5]$/.test(tag)) {
      const text = inline(el);
      if (!text) continue;
      if (plain) lines.push(text); else lines.push("", `${"#".repeat(Number(tag[1]))} ${text}`);
    } else if (tag === "P") {
      const t = el.classList.contains("meta") ? [...el.children].map(inline).join(" | ") : inline(el);
      if (t) lines.push(t);
    } else if (tag === "UL" || tag === "OL") {
      if (el.classList.contains("tags")) lines.push([...el.children].map(inline).join(", "));
      else {
        if (el.classList.contains("try")) lines.push("Try it:");
        list(el, lines);
      }
    } else if (tag === "DL") {
      for (const d of el.children) { const t = inline(d); if (t) lines.push(`${[...d.children].map(inline).join(": ")}`.replace(/: $/, "")); }
    } else if (tag === "TABLE") {
      const rows = [...el.querySelectorAll("tr")].map((r) => [...r.children].map((c) => squash(c.textContent)).join(" | ")).filter(Boolean);
      if (rows.length) lines.push(...rows);
    } else if (hasClass(el, ["demo"])) {
      for (const c of el.children) {
        if (c.tagName === "H4" || hasClass(c, ["callout"])) blocks({ children: [c] }, lines, plain);
      }
    } else if (hasBlockChild(el)) {
      blocks(el, lines, plain);
    } else {
      const t = inline(el); if (t) lines.push(t); // a text-only container, e.g. a date cell
    }
  }
}

function pageText() {
  const main = document.querySelector("main");
  const lines = [];
  blocks(main, lines);
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function table(rows) { return rows.map((r) => r.join(" | ")).join("\n"); }

async function dataText() {
  const [profile, faq, bench, fc, harness, mlops, tiny] = await Promise.all(
    ["profile", "faq", "medical_benchmark", "forecast", "harness_traces", "mlops_scaffold", "tinylm"].map((n) => loadJSON(`data/${n}.json`)));
  const out = [];
  const h = (t) => out.push("", `## ${t}`, "");

  h("DATA: Medical XAI benchmark (simulated cases drawn from the knowledge base; consistency, not clinical accuracy)");
  out.push(table([["symptoms", "unrelated added", "as synonyms", "cases", "top-1 %", "top-3 %", "p50 ms", "p95 ms"],
    ...bench.rows.map((r) => [r.symptoms, r.distractors, r.synonyms ? "yes" : "no", r.cases, r.top1_pct, r.top3_pct, r.latency_p50_ms, r.latency_p95_ms])]));

  h("DATA: Restaurant forecasting (synthetic data, seed 42; time-ordered holdout)");
  const rf = fc.revenue_forecast, ff = fc.footfall, m = (x) => [x.rmse.toFixed(1), x.mae.toFixed(1), `${x.mape_pct.toFixed(1)}%`];
  out.push(table([["task", "model", "RMSE", "MAE", "MAPE"],
    [`revenue, last ${rf.holdout_days} days`, "same as last week", ...m(rf.seasonal_naive)], ["", "SARIMA(1,1,1)(1,1,1,7)", ...m(rf.sarima)],
    [`footfall, last ${ff.test_days} days`, "same day last week", ...m(ff.baseline_last_week)], ["", "random forest", ...m(ff.random_forest)], ["", "gradient boosting", ...m(ff.gradient_boosting)]]));

  h("DATA: Engineering harness run traces (real orchestrator runs with scripted model replies)");
  out.push(`limits: ${JSON.stringify(harness.limits)}`);
  for (const s of harness.scenarios) out.push(`- ${s.title}: final status ${s.final}${s.reason ? ` (${s.reason})` : ""}; steps: ${s.trace.map((e) => e.node).join(" > ")}`);

  h("DATA: MLOps agent, files generated from sample_model.py");
  out.push(...mlops.files.map((f) => `- ${f.path} (${f.content.split("\n").length} lines)`));

  h("DATA: Tiny LM (trained for this site)");
  const s = tiny.stats;
  out.push(`parameters: ${s.parameters.toLocaleString("en")}`, `architecture: ${s.n_layers} layers, ${s.n_heads} heads, d_model ${s.d_model}, d_ff ${s.d_ff}, context ${s.max_seq_len}, vocabulary ${s.vocab_size} characters`,
    `training: ${s.steps} steps, batch ${s.batch_size}, ${s.train_seconds} s, corpus ${s.corpus_chars.toLocaleString("en")} characters of this repository's source`,
    `loss: train ${s.train_loss}, held-out ${s.val_loss} (perplexity ${s.val_perplexity}); random guessing ${s.uniform_loss}`);

  h("STRUCTURED PROFILE (same facts the resume PDF is built from)");
  out.push(`name: ${profile.name}`, `location: ${profile.location}`, `email: ${profile.email}`, `linkedin: https://www.${profile.linkedin}`, `github: https://${profile.github}`, "");
  out.push("education:", ...profile.education.map((e) => `- ${e.degree}, ${e.school}, ${e.dates}, ${e.detail}`));
  out.push("", "skills:", ...profile.skills.map((g) => `- ${g.label}: ${g.items.map((i) => i.name).join(", ")}`), `- Spoken: ${profile.spoken}`);
  out.push("", "experience:");
  for (const e of profile.experience) out.push(`- ${e.role}, ${e.org}, ${e.dates}`, ...e.bullets.map((b) => `    * ${b.text}`));
  out.push("", "projects:");
  for (const p of profile.projects) out.push(`- ${p.name} (${p.stack})${p.dates ? `, ${p.dates}` : ""}, ${p.url}`, ...p.bullets.map((b) => `    * ${b.text}`));
  out.push("", "certifications:", ...profile.certifications.map((c) => `- ${c.name}, ${c.issuer}, ${c.date}`));
  out.push("", "activities:", ...profile.activities.map((a) => `- ${[a.role, a.org].filter(Boolean).join(", ")}, ${a.dates}`));

  h("QUESTIONS THE SITE CHAT CAN ANSWER (verified facts)");
  for (const f of faq) out.push(`- [${f.id}] ${f.text}${f.link ? ` (${f.link.label}: ${f.link.href})` : ""}`);
  return out.join("\n");
}


// A plain, factual summary for people and parsers skimming the text. Every line is a fact from the profile
// with its evidence nearby. It states no opinion about suitability: that is the reader's call.
function screeningSummary(profile) {
  const skills = profile.skills.map((g) => `${g.label}: ${g.items.map((i) => i.name).join(", ")}`);
  const evidence = profile.projects.flatMap((p) => p.bullets.slice(0, 1).map((b) => `- ${p.name}${p.dates ? ` (${p.dates})` : ""}: ${b.text} Source: ${p.url}`));
  const roles = profile.experience.map((e) => `- ${e.role}, ${e.org}, ${e.dates}`);
  const lead = profile.activities.slice(0, 3).map((a) => `- ${a.role}, ${a.org.replace(", Kengeri", "")}, ${a.dates}`);
  return [
    "## Screening summary (facts only; each is detailed and sourced below)", "",
    `candidate: ${profile.name}, ${profile.location}`,
    "looking for: AI/ML internships and freelance projects",
    `education: ${profile.education[0].degree}, ${profile.education[0].school}, ${profile.education[0].dates}, ${profile.education[0].detail}`,
    "", "work experience:", ...roles,
    "", "leadership and activities:", ...lead,
    "", "skills:", ...skills.map((s) => `- ${s}`),
    "", "project evidence (first result per project; every figure was measured and the method is stated on the page):", ...evidence,
    "", `contact: ${profile.email}`, "",
  ].join("\n");
}

let cached;
export async function buildSiteText() {
  if (cached) return cached;
  const head = [
    "# Vishnu Nambiar, AI engineer: portfolio website as plain text",
    `format: UTF-8 plain text, Markdown-style headings`,
    `source: ${location.origin}${location.pathname}`,
    `generated: ${new Date().toISOString().slice(0, 10)}`,
    "contents: screening summary, page text, data tables behind each demo, structured profile, chat knowledge base",
    "",
  ].join("\n");
  const profile = await loadJSON("data/profile.json");
  cached = `${head}\n${screeningSummary(profile)}\n${pageText()}\n${await dataText()}\n`;
  return cached;
}

export function downloadText(text, filename = "Vishnu_Nambiar_Website.txt") {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

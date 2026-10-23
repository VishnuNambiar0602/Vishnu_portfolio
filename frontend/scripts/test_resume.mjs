// Resume guarantees: one page, nothing fabricated, nothing leaked from the job description.
import { readFileSync, readdirSync } from "node:fs";
import { jsPDF } from "jspdf";
import { buildModel } from "../js/resume/tailor.js";
import { makePDF } from "../js/resume/pdf.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const profile = JSON.parse(read("../data/profile.json"));
const dir = new URL("../tests/resume/", import.meta.url);
const jds = [["(general resume)", null], ...readdirSync(dir).filter((f) => f.endsWith(".txt")).map((f) => [f, read(`../tests/resume/${f}`)])];

const plain = (t) => t.replace(/[–—]/g, "-"); // the PDF step writes plain hyphens
const truth = new Set([
  ...profile.projects.flatMap((p) => p.bullets.map((b) => b.text)),
  ...profile.experience.flatMap((e) => e.bullets.map((b) => b.text)),
].map(plain));
const skillNames = new Set(profile.skills.flatMap((g) => g.items.map((i) => i.name)));
let bad = 0;
const fail = (name, msg) => { bad++; console.log(`FAIL ${name}: ${msg}`); };

for (const [name, jd] of jds) {
  const { model } = buildModel(profile, jd);
  const { doc, model: fitted } = makePDF(jsPDF, model);
  if (doc.getNumberOfPages() !== 1) fail(name, `${doc.getNumberOfPages()} pages`);
  for (const s of fitted.sections) {
    for (const e of s.entries || []) for (const b of e.bullets) if (!truth.has(b.text)) fail(name, `bullet not in profile: ${b.text.slice(0, 50)}`);
    if (s.type === "skills") for (const r of s.rows) {
      if (r.label === "Spoken") continue;
      for (const item of r.text.split(", ")) if (!skillNames.has(item)) fail(name, `skill not in profile: ${item}`);
    }
  }
  const projects = fitted.sections.find((s) => s.title === "Projects").entries.length;
  const exp = fitted.sections.find((s) => s.title === "Experience").entries.length;
  if (projects < 3 || exp < 3) fail(name, `too little content (${projects} projects, ${exp} jobs)`);
  if (jd) {
    const text = JSON.stringify(fitted).toLowerCase();
    // Distinctive phrases from the posting that are not in the profile must not appear in the output.
    for (const leak of ["enterprise customers", "retail clients", "supply-chain", "fast-moving"]) if (jd.toLowerCase().includes(leak) && text.includes(leak)) fail(name, `leaked "${leak}"`);
  }
  console.log(`ok   ${name}: 1 page, ${projects} projects`);
}
console.log(bad ? "FAILED" : "all ok");
process.exit(bad ? 1 : 0);

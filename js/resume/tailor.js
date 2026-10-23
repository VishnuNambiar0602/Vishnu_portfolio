// Builds a resume model from data/profile.json. With a job description it re-orders and trims
// what is already true about Vishnu; it never adds a skill, employer, date or number that is not in the profile.

const STOP = new Set(("a an and are as at be but by for from has have in into is it its of on or our that the their this to we will with you your " +
  "who what when where which while about across all any can more most other over per such than then these they those through under up use using within work working " +
  "experience years year strong ability required preferred responsibilities requirements role team company candidate looking join").split(" "));

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordRe = (alias) => new RegExp(`(?<![a-z0-9+#])${esc(alias)}(?![a-z0-9+#])`, "g");

export const normalise = (t) => t.toLowerCase().replace(/[‘’]/g, "'").replace(/[–—]/g, "-");
export const countAlias = (norm, alias) => (norm.match(wordRe(alias.toLowerCase())) || []).length;
const weight = (n) => (n > 0 ? 1 + Math.log(n) : 0);

function guessTitle(raw) {
  const head = raw.slice(0, 600);
  const labelled = head.match(/(?:job title|position|role|title)\s*[:\-]\s*([^\n]{3,80})/i);
  if (labelled) return labelled[1].trim();
  const first = raw.split("\n").map((l) => l.trim()).find(Boolean) || "";
  return first.length <= 80 && /(engineer|scientist|analyst|developer|intern|researcher|specialist)/i.test(first) ? first : null;
}

export function analyseJD(raw, profile) {
  const norm = normalise(raw);
  const hits = (item) => item.aliases.reduce((n, a) => n + countAlias(norm, a), 0);

  const skills = [];
  for (const g of profile.skills) for (const item of g.items) {
    const n = hits(item);
    if (n) skills.push({ name: item.name, group: g.label, count: n, weight: weight(n) });
  }
  skills.sort((a, b) => b.weight - a.weight);

  const gaps = profile.gapTerms.map((g) => ({ name: g.name, count: hits(g) })).filter((g) => g.count).sort((a, b) => b.count - a.count);

  let best = { title: profile.defaultHeadline, score: 0 };
  for (const h of profile.headlines) {
    const score = h.when.reduce((n, w) => n + countAlias(norm, w), 0);
    if (score > best.score) best = { title: h.title, score };
  }

  const tokens = new Map();
  for (const w of norm.match(/[a-z][a-z0-9+#.\-]{2,}/g) || []) if (!STOP.has(w)) tokens.set(w, (tokens.get(w) || 0) + 1);

  return { norm, title: guessTitle(raw), headline: best.title, skills, gaps, tokens };
}

// How well one bullet matches the job description.
export function scoreText(text, tags, jd) {
  if (!jd) return 0;
  let s = 0;
  for (const t of tags || []) s += 2 * weight(countAlias(jd.norm, t));
  const seen = new Set();
  for (const w of normalise(text).match(/[a-z][a-z0-9+#.\-]{2,}/g) || []) {
    if (!STOP.has(w) && !seen.has(w) && jd.tokens.has(w)) { seen.add(w); s += 0.3; }
  }
  return s;
}

function orderSkills(profile, jd) {
  const wt = new Map((jd?.skills || []).map((s) => [s.name, s.weight]));
  const groups = profile.skills.map((g, gi) => {
    const items = g.items.map((it, i) => ({ name: it.name, w: wt.get(it.name) || 0, i }));
    items.sort((a, b) => b.w - a.w || a.i - b.i);
    return { label: g.label, text: items.map((i) => i.name).join(", "), w: items.reduce((n, i) => n + i.w, 0), gi };
  });
  if (jd) groups.sort((a, b) => b.w - a.w || a.gi - b.gi);
  return groups;
}

function summary(profile, jd) {
  const headline = jd ? jd.headline : profile.defaultHeadline;
  const facts = profile.summaryFacts.map((f, i) => ({ ...f, i, s: scoreText(f.text, f.tags, jd) }));
  if (jd) facts.sort((a, b) => b.s - a.s || a.i - b.i);
  const strong = jd ? jd.skills.slice(0, 4).map((s) => s.name) : [];
  const picked = facts.slice(0, strong.length >= 2 ? 1 : 2).sort((a, b) => (jd ? 0 : a.i - b.i)).map((f) => f.text);
  const lead = strong.length >= 2
    ? `BTech student in AI and ML (class of 2027) targeting ${headline} roles, with hands-on work in ${list(strong)}.`
    : "BTech student in AI and ML (class of 2027) building explainable models, bounded agents and ML pipelines.";
  return [lead, ...picked.filter((t) => !(strong.length < 2 && t.startsWith("Builds explainable")))].join(" ");
}

const list = (a) => (a.length <= 2 ? a.join(" and ") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);

// Priority decides which bullets survive when the page is full: higher is kept.
function bullets(items, jd, base, protectFirst) {
  return items.map((b, i) => ({
    text: b.text,
    score: scoreText(b.text, b.tags, jd),
    priority: base + scoreText(b.text, b.tags, jd) - i * 0.5 + (protectFirst && i === 0 ? 1000 : 0),
  }));
}

export function buildModel(profile, jdText) {
  const jd = jdText && jdText.trim() ? analyseJD(jdText, profile) : null;
  const headline = jd ? jd.headline : profile.defaultHeadline;

  const projects = profile.projects.map((p, i) => {
    const bs = bullets(p.bullets, jd, 20 - i * 1.5, false);
    const fit = jd ? scoreText(p.name + " " + p.stack, p.tags, jd) + bs.reduce((n, b) => n + b.score, 0) / 2 : 0;
    return { name: p.name, stack: p.stack, dates: p.dates, link: p.link, bullets: bs, fit, i };
  });
  if (jd) projects.sort((a, b) => b.fit - a.fit || a.i - b.i);
  // Breadth before depth: every top project keeps its first two bullets before any gets a third.
  projects.forEach((p, rank) => p.bullets.forEach((b, i) => {
    const base = rank < 3 ? (i === 0 ? 1000 : i === 1 ? 42 - rank : 30 - rank) : (i === 0 ? 34 - rank : 25 - rank);
    b.priority = base + b.score;
  }));

  const experience = profile.experience.map((e) => ({ ...e, bullets: bullets(e.bullets, jd, 40, true) }));

  const model = {
    name: profile.name,
    headline: `${headline} | BTech AI & ML, CHRIST University, 2027`,
    contact: [
      { text: profile.location },
      { text: profile.email, href: `mailto:${profile.email}` },
      { text: profile.linkedin, href: `https://www.${profile.linkedin}` },
      { text: profile.github, href: `https://${profile.github}` },
    ],
    sections: [
      { title: "Summary", type: "paragraph", text: summary(profile, jd) },
      { title: "Education", type: "entries", entries: profile.education.map((e) => ({ left: e.school, right: e.dates, sub: `${e.degree} | ${e.detail}`, bullets: [] })) },
      { title: "Technical Skills", type: "skills", rows: [...orderSkills(profile, jd), { label: "Spoken", text: profile.spoken, w: -1 }] },
      { title: "Projects", type: "entries", entries: projects.map((p) => ({ left: p.name, right: p.dates, sub: p.stack, link: p.link, bullets: p.bullets })) },
      { title: "Experience", type: "entries", entries: experience.map((e) => ({ left: e.org, right: e.dates, sub: e.role, bullets: e.bullets })) },
      { title: "Certifications", type: "lines", rows: profile.certifications.map((c) => ({ left: `${c.name}, ${c.issuer}`, right: c.date })) },
      { title: "Leadership and Activities", type: "lines", rows: [
        ...profile.activities.filter((a) => a.role).map((a) => ({ left: [a.role, a.org].filter(Boolean).join(", "), right: a.dates })),
        { left: "Also: " + profile.activities.filter((a) => !a.role).map((a) => `${a.org} (${a.dates})`).join("; "), right: "" },
      ] },
    ],
  };

  const report = jd && {
    title: jd.title, headline,
    matched: jd.skills.map((s) => s.name),
    gaps: jd.gaps.map((g) => g.name),
    projects: projects.map((p) => p.name),
  };
  return { model, report };
}

// Drops the lowest-priority bullet that is not protected. Returns false when nothing is left to drop.
export function trimOne(model) {
  let worst = null;
  for (const s of model.sections) for (const e of s.entries || []) {
    e.bullets.forEach((b, i) => { if (b.priority < 1000 && (!worst || b.priority < worst.b.priority)) worst = { e, i, b }; });
  }
  if (!worst) return false;
  worst.e.bullets.splice(worst.i, 1);
  // A project left with no bullets is dropped entirely.
  for (const s of model.sections) if (s.title === "Projects") s.entries = s.entries.filter((e) => e.bullets.length);
  return true;
}

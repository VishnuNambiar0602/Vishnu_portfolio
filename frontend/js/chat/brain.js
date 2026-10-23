// Retrieval over data/faq.json. The default bot only ever replies with these curated facts,
// so it cannot invent anything about Vishnu. The optional language model gets the same facts as context.

const STOP = new Set("a an and are as at be but by can do does for from has have he her him his how i if in into is it its me my of on or our she so that the their them there they this to was we were what when where which who why will with would you your tell about please where any done ever some many much get got does did".split(" "));

const tokens = (s) => (s.toLowerCase().match(/[a-z0-9+#.\-]{2,}/g) || []).map((w) => w.replace(/^[.\-]+|[.\-]+$/g, "")).filter((w) => w && !STOP.has(w));
// Light stemming so "projects" matches "project" and "built" matches "build".
const stem = (w) => {
  if (w.length <= 3) return w;
  if (w.endsWith("ies") && w.length > 4) return w.slice(0, -3) + "y";
  if (/(ss|sh|ch|x|z)es$/.test(w)) return w.slice(0, -2);
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -2);
  if (w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
};

export function buildIndex(faq) {
  const docs = faq.map((f) => ({
    f,
    kw: new Set(f.keywords.map(stem)),
    body: new Set(tokens(f.text).map(stem)),
  }));
  const df = new Map();
  for (const d of docs) for (const t of new Set([...d.kw, ...d.body])) df.set(t, (df.get(t) || 0) + 1);
  return { docs, df, n: docs.length };
}

export function retrieve(index, query, k = 3) {
  const q = [...new Set(tokens(query).map(stem))];
  if (!q.length) return [];
  const scored = index.docs.map((d) => {
    let s = 0;
    for (const t of q) {
      const idf = Math.log(1 + index.n / (index.df.get(t) || index.n));
      if (d.kw.has(t)) s += 3 * idf;
      else if (d.body.has(t)) s += idf;
    }
    const hit = q.filter((t) => d.kw.has(t) || d.body.has(t)).length;
    return { f: d.f, score: s * (d.f.weight ?? 1), coverage: hit / q.length, terms: q.length };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

const GREETING = /^(hi|hello|hey|yo|hola|good (morning|afternoon|evening)|namaste)\b/i;
const THANKS = /^(thanks|thank you|thx|cheers)\b/i;

export function reply(index, query) {
  const text = query.trim();
  if (GREETING.test(text) && text.split(/\s+/).length <= 4) {
    return { text: "Hi. I can answer questions about Vishnu's projects, skills, experience, education and how to contact him. What would you like to know?", hits: [] };
  }
  if (THANKS.test(text)) return { text: "You're welcome.", hits: [] };
  const hits = retrieve(index, text, 3);
  const MIN = 1.5;
  const weak = hits.length && hits[0].terms >= 3 && hits[0].coverage < 0.4; // one stray word in a long off-topic question
  if (!hits.length || hits[0].score < MIN || weak) {
    return { text: "I only know what is on this site, and I could not match that. Try asking about his projects, skills, experience, education or contact details.", hits: [] };
  }
  return { text: hits[0].f.text, link: hits[0].f.link, hits };
}

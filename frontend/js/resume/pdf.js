// Renders a resume model to a single-column, text-based PDF (real text, standard fonts, no images or
// tables), which is what applicant tracking systems parse best.
import { trimOne } from "./tailor.js";

const PAGE = { w: 595.28, h: 841.89 }; // A4, points
const S = { left: 38, right: 38, top: 34, bottom: 30, body: 10, small: 9.5, name: 21, head: 10.5, lead: 1.23 };
const INK = [20, 20, 20], MUTED = [70, 70, 70], LINK = [11, 79, 138];

function render(doc, m) {
  const width = PAGE.w - S.left - S.right;
  const right = PAGE.w - S.right;
  let y = S.top;

  const font = (style = "normal", size = S.body, color = INK) => { doc.setFont("helvetica", style); doc.setFontSize(size); doc.setTextColor(...color); };
  const lh = (size = S.body) => size * S.lead;
  const room = (h) => { if (y + h > PAGE.h - S.bottom) { doc.addPage(); y = S.top; } };

  // Header
  font("bold", S.name);
  y += S.name * 0.85;
  doc.text(m.name, S.left, y);
  y += 15;
  font("normal", S.body + 0.5, MUTED);
  doc.text(m.headline, S.left, y);
  y += 14;
  font("normal", 9);
  let x = S.left;
  m.contact.forEach((c, i) => {
    if (i) { font("normal", 9, MUTED); doc.text("  |  ", x, y); x += doc.getTextWidth("  |  "); }
    font("normal", 9, c.href ? LINK : INK);
    if (c.href) doc.textWithLink(c.text, x, y, { url: c.href }); else doc.text(c.text, x, y);
    x += doc.getTextWidth(c.text);
  });
  y += 6;

  const section = (title) => {
    room(44);
    y += 14;
    font("bold", S.head);
    doc.text(title.toUpperCase(), S.left, y);
    y += 4;
    doc.setDrawColor(...MUTED); doc.setLineWidth(0.6);
    doc.line(S.left, y, right, y);
    y += 4;
  };

  const wrapped = (text, x0, w, style = "normal", size = S.body, color = INK) => {
    font(style, size, color);
    for (const line of doc.splitTextToSize(text, w)) { room(lh(size)); y += lh(size) - 2.4; doc.text(line, x0, y); y += 2.4; }
  };

  for (const s of m.sections) {
    section(s.title);
    if (s.type === "paragraph") wrapped(s.text, S.left, width);

    if (s.type === "skills") {
      font("bold");
      const col = Math.max(...s.rows.map((r) => doc.getTextWidth(r.label))) + 10;
      for (const r of s.rows) {
        font("normal"); const lines = doc.splitTextToSize(r.text, width - col);
        room(lh() * lines.length);
        y += lh() - 2.4;
        font("bold"); doc.text(r.label, S.left, y);
        font("normal"); doc.text(lines[0], S.left + col, y); y += 2.4;
        for (const l of lines.slice(1)) { y += lh() - 2.4; doc.text(l, S.left + col, y); y += 2.4; }
      }
    }

    if (s.type === "entries") {
      s.entries.forEach((e, idx) => {
        room(lh() * 3);
        if (idx) y += 4;
        y += lh() - 2.4;
        font("bold");
        doc.text(e.left, S.left, y);
        if (e.right) { font("normal", S.body, MUTED); doc.text(e.right, right, y, { align: "right" }); }
        y += 2.4;
        if (e.sub) {
          font("italic", S.body, MUTED);
          y += lh() - 2.4;
          doc.text(e.sub, S.left, y);
          if (e.link) {
            const sx = S.left + doc.getTextWidth(e.sub + "  |  ");
            doc.text("  |  ", S.left + doc.getTextWidth(e.sub), y);
            font("normal", S.body, LINK);
            doc.textWithLink(e.link, sx, y, { url: e.url || `https://${e.link}` });
          }
          y += 2.4;
        }
        for (const b of e.bullets) {
          const lines = doc.splitTextToSize(b.text, width - 14);
          room(lh() * Math.min(lines.length, 2));
          font("normal");
          let first = true;
          for (const l of lines) { room(lh()); y += lh() - 2.4; if (first) { doc.setFillColor(...INK); doc.circle(S.left + 4, y - 3.1, 1.15, "F"); first = false; } doc.text(l, S.left + 14, y); y += 2.4; }
        }
      });
    }

    if (s.type === "lines") {
      for (const r of s.rows) {
        font("normal");
        const lines = doc.splitTextToSize(r.left, width - (r.right ? 100 : 0));
        room(lh() * lines.length);
        let first = true;
        for (const l of lines) { y += lh() - 2.4; doc.text(l, S.left, y); if (first && r.right) { font("normal", S.body, MUTED); doc.text(r.right, right, y, { align: "right" }); font("normal"); } first = false; y += 2.4; }
      }
    }
  }
  return y;
}

// Builds one-page PDF; trims the least relevant bullets until it fits.
const plain = (v) => (typeof v === "string" ? v.replace(/[–—]/g, "-") : Array.isArray(v) ? v.map(plain) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)])) : v);

export function makePDF(JsPDF, model, meta = {}) {
  const m = plain(structuredClone(model)); // standard PDF fonts cannot encode en dashes cleanly
  for (let guard = 0; guard < 60; guard++) {
    const doc = new JsPDF({ unit: "pt", format: "a4", compress: true });
    doc.setProperties({ title: "Vishnu Nambiar - Resume", author: "Vishnu Nambiar", subject: "Resume", creator: "", ...meta });
    render(doc, m);
    if (doc.getNumberOfPages() === 1) return { doc, model: m };
    if (!trimOne(m)) return { doc, model: m };
  }
  throw new Error("Resume did not fit on one page");
}

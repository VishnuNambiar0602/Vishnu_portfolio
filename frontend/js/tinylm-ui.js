import { el, clear } from "./dom.js";
import { TinyLM, sample, softmax } from "./tinylm.js";

const STARTERS = [["def ", "def "], ["import ", "import "], ["class Tiny", "class Tiny"], ["function ", "function "], ["# The model", "# The model"]];
const show = (c) => (c === "\n" ? "\\n" : c === "\t" ? "\\t" : c === " " ? "␣" : c); // visible spaces and newlines

export async function mount() {
  const $ = (id) => document.getElementById(id);
  const model = await TinyLM.load("data/");
  const s = model.stats;

  // Stats line: everything here was measured when the model was trained (backend/tiny-lm/train_demo.py).
  $("t-stats").replaceChildren(
    `${(s.parameters / 1e6).toFixed(2)}M parameters, ${s.n_layers} layers x ${s.n_heads} heads, ${s.vocab_size} characters. `,
    `Trained for ${s.steps.toLocaleString("en")} steps (${Math.round(s.train_seconds / 60)} min on a laptop GPU) on ${Math.round(s.corpus_chars / 1000)}K characters of this repository's own source. `,
    `Held-out loss ${s.val_loss} (perplexity ${s.val_perplexity}) against ${s.uniform_loss} for random guessing.`);

  const prompt = $("t-prompt"), out = $("t-out"), bars = $("t-next"), status = $("t-status");
  const strategy = $("t-strategy"), temp = $("t-temp"), len = $("t-len"), tempOut = $("t-temp-out"), lenOut = $("t-len-out");
  const gen = $("t-generate"), stop = $("t-stop");
  let text = "", promptLen = 0, running = false, cancel = false, lastLogits = null;

  STARTERS.forEach(([label, v]) => $("t-starters").append(el("button", { class: "chip", type: "button", text: label, onclick: () => { prompt.value = v; run(); } })));
  const syncLabels = () => {
    tempOut.textContent = Number(temp.value).toFixed(2); lenOut.textContent = `${len.value} characters`;
    temp.disabled = strategy.value !== "temperature";
  };
  [strategy, temp, len].forEach((n) => n.addEventListener("input", syncLabels)); syncLabels();

  function paint() {
    out.replaceChildren(el("span", { class: "dim", text: text.slice(0, promptLen) }), text.slice(promptLen));
    out.scrollTop = out.scrollHeight;
  }

  function showNext(logits) {
    lastLogits = logits;
    const p = softmax(logits, 1);
    const top = [...p.keys()].sort((a, b) => p[b] - p[a]).slice(0, 8);
    clear(bars).append(...top.map((id) => el("li", {},
      el("button", { type: "button", class: "nx", title: "Append this character", onclick: () => append(id) },
        el("code", { text: show(model.vocab[id]) }), el("span", { class: "bar" }, el("span", { style: `width:${(p[id] * 100).toFixed(1)}%` })),
        el("span", { class: "pct", text: `${(p[id] * 100).toFixed(1)}%` })))));
  }

  function append(id) {
    if (running || model.pos >= model.capacity) return;
    text += model.decode([id]);
    showNext(model.step(id));
    paint(); heat();
  }

  async function run() {
    if (running) return;
    const p0 = prompt.value;
    status.textContent = "";
    if (!p0.length) { status.textContent = "Type a few characters to start from."; return; }
    if (p0.length >= model.capacity) { status.textContent = `The prompt must be shorter than ${model.capacity} characters.`; return; }
    running = true; cancel = false; gen.disabled = true; stop.disabled = false;
    let logits;
    ({ logits } = model.prime(p0));
    text = p0; promptLen = p0.length; paint();
    const total = Math.min(Number(len.value), model.capacity - p0.length);
    const t0 = performance.now();
    let n = 0;
    while (n < total && !cancel) {
      const id = sample(logits, { strategy: strategy.value, temperature: Number(temp.value), topK: 20 });
      text += model.decode([id]); logits = model.step(id); n++;
      if (n % 6 === 0) { paint(); await new Promise((r) => setTimeout(r)); }
    }
    paint(); showNext(logits); heat();
    const secs = (performance.now() - t0) / 1000;
    status.textContent = `${n} characters in ${secs.toFixed(2)} s (${Math.round(n / Math.max(secs, 0.001))} per second, computed in your browser).${model.pos >= model.capacity ? " The context window is full." : ""}`;
    running = false; gen.disabled = false; stop.disabled = true;
  }
  gen.addEventListener("click", run);
  stop.addEventListener("click", () => { cancel = true; });
  prompt.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); run(); } });
  $("t-reset").addEventListener("click", () => { cancel = true; prompt.value = "def "; text = ""; out.textContent = ""; clear(bars); status.textContent = ""; model.reset(); heat(); });

  // Attention heatmap: row i shows where character i looked when the model read it.
  const layerSel = $("t-layer"), headSel = $("t-head"), canvas = $("t-heat"), read = $("t-read");
  for (let l = 0; l < model.cfg.n_layers; l++) layerSel.append(el("option", { value: l, text: `Layer ${l + 1}` }));
  for (let h = 0; h < model.cfg.n_heads; h++) headSel.append(el("option", { value: h, text: `Head ${h + 1}` }));
  [layerSel, headSel].forEach((n) => n.addEventListener("change", heat));
  const ctx = canvas.getContext("2d");
  let cell = 4, count = 0;

  function heat() {
    const n = model.pos; count = n;
    const size = 560;
    canvas.width = size; canvas.height = size; canvas.style.height = "auto";
    ctx.clearRect(0, 0, size, size);
    const css = getComputedStyle(document.documentElement);
    const accent = css.getPropertyValue("--accent").trim() || "#b93a12", line = css.getPropertyValue("--line").trim() || "#ccc";
    if (!n) { ctx.fillStyle = css.getPropertyValue("--muted").trim(); ctx.font = "14px sans-serif"; ctx.fillText("Generate some text to see attention.", 12, 24); return; }
    cell = size / n;
    const l = Number(layerSel.value), h = Number(headSel.value);
    ctx.fillStyle = line; ctx.globalAlpha = 0.25;
    for (let i = 0; i < n; i++) ctx.fillRect(0, i * cell, (i + 1) * cell, Math.max(cell, 1)); // the causal triangle
    ctx.globalAlpha = 1; ctx.fillStyle = accent;
    for (let i = 0; i < n; i++) {
      const row = model.attention[i][l][h];
      for (let j = 0; j <= i; j++) { const a = Math.sqrt(row[j]); if (a > 0.04) { ctx.globalAlpha = Math.min(1, a); ctx.fillRect(j * cell, i * cell, Math.max(cell, 1), Math.max(cell, 1)); } }
    }
    ctx.globalAlpha = 1;
  }
  const hover = (ev) => {
    if (!count) return;
    const r = canvas.getBoundingClientRect(), k = canvas.width / r.width;
    const i = Math.floor(((ev.clientY - r.top) * k) / cell), j = Math.floor(((ev.clientX - r.left) * k) / cell);
    if (i < 0 || i >= count || j < 0 || j > i) { read.textContent = "Point at a cell: row = the character being read, column = the character it looks at."; return; }
    const ch = (k2) => JSON.stringify(show(text[k2]));
    const w = model.attention[i][Number(layerSel.value)][Number(headSel.value)][j];
    read.textContent = `Character ${i + 1} (${ch(i)}) gives ${ch(j)} at position ${j + 1} ${(w * 100).toFixed(0)}% of its attention.`;
  };
  canvas.addEventListener("pointermove", hover); canvas.addEventListener("pointerdown", hover);
  read.textContent = "Point at a cell: row = the character being read, column = the character it looks at.";

  run(); // start with something on screen
}

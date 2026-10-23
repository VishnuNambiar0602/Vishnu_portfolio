// Browser port of backend/tiny-lm (tiny_lm/*.py): a decoder-only transformer, character level, pre-norm,
// sinusoidal positions, GELU feed-forward, one q/k/v projection per head. Weights are exported by
// backend/tiny-lm/export_weights.py; scripts/check_tinylm_parity.mjs checks this file against PyTorch.
//
// Generation uses a key/value cache: each new character costs one pass through the layers instead of
// re-reading the whole context, and the attention row computed for every character is kept so the page
// can draw it as a heatmap.

function erf(x) { // Abramowitz and Stegun 7.1.26 refined with one series term; error below 1e-7
  const s = Math.sign(x); x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}
const gelu = (x) => 0.5 * x * (1 + erf(x / Math.SQRT2));

export class TinyLM {
  constructor(manifest, buffer) {
    this.cfg = manifest.config;
    this.vocab = manifest.vocab;
    this.stats = manifest.stats;
    this.index = new Map(this.vocab.map((c, i) => [c, i]));
    const all = new Float32Array(buffer);
    this.w = {};
    for (const t of manifest.tensors) {
      const n = t.shape.reduce((a, b) => a * b, 1);
      this.w[t.name] = all.subarray(t.offset, t.offset + n);
    }
    const { d_model: d, n_heads: h } = this.cfg;
    this.dHead = d / h;
    const half = d / 2;
    this.div = Float64Array.from({ length: half }, (_, i) => Math.exp(2 * i * (-Math.log(10000) / d)));
    this.reset();
  }

  static async load(base = "data/") {
    const [manifest, buffer] = await Promise.all([
      fetch(`${base}tinylm.json`).then((r) => r.json()),
      fetch(`${base}tinylm.bin`).then((r) => r.arrayBuffer()),
    ]);
    return new TinyLM(manifest, buffer);
  }

  encode(text) { return [...text].map((c) => this.index.get(c) ?? 0); }
  decode(ids) { return ids.map((i) => (i === 0 ? "?" : this.vocab[i] ?? "")).join(""); } // id 0 is the unknown-character slot

  reset() {
    const { n_layers: L, n_heads: H } = this.cfg;
    this.pos = 0;
    this.keys = Array.from({ length: L }, () => Array.from({ length: H }, () => []));
    this.values = Array.from({ length: L }, () => Array.from({ length: H }, () => []));
    this.attention = []; // attention[pos][layer][head] = weights over positions 0..pos
  }

  get capacity() { return this.cfg.max_seq_len; }

  linear(x, W, out, bias) {
    const inn = x.length, y = new Float32Array(out);
    for (let o = 0, base = 0; o < out; o++, base += inn) {
      let s = bias ? bias[o] : 0;
      for (let i = 0; i < inn; i++) s += W[base + i] * x[i];
      y[o] = s;
    }
    return y;
  }

  layerNorm(x, g, b) {
    const n = x.length; let mean = 0, v = 0;
    for (let i = 0; i < n; i++) mean += x[i];
    mean /= n;
    for (let i = 0; i < n; i++) { const d = x[i] - mean; v += d * d; }
    const inv = 1 / Math.sqrt(v / n + 1e-5);
    const y = new Float32Array(n);
    for (let i = 0; i < n; i++) y[i] = (x[i] - mean) * inv * g[i] + b[i];
    return y;
  }

  /** Feed one token at the next position. Returns the logits for the character that should follow it. */
  step(tokenId) {
    const { d_model: d, n_heads: H, n_layers: L, d_ff: F, vocab_size: V } = this.cfg;
    if (this.pos >= this.capacity) throw new Error("context is full");
    const p = this.pos, w = this.w, dh = this.dHead;
    const x = new Float32Array(d);
    const emb = w["embedding.token_emb.weight"];
    for (let i = 0; i < d; i++) x[i] = emb[tokenId * d + i];
    for (let i = 0; i < d / 2; i++) { const a = p * this.div[i]; x[2 * i] += Math.sin(a); x[2 * i + 1] += Math.cos(a); }

    const rows = [];
    for (let l = 0; l < L; l++) {
      const pre = `blocks.${l}.`;
      const h1 = this.layerNorm(x, w[pre + "norm1.weight"], w[pre + "norm1.bias"]);
      const concat = new Float32Array(d);
      const layerRows = [];
      for (let h = 0; h < H; h++) {
        const hp = `${pre}attn.heads.${h}.`;
        const q = this.linear(h1, w[hp + "q.weight"], dh);
        this.keys[l][h].push(this.linear(h1, w[hp + "k.weight"], dh));
        this.values[l][h].push(this.linear(h1, w[hp + "v.weight"], dh));
        const K = this.keys[l][h], Vv = this.values[l][h], scale = Math.sqrt(dh);
        const scores = new Float64Array(p + 1);
        let max = -Infinity;
        for (let j = 0; j <= p; j++) {
          let s = 0; const kj = K[j];
          for (let i = 0; i < dh; i++) s += q[i] * kj[i];
          scores[j] = s / scale; if (scores[j] > max) max = scores[j];
        }
        let sum = 0;
        for (let j = 0; j <= p; j++) { scores[j] = Math.exp(scores[j] - max); sum += scores[j]; }
        const wts = new Float32Array(p + 1);
        for (let j = 0; j <= p; j++) {
          wts[j] = scores[j] / sum;
          const vj = Vv[j];
          for (let i = 0; i < dh; i++) concat[h * dh + i] += wts[j] * vj[i];
        }
        layerRows.push(wts);
      }
      rows.push(layerRows);
      const att = this.linear(concat, w[pre + "attn.proj.weight"], d);
      for (let i = 0; i < d; i++) x[i] += att[i];

      const h2 = this.layerNorm(x, w[pre + "norm2.weight"], w[pre + "norm2.bias"]);
      const f = this.linear(h2, w[pre + "ffn.fc1.weight"], F, w[pre + "ffn.fc1.bias"]);
      for (let i = 0; i < F; i++) f[i] = gelu(f[i]);
      const o = this.linear(f, w[pre + "ffn.fc2.weight"], d, w[pre + "ffn.fc2.bias"]);
      for (let i = 0; i < d; i++) x[i] += o[i];
    }
    this.attention.push(rows);
    this.pos++;
    return this.linear(this.layerNorm(x, w["norm.weight"], w["norm.bias"]), w["head.weight"], V);
  }

  /** Reset, feed the prompt, and return the logits after its last character. */
  prime(text) {
    this.reset();
    const ids = this.encode(text);
    if (!ids.length) throw new Error("empty prompt");
    if (ids.length > this.capacity) throw new Error(`prompt is longer than ${this.capacity} characters`);
    let logits;
    for (const id of ids) logits = this.step(id);
    return { ids, logits };
  }
}

export function softmax(logits, temperature = 1) {
  const t = Math.max(temperature, 1e-6);
  let max = -Infinity;
  for (const v of logits) if (v > max) max = v;
  const p = new Float64Array(logits.length);
  let sum = 0;
  for (let i = 0; i < p.length; i++) { p[i] = Math.exp((logits[i] - max) / t); sum += p[i]; }
  for (let i = 0; i < p.length; i++) p[i] /= sum;
  return p;
}

/** Same three strategies as the Python InferenceEngine: greedy, temperature, top-k. */
export function sample(logits, { strategy = "greedy", temperature = 1, topK = 50, random = Math.random } = {}) {
  if (strategy === "greedy") { let b = 0; for (let i = 1; i < logits.length; i++) if (logits[i] > logits[b]) b = i; return b; }
  let ids = [...logits.keys()];
  if (strategy === "top_k") { ids.sort((a, b) => logits[b] - logits[a]); ids = ids.slice(0, Math.min(topK, ids.length)); }
  const probs = softmax(ids.map((i) => logits[i]), strategy === "top_k" ? 1 : temperature);
  let r = random(), acc = 0;
  for (let k = 0; k < ids.length; k++) { acc += probs[k]; if (r <= acc) return ids[k]; }
  return ids[ids.length - 1];
}

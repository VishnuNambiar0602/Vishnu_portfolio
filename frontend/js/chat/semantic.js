// On-device language model for the chat: MiniLM (all-MiniLM-L6-v2, 8-bit) turns questions and the
// curated facts into vectors, so a question is matched to a fact by meaning, not only by shared words.
// It runs in the browser (WebAssembly, about 25 MB, downloaded once and cached). It never writes
// text: every answer is a verified fact, so it cannot invent anything about Vishnu.
// Why not a generative model: I tested Qwen2.5-0.5B. It ignored the facts it was given and made
// things up (it called Vishnu a Hindu god and invented a favourite food), so it is not used.
const TRANSFORMERS = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1/+esm";
const MODEL = "Xenova/all-MiniLM-L6-v2";

export class Semantic {
  static async load(faq, onStatus) {
    onStatus?.("Loading the on-device language model (MiniLM, about 25 MB)...");
    const { pipeline } = await import(TRANSFORMERS);
    const extractor = await pipeline("feature-extraction", MODEL, { dtype: "q8", device: "wasm" });
    const embed = async (texts) => (await extractor(texts, { pooling: "mean", normalize: true })).tolist();
    const docs = await embed(faq.map((f) => `${f.keywords.join(" ")}. ${f.text}`));
    return new Semantic(embed, docs);
  }

  constructor(embed, docs) { this.embed = embed; this.docs = docs; }

  /** Cosine similarity of the question to every fact (vectors are normalised, so a dot product). */
  async similarities(question) {
    const [q] = await this.embed([question]);
    return this.docs.map((d) => d.reduce((s, x, i) => s + x * q[i], 0));
  }
}

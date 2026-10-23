// Optional on-device small language model (Qwen2.5-0.5B via WebLLM, WebGPU). It is opt-in because the
// first load downloads model weights. Prompts stay in the browser; only the weights are fetched.
const WEBLLM = "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.86/+esm";
export const MODEL = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";

let engine = null;

export const supported = () => "gpu" in navigator;
export const ready = () => engine !== null;

export async function load(onProgress) {
  if (engine) return;
  if (!supported()) throw new Error("This browser does not support WebGPU.");
  const webllm = await import(WEBLLM);
  engine = await webllm.CreateMLCEngine(MODEL, { initProgressCallback: (p) => onProgress?.(p.text, p.progress) });
}

export async function answer(question, facts, onToken) {
  const system =
    "You answer questions about Vishnu Nambiar for visitors to his portfolio. Use only the facts below. " +
    "If the answer is not in the facts, say you do not know and suggest emailing vishnunambiar2006@gmail.com. " +
    "Answer in at most three short sentences, in plain text.\n\nFacts:\n" + facts.map((f) => `- ${f}`).join("\n");
  const stream = await engine.chat.completions.create({
    messages: [{ role: "system", content: system }, { role: "user", content: question }],
    temperature: 0.2, max_tokens: 180, stream: true,
  });
  let out = "";
  for await (const chunk of stream) {
    out += chunk.choices[0]?.delta?.content || "";
    onToken?.(out);
  }
  return out.trim();
}

// The browser port of Tiny LM must reproduce PyTorch: same logits and the same greedy continuation.
import { readFileSync } from "node:fs";
import { TinyLM, sample } from "../js/tinylm.js";

const dir = new URL("../data/", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("tinylm.json", dir)));
const buf = readFileSync(new URL("tinylm.bin", dir));
const model = new TinyLM(manifest, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const refs = JSON.parse(readFileSync(new URL("tinylm_reference.json", dir)));

let worst = 0, bad = 0;
for (const r of refs) {
  const { ids, logits } = model.prime(r.prompt);
  for (let i = 0; i < logits.length; i++) worst = Math.max(worst, Math.abs(logits[i] - r.last_logits[i]));
  let out = "", l = logits;
  for (let k = 0; k < r.greedy.length; k++) { const id = sample(l, { strategy: "greedy" }); out += model.decode([id]); l = model.step(id); }
  if (out !== r.greedy) { bad++; console.log(`GREEDY MISMATCH for ${JSON.stringify(r.prompt)}\n  js : ${JSON.stringify(out.slice(0, 50))}\n  py : ${JSON.stringify(r.greedy.slice(0, 50))}`); }
}
console.log(`${refs.length} prompts: worst logit difference ${worst.toExponential(2)}, greedy continuations ${refs.length - bad}/${refs.length} identical`);
process.exit(worst < 1e-3 && !bad ? 0 : 1);

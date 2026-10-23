"""Export the trained demo model for the browser: weights as one little-endian float32 file, a JSON manifest
(config, vocabulary, tensor offsets, training stats) and reference outputs so the JavaScript port can be
checked against PyTorch.

    python export_weights.py ../../frontend/data
"""
import json
import sys
from pathlib import Path

import numpy as np
import torch

from tiny_lm.config import ModelConfig
from tiny_lm.model import TinyLM

HERE = Path(__file__).resolve().parent
out_dir = Path(sys.argv[1] if len(sys.argv) > 1 else HERE.parents[1] / "frontend" / "data")
demo = HERE / "demo"

state = torch.load(demo / "final.pt", weights_only=True, map_location="cpu")
cfg = ModelConfig(**state["config"])
model = TinyLM(cfg)
model.load_state_dict(state["model"])
model.eval()

tensors, chunks, offset = [], [], 0
for name, t in model.state_dict().items():
    if name.endswith(".pe"):  # sinusoidal positions are recomputed in JavaScript
        continue
    a = t.detach().cpu().numpy().astype("<f4")
    tensors.append({"name": name, "shape": list(a.shape), "offset": offset})
    chunks.append(a.tobytes())
    offset += a.size
(out_dir / "tinylm.bin").write_bytes(b"".join(chunks))

vocab = json.loads((demo / "vocab.json").read_text(encoding="utf-8"))
chars = [None] * len(vocab)
for token, i in vocab.items():
    chars[i] = token
manifest = {"config": cfg.__dict__, "vocab": chars, "tensors": tensors, "stats": json.loads((demo / "stats.json").read_text())}
(out_dir / "tinylm.json").write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")))


def encode(text):
    return [vocab.get(c, 0) for c in text]


refs = []
with torch.no_grad():
    for prompt in ["def ", "import ", "class Tiny", "# The model", "for i in range(", "export function"]:
        ids = torch.tensor([encode(prompt)])
        logits = model(ids)[0, -1].tolist()
        gen = list(ids[0])
        for _ in range(60):  # greedy continuation
            nxt = int(model(torch.tensor([gen]))[0, -1].argmax())
            gen.append(nxt)
        refs.append({"prompt": prompt, "last_logits": [round(x, 5) for x in logits], "greedy": "".join(chars[int(i)] for i in gen[len(prompt):])})
(out_dir / "tinylm_reference.json").write_text(json.dumps(refs, ensure_ascii=False))
print(f"{offset:,} floats -> {offset * 4 / 1e6:.2f} MB; {len(tensors)} tensors; {len(refs)} reference prompts")
for r in refs[:3]:
    print(repr(r["prompt"]), "->", repr(r["greedy"][:60]))

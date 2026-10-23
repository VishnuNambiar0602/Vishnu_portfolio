"""Train the Tiny LM used by the portfolio demo, with the project's own training loop.

The corpus is this repository's own source code and docs (ASCII only), so there is nothing to download
and nothing third-party in the training data. 5% of it is held out to report an honest validation loss.

    python train_demo.py            # trains for the steps in tiny_lm/config.yaml, writes demo/
"""
import json
import math
import os
import time
from pathlib import Path

import torch
import torch.nn.functional as F

from tiny_lm.config import ModelConfig, load_config
from tiny_lm.model import TinyLM
from tiny_lm.tokenizer import Tokenizer
from tiny_lm.train import train

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
OUT = HERE / "demo"

# What goes in: own code and prose. What stays out: dependencies, build output, data, and anything private.
INCLUDE_EXT = {".py", ".ts", ".tsx", ".js", ".mjs", ".css", ".html", ".md"}
SKIP_DIRS = {"node_modules", ".git", ".next", "dist", "builds", "__pycache__", ".pytest_cache", ".hypothesis", "vendor", "data", "private", "demo", "results", "annotations"}
SKIP_FILES = {"package-lock.json", "PRIVATE.md"}
MAX_FILE_BYTES = 120_000  # keeps one huge generated file from dominating


def collect() -> str:
    parts = []
    for path in sorted(REPO.rglob("*")):
        if not path.is_file() or path.suffix not in INCLUDE_EXT or path.name in SKIP_FILES:
            continue
        if any(p in SKIP_DIRS for p in path.relative_to(REPO).parts):
            continue
        if path.stat().st_size > MAX_FILE_BYTES:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore").replace("\r\n", "\n")
        text = "".join(c for c in text if c == "\n" or c == "\t" or 32 <= ord(c) < 127)
        parts.append(text)
    return "\n".join(parts)


@torch.no_grad()
def mean_loss(model, ids, seq_len, device, batches=40, batch_size=32, seed=0):
    g = torch.Generator().manual_seed(seed)
    model.eval()
    losses = []
    for _ in range(batches):
        starts = torch.randint(0, len(ids) - seq_len - 1, (batch_size,), generator=g)
        x = torch.stack([ids[s : s + seq_len - 1] for s in starts]).to(device)
        y = torch.stack([ids[s + 1 : s + seq_len] for s in starts]).to(device)
        logits = model(x)
        losses.append(F.cross_entropy(logits.reshape(-1, logits.size(-1)), y.reshape(-1)).item())
    return sum(losses) / len(losses)


def main():
    OUT.mkdir(exist_ok=True)
    corpus = collect()
    cut = int(len(corpus) * 0.95)
    train_text, val_text = corpus[:cut], corpus[cut:]
    (OUT / "corpus_train.txt").write_text(train_text, encoding="utf-8")
    print(f"corpus: {len(corpus):,} characters ({len(train_text):,} train, {len(val_text):,} held out)")

    model_cfg, train_cfg = load_config(str(HERE / "tiny_lm" / "config.yaml"))
    tok = Tokenizer(scheme="char")
    tok.build_vocab(train_text, str(OUT / "vocab.json"))
    cfg = ModelConfig(**{**model_cfg.__dict__, "vocab_size": tok.vocab_size})

    torch.manual_seed(0)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = TinyLM(cfg).to(device)
    print(f"model: {model.num_parameters():,} parameters, vocab {cfg.vocab_size}, device {device}")

    start = time.time()
    train(model, train_cfg, str(OUT / "corpus_train.txt"), output_dir=str(OUT))
    seconds = time.time() - start

    seq_len = cfg.max_seq_len
    train_ids = torch.tensor(tok.encode(train_text), dtype=torch.long)
    val_ids = torch.tensor([i for i in tok.encode(val_text)], dtype=torch.long)
    train_loss = mean_loss(model, train_ids, seq_len, device)
    val_loss = mean_loss(model, val_ids, seq_len, device)
    stats = {
        "parameters": model.num_parameters(), "vocab_size": cfg.vocab_size, "d_model": cfg.d_model, "n_heads": cfg.n_heads,
        "n_layers": cfg.n_layers, "d_ff": cfg.d_ff, "max_seq_len": cfg.max_seq_len,
        "steps": train_cfg.max_steps, "batch_size": train_cfg.batch_size, "train_seconds": round(seconds),
        "corpus_chars": len(corpus), "train_loss": round(train_loss, 3), "val_loss": round(val_loss, 3),
        "val_perplexity": round(math.exp(val_loss), 2), "uniform_loss": round(math.log(cfg.vocab_size), 3),
    }
    (OUT / "stats.json").write_text(json.dumps(stats, indent=2))
    torch.save({"model": model.state_dict(), "config": cfg.__dict__}, OUT / "final.pt")
    print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    main()

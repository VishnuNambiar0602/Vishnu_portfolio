"""Training loop for TinyLM."""

from __future__ import annotations

import glob
import os

import torch
import torch.nn as nn
import torch.optim as optim

from tiny_lm.config import TrainConfig
from tiny_lm.model import TinyLM
from tiny_lm.tokenizer import Tokenizer


def _latest_checkpoint(output_dir: str) -> str | None:
    """Return the path of the latest checkpoint in *output_dir*, or None."""
    pattern = os.path.join(output_dir, "checkpoint_*.pt")
    files = glob.glob(pattern)
    if not files:
        return None
    # Sort by step number embedded in filename
    files.sort(key=lambda p: int(os.path.splitext(os.path.basename(p))[0].split("_")[1]))
    return files[-1]


def _make_batches(
    token_ids: list[int], seq_len: int, batch_size: int
) -> list[torch.Tensor]:
    """Slice token_ids into non-overlapping batches of shape [batch, seq_len]."""
    # Truncate to a multiple of seq_len * batch_size
    total = (len(token_ids) // seq_len) * seq_len
    ids = torch.tensor(token_ids[:total], dtype=torch.long)
    chunks = ids.split(seq_len)
    # Drop last chunk if shorter than seq_len
    chunks = [c for c in chunks if len(c) == seq_len]
    batches = [
        torch.stack(chunks[i : i + batch_size])
        for i in range(0, len(chunks), batch_size)
        if len(chunks[i : i + batch_size]) == batch_size
    ]
    return batches


def train(
    model: TinyLM,
    config: TrainConfig,
    corpus_path: str,
    output_dir: str = ".",
) -> None:
    """Train *model* on the text corpus at *corpus_path*.

    Args:
        model: The TinyLM model to train.
        config: Training hyperparameters.
        corpus_path: Path to a plain-text corpus file.
        output_dir: Directory where checkpoints are saved.
    """
    # Build tokenizer from corpus
    tokenizer = Tokenizer(scheme="char")
    with open(corpus_path, encoding="utf-8") as f:
        corpus = f.read()
    vocab_path = os.path.join(output_dir, "vocab.json")
    tokenizer.build_vocab(corpus, vocab_path)

    # Clamp token IDs to model's vocab_size to avoid embedding index errors
    vocab_cap = model.config.vocab_size

    # Encode corpus and build batches
    raw_ids = tokenizer.encode(corpus)
    token_ids = [min(i, vocab_cap - 1) for i in raw_ids]
    seq_len = model.config.max_seq_len
    batches = _make_batches(token_ids, seq_len, config.batch_size)
    if not batches:
        # Fallback: single batch with whatever we have
        ids = torch.tensor(token_ids[:seq_len], dtype=torch.long).unsqueeze(0)
        batches = [ids]

    # Optimizer
    if config.optimizer == "adam":
        optimizer = optim.Adam(model.parameters(), lr=config.learning_rate)
    else:
        optimizer = optim.SGD(model.parameters(), lr=config.learning_rate)

    criterion = nn.CrossEntropyLoss()

    # Resume from checkpoint if available
    start_step = 0
    ckpt_path = _latest_checkpoint(output_dir)
    if ckpt_path:
        state = torch.load(ckpt_path, weights_only=True, map_location=next(model.parameters()).device)
        model.load_state_dict(state["model"])
        optimizer.load_state_dict(state["optimizer"])
        start_step = state["step"]

    device = next(model.parameters()).device  # train on whatever device the model lives on
    model.train()
    step = start_step
    batch_idx = 0

    while step < config.max_steps:
        batch = batches[batch_idx % len(batches)]
        # Truncate sequences exceeding max_seq_len
        batch = batch[:, : seq_len].to(device)

        # Input: all tokens except last; target: all tokens except first
        inputs = batch[:, :-1]
        targets = batch[:, 1:]

        logits = model(inputs)  # [batch, seq-1, vocab]
        loss = criterion(
            logits.reshape(-1, logits.size(-1)),
            targets.reshape(-1),
        )

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        step += 1
        batch_idx += 1

        if step % config.log_interval == 0:
            print(f"step={step}  loss={loss.item():.4f}")

        if step % config.checkpoint_interval == 0:
            ckpt = os.path.join(output_dir, f"checkpoint_{step}.pt")
            torch.save(
                {
                    "step": step,
                    "model": model.state_dict(),
                    "optimizer": optimizer.state_dict(),
                },
                ckpt,
            )

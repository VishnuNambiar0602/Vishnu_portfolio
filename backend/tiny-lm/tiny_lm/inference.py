"""Inference engine for TinyLM — greedy, temperature, and top-k decoding."""

from __future__ import annotations

from typing import Literal

import torch
import torch.nn.functional as F

from tiny_lm.config import CheckpointError
from tiny_lm.model import TinyLM
from tiny_lm.tokenizer import Tokenizer


class InferenceEngine:
    """Generates text from a trained TinyLM."""

    def __init__(self, model: TinyLM, tokenizer: Tokenizer) -> None:
        self.model = model
        self.tokenizer = tokenizer

    @classmethod
    def from_checkpoint(
        cls, checkpoint_path: str, model: TinyLM, tokenizer: Tokenizer
    ) -> "InferenceEngine":
        """Load model weights from *checkpoint_path*.

        Raises:
            CheckpointError: If the file is missing or corrupt.
        """
        try:
            state = torch.load(checkpoint_path, weights_only=True)
        except (FileNotFoundError, Exception) as exc:
            raise CheckpointError(
                f"Checkpoint file not found or corrupt: {checkpoint_path}"
            ) from exc
        model.load_state_dict(state["model"])
        return cls(model, tokenizer)

    def generate(
        self,
        prompt: str,
        max_new_tokens: int = 100,
        strategy: Literal["greedy", "temperature", "top_k"] = "greedy",
        temperature: float = 1.0,
        top_k: int = 50,
    ) -> str:
        """Generate a text continuation for *prompt*.

        Returns:
            Generated text string (not including the prompt).
        """
        ids = self._generate_ids(prompt, max_new_tokens, strategy, temperature, top_k)
        return self.tokenizer.decode(ids)

    def _generate_ids(
        self,
        prompt: str,
        max_new_tokens: int,
        strategy: str,
        temperature: float,
        top_k: int,
    ) -> list[int]:
        """Return the raw list of generated token IDs (length == max_new_tokens)."""
        self.model.eval()
        input_ids = torch.tensor([self.tokenizer.encode(prompt)], dtype=torch.long)
        generated: list[int] = []

        with torch.no_grad():
            for _ in range(max_new_tokens):
                context = input_ids[:, -self.model.config.max_seq_len:]
                logits = self.model(context)        # [1, seq, vocab]
                next_logits = logits[0, -1, :]      # [vocab]

                if strategy == "greedy":
                    next_id = int(next_logits.argmax())
                elif strategy == "temperature":
                    probs = F.softmax(next_logits / max(temperature, 1e-8), dim=-1)
                    next_id = int(torch.multinomial(probs, num_samples=1))
                else:  # top_k
                    k = min(top_k, next_logits.size(-1))
                    top_vals, top_ids = torch.topk(next_logits, k)
                    probs = F.softmax(top_vals, dim=-1)
                    idx = int(torch.multinomial(probs, num_samples=1))
                    next_id = int(top_ids[idx])

                generated.append(next_id)
                input_ids = torch.cat(
                    [input_ids, torch.tensor([[next_id]])], dim=1
                )

        return generated

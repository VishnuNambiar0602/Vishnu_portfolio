"""Configuration loading and validation for Tiny LM."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import yaml


# ---------------------------------------------------------------------------
# Custom exceptions
# ---------------------------------------------------------------------------


class TinyLMError(Exception):
    """Base exception for all Tiny LM errors."""


class ConfigError(TinyLMError):
    """Raised when configuration is missing or invalid."""


class TokenizerError(TinyLMError):
    """Raised when the tokenizer vocabulary file is missing or corrupt."""


class CheckpointError(TinyLMError):
    """Raised when a checkpoint file is missing or corrupt."""


# ---------------------------------------------------------------------------
# Configuration dataclasses
# ---------------------------------------------------------------------------


@dataclass
class ModelConfig:
    d_model: int
    n_heads: int
    n_layers: int
    d_ff: int
    max_seq_len: int
    vocab_size: int


@dataclass
class TrainConfig:
    batch_size: int
    learning_rate: float
    optimizer: Literal["sgd", "adam"]
    checkpoint_interval: int
    log_interval: int
    max_steps: int


# ---------------------------------------------------------------------------
# Config loader
# ---------------------------------------------------------------------------

_MODEL_KEYS = ["d_model", "n_heads", "n_layers", "d_ff", "max_seq_len", "vocab_size"]
_TRAIN_KEYS = [
    "batch_size",
    "learning_rate",
    "optimizer",
    "checkpoint_interval",
    "log_interval",
    "max_steps",
]


def load_config(path: str) -> tuple[ModelConfig, TrainConfig]:
    """Load and validate configuration from a YAML file.

    Args:
        path: Path to the YAML configuration file.

    Returns:
        A ``(ModelConfig, TrainConfig)`` tuple.

    Raises:
        ConfigError: If any required key is missing from the file.
        FileNotFoundError: If the file does not exist.
    """
    with open(path) as f:
        raw = yaml.safe_load(f)

    model_raw: dict = raw.get("model", {})
    train_raw: dict = raw.get("training", {})

    # Validate model keys
    for key in _MODEL_KEYS:
        if key not in model_raw:
            raise ConfigError(f"Required config key '{key}' is missing")

    # Validate training keys
    for key in _TRAIN_KEYS:
        if key not in train_raw:
            raise ConfigError(f"Required config key '{key}' is missing")

    model_cfg = ModelConfig(
        d_model=model_raw["d_model"],
        n_heads=model_raw["n_heads"],
        n_layers=model_raw["n_layers"],
        d_ff=model_raw["d_ff"],
        max_seq_len=model_raw["max_seq_len"],
        vocab_size=model_raw["vocab_size"],
    )

    train_cfg = TrainConfig(
        batch_size=train_raw["batch_size"],
        learning_rate=float(train_raw["learning_rate"]),
        optimizer=train_raw["optimizer"],
        checkpoint_interval=train_raw["checkpoint_interval"],
        log_interval=train_raw["log_interval"],
        max_steps=train_raw["max_steps"],
    )

    return model_cfg, train_cfg

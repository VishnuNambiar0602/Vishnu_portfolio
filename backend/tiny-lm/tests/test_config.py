"""Unit and property-based tests for tiny_lm/config.py.

Property 14: Configuration Validation
  For any configuration file missing one or more required hyperparameters,
  loading that configuration should raise an error that names the missing
  parameter(s).
  Validates: Requirements 13.2
"""

from __future__ import annotations

import os
import tempfile

import pytest
import yaml
from hypothesis import given, settings
from hypothesis import strategies as st

from tiny_lm.config import (
    CheckpointError,
    ConfigError,
    ModelConfig,
    TinyLMError,
    TokenizerError,
    TrainConfig,
    load_config,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_VALID_MODEL = {
    "d_model": 128,
    "n_heads": 4,
    "n_layers": 4,
    "d_ff": 512,
    "max_seq_len": 256,
    "vocab_size": 100,
}

_VALID_TRAINING = {
    "batch_size": 32,
    "learning_rate": 3e-4,
    "optimizer": "adam",
    "checkpoint_interval": 500,
    "log_interval": 100,
    "max_steps": 5000,
}

_ALL_MODEL_KEYS = list(_VALID_MODEL.keys())
_ALL_TRAIN_KEYS = list(_VALID_TRAINING.keys())


def _write_config(tmp_path: str, model: dict, training: dict) -> str:
    """Write a YAML config to a temp file and return its path."""
    cfg = {"model": model, "training": training}
    path = os.path.join(tmp_path, "config.yaml")
    with open(path, "w") as f:
        yaml.dump(cfg, f)
    return path


# ---------------------------------------------------------------------------
# Unit tests
# ---------------------------------------------------------------------------


class TestExceptionHierarchy:
    def test_config_error_is_tiny_lm_error(self):
        assert issubclass(ConfigError, TinyLMError)

    def test_tokenizer_error_is_tiny_lm_error(self):
        assert issubclass(TokenizerError, TinyLMError)

    def test_checkpoint_error_is_tiny_lm_error(self):
        assert issubclass(CheckpointError, TinyLMError)


class TestLoadConfigSuccess:
    def test_returns_model_and_train_config(self, tmp_path):
        path = _write_config(str(tmp_path), dict(_VALID_MODEL), dict(_VALID_TRAINING))
        model_cfg, train_cfg = load_config(path)
        assert isinstance(model_cfg, ModelConfig)
        assert isinstance(train_cfg, TrainConfig)

    def test_model_config_values(self, tmp_path):
        path = _write_config(str(tmp_path), dict(_VALID_MODEL), dict(_VALID_TRAINING))
        model_cfg, _ = load_config(path)
        assert model_cfg.d_model == 128
        assert model_cfg.n_heads == 4
        assert model_cfg.n_layers == 4
        assert model_cfg.d_ff == 512
        assert model_cfg.max_seq_len == 256
        assert model_cfg.vocab_size == 100

    def test_train_config_values(self, tmp_path):
        path = _write_config(str(tmp_path), dict(_VALID_MODEL), dict(_VALID_TRAINING))
        _, train_cfg = load_config(path)
        assert train_cfg.batch_size == 32
        assert train_cfg.learning_rate == pytest.approx(3e-4)
        assert train_cfg.optimizer == "adam"
        assert train_cfg.checkpoint_interval == 500
        assert train_cfg.log_interval == 100
        assert train_cfg.max_steps == 5000

    def test_loads_default_config_yaml(self):
        """The bundled config.yaml should load without errors."""
        here = os.path.dirname(os.path.dirname(__file__))
        default_path = os.path.join(here, "tiny_lm", "config.yaml")
        # vocab_size is null in the default file — that's allowed at load time
        # (validation of values happens in the component constructors)
        model_cfg, train_cfg = load_config(default_path)
        assert isinstance(model_cfg, ModelConfig)
        assert isinstance(train_cfg, TrainConfig)


class TestLoadConfigMissingFile:
    def test_raises_file_not_found(self, tmp_path):
        with pytest.raises(FileNotFoundError):
            load_config(str(tmp_path / "nonexistent.yaml"))


class TestLoadConfigMissingKeys:
    @pytest.mark.parametrize("missing_key", _ALL_MODEL_KEYS)
    def test_missing_model_key_raises_config_error(self, tmp_path, missing_key):
        model = {k: v for k, v in _VALID_MODEL.items() if k != missing_key}
        path = _write_config(str(tmp_path), model, dict(_VALID_TRAINING))
        with pytest.raises(ConfigError) as exc_info:
            load_config(path)
        assert missing_key in str(exc_info.value)

    @pytest.mark.parametrize("missing_key", _ALL_TRAIN_KEYS)
    def test_missing_training_key_raises_config_error(self, tmp_path, missing_key):
        training = {k: v for k, v in _VALID_TRAINING.items() if k != missing_key}
        path = _write_config(str(tmp_path), dict(_VALID_MODEL), training)
        with pytest.raises(ConfigError) as exc_info:
            load_config(path)
        assert missing_key in str(exc_info.value)

    def test_error_message_format(self, tmp_path):
        """Error message must follow the exact format from the design doc."""
        model = {k: v for k, v in _VALID_MODEL.items() if k != "d_model"}
        path = _write_config(str(tmp_path), model, dict(_VALID_TRAINING))
        with pytest.raises(ConfigError) as exc_info:
            load_config(path)
        assert str(exc_info.value) == "Required config key 'd_model' is missing"


# ---------------------------------------------------------------------------
# Property-based tests
# ---------------------------------------------------------------------------

# Feature: tiny-lm-educator, Property 14: Configuration Validation
# For any configuration file missing one or more required hyperparameters,
# loading that configuration should raise an error that names the missing
# parameter(s).
# Validates: Requirements 13.2

_ALL_REQUIRED_KEYS = _ALL_MODEL_KEYS + _ALL_TRAIN_KEYS


@given(
    missing_keys=st.lists(
        st.sampled_from(_ALL_REQUIRED_KEYS),
        min_size=1,
        max_size=len(_ALL_REQUIRED_KEYS),
        unique=True,
    )
)
@settings(max_examples=20)
def test_property_14_config_validation(missing_keys):
    """Property 14: any config missing required keys raises ConfigError naming the key.

    Validates: Requirements 13.2
    """
    model = {k: v for k, v in _VALID_MODEL.items() if k not in missing_keys}
    training = {k: v for k, v in _VALID_TRAINING.items() if k not in missing_keys}

    with tempfile.TemporaryDirectory() as tmp:
        path = _write_config(tmp, model, training)
        with pytest.raises(ConfigError) as exc_info:
            load_config(path)
        # The error message must name at least one of the missing keys
        error_msg = str(exc_info.value)
        assert any(key in error_msg for key in missing_keys), (
            f"ConfigError message {error_msg!r} does not name any of the "
            f"missing keys: {missing_keys}"
        )

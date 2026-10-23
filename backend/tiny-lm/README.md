# Tiny LM

A decoder-only transformer language model written from scratch in PyTorch: character tokenizer, sinusoidal positions, multi-head attention, pre-norm blocks, a training loop and greedy, temperature and top-k sampling.

```bash
pip install torch numpy pyyaml pytest hypothesis
pytest                      # 67 tests
python train_demo.py        # trains the demo model on this repository's own source (about 7 minutes on a laptop GPU)
python export_weights.py    # writes the weights and reference outputs the website uses
```

`educator/` is a static Next.js teaching site (annotated source, diagrams, exercises). `npm install && npm test && npm run build` there. Regenerate its annotations with `npm run annotations`.

The demo model (0.82M parameters) reached a held-out perplexity of 10.7 against 97 for random guessing. It was trained on 719K characters, so it partly memorises its corpus (training loss 1.2 against held-out 2.4); the browser demo on the portfolio site says so.

Changes made while preparing it for the portfolio: the training loop now runs on whatever device the model is on (it was CPU-only), the annotation script works from any folder, and the teaching site's TypeScript target and Next.js version were updated so it builds.

"""Reproducible self-consistency benchmark for the diagnosis engine.

There is no labelled clinical dataset in this repo, so cases are simulated: draw k symptoms
from a condition's knowledge-base entry (optionally swapped for a synonym, optionally with
distractor symptoms from other conditions) and check whether the model ranks that condition
first / in its top three. This measures how consistently the scorer recovers the condition it
was built from. It is NOT clinical validation.

    python benchmark.py [--per-condition 160] [--seed 7] [--json out.json]
"""
import argparse
import json
import random
import time

from model import initialize_model


def simulate(model, k, distractors, synonyms, per_condition, seed):
    rng = random.Random(seed)
    kb = model.knowledge_base
    diseases, kws = kb["diseases"], kb["symptom_keywords"]
    top1 = top3 = total = 0
    latencies = []
    for did, info in diseases.items():
        pool = [s for o, d in diseases.items() if o != did for s in d["symptoms"] if s not in info["symptoms"]]
        for _ in range(per_condition):
            picked = rng.sample(info["symptoms"], min(k, len(info["symptoms"])))
            if synonyms:
                picked = [rng.choice(kws[s]) if s in kws else s for s in picked]
            picked += rng.sample(pool, distractors)
            rng.shuffle(picked)
            start = time.perf_counter()
            ranked = model.diagnose(", ".join(picked)).get("possible_diseases", [])
            latencies.append((time.perf_counter() - start) * 1000)
            ids = [r["disease_id"] for r in ranked]
            total += 1
            top1 += ids[:1] == [did]
            top3 += did in ids[:3]
    latencies.sort()
    return {
        "symptoms": k, "distractors": distractors, "synonyms": synonyms, "cases": total,
        "top1_pct": round(100 * top1 / total, 1), "top3_pct": round(100 * top3 / total, 1),
        "latency_p50_ms": round(latencies[len(latencies) // 2], 1),
        "latency_p95_ms": round(latencies[int(len(latencies) * 0.95)], 1),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-condition", type=int, default=160)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--json")
    args = ap.parse_args()
    model = initialize_model()
    settings = [(2, 0, False), (3, 0, False), (4, 0, False), (3, 1, False), (3, 0, True), (3, 1, True)]
    rows = [simulate(model, k, d, s, args.per_condition, args.seed) for k, d, s in settings]
    print(f"{'symptoms':>8} {'distract':>8} {'synonym':>7} {'cases':>6} {'top1%':>6} {'top3%':>6} {'p50ms':>6} {'p95ms':>6}")
    for r in rows:
        print(f"{r['symptoms']:>8} {r['distractors']:>8} {str(r['synonyms']):>7} {r['cases']:>6} "
              f"{r['top1_pct']:>6} {r['top3_pct']:>6} {r['latency_p50_ms']:>6} {r['latency_p95_ms']:>6}")
    if args.json:
        with open(args.json, "w") as f:
            json.dump({"seed": args.seed, "per_condition": args.per_condition, "rows": rows}, f, indent=2)


if __name__ == "__main__":
    main()

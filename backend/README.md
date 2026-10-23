# Backend: projects

Source for the four projects shown on the portfolio site. Each folder is self-contained, with its own README, tests and instructions. The fixes made while preparing the portfolio (bugs found by running and testing each project) are listed in each project's section on the site.

| Folder | What it is | Tests |
|---|---|---|
| [`medical-xai`](medical-xai) | Explainable symptom-to-condition ranking (Flask API, React front end) | `python benchmark.py` (simulated-case benchmark) |
| [`restaurant-forecasting`](restaurant-forecasting) | Revenue (SARIMA) and footfall (gradient boosting) forecasting CLI | `pytest`, 6 tests |
| [`autonomous-engineering-harness`](autonomous-engineering-harness) | Bounded multi-agent coding pipeline | `pytest`, 10 tests |
| [`mlops-agent`](mlops-agent) | Generates a deployable MLOps project from a Python model file | `npm test`, 7 tests |

The portfolio site that demonstrates them is in `../frontend`.

## Run everything's tests

```bash
(cd restaurant-forecasting && pip install -r requirements.txt && pytest)
(cd autonomous-engineering-harness && pip install -e ".[dev]" && pytest)
(cd mlops-agent && npm install && npm test)
```

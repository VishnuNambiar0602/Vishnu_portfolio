# Vishnu Nambiar, portfolio

One repository, two folders.

| Folder | What it is |
|---|---|
| [`frontend/`](frontend) | The portfolio site: plain HTML, CSS and JavaScript, no build step. Live demos, resume generator, chat. |
| [`backend/`](backend) | Source of the five projects the site demonstrates: Medical XAI, Tiny LM, restaurant forecasting, the autonomous engineering harness and the MLOps agent. Each has its own tests. |

The site's demos run in the browser, using exports from the backend projects (model files, benchmark results, real run traces). The frontend's tests check that each browser port reproduces its Python original.

## Run the site locally

```bash
cd frontend
python -m http.server 8765      # then open http://localhost:8765
```

## Deploy

The site (`frontend/`) deploys to **Vercel**, the optional Medical XAI API to **Render**, and the optional Tiny LM lessons site to a second Vercel project. Step by step, with the settings to use and how to check each one: [DEPLOY.md](DEPLOY.md). The configuration is in `frontend/vercel.json` and `render.yaml`.

## Tests

```bash
(cd frontend && npm install && npm test)                                          # browser ports, chat, resume
(cd backend/restaurant-forecasting && pip install -r requirements.txt && pytest)  # 6 tests
(cd backend/medical-xai/Medical-XAI/backend && pip install -r requirements.txt pytest && pytest test_api.py)  # 4 tests
(cd backend/tiny-lm && pip install torch numpy pyyaml pytest hypothesis && pytest)  # 67 tests
(cd backend/tiny-lm/educator && npm install && npm test)                       # 26 tests
(cd backend/autonomous-engineering-harness && pip install -e ".[dev]" && pytest)  # 10 tests
(cd backend/mlops-agent && npm install && npm test)                               # 7 tests
```

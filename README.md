# Vishnu Nambiar, portfolio

One repository, two folders.

| Folder | What it is |
|---|---|
| [`frontend/`](frontend) | The portfolio site: plain HTML, CSS and JavaScript, no build step. Live demos, resume generator, chat. |
| [`backend/`](backend) | Source of the four projects the site demonstrates: Medical XAI, restaurant forecasting, the autonomous engineering harness and the MLOps agent. Each has its own README and tests. |

The site's demos run in the browser, using exports from the backend projects (model files, benchmark results, real run traces). The frontend's tests check that each browser port reproduces its Python original.

## Run the site locally

```bash
cd frontend
python -m http.server 8765      # then open http://localhost:8765
```

## Publish

1. Create a GitHub repository named `vishnu-portfolio` (or change `REPO` in `frontend/js/config.js`) and push this folder to it.
2. Settings, Pages, Source: **GitHub Actions**.
3. Every push to `main` runs all tests and, if they pass, deploys `frontend/` to Pages. The "Source code" links on the site point at `backend/<project>` in this repository.

## Tests

```bash
(cd frontend && npm install && npm test)                                          # browser ports, chat, resume
(cd backend/restaurant-forecasting && pip install -r requirements.txt && pytest)  # 6 tests
(cd backend/autonomous-engineering-harness && pip install -e ".[dev]" && pytest)  # 10 tests
(cd backend/mlops-agent && npm install && npm test)                               # 7 tests
```

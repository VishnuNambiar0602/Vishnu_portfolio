# Vishnu Nambiar, portfolio site

Static site: plain HTML, CSS and JavaScript, no build step. The project source lives in `../backend`.

```
index.html, css/, js/, assets/   the site
data/                            profile, chatbot facts, model exports and benchmark results the demos read
vendor/                          jsPDF (MIT), used to build the resume PDF in the browser
scripts/                         regenerate data from the projects repo and verify the browser ports
tests/resume/                    sample job descriptions for the resume tests
DESIGN.md                        colours, type, spacing
```

## Run locally

```bash
python -m http.server 8765     # then open http://localhost:8765
```

Opening `index.html` directly will not work, because the demos fetch JSON.

## Publish

See the root README: push the whole repository, set Pages to GitHub Actions, and the workflow deploys this folder after all tests pass.

## Resume and chat

- **Download resume** (hero button) builds a one-page, text-based PDF in the browser from `data/profile.json`. Edit that file to change any fact; nothing else holds resume content.
- **Chat** answers visitor questions from `data/faq.json` (retrieval only, so it cannot invent facts). An opt-in on-device model (Qwen2.5-0.5B via WebLLM, WebGPU) can phrase answers from the same facts.
- The phone number is in `profile.json` but deliberately not printed on the PDF. Add it in `js/resume/tailor.js` (`contact`) if you want it.

## Tests and regenerating data

```bash
npm install && npm test        # Medical, footfall and import-analysis parity, chat retrieval, resume guarantees
```

The browser ports are checked against the Python originals. To regenerate the exported data after changing a project (reads the projects from `../backend`):

```bash
python scripts/export_medical.py && python scripts/export_forecast.py && python scripts/export_deps.py
python scripts/export_harness_traces.py
```

# Deploying: Vercel and Render

The repository holds three things that deploy differently:

| What | Folder | Where | Why |
|---|---|---|---|
| The portfolio site | `frontend/` | **Vercel** | It is static HTML, CSS and JavaScript. Every demo runs in the browser, so no server is needed. |
| Tiny LM teaching site (optional) | `backend/tiny-lm/educator/` | **Vercel**, second project | A static Next.js site. |
| Medical XAI API (optional) | `backend/medical-xai/Medical-XAI/backend/` | **Render** | A Flask API, the only part that needs a server. The site's Medical demo does not call it. |

Render is not needed for the portfolio to work. It makes the Flask API live, so you can link it.

## 0. Push the code

```bash
git push        # repository: https://github.com/VishnuNambiar0602/Vishnu_portfolio
```

Vercel and Render both build from GitHub, so everything below starts from a pushed `main`.

## 1. The portfolio site on Vercel

1. Sign in at vercel.com with GitHub.
2. **Add New, Project**, and import `Vishnu_portfolio`. (If it is not listed, click "Adjust GitHub App Permissions" and allow that repository.)
3. Set these three things and leave everything else alone:
   - **Root Directory:** `frontend`
   - **Framework Preset:** `Other`
   - **Build Command, Output Directory:** leave empty (there is no build step).
4. **Deploy.** You get `https://<name>.vercel.app` in about a minute. Every later push to `main` redeploys; every other branch gets a preview URL.

Check it: open the URL and confirm that
- the five project tabs load and the Tiny LM generates text,
- the chat shows "On-device language model ready" after you open it (the model comes from jsDelivr and Hugging Face, which need no setup),
- **Download resume** downloads a one-page PDF,
- the **Human / Machine** switch shows the text view and downloads the `.txt`,
- your private owner command does **not** work here. That is on purpose: its code is in a git-ignored folder, so it is never deployed and only exists on your own machine.

Optional: **Settings, Domains** to attach your own domain. Vercel shows the DNS records to add.

Fair use: Vercel's free Hobby plan is meant for personal, non-commercial projects. A portfolio fits, but read their terms if you will use the site to sell freelance work.

## 2. The Tiny LM teaching site on Vercel (optional)

Repeat step 1 with a second project from the same repository:
- **Root Directory:** `backend/tiny-lm/educator`
- **Framework Preset:** `Next.js` (detected automatically)

Then put its URL in `frontend/js/config.js`:

```js
export const EDUCATOR_URL = "https://<your-lessons>.vercel.app";
```

Commit and push; an "Interactive lessons" link appears under Tiny LM.

## 3. The Medical XAI API on Render (optional)

1. Sign in at render.com with GitHub.
2. **New, Blueprint**, pick `Vishnu_portfolio`. Render reads `render.yaml` at the repository root and proposes one web service, `medical-xai-api`.
3. It asks for **ALLOWED_ORIGINS**. Enter your Vercel site URL with no trailing slash, for example `https://vishnu-portfolio.vercel.app`. Use `*` while testing.
4. **Apply.** The first build takes a few minutes.
5. Test it (replace the URL with yours):

```bash
curl https://medical-xai-api.onrender.com/health
# {"model_loaded":true,"status":"healthy"}

curl -X POST https://medical-xai-api.onrender.com/diagnose \
  -H "Content-Type: application/json" \
  -d '{"symptoms":"fever, cough, sore throat, fatigue","days":3}'
```

6. Put the URL in `frontend/js/config.js` so the site links to it:

```js
export const MEDICAL_API_URL = "https://medical-xai-api.onrender.com";
```

The free Render plan puts the service to sleep after about 15 minutes without traffic, and the first request afterwards takes up to a minute to wake it. That is fine for a demo link; say so if you share it with someone.

## When something goes wrong

| Symptom | Cause and fix |
|---|---|
| Site shows an old version after a deploy | Hard refresh (Ctrl+Shift+R). Browsers cache module files. |
| A demo says it "could not load" | The files are fetched with relative paths, so Root Directory must be `frontend`, not the repository root. |
| Chat says "Using keyword matching" | The language model could not download (offline, or a blocker on `cdn.jsdelivr.net` or `huggingface.co`). The chat still answers from the same facts. |
| Vercel build fails on the lessons site | Check Root Directory is `backend/tiny-lm/educator` and Node 18 or newer. |
| Render build fails with a NumPy or scikit-learn error | Keep `PYTHON_VERSION` at `3.12.8` in `render.yaml`; newer Python versions need newer wheels. |
| Browser console shows a CORS error calling the API | `ALLOWED_ORIGINS` on Render must exactly match the site URL (scheme and host, no trailing slash). |

## Keeping private things private

`frontend/js/private/` and `PRIVATE.md` are git-ignored, so neither Vercel nor Render ever sees them. Before every push, `git status` should list neither. Never commit `.env` files or key files; the repository's `.gitignore` already blocks `.env` and `*.pem`.

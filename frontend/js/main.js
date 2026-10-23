import { REPOS, EDUCATOR_URL, MEDICAL_API_URL } from "./config.js";

const tabs = [...document.querySelectorAll('[role="tab"]')];
const mounted = new Set();

// Each demo loads its code and data the first time its panel opens.
const demos = {
  medical: () => import("./medical-ui.js").then((m) => m.mount()),
  harness: () => import("./harness-ui.js").then((m) => m.mount()),
  mlops: () => import("./mlops-ui.js").then((m) => m.mount()),
  forecast: () => import("./forecast-ui.js").then((m) => m.mount()),
  tinylm: () => import("./tinylm-ui.js").then((m) => m.mount()),
};

function showError(panel, err) {
  const p = document.createElement("p");
  p.className = "callout";
  p.textContent = `This demo could not load (${err.message}). If you opened the file directly, serve the folder with a local web server instead.`;
  panel.querySelector(".demo")?.prepend(p);
}

function select(tab, { focus = false, remember = false } = {}) {
  for (const t of tabs) {
    const on = t === tab;
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
  }
  if (focus) tab.focus();
  const key = tab.id.replace("tab-", "");
  if (!mounted.has(key)) {
    mounted.add(key);
    demos[key]().catch((err) => showError(document.getElementById(tab.getAttribute("aria-controls")), err));
  }
  if (remember) history.replaceState(null, "", `#project-${key}`);
}

tabs.forEach((tab, i) => {
  tab.addEventListener("click", () => select(tab, { remember: true }));
  tab.addEventListener("keydown", (e) => {
    const move = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!move && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const j = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (i + move + tabs.length) % tabs.length;
    select(tabs[j], { focus: true, remember: true });
  });
});

// Deep links such as #project-forecast open that project and scroll to it.
function openFromHash() {
  const m = location.hash.match(/^#project-(\w+)$/);
  const tab = m && tabs.find((t) => t.id === `tab-${m[1]}`);
  if (!tab) return false;
  select(tab);
  document.getElementById("projects").scrollIntoView();
  return true;
}
window.addEventListener("hashchange", openFromHash);
document.querySelectorAll(".start-list a").forEach((a) => a.addEventListener("click", () => setTimeout(openFromHash, 0)));
if (!openFromHash()) select(tabs[0]);

// Source links point at each project repository (see js/config.js) (see js/config.js).
document.querySelectorAll("a[data-repo]").forEach((a) => { a.href = REPOS[a.dataset.repo]; });

// Optional live links, shown only once their URLs are set in config.js.
for (const [panel, url, label] of [["panel-tinylm", EDUCATOR_URL, "Interactive lessons"], ["panel-medical", MEDICAL_API_URL && `${MEDICAL_API_URL}/health`, "Live API (health check)"]]) {
  if (!url) continue;
  const li = document.createElement("li"), a = document.createElement("a");
  a.href = url; a.textContent = label; li.append(a);
  document.querySelector(`#${panel} .links`).append(li);
}

// Highlight the nav item for the section in view.
const links = [...document.querySelectorAll(".site-nav a")];
const sections = links.map((a) => document.querySelector(a.getAttribute("href")));
const seen = new Map();
const io = new IntersectionObserver((entries) => {
  for (const e of entries) seen.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
  const [id, ratio] = [...seen.entries()].sort((a, b) => b[1] - a[1])[0];
  links.forEach((a) => (ratio > 0 && a.getAttribute("href") === `#${id}` ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
}, { rootMargin: "-30% 0px -50% 0px", threshold: [0, 0.1, 0.5, 1] });
sections.forEach((s) => s && io.observe(s));

// Resume download: generated in the browser on click.
const resumeBtn = document.getElementById("resume-btn");
resumeBtn.addEventListener("click", async () => {
  const label = resumeBtn.textContent;
  resumeBtn.disabled = true; resumeBtn.textContent = "Preparing PDF...";
  try {
    const { createResume, saveBlob } = await import("./resume/index.js");
    saveBlob((await createResume()).blob, "Vishnu_Nambiar_Resume.pdf");
    resumeBtn.textContent = label;
  } catch {
    resumeBtn.textContent = "Could not build the PDF. Try again";
  }
  resumeBtn.disabled = false;
});

// Human / machine toggle. Machine view is the whole site as plain text, with a .txt download.
const modeBtn = document.getElementById("mode-toggle");
const machineSec = document.getElementById("machine");
const machinePre = document.getElementById("machine-text");
let humanScroll = 0;
async function setMachine(on, { remember = true } = {}) {
  modeBtn.setAttribute("aria-checked", String(on));
  if (on) {
    humanScroll = scrollY;
    machinePre.textContent = "Building the text version...";
    document.body.classList.add("machine"); machineSec.hidden = false;
    scrollTo(0, 0);
    try {
      const { buildSiteText } = await import("./machine.js");
      machinePre.textContent = await buildSiteText();
    } catch (err) {
      machinePre.textContent = `Could not build the text version (${err.message}).`;
    }
  } else {
    machineSec.hidden = true; document.body.classList.remove("machine");
    scrollTo(0, humanScroll);
  }
  if (remember) history.replaceState(null, "", on ? "#machine" : location.pathname + location.search);
}
modeBtn.addEventListener("click", () => setMachine(modeBtn.getAttribute("aria-checked") !== "true"));
document.getElementById("machine-download").addEventListener("click", async () => {
  const { buildSiteText, downloadText } = await import("./machine.js");
  downloadText(await buildSiteText());
});
document.getElementById("machine-copy").addEventListener("click", async (e) => {
  const { buildSiteText } = await import("./machine.js");
  const note = document.getElementById("machine-note");
  try { await navigator.clipboard.writeText(await buildSiteText()); note.textContent = "Copied the whole text to your clipboard."; }
  catch { note.textContent = "Could not copy automatically. Select the text and copy it."; }
});
if (location.hash === "#machine") setMachine(true, { remember: false });

import("./contact.js").then((m) => m.mount());
import("./chat/chat.js").then((m) => m.mountChat()).catch(() => {});

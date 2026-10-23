import { BACKEND_URL } from "./config.js";

const tabs = [...document.querySelectorAll('[role="tab"]')];
const mounted = new Set();

// Each demo loads its code and data the first time its panel opens.
const demos = {
  medical: () => import("./medical-ui.js").then((m) => m.mount()),
  harness: () => import("./harness-ui.js").then((m) => m.mount()),
  mlops: () => import("./mlops-ui.js").then((m) => m.mount()),
  forecast: () => import("./forecast-ui.js").then((m) => m.mount()),
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

// Source links point at backend/ in the repository (see js/config.js).
document.querySelectorAll("a[data-repo]").forEach((a) => { a.href = `${BACKEND_URL}/${a.dataset.repo}`; });

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

import("./contact.js").then((m) => m.mount());
import("./chat/chat.js").then((m) => m.mountChat()).catch(() => {});

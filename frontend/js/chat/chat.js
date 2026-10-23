import { el } from "../dom.js";
import { buildIndex, reply, retrieve } from "./brain.js";

const SUGGESTIONS = ["What has he built?", "What is his tech stack?", "Is he available for internships?"];

export async function mountChat() {
  const faq = await fetch("data/faq.json").then((r) => r.json());
  const index = buildIndex(faq);
  let slm = null; // loaded lazily, only if the visitor opts in
  let owner = null; // owner-only tools: present only on localhost, from a file that is not published
  let busy = false;

  const log = el("div", { class: "chat-log", role: "log", "aria-live": "polite", "aria-label": "Conversation" });
  const input = el("textarea", { class: "chat-input", rows: "1", placeholder: "Ask about Vishnu", "aria-label": "Message" });
  const send = el("button", { class: "btn small primary", type: "submit", text: "Send" });
  const status = el("p", { class: "chat-status", hidden: true });
  const modelBtn = el("button", { class: "chat-link", type: "button", text: "Use on-device language model" });
  const chips = el("div", { class: "chat-chips" }, SUGGESTIONS.map((s) => el("button", { class: "chip", type: "button", text: s, onclick: () => submit(s) })));

  const panel = el("aside", { class: "chat-panel", id: "chat-panel", "aria-label": "Chat about Vishnu", hidden: true },
    el("div", { class: "chat-head" },
      el("b", { text: "Ask about Vishnu" }),
      el("button", { class: "chat-close", type: "button", "aria-label": "Close chat", text: "Close", onclick: () => toggle(false) })),
    log, chips, status,
    el("form", { class: "chat-form", onsubmit: (e) => { e.preventDefault(); submit(input.value); } }, input, send),
    el("div", { class: "chat-foot" }, modelBtn, el("span", { text: "Answers come from facts on this site. Nothing you type leaves your browser." })));

  const opener = el("button", { class: "chat-open", type: "button", "aria-expanded": "false", "aria-controls": "chat-panel", text: "Ask about Vishnu", onclick: () => toggle(true) });
  document.body.append(opener, panel);

  function toggle(open) {
    panel.hidden = !open;
    opener.hidden = open;
    opener.setAttribute("aria-expanded", String(open));
    if (open) { if (!log.children.length) say("bot", "Hi. Ask me about Vishnu's projects, skills, experience or how to contact him."); input.focus(); }
    else opener.focus();
  }
  panel.addEventListener("keydown", (e) => { if (e.key === "Escape") toggle(false); });

  function say(who, text, extra) {
    const body = el("div", { class: "msg-body" }, text);
    if (extra) body.append(...[].concat(extra));
    const row = el("div", { class: `msg ${who}` }, el("span", { class: "msg-who", text: who === "bot" ? "Assistant" : "You" }), body);
    log.append(row);
    log.scrollTop = log.scrollHeight;
    return { row, body };
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(input.value); }
  });
  input.addEventListener("input", () => { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 120) + "px"; });

  async function submit(raw) {
    const text = raw.trim();
    if (!text || busy) return;
    input.value = ""; input.style.height = "auto";
    chips.hidden = true;
    busy = true;
    try {
      if (owner && (await owner.tryHandle(text))) return;
      say("user", text); await answer(text);
    } finally { busy = false; input.focus(); }
  }

  async function answer(text) {
    const r = reply(index, text);
    const link = r.link ? el("a", { class: "chat-ref", href: r.link.href, text: r.link.label }) : null;
    if (!slm || !r.hits.length) { say("bot", r.text, link && [el("br"), link]); return; }
    const facts = retrieve(index, text, 3).map((h) => h.f.text);
    const msg = say("bot", "...");
    try {
      const out = await slm.answer(text, facts, (t) => { msg.body.textContent = t; log.scrollTop = log.scrollHeight; });
      msg.body.textContent = out || r.text;
      if (link) msg.body.append(el("br"), link);
    } catch {
      msg.body.textContent = r.text; // fall back to the curated answer
      if (link) msg.body.append(el("br"), link);
    }
  }

  if (["localhost", "127.0.0.1", "[::1]"].includes(location.hostname)) {
    try { owner = (await import("../private/owner-tools.js")).createOwnerTools({ say, el }); } catch { /* file not present: normal public behaviour */ }
  }

  // Optional on-device model
  modelBtn.addEventListener("click", async () => {
    if (slm) return;
    const mod = await import("./slm.js");
    if (!mod.supported()) { say("bot", "On-device models need WebGPU, which this browser does not offer. The standard answers still work."); return; }
    if (!confirm("This downloads about 400 MB of model files once and needs roughly 1 GB of GPU memory. Your messages stay in this browser. Continue?")) return;
    status.hidden = false; modelBtn.disabled = true;
    try {
      await mod.load((t, p) => { status.textContent = `${t} (${Math.round(p * 100)}%)`; });
      slm = mod; status.textContent = "On-device model ready. Answers are phrased by the model from the same facts and may be less exact."; modelBtn.textContent = "On-device model on";
    } catch (err) { status.textContent = `Could not load the model: ${err.message}`; modelBtn.disabled = false; }
  });
}

import { el } from "../dom.js";
import { buildIndex, reply } from "./brain.js";

const SUGGESTIONS = ["What has he built?", "What is his tech stack?", "Is he available for internships?"];

export async function mountChat() {
  const faq = await fetch("data/faq.json").then((r) => r.json());
  const index = buildIndex(faq);
  let semantic = null; // the on-device language model, loaded in the background when the chat first opens
  let owner = null; // owner-only tools: present only on localhost, from a file that is not published
  let busy = false;
  let loading = false;

  const log = el("div", { class: "chat-log", role: "log", "aria-live": "polite", "aria-label": "Conversation" });
  const input = el("textarea", { class: "chat-input", rows: "1", placeholder: "Ask about Vishnu", "aria-label": "Message" });
  const send = el("button", { class: "btn small primary", type: "submit", text: "Send" });
  const status = el("p", { class: "chat-status", role: "status" });
  const chips = el("div", { class: "chat-chips" }, SUGGESTIONS.map((s) => el("button", { class: "chip", type: "button", text: s, onclick: () => submit(s) })));

  const panel = el("aside", { class: "chat-panel", id: "chat-panel", "aria-label": "Chat about Vishnu", hidden: true },
    el("div", { class: "chat-head" },
      el("b", { text: "Ask about Vishnu" }),
      el("button", { class: "chat-close", type: "button", "aria-label": "Close chat", text: "Close", onclick: () => toggle(false) })),
    log, chips, status,
    el("form", { class: "chat-form", onsubmit: (e) => { e.preventDefault(); submit(input.value); } }, input, send),
    el("div", { class: "chat-foot" }, el("span", { text: "Every answer is a verified fact about Vishnu. Nothing you type leaves your browser." })));

  const opener = el("button", { class: "chat-open", type: "button", "aria-expanded": "false", "aria-controls": "chat-panel", text: "Ask about Vishnu", onclick: () => toggle(true) });
  document.body.append(opener, panel);

  function toggle(open) {
    panel.hidden = !open;
    opener.hidden = open;
    opener.setAttribute("aria-expanded", String(open));
    if (open) {
      if (!log.children.length) say("bot", "Hi. Ask me about Vishnu's projects, skills, experience or how to contact him.");
      input.focus();
      startSemantic();
    } else opener.focus();
  }
  panel.addEventListener("keydown", (e) => { if (e.key === "Escape") toggle(false); });

  // The language model improves matching but is not required: until it loads, or if it cannot
  // (offline, blocked CDN), the keyword matcher answers from the same facts.
  async function startSemantic() {
    if (semantic || loading) return;
    loading = true;
    try {
      const { Semantic } = await import("./semantic.js");
      semantic = await Semantic.load(faq, (t) => { status.textContent = t; });
      status.textContent = "On-device language model ready (MiniLM). It matches your question to verified facts by meaning.";
    } catch {
      status.textContent = "Using keyword matching (the language model could not load).";
    }
    loading = false;
  }

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
      say("user", text);
      let sims = null;
      if (semantic) { try { sims = await semantic.similarities(text); } catch { /* fall back to keywords */ } }
      const r = reply(index, text, sims);
      const link = r.link ? el("a", { class: "chat-ref", href: r.link.href, text: r.link.label }) : null;
      say("bot", r.text, link && [el("br"), link]);
    } finally { busy = false; input.focus(); }
  }

  if (["localhost", "127.0.0.1", "[::1]"].includes(location.hostname)) {
    try { owner = (await import("../private/owner-tools.js")).createOwnerTools({ say, el }); } catch { /* file not present: normal public behaviour */ }
  }
}

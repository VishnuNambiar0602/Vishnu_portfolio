import { el } from "./dom.js";
import { EMAIL } from "./config.js";

// Each intent drafts a different email, so the visitor starts from something specific instead of a blank box.
const INTENTS = [
  { id: "role", label: "A job or internship", subject: "Opportunity: {role}",
    body: "Hi Vishnu,\n\nI am {name}{org}. We are hiring for [role] and your portfolio stood out, especially [project you liked].\n\nThe role: [one line]\nTeam and location: [details]\nTimeline: [when you would start]\n\nWould you be open to a short call this week?\n\n{name}" },
  { id: "freelance", label: "A freelance project", subject: "Project enquiry",
    body: "Hi Vishnu,\n\nI am {name}{org}. I would like help building [what you need].\n\nWhat it should do: [two or three lines]\nData or systems involved: [details]\nDeadline: [date]\nBudget range: [optional]\n\nCould we talk about whether it is a fit?\n\n{name}" },
  { id: "collab", label: "A collaboration", subject: "Collaboration idea",
    body: "Hi Vishnu,\n\nI am {name}{org}. I have an idea I think you would enjoy: [the idea in two lines].\n\nWhat I bring: [skills or resources]\nWhat I am hoping you can add: [your part]\n\nInterested in talking it through?\n\n{name}" },
  { id: "hello", label: "Just saying hello", subject: "Hello from your portfolio",
    body: "Hi Vishnu,\n\nI am {name}{org} and I was looking through your portfolio. [What caught your eye, or a question about a project.]\n\nThanks,\n{name}" },
];

export function mount() {
  const group = document.getElementById("c-intent");
  const name = document.getElementById("c-name");
  const org = document.getElementById("c-org");
  const msg = document.getElementById("c-msg");
  const send = document.getElementById("c-send");
  const copy = document.getElementById("c-copy");
  const status = document.getElementById("c-status");
  let intent = INTENTS[0];
  let edited = false; // once the visitor types in the message, stop overwriting it

  const opts = el("div", { class: "opts" }, INTENTS.map((it, i) =>
    el("label", { class: "opt" },
      el("input", { type: "radio", name: "intent", value: it.id, checked: i === 0, onchange: () => { intent = it; edited = false; fill(); } }),
      el("span", { text: it.label }))));
  group.append(opts);

  const fill = () => {
    if (!edited) msg.value = intent.body.replaceAll("{name}", name.value.trim() || "[your name]").replace("{org}", org.value.trim() ? ` from ${org.value.trim()}` : "");
    link();
  };
  const subject = () => intent.subject.replace("{role}", org.value.trim() ? `${org.value.trim()}` : "[role]");
  const link = () => { send.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject())}&body=${encodeURIComponent(msg.value)}`; };

  name.addEventListener("input", fill);
  org.addEventListener("input", fill);
  msg.addEventListener("input", () => { edited = true; link(); });
  copy.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(`To: ${EMAIL}\nSubject: ${subject()}\n\n${msg.value}`); status.textContent = "Draft copied."; }
    catch { msg.select(); status.textContent = "Select the text and copy it."; }
  });
  fill();
}

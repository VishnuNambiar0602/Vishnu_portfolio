import { el, clear, loadJSON, reducedMotion } from "./dom.js";

const NODES = [
  ["architect", "Architect", "Plans tasks"],
  ["worker", "Worker", "Writes a diff"],
  ["validator", "Validator", "git apply --check"],
  ["executor", "Executor", "Runs one command"],
  ["reviewer", "Reviewer", "Tries to disprove it"],
];

function describe(e, limits) {
  switch (e.node) {
    case "architect": return [`Planned ${e.tasks.length} task${e.tasks.length === 1 ? "" : "s"}: ${e.tasks.join(", ")}.`, ""];
    case "worker": return [`Wrote a diff for ${e.task}.`, ""];
    case "validator": return e.ok
      ? [`Diff for ${e.task} applies cleanly.`, "ok"]
      : [`Diff for ${e.task} rejected: ${(e.errors[0] || "invalid").split("\n")[0].slice(0, 90)}`, "bad"];
    case "executor": return [`Ran: ${(e.commands || []).filter(Boolean).join("; ") || "nothing"}`, ""];
    case "reviewer": {
      const issue = e.issues.length ? ` Issue: ${e.issues[0]}.` : "";
      return [`Verdict ${e.status}.${issue}`, e.status === "PASS" ? "ok" : "bad"];
    }
    case "done": return [e.status === "PASS" ? "Run finished: PASS." : `Run halted: ${e.reason}.`, e.status === "PASS" ? "ok" : "bad"];
    default: return [e.node, ""];
  }
}

export async function mount() {
  const { limits, scenarios } = await loadJSON("data/harness_traces.json");
  const $ = (id) => document.getElementById(id);
  const log = $("h-log"), budgets = $("h-budgets"), pipeline = $("h-pipeline");
  let cur = scenarios[0], shown = 0, timer = null;

  pipeline.append(...NODES.map(([id, name, sub]) => el("li", { class: "node", id: `n-${id}` }, el("b", { text: name }), el("span", { text: sub }))));

  const picker = $("h-scenarios");
  scenarios.forEach((s, i) => picker.append(el("button", {
    class: "chip", type: "button", "aria-pressed": String(i === 0), text: s.title,
    onclick: () => { cur = s; reset(); [...picker.children].forEach((b, j) => b.setAttribute("aria-pressed", String(j === i))); },
  })));

  function stats(upto) {
    const ev = cur.trace.slice(0, upto);
    // Patches are counted by the worker/reviewer events that carry the running total.
    const patches = Math.max(0, ...ev.filter((e) => "patches_used" in e).map((e) => e.patches_used));
    const replans = Math.max(0, ev.filter((e) => e.node === "architect").length - 1);
    return { patches, replans };
  }

  function paint() {
    clear(log);
    cur.trace.slice(0, shown).forEach((e) => {
      const [text, tone] = describe(e, limits);
      log.append(el("li", {}, el("span", { class: "who", text: e.node }), el("span", { class: `${tone}${e.node === "done" ? " verdict" : ""}`, text })));
    });
    const last = cur.trace[shown - 1];
    NODES.forEach(([id]) => $(`n-${id}`).classList.toggle("active", !!last && last.node === id));
    const { patches, replans } = stats(shown);
    clear(budgets).append(
      el("div", { text: `Worker patches ${patches} of ${limits.max_worker_patches}` }),
      el("div", { text: `Re-plans ${replans} of ${limits.max_architecture_replans}` }));
    $("h-step").disabled = shown >= cur.trace.length;
    $("h-play").disabled = shown >= cur.trace.length;
    $("h-blurb").textContent = cur.blurb;
  }

  function stop() { clearInterval(timer); timer = null; $("h-play").textContent = "Play"; }
  function step() { if (shown < cur.trace.length) { shown++; paint(); } if (shown >= cur.trace.length) stop(); }
  function reset() { stop(); shown = 0; paint(); }

  $("h-step").addEventListener("click", step);
  $("h-reset").addEventListener("click", reset);
  $("h-play").addEventListener("click", () => {
    if (timer) return stop();
    if (reducedMotion()) { shown = cur.trace.length; paint(); return; } // no auto-advance: show the whole run
    $("h-play").textContent = "Pause";
    timer = setInterval(step, 900);
  });
  paint();
}

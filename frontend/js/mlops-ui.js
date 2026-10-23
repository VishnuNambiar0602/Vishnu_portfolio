import { el, clear, loadJSON } from "./dom.js";
import { analyse, PYPI_NAMES } from "./py-deps.js";

export async function mount() {
  const [{ files, input }, stdlib] = await Promise.all([loadJSON("data/mlops_scaffold.json"), loadJSON("data/py_stdlib.json")]);

  // Step 1: dependency analysis on whatever the visitor pastes.
  const src = document.getElementById("m-src");
  src.value = input;
  const render = () => {
    const r = analyse(src.value, stdlib);
    const ext = document.getElementById("m-ext"), std = document.getElementById("m-std");
    clear(ext).append(...(r.external.length ? r.external.map((n) => {
      const pip = PYPI_NAMES[n];
      return el("span", { class: `tag ${pip ? "map" : ""}`, title: pip ? `import name differs from the PyPI name` : "", text: pip ? `${n} → ${pip}` : n });
    }) : [el("span", { class: "muted", text: "None found" })]));
    clear(std).append(...(r.standard.length ? r.standard.map((n) => el("span", { class: "tag", text: n })) : [el("span", { class: "muted", text: "None found" })]));
    document.getElementById("m-req").textContent = r.requirements.length ? r.requirements.join("\n") : "# No external dependencies detected";
  };
  src.addEventListener("input", render);
  render();

  // Step 2: browse the generated project.
  const tree = document.getElementById("m-tree");
  const name = document.getElementById("m-name");
  const code = document.getElementById("m-code");
  const buttons = new Map();
  function open(path) {
    const f = files.find((x) => x.path === path);
    name.textContent = `${f.path}  (${f.content.split("\n").length} lines)`;
    code.textContent = f.content;
    buttons.forEach((b, p) => b.setAttribute("aria-current", String(p === path)));
  }
  clear(tree);
  for (const f of files) {
    const b = el("button", { type: "button", text: f.path, onclick: () => open(f.path) });
    buttons.set(f.path, b);
    tree.append(el("li", {}, b));
  }
  open(files.find((f) => f.path === "Dockerfile")?.path || files[0].path);
}

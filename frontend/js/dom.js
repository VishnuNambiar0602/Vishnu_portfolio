// Tiny DOM helper. Text is always inserted as text nodes, never parsed as HTML.
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === false || v == null) continue;
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) if (c != null && c !== false && c !== "") node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return node;
}

export const clear = (node) => { node.replaceChildren(); return node; };

export async function loadJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// Browser port of the dependency step in projects/mlops-agent (src/agents/DependencyAgent.ts):
// find the imports in a Python file, separate the standard library, and name the packages as PyPI
// does. The real agent parses with Python's ast; this uses regular expressions on the same text and
// is checked against ast in scripts/check_deps_parity.mjs.

export const PYPI_NAMES = {
  sklearn: "scikit-learn", cv2: "opencv-python", PIL: "pillow", yaml: "pyyaml", bs4: "beautifulsoup4",
  skimage: "scikit-image", dotenv: "python-dotenv", dateutil: "python-dateutil",
};

function stripNonCode(src) {
  return src
    .replace(/("""|''')[\s\S]*?\1/g, "")
    .split("\n").map((l) => l.replace(/#.*$/, "")).join("\n");
}

export function findImports(src) {
  const found = new Set();
  for (const line of stripNonCode(src).split("\n")) {
    let m = line.match(/^\s*import\s+(.+)$/);
    if (m) {
      for (const part of m[1].split(",")) {
        const name = part.trim().split(/\s+as\s+/)[0].split(".")[0].trim();
        if (/^[A-Za-z_]\w*$/.test(name)) found.add(name);
      }
      continue;
    }
    m = line.match(/^\s*from\s+([A-Za-z_][\w.]*)\s+import\b/); // relative imports start with "." and are skipped
    if (m) found.add(m[1].split(".")[0]);
  }
  return [...found].sort();
}

export function analyse(src, stdlib) {
  const std = new Set(stdlib);
  const names = findImports(src);
  const standard = names.filter((n) => std.has(n));
  const external = names.filter((n) => !std.has(n));
  const requirements = [...new Set(external.map((n) => PYPI_NAMES[n] ?? n))];
  return { names, standard, external, requirements };
}

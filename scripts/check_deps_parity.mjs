// The browser import analysis must agree with Python's ast on the reference sources.
import { readFileSync } from "node:fs";
import { findImports } from "../js/py-deps.js";
const cases = JSON.parse(readFileSync(new URL("../data/deps_cases.json", import.meta.url)));
let bad = 0;
for (const c of cases) {
  const got = JSON.stringify(findImports(c.source)), want = JSON.stringify(c.imports);
  if (got !== want) { bad++; console.log(`MISMATCH\n  js : ${got}\n  ast: ${want}`); }
}
console.log(`${cases.length - bad}/${cases.length} sources identical to Python's ast`);
process.exit(bad ? 1 : 0);

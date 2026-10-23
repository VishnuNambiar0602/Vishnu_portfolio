// The browser footfall model must reproduce scikit-learn's predictions.
import { readFileSync } from "node:fs";
import { FootfallModel } from "../js/footfall-model.js";
const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const model = new FootfallModel(read("../data/footfall_model.json"));
const cases = read("../data/forecast_reference.json");
let worst = 0;
for (const c of cases) worst = Math.max(worst, Math.abs(model.predictRow(c.row) - c.pred));
console.log(`${cases.length} cases, worst difference ${worst.toExponential(2)} customers`);
process.exit(worst < 1e-3 ? 0 : 1);

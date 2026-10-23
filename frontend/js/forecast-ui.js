import { el, clear, loadJSON } from "./dom.js";
import { FootfallModel } from "./footfall-model.js";

const NS = "http://www.w3.org/2000/svg";
const svg = (tag, attrs = {}, text) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
};
const money = (v) => Math.round(v).toLocaleString("en");
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEATHER = ["Sunny", "Rainy", "Snowy"];

export async function mount() {
  const [report, raw] = await Promise.all([loadJSON("data/forecast.json"), loadJSON("data/footfall_model.json")]);
  drawChart(report.revenue_forecast.series);
  drawTable(report);
  mountPlanner(new FootfallModel(raw), raw);
}

function mountPlanner(model, raw) {
  const $ = (id) => document.getElementById(id);
  const typical = raw.typical, ranges = raw.ranges;
  const state = { day: "Saturday", weather: "Sunny", promo: false, marketing: typical.marketing, price: typical.price, reviews: typical.reviews, lag1: 0, lag7: 0, spend: raw.spend_per_customer, perServer: 30 };
  let lag7Touched = false;
  const weekday = (d) => typical.by_weekday_footfall[d];
  state.lag1 = Math.round(weekday("Friday"));
  state.lag7 = Math.round(weekday(state.day));

  const day = $("fc-day");
  DAYS.forEach((d) => day.append(el("option", { value: d, text: d, selected: d === state.day })));
  const weatherSet = $("fc-weather");
  weatherSet.append(el("div", { class: "opts" }, WEATHER.map((w) => el("label", { class: "opt" },
    el("input", { type: "radio", name: "fc-weather", value: w, checked: w === state.weather, onchange: () => { state.weather = w; render(); } }),
    el("span", { text: w })))));

  const slider = (id, key, [lo, hi], fmt) => {
    const s = $(id); s.min = lo; s.max = hi; s.value = state[key];
    s.step = s.step || (hi - lo > 100 ? 10 : 0.1);
    const out = $(`${id}-out`);
    const sync = () => { state[key] = Number(s.value); out.textContent = fmt(state[key]); };
    s.addEventListener("input", () => { sync(); render(); }); sync();
  };
  slider("fc-marketing", "marketing", ranges.Marketing_Spend, (v) => `$${money(v)}`);
  slider("fc-price", "price", ranges.Menu_Price, (v) => `$${v.toFixed(2)}`);
  slider("fc-reviews", "reviews", ranges.Reviews, (v) => `${v.toFixed(1)} / 5`);

  $("fc-lag1").value = state.lag1; $("fc-lag7").value = state.lag7;
  day.addEventListener("change", () => {
    state.day = day.value;
    if (!lag7Touched) { state.lag7 = Math.round(weekday(state.day)); $("fc-lag7").value = state.lag7; }
    render();
  });
  $("fc-promo").addEventListener("change", (e) => { state.promo = e.target.checked; render(); });
  $("fc-lag1").addEventListener("input", (e) => { state.lag1 = Number(e.target.value) || 0; render(); });
  $("fc-lag7").addEventListener("input", (e) => { lag7Touched = true; state.lag7 = Number(e.target.value) || 0; render(); });

  const predict = (over = {}) => Math.max(0, model.predict({ ...state, ...over }));

  function render() {
    const p = predict();
    const mae = raw.test.mae;
    $("fc-big").replaceChildren(`${Math.round(p)} `, el("small", { text: "customers expected" }));
    $("fc-range").textContent = `Typical miss on held-out days: about ${Math.round(mae)} customers either way. Likely range ${Math.max(0, Math.round(p - mae))} to ${Math.round(p + mae)}.`;

    const plan = $("fc-plan");
    clear(plan).append(
      row("Same day last week", `${state.lag7} customers`),
      row("Forecast vs that", `${p - state.lag7 >= 0 ? "+" : ""}${Math.round(p - state.lag7)} customers`),
      editable("Average spend", "fc-spend", state.spend, 0.5, (v) => { state.spend = v; render(); }, "$ per customer"),
      row("Estimated revenue", `$${money(p * state.spend)}`),
      editable("Customers per server", "fc-server", state.perServer, 1, (v) => { state.perServer = Math.max(1, v); render(); }, "per day"),
      row("Servers to schedule", `${Math.ceil(p / state.perServer)}`));

    // What moved the forecast: reset one input at a time to a neutral value and see the change.
    const avgDay = DAYS.reduce((s, d) => s + predict({ day: d }), 0) / DAYS.length;
    const rows = [
      [`Day: ${state.day}`, "an average day", p - avgDay],
      [`Weather: ${state.weather}`, "sunny", p - predict({ weather: "Sunny" })],
      [`Promotion ${state.promo ? "on" : "off"}`, "no promotion", p - predict({ promo: false })],
      [`Marketing $${money(state.marketing)}`, `typical $${money(typical.marketing)}`, p - predict({ marketing: typical.marketing })],
      [`Menu price $${state.price.toFixed(2)}`, `typical $${typical.price.toFixed(2)}`, p - predict({ price: typical.price })],
      [`Reviews ${state.reviews.toFixed(1)}`, `typical ${typical.reviews.toFixed(1)}`, p - predict({ reviews: typical.reviews })],
    ];
    clear($("fc-effects")).append(
      el("thead", {}, el("tr", {}, el("th", { text: "Input" }), el("th", { text: "Compared with" }), el("th", { class: "num", text: "Effect" }))),
      el("tbody", {}, rows.map(([a, b, d]) => el("tr", {}, el("td", { text: a }), el("td", { class: "muted", text: b }),
        el("td", { class: `num ${d > 0.5 ? "pos" : d < -0.5 ? "neg" : ""}`, text: `${d >= 0 ? "+" : ""}${d.toFixed(1)}` })))));
  }

  function row(k, v) { return el("div", {}, el("dt", { text: k }), el("dd", { text: v })); }
  function editable(k, id, value, step, onChange, hint) {
    const input = el("input", { type: "number", id, value, min: "0", step, "aria-label": k, onchange: (e) => onChange(Number(e.target.value) || 0) });
    input.addEventListener("input", (e) => onChange(Number(e.target.value) || 0));
    return el("div", { class: "editable" }, el("dt", { text: k }), el("dd", {}, input, el("span", { class: "muted", text: hint })));
  }
  render();
}

function drawChart(s) {
  const root = document.getElementById("f-chart");
  const W = 720, H = 280, L = 56, R = 12, T = 12, B = 28;
  const n = s.actual.length, testN = s.predicted.length, testStart = n - testN;
  const all = [...s.actual, ...s.predicted];
  const lo = Math.floor(Math.min(...all) / 500) * 500, hi = Math.ceil(Math.max(...all) / 500) * 500;
  const x = (i) => L + (i / (n - 1)) * (W - L - R);
  const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  clear(root);

  root.append(svg("rect", { class: "test-zone", x: x(testStart), y: T, width: x(n - 1) - x(testStart), height: H - T - B }));
  const step = (hi - lo) / 4;
  for (let k = 0; k <= 4; k++) {
    const v = lo + k * step;
    root.append(svg("line", { class: "grid", x1: L, x2: W - R, y1: y(v), y2: y(v) }), svg("text", { x: L - 8, y: y(v) + 4, "text-anchor": "end" }, money(v)));
  }
  [0, Math.floor(n / 2), n - 1].forEach((i) => root.append(svg("text", { x: x(i), y: H - 8, "text-anchor": i === 0 ? "start" : i === n - 1 ? "end" : "middle" }, s.date[i])));
  root.append(svg("text", { x: x(testStart) + 6, y: T + 12 }, "held out"));
  root.append(svg("path", { class: "actual", d: s.actual.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("") }));
  root.append(svg("path", { class: "pred", d: s.predicted.map((v, i) => `${i ? "L" : "M"}${x(testStart + i).toFixed(1)},${y(v).toFixed(1)}`).join("") }));

  const cross = svg("line", { class: "grid", y1: T, y2: H - B, stroke: "currentColor", visibility: "hidden" });
  root.append(cross);
  const out = document.getElementById("f-readout");
  const move = (ev) => {
    const r = root.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * W;
    const i = Math.max(0, Math.min(n - 1, Math.round(((px - L) / (W - L - R)) * (n - 1))));
    cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i)); cross.setAttribute("visibility", "visible");
    const p = i >= testStart ? `  forecast ${money(s.predicted[i - testStart])}` : "";
    out.textContent = `${s.date[i]}  actual ${money(s.actual[i])}${p}`;
  };
  root.addEventListener("pointermove", move);
  root.addEventListener("pointerdown", move);
  root.addEventListener("pointerleave", () => { cross.setAttribute("visibility", "hidden"); out.textContent = "Hover or touch the chart to read values."; });
}

function drawTable(r) {
  const rf = r.revenue_forecast, ff = r.footfall;
  const row = (task, model, m, best) => el("tr", {},
    el("td", { text: task }), el("td", { text: model, class: best ? "" : "muted" }),
    ...[m.rmse, m.mae].map((v) => el("td", { class: "num", text: v >= 100 ? v.toFixed(0) : v.toFixed(1) })),
    el("td", { class: "num", text: `${m.mape_pct.toFixed(1)}%` }));
  clear(document.getElementById("f-table")).append(
    el("thead", {}, el("tr", {}, ["Task", "Model", "RMSE", "MAE", "MAPE"].map((h, i) => el("th", { class: i > 1 ? "num" : "", text: h })))),
    el("tbody", {},
      row(`Revenue, last ${rf.holdout_days} days`, "Same as last week", rf.seasonal_naive, false),
      row("", "SARIMA", rf.sarima, true),
      row(`Footfall, last ${ff.test_days} days`, "Same day last week", ff.baseline_last_week, false),
      row("", "Random forest", ff.random_forest, true),
      row("", "Gradient boosting", ff.gradient_boosting, true)));
}
